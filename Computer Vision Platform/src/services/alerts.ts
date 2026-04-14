import { api } from "./api";

export interface Alert {
  id: number;
  camera_id: number;
  event_id?: number;
  alert_type: string;
  message: string;
  status: "unresolved" | "acknowledged" | "resolved";
  created_at: string;
}

export interface AlertPayload {
  camera_id: number;
  event_id?: number;
  alert_type?: string;
  message: string;
  status?: "unresolved" | "acknowledged" | "resolved";
}

export const alertsService = {
  list:   (params?: { status?: string; camera_id?: number; alert_type?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return api.get<Alert[]>(`/api/alerts/${qs ? `?${qs}` : ""}`);
  },
  create: (data: AlertPayload)                         => api.post<Alert>("/api/alerts/", data),
  update: (id: number, data: Partial<AlertPayload>)    => api.put<Alert>(`/api/alerts/${id}`, data),
};
