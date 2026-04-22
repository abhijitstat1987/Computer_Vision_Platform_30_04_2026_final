import { useState, useEffect } from 'react';
import { Camera, Activity, AlertTriangle, CheckCircle, Zap, TrendingUp, Shield, Eye, Cpu, RefreshCw, Users, Clock, ChevronRight, MapPin, Wrench } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { api } from '../../services/api';

interface DashboardData {
  total_cameras: number;
  active_cameras: number;
  total_detections_today: number;
  unresolved_alerts: number;
  recent_events: { id: number; camera_name: string; event_type: string; detected_at: string }[];
}

/* ── Alert cards data (top row) ── */
const topAlerts = [
  {
    id: 'iNXT-1423',
    severity: 'critical' as const,
    badge: 'CRITICAL',
    equipment: 'Camera: iNXT-CAM-7843',
    workOrder: 'TKT-0847',
    title: 'PPE Violation — Hardhat Missing',
    zone: 'Zone A — Assembly Line',
    confidence: 87,
    color: 'red',
  },
  {
    id: 'iNXT-2781',
    severity: 'warning' as const,
    badge: 'WARNING',
    equipment: 'Camera: iNXT-CAM-3421',
    workOrder: 'TKT-0849',
    title: 'Safety Zone Breach Detected',
    zone: 'Zone B — Packaging',
    confidence: 72,
    color: 'orange',
  },
  {
    id: 'iNXT-0956',
    severity: 'info' as const,
    badge: 'INFO',
    equipment: 'Edge: iNXT-EDGE-5692',
    workOrder: 'TKT-0852',
    title: 'Model Drift — Accuracy Below Threshold',
    zone: 'Edge Node #3 — Quality Inspection',
    confidence: 64,
    color: 'blue',
  },
];

const rootCauseItems = [
  { num: '01', title: 'Image Quality', desc: 'Low-light feed at 0.8 lux' },
  { num: '02', title: 'Object Occlusion', desc: 'Partial visibility, overlapping objects' },
  { num: '03', title: 'Model Version', desc: 'YOLO v8.1 — retrain pending' },
  { num: '04', title: 'Inference Load', desc: '18,200 frames since last calibration' },
];

const sensorReadings = [
  { label: 'Inference Rate', value: '2.8 IPS', color: 'text-blue-600' },
  { label: 'False Positive Rate', value: '2.2%', color: 'text-orange-500' },
  { label: 'Avg Latency', value: '94ms', color: 'text-gray-700' },
  { label: 'Throughput', value: '2,410 fr/h', color: 'text-gray-700' },
];

const riskItems = [
  { label: 'Probability', value: '72%', color: 'text-red-500' },
  { label: 'Time to Resolution', value: '72h', color: 'text-orange-500' },
  { label: 'Safety Impact', value: 'Medium-High', color: 'text-orange-600', bold: true },
  { label: 'Est. Cost', value: '$145,000', color: 'text-red-500' },
];

const troubleshootingSteps = [
  { label: 'Camera calibration check', done: true },
  { label: 'Model inference analysis', done: true },
  { label: 'Edge device diagnostics', done: false, active: true },
  { label: 'Model retrain & deploy', done: false },
  { label: 'Post-deployment validation', done: false },
];

const similarEvents = [
  { id: 'iNXT-6104', date: 'Mar 2026', badge: '60H EARLY', color: 'text-green-600' },
  { id: 'iNXT-8821', date: 'Nov 2025', badge: '48H EARLY', color: 'text-green-600' },
  { id: 'iNXT-3390', date: 'Sep 2025', badge: '72H EARLY', color: 'text-green-600' },
];

const allWorkOrders = [
  { id: 'TKT-0847 · iNXT-CAM-7843', pct: 87, color: 'bg-red-500' },
  { id: 'TKT-0849 · iNXT-CAM-3421', pct: 72, color: 'bg-orange-500' },
  { id: 'TKT-0852 · iNXT-EDGE-5692', pct: 64, color: 'bg-blue-500' },
];

