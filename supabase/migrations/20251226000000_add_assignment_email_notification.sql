-- Email notification system for site assignments
-- This migration creates a trigger that sends email notifications to engineers when they are assigned

-- First, enable the pg_net extension if not already enabled (for HTTP requests)
-- Note: This may require superuser privileges in your Supabase project
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to send email notification via Supabase Edge Function or external service
CREATE OR REPLACE FUNCTION public.notify_engineer_assignment()
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
  deadline_date := TO_CHAR(NEW.deadline_at, 'YYYY-MM-DD HH24:MI');

  -- Prepare email content
  email_subject := 'New Site Loading Assignment: ' || NEW.store_code;
  email_body := 'Hello ' || engineer_name || ',' || E'\n\n' ||
                'You have been assigned a new site loading task.' || E'\n\n' ||
                'Details:' || E'\n' ||
                '- Store: ' || COALESCE(store_name, NEW.store_code) || ' (' || NEW.store_code || ')' || E'\n' ||
                '- City: ' || NEW.city || E'\n' ||
                '- Deadline: ' || deadline_date || E'\n' ||
                '- Assigned by: ' || COALESCE(assigner_name, 'Manager') || E'\n' ||
                '- Status: ' || NEW.status || E'\n\n' ||
                'Please log in to the dashboard to view more details and complete the assignment.' || E'\n\n' ||
                'Best regards,' || E'\n' ||
                'NaaS Dashboard Team';

  -- Log the notification (for debugging)
  INSERT INTO public.notification_logs (
    assignment_id,
    recipient_email,
    subject,
    body,
    status,
    created_at
  ) VALUES (
    NEW.id,
    engineer_email,
    email_subject,
    email_body,
    'pending',
    NOW()
  );

  -- Send email via pg_net (HTTP request to your email service)
  -- Option 1: Using Supabase Edge Function
  -- Uncomment if you have a Supabase Edge Function set up for sending emails
  /*
  PERFORM net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'to', engineer_email,
      'subject', email_subject,
      'text', email_body,
      'assignment_id', NEW.id
    )
  );
  */

  -- Option 2: Direct SMTP service (e.g., SendGrid, Mailgun, etc.)
  -- Replace with your actual email service endpoint
  -- For now, we just log the notification

  -- Update notification log status
  UPDATE public.notification_logs
  SET status = 'sent', sent_at = NOW()
  WHERE assignment_id = NEW.id AND recipient_email = engineer_email;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    INSERT INTO public.notification_logs (
      assignment_id,
      recipient_email,
      subject,
      body,
      status,
      error_message,
      created_at
    ) VALUES (
      NEW.id,
      engineer_email,
      email_subject,
      email_body,
      'failed',
      SQLERRM,
      NOW()
    );
    RETURN NEW;
END;
$$;

-- Create notification_logs table to track email notifications
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.site_assignments(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notification_logs_assignment ON public.notification_logs(assignment_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON public.notification_logs(status);

-- Enable RLS on notification_logs
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notification_logs
FOR SELECT
TO authenticated
USING (
  recipient_email IN (
    SELECT email FROM public.profiles WHERE id = auth.uid()
  )
);

-- Allow system to insert notifications
CREATE POLICY "System can insert notifications"
ON public.notification_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create trigger on site_assignments table
DROP TRIGGER IF EXISTS trigger_notify_engineer_assignment ON public.site_assignments;

CREATE TRIGGER trigger_notify_engineer_assignment
AFTER INSERT ON public.site_assignments
FOR EACH ROW
EXECUTE FUNCTION public.notify_engineer_assignment();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON public.notification_logs TO authenticated;

-- Comments
COMMENT ON TABLE public.notification_logs IS 'Stores email notification logs for site assignments';
COMMENT ON FUNCTION public.notify_engineer_assignment() IS 'Sends email notification to engineer when assigned a new site loading task';
COMMENT ON TRIGGER trigger_notify_engineer_assignment ON public.site_assignments IS 'Triggers email notification when new assignment is created';
