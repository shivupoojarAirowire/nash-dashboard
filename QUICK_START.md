# 🚀 Quick Start Guide - Engineer Assignment & Email Notifications

Follow these steps to set up the new features:

## 📋 Prerequisites
- Supabase project with access to SQL Editor
- Users already created in the system
- Access to the application at http://localhost:8082

---

## ⚡ Quick Setup (5 Minutes)

### Step 1: Mark Users as Engineering Team (2 min)

1. Open Supabase SQL Editor
2. Run `SETUP_ENGINEERING_TEAM.sql`
3. Update the email addresses to match your actual engineers:

```sql
UPDATE public.profiles 
SET department = 'Engineering'
WHERE email IN (
  'engineer1@example.com',  -- Replace with real emails
  'engineer2@example.com',
  'engineer3@example.com'
);
```

4. Verify the update:
```sql
SELECT email, full_name, department 
FROM profiles 
WHERE department = 'Engineering';
```

### Step 2: Install Email Notification System (2 min)

1. Copy the contents of `SETUP_EMAIL_NOTIFICATIONS.sql`
2. Paste and run in Supabase SQL Editor
3. Verify installation:
```sql
SELECT * FROM notification_logs LIMIT 5;
```

### Step 3: Test the System (1 min)

1. Navigate to http://localhost:8082/project-manager/load-site
2. Click "Assign Site Loading" button
3. In the "Assign to Engineering User" dropdown, you should see ONLY engineers
4. Fill in the form and click "Submit Assignment"
5. Check notification was created:
```sql
SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 1;
```

---

## ✅ What You Should See

### Before Changes
- **Engineer Dropdown:** Shows ALL users in the system
- **Email Notifications:** None

### After Changes
- **Engineer Dropdown:** Shows ONLY users with `department = 'Engineering'`
- **Email Notifications:** Logged to `notification_logs` table (ready for sending)

---

## 📧 Next Steps: Send Actual Emails

Currently, notifications are logged but not sent. Choose ONE option:

### Option 1: Supabase Edge Function (Recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Create function
supabase functions new send-assignment-email

# See EMAIL_INTEGRATION_GUIDE.sql for full code
```

### Option 2: Node.js Service
See `EMAIL_INTEGRATION_GUIDE.sql` → Option 2

### Option 3: Zapier (No-Code)
See `EMAIL_INTEGRATION_GUIDE.sql` → Option 3

### Option 4: Python Cron Job
See `EMAIL_INTEGRATION_GUIDE.sql` → Option 4

---

## 🔍 Quick Verification Commands

Check engineers:
```sql
SELECT email, department FROM profiles WHERE department = 'Engineering';
```

Check notifications:
```sql
SELECT recipient_email, subject, status, created_at 
FROM notification_logs 
ORDER BY created_at DESC 
LIMIT 5;
```

Check trigger is installed:
```sql
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table = 'site_assignments';
```

---

## 🆘 Troubleshooting

**Problem:** No engineers in dropdown
- **Solution:** Run Step 1 again and verify emails are correct

**Problem:** Notification not created
- **Solution:** Run Step 2 again to reinstall trigger

**Problem:** Wrong engineers showing
- **Solution:** Update department field for correct users

---

## 📁 File Reference

| When | Use This File |
|------|---------------|
| Setup engineers | `SETUP_ENGINEERING_TEAM.sql` |
| Setup notifications | `SETUP_EMAIL_NOTIFICATIONS.sql` |
| View notifications | `VIEW_NOTIFICATIONS.sql` |
| Send actual emails | `EMAIL_INTEGRATION_GUIDE.sql` |
| Full documentation | `ASSIGNMENT_IMPROVEMENTS_README.md` |

---

## ⏱️ Total Time: ~5 minutes
1. ✅ Mark engineers (2 min)
2. ✅ Install notification system (2 min)  
3. ✅ Test (1 min)
4. 🔄 Email integration (optional, 15-30 min)

---

## 🎯 Success Criteria

- [x] Only engineering team appears in assignment dropdown
- [x] Creating assignment logs notification to database
- [x] Notification contains proper email content
- [ ] Actual emails are sent (optional, requires integration)

---

**Need help?** See `ASSIGNMENT_IMPROVEMENTS_README.md` for detailed documentation.
