const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5100";

export interface LabelImage {
  id: number;
  datasetId: number;
  filename: string;
  originalName: string;
  url: string;           // full URL to serve the image
  status: "unlabeled" | "labeled" | "auto_labeled" | "verified";
  width: number;
  height: number;
  created_at: string;
}

export const labelImagesService = {
  list: async (datasetId: number): Promise<LabelImage[]> => {
    const res  = await fetch(`${BASE_URL}/api/label-datasets/${datasetId}/images/`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Failed to load images");
    return json.data ?? [];
  },

  upload: async (datasetId: number, files: FileList | File[]): Promise<LabelImage[]> => {
    const form = new FormData();
    Array.from(files).forEach(f => form.append("files", f));
    const res  = await fetch(`${BASE_URL}/api/label-datasets/${datasetId}/images/`, {
      method: "POST",
      body:   form,
      // DO NOT set Content-Type — browser sets multipart boundary automatically
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Upload failed");
    return json.data ?? [];
  },

  remove: async (datasetId: number, imageId: number): Promise<void> => {
    await fetch(`${BASE_URL}/api/label-datasets/${datasetId}/images/${imageId}`, { method: "DELETE" });
  },

  imageUrl: (datasetId: number, filename: string): string =>
    `${BASE_URL}/uploads/images/${datasetId}/${filename}`,
};
