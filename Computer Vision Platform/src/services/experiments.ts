import { api } from "./api";

export interface Experiment {
  id: number;
  name: string;
  dataset: string;
  status: "training" | "completed" | "pending" | "paused";
  epoch: string;
  accuracy: string;
  loss: string;
}

export interface ExperimentPayload {
  name: string;
  dataset?: string;
  status?: Experiment["status"];
  epoch_current?: number;
  epoch_total?: number;
  accuracy?: string;
  loss?: string;
}

export const experimentsService = {
  list:      ()                                          => api.get<Experiment[]>("/api/experiments/"),
  get:       (id: number)                                => api.get<Experiment>(`/api/experiments/${id}`),
  create:    (data: ExperimentPayload)                   => api.post<Experiment>("/api/experiments/", data),
  update:    (id: number, data: Partial<ExperimentPayload>) =>
                                                            api.put<Experiment>(`/api/experiments/${id}`, data),
  remove:    (id: number)                                => api.delete(`/api/experiments/${id}`),
  setStatus: (id: number, status: Experiment["status"], extra?: Record<string, unknown>) =>
                                                            api.put<Experiment>(`/api/experiments/${id}/status`, { status, ...extra }),
};
