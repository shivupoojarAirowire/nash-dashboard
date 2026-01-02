-- Quick Setup: Email Notification System for Site Assignments
-- Run this script in your Supabase SQL Editor

-- Step 1: Create notification_logs table to track email notifications
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.site_assignments(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_notification_logs_assignment ON public.notification_logs(assignment_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON public.notification_logs(created_at DESC);

-- Enable RLS on notification_logs
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notification_logs;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notification_logs;
DROP POLICY IF EXISTS "Authenticated users can read notifications" ON public.notification_logs;

-- Allow authenticated users to read notifications
CREATE POLICY "Authenticated users can read notifications"
ON public.notification_logs
FOR SELECT
TO authenticated
USING (true);

-- Allow system to insert notifications
CREATE POLICY "System can insert notifications"
ON public.notification_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Step 2: Create function to log assignment notification
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
                'If you have any questions, please contact your manager.' || E'\n\n' ||
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
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
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

-- Step 3: Create trigger on site_assignments table
DROP TRIGGER IF EXISTS trigger_log_assignment_notification ON public.site_assignments;

CREATE TRIGGER trigger_log_assignment_notification
AFTER INSERT ON public.site_assignments
FOR EACH ROW
EXECUTE FUNCTION public.log_assignment_notification();

-- Grant necessary permissions
GRANT SELECT, INSERT ON public.notification_logs TO authenticated;

-- Verify setup
DO $$
BEGIN
  RAISE NOTICE '✅ Email notification system setup complete!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '  - notification_logs table created';
  RAISE NOTICE '  - Trigger installed on site_assignments';
  RAISE NOTICE '  - RLS policies configured';
  RAISE NOTICE '';
  RAISE NOTICE '📧 How it works:';
  RAISE NOTICE '  1. When a new assignment is created, a notification is logged';
  RAISE NOTICE '  2. Check notification_logs table to see pending notifications';
  RAISE NOTICE '  3. Integrate with your email service to send actual emails';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 To view notifications:';
  RAISE NOTICE '  SELECT * FROM notification_logs ORDER BY created_at DESC;';
END $$;

-- Query to view recent notifications
SELECT 
  nl.id,
  nl.assignment_id,
  nl.recipient_email,
  nl.recipient_name,
  nl.subject,
  nl.status,
  nl.created_at,
  nl.sent_at,
  sa.store_code,
  sa.city,
  sa.deadline_at
FROM notification_logs nl
LEFT JOIN site_assignments sa ON nl.assignment_id = sa.id
ORDER BY nl.created_at DESC
LIMIT 10;
