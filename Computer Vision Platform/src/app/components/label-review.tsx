/**
 * Label Review Platform
 * Shows labeled images with bounding box overlays for verification.
 * Developers can verify correct labels, reject wrong ones, or re-annotate.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  CheckCircle, XCircle, AlertTriangle, Filter, ChevronLeft,
  ChevronRight, ZoomIn, Save, RotateCcw, Eye, Layers, RefreshCw,
  CheckSquare, Square
} from "lucide-react";
import { labelDatasetsService, LabelDataset, LabelClass } from "@/services/labelDatasets";
import { labelImagesService, LabelImage } from "@/services/labelImages";
import { labelAnnotationsService, CanvasAnnotation } from "@/services/labelAnnotations";
import { api } from "@/services/api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

const STATUS_COLORS: Record<string, string> = {
  unlabeled:   "bg-gray-100 text-gray-600",
  labeled:     "bg-blue-100 text-blue-700",
  auto_labeled:"bg-yellow-100 text-yellow-700",
  verified:    "bg-green-100 text-green-700",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  unlabeled:    <AlertTriangle className="w-3 h-3" />,
  labeled:      <Eye className="w-3 h-3" />,
  auto_labeled: <Layers className="w-3 h-3" />,
  verified:     <CheckCircle className="w-3 h-3" />,
};

// Palette for bounding box colors per class index
const BOX_COLORS = [
  "#ef4444","#3b82f6","#22c55e","#f59e0b","#8b5cf6",
  "#ec4899","#06b6d4","#84cc16","#f97316","#6366f1",
];

interface ReviewSummary {
  unlabeled: number; labeled: number; auto_labeled: number; verified: number; total: number;
}

// ─── tiny annotation editor overlay ─────────────────────────────────────────
interface EditorProps {
  image: LabelImage;
  annotations: CanvasAnnotation[];
  classes: LabelClass[];
  onSave: (anns: CanvasAnnotation[]) => void;
  onClose: () => void;
}

function AnnotationEditor({ image, annotations, classes, onSave, onClose }: EditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef    = useRef<HTMLImageElement | null>(null);
  const [anns, setAnns]     = useState<CanvasAnnotation[]>(annotations.map(a => ({ ...a })));
  const [drawing, setDrawing] = useState(false);
  const [startPt, setStartPt] = useState({ x: 0, y: 0 });
  const [activeClass, setActiveClass] = useState(classes[0]?.id ?? "");
  const [scale, setScale]   = useState(1);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    anns.forEach((ann, i) => {
      const { x, y, width, height } = ann.coordinates;
      const color = BOX_COLORS[i % BOX_COLORS.length];
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2;
      ctx.strokeRect(x * scale, y * scale, width * scale, height * scale);
      ctx.fillStyle = color + "30";
      ctx.fillRect(x * scale, y * scale, width * scale, height * scale);
      ctx.fillStyle = color;
      ctx.font = "12px sans-serif";
      ctx.fillText(ann.className, x * scale + 4, y * scale + 14);
    });
  }, [anns, scale]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `${BASE_URL}/uploads/images/${image.datasetId}/${image.filename}`;
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const maxW = Math.min(window.innerWidth * 0.7, 900);
      const s    = maxW / img.naturalWidth;
      setScale(s);
      canvas.width  = img.naturalWidth  * s;
      canvas.height = img.naturalHeight * s;
      draw();
    };
  }, [image]);

  useEffect(() => { draw(); }, [draw]);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    setStartPt(pos);
    setDrawing(true);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    setDrawing(false);
    const pos = getCanvasPos(e);
    const x = Math.min(startPt.x, pos.x);
    const y = Math.min(startPt.y, pos.y);
    const w = Math.abs(pos.x - startPt.x);
    const h = Math.abs(pos.y - startPt.y);
    if (w < 5 || h < 5) return;

    const cls = classes.find(c => c.id === activeClass);
    const newAnn: CanvasAnnotation = {
      id: `new_${Date.now()}`,
      type: "box",
      classId: activeClass,
      className: cls?.name ?? "unknown",
      coordinates: { x, y, width: w, height: h },
    };
    setAnns(prev => [...prev, newAnn]);
  };

  const removeAnn = (idx: number) => setAnns(prev => prev.filter((_, i) => i !== idx));

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col max-h-[95vh] w-full max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-gray-800">Re-annotate: {image.originalName}</h3>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={() => onSave(anns)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Annotations
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Canvas */}
          <div className="flex-1 overflow-auto bg-gray-900 flex items-center justify-center p-4">
            <canvas
              ref={canvasRef}
              className="cursor-crosshair rounded"
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
            />
          </div>

          {/* Sidebar */}
          <div className="w-56 border-l flex flex-col">
            {/* Class selector */}
            <div className="p-3 border-b">
              <p className="text-xs font-semibold text-gray-500 mb-2">DRAW CLASS</p>
              {classes.map(cls => (
                <button
                  key={cls.id}
                  onClick={() => setActiveClass(cls.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 flex items-center gap-2 transition-colors ${
                    activeClass === cls.id ? "bg-blue-100 text-blue-700 font-medium" : "hover:bg-gray-50"
                  }`}
                >
                  <span className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                    style={{ background: cls.color }} />
                  {cls.name}
                </button>
              ))}
            </div>

            {/* Annotation list */}
            <div className="flex-1 overflow-auto p-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">BOXES ({anns.length})</p>
              {anns.map((ann, i) => (
                <div key={ann.id}
                  className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50 group">
                  <span className="text-xs text-gray-700 truncate">{ann.className}</span>
                  <button onClick={() => removeAnn(i)}
                    className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100">
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {anns.length === 0 && (
                <p className="text-xs text-gray-400 italic">Draw boxes on the canvas</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────
export function LabelReview() {
  const [datasets, setDatasets]       = useState<LabelDataset[]>([]);
  const [selectedDs, setSelectedDs]   = useState<LabelDataset | null>(null);
  const [images, setImages]           = useState<LabelImage[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading]         = useState(false);
  const [summary, setSummary]         = useState<ReviewSummary | null>(null);

  // Image detail / editor state
  const [selectedImg, setSelectedImg] = useState<LabelImage | null>(null);
  const [annotations, setAnnotations] = useState<CanvasAnnotation[]>([]);
  const [loadingAnns, setLoadingAnns] = useState(false);
  const [editorOpen, setEditorOpen]   = useState(false);
  const [detailOpen, setDetailOpen]   = useState(false);
  const [imgPage, setImgPage]         = useState(0);

  // Bulk selection
  const [selected, setSelected]       = useState<Set<number>>(new Set());
  const [saving, setSaving]           = useState(false);
  const [toastMsg, setToastMsg]       = useState<string | null>(null);

  const PAGE_SIZE = 24;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Load datasets on mount
  useEffect(() => {
    labelDatasetsService.list().then(setDatasets).catch(console.error);
  }, []);

  // Load images + summary when dataset changes
  useEffect(() => {
    if (!selectedDs) return;
    setLoading(true);
    setImages([]);
    setSummary(null);
    setSelected(new Set());
    setImgPage(0);

    Promise.all([
      labelImagesService.list(selectedDs.id),
      api.get<ReviewSummary>(`/api/label-datasets/${selectedDs.id}/review-summary`),
    ]).then(([imgs, sum]) => {
      setImages(imgs);
      setSummary(sum);
    }).catch(console.error).finally(() => setLoading(false));
  }, [selectedDs]);

  const filteredImages = images.filter(img =>
    statusFilter === "all" || img.status === statusFilter
  );
  const pageImages = filteredImages.slice(imgPage * PAGE_SIZE, (imgPage + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredImages.length / PAGE_SIZE);

  // Open image detail
  const openDetail = async (img: LabelImage) => {
    setSelectedImg(img);
    setDetailOpen(true);
    setLoadingAnns(true);
    try {
      const anns = await labelAnnotationsService.load(img.datasetId, img.id);
      setAnnotations(anns);
    } catch { setAnnotations([]); }
    finally { setLoadingAnns(false); }
  };

  // Update image status
  const updateStatus = async (imageId: number, status: string) => {
    if (!selectedDs) return;
    setSaving(true);
    try {
      await api.put(`/api/label-datasets/${selectedDs.id}/images/${imageId}/status`, { status });
      setImages(prev => prev.map(img =>
        img.id === imageId ? { ...img, status: status as LabelImage["status"] } : img
      ));
      if (selectedImg?.id === imageId) {
        setSelectedImg(prev => prev ? { ...prev, status: status as LabelImage["status"] } : null);
      }
      // Refresh summary
      const sum = await api.get<ReviewSummary>(`/api/label-datasets/${selectedDs.id}/review-summary`);
      setSummary(sum);
      showToast(`Image marked as ${status}`);
    } catch (e: any) {
      showToast("Error: " + e.message);
    } finally { setSaving(false); }
  };

  // Bulk verify selected
  const bulkVerify = async () => {
    if (!selectedDs || selected.size === 0) return;
    setSaving(true);
    try {
      await api.post(`/api/label-datasets/${selectedDs.id}/images/bulk-status`, {
        image_ids: Array.from(selected),
        status: "verified",
      });
      setImages(prev => prev.map(img =>
        selected.has(img.id) ? { ...img, status: "verified" } : img
      ));
      setSelected(new Set());
      const sum = await api.get<ReviewSummary>(`/api/label-datasets/${selectedDs.id}/review-summary`);
      setSummary(sum);
      showToast(`${selected.size} images verified`);
    } catch (e: any) {
      showToast("Error: " + e.message);
    } finally { setSaving(false); }
  };

  // Save re-annotated boxes
  const saveAnnotations = async (anns: CanvasAnnotation[]) => {
    if (!selectedImg) return;
    setSaving(true);
    try {
      const saved = await labelAnnotationsService.save(selectedImg.datasetId, selectedImg.id, anns);
      setAnnotations(saved);
      await updateStatus(selectedImg.id, "labeled");
      setEditorOpen(false);
      showToast("Annotations saved");
    } catch (e: any) {
      showToast("Error: " + e.message);
    } finally { setSaving(false); }
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const classes = selectedDs?.classes ?? [];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-xl text-sm">
          {toastMsg}
        </div>
      )}

      {/* Editor modal */}
      {editorOpen && selectedImg && (
        <AnnotationEditor
          image={selectedImg}
          annotations={annotations}
          classes={classes}
          onSave={saveAnnotations}
          onClose={() => setEditorOpen(false)}
        />
      )}

      {/* Image detail panel */}
      {detailOpen && selectedImg && (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
          onClick={() => setDetailOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col max-h-[95vh] w-full max-w-4xl"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-bold text-gray-800">{selectedImg.originalName}</h3>
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[selectedImg.status]}`}>
                  {STATUS_ICONS[selectedImg.status]} {selectedImg.status}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setDetailOpen(false); setEditorOpen(true); }}
                  className="px-3 py-2 border border-blue-300 text-blue-600 rounded-lg text-sm hover:bg-blue-50 flex items-center gap-1.5">
                  <ZoomIn className="w-4 h-4" /> Re-annotate
                </button>
                {selectedImg.status !== "verified" && (
                  <button onClick={() => updateStatus(selectedImg.id, "verified")}
                    disabled={saving}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-1.5 disabled:opacity-50">
                    <CheckCircle className="w-4 h-4" /> Verify
                  </button>
                )}
                {selectedImg.status !== "unlabeled" && (
                  <button onClick={() => updateStatus(selectedImg.id, "unlabeled")}
                    disabled={saving}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 flex items-center gap-1.5 disabled:opacity-50">
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                )}
                <button onClick={() => setDetailOpen(false)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  Close
                </button>
              </div>
            </div>

            {/* Image with SVG bounding boxes */}
            <div className="flex-1 overflow-auto bg-gray-900 flex items-center justify-center p-6 relative">
              {loadingAnns ? (
                <div className="text-gray-400 text-sm">Loading annotations…</div>
              ) : (
                <div className="relative inline-block">
                  <img
                    src={`${BASE_URL}/uploads/images/${selectedImg.datasetId}/${selectedImg.filename}`}
                    alt={selectedImg.originalName}
                    className="max-w-full max-h-[65vh] rounded"
                    onError={e => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"; }}
                  />
                  {annotations.length > 0 && (
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox={`0 0 ${selectedImg.width || 640} ${selectedImg.height || 480}`}
                      preserveAspectRatio="none"
                    >
                      {annotations.map((ann, i) => {
                        const { x, y, width, height } = ann.coordinates;
                        const color = BOX_COLORS[i % BOX_COLORS.length];
                        return (
                          <g key={ann.id}>
                            <rect x={x} y={y} width={width} height={height}
                              fill={color + "28"} stroke={color} strokeWidth="2" />
                            <rect x={x} y={y - 18} width={ann.className.length * 7 + 8} height={18}
                              fill={color} rx="3" />
                            <text x={x + 4} y={y - 4} fill="white" fontSize="12" fontWeight="600"
                              fontFamily="sans-serif">
                              {ann.className}
                              {ann.confidence != null ? ` ${(ann.confidence * 100).toFixed(0)}%` : ""}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  )}
                  {annotations.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-black/60 text-white text-sm px-3 py-1.5 rounded-lg">
                        No annotations
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Annotation list */}
            {annotations.length > 0 && (
              <div className="p-4 border-t bg-gray-50">
                <p className="text-xs font-semibold text-gray-500 mb-2">
                  ANNOTATIONS ({annotations.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {annotations.map((ann, i) => (
                    <span key={ann.id}
                      className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border"
                      style={{ borderColor: BOX_COLORS[i % BOX_COLORS.length], background: BOX_COLORS[i % BOX_COLORS.length] + "15" }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: BOX_COLORS[i % BOX_COLORS.length] }} />
                      {ann.className}
                      {ann.isAutoLabeled && <span className="text-gray-400">(auto)</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Label Review</h2>
          <p className="text-gray-500 text-sm">Verify, reject, or correct labeled images with bounding box overlays</p>
        </div>
        {selectedDs && summary && (
          <button onClick={() => {
            setLoading(true);
            Promise.all([
              labelImagesService.list(selectedDs.id),
              api.get<ReviewSummary>(`/api/label-datasets/${selectedDs.id}/review-summary`),
            ]).then(([imgs, sum]) => { setImages(imgs); setSummary(sum); })
              .finally(() => setLoading(false));
          }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        )}
      </div>

      {/* Dataset selector */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Dataset</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {datasets.map(ds => (
            <button
              key={ds.id}
              onClick={() => setSelectedDs(ds)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedDs?.id === ds.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className="font-semibold text-gray-800 text-sm truncate">{ds.name}</div>
              <div className="text-xs text-gray-500 mt-1">
                {ds.totalImages} images · {ds.classes.length} classes
              </div>
              <div className="flex gap-1 mt-2">
                {ds.verified > 0 && (
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                    ✓{ds.verified}
                  </span>
                )}
                {ds.labeled > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                    L{ds.labeled}
                  </span>
                )}
              </div>
            </button>
          ))}
          {datasets.length === 0 && (
            <div className="col-span-4 text-center py-8 text-gray-400 text-sm">
              No datasets found. Create one in the Labeling Platform.
            </div>
          )}
        </div>
      </div>

      {/* Summary stats + filter + bulk actions */}
      {selectedDs && summary && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { key: "total",       label: "Total",       color: "text-gray-700",  bg: "bg-gray-50"   },
              { key: "unlabeled",   label: "Unlabeled",   color: "text-gray-600",  bg: "bg-gray-100"  },
              { key: "labeled",     label: "Labeled",     color: "text-blue-700",  bg: "bg-blue-50"   },
              { key: "auto_labeled",label: "Auto-labeled",color: "text-yellow-700",bg: "bg-yellow-50" },
              { key: "verified",    label: "Verified",    color: "text-green-700", bg: "bg-green-50"  },
            ].map(({ key, label, color, bg }) => (
              <button key={key}
                onClick={() => { setStatusFilter(key === "total" ? "all" : key); setImgPage(0); setSelected(new Set()); }}
                className={`rounded-xl p-4 border-2 text-center transition-all ${
                  (statusFilter === (key === "total" ? "all" : key))
                    ? "border-blue-500 ring-2 ring-blue-200"
                    : "border-transparent"
                } ${bg}`}>
                <div className={`text-2xl font-bold ${color}`}>
                  {summary[key as keyof ReviewSummary]}
                </div>
                <div className="text-xs text-gray-500 mt-1">{label}</div>
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {filteredImages.length} images
                {statusFilter !== "all" && ` (${statusFilter})`}
              </span>
              {selected.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-600">{selected.size} selected</span>
                  <button
                    onClick={bulkVerify}
                    disabled={saving}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Bulk Verify
                  </button>
                  <button
                    onClick={() => setSelected(new Set())}
                    className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
                    Clear
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (selected.size === pageImages.length) {
                    setSelected(new Set());
                  } else {
                    setSelected(new Set(pageImages.map(i => i.id)));
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                {selected.size === pageImages.length && pageImages.length > 0
                  ? <CheckSquare className="w-4 h-4 text-blue-600" />
                  : <Square className="w-4 h-4" />}
                Select page
              </button>
            </div>
          </div>

          {/* Image grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : pageImages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center text-gray-400">
              No images found for this filter.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {pageImages.map(img => (
                <div key={img.id}
                  className={`relative group rounded-xl border-2 overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                    selected.has(img.id) ? "border-blue-500" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {/* Select checkbox */}
                  <button
                    className="absolute top-1.5 left-1.5 z-10"
                    onClick={e => { e.stopPropagation(); toggleSelect(img.id); }}>
                    {selected.has(img.id)
                      ? <CheckSquare className="w-5 h-5 text-blue-600 bg-white rounded" />
                      : <Square className="w-5 h-5 text-white bg-black/30 rounded opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </button>

                  {/* Status badge */}
                  <span className={`absolute top-1.5 right-1.5 z-10 flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[img.status]}`}>
                    {STATUS_ICONS[img.status]}
                  </span>

                  {/* Image */}
                  <div className="aspect-square bg-gray-100" onClick={() => openDetail(img)}>
                    <img
                      src={`${BASE_URL}/uploads/images/${img.datasetId}/${img.filename}`}
                      alt={img.originalName}
                      className="w-full h-full object-cover"
                      onError={e => {
                        const t = e.target as HTMLImageElement;
                        t.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f3f4f6' width='100' height='100'/%3E%3Ctext y='55' x='50' text-anchor='middle' fill='%239ca3af' font-size='12'%3ENo img%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  </div>

                  {/* Footer */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs truncate">{img.originalName}</p>
                    <div className="flex gap-1 mt-1">
                      <button onClick={e => { e.stopPropagation(); updateStatus(img.id, "verified"); }}
                        className="flex-1 bg-green-500/80 hover:bg-green-600 text-white text-xs py-0.5 rounded flex items-center justify-center gap-0.5">
                        <CheckCircle className="w-3 h-3" /> OK
                      </button>
                      <button onClick={e => { e.stopPropagation(); updateStatus(img.id, "unlabeled"); }}
                        className="flex-1 bg-red-500/80 hover:bg-red-600 text-white text-xs py-0.5 rounded flex items-center justify-center gap-0.5">
                        <XCircle className="w-3 h-3" /> ✗
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setImgPage(p => Math.max(0, p - 1))} disabled={imgPage === 0}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {imgPage + 1} / {totalPages}
              </span>
              <button onClick={() => setImgPage(p => Math.min(totalPages - 1, p + 1))} disabled={imgPage === totalPages - 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
