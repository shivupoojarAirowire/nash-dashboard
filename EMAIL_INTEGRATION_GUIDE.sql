-- Email Service Integration Guide
-- This guide helps you integrate actual email sending with the notification system

-- =====================================================================
-- IMPORTANT: The current setup logs notifications to the database.
-- To send actual emails, you need to integrate with an email service.
-- =====================================================================

-- =====================================================================
-- OPTION 1: Using Supabase Edge Function with Resend/SendGrid
-- =====================================================================

/*
Step 1: Install Supabase CLI
npm install -g supabase

Step 2: Create Edge Function
supabase functions new send-assignment-email

Step 3: Implement the function (TypeScript)

// supabase/functions/send-assignment-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  try {
    const { to, subject, text, assignment_id } = await req.json()

    // Send email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'NaaS Dashboard <noreply@yourdomain.com>',
        to: [to],
        subject: subject,
        text: text,
      }),
    })

    const data = await res.json()

    // Update notification log status
    if (res.ok) {
      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { "Content-Type": "application/json" } }
      )
    } else {
      throw new Error(data.message || 'Failed to send email')
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }
})

Step 4: Deploy the function
supabase functions deploy send-assignment-email --no-verify-jwt

Step 5: Set the API key secret
supabase secrets set RESEND_API_KEY=your_resend_api_key

Step 6: Update the trigger function to call the edge function
*/

-- Updated trigger function with edge function call
CREATE OR REPLACE FUNCTION public.log_assignment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  engineer_email TEXT;
  engineer_name TEXT;
  assigner_name TEXT;
  store_name TEXT;
  deadline_date TEXT;
  email_subject TEXT;
  email_body TEXT;
  notification_id UUID;
BEGIN
  -- Get engineer details
  SELECT email, COALESCE(full_name, email)
  INTO engineer_email, engineer_name
  FROM public.profiles
  WHERE id = NEW.assigned_to;

  -- Get assigner details
  SELECT COALESCE(full_name, email)
  INTO assigner_name
  FROM public.profiles
  WHERE id = NEW.assigned_by;

  -- Get store name
  SELECT store
  INTO store_name
  FROM public.stores
  WHERE id = NEW.store_id;

  -- Format deadline
  deadline_date := TO_CHAR(NEW.deadline_at, 'DD Mon YYYY, HH24:MI');

  -- Prepare email content
  email_subject := 'New Site Loading Assignment: ' || NEW.store_code;
  email_body := 'Hello ' || engineer_name || ',' || E'\n\n' ||
                'You have been assigned a new site loading task.' || E'\n\n' ||
                'Assignment Details:' || E'\n' ||
                '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' || E'\n' ||
                '📍 Store: ' || COALESCE(store_name, NEW.store_code) || E'\n' ||
                '🏷️  Store Code: ' || NEW.store_code || E'\n' ||
                '🌆 City: ' || NEW.city || E'\n' ||
                '⏰ Deadline: ' || deadline_date || E'\n' ||
                '👤 Assigned by: ' || COALESCE(assigner_name, 'Manager') || E'\n' ||
                '📊 Status: ' || UPPER(NEW.status) || E'\n' ||
                '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' || E'\n\n' ||
                '📋 Next Steps:' || E'\n' ||
                '1. Log in to the NaaS Dashboard' || E'\n' ||
                '2. Navigate to HeatMaps section' || E'\n' ||
                '3. View assignment details and complete the site loading' || E'\n\n' ||
                'Please ensure the task is completed before the deadline.' || E'\n\n' ||
                'Best regards,' || E'\n' ||
                'NaaS Dashboard System';

  -- Log the notification
  INSERT INTO public.notification_logs (
    assignment_id,
    recipient_email,
    recipient_name,
    subject,
    body,
    status,
    created_at
  ) VALUES (
    NEW.id,
    engineer_email,
    engineer_name,
    email_subject,
    email_body,
    'pending',
    NOW()
  ) RETURNING id INTO notification_id;

  -- Call edge function to send email (uncomment when edge function is deployed)
  /*
  PERFORM net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-assignment-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'to', engineer_email,
      'subject', email_subject,
      'text', email_body,
      'assignment_id', NEW.id,
      'notification_id', notification_id
    )
  );
  */

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO public.notification_logs (
      assignment_id,
      recipient_email,
      recipient_name,
      subject,
      body,
      status,
      error_message,
      created_at
    ) VALUES (
      NEW.id,
      COALESCE(engineer_email, 'unknown'),
      COALESCE(engineer_name, 'unknown'),
      COALESCE(email_subject, 'Assignment Notification'),
      COALESCE(email_body, 'Error generating notification'),
      'failed',
      SQLERRM,
      NOW()
    );
    RETURN NEW;
