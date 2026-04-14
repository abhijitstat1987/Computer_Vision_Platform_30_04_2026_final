import { api, BASE_URL } from "./api";

export interface TrainingJob {
  id: number;
  experimentId: number | null;
  datasetId: number;
  modelType: string;
  epochs: number;
  batchSize: number;
  imgSize: number;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  progress: number;         // 0-100
  currentEpoch: number;
  bestMap50: number | null;
  bestMap5095: number | null;
  trainLoss: number | null;
  outputDir: string | null;
  device: string;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  created_at: string;
}

export interface TrainingJobPayload {
  dataset_id: number;
  model_type?: string;
  epochs?: number;
  batch_size?: number;
  img_size?: number;
  device?: string;
  experiment_id?: number;
}

export interface GpuInfo {
  cuda_available: boolean;
  gpu_count: number;
  gpus: { index: number; name: string }[];
  recommended: string;
}

export interface ValidationResult {
  map50: number | null;
  map50_95: number | null;
  precision: number | null;
  recall: number | null;
  dataset_id: number;
  dataset_name: string;
  model_job_id: number;
  conf_threshold: number;
  iou_threshold: number;
  per_class: { class: string; ap50: number | null }[];
}

export const trainingService = {
  list:   (status?: string): Promise<TrainingJob[]> =>
    api.get<TrainingJob[]>(`/api/training/jobs${status ? `?status=${status}` : ""}`),

  get:    (id: number): Promise<TrainingJob> =>
    api.get<TrainingJob>(`/api/training/jobs/${id}`),

  start:  (payload: TrainingJobPayload): Promise<TrainingJob> =>
    api.post<TrainingJob>("/api/training/jobs", payload),

  /** Cancel running job OR delete any job (all statuses). */
  remove: (id: number): Promise<void> =>
    api.delete(`/api/training/jobs/${id}`),

  /** @deprecated use remove() */
  cancel: (id: number): Promise<void> =>
    api.delete(`/api/training/jobs/${id}`),

  gpuInfo: (): Promise<GpuInfo> =>
    api.get<GpuInfo>('/api/training/gpu-info'),

  getLogs: async (id: number): Promise<string[]> => {
    const data = await api.get<{ lines: string[] }>(`/api/training/jobs/${id}/logs`);
    return data.lines ?? [];
  },

  /** Triggers browser download of best.pt */
  downloadModel: (id: number): void => {
    window.open(`${BASE_URL}/api/training/jobs/${id}/download`, '_blank');
  },

  validate: (id: number, datasetId: number, conf = 0.25, iou = 0.6): Promise<ValidationResult> =>
    api.post<ValidationResult>(`/api/training/jobs/${id}/validate`, {
      dataset_id: datasetId, conf, iou,
    }),
};
