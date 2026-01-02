# Site Assignment Improvements - Implementation Summary

## 📋 Overview

This document describes the improvements made to the site assignment system, including:
1. **Engineer filtering** - Show only Engineering team members in assignment dropdown
2. **Email notifications** - Automatic email notifications when engineers are assigned tasks

---

## ✅ What Was Changed

### 1. Frontend Changes (Heatmap.tsx)

**File:** `src/pages/Heatmap.tsx`

**Change:** Updated `loadEngineeringUsers()` function to filter by department

**Before:**
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('id, email, full_name')
  .order('full_name');
```

**After:**
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('id, email, full_name, department')
  .eq('department', 'Engineering')
  .order('full_name');
```

**Result:** Only users with `department = 'Engineering'` will appear in the "Assign to Engineering User" dropdown.

---

### 2. Database Changes (Email Notification System)

**Files Created:**
- `SETUP_EMAIL_NOTIFICATIONS.sql` - Main setup script
- `VIEW_NOTIFICATIONS.sql` - Helper queries for viewing notifications
- `EMAIL_INTEGRATION_GUIDE.sql` - Integration guide for actual email sending
- `supabase/migrations/20251226000000_add_assignment_email_notification.sql` - Migration file

**What Was Added:**

#### A. New Table: `notification_logs`
Stores all email notifications with the following fields:
- `id` - Unique notification ID
- `assignment_id` - Links to site_assignments table
- `recipient_email` - Engineer's email address
- `recipient_name` - Engineer's name
- `subject` - Email subject line
- `body` - Full email content
- `status` - 'pending', 'sent', or 'failed'
- `error_message` - Error details if failed
- `created_at` - When notification was created
- `sent_at` - When email was sent

#### B. Database Trigger
Automatically fires when a new assignment is created:
- Trigger name: `trigger_log_assignment_notification`
- Function: `log_assignment_notification()`
- Timing: AFTER INSERT on `site_assignments`

#### C. Email Content
Each notification includes:
- Store code and name
- City
- Deadline (formatted)
- Assigned by (manager name)
- Status
- Instructions for next steps

---

## 🚀 How to Deploy

### Step 1: Update Engineer Department Field

First, ensure your engineering users have `department = 'Engineering'` in the profiles table:

```sql
-- Check current users
SELECT id, email, full_name, department 
FROM profiles 
ORDER BY email;

-- Update users to mark them as engineering team
UPDATE profiles 
SET department = 'Engineering'
WHERE email IN (
  'engineer1@example.com',
  'engineer2@example.com',
  'engineer3@example.com'
);

-- Verify update
SELECT id, email, full_name, department 
FROM profiles 
WHERE department = 'Engineering';
```

### Step 2: Install Email Notification System

Run the following SQL script in your Supabase SQL Editor:

```bash
# Copy and paste the contents of SETUP_EMAIL_NOTIFICATIONS.sql
```

Or run the migration:
```bash
supabase db push
```

### Step 3: Test the System

1. Go to http://localhost:8082/project-manager/load-site
2. Click "Assign Site Loading"
3. You should only see engineers with `department = 'Engineering'`
4. Create a new assignment
5. Check the notification was logged:

```sql
SELECT * FROM notification_logs 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 📧 Email Integration (Next Steps)

Currently, notifications are **logged to the database** but not sent via email. To send actual emails, choose one of these options:

### Option 1: Supabase Edge Function (Recommended)
- Use Resend, SendGrid, or similar service
- See `EMAIL_INTEGRATION_GUIDE.sql` for full implementation
- Pros: Serverless, automatic, scales well
- Cons: Requires Supabase CLI setup

### Option 2: Node.js Cron Service
- Create a separate service that polls pending notifications
- Send emails using nodemailer
- Pros: Full control, easy debugging
- Cons: Requires server infrastructure

### Option 3: Zapier/Make.com (No-Code)
- Set up a webhook trigger on new notification_logs rows
- Send via Gmail/Outlook connector
- Pros: No coding required, quick setup
- Cons: May have cost per email

### Option 4: Python/PHP Cron Job
- Simple script that runs every minute
- Checks for pending notifications and sends them
- Pros: Simple, works on any server
- Cons: Manual deployment

**See `EMAIL_INTEGRATION_GUIDE.sql` for detailed code examples of each option.**

---

## 🔍 Monitoring and Management

### View Recent Notifications
```sql
SELECT 
  nl.recipient_email,
  nl.subject,
  nl.status,
  nl.created_at,
  sa.store_code
