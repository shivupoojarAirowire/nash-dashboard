/**
 * FortiMonitor API Client
 * 
 * This client handles communication with FortiMonitor API to fetch site and device status information.
 * 
 * Configuration required:
 * 1. API endpoint URL
 * 2. Authentication token/credentials
 * 3. API version
 * 
 * Example usage:
 * ```typescript
 * const sites = await fetchSites();
 * const devices = await fetchDevices(siteId);
 * const deviceStatus = await fetchDeviceStatus(deviceId);
 * ```
 */

// TODO: Configure these values based on your FortiMonitor instance
const FORTIMONITOR_API_BASE_URL = process.env.VITE_FORTIMONITOR_API_URL || 'https://fortimonitor-api.example.com/api/v1';
const FORTIMONITOR_API_TOKEN = process.env.VITE_FORTIMONITOR_API_TOKEN || '';

type DeviceStatus = {
  serial: string;
  type: string;
  status: 'up' | 'down';
  lastSeen?: string;
  ipAddress?: string;
  model?: string;
  firmware?: string;
};

type Site = {
  id: string;
  siteName: string;
  siteCode: string;
  city: string;
  devices: DeviceStatus[];
  location?: {
    latitude: number;
    longitude: number;
  };
};

/**
 * Fetch all sites with their devices from FortiMonitor
 */
export async function fetchSites(): Promise<Site[]> {
  try {
    const response = await fetch(`${FORTIMONITOR_API_BASE_URL}/sites`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FORTIMONITOR_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`FortiMonitor API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform API response to match our Site type
    // Adjust this mapping based on actual FortiMonitor API response structure
    return data.map((site: any) => ({
      id: site.id || site.site_id,
      siteName: site.name || site.site_name,
      siteCode: site.code || site.site_code,
      city: site.city || site.location?.city,
      devices: site.devices || [],
      location: site.location,
    }));
  } catch (error) {
    console.error('Error fetching sites from FortiMonitor:', error);
    throw error;
  }
}

/**
 * Fetch devices for a specific site
 */
export async function fetchSiteDevices(siteId: string): Promise<DeviceStatus[]> {
  try {
    const response = await fetch(`${FORTIMONITOR_API_BASE_URL}/sites/${siteId}/devices`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FORTIMONITOR_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`FortiMonitor API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform API response to match our DeviceStatus type
    return data.map((device: any) => ({
      serial: device.serial || device.serial_number,
      type: device.type || device.device_type,
      status: device.status === 'online' || device.status === 'up' ? 'up' : 'down',
      lastSeen: device.last_seen || device.lastSeen,
      ipAddress: device.ip_address || device.ipAddress,
      model: device.model,
      firmware: device.firmware || device.firmware_version,
    }));
  } catch (error) {
    console.error('Error fetching site devices from FortiMonitor:', error);
    throw error;
  }
}

/**
 * Fetch status for a specific device
 */
export async function fetchDeviceStatus(deviceSerial: string): Promise<DeviceStatus> {
  try {
    const response = await fetch(`${FORTIMONITOR_API_BASE_URL}/devices/${deviceSerial}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FORTIMONITOR_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`FortiMonitor API error: ${response.statusText}`);
    }

    const device = await response.json();
    
    return {
      serial: device.serial || device.serial_number,
      type: device.type || device.device_type,
      status: device.status === 'online' || device.status === 'up' ? 'up' : 'down',
      lastSeen: device.last_seen || device.lastSeen,
      ipAddress: device.ip_address || device.ipAddress,
      model: device.model,
      firmware: device.firmware || device.firmware_version,
    };
  } catch (error) {
    console.error('Error fetching device status from FortiMonitor:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time device status updates (if FortiMonitor supports WebSockets)
 */
export function subscribeToDeviceUpdates(
  siteId: string,
  callback: (device: DeviceStatus) => void
): () => void {
  // TODO: Implement WebSocket connection for real-time updates if supported
  // Example:
  // const ws = new WebSocket(`wss://fortimonitor-api.example.com/ws/sites/${siteId}`);
  // ws.onmessage = (event) => {
  //   const device = JSON.parse(event.data);
  //   callback(device);
  // };
  // 
  // Return cleanup function:
  // return () => ws.close();
  
  console.warn('Real-time updates not yet implemented');
  return () => {};
}

export type { Site, DeviceStatus };
