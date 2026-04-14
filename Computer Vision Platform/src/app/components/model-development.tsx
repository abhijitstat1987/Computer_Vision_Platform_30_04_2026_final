import { useState, useEffect, useRef } from 'react';
import {
  Plus, Play, TrendingUp, X, StopCircle, Download, Trash2,
  Loader2, RefreshCw, CheckCircle, AlertCircle, Clock, Terminal,
  FlaskConical, Cpu, Zap, RotateCcw,
} from 'lucide-react';
import { experimentsService, Experiment } from '../../services/experiments';
import { trainingService, TrainingJob, ValidationResult, GpuInfo } from '../../services/training';
import { labelDatasetsService, LabelDataset } from '../../services/labelDatasets';

export function ModelDevelopment() {
  // ── Experiments ───────────────────────────────────────────────────────────
  const [experiments, setExperiments]   = useState<Experiment[]>([]);
  const [expLoading, setExpLoading]     = useState(true);

  // ── Training jobs ─────────────────────────────────────────────────────────
  const [jobs, setJobs]                 = useState<TrainingJob[]>([]);
  const [jobsLoading, setJobsLoading]   = useState(true);

  // ── Datasets ──────────────────────────────────────────────────────────────
  const [datasets, setDatasets]         = useState<LabelDataset[]>([]);

  const [error, setError]               = useState<string|null>(null);
  const [saving, setSaving]             = useState(false);

  // ── New training job modal ─────────────────────────────────────────────
  const [isTrainModalOpen, setIsTrainModalOpen] = useState(false);
  const [trainDatasetId, setTrainDatasetId]     = useState<number|null>(null);
  const [trainModelType, setTrainModelType]     = useState('yolov8n');
  const [trainEpochs, setTrainEpochs]           = useState(50);
  const [trainBatch, setTrainBatch]             = useState(16);
  const [trainImgSize, setTrainImgSize]         = useState(640);
  const [trainDevice, setTrainDevice]           = useState('cpu');
  const [gpuInfo, setGpuInfo]                   = useState<GpuInfo|null>(null);

  // ── Log viewer ────────────────────────────────────────────────────────────
  const [logJobId, setLogJobId]         = useState<number|null>(null);
  const [logLines, setLogLines]         = useState<string[]>([]);
  const [logLoading, setLogLoading]     = useState(false);
  const logEndRef                       = useRef<HTMLDivElement>(null);

  // ── Chart ─────────────────────────────────────────────────────────────────
  const [chartJob, setChartJob]         = useState<TrainingJob|null>(null);

  // ── Validate modal ────────────────────────────────────────────────────────
  const [validateJob, setValidateJob]       = useState<TrainingJob|null>(null);
  const [valDatasetId, setValDatasetId]     = useState<number|null>(null);
  const [valConf, setValConf]               = useState(0.25);
  const [valIou, setValIou]                 = useState(0.6);
  const [valRunning, setValRunning]         = useState(false);
  const [valResult, setValResult]           = useState<ValidationResult|null>(null);

  useEffect(() => {
    fetchAll();
    trainingService.gpuInfo().then(setGpuInfo).catch(()=>{});
  }, []);

  // Auto-refresh running jobs every 3 s
  useEffect(() => {
    const hasActive = jobs.some(j => j.status === 'running' || j.status === 'queued');
    if (!hasActive) return;
    const t = setInterval(fetchJobs, 3000);
    return () => clearInterval(t);
  }, [jobs]);

  // Scroll log to bottom
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logLines]);

  async function fetchAll() {
    await Promise.all([fetchExperiments(), fetchJobs(), fetchDatasets()]);
  }

  async function fetchExperiments() {
    try {
      setExpLoading(true);
      const d = await experimentsService.list();
      setExperiments(Array.isArray(d) ? d : []);
    } catch (e:any) { setError(e.message); }
    finally { setExpLoading(false); }
  }

  async function fetchJobs() {
    try {
      setJobsLoading(true);
      const d = await trainingService.list();
      setJobs(Array.isArray(d) ? d : []);
    } catch { }
    finally { setJobsLoading(false); }
  }

  async function fetchDatasets() {
    try {
      const d = await labelDatasetsService.list();
      setDatasets(Array.isArray(d) ? d : []);
    } catch { }
  }

  async function handleStartJob() {
    if (!trainDatasetId) return;
    try {
      setSaving(true);
      const job = await trainingService.start({
        dataset_id: trainDatasetId,
        model_type: trainModelType,
        epochs: trainEpochs,
        batch_size: trainBatch,
        img_size: trainImgSize,
        device: trainDevice,
      });
      setJobs(prev => [job, ...prev]);
      setIsTrainModalOpen(false);
    } catch (e:any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDeleteJob(job: TrainingJob) {
    const isActive = job.status === 'running' || job.status === 'queued';
    const msg = isActive
      ? 'Cancel and delete this training job? The output files will be removed.'
      : 'Delete this training job? The output files will be removed.';
    if (!confirm(msg)) return;
    try {
      await trainingService.remove(job.id);
      setJobs(prev => prev.filter(j => j.id !== job.id));
      if (logJobId === job.id) { setLogJobId(null); setLogLines([]); }
      if (chartJob?.id === job.id) setChartJob(null);
    } catch (e:any) { setError(e.message); }
  }

  function handleRerunJob(job: TrainingJob) {
    setTrainDatasetId(job.datasetId);
    setTrainModelType(job.modelType);
    setTrainEpochs(job.epochs);
    setTrainBatch(job.batchSize);
    setTrainImgSize(job.imgSize);
    setTrainDevice(job.device ?? 'cpu');
    setIsTrainModalOpen(true);
  }

  async function handleViewLogs(jobId: number) {
    setLogJobId(jobId);
    setLogLoading(true);
    try {
      const lines = await trainingService.getLogs(jobId);
      setLogLines(lines);
    } catch (e:any) { setError(e.message); }
    finally { setLogLoading(false); }
  }

  async function handleDeleteExperiment(expId: number) {
    if (!confirm('Delete this experiment?')) return;
    try {
      await experimentsService.remove(expId);
      setExperiments(prev => prev.filter(e => e.id !== expId));
    } catch (e:any) { setError(e.message); }
  }

  function openValidateModal(job: TrainingJob) {
    setValidateJob(job);
    setValDatasetId(job.datasetId);
    setValConf(0.25);
    setValIou(0.6);
    setValResult(null);
  }

  async function handleValidate() {
    if (!validateJob || !valDatasetId) return;
    setValRunning(true);
    setValResult(null);
    try {
      const result = await trainingService.validate(validateJob.id, valDatasetId, valConf, valIou);
      setValResult(result);
    } catch (e:any) { setError(e.message); setValidateJob(null); }
    finally { setValRunning(false); }
  }

  function statusBadge(status: string) {
    const map: Record<string,string> = {
      running:   'bg-blue-100 text-blue-700',
      queued:    'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      failed:    'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-600',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  }

  function statusIcon(status: string) {
    if (status==='running')   return <Loader2 className="w-4 h-4 animate-spin text-blue-600"/>;
    if (status==='queued')    return <Clock className="w-4 h-4 text-yellow-600"/>;
    if (status==='completed') return <CheckCircle className="w-4 h-4 text-green-600"/>;
    if (status==='failed')    return <AlertCircle className="w-4 h-4 text-red-600"/>;
    return <X className="w-4 h-4 text-gray-400"/>;
  }

  const pct = (v: number|null) => v != null ? `${(v*100).toFixed(1)}%` : '—';

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between">
          <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{error}</span>
          <button onClick={()=>setError(null)}><X className="w-4 h-4"/></button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Model Development</h2>
          <p className="text-gray-600">Train YOLOv8 models on your labeled datasets</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4"/>Refresh
          </button>
          <button onClick={()=>setIsTrainModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4"/>Start Training
          </button>
        </div>
      </div>

      {/* ── TRAINING JOBS ── */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          Training Jobs
          {jobs.some(j=>j.status==='running')&&(
            <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin"/>Live
            </span>
          )}
        </h3>

        {jobsLoading && jobs.length===0 ? (
          <div className="flex items-center justify-center py-8 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2"/>Loading jobs...</div>
        ) : jobs.length===0 ? (
          <div className="text-center py-10 text-gray-400 border border-dashed border-gray-300 rounded-lg">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30"/>
            No training jobs yet. Click "Start Training" to begin.
          </div>
        ) : (
          <div className="grid gap-4">
            {jobs.map(job=>(
              <div key={job.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      {statusIcon(job.status)}
                      <h4 className="font-semibold text-gray-800 truncate">
                        Job #{job.id} — {job.modelType.toUpperCase()} on Dataset #{job.datasetId}
                      </h4>
                      <span className={`shrink-0 px-2 py-0.5 text-xs rounded-full font-semibold ${statusBadge(job.status)}`}>{job.status}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {job.epochs} epochs · batch {job.batchSize} · {job.imgSize}px
                      {' · '}{job.device === '0' || job.device === 'cuda'
                        ? <span className="inline-flex items-center gap-0.5 text-green-600 font-medium"><Zap className="w-3 h-3"/>GPU</span>
                        : <span className="inline-flex items-center gap-0.5 text-gray-500"><Cpu className="w-3 h-3"/>CPU</span>}
                      {job.startedAt && ` · Started ${new Date(job.startedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`}
                      {job.completedAt && ` · Completed ${new Date(job.completedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-1 shrink-0 ml-2">
                    {/* Cancel — only while active */}
                    {(job.status==='running'||job.status==='queued') && (
                      <button onClick={()=>handleDeleteJob(job)} className="p-2 hover:bg-red-50 rounded-lg" title="Cancel job">
                        <StopCircle className="w-4 h-4 text-red-600"/>
                      </button>
                    )}
                    {/* Rerun — for finished jobs */}
                    {(job.status==='failed'||job.status==='cancelled'||job.status==='completed') && (
                      <button onClick={()=>handleRerunJob(job)} className="p-2 hover:bg-blue-50 rounded-lg" title="Rerun with same settings">
                        <RotateCcw className="w-4 h-4 text-blue-500"/>
                      </button>
                    )}
                    {/* Chart */}
                    <button onClick={()=>setChartJob(job)} className="p-2 hover:bg-blue-50 rounded-lg" title="View metrics">
                      <TrendingUp className="w-4 h-4 text-blue-600"/>
                    </button>
                    {/* Logs */}
                    <button onClick={()=>handleViewLogs(job.id)} className="p-2 hover:bg-gray-100 rounded-lg" title="View logs">
                      <Terminal className="w-4 h-4 text-gray-600"/>
                    </button>
                    {/* Validate — only for completed YOLO jobs */}
                    {job.status==='completed' && !job.modelType.startsWith('tf_') && (
                      <button onClick={()=>openValidateModal(job)} className="p-2 hover:bg-purple-50 rounded-lg" title="Validate model">
                        <FlaskConical className="w-4 h-4 text-purple-600"/>
                      </button>
                    )}
                    {/* Download — only for completed jobs */}
                    {job.status==='completed' && (
                      <button onClick={()=>trainingService.downloadModel(job.id)} className="p-2 hover:bg-green-50 rounded-lg" title="Download model">
                        <Download className="w-4 h-4 text-green-600"/>
                      </button>
                    )}
                    {/* Delete — all statuses */}
                    <button onClick={()=>handleDeleteJob(job)} className="p-2 hover:bg-red-50 rounded-lg" title="Delete job">
                      <Trash2 className="w-4 h-4 text-red-500"/>
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Epoch {job.currentEpoch}/{job.epochs}</span>
                    <span>{job.progress}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${
                      job.status==='completed'?'bg-green-500':
                      job.status==='failed'?'bg-red-500':
                      job.status==='cancelled'?'bg-gray-400':
                      'bg-gradient-to-r from-blue-500 to-purple-500'
                    }`} style={{width:`${job.progress}%`}}/>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-0.5">mAP50</div>
                    <div className="font-bold text-green-600">{pct(job.bestMap50)}</div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-0.5">mAP50-95</div>
                    <div className="font-bold text-blue-600">{pct(job.bestMap5095)}</div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-0.5">Box Loss</div>
                    <div className="font-bold text-red-600">
                      {job.trainLoss!=null ? job.trainLoss.toFixed(4) : '—'}
                    </div>
                  </div>
                </div>

                {job.errorMessage && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    {job.errorMessage}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CHART ── */}
      {chartJob && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Job #{chartJob.id} Metrics</h3>
            <button onClick={()=>setChartJob(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4"/></button>
          </div>
          <div className="grid grid-cols-3 gap-6 mb-4">
            {[
              {label:'Model',      val: chartJob.modelType.toUpperCase()},
              {label:'Best mAP50', val: pct(chartJob.bestMap50)},
              {label:'Epochs',     val: `${chartJob.currentEpoch}/${chartJob.epochs}`},
            ].map(m=>(
              <div key={m.label} className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-2xl font-bold text-gray-800">{m.val}</div>
                <div className="text-sm text-gray-500 mt-1">{m.label}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-400 text-center">View logs for detailed per-epoch metrics.</p>
        </div>
      )}

      {/* ── LOG VIEWER ── */}
      {logJobId!==null && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-green-400"/>Training Logs — Job #{logJobId}
            </h3>
            <div className="flex gap-2">
              <button onClick={()=>handleViewLogs(logJobId!)} className="px-2 py-1 text-xs text-gray-400 hover:text-white border border-gray-600 rounded">Refresh</button>
              <button onClick={()=>{setLogJobId(null);setLogLines([]);}} className="p-1 hover:bg-gray-700 rounded">
                <X className="w-4 h-4 text-gray-400"/>
              </button>
            </div>
          </div>
          {logLoading ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm"><Loader2 className="w-4 h-4 animate-spin"/>Loading logs...</div>
          ) : logLines.length===0 ? (
            <p className="text-gray-400 text-sm">No logs yet — training may not have started.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto font-mono text-xs text-green-300 space-y-0.5">
              {logLines.map((line,i)=><div key={i}>{line||'\u00a0'}</div>)}
              <div ref={logEndRef}/>
            </div>
          )}
        </div>
      )}

      {/* ── AVAILABLE DATASETS ── */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Available Datasets ({datasets.length})</h3>
        {datasets.length===0 ? (
          <div className="text-center py-8 text-gray-400 border border-dashed rounded-lg">
            No labeled datasets found. Create and label a dataset in the Labeling Platform first.
          </div>
        ) : (
          <div className="grid gap-3">
            {datasets.map(ds=>(
              <div key={ds.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">{ds.name}</h4>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>{ds.totalImages} images</span>
                    <span>{ds.labeled} labeled</span>
                    <span>{ds.classes.length} classes</span>
                  </div>
                </div>
                <button onClick={()=>{setTrainDatasetId(ds.id);setIsTrainModalOpen(true);}}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold">
                  <Play className="w-4 h-4"/>Train
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── EXPERIMENTS ── */}
      {experiments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Experiments ({experiments.length})</h3>
          <div className="grid gap-3">
            {experiments.map(exp=>(
              <div key={exp.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{exp.name}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      exp.status==='training'?'bg-blue-100 text-blue-700':
                      exp.status==='completed'?'bg-green-100 text-green-700':
                      'bg-gray-100 text-gray-600'}`}>{exp.status}</span>
                  </div>
                  <p className="text-sm text-gray-500">#{exp.id} · {exp.dataset} · Epoch {exp.epoch}</p>
                </div>
                <button onClick={()=>handleDeleteExperiment(exp.id)} className="p-2 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4 text-red-500"/>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── START TRAINING MODAL ── */}
      {isTrainModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-800">Start Training Job</h3>
              <button onClick={()=>setIsTrainModalOpen(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Dataset *</label>
                <select value={trainDatasetId??''} onChange={e=>setTrainDatasetId(parseInt(e.target.value)||null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="">Select dataset...</option>
                  {datasets.map(ds=><option key={ds.id} value={ds.id}>{ds.name} ({ds.labeled} labeled)</option>)}
                </select>
                {trainDatasetId && datasets.find(d=>d.id===trainDatasetId)?.labeled===0 && (
                  <p className="text-xs text-amber-600 mt-1">This dataset has no labeled images. Label at least 1 image before training.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Model Architecture</label>
                <select value={trainModelType} onChange={e=>setTrainModelType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <optgroup label="YOLO (Object Detection)">
                    {[['yolov8n','YOLOv8n — Nano (fastest, ~6 MB)'],['yolov8s','YOLOv8s — Small (~22 MB)'],['yolov8m','YOLOv8m — Medium (~52 MB)'],['yolov8l','YOLOv8l — Large (~87 MB)']].map(([v,l])=>(
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </optgroup>
                  <optgroup label="TensorFlow (Classification)">
                    {[['tf_mobilenetv2','MobileNetV2'],['tf_efficientnetb0','EfficientNetB0'],['tf_resnet50','ResNet50']].map(([v,l])=>(
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Epochs</label>
                  <input type="number" value={trainEpochs} onChange={e=>setTrainEpochs(parseInt(e.target.value)||50)}
                    min="1" max="1000" className="w-full px-3 py-2 border border-gray-300 rounded-lg"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Batch Size</label>
                  <input type="number" value={trainBatch} onChange={e=>setTrainBatch(parseInt(e.target.value)||16)}
                    min="1" max="128" className="w-full px-3 py-2 border border-gray-300 rounded-lg"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Image Size</label>
                  <select value={trainImgSize} onChange={e=>setTrainImgSize(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    {[320,416,512,640,768,1024].map(s=><option key={s} value={s}>{s}px</option>)}
                  </select>
                </div>
              </div>
              {/* Device selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Compute Device</label>
                <div className="flex gap-2">
                  <button type="button"
                    onClick={()=>setTrainDevice('cpu')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-semibold transition-colors ${
                      trainDevice==='cpu'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}>
                    <Cpu className="w-4 h-4"/>CPU
                  </button>
                  <button type="button"
                    onClick={()=>setTrainDevice('0')}
                    disabled={!gpuInfo?.cuda_available}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-semibold transition-colors ${
                      trainDevice==='0'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : gpuInfo?.cuda_available
                          ? 'border-gray-200 hover:border-gray-300 text-gray-600'
                          : 'border-gray-100 text-gray-300 cursor-not-allowed'
                    }`}>
                    <Zap className="w-4 h-4"/>
                    GPU {gpuInfo?.cuda_available ? `(${gpuInfo.gpus[0]?.name ?? 'CUDA'})` : '(not available)'}
                  </button>
                </div>
                {trainDevice==='0' && gpuInfo?.cuda_available && (
                  <p className="text-xs text-green-600 mt-1">GPU training is significantly faster. Ensure VRAM is sufficient for the batch size.</p>
                )}
                {trainDevice==='cpu' && gpuInfo?.cuda_available && (
                  <p className="text-xs text-amber-600 mt-1">GPU is available — switch to GPU for faster training.</p>
                )}
                {!gpuInfo?.cuda_available && (
                  <p className="text-xs text-gray-400 mt-1">No CUDA GPU detected. CPU training only.</p>
                )}
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                Training runs in the background. The best model is saved automatically and registered in the Model Repository.
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleStartJob} disabled={saving||!trainDatasetId}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold">
                {saving?<><Loader2 className="w-4 h-4 animate-spin"/>Starting...</>:<><Play className="w-4 h-4"/>Start Training</>}
              </button>
              <button onClick={()=>setIsTrainModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── VALIDATE MODAL ── */}
      {validateJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-800">Validate Model — Job #{validateJob.id}</h3>
              <button onClick={()=>setValidateJob(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5"/></button>
            </div>

            {!valResult ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Validation Dataset *</label>
                  <select value={valDatasetId??''} onChange={e=>setValDatasetId(parseInt(e.target.value)||null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">Select dataset...</option>
                    {datasets.map(ds=><option key={ds.id} value={ds.id}>{ds.name} ({ds.labeled} labeled)</option>)}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Can be a different dataset from the one used during training.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Confidence Threshold</label>
                    <input type="number" value={valConf} onChange={e=>setValConf(parseFloat(e.target.value)||0.25)}
                      step="0.05" min="0.01" max="0.99" className="w-full px-3 py-2 border border-gray-300 rounded-lg"/>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">IoU Threshold</label>
                    <input type="number" value={valIou} onChange={e=>setValIou(parseFloat(e.target.value)||0.6)}
                      step="0.05" min="0.1" max="0.99" className="w-full px-3 py-2 border border-gray-300 rounded-lg"/>
                  </div>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-700">
                  Validation runs the trained model against labeled images in the selected dataset and reports mAP, precision, and recall.
                </div>
                <div className="flex gap-3 mt-2">
                  <button onClick={handleValidate} disabled={valRunning||!valDatasetId}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold">
                    {valRunning?<><Loader2 className="w-4 h-4 animate-spin"/>Running validation...</>:<><FlaskConical className="w-4 h-4"/>Run Validation</>}
                  </button>
                  <button onClick={()=>setValidateJob(null)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-semibold">
                  Validation complete on "{valResult.dataset_name}"
                </div>

                {/* Overall metrics */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {label:'mAP@0.5',        val: pct(valResult.map50),    color:'text-green-600'},
                    {label:'mAP@0.5:0.95',   val: pct(valResult.map50_95), color:'text-blue-600'},
                    {label:'Precision',       val: pct(valResult.precision),color:'text-purple-600'},
                    {label:'Recall',          val: pct(valResult.recall),   color:'text-orange-600'},
                  ].map(m=>(
                    <div key={m.label} className="p-3 bg-gray-50 rounded-xl text-center">
                      <div className={`text-2xl font-bold ${m.color}`}>{m.val}</div>
                      <div className="text-xs text-gray-500 mt-1">{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* Per-class table */}
                {valResult.per_class && valResult.per_class.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">Per-Class AP@0.5</h4>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2 text-gray-600">Class</th>
                            <th className="text-right px-3 py-2 text-gray-600">AP@0.5</th>
                          </tr>
                        </thead>
                        <tbody>
                          {valResult.per_class.map((row, i)=>(
                            <tr key={i} className="border-t border-gray-100">
                              <td className="px-3 py-2 font-medium">{row.class}</td>
                              <td className="px-3 py-2 text-right text-green-600 font-semibold">{pct(row.ap50)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-400">
                  conf={valResult.conf_threshold} · iou={valResult.iou_threshold}
                </div>

                <div className="flex gap-3">
                  <button onClick={()=>setValResult(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                    Run Again
                  </button>
                  <button onClick={()=>setValidateJob(null)} className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm">
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
