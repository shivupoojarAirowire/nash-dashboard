# Device Configuration Engineer Separation - Implementation Guide

## Problem Overview

**Issue:** The system was using a single `assigned_to` field for both:
1. Heatmap creation engineer assignments
2. Device configuration engineer assignments

This caused assignments to "disappear" from the engineer's view when a different engineer was assigned for device configuration.

**Solution:** Separate the two workflows by adding dedicated fields for device configuration engineers.

---

## Database Changes

### New Columns Added to `site_assignments` Table

Run the following SQL in your Supabase SQL Editor:

```sql
-- Add columns for device configuration engineer
ALTER TABLE public.site_assignments 
ADD COLUMN IF NOT EXISTS config_assigned_to UUID REFERENCES auth.users(id);

ALTER TABLE public.site_assignments 
ADD COLUMN IF NOT EXISTS config_assigned_by UUID REFERENCES auth.users(id);

ALTER TABLE public.site_assignments 
ADD COLUMN IF NOT EXISTS config_deadline_at TIMESTAMPTZ;

-- Add comment for clarity
COMMENT ON COLUMN public.site_assignments.config_assigned_to IS 'Engineer assigned for device configuration (different from heatmap engineer)';
COMMENT ON COLUMN public.site_assignments.config_assigned_by IS 'Manager who assigned the device configuration engineer';
COMMENT ON COLUMN public.site_assignments.config_deadline_at IS 'Deadline for device configuration completion';
```

**File Created:** `ADD_CONFIG_ENGINEER_COLUMN.sql` contains this script.

---

## Field Separation Explained

### Heatmap Workflow Fields
- `assigned_to` → Heatmap engineer (who creates the heatmap)
- `assigned_by` → Manager who assigned heatmap task
- `deadline_at` → Heatmap completion deadline
- `status` → Heatmap status (Pending, In Progress, Done)

### Device Configuration Workflow Fields (NEW)
- `config_assigned_to` → Device config engineer (who configures devices)
- `config_assigned_by` → Manager who assigned device config task
- `config_deadline_at` → Device config completion deadline
- `config_status` → Device config status (Not Started, In Progress, Completed)

---

## Code Changes Made

### 1. DeviceConfigurations.tsx (Manager View)

**Purpose:** Manager assigns device configuration engineers

**Changes:**
- ✅ Updated `SiteAssignment` type to include `config_assigned_to`, `config_assigned_by`, `config_deadline_at`
- ✅ Updated database query to fetch config fields
- ✅ Updated data mapping to use config fields
- ✅ Updated `openDialogForSite` to initialize `config_assigned_to` and `config_deadline_at`
- ✅ Updated `saveConfiguration` to save to config fields with `config_status = 'Not Started'`
- ✅ Updated table display to show `config_assigned_to` (engineer) and `config_deadline_at` (deadline)
- ✅ Updated "Assign" button to check `config_assigned_to` field

**Result:** Managers can now assign device configuration engineers separately from heatmap engineers.

---

### 2. EngineerDeviceConfigurations.tsx (Engineer View)

**Purpose:** Engineers view and complete their device configuration assignments

**Changes:**
- ✅ Updated `SiteAssignment` type to use `config_deadline_at` instead of `deadline_at`
- ✅ Updated query to filter by `config_assigned_to` instead of `assigned_to`
- ✅ Updated query to select `config_deadline_at` field
- ✅ Updated query to order by `config_deadline_at`
- ✅ Updated data mapping to use `config_deadline_at`
- ✅ Updated deadline display to show `config_deadline_at`
- ✅ Updated overdue check to use `config_deadline_at`

**Result:** Engineers now see only their device configuration assignments (not heatmap assignments).

---

## Complete Workflow

### Step 1: Heatmap Creation
1. Manager assigns site loading task to **Engineer A** (heatmap engineer)
2. Fields populated: `assigned_to = Engineer A`, `status = 'Pending'`
3. Engineer A sees assignment in **My Heatmaps** page
4. Engineer A completes heatmap → `status = 'Done'`

### Step 2: Device Configuration (NEW)
5. Site now appears in **Device Configurations** page (status = 'Done')
6. Manager assigns device config to **Engineer B** (can be different from Engineer A)
7. Fields populated: `config_assigned_to = Engineer B`, `config_status = 'Not Started'`, `config_deadline_at = [date]`
8. Engineer B sees assignment in **Engineer Device Configurations** page
9. Engineer B clicks "Start" → `config_status = 'In Progress'`
10. Engineer B completes configuration → `config_status = 'Completed'`

---

## Pages and URLs

### Manager Pages
- **Site Loading Assignment:** `/project-manager/heatmap`
  - Assigns heatmap engineers using `assigned_to`
  
- **Device Configuration Assignment:** `/project-manager/device-configurations`
  - Assigns device config engineers using `config_assigned_to`
  - Only shows sites with `status = 'Done'` (heatmap completed)

