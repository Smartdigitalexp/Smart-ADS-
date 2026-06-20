export const verifyTripoConnectivity = async (apiKey: string) => {
  try {
    const pingUrl = 'https://api.tripo3d.ai/v2/openapi/task';
    
    const response = await fetch(pingUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
        const errorHtml = await response.text();
        console.error(`[Tripo verify connectivity] Error ${response.status}:`, errorHtml);
        return { success: false, status: response.status, body: errorHtml };
    }

    return { success: true, status: response.status };
  } catch (error: any) {
    console.error("[Tripo verify connectivity] Exception:", error);
    return { success: false, error: error.message };
  }
};

export const checkTripoHealth = async () => {
  try {
    const url = 'https://api.tripo3d.ai/api/v1/health'; 
    
    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
        const errorHtml = await response.text();
        console.error(`[Tripo health check] Error ${response.status}:`, errorHtml);
        return { success: false, status: response.status, body: errorHtml };
    }

    return { success: true, status: response.status };
  } catch (error: any) {
    console.error("[Tripo health check] Exception:", error);
    return { success: false, error: error.message };
  }
};
