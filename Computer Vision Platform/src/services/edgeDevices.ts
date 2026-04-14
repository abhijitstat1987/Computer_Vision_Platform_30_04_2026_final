import { api } from "./api";

export interface EdgeDevice {
  id: number;
  name: string;
  location: string;
  status: "online" | "offline";
  cpu: string;
  memory: string;
  storage: string;
  models: number;
  ipAddress: string;
  platform?: string;
  gpuModel?: string;
}

export interface EdgeDevicePayload {
  name: string;
  location?: string;
  status?: "online" | "offline";
  cpu?: string;
  memory?: string;
  storage?: string;
  models?: number;
  ip_address?: string;
  platform?: string;
  gpu_model?: string;
}

export const edgeDevicesService = {
  list:      ()                                          => api.get<EdgeDevice[]>("/api/edge-devices/"),
  get:       (id: number)                                => api.get<EdgeDevice>(`/api/edge-devices/${id}`),
  create:    (data: EdgeDevicePayload)                   => api.post<EdgeDevice>("/api/edge-devices/", data),
  update:    (id: number, data: Partial<EdgeDevicePayload>) =>
                                                            api.put<EdgeDevice>(`/api/edge-devices/${id}`, data),
  remove:    (id: number)                                => api.delete(`/api/edge-devices/${id}`),
  setStatus: (id: number, status: "online" | "offline") =>
                                                            api.put(`/api/edge-devices/${id}/status`, { status }),
};
