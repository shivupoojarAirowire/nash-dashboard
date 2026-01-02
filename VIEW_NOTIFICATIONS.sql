-- View and Manage Email Notifications
-- Use this script to check notification status and debug issues

-- ====================================
-- 1. VIEW ALL RECENT NOTIFICATIONS
-- ====================================
SELECT 
  nl.id AS notification_id,
  nl.recipient_email,
  nl.recipient_name,
  nl.subject,
  nl.status,
  nl.created_at,
  nl.sent_at,
  nl.error_message,
  sa.store_code,
  sa.city,
  TO_CHAR(sa.deadline_at, 'DD Mon YYYY HH24:MI') AS deadline,
  p.full_name AS engineer_name
FROM public.notification_logs nl
LEFT JOIN public.site_assignments sa ON nl.assignment_id = sa.id
LEFT JOIN public.profiles p ON sa.assigned_to = p.id
ORDER BY nl.created_at DESC
LIMIT 20;

-- ====================================
-- 2. COUNT NOTIFICATIONS BY STATUS
-- ====================================
SELECT 
  status,
  COUNT(*) AS count
FROM public.notification_logs
GROUP BY status
ORDER BY count DESC;

-- ====================================
-- 3. VIEW PENDING NOTIFICATIONS
-- ====================================
SELECT 
  nl.id,
  nl.recipient_email,
  nl.recipient_name,
  nl.subject,
  LEFT(nl.body, 100) || '...' AS body_preview,
  nl.created_at,
  sa.store_code
FROM public.notification_logs nl
LEFT JOIN public.site_assignments sa ON nl.assignment_id = sa.id
WHERE nl.status = 'pending'
ORDER BY nl.created_at DESC;

-- ====================================
-- 4. VIEW FULL EMAIL CONTENT
-- (Replace the ID with actual notification ID)
-- ====================================
-- SELECT 
--   recipient_email,
--   recipient_name,
--   subject,
--   body,
--   status,
--   created_at
-- FROM public.notification_logs
-- WHERE id = 'YOUR_NOTIFICATION_ID_HERE';

-- ====================================
-- 5. MARK NOTIFICATION AS SENT
-- (Use this after manually sending email)
-- ====================================
-- UPDATE public.notification_logs
-- SET status = 'sent', sent_at = NOW()
-- WHERE id = 'YOUR_NOTIFICATION_ID_HERE';

-- ====================================
-- 6. MARK ALL PENDING AS SENT
-- (Use with caution!)
-- ====================================
-- UPDATE public.notification_logs
-- SET status = 'sent', sent_at = NOW()
-- WHERE status = 'pending';

-- ====================================
-- 7. VIEW NOTIFICATIONS FOR SPECIFIC ENGINEER
-- ====================================
-- SELECT 
--   nl.id,
--   nl.subject,
--   nl.status,
--   nl.created_at,
--   sa.store_code,
--   sa.city
-- FROM public.notification_logs nl
-- LEFT JOIN public.site_assignments sa ON nl.assignment_id = sa.id
-- WHERE nl.recipient_email = 'engineer@example.com'
-- ORDER BY nl.created_at DESC;

-- ====================================
-- 8. VIEW FAILED NOTIFICATIONS
-- ====================================
SELECT 
  nl.id,
  nl.recipient_email,
  nl.subject,
  nl.error_message,
  nl.created_at,
  sa.store_code
FROM public.notification_logs nl
LEFT JOIN public.site_assignments sa ON nl.assignment_id = sa.id
WHERE nl.status = 'failed'
ORDER BY nl.created_at DESC;

-- ====================================
-- 9. DELETE OLD NOTIFICATIONS (30+ days)
-- (Cleanup old logs)
-- ====================================
-- DELETE FROM public.notification_logs
-- WHERE created_at < NOW() - INTERVAL '30 days'
-- AND status IN ('sent', 'failed');

-- ====================================
-- 10. RESEND FAILED NOTIFICATION
-- (Mark as pending to retry)
-- ====================================
-- UPDATE public.notification_logs
-- SET status = 'pending', error_message = NULL
-- WHERE id = 'YOUR_NOTIFICATION_ID_HERE';

-- ====================================
-- 11. VIEW NOTIFICATION STATISTICS
-- ====================================
SELECT 
  DATE_TRUNC('day', created_at) AS notification_date,
  status,
  COUNT(*) AS count
FROM public.notification_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('day', created_at), status
ORDER BY notification_date DESC, status;

-- ====================================
-- 12. CHECK TRIGGER STATUS
-- ====================================
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'site_assignments'
  AND trigger_name LIKE '%notification%';

-- ====================================
-- 13. TEST NOTIFICATION FUNCTION
-- (Manually trigger notification for existing assignment)
-- ====================================
-- DO $$
-- DECLARE
--   test_assignment site_assignments;
-- BEGIN
--   -- Get a recent assignment
--   SELECT * INTO test_assignment
--   FROM site_assignments
--   ORDER BY created_at DESC
--   LIMIT 1;
--   
--   -- Manually execute the notification function
--   PERFORM log_assignment_notification(test_assignment);
--   
--   RAISE NOTICE 'Test notification created. Check notification_logs table.';
-- END $$;
