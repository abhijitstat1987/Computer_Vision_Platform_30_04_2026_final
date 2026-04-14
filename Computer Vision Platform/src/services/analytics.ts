import { api } from "./api";

export interface Summary {
  total_events: number;
  events_by_camera: { camera_id: number; camera_name: string; count: number }[];
  events_by_type: { event_type: string; count: number }[];
  top_labels: { label: string; count: number }[];
  total_alerts: number;
  unresolved_alerts: number;
}

export interface TimePoint { period: string; count: number }

export const analyticsService = {
  summary:             ()                                         => api.get<Summary>("/api/analytics/summary"),
  detectionsOverTime:  (granularity = "day", days = 7)           =>
                         api.get<TimePoint[]>(`/api/analytics/detections-over-time?granularity=${granularity}&days=${days}`),
  topObjects:          (limit = 10)                               =>
                         api.get<{ label: string; count: number }[]>(`/api/analytics/top-objects?limit=${limit}`),
  cameraActivity:      ()                                         =>
                         api.get<{ camera_id: number; camera_name: string; count: number }[]>("/api/analytics/camera-activity"),
};
