# Quick Start: Device Configuration Separation

## 🚀 What Changed

You can now assign **different engineers** for:
1. **Heatmap creation** (Site Loading)
2. **Device configuration** (Device Setup)

## ⚡ Quick Setup (2 Steps)

### Step 1: Run SQL Migration
Open Supabase SQL Editor and run:
```sql
-- File: ADD_CONFIG_ENGINEER_COLUMN.sql
ALTER TABLE public.site_assignments 
ADD COLUMN IF NOT EXISTS config_assigned_to UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS config_assigned_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS config_deadline_at TIMESTAMPTZ;
```

### Step 2: Test It
1. Manager assigns heatmap to Engineer A
2. Engineer A completes heatmap
3. Manager assigns device config to Engineer B
4. Engineer B sees assignment in `/engineering/device-configurations`
5. Engineer A does NOT see device config (it's B's job)

## 📋 Page Overview

| Page | URL | Who Sees It | What It Shows |
|------|-----|-------------|---------------|
| **Site Loading** | `/project-manager/heatmap` | Manager | Assign heatmap engineers |
| **My Heatmaps** | `/engineering/my-heatmaps` | Engineers | Heatmap assignments |
| **Device Configs (Manager)** | `/project-manager/device-configurations` | Manager | Assign device config engineers |
| **Device Configs (Engineer)** | `/engineering/device-configurations` | Engineers | Device config assignments |

## 🔧 How It Works

```
Site → Heatmap Task → Engineer A (assigned_to)
     ↓
     Heatmap Done (status = 'Done')
     ↓
     Device Config Task → Engineer B (config_assigned_to)
     ↓
     Engineer B configures devices
```

## ✅ What Was Fixed

- ❌ **Before:** Assignments disappeared when different engineer assigned
- ✅ **After:** Each engineer sees only their specific assignments
- ❌ **Before:** Single `assigned_to` field for everything
- ✅ **After:** Separate `assigned_to` (heatmap) and `config_assigned_to` (device config)

## 📊 Database Fields

| Field | Purpose | Used By |
|-------|---------|---------|
| `assigned_to` | Heatmap engineer | My Heatmaps page |
| `config_assigned_to` | Device config engineer | Device Configurations page |
| `status` | Heatmap status | Heatmap workflow |
| `config_status` | Device config status | Device config workflow |

## 🎯 Key Points

1. **Different Engineers:** Heatmap and device config can be done by different people
2. **Same Engineer:** Or same person can do both (system handles both cases)
3. **Separate Tracking:** Each workflow has its own status, deadline, and engineer
4. **No More Disappearing:** Engineers only see their own assignments

## 📖 Full Documentation

See `DEVICE_CONFIG_SEPARATION_GUIDE.md` for complete details.

## ❓ Troubleshooting

**Problem:** Column doesn't exist error
**Fix:** Run the SQL migration above

**Problem:** Engineer can't see assignments
**Fix:** Check they're using the right page:
- Heatmap: `/engineering/my-heatmaps`
- Device Config: `/engineering/device-configurations`

---

✨ **That's it!** Run the SQL migration and start testing.
