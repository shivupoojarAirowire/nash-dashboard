# Load Site Edit Button Fix

## Issue Fixed

**Problem:** The "Edit" button (pencil icon) in the Load Site page was updating ALL fields (deadline, status, APs needed, remarks, completion details), but it should **only update the assigned engineer**.

## Solution

Modified the Edit Assignment dialog to become a **"Reassign Engineer"** dialog that only updates the `assigned_to` field.

---

## Changes Made

### 1. Added State for Engineer Selection
```typescript
const [editAssignedEngineer, setEditAssignedEngineer] = useState<string>("");
```

### 2. Updated `handleEditAssignment` Function
Now initializes the engineer selection when opening the edit dialog:
```typescript
setEditAssignedEngineer(assignment.assigned_to || "");
```

### 3. Simplified `handleUpdateAssignment` Function
**Before:** Updated deadline, status, APs needed, remarks, uploaded files, etc.

**After:** Only updates the assigned engineer:
```typescript
const updateData: any = {
  assigned_to: editAssignedEngineer,
  updated_at: new Date().toISOString()
};
```

### 4. Redesigned Edit Dialog UI
**Before:**
- Deadline input
- Status dropdown
- APs Needed input
- Remarks textarea
- File upload (when status = Done)
- Floor details

**After:**
- Site information (read-only display)
- Engineer dropdown selector
- Update/Cancel buttons

---

## How It Works Now

### Location
**Page:** Load Site / HeatMaps  
**URL:** `http://localhost:8083/project-manager/load-site`

### User Flow

1. **View Assignments**
   - Manager sees list of all site loading assignments
   - Each row shows: Site Code, City, Store Name, Engineer, Deadline, Status

2. **Click Edit (Pencil Icon)**
   - Opens "Reassign Engineer" dialog
   - Shows current site information (read-only)
   - Shows dropdown with all engineering team members

3. **Select New Engineer**
   - Choose different engineer from dropdown
   - Click "Update Engineer" button

4. **Result**
   - Only `assigned_to` field is updated
   - All other fields remain unchanged (deadline, status, APs needed, remarks, etc.)
   - Success message: "Engineer reassigned successfully"

---

## Dialog Display

### Information Shown (Read-Only)
```
Site: [Store Code]
City: [City Name]
Status: [Current Status]
```

### Editable Field
```
Assigned Engineer: [Dropdown with all engineering users]
```

### Buttons
- **Cancel** - Close dialog without changes
- **Update Engineer** - Save the new engineer assignment

---

## Validation

- ✅ Engineer selection is required (cannot be empty)
- ✅ Only updates `assigned_to` field
- ✅ Preserves all other assignment data
- ✅ Updates `updated_at` timestamp

---

## Database Update

**Fields Updated:**
```sql
UPDATE site_assignments 
SET 
  assigned_to = [new_engineer_id],
  updated_at = NOW()
WHERE id = [assignment_id]
```

**Fields NOT Changed:**
- `deadline_at` - Remains unchanged
- `status` - Remains unchanged
- `aps_needed` - Remains unchanged
- `remarks` - Remains unchanged
- `floors` - Remains unchanged
- `floor_size` - Remains unchanged
- `heatmap_files` - Remains unchanged
- `completed_at` - Remains unchanged

---

## Benefits

✅ **Simple & Clear:** Dialog title is "Reassign Engineer" - no confusion about purpose

✅ **Safe:** Cannot accidentally change deadline, status, or other important fields

✅ **Fast:** Quick way to reassign work to different engineer

✅ **Preserves Data:** All other assignment information stays intact

---

## Engineer List

The dropdown shows all users with `department = 'Engineering'` from the profiles table.

Display format: `[Full Name]` or `[Email]` if no full name

---

## Example Scenarios

### Scenario 1: Engineer is Sick
- Manager opens edit dialog for assignment
- Selects different engineer from dropdown
- Original deadline, status, and requirements remain unchanged
- New engineer now sees the assignment

### Scenario 2: Workload Balancing
- Manager reassigns multiple tasks from Engineer A to Engineer B
- Each task keeps its original deadline and requirements
- Engineer B sees all newly assigned tasks

### Scenario 3: Wrong Assignment
- Manager realizes wrong engineer was assigned
- Quick fix: Open edit, select correct engineer, done
- No risk of changing other important data

---

## Testing

### Test Steps
1. Go to `http://localhost:8083/project-manager/load-site`
2. Find any assignment in the table
3. Click the pencil (Edit) icon
4. Verify dialog shows "Reassign Engineer" title
5. Verify site info is displayed (read-only)
6. Select different engineer from dropdown
7. Click "Update Engineer"
8. Verify success message
9. Verify table now shows new engineer name
10. Verify other fields (deadline, status) unchanged

### Verification Query
```sql
SELECT 
  store_code,
  assigned_to,
  deadline_at,
  status,
  aps_needed,
  updated_at
FROM site_assignments
WHERE id = '[assignment_id]';
```

---

## Files Modified

- ✅ `src/pages/Heatmap.tsx`
  - Added `editAssignedEngineer` state
  - Modified `handleEditAssignment` function
  - Simplified `handleUpdateAssignment` function
  - Redesigned edit dialog UI

---

## Key Points

1. **Single Purpose:** Edit button ONLY changes assigned engineer
2. **No Side Effects:** Other fields are never modified
3. **Engineering Team Only:** Dropdown filtered by `department = 'Engineering'`
4. **Validation:** Engineer selection is required
5. **Safe Operation:** No risk of accidentally changing status, deadline, or completion data

---

## Troubleshooting

### Issue: Dropdown is empty
**Cause:** No users have `department = 'Engineering'` in profiles table  
**Fix:** Update user profiles or run the QUICK_FIX_SEARCH.sql script

### Issue: Engineer not in dropdown
**Cause:** User's department field is not set to 'Engineering'  
**Fix:** Update the user's profile:
```sql
UPDATE profiles 
SET department = 'Engineering' 
WHERE id = '[user_id]';
```

### Issue: Update not saving
**Cause:** RLS policies may be blocking the update  
**Fix:** Check user has permission to update site_assignments

---

## Summary

The Edit button in Load Site page is now a focused "Reassign Engineer" tool that safely changes only the assigned engineer without affecting any other assignment data. This makes it quick and safe for managers to reassign work between team members.
