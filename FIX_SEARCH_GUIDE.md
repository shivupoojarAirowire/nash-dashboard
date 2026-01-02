# 🔧 Fix Engineering User Search - Step by Step

## Issue
When searching for engineering users (e.g., typing "su" to find "Suresh"), no users appear in the dropdown.

## Root Cause
Users in the database don't have `department = 'Engineering'` set in their profiles.

---

## ✅ Solution (5 Minutes)

### Step 1: Check Current Status (1 min)

Open Supabase SQL Editor and run:

```sql
SELECT email, full_name, department 
FROM profiles 
ORDER BY email;
```

**What to look for:**
- If `department` column is `NULL` or empty → Users need to be updated
- If `department` = 'Engineering' → User will appear in search

---

### Step 2: Set Engineering Department (2 min)

**Option A: Set specific users (Recommended)**

```sql
-- Replace with your actual engineering team emails
UPDATE public.profiles 
SET department = 'Engineering'
WHERE email IN (
  'suresh@example.com',
  'engineer1@example.com',
  'engineer2@example.com'
);
```

**Option B: Find and update by name**

```sql
-- If you know the user's name (e.g., Suresh)
UPDATE public.profiles 
SET department = 'Engineering'
WHERE full_name ILIKE '%suresh%';
```

**Option C: Set ALL users as Engineering**

```sql
-- Use this if ALL your users are engineers
UPDATE public.profiles 
SET department = 'Engineering';
```

---

### Step 3: Verify the Update (1 min)

```sql
SELECT email, full_name, department 
FROM profiles 
WHERE department = 'Engineering';
```

You should see your engineering users listed.

---

### Step 4: Test in the App (1 min)

1. Go to http://localhost:8082/project-manager/load-site
2. Click "Assign Site Loading"
3. In "Assign to Engineering User" field, type 2 characters (e.g., "su")
4. You should see matching users appear (e.g., "Suresh H B")
5. Check browser console (F12) - you should see:
   ```
   🔍 Loaded engineering users: [...]
   ✅ Total engineering users: X
   ```

---

## 🎯 How It Works

### Frontend Code (Already Fixed)
```typescript
// Filters only users with department = 'Engineering'
const { data, error } = await supabase
  .from('profiles')
  .select('id, email, full_name, department')
  .eq('department', 'Engineering')  // ← Only Engineering users
  .order('full_name');

// Shows suggestions after typing 2+ characters
const filteredUsers = engineeringUsers.filter((u) => {
  if (userSearchQuery.length < 2) return false;  // ← Minimum 2 chars
  const query = userSearchQuery.toLowerCase();
  const name = (u.full_name || '').toLowerCase();
  const email = u.email.toLowerCase();
  return name.includes(query) || email.includes(query);  // ← Matches name or email
});
```

### Search Examples
- Type "su" → Shows "Suresh H B", "Susan", etc.
- Type "eng" → Shows "Engineer John", "john@engineering.com", etc.
- Type "joh" → Shows "John Doe", "john@email.com", etc.

---

## 🐛 Troubleshooting

### Problem: No users appear when typing

**Solution:**
```sql
-- Check if ANY users have department set
SELECT COUNT(*) FROM profiles WHERE department = 'Engineering';

-- If count is 0, run:
UPDATE profiles SET department = 'Engineering' WHERE email = 'your-email@example.com';
```

---

### Problem: Wrong users appear

**Solution:**
```sql
-- Remove department from non-engineers
UPDATE profiles SET department = NULL WHERE email = 'non-engineer@example.com';

-- Add department to actual engineers
UPDATE profiles SET department = 'Engineering' WHERE email = 'engineer@example.com';
```

---

### Problem: User appears but search doesn't work

**Check:**
```sql
-- Verify the user's name and email
SELECT email, full_name, department FROM profiles WHERE email = 'user@example.com';
```

Make sure:
- `full_name` matches what you're typing
- `department` = 'Engineering' (exact match, case-sensitive)

---

## 📋 Quick Reference

### View all engineering users
```sql
SELECT email, full_name FROM profiles WHERE department = 'Engineering';
```

### Add a new engineer
```sql
UPDATE profiles SET department = 'Engineering' WHERE email = 'new-engineer@example.com';
```

### Remove engineering designation
```sql
UPDATE profiles SET department = NULL WHERE email = 'user@example.com';
```

### Test search query (simulate typing "su")
```sql
SELECT email, full_name 
FROM profiles 
WHERE department = 'Engineering' 
  AND (LOWER(full_name) LIKE '%su%' OR LOWER(email) LIKE '%su%');
```

---

## ✅ Complete Diagnostic

Run this comprehensive script to check everything:

**File:** `DIAGNOSE_ENGINEERING_USERS.sql`

```bash
# Copy and run the entire DIAGNOSE_ENGINEERING_USERS.sql file
# It will show you:
# - All users and their departments
# - Count by department
# - Specific issues and fixes
```

---

## 🎓 Understanding the Flow

1. **Page loads** → `loadEngineeringUsers()` called
2. **Database query** → Fetches users WHERE department = 'Engineering'
3. **Console log** → Shows "✅ Total engineering users: X"
4. **User types "su"** → Filters loaded users by name/email
5. **Dropdown shows** → Matching users (e.g., "Suresh H B")
6. **User clicks** → Selected, form submits with user ID

---

## 📞 Still Having Issues?

1. Open browser console (F12)
2. Check for error messages
3. Look for: `🔍 Loaded engineering users: [...]`
4. If empty array `[]` → No users have department = 'Engineering'
5. Run Step 2 above to fix

---

**Expected Behavior:**
- ✅ Type 2+ characters → See suggestions
- ✅ Only Engineering department users appear
- ✅ Click user → Populates the field
- ✅ Submit → Assignment created with email notification

---

**Last Updated:** December 26, 2025
