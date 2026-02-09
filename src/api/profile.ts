import { api, isAxiosError, getStatusMessage } from './client';

export interface ApiResponse<T = unknown> {
  status: number;
  api_status?: string;
  message?: string;
  data: T;
}

export async function getProfile(): Promise<
  | { success: true; status: number; api_status?: string; message?: string; data: unknown }
  | { success: false; message: string; status?: number; api_status?: string; data?: unknown }
> {
  try {
    const { data, status } = await api.get<ApiResponse>('/profile');
    const body = data as ApiResponse;
    return {
      success: true,
      status: body.status ?? status,
      api_status: body.api_status,
      message: body.message,
      data: body.data ?? body,
    };
  } catch (e) {
    if (isAxiosError(e)) {
      const d = e.response?.data as ApiResponse | undefined;
      const msg = d?.message || (e.response?.data as { message?: string })?.message || getStatusMessage(e.response?.status ?? 0);
      return {
        success: false,
        message: msg,
        status: e.response?.status,
        api_status: d?.api_status,
        data: d?.data,
      };
    }
    return { success: false, message: 'Network or unknown error.' };
  }
}
