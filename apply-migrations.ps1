# Apply Supabase Migrations
# Run this script to apply all pending migrations to your Supabase database

Write-Host "Applying Supabase migrations..." -ForegroundColor Cyan

# Check if supabase CLI is installed
if (!(Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Supabase CLI not found. Install it first:" -ForegroundColor Red
    Write-Host "  npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Check if project is linked
$statusOutput = supabase status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Project not linked. Link your project first:" -ForegroundColor Yellow
    Write-Host "  supabase link --project-ref YOUR_PROJECT_REF" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Find your project ref at: https://supabase.com/dashboard/project/_/settings/general" -ForegroundColor Gray
    exit 1
}

Write-Host "Pushing migrations to Supabase..." -ForegroundColor Green
supabase db push

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Migrations applied successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Verify tables in Supabase dashboard: Table Editor" -ForegroundColor Gray
    Write-Host "2. Check that user_feature_access table exists" -ForegroundColor Gray
    Write-Host "3. Restart your dev server: npm run dev" -ForegroundColor Gray
} else {
    Write-Host "✗ Migration failed. Check the error above." -ForegroundColor Red
    Write-Host "You can also apply migrations manually in the SQL Editor:" -ForegroundColor Yellow
    Write-Host "  https://supabase.com/dashboard/project/_/sql/new" -ForegroundColor Cyan
}
