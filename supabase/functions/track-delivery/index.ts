import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

interface TrackingRequest {
  consignment_number: string;
}

interface TrackingResponse {
  success: boolean;
  status?: string;
  remarks?: string;
  deliveredDate?: string;
  podUrl?: string;
  error?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { 
      headers: corsHeaders,
      status: 200 
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body: TrackingRequest = await req.json();
    const { consignment_number } = body;

    if (!consignment_number) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing consignment_number" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Tracking consignment: ${consignment_number}`);

    // Make the actual API call to ecritica
    const trackingResponse = await fetch(
      "https://www.ecritica.co/eFreightLive/api/tracking.php",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Auth: "NjMwMzIzNzMwMzIz",
          DocketNo: consignment_number,
        }),
      }
    );

    if (!trackingResponse.ok) {
      console.error(
        `API error: ${trackingResponse.status} ${trackingResponse.statusText}`
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: `API returned ${trackingResponse.status}`,
        }),
        {
          status: trackingResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const responseText = await trackingResponse.text();
    console.log(`Raw API response for ${consignment_number}:`, responseText);

    let trackingData;
    try {
      trackingData = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`JSON parse error for ${consignment_number}:`, parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid JSON response from tracking API",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Parsed tracking data for ${consignment_number}:`, JSON.stringify(trackingData, null, 2));

    // Extract status from API response using same logic as working single-row tracker
    let latestStatus = null;
    let latestRemarks = null;
    let deliveredDate = null;
    let podUrl = null;

    // Check if response is successful (code === 1)
    if (trackingData && trackingData.code === 1 && trackingData.data) {
      const docketDetails = trackingData.data.docketDetails;
      
      if (docketDetails) {
        console.log(`Found docketDetails for ${consignment_number}:`, docketDetails);
        
        // Check if delivered
        if (docketDetails.DeliveredDate) {
          latestStatus = 'Delivered';
          latestRemarks = `Delivered on ${docketDetails.DeliveredDate}`;
          deliveredDate = docketDetails.DeliveredDate;
          podUrl = docketDetails.pod_url || null;
          if (docketDetails.ReceivedBy) {
            latestRemarks += ` | Received by: ${docketDetails.ReceivedBy}`;
          }
          if (docketDetails.DestinationCity) {
            latestRemarks += ` | ${docketDetails.DestinationCity}`;
          }
          console.log(`Status DELIVERED for ${consignment_number}`);
        } 
        // Check if in transit
        else if (docketDetails.PickupDate) {
          latestStatus = 'In Transit';
          latestRemarks = `Picked up on ${docketDetails.PickupDate}`;
          if (docketDetails.OriginCity && docketDetails.DestinationCity) {
            latestRemarks += ` | From: ${docketDetails.OriginCity} | To: ${docketDetails.DestinationCity}`;
          }
          if (docketDetails.RevisedDueDate) {
            latestRemarks += ` | Expected: ${docketDetails.RevisedDueDate}`;
          }
          console.log(`Status IN TRANSIT for ${consignment_number}`);
        }
        // Pending pickup
        else if (docketDetails.ExpectedPickupDate) {
          latestStatus = 'Pending Pickup';
          latestRemarks = `Expected pickup: ${docketDetails.ExpectedPickupDate}`;
          console.log(`Status PENDING PICKUP for ${consignment_number}`);
        }
      } else {
        console.warn(`No docketDetails found for ${consignment_number}`);
      }
    } else {
      console.warn(`Invalid response structure or code !== 1 for ${consignment_number}. Response:`, trackingData);
    }

    if (!latestStatus) {
      console.error(`Could not extract status for ${consignment_number}. Full response:`, trackingData);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Could not extract status from API response",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result: TrackingResponse = {
      success: true,
      status: latestStatus,
      remarks: latestRemarks,
      deliveredDate: deliveredDate,
      podUrl: podUrl,
    };

    console.log(`Successfully extracted tracking for ${consignment_number}:`, result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`Error:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
