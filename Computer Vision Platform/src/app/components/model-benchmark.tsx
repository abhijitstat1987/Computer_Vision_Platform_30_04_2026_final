/**
 * Model Benchmark Section
 * Select models + dataset → run evaluation → compare metrics side-by-side.
 */
import { useState, useEffect, useRef } from "react";
import {
  Play, RefreshCw, CheckSquare, Square, BarChart2,
  TrendingUp, Zap, Target, Award, Clock, AlertCircle, ChevronDown, ChevronUp
} from "lucide-react";
import { benchmarkService, BenchmarkableModel, BenchmarkMetric } from "@/services/benchmark";
import { labelDatasetsService, LabelDataset } from "@/services/labelDatasets";

// Lightweight bar — width as % of max
function MetricBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono text-gray-700 w-12 text-right">
        {(value * 100).toFixed(1)}%
      </span>
    </div>
  );
}

function SpeedBar({ value, max }: { value: number; max: number }) {
  // Lower is better for speed — invert
  const inverted = max > 0 ? (1 - value / max) * 100 : 100;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className="h-full rounded-full bg-purple-400 transition-all duration-700"
          style={{ width: `${inverted}%` }} />
      </div>
      <span className="text-xs font-mono text-gray-700 w-16 text-right">
        {value.toFixed(1)} ms
      </span>
    </div>
  );
}

const METRIC_DEFS = [
  { key: "map50",     label: "mAP@0.5",   icon: <Target className="w-4 h-4" />,    color: "#3b82f6" },
  { key: "map50_95",  label: "mAP@0.5:0.95", icon: <TrendingUp className="w-4 h-4" />, color: "#8b5cf6" },
  { key: "precision", label: "Precision",  icon: <Award className="w-4 h-4" />,     color: "#22c55e" },
  { key: "recall",    label: "Recall",     icon: <BarChart2 className="w-4 h-4" />, color: "#f59e0b" },
];

const FRAMEWORK_COLORS: Record<string, string> = {
  PyTorch: "bg-orange-100 text-orange-700",
  TensorFlow: "bg-blue-100 text-blue-700",
};

