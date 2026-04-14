import { api } from "./api";

export interface DbConfig {
  id: number;
  name: string;
  host: string;
  port: number;
  type: string;
  username: string;
  database: string;
  status: "connected" | "disconnected" | "error";
  usage: string;
  created_at: string;
}

export interface DbConfigPayload {
  name: string;
  host?: string;
  port?: number;
  db_type?: string;
  username?: string;
  db_name?: string;
  status?: DbConfig["status"];
  db_usage?: string;
}

export const dbConfigsService = {
  list:   ()                                          => api.get<DbConfig[]>("/api/config/databases/"),
  get:    (id: number)                                => api.get<DbConfig>(`/api/config/databases/${id}`),
  create: (data: DbConfigPayload)                     => api.post<DbConfig>("/api/config/databases/", data),
  update: (id: number, data: Partial<DbConfigPayload>) => api.put<DbConfig>(`/api/config/databases/${id}`, data),
  remove: (id: number)                                => api.delete(`/api/config/databases/${id}`),
};
