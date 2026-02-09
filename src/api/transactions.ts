import { api, isAxiosError, getStatusMessage } from './client';

export interface Transaction {
  id: string;
  amount?: number;
  date?: string;
  type?: string;
  description?: string;
  [key: string]: unknown;
}

export async function getTransactions(): Promise<
  { success: true; data: Transaction[] } | { success: false; message: string; status?: number }
> {
  try {
    const { data } = await api.get<Transaction[]>('/transactions');
    const list = Array.isArray(data) ? data : (data as { data?: Transaction[] })?.data ?? [];
    return { success: true, data: list };
  } catch (e) {
    if (isAxiosError(e)) {
      const msg = (e.response?.data as { message?: string })?.message || getStatusMessage(e.response?.status ?? 0);
      return { success: false, message: msg, status: e.response?.status };
    }
    return { success: false, message: 'Network or unknown error.' };
  }
}
