import { api, isAxiosError, getStatusMessage } from './client';

export interface ActiveOrderData {
  remainingDays: number;
  expiry: string; // ISO date e.g. "2026-03-07"
  totalRecords?: number;
}

export interface ActiveOrderResponse {
  data?: ActiveOrderData;
  status?: number;
  api_status?: string;
  message?: string;
  [key: string]: unknown;
}

export async function getActiveOrder(): Promise<
  | { success: true; data: ActiveOrderData }
  | { success: false; message: string; status?: number }
> {
  try {
    const response = await api.get<ActiveOrderResponse>('/orders/active');
    const raw = response.data;
    const data = (raw?.data ?? raw) as ActiveOrderData | undefined;
    const remainingDays = data?.remainingDays ?? 0;
    const expiry = data?.expiry ?? '';
    const totalRecords = typeof data?.totalRecords === 'number' ? data.totalRecords : 0;
    return { success: true, data: { remainingDays, expiry, totalRecords } };
  } catch (e) {
    if (isAxiosError(e)) {
      const status = e.response?.status;
      const msg = (e.response?.data as { message?: string })?.message || getStatusMessage(status ?? 0);
      return { success: false, message: msg, status };
    }
    return { success: false, message: 'Network or unknown error.' };
  }
}

export interface OrderItem {
  license_id: string;
  quantity: number;
  amount_per_unit: number;
}

export interface CreateOrderRequest {
  total_amount: number;
  order_items: OrderItem[];
}

export interface CreateOrderResponse {
  id?: string;
  order_id?: string;
  total_amount?: number;
  status?: string;
  [key: string]: unknown;
}

export async function createOrder(
  payload: CreateOrderRequest
): Promise<{ success: true; data: CreateOrderResponse } | { success: false; message: string; status?: number }> {
  try {
    console.log('🛒 Creating order:', payload);
    const { data } = await api.post<CreateOrderResponse>('/orders/', payload);
    console.log('✅ Order created successfully:', data);
    return { success: true, data };
  } catch (e) {
    console.error('❌ Error creating order:', e);
    if (isAxiosError(e)) {
      const msg = (e.response?.data as { message?: string })?.message || getStatusMessage(e.response?.status ?? 0);
      return { success: false, message: msg, status: e.response?.status };
    }
    return { success: false, message: 'Network or unknown error.' };
  }
}

// --- Orders list (transaction history) ---

export interface OrderItemLicense {
  id: string;
  name: string;
  monthly_price: string;
}

export interface OrderItemRecord {
  id: string;
  order_id: string;
  license_id: string;
  quantity: number;
  amount_per_qty: number;
  amount_total_qty: number;
  purchase_date?: string;
  start_date?: string;
  expiry_date?: string;
  license?: OrderItemLicense;
  [key: string]: unknown;
}

export interface PaymentStatus {
  id: number;
  name: string;
  status_id?: number;
}

export interface OrderRecord {
  id: string;
  user_id: string;
  invoice_no: string;
  invoice_date: string;
  total_amount: number;
  payment_status_id: number;
  status_id: number;
  created_at: string;
  updated_at: string;
  order_items: OrderItemRecord[];
  payment_status?: PaymentStatus;
  [key: string]: unknown;
}

export interface OrdersListResponse {
  data?: OrderRecord[];
  status?: number;
  api_status?: string;
  message?: string;
  [key: string]: unknown;
}

const ORDERS_PAGE_SIZE = 10

export async function getOrdersList(
  offset: number = 0,
  limit: number = ORDERS_PAGE_SIZE
): Promise<
  | { success: true; data: OrderRecord[] }
  | { success: false; message: string; status?: number }
> {
  try {
    const response = await api.get<OrdersListResponse>('/orders/', {
      params: { offset, limit },
    })
    const raw = response.data
    const list = Array.isArray(raw?.data) ? raw.data : []
    return { success: true, data: list }
  } catch (e) {
    if (isAxiosError(e)) {
      const msg = (e.response?.data as { message?: string })?.message || getStatusMessage(e.response?.status ?? 0)
      return { success: false, message: msg, status: e.response?.status }
    }
    return { success: false, message: 'Network or unknown error.' }
  }
}

// --- Order invoice download (returns base64 HTML) ---

export interface OrderDownloadResponse {
  data?: string
  status?: number
  api_status?: string
  message?: string
  [key: string]: unknown
}

export async function downloadOrderInvoice(
  orderId: string
): Promise<
  | { success: true; data: string }
  | { success: false; message: string; status?: number }
> {
  try {
    const response = await api.get<OrderDownloadResponse>('/orders/download', {
      params: { id: orderId },
    })
    const base64 = response.data?.data
    if (typeof base64 !== 'string') {
      return { success: false, message: 'Invalid download response.' }
    }
    return { success: true, data: base64 }
  } catch (e) {
    if (isAxiosError(e)) {
      const msg = (e.response?.data as { message?: string })?.message || getStatusMessage(e.response?.status ?? 0)
      return { success: false, message: msg, status: e.response?.status }
    }
    return { success: false, message: 'Network or unknown error.' }
  }
}
