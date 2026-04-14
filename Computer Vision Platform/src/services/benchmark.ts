import { api } from "./api";

export interface BenchmarkMetric {
  model_config_id: number;
  model_name: string;
  model_type: string;
  framework: string;
  map50: number;
  map50_95: number;
  precision: number;
  recall: number;
  speed_ms: number;
  accuracy?: number;
  correct?: number;
  total?: number;
  error?: string;
}

export interface BenchmarkJob {
  status: "running" | "done" | "failed";
  progress: number;
  results: BenchmarkMetric[];
  error: string | null;
}

export interface BenchmarkableModel {
  id: number;
  name: string;
  type: string;
  framework: string;
  accuracy: string;
  model_path: string;
  status: string;
}

export const benchmarkService = {
  run: (model_config_ids: number[], dataset_id: number): Promise<{ token: string }> =>
    api.post<{ token: string }>("/api/benchmark/run", { model_config_ids, dataset_id }),

  status: (token: string): Promise<BenchmarkJob> =>
    api.get<BenchmarkJob>(`/api/benchmark/status/${token}`),

  listModels: (): Promise<BenchmarkableModel[]> =>
    api.get<BenchmarkableModel[]>("/api/benchmark/models"),
};
