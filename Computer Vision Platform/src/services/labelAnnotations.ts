import { api } from "./api";

export interface CanvasAnnotation {
  id: string;
  type: "box" | "polygon" | "point";
  classId: string;
  className: string;
  confidence?: number | null;
  isAutoLabeled?: boolean;
  coordinates: { x: number; y: number; width: number; height: number };
}

export const labelAnnotationsService = {
  load: (datasetId: number, imageId: number): Promise<CanvasAnnotation[]> =>
    api.get<CanvasAnnotation[]>(
      `/api/label-datasets/${datasetId}/images/${imageId}/annotations`
    ),

  save: (
    datasetId: number,
    imageId: number,
    annotations: CanvasAnnotation[]
  ): Promise<CanvasAnnotation[]> =>
    api.post<CanvasAnnotation[]>(
      `/api/label-datasets/${datasetId}/images/${imageId}/annotations`,
      { annotations }
    ),

  deleteOne: (datasetId: number, imageId: number, annId: number): Promise<void> =>
    api.delete(
      `/api/label-datasets/${datasetId}/images/${imageId}/annotations/${annId}`
    ),
};
