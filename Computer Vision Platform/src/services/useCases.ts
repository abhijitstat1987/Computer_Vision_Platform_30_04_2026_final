import { api } from "./api";

export interface UseCase {
  id: number;
  projectId: number;
  name: string;
  description: string;
  type: "safety" | "quality" | "maintenance" | "productivity" | "custom";
  priority: "high" | "medium" | "low";
  status: "active" | "inactive" | "development";
  workflows: number;
  createdDate: string;
}

export interface UseCasePayload {
  name: string;
  description?: string;
  type?: UseCase["type"];
  priority?: UseCase["priority"];
  status?: UseCase["status"];
  workflows?: number;
}

export const useCasesService = {
  list:   (projectId: number) =>
            api.get<UseCase[]>(`/api/projects/${projectId}/use-cases`),
  create: (projectId: number, data: UseCasePayload) =>
            api.post<UseCase>(`/api/projects/${projectId}/use-cases`, data),
  update: (projectId: number, id: number, data: Partial<UseCasePayload>) =>
            api.put<UseCase>(`/api/projects/${projectId}/use-cases/${id}`, data),
  remove: (projectId: number, id: number) =>
            api.delete(`/api/projects/${projectId}/use-cases/${id}`),
};