const teamMembers = [
  { initials: 'DK', bg: 'bg-green-600' },
  { initials: 'CV', bg: 'bg-blue-600' },
  { initials: 'RA', bg: 'bg-red-500' },
];

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState(1); // index

  async function fetchDashboard() {
    try {
      setLoading(true);
      const d = await api.get<DashboardData>('/api/dashboard');
      setData(d);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchDashboard(); }, []);

  const alert = topAlerts[selectedAlert];

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="font-medium text-gray-700">iNXT Vision AI</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-blue-600 font-semibold">Predictive Alerts</span>
      </div>

      {/* ─── Top: 3 Alert Cards + Right Sidebar ─── */}
      <div className="flex gap-5">
        {/* Left: Alert cards + Analysis */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* 3 Alert Cards */}
          <div className="grid grid-cols-3 gap-4">
            {topAlerts.map((a, idx) => {
              const isSelected = idx === selectedAlert;
              const borderColor = a.severity === 'critical' ? 'border-red-400' : a.severity === 'warning' ? 'border-orange-400' : 'border-blue-400';
              const dotColor = a.severity === 'critical' ? 'bg-red-500' : a.severity === 'warning' ? 'bg-orange-400' : 'bg-blue-400';
              const badgeColor = a.severity === 'critical' ? 'bg-red-50 text-red-600 border-red-200' : a.severity === 'warning' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-blue-50 text-blue-600 border-blue-200';
              const barColor = a.severity === 'critical' ? 'bg-red-500' : a.severity === 'warning' ? 'bg-orange-500' : 'bg-blue-500';
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedAlert(idx)}
                  className={`bg-white rounded-xl p-4 text-left transition-all border-2 ${
                    isSelected ? borderColor + ' shadow-lg' : 'border-transparent shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                      <span className="font-mono font-bold text-sm text-gray-800">{a.id}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                      {a.badge}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono mb-1">
                    {a.equipment} <span className="ml-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold">{a.workOrder}</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-800 mb-1">{a.title}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">{a.zone}</span>
                    <div className="flex-1" />
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${a.confidence}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-700">{a.confidence}%</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Issue Analysis Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {/* Title bar */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-gray-800">Issue Analysis — {alert.equipment} ({alert.workOrder})</h3>
            </div>

            {/* Problem banner */}
            <div className="mx-5 mt-4 px-4 py-3 bg-orange-50 border-l-4 border-orange-400 rounded-r-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-bold text-orange-700">Problem Identified</span>
              </div>
              <p className="text-sm text-orange-600 mt-1">{alert.title} — AI detected anomalous patterns in {alert.zone}.</p>
            </div>

            {/* Root Cause Analysis */}
            <div className="px-5 mt-5">
              <h4 className="text-sm font-bold text-blue-600 flex items-center gap-2 mb-3">
                <Zap className="w-3.5 h-3.5" /> Root Cause Analysis
              </h4>
              <div className="grid grid-cols-4 gap-3">
                {rootCauseItems.map((item) => (
                  <div key={item.num} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="text-[10px] font-bold text-blue-500 mb-1">{item.num}</div>
                    <div className="text-sm font-bold text-gray-800">{item.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sensor Readings + Risk Assessment side by side */}
            <div className="px-5 mt-5 grid grid-cols-2 gap-5">
              {/* Sensor Readings */}
              <div>
                <h4 className="text-xs font-bold text-green-700 tracking-wider uppercase mb-3">Sensor Readings</h4>
                <div className="space-y-2.5">
                  {sensorReadings.map((s) => (
                    <div key={s.label} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{s.label}</span>
                      <span className={`text-sm font-mono font-bold ${s.color}`}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Risk Assessment */}
              <div>
                <h4 className="text-xs font-bold text-red-600 tracking-wider uppercase mb-3">Risk Assessment</h4>
                <div className="space-y-2.5">
                  {riskItems.map((r) => (
                    <div key={r.label} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{r.label}</span>
                      <span className={`text-sm font-bold ${r.color} ${r.bold ? 'px-2 py-0.5 bg-orange-50 rounded border border-orange-200 text-[11px]' : 'font-mono'}`}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Resource Alignment */}
            <div className="px-5 mt-5 mb-5">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-bold text-gray-800">Resource Alignment — {alert.workOrder}</h4>
                </div>
                {/* Team */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex -space-x-2">
                    {teamMembers.map((m) => (
                      <div key={m.initials} className={`w-8 h-8 ${m.bg} rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white`}>
                        {m.initials}
                      </div>
                    ))}
                  </div>
                  <div className="ml-2">
                    <div className="text-sm font-semibold text-gray-800">David Kim, Carlos Vega, Rachel Adams</div>
                    <div className="text-xs text-gray-500">Assigned to {alert.zone}</div>
                  </div>
                </div>

                {/* Troubleshooting Progress */}
                <div className="text-xs font-semibold text-gray-500 mb-2">Troubleshooting Progress:</div>
                <div className="space-y-1.5">
                  {troubleshootingSteps.map((step, idx) => (
                    <div key={idx} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${
                      step.done ? 'bg-white' : step.active ? 'bg-blue-50 border border-blue-200' : 'bg-white'
                    }`}>
                      {step.done ? (
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : step.active ? (
                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">{idx + 1}</div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-400 text-[9px] font-bold flex-shrink-0">{idx + 1}</div>
                      )}
                      <span className={`text-sm ${step.done ? 'text-gray-600' : step.active ? 'text-blue-700 font-semibold' : 'text-gray-500'}`}>
                        {step.label}
                      </span>
                      {step.active && (
                        <span className="ml-auto text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">ACTIVE</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Right Sidebar ─── */}
        <div className="w-72 flex-shrink-0 space-y-4">
          {/* Prediction Confidence */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h4 className="text-sm font-bold text-gray-800 mb-4">Prediction Confidence:</h4>
            <div className="space-y-3">
              {[
                { label: 'AI Confidence', value: 72, color: 'bg-blue-500' },
                { label: 'Data Quality', value: 88, color: 'bg-blue-600' },
                { label: 'Model Accuracy', value: 85, color: 'bg-blue-600' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">{item.label}</span>
                    <span className="text-xs font-bold text-blue-600">{item.value}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Equipment Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h4 className="text-sm font-bold text-orange-600 mb-3">Camera / Edge Details:</h4>
            <div className="space-y-2">
              {[
                { label: 'Camera ID', value: alert.equipment.replace('Camera: ', '') },
                { label: 'Work Order', value: alert.workOrder },
                { label: 'Type', value: 'YOLO v8 · Object Detection' },
                { label: 'Uptime', value: '38,120h' },
                { label: 'Detections', value: '22,410' },
                { label: 'Location', value: alert.zone },
                { label: 'Status', value: 'Active — Monitoring' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <span className="text-xs font-semibold text-gray-800 text-right">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Similar Events */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h4 className="text-sm font-bold text-blue-600 mb-3">Similar Events:</h4>
            <div className="space-y-2">
              {similarEvents.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-gray-800">{ev.id}</span>
                    <span className="text-xs text-gray-500 ml-2">{ev.date}</span>
                  </div>
                  <span className={`text-[10px] font-bold ${ev.color} bg-green-50 px-2 py-0.5 rounded`}>✓ {ev.badge}</span>
                </div>
              ))}
            </div>
          </div>

          {/* All Work Orders */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h4 className="text-sm font-bold text-red-500 mb-3">All Active Tickets:</h4>
            <div className="space-y-2.5">
              {allWorkOrders.map((wo) => (
                <div key={wo.id} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${wo.color}`} />
                  <span className="text-xs font-medium text-gray-700 flex-1">{wo.id}</span>
                  <span className="text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{wo.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
