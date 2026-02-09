import { api, isAxiosError, getStatusMessage } from './client';

export interface LicenseItem {
  id?: string;
  license_id?: string;
  licenseId?: string; // Selected license ID
  name?: string;
  licenseName?: string; // Selected license name
  pricePerMonth: number;
  months: number;
  quantity?: number; // Quantity/units
  amount?: number;
  amount_per_unit?: number;
}

export interface License {
  id: string;
  name: string;
  monthly_price: string; // API returns as string
  status_id: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
  // For backward compatibility
  license_id?: string;
  amount_per_unit?: number;
  [key: string]: unknown;
}

export interface LicensesListResponse {
  data?: {
    rows?: License[];
    totalCount?: number;
  };
  status?: number;
  api_status?: string;
  message?: string;
  // For backward compatibility
  licenses?: License[];
  [key: string]: unknown;
}

export interface PurchaseLicenseRequest {
  licenses: { pricePerMonth: number; months: number }[];
}

export interface PurchaseLicenseResponse {
  totalAmount?: number;
  transactionId?: string;
  [key: string]: unknown;
}

export async function getLicensesList(
  offset: number = 0,
  limit: number = 10
): Promise<{ success: true; data: License[]; totalCount?: number } | { success: false; message: string; status?: number }> {
  try {
    console.log(`📋 Fetching licenses list: offset=${offset}, limit=${limit}`);
    const response = await api.get<LicensesListResponse>('/licenses/list', {
      params: { offset, limit },
    });
    
    const responseData = response.data;
    let licenses: License[] = [];
    let totalCount: number | undefined;
    
    // Handle the actual API response structure: data.data.rows
    if (responseData.data?.rows) {
      licenses = responseData.data.rows;
      totalCount = responseData.data.totalCount;
    } 
    // Fallback for other possible formats
    else if (responseData.licenses) {
      licenses = responseData.licenses;
    } 
    else if (Array.isArray(responseData.data)) {
      licenses = responseData.data;
    }
    else if (Array.isArray(responseData)) {
      licenses = responseData;
    }
    
    console.log(`✅ Licenses fetched:`, licenses);
    console.log(`📊 Total count:`, totalCount);
    
    return { success: true, data: licenses, totalCount };
  } catch (e) {
    console.error('❌ Error fetching licenses:', e);
    if (isAxiosError(e)) {
      const msg = (e.response?.data as { message?: string })?.message || getStatusMessage(e.response?.status ?? 0);
      return { success: false, message: msg, status: e.response?.status };
    }
    return { success: false, message: 'Network or unknown error.' };
  }
}

export async function purchaseLicenses(
  payload: PurchaseLicenseRequest
): Promise<{ success: true; data: PurchaseLicenseResponse } | { success: false; message: string; status?: number }> {
  try {
    const { data } = await api.post<PurchaseLicenseResponse>('/licenses/purchase', payload);
    return { success: true, data };
  } catch (e) {
    if (isAxiosError(e)) {
      const msg = (e.response?.data as { message?: string })?.message || getStatusMessage(e.response?.status ?? 0);
      return { success: false, message: msg, status: e.response?.status };
    }
    return { success: false, message: 'Network or unknown error.' };
  }
}