### Engineer Pages
- **My Heatmaps:** `/engineering/my-heatmaps`
  - Shows sites assigned via `assigned_to` field
  - For heatmap creation tasks
  
- **Engineer Device Configurations:** `/engineering/device-configurations`
  - Shows sites assigned via `config_assigned_to` field
  - For device configuration tasks

---

## Testing Steps

### 1. Run Database Migration
```sql
-- In Supabase SQL Editor, run:
-- File: ADD_CONFIG_ENGINEER_COLUMN.sql
```

### 2. Verify Columns Created
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'site_assignments' 
  AND column_name LIKE 'config_%';
```

Expected results:
- `config_assigned_to` (uuid)
- `config_assigned_by` (uuid)
- `config_deadline_at` (timestamp with time zone)
- `config_status` (text)

### 3. Test Complete Workflow

**As Manager:**
1. Go to `/project-manager/heatmap`
2. Assign a site to Engineer A (heatmap engineer)
3. Verify Engineer A can see it in `/engineering/my-heatmaps`

**As Engineer A:**
4. Complete the heatmap (status → Done)

**As Manager:**
5. Go to `/project-manager/device-configurations`
6. Site should appear (status = Done)
7. Assign device config to Engineer B (different from Engineer A)

**As Engineer B:**
8. Go to `/engineering/device-configurations`
9. Should see the device config assignment
10. Click "Start" → status changes to "In Progress"
11. Configure devices and complete

**As Engineer A:**
12. Engineer A should NOT see device config assignment (it's assigned to Engineer B)
13. Engineer A only sees their heatmap assignments in My Heatmaps

---

## Key Benefits

✅ **Separation of Concerns:** Heatmap engineers and device config engineers are now independent

✅ **No More Disappearing Assignments:** Each engineer sees only their relevant assignments

✅ **Clear Workflow:** Two distinct phases with separate engineers, deadlines, and statuses

✅ **Flexibility:** Same engineer can be assigned to both tasks, or different engineers can handle each phase

✅ **Better Tracking:** Managers can track heatmap progress and device config progress separately

---

## Database Schema Summary

```
site_assignments table:
├── Heatmap Workflow
│   ├── assigned_to (UUID)           → Heatmap engineer
│   ├── assigned_by (UUID)           → Who assigned heatmap
│   ├── deadline_at (TIMESTAMPTZ)    → Heatmap deadline
│   └── status (TEXT)                → pending/in progress/done
│
└── Device Config Workflow (NEW)
    ├── config_assigned_to (UUID)     → Device config engineer
    ├── config_assigned_by (UUID)     → Who assigned config
    ├── config_deadline_at (TIMESTAMPTZ) → Config deadline
    └── config_status (TEXT)          → Not Started/In Progress/Completed
```

---

## Troubleshooting

### Issue: "Column config_assigned_to does not exist"
**Solution:** Run the `ADD_CONFIG_ENGINEER_COLUMN.sql` script in Supabase SQL Editor

### Issue: Engineer can't see assignments
**Solution:** Check RLS policies - ensure engineers can read rows where `config_assigned_to = auth.uid()`

### Issue: Assignments still disappearing
**Solution:** Verify the correct page is being used:
- Heatmap assignments: `/engineering/my-heatmaps` (uses `assigned_to`)
- Device config assignments: `/engineering/device-configurations` (uses `config_assigned_to`)

### Issue: Old assignments showing wrong data
**Solution:** Existing assignments may have null `config_assigned_to`. Manager needs to reassign them using the Device Configurations page.

---

## Next Steps

1. ✅ Run `ADD_CONFIG_ENGINEER_COLUMN.sql` in Supabase
2. ✅ Test the complete workflow with two different engineers
3. ⏳ Optional: Add RLS policies if needed (see below)
4. ⏳ Optional: Migrate existing assignments to new fields

### Optional RLS Policy (if needed)

```sql
-- Allow engineers to view their device config assignments
CREATE POLICY "Engineers can view their config assignments"
ON public.site_assignments
FOR SELECT
TO authenticated
USING (
  auth.uid() = config_assigned_to
);
```

---

## Files Modified

- ✅ `src/pages/DeviceConfigurations.tsx` - Manager device config assignment page
- ✅ `src/pages/EngineerDeviceConfigurations.tsx` - Engineer device config view page
- ✅ `ADD_CONFIG_ENGINEER_COLUMN.sql` - Database migration script (NEW)
- ✅ `DEVICE_CONFIG_SEPARATION_GUIDE.md` - This guide (NEW)

---

## Summary

The system now properly separates heatmap creation from device configuration by using dedicated database fields and filtering logic. Engineers assigned to create heatmaps see their assignments in **My Heatmaps**, while engineers assigned to configure devices see their assignments in **Engineer Device Configurations**. These can be the same person or different people - the system now handles both scenarios correctly.
