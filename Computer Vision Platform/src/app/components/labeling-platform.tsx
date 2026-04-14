import { useState, useEffect, useRef, useCallback } from 'react';
import { Tag, Image as ImageIcon, Zap, Upload, Download, FolderOpen, Plus, Trash2, Eye, Check, X, Square, Circle, Pen, Save, Play, BarChart3, Settings, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { InteractiveLabelingCanvas } from './interactive-labeling-canvas';
import { labelDatasetsService, LabelDataset, LabelClass } from '../../services/labelDatasets';
import { labelImagesService, LabelImage } from '../../services/labelImages';
import { labelAnnotationsService, CanvasAnnotation } from '../../services/labelAnnotations';

const COLOR_OPTIONS = ['#3b82f6','#f59e0b','#10b981','#ef4444','#ec4899','#8b5cf6','#f97316','#06b6d4'];
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export function LabelingPlatform() {
  const [activeTab, setActiveTab]   = useState<'datasets'|'manual'|'auto'>('datasets');

  // ── Datasets ─────────────────────────────────────────────────────────────
  const [datasets, setDatasets]     = useState<LabelDataset[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string|null>(null);
  const [selectedDataset, setSelectedDataset] = useState<LabelDataset|null>(null);

  // ── Create modal ─────────────────────────────────────────────────────────
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName]           = useState('');
  const [newClasses, setNewClasses]     = useState<{name:string;color:string}[]>([{name:'',color:'#3b82f6'}]);
  const uploadInputRef                  = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // ── Manual labeling ───────────────────────────────────────────────────────
  const [images, setImages]           = useState<LabelImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<LabelImage|null>(null);
  const [annotations, setAnnotations]   = useState<CanvasAnnotation[]>([]);
  const [annLoading, setAnnLoading]     = useState(false);
  const [annSaving, setAnnSaving]       = useState(false);
  const [selectedTool, setSelectedTool] = useState<'box'|'polygon'|'point'>('box');
  const [selectedClass, setSelectedClass] = useState<string|null>(null);
  const [unsaved, setUnsaved]           = useState(false);

  // ── Auto-labeling ─────────────────────────────────────────────────────────
  const [autoModel, setAutoModel]       = useState('yolov8n.pt');
  const [autoConf, setAutoConf]         = useState(0.25);
  const [autoJobToken, setAutoJobToken] = useState<string|null>(null);
  const [autoStatus, setAutoStatus]     = useState<any>(null);
  const [autoRunning, setAutoRunning]   = useState(false);

  // ── Fetch datasets on mount ───────────────────────────────────────────────
  useEffect(() => { fetchDatasets(); }, []);

  async function fetchDatasets() {
    try { setLoading(true); const d = await labelDatasetsService.list(); setDatasets(Array.isArray(d) ? d : []); }
    catch (e:any) { setError(e.message); }
    finally { setLoading(false); }
  }

  // ── Fetch images when dataset selected in manual tab ─────────────────────
  useEffect(() => {
    if (activeTab === 'manual' && selectedDataset) {
      fetchImages(selectedDataset.id);
    }
  }, [activeTab, selectedDataset]);

  async function fetchImages(dsId: number) {
    try {
      setImagesLoading(true);
      setImages([]);
      setSelectedImage(null);
      setAnnotations([]);
      const imgs = await labelImagesService.list(dsId);
      setImages(imgs);
      if (imgs.length > 0) selectImage(imgs[0]);
    } catch (e:any) { setError(e.message); }
    finally { setImagesLoading(false); }
  }

  async function selectImage(img: LabelImage) {
    setSelectedImage(img);
    setAnnLoading(true);
    setAnnotations([]);
    setUnsaved(false);
    try {
      const anns = await labelAnnotationsService.load(selectedDataset!.id, img.id);
      setAnnotations(anns);
    } catch (e:any) { setError(e.message); }
    finally { setAnnLoading(false); }
    if (selectedDataset && selectedDataset.classes.length > 0) {
      setSelectedClass(selectedDataset.classes[0].id);
    }
  }

  // ── Annotation changes (canvas callback) ─────────────────────────────────
  const handleAnnotationsChange = useCallback((newAnns: any[]) => {
    setAnnotations(newAnns);
    setUnsaved(true);
  }, []);

  async function handleSaveAnnotations() {
    if (!selectedDataset || !selectedImage) return;
    try {
      setAnnSaving(true);
      const saved = await labelAnnotationsService.save(
        selectedDataset.id, selectedImage.id, annotations
      );
      setAnnotations(saved);
      setUnsaved(false);
      // Update image status in list
      setImages(prev => prev.map(img =>
        img.id === selectedImage.id
          ? { ...img, status: saved.length > 0 ? 'labeled' : 'unlabeled' }
          : img
      ));
    } catch (e:any) { setError(e.message); }
    finally { setAnnSaving(false); }
  }

  // ── Create dataset ────────────────────────────────────────────────────────
  async function handleCreateDataset() {
    if (!newName.trim()) return;
    const classes: LabelClass[] = newClasses
      .filter(c => c.name.trim())
      .map((c,i) => ({ id:`cls-${Date.now()}-${i}`, name:c.name.trim(), color:c.color, count:0 }));
    try {
      setSaving(true);
      const created = await labelDatasetsService.create({ name: newName.trim(), classes });
      // Upload pending images if any
      if (pendingFiles.length > 0) {
        await labelImagesService.upload(created.id, pendingFiles);
        const fresh = await labelDatasetsService.list();
        setDatasets(fresh);
      } else {
        setDatasets(prev => [created, ...prev]);
      }
      setIsCreateOpen(false);
      setNewName('');
      setNewClasses([{name:'',color:'#3b82f6'}]);
      setPendingFiles([]);
    } catch (e:any) { setError(e.message); }
    finally { setSaving(false); }
  }

  // ── Delete dataset ────────────────────────────────────────────────────────
  async function handleDeleteDataset(id: number) {
    if (!confirm('Delete this dataset and all its images? This cannot be undone.')) return;
    try { await labelDatasetsService.remove(id); setDatasets(prev => prev.filter(d => d.id !== id)); }
    catch (e:any) { setError(e.message); }
  }

  // ── Upload images to existing dataset ─────────────────────────────────────
  const uploadMoreRef = useRef<HTMLInputElement>(null);
  async function handleUploadMore(dsId: number, files: FileList) {
    try {
      setSaving(true);
      await labelImagesService.upload(dsId, Array.from(files));
      const fresh = await labelDatasetsService.list();
      setDatasets(fresh);
      if (selectedDataset?.id === dsId) await fetchImages(dsId);
    } catch (e:any) { setError(e.message); }
    finally { setSaving(false); }
  }

  // ── Export dataset ────────────────────────────────────────────────────────
  function handleExport(dsId: number, name: string) {
    window.open(`${BASE_URL}/api/label-datasets/${dsId}/export`, '_blank');
  }

  // ── Auto-label ────────────────────────────────────────────────────────────
  async function handleRunAutoLabel() {
    if (!selectedDataset) return;
    try {
      setAutoRunning(true);
      const res = await fetch(`${BASE_URL}/api/label-datasets/${selectedDataset.id}/auto-label`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_path: autoModel, confidence_threshold: autoConf }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setAutoJobToken(json.data.jobToken);
      setAutoStatus({ status: 'running', progress: 0, processed: 0, total: 0 });
    } catch (e:any) { setError(e.message); setAutoRunning(false); }
  }

  // Poll auto-label progress
  useEffect(() => {
    if (!autoJobToken || !selectedDataset) return;
    const interval = setInterval(async () => {
      try {
        const res  = await fetch(`${BASE_URL}/api/label-datasets/${selectedDataset.id}/auto-label/status?job_token=${autoJobToken}`);
        const json = await res.json();
        setAutoStatus(json.data);
        if (json.data?.status === 'completed' || json.data?.status === 'failed') {
          clearInterval(interval);
          setAutoRunning(false);
          setAutoJobToken(null);
          await fetchDatasets();
        }
      } catch { clearInterval(interval); setAutoRunning(false); }
    }, 1500);
    return () => clearInterval(interval);
  }, [autoJobToken, selectedDataset]);

  function getStatusColor(status: string) {
    switch (status) {
      case 'labeled':      return 'bg-blue-100 text-blue-700';
      case 'auto_labeled': return 'bg-purple-100 text-purple-700';
      case 'verified':     return 'bg-green-100 text-green-700';
      default:             return 'bg-gray-100 text-gray-700';
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between">
          <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-pink-600 via-purple-600 to-indigo-600 rounded-2xl p-8 shadow-2xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3"><Tag className="w-8 h-8" />Image Labeling Platform</h2>
            <p className="text-pink-100">Manual and automated annotation for computer vision datasets</p>
          </div>
          <button onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-pink-50 transition-all shadow-lg font-semibold">
            <Plus className="w-5 h-5" /> New Dataset
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-2">
        <div className="flex gap-2">
          {(['datasets','manual','auto'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all font-semibold ${activeTab===tab?'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg':'text-gray-600 hover:bg-gray-100'}`}>
              {tab==='datasets'?<FolderOpen className="w-5 h-5"/>:tab==='manual'?<Tag className="w-5 h-5"/>:<Zap className="w-5 h-5"/>}
              {tab==='datasets'?'Datasets':tab==='manual'?'Manual Labeling':'Auto-Labeling'}
            </button>
          ))}
        </div>
      </div>

      {/* ── DATASETS TAB ── */}
      {activeTab === 'datasets' && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-6">
            {[
              {label:'Total Datasets', val:datasets.length, from:'blue-500',to:'blue-600'},
              {label:'Total Images', val:datasets.reduce((s,d)=>s+d.totalImages,0).toLocaleString(), from:'green-500',to:'green-600'},
              {label:'Manually Labeled', val:datasets.reduce((s,d)=>s+d.labeled,0).toLocaleString(), from:'purple-500',to:'purple-600'},
              {label:'Auto-Labeled', val:datasets.reduce((s,d)=>s+d.autoLabeled,0).toLocaleString(), from:'pink-500',to:'pink-600'},
            ].map(card => (
              <div key={card.label} className={`bg-gradient-to-br from-${card.from} to-${card.to} rounded-2xl p-6 text-white shadow-xl`}>
                <div className="text-4xl font-bold mb-2">{card.val}</div>
                <div className="text-sm font-medium opacity-80">{card.label}</div>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500"><Loader2 className="w-6 h-6 animate-spin mr-2"/>Loading datasets...</div>
          ) : datasets.length === 0 ? (
            <div className="text-center py-16 text-gray-500 border-2 border-dashed border-gray-300 rounded-2xl">
              <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-30"/>
              <p className="text-lg font-semibold mb-1">No datasets yet</p>
              <p className="text-sm">Click "New Dataset" to create your first labeling dataset</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {datasets.map(ds => {
                const prog  = ds.totalImages ? Math.round(ds.labeled/ds.totalImages*100) : 0;
                const aProg = ds.totalImages ? Math.round(ds.autoLabeled/ds.totalImages*100) : 0;
                const vProg = ds.totalImages ? Math.round(ds.verified/ds.totalImages*100) : 0;
                return (
                  <div key={ds.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">{ds.name}</h3>
                          <p className="text-purple-100 text-sm">#{ds.id} · Created {ds.createdAt ? new Date(ds.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ds.createdDate}</p>
                        </div>
                        <button onClick={()=>handleDeleteDataset(ds.id)} className="p-2 bg-white/20 hover:bg-red-500/50 rounded-lg transition-all" title="Delete"><Trash2 className="w-4 h-4 text-white"/></button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[{v:ds.totalImages,l:'Total Images'},{v:ds.classes.length,l:'Classes'},{v:`${prog}%`,l:'Complete'}].map(s=>(
                          <div key={s.l} className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                            <div className="text-2xl font-bold text-white">{s.v}</div>
                            <div className="text-xs text-purple-100">{s.l}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      {[
                        {label:'Manual Labels',val:ds.labeled,total:ds.totalImages,pct:prog,color:'blue'},
                        {label:'Auto-Labels',val:ds.autoLabeled,total:ds.totalImages,pct:aProg,color:'purple'},
                        {label:'Verified',val:ds.verified,total:ds.totalImages,pct:vProg,color:'green'},
                      ].map(bar=>(
                        <div key={bar.label}>
                          <div className="flex justify-between text-sm mb-1"><span className="text-gray-600 font-semibold">{bar.label}</span><span className={`text-${bar.color}-600 font-bold`}>{bar.val} / {bar.total}</span></div>
                          <div className="h-2 bg-gray-200 rounded-full"><div className={`h-full bg-${bar.color}-500 rounded-full transition-all`} style={{width:`${bar.pct}%`}}></div></div>
                        </div>
                      ))}
                      {ds.classes.length > 0 && (
                        <div>
                          <div className="text-sm font-semibold text-gray-700 mb-2">Classes ({ds.classes.length})</div>
                          <div className="flex flex-wrap gap-2">
                            {ds.classes.map((cls,i)=>(
                              <div key={cls.id||i} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg">
                                <div className="w-3 h-3 rounded-full" style={{backgroundColor:cls.color}}></div>
                                <span className="text-xs font-semibold text-gray-700">{cls.name}</span>
                                <span className="text-xs text-gray-500">({cls.count})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 pt-3 border-t">
                        <button onClick={()=>{setSelectedDataset(ds);setActiveTab('manual');}}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold text-sm shadow-md">
                          <Tag className="w-4 h-4"/>Label Images
                        </button>
                        <button onClick={()=>{setSelectedDataset(ds);setActiveTab('auto');}}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold text-sm shadow-md">
                          <Zap className="w-4 h-4"/>Auto-Label
                        </button>
                        <button onClick={()=>handleExport(ds.id,ds.name)} title="Export YOLO zip"
                          className="px-3 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all">
                          <Download className="w-4 h-4 text-gray-600"/>
                        </button>
                        <label className="px-3 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all cursor-pointer" title="Upload more images">
                          <Upload className="w-4 h-4 text-gray-600"/>
                          <input type="file" multiple accept="image/*" className="hidden"
                            onChange={e=>e.target.files&&handleUploadMore(ds.id,e.target.files)}/>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MANUAL LABELING TAB ── */}
      {activeTab === 'manual' && (
        <div>
          {!selectedDataset ? (
            <div className="text-center py-16 text-gray-500">
              <Tag className="w-16 h-16 mx-auto mb-4 opacity-30"/>
              <p className="text-lg font-semibold mb-2">No dataset selected</p>
              <button onClick={()=>setActiveTab('datasets')} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Go to Datasets</button>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-6">
              {/* Left - Image list */}
              <div className="col-span-3 space-y-3">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800">Images ({images.length})</h3>
                    <div className="flex gap-1">
                      <button onClick={()=>fetchImages(selectedDataset.id)} className="p-1 hover:bg-gray-100 rounded" title="Refresh"><RefreshCw className="w-4 h-4 text-gray-500"/></button>
                      <label className="p-1 hover:bg-gray-100 rounded cursor-pointer" title="Upload images">
                        <Upload className="w-4 h-4 text-gray-500"/>
                        <input type="file" multiple accept="image/*" className="hidden"
                          onChange={e=>e.target.files&&handleUploadMore(selectedDataset.id,e.target.files)}/>
                      </label>
                    </div>
                  </div>
                  {imagesLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400"/></div>
                  ) : images.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40"/>
                      No images yet.<br/>Upload images to start labeling.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {images.map(img=>(
                        <div key={img.id} onClick={()=>selectImage(img)}
                          className={`p-2 border-2 rounded-xl cursor-pointer transition-all ${selectedImage?.id===img.id?'border-purple-600 bg-purple-50':'border-gray-200 hover:border-purple-300'}`}>
                          <div className="aspect-video bg-gray-100 rounded-lg mb-1.5 overflow-hidden">
                            <img src={`${BASE_URL}${img.url}`} alt={img.originalName} className="w-full h-full object-cover"/>
                          </div>
                          <div className="text-xs font-semibold text-gray-800 truncate">{img.originalName}</div>
                          <div className="flex justify-between mt-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${getStatusColor(img.status)}`}>{img.status.replace('_',' ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Center - Canvas */}
              <div className="col-span-6">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800 truncate">{selectedImage?.originalName||'Select an image'}</h3>
                    <div className="flex gap-2 shrink-0">
                      {unsaved && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">Unsaved changes</span>}
                      <button onClick={handleSaveAnnotations} disabled={annSaving||!selectedImage}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold">
                        {annSaving?<Loader2 className="w-3 h-3 animate-spin"/>:<Save className="w-3 h-3"/>} Save
                      </button>
                    </div>
                  </div>
                  {/* Tools */}
                  <div className="flex gap-2 mb-3 p-2 bg-gray-50 rounded-xl">
                    {(['box','polygon','point'] as const).map(tool=>(
                      <button key={tool} onClick={()=>setSelectedTool(tool)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${selectedTool===tool?'bg-purple-600 text-white':'bg-white text-gray-700 hover:bg-gray-100'}`}>
                        {tool==='box'?<Square className="w-3.5 h-3.5"/>:tool==='polygon'?<Pen className="w-3.5 h-3.5"/>:<Circle className="w-3.5 h-3.5"/>}
                        {tool.charAt(0).toUpperCase()+tool.slice(1)}
                      </button>
                    ))}
                    <div className="ml-auto text-xs text-gray-500 flex items-center">{annotations.length} annotation{annotations.length!==1?'s':''}</div>
                  </div>

                  {annLoading ? (
                    <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-purple-400"/></div>
                  ) : selectedImage ? (
                    <InteractiveLabelingCanvas
                      imageUrl={`${BASE_URL}${selectedImage.url}`}
                      annotations={annotations}
                      selectedTool={selectedTool}
                      selectedClass={selectedClass}
                      classes={selectedDataset.classes}
                      onAnnotationsChange={handleAnnotationsChange}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                      <ImageIcon className="w-16 h-16 mb-4 opacity-30"/>
                      <p>Select an image from the left panel</p>
                    </div>
                  )}

                  {selectedImage && (
                    <div className="mt-3 p-2 bg-gray-50 rounded-xl text-xs grid grid-cols-3 gap-3 text-gray-600">
                      <div><span className="font-semibold">Size:</span> {selectedImage.width}×{selectedImage.height}</div>
                      <div><span className="font-semibold">Annotations:</span> {annotations.length}</div>
                      <div><span className="font-semibold">Status:</span> <span className={`px-1.5 py-0.5 rounded-full ${getStatusColor(selectedImage.status)}`}>{selectedImage.status.replace('_',' ')}</span></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right - Classes & shortcuts */}
              <div className="col-span-3 space-y-4">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
                  <h3 className="font-bold text-gray-800 mb-3">Classes</h3>
                  <div className="space-y-2">
                    {selectedDataset.classes.map((cls,i)=>(
                      <div key={cls.id||i} onClick={()=>setSelectedClass(cls.id)}
                        className={`flex items-center justify-between p-2.5 border-2 rounded-xl cursor-pointer transition-all ${selectedClass===cls.id?'border-purple-600 bg-purple-50':'border-gray-200 hover:border-purple-300'}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{backgroundColor:cls.color}}></div>
                          <span className="text-sm font-semibold text-gray-800">{cls.name}</span>
                        </div>
                        <span className="text-xs text-gray-500">{cls.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {annotations.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
                    <h3 className="font-bold text-gray-800 mb-3">Annotations</h3>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {annotations.map((ann,i)=>{
                        const cls = selectedDataset.classes.find(c=>c.id===ann.classId);
                        return (
                          <div key={ann.id||i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-xs">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{backgroundColor:cls?.color||'#999'}}></div>
                            <span className="font-semibold text-gray-700 truncate">{ann.className||'Unknown'}</span>
                            {ann.confidence&&<span className="ml-auto text-gray-400">{(ann.confidence*100).toFixed(0)}%</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-200">
                  <h4 className="text-sm font-bold text-gray-800 mb-2">Keyboard Shortcuts</h4>
                  <div className="space-y-1 text-xs text-gray-600">
                    {[['B','Box tool'],['P','Polygon tool'],['C','Point tool'],['S','Save'],['Del','Delete selected'],['←/→','Navigate images']].map(([k,v])=>(
                      <div key={k}><kbd className="px-1.5 py-0.5 bg-white rounded border text-xs">{k}</kbd> {v}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── AUTO-LABELING TAB ── */}
      {activeTab === 'auto' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Config panel */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Settings className="w-6 h-6 text-purple-600"/>Auto-Labeling Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Select Dataset</label>
                  <select value={selectedDataset?.id??''} onChange={e=>setSelectedDataset(datasets.find(d=>d.id===parseInt(e.target.value))||null)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-all">
                    <option value="">Choose dataset...</option>
                    {datasets.map(ds=><option key={ds.id} value={ds.id}>{ds.name} ({ds.totalImages} images)</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Model</label>
                  <select value={autoModel} onChange={e=>setAutoModel(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-all">
                    <option value="yolov8n.pt">YOLOv8n (COCO pretrained — fastest)</option>
                    <option value="yolov8s.pt">YOLOv8s (COCO pretrained — balanced)</option>
                    <option value="yolov8m.pt">YOLOv8m (COCO pretrained — accurate)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Confidence Threshold: <span className="text-purple-600">{(autoConf*100).toFixed(0)}%</span></label>
                  <input type="range" min="5" max="95" value={autoConf*100} onChange={e=>setAutoConf(parseInt(e.target.value)/100)} className="w-full"/>
                  <div className="flex justify-between text-xs text-gray-400 mt-1"><span>5% (detect more)</span><span>95% (detect less)</span></div>
                </div>

                {/* Progress bar */}
                {autoStatus && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                    <div className="flex justify-between text-sm font-semibold text-gray-700 mb-2">
                      <span>Progress: {autoStatus.processed}/{autoStatus.total} images</span>
                      <span className={autoStatus.status==='completed'?'text-green-600':autoStatus.status==='failed'?'text-red-600':'text-purple-600'}>
                        {autoStatus.status}
                      </span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                        style={{width:`${autoStatus.progress||0}%`}}></div>
                    </div>
                    {autoStatus.error&&<p className="text-xs text-red-600 mt-2">{autoStatus.error}</p>}
                  </div>
                )}

                <button onClick={handleRunAutoLabel} disabled={!selectedDataset||autoRunning}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                  {autoRunning?<><Loader2 className="w-5 h-5 animate-spin"/>Running...</>:<><Play className="w-5 h-5"/>Run Auto-Labeling</>}
                </button>
              </div>
            </div>

            {/* Info panel */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-xl">
                <h3 className="text-lg font-bold mb-4">How Auto-Labeling Works</h3>
                <div className="space-y-3 text-sm text-purple-100">
                  <p>1. Select a dataset with uploaded images</p>
                  <p>2. Choose a pre-trained YOLO model (downloads automatically on first use)</p>
                  <p>3. Set confidence threshold — lower = more detections, higher = fewer but more accurate</p>
                  <p>4. Click Run — images are processed in the background and annotations saved to the database</p>
                  <p>5. Switch to Manual Labeling to review and correct auto-generated annotations</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-purple-600"/>Dataset Status</h3>
                {selectedDataset ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Total Images</span><span className="font-bold">{selectedDataset.totalImages}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Manually Labeled</span><span className="font-bold text-blue-600">{selectedDataset.labeled}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Auto-Labeled</span><span className="font-bold text-purple-600">{selectedDataset.autoLabeled}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Verified</span><span className="font-bold text-green-600">{selectedDataset.verified}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Unlabeled</span><span className="font-bold text-gray-500">{selectedDataset.totalImages-selectedDataset.labeled-selectedDataset.autoLabeled}</span></div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">Select a dataset to see stats</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {[
              {icon:<Zap className="w-6 h-6 text-white"/>,color:'blue',title:'Fast Processing',desc:'Process hundreds of images per minute using optimized YOLO inference'},
              {icon:<Check className="w-6 h-6 text-white"/>,color:'purple',title:'80 COCO Classes',desc:'Detect persons, vehicles, animals, objects and more out of the box'},
              {icon:<Eye className="w-6 h-6 text-white"/>,color:'pink',title:'Review & Refine',desc:'All auto-labels are saved to DB — edit them in Manual Labeling tab'},
            ].map(c=>(
              <div key={c.title} className={`bg-gradient-to-br from-${c.color}-50 to-${c.color}-100 rounded-2xl p-6 border border-${c.color}-200`}>
                <div className={`w-12 h-12 bg-${c.color}-600 rounded-xl flex items-center justify-center mb-4`}>{c.icon}</div>
                <h4 className="text-lg font-bold text-gray-800 mb-2">{c.title}</h4>
                <p className="text-sm text-gray-600">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CREATE DATASET MODAL ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Create New Dataset</h3>
              <button onClick={()=>{setIsCreateOpen(false);setPendingFiles([]);}} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Dataset Name *</label>
                <input type="text" value={newName} onChange={e=>setNewName(e.target.value)}
                  placeholder="e.g., PPE Detection Training Set"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 transition-all"/>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Classes</label>
                <div className="space-y-2">
                  {newClasses.map((cls,i)=>(
                    <div key={i} className="flex gap-2 items-center">
                      <input type="color" value={cls.color} onChange={e=>{const c=[...newClasses];c[i].color=e.target.value;setNewClasses(c);}}
                        className="w-10 h-10 rounded cursor-pointer border border-gray-200"/>
                      <input type="text" value={cls.name} onChange={e=>{const c=[...newClasses];c[i].name=e.target.value;setNewClasses(c);}}
                        placeholder={`Class ${i+1} (e.g., Helmet)`}
                        className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-purple-500"/>
                      {newClasses.length>1&&<button onClick={()=>setNewClasses(newClasses.filter((_,j)=>j!==i))} className="p-2 hover:bg-red-50 rounded-lg"><X className="w-4 h-4 text-red-500"/></button>}
                    </div>
                  ))}
                  <button onClick={()=>setNewClasses([...newClasses,{name:'',color:COLOR_OPTIONS[newClasses.length%COLOR_OPTIONS.length]}])}
                    className="text-sm text-purple-600 hover:text-purple-700 font-semibold">+ Add another class</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Images (optional)</label>
                <label className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-500 transition-all cursor-pointer block">
                  <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400"/>
                  {pendingFiles.length>0
                    ? <p className="text-purple-600 font-semibold">{pendingFiles.length} file(s) selected</p>
                    : <><p className="text-gray-600 font-semibold mb-1">Click to upload or drag and drop</p><p className="text-sm text-gray-500">JPG, PNG, WEBP (max 64MB total)</p></>
                  }
                  <input type="file" multiple accept="image/*" className="hidden"
                    onChange={e=>setPendingFiles(e.target.files?Array.from(e.target.files):[])}/>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-6 border-t">
              <button onClick={handleCreateDataset} disabled={saving||!newName.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {saving?<><Loader2 className="w-4 h-4 animate-spin"/>Creating...</>:'Create Dataset'}
              </button>
              <button onClick={()=>{setIsCreateOpen(false);setPendingFiles([]);}} className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
