# Track Delivery Edge Function

This Supabase Edge Function handles API calls to the ecritica tracking service, bypassing CORS restrictions that would occur if called directly from the browser.

## Setup

1. **Deploy the Edge Function:**
   ```bash
   supabase functions deploy track-delivery
   ```

2. **Verify Deployment:**
   - Go to Supabase Dashboard > Functions
   - You should see `track-delivery` function listed

3. **Grant Permissions (if needed):**
   - The function needs network access to call external APIs
   - In `supabase/config.toml`, ensure the function has proper permissions

## How It Works

1. Frontend (Delivery.tsx) calls this Edge Function with a consignment number
2. Edge Function makes the actual API call to ecritica tracking service (no CORS issues on server)
3. Edge Function extracts tracking information from the response
4. Edge Function returns clean JSON data back to frontend
5. Frontend updates the database with the tracking information

## API Request Format

```json
POST /functions/v1/track-delivery

{
  "consignment_number": "939111223"
}
```

## API Response Format

**Success:**
```json
{
  "success": true,
  "status": "In Transit",
  "deliveryDate": "2024-02-05",
  "remarks": "Package in transit"
}
```

**Error:**
```json
{
  "success": false,
  "error": "API returned 404"
}
```

## Environment Variables

The Edge Function uses hardcoded auth credentials for the ecritica API:
- Auth: `NjMwMzIzNzMwMzIz`
- DocketNo: Passed as parameter

## Testing

You can test the Edge Function manually:

```bash
curl -X POST http://localhost:54321/functions/v1/track-delivery \
  -H "Content-Type: application/json" \
  -d '{"consignment_number": "939111223"}'
```

## Troubleshooting

- Check Supabase Function logs for detailed error messages
- Verify the function is deployed: `supabase functions list`
- Ensure VITE_SUPABASE_URL is set in your environment (.env.local)
- Check browser console for request/response details
