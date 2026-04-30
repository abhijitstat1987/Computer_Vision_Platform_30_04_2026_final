export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5100";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (res.status === 204) return undefined as T;

  const json = await res.json();

  if (!res.ok) {
    throw new ApiError(res.status, json.message ?? "Request failed");
  }

  return json.data as T;
}

export const api = {
  get:    <T>(path: string)                      => request<T>(path),
  post:   <T>(path: string, body: unknown)       => request<T>(path, { method: "POST",   body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)       => request<T>(path, { method: "PUT",    body: JSON.stringify(body) }),
  delete: <T>(path: string)                      => request<T>(path, { method: "DELETE" }),
};