FROM notification_logs nl
LEFT JOIN site_assignments sa ON nl.assignment_id = sa.id
ORDER BY nl.created_at DESC
LIMIT 20;
```

### Count by Status
```sql
SELECT status, COUNT(*) 
FROM notification_logs 
GROUP BY status;
```

### View Full Email Content
```sql
SELECT 
  recipient_email,
  subject,
  body,
  status,
  created_at
FROM notification_logs
WHERE id = 'YOUR_NOTIFICATION_ID';
```

### Mark Notifications as Sent (Manual)
```sql
UPDATE notification_logs
SET status = 'sent', sent_at = NOW()
WHERE status = 'pending';
```

**More queries available in `VIEW_NOTIFICATIONS.sql`**

---

## 📊 Database Schema

### notification_logs Table
```sql
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY,
  assignment_id UUID REFERENCES site_assignments(id),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);
```

### RLS Policies
- Authenticated users can read all notifications
- System can insert notifications
- Only the system should update notification status

---

## ✨ Features

### ✅ Implemented
- [x] Filter engineer dropdown by department
- [x] Automatic notification logging on assignment creation
- [x] Formatted email content with all assignment details
- [x] Database trigger system
- [x] Notification status tracking
- [x] Error handling and logging

### 🔄 Pending (Choose One)
- [ ] Actual email sending (requires integration - see EMAIL_INTEGRATION_GUIDE.sql)
- [ ] Email templates with HTML formatting
- [ ] Email retry logic for failed sends
- [ ] Daily digest option (batch notifications)

---

## 🔧 Troubleshooting

### Engineers Not Showing in Dropdown
**Problem:** No engineers appear when assigning

**Solution:**
```sql
-- Check if users have department set
SELECT email, department FROM profiles;

-- Set department for engineering users
UPDATE profiles 
SET department = 'Engineering'
WHERE email IN ('user1@email.com', 'user2@email.com');
```

### Notifications Not Being Created
**Problem:** No rows in notification_logs after creating assignment

**Solution:**
```sql
-- Check if trigger exists
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'trigger_log_assignment_notification';

-- Re-run SETUP_EMAIL_NOTIFICATIONS.sql if trigger is missing
```

### Email Content Not Displaying Correctly
**Problem:** Missing store name or other details

**Solution:**
```sql
-- Verify the assignment has all required data
SELECT 
  sa.*,
  s.store,
  p.full_name
FROM site_assignments sa
LEFT JOIN stores s ON sa.store_id = s.id
LEFT JOIN profiles p ON sa.assigned_to = p.id
WHERE sa.id = 'ASSIGNMENT_ID';
```

---

## 📚 Files Reference

| File | Purpose |
|------|---------|
| `src/pages/Heatmap.tsx` | Frontend - Engineer filtering |
| `SETUP_EMAIL_NOTIFICATIONS.sql` | Database setup - Run this first |
| `VIEW_NOTIFICATIONS.sql` | Helper queries for monitoring |
| `EMAIL_INTEGRATION_GUIDE.sql` | Guide for actual email sending |
| `supabase/migrations/20251226000000_add_assignment_email_notification.sql` | Migration file |

---

## 🎯 Testing Checklist

- [ ] Engineers with `department = 'Engineering'` appear in dropdown
- [ ] Non-engineering users do NOT appear in dropdown
- [ ] Creating assignment logs notification to `notification_logs`
- [ ] Notification contains correct email, subject, body
- [ ] Notification status is 'pending' initially
- [ ] Can view notifications with provided SQL queries
- [ ] (Optional) Emails are sent when integration is complete

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the SQL queries in `VIEW_NOTIFICATIONS.sql`
3. Verify your database has the `department` column in profiles table
4. Ensure RLS policies allow the operations

---

## 🔐 Security Notes

- Notification logs use RLS (Row Level Security)
- Only authenticated users can read notifications
- Service role key required for email sending (keep secure)
- Email content is stored in plain text in database
- Consider data retention policy for old notifications

---

## 📈 Future Enhancements

Potential improvements:
1. HTML email templates with company branding
2. SMS notifications for urgent assignments
3. In-app notifications (push notifications)
4. Notification preferences per user
5. Email delivery tracking and analytics
6. Automated reminders before deadline
7. Notification history in user profile

---

**Last Updated:** December 26, 2025
**Version:** 1.0