END;
$$;

-- =====================================================================
-- OPTION 2: Using a Node.js Service (Separate Server)
-- =====================================================================

/*
You can create a separate Node.js service that:
1. Polls the notification_logs table for pending notifications
2. Sends emails using nodemailer or similar
3. Updates the status to 'sent' or 'failed'

Example Node.js script:

const { createClient } = require('@supabase/supabase-js')
const nodemailer = require('nodemailer')

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SERVICE_ROLE_KEY'
)

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password'
  }
})

async function processPendingNotifications() {
  // Get pending notifications
  const { data: notifications, error } = await supabase
    .from('notification_logs')
    .select('*')
    .eq('status', 'pending')
    .limit(10)

  if (error) {
    console.error('Error fetching notifications:', error)
    return
  }

  for (const notification of notifications) {
    try {
      // Send email
      await transporter.sendMail({
        from: '"NaaS Dashboard" <noreply@yourdomain.com>',
        to: notification.recipient_email,
        subject: notification.subject,
        text: notification.body
      })

      // Update status to sent
      await supabase
        .from('notification_logs')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', notification.id)

      console.log(`✓ Email sent to ${notification.recipient_email}`)
    } catch (error) {
      // Update status to failed
      await supabase
        .from('notification_logs')
        .update({ 
          status: 'failed', 
          error_message: error.message 
        })
        .eq('id', notification.id)

      console.error(`✗ Failed to send to ${notification.recipient_email}:`, error.message)
    }
  }
}

// Run every minute
setInterval(processPendingNotifications, 60000)
processPendingNotifications() // Run immediately
*/

-- =====================================================================
-- OPTION 3: Using Zapier/Make.com (No-Code Solution)
-- =====================================================================

/*
1. Create a webhook trigger in Zapier/Make.com
2. When a new row is inserted in notification_logs (status = 'pending')
3. Send email via Gmail/Outlook/SendGrid
4. Update the row status to 'sent'

Zapier Setup:
- Trigger: PostgreSQL - New Row in notification_logs (filter: status = 'pending')
- Action: Gmail - Send Email
  - To: {{recipient_email}}
  - Subject: {{subject}}
  - Body: {{body}}
- Action: PostgreSQL - Update Row
  - Set status = 'sent'
  - Set sent_at = {{current_time}}
*/

-- =====================================================================
-- OPTION 4: Simple PHP/Python Script (Cron Job)
-- =====================================================================

/*
Python example using smtplib:

import os
from supabase import create_client
import smtplib
from email.mime.text import MIMEText
from datetime import datetime

supabase = create_client(
    os.environ.get("SUPABASE_URL"),
    os.environ.get("SUPABASE_SERVICE_KEY")
)

def send_pending_notifications():
    # Get pending notifications
    response = supabase.table('notification_logs') \
        .select('*') \
        .eq('status', 'pending') \
        .limit(10) \
        .execute()
    
    for notif in response.data:
        try:
            # Create email
            msg = MIMEText(notif['body'])
            msg['Subject'] = notif['subject']
            msg['From'] = 'noreply@yourdomain.com'
            msg['To'] = notif['recipient_email']
            
            # Send via SMTP
            with smtplib.SMTP('smtp.gmail.com', 587) as server:
                server.starttls()
                server.login('your-email@gmail.com', 'your-app-password')
                server.send_message(msg)
            
            # Update status
            supabase.table('notification_logs') \
                .update({'status': 'sent', 'sent_at': datetime.now().isoformat()}) \
                .eq('id', notif['id']) \
                .execute()
            
            print(f"✓ Sent to {notif['recipient_email']}")
        except Exception as e:
            # Update status to failed
            supabase.table('notification_logs') \
                .update({'status': 'failed', 'error_message': str(e)}) \
                .eq('id', notif['id']) \
                .execute()
            print(f"✗ Failed: {e}")

if __name__ == '__main__':
    send_pending_notifications()

# Add to crontab to run every minute:
# * * * * * /usr/bin/python3 /path/to/send_notifications.py
*/

-- =====================================================================
-- CURRENT SETUP SUMMARY
-- =====================================================================
-- ✓ Notifications are logged to notification_logs table
-- ✓ Trigger fires on every new assignment
-- ✓ Email content is formatted and ready
-- ☐ Actual email sending needs to be implemented
-- 
-- Choose one of the options above based on your infrastructure and preferences.
-- =====================================================================
