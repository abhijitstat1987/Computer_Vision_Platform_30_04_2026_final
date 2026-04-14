import { api } from "./api";

export interface LabelClass {
  id: string;
  name: string;
  color: string;
  count: number;
}

export interface LabelDataset {
  id: number;
  name: string;
  totalImages: number;
  labeled: number;
  autoLabeled: number;
  verified: number;
  classes: LabelClass[];
  createdDate: string;
  created_at: string;
}

export interface LabelDatasetPayload {
  name: string;
  total_images?: number;
  labeled?: number;
  auto_labeled?: number;
  verified?: number;
  classes?: LabelClass[];
}

export const labelDatasetsService = {
  list:   ()                                                    => api.get<LabelDataset[]>("/api/label-datasets/"),
  get:    (id: number)                                          => api.get<LabelDataset>(`/api/label-datasets/${id}`),
  create: (data: LabelDatasetPayload)                          => api.post<LabelDataset>("/api/label-datasets/", data),
  update: (id: number, data: Partial<LabelDatasetPayload>)     => api.put<LabelDataset>(`/api/label-datasets/${id}`, data),
  remove: (id: number)                                         => api.delete(`/api/label-datasets/${id}`),
};
