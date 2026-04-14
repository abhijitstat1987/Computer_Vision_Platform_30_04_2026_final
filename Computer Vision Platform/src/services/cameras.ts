import { api } from "./api";

export interface Camera {
  id: number;
  name: string;
  location: string;
  status: "active" | "inactive" | "error";
  fps: number;
  resolution: string;
  ip: string;
  rtspUrl: string;
  model?: string;
  camera_type?: string;
}

export interface CameraPayload {
  name: string;
  location?: string;
  status?: "active" | "inactive" | "error";
  fps?: number;
  resolution?: string;
  ip_address: string;
  rtsp_url?: string;
  hardware_model?: string;
  camera_type?: string;
}

export const camerasService = {
  list:         ()                          => api.get<Camera[]>("/api/cameras/"),
  get:          (id: number)                => api.get<Camera>(`/api/cameras/${id}`),
  create:       (data: CameraPayload)       => api.post<Camera>("/api/cameras/", data),
  update:       (id: number, data: Partial<CameraPayload>) =>
                                               api.put<Camera>(`/api/cameras/${id}`, data),
  remove:       (id: number)                => api.delete(`/api/cameras/${id}`),
  setStatus:    (id: number, status: string) =>
                                               api.put(`/api/cameras/${id}/status`, { status }),
};
