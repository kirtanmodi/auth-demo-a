const API_BASE_URL = "https://xccz9chneh.execute-api.us-east-1.amazonaws.com/dev";

// Admin token for protected endpoints
const ADMIN_TOKEN = "admin_1d505f9c0506adcdc4d45345a2b34196c548f25e6ff5a04f082706e264a03ea6";

export interface Merchant {
  id: string;
  businessName: string;
  legalName: string;
  email: string;
  phone: string;
  website?: string;
  status: string;
  createdAt: string;
}

export interface CreateMerchantRequest {
  businessName: string;
  legalName: string;
  email: string;
  phone: string;
  website?: string;
}

export const merchantApi = {
  // Public endpoint - no authorization required
  create: async (merchant: CreateMerchantRequest): Promise<Merchant> => {
    const response = await fetch(`${API_BASE_URL}/merchants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // No Authorization header for public endpoint
      },
      body: JSON.stringify(merchant),
    });

    if (!response.ok) {
      throw new Error(`Failed to create merchant: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  },

  // Admin-only endpoint - requires admin token
  list: async (): Promise<{ merchants: Merchant[]; count: number }> => {
    const response = await fetch(`${API_BASE_URL}/merchants`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ADMIN_TOKEN}`, // Admin token required
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list merchants: ${response.statusText}`);
    }

    const result = await response.json();
    return { merchants: result.data, count: result.count };
  },
};
