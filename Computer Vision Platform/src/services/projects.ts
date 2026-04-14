import { api } from "./api";

export interface Project {
  id: number;
  name: string;
  description: string;
  businessHierarchy: Record<string, string>;
  geographyHierarchy: Record<string, string>;
  status: "active" | "inactive" | "planning";
  createdDate: string;
  useCases: number;
}

export interface ProjectPayload {
  name: string;
  description?: string;
  status?: "active" | "inactive" | "planning";
  biz_company?: string;
  biz_unit?: string;
  biz_product?: string;
  geo_country?: string;
  geo_state?: string;
  geo_city?: string;
  geo_site?: string;
}

/** Convert the frontend hierarchy objects back to flat payload fields */
export function projectToPayload(
  data: Partial<Project> & { businessHierarchy?: Record<string, string>; geographyHierarchy?: Record<string, string> }
): ProjectPayload {
  return {
    name:        data.name ?? "",
    description: data.description ?? "",
    status:      data.status,
    biz_company: data.businessHierarchy?.["Company"],
    biz_unit:    data.businessHierarchy?.["Manufacturing Unit"],
    biz_product: data.businessHierarchy?.["Product Line"],
    geo_country: data.geographyHierarchy?.["Country"],
    geo_state:   data.geographyHierarchy?.["State/Province"],
    geo_city:    data.geographyHierarchy?.["City"],
    geo_site:    data.geographyHierarchy?.["Location/Site"],
  };
}

export const projectsService = {
  list:   (params?: { status?: string; search?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return api.get<Project[]>(`/api/projects/${qs ? `?${qs}` : ""}`);
  },
  get:    (id: number)                     => api.get<Project>(`/api/projects/${id}`),
  create: (data: ProjectPayload)           => api.post<Project>("/api/projects/", data),
  update: (id: number, data: ProjectPayload) => api.put<Project>(`/api/projects/${id}`, data),
  remove: (id: number)                     => api.delete(`/api/projects/${id}`),
};