export function ModelBenchmark() {
  const [models, setModels]         = useState<BenchmarkableModel[]>([]);
  const [datasets, setDatasets]     = useState<LabelDataset[]>([]);
  const [selectedModels, setSelectedModels] = useState<Set<number>>(new Set());
  const [selectedDs, setSelectedDs] = useState<number | null>(null);
  const [running, setRunning]       = useState(false);
  const [progress, setProgress]     = useState(0);
  const [results, setResults]       = useState<BenchmarkMetric[]>([]);
  const [error, setError]           = useState<string | null>(null);
  const [sortKey, setSortKey]       = useState<string>("map50");
  const [sortAsc, setSortAsc]       = useState(false);
  const [showModels, setShowModels] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Promise.all([
      benchmarkService.listModels(),
      labelDatasetsService.list(),
    ]).then(([ms, ds]) => {
      setModels(ms);
      setDatasets(ds);
    }).catch(console.error);
  }, []);

  // Cleanup poll on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const toggleModel = (id: number) => {
    setSelectedModels(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const runBenchmark = async () => {
    if (selectedModels.size === 0 || !selectedDs) return;
    setRunning(true);
    setError(null);
    setResults([]);
    setProgress(0);

    try {
      const { token } = await benchmarkService.run(Array.from(selectedModels), selectedDs);

      // Poll until done
      pollRef.current = setInterval(async () => {
        try {
          const job = await benchmarkService.status(token);
          setProgress(job.progress);
          if (job.status === "done") {
            clearInterval(pollRef.current!);
            setRunning(false);
            setResults(job.results);
          } else if (job.status === "failed") {
            clearInterval(pollRef.current!);
            setRunning(false);
            setError(job.error ?? "Benchmark failed");
          }
        } catch {
          clearInterval(pollRef.current!);
          setRunning(false);
          setError("Failed to poll benchmark status");
        }
      }, 2000);
    } catch (e: any) {
      setRunning(false);
      setError(e.message);
    }
  };

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sortedResults = [...results].sort((a, b) => {
    const av = (a as any)[sortKey] ?? 0;
    const bv = (b as any)[sortKey] ?? 0;
    return sortAsc ? av - bv : bv - av;
  });

  const maxes = {
    map50:     Math.max(...results.map(r => r.map50), 0.001),
    map50_95:  Math.max(...results.map(r => r.map50_95), 0.001),
    precision: Math.max(...results.map(r => r.precision), 0.001),
    recall:    Math.max(...results.map(r => r.recall), 0.001),
    speed_ms:  Math.max(...results.map(r => r.speed_ms), 0.001),
  };

  const winner = results.length > 0
    ? results.reduce((a, b) => (a.map50 >= b.map50 ? a : b))
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Model Benchmark</h2>
        <p className="text-gray-500 text-sm">Compare model performance on your labeled datasets</p>
      </div>

      {/* Setup card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Model picker header */}
        <button
          onClick={() => setShowModels(v => !v)}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-800">Select Models</div>
              <div className="text-xs text-gray-500">
                {selectedModels.size} of {models.length} selected
              </div>
            </div>
          </div>
          {showModels ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showModels && (
          <div className="border-t px-5 pb-5">
            {models.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">
                No trained models found. Complete a training job first.
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {models.map(m => (
                  <button
                    key={m.id}
                    onClick={() => toggleModel(m.id)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all hover:shadow-sm ${
                      selectedModels.has(m.id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="mt-0.5">
                      {selectedModels.has(m.id)
                        ? <CheckSquare className="w-5 h-5 text-blue-600" />
                        : <Square className="w-5 h-5 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 text-sm truncate">{m.name}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          FRAMEWORK_COLORS[m.framework] ?? "bg-gray-100 text-gray-600"
                        }`}>{m.framework}</span>
                        <span className="text-xs text-gray-500">{m.type}</span>
                        {m.accuracy && (
                          <span className="text-xs text-green-600 font-medium">acc: {m.accuracy}</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dataset + run */}
        <div className="border-t p-5 bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Evaluation Dataset</label>
            <select
              value={selectedDs ?? ""}
              onChange={e => setSelectedDs(Number(e.target.value) || null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- select dataset --</option>
              {datasets.map(ds => (
                <option key={ds.id} value={ds.id}>
                  {ds.name} ({ds.labeled + ds.auto_labeled + ds.verified} labeled)
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={runBenchmark}
            disabled={running || selectedModels.size === 0 || !selectedDs}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-sm hover:from-blue-700 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-200 transition-all"
          >
            {running
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Running…</>
              : <><Play className="w-4 h-4" /> Run Benchmark</>}
          </button>
        </div>
      </div>

      {/* Progress */}
      {running && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
            <span className="font-medium text-gray-700">Evaluating models… {progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            This may take several minutes depending on dataset size and model complexity.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-700 text-sm">Benchmark failed</p>
            <p className="text-red-600 text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {/* Winner banner */}
          {winner && !winner.error && (
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-2xl">
                🏆
              </div>
              <div>
                <div className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">Best Model</div>
                <div className="font-bold text-gray-800 text-lg">{winner.model_name}</div>
                <div className="text-sm text-gray-600">
                  mAP@0.5: <strong>{(winner.map50 * 100).toFixed(1)}%</strong>
                  {" · "}Precision: <strong>{(winner.precision * 100).toFixed(1)}%</strong>
                  {" · "}Recall: <strong>{(winner.recall * 100).toFixed(1)}%</strong>
                </div>
              </div>
            </div>
          )}

          {/* Comparison table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Results Comparison</h3>
              <span className="text-sm text-gray-500">{results.length} model{results.length > 1 ? "s" : ""} evaluated</span>
            </div>

            {/* Desktop table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Model</th>
                    {METRIC_DEFS.map(m => (
                      <th key={m.key}
                        className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => toggleSort(m.key)}>
                        <div className="flex items-center gap-1">
                          {m.label}
                          {sortKey === m.key
                            ? (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
                            : <ChevronDown className="w-3 h-3 text-gray-300" />}
                        </div>
                      </th>
                    ))}
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => toggleSort("speed_ms")}>
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Speed
                        {sortKey === "speed_ms"
                          ? (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
                          : <ChevronDown className="w-3 h-3 text-gray-300" />}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedResults.map((r, idx) => {
                    const isWinner = r.model_config_id === winner?.model_config_id && !r.error;
                    return (
                      <tr key={r.model_config_id}
                        className={`hover:bg-gray-50 transition-colors ${isWinner ? "bg-yellow-50/50" : ""}`}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {isWinner && <span className="text-lg">🏆</span>}
                            <div>
                              <div className="font-medium text-gray-800">{r.model_name}</div>
                              <div className="flex gap-1.5 mt-0.5">
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                  FRAMEWORK_COLORS[r.framework] ?? "bg-gray-100 text-gray-600"
                                }`}>{r.framework}</span>
                                <span className="text-xs text-gray-400">{r.model_type}</span>
                              </div>
                              {r.error && (
                                <span className="text-xs text-red-500 mt-1 block">{r.error}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        {METRIC_DEFS.map(m => (
                          <td key={m.key} className="px-4 py-4 w-40">
                            {r.error ? (
                              <span className="text-xs text-gray-400">—</span>
                            ) : (
                              <MetricBar
                                value={(r as any)[m.key] ?? 0}
                                max={(maxes as any)[m.key]}
                                color={m.color}
                              />
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-4 w-40">
                          {r.error ? (
                            <span className="text-xs text-gray-400">—</span>
                          ) : (
                            <SpeedBar value={r.speed_ms} max={maxes.speed_ms} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Visual bar chart */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-bold text-gray-800 mb-5">Metric Comparison Chart</h3>
            <div className="space-y-6">
              {METRIC_DEFS.map(metric => (
                <div key={metric.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ color: metric.color }}>{metric.icon}</span>
                    <span className="text-sm font-semibold text-gray-700">{metric.label}</span>
                  </div>
                  <div className="space-y-2">
                    {sortedResults.filter(r => !r.error).map(r => {
                      const val = (r as any)[metric.key] ?? 0;
                      const maxVal = (maxes as any)[metric.key];
                      const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                      const isWinner = r.model_config_id === winner?.model_config_id;
                      return (
                        <div key={r.model_config_id} className="flex items-center gap-3">
                          <div className="w-36 text-xs text-gray-600 truncate text-right flex-shrink-0">
                            {r.model_name.split(" ")[0]}
                          </div>
                          <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden relative">
                            <div
                              className="h-full rounded-full flex items-center justify-end pr-2 text-white text-xs font-medium transition-all duration-1000"
                              style={{
                                width: `${pct}%`,
                                background: isWinner
                                  ? `linear-gradient(90deg, ${metric.color}99, ${metric.color})`
                                  : metric.color + "80",
                                minWidth: "2rem",
                              }}
                            >
                              {(val * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Speed comparison */}
          {results.some(r => r.speed_ms > 0) && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-purple-500" />
                <h3 className="font-bold text-gray-800">Inference Speed (ms per image)</h3>
                <span className="text-xs text-gray-400 ml-auto">Lower is better</span>
              </div>
              <div className="space-y-2">
                {[...results].filter(r => !r.error && r.speed_ms > 0)
                  .sort((a, b) => a.speed_ms - b.speed_ms)
                  .map((r, rank) => (
                    <div key={r.model_config_id} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-5 text-right">{rank + 1}.</span>
                      <div className="w-32 text-xs text-gray-600 truncate">{r.model_name.split(" ")[0]}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full flex items-center justify-end pr-2 text-white text-xs font-medium"
                          style={{
                            width: `${Math.max(10, (1 - r.speed_ms / maxes.speed_ms) * 100)}%`,
                            minWidth: "3rem",
                          }}
                        >
                          {r.speed_ms.toFixed(1)}ms
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!running && results.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
          <BarChart2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-600 mb-1">No benchmark results yet</h3>
          <p className="text-sm text-gray-400">
            Select models and a dataset above, then click <strong>Run Benchmark</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
