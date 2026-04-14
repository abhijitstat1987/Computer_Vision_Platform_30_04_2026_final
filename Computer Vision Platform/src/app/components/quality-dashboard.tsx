import { CheckCircle, XCircle, TrendingUp, Package, Eye, BarChart3, AlertCircle, Factory } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const qualityStats = [
  { label: 'Quality Pass Rate', value: '97.3%', icon: CheckCircle, gradient: 'from-green-500 to-emerald-600', change: '+1.8% this week', trend: 'up' },
  { label: 'Inspected Products', value: '15,847', icon: Package, gradient: 'from-blue-500 to-blue-600', change: '+420 today', trend: 'up' },
  { label: 'Defects Detected', value: '428', icon: XCircle, gradient: 'from-red-500 to-red-600', change: '-12% vs last week', trend: 'down' },
  { label: 'Quality Cameras', value: '14', icon: Eye, gradient: 'from-purple-500 to-purple-600', change: 'All operational', trend: 'up' },
];

const qualityTrendData = [
  { hour: '00:00', pass: 95.2, fail: 4.8 },
  { hour: '04:00', pass: 96.1, fail: 3.9 },
  { hour: '08:00', pass: 97.8, fail: 2.2 },
  { hour: '12:00', pass: 98.2, fail: 1.8 },
  { hour: '16:00', pass: 96.9, fail: 3.1 },
  { hour: '20:00', pass: 95.8, fail: 4.2 },
];

const defectsByType = [
  { name: 'Surface Defects', value: 38, color: '#ef4444' },
  { name: 'Dimensional Issues', value: 28, color: '#f59e0b' },
  { name: 'Color Mismatch', value: 18, color: '#3b82f6' },
  { name: 'Assembly Errors', value: 16, color: '#8b5cf6' },
];

const productionLineStats = [
  { line: 'Line A', inspected: 4250, passed: 4142, defects: 108, rate: 97.5 },
  { line: 'Line B', inspected: 3890, passed: 3781, defects: 109, rate: 97.2 },
  { line: 'Line C', inspected: 4180, passed: 4098, defects: 82, rate: 98.0 },
  { line: 'Line D', inspected: 3527, passed: 3426, defects: 101, rate: 97.1 },
];

const recentQualityAlerts = [
  { time: '3 min ago', message: 'Surface defect detected - Product #SK-4521', severity: 'medium', line: 'Line A' },
  { time: '7 min ago', message: 'Dimensional variance exceeded - Batch B-432', severity: 'high', line: 'Line B' },
  { time: '12 min ago', message: 'Quality check passed - Batch C-891', severity: 'low', line: 'Line C' },
  { time: '18 min ago', message: 'Color inspection flagged - Product #SK-4498', severity: 'medium', line: 'Line A' },
  { time: '25 min ago', message: 'Assembly verification complete - Line D batch', severity: 'low', line: 'Line D' },
];

const modelAccuracy = [
  { model: 'Surface Inspection', accuracy: 98.7, inspections: 8420 },
  { model: 'Dimension Check', accuracy: 97.3, inspections: 6890 },
  { model: 'Color Verification', accuracy: 96.8, inspections: 5240 },
  { model: 'Assembly Validation', accuracy: 95.2, inspections: 3890 },
];

const zoneProductivity = [
  { zone: 'Assembly Zone', throughput: 1250, quality: 97.8, efficiency: 94.2 },
  { zone: 'Packaging Zone', throughput: 980, quality: 98.5, efficiency: 96.1 },
  { zone: 'Final Inspection', throughput: 1180, quality: 99.2, efficiency: 97.3 },
  { zone: 'Quality Control', throughput: 850, quality: 98.9, efficiency: 95.8 },
];

const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    border: 'none',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    fontSize: '12px',
  },
};

export function QualityDashboard() {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-green-900 via-emerald-800 to-green-900 rounded-xl p-4 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-green-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white leading-tight">Quality Inspection Command Center</h2>
            <p className="text-sm text-green-200">Real-time Defect Detection, Quality Control & Production Monitoring</p>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-200">15,847 products inspected today • All systems operational</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3">
        {qualityStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="group relative overflow-hidden bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
              <div className="relative p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 bg-gradient-to-br ${stat.gradient} rounded-lg flex items-center justify-center shadow`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    stat.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    <TrendingUp className={`w-3 h-3 inline mr-1 ${stat.trend === 'down' ? 'rotate-180' : ''}`} />
                    {stat.trend === 'up' ? 'Excellent' : 'Reduced'}
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-xs font-medium text-gray-600 mb-1">{stat.label}</div>
                <div className="text-xs text-gray-400">{stat.change}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Quality Pass/Fail Rate
            </h3>
            <span className="px-2 py-0.5 bg-green-50 rounded text-xs font-semibold text-green-700">Live</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={qualityTrendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPass" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorFail" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" stroke="#999" tick={{ fontSize: 11 }} />
              <YAxis stroke="#999" tick={{ fontSize: 11 }} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="pass" stroke="#10b981" fillOpacity={1} fill="url(#colorPass)" strokeWidth={2} name="Pass Rate %" />
              <Area type="monotone" dataKey="fail" stroke="#ef4444" fillOpacity={1} fill="url(#colorFail)" strokeWidth={2} name="Fail Rate %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Production Line Quality
            </h3>
            <span className="text-xs text-gray-400">Pass rates by line</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={productionLineStats} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="line" stroke="#999" tick={{ fontSize: 11 }} />
              <YAxis domain={[94, 100]} stroke="#999" tick={{ fontSize: 11 }} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="rate" fill="#10b981" radius={[6, 6, 0, 0]} name="Pass Rate %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Defect Distribution and Recent Alerts */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            Defect Distribution
          </h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={defectsByType} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                  {defectsByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 flex-1">
              {defectsByType.map((type, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: type.color }} />
                  <span className="text-gray-700 flex-1">{type.name}</span>
                  <span className="text-gray-500 font-semibold">{type.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-600" />
            Recent Quality Alerts
          </h3>
          <div className="space-y-2">
            {recentQualityAlerts.map((alert, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 transition-all">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  alert.severity === 'high' ? 'bg-red-500' :
                  alert.severity === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-800 font-medium leading-snug">{alert.message}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-gray-400">{alert.time}</span>
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-xs text-green-600 font-medium">{alert.line}</span>
                  </div>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${
                  alert.severity === 'high' ? 'bg-red-100 text-red-700' :
                  alert.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-green-100 text-green-700'
                }`}>{alert.severity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Model Accuracy + Zone Productivity */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-600" />
            Quality Model Performance
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {modelAccuracy.map((model, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="text-xs font-semibold text-gray-700 mb-1">{model.model}</div>
                <div className="text-xl font-bold text-green-600 mb-1">{model.accuracy}%</div>
                <div className="text-xs text-gray-400 mb-1.5">{model.inspections.toLocaleString()} inspections</div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                    style={{ width: `${model.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Factory className="w-4 h-4 text-purple-600" />
            Production Zone Performance
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {zoneProductivity.map((zone, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">{zone.zone}</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Throughput</span>
                    <span className="font-bold text-gray-800">{zone.throughput}/hr</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Quality</span>
                    <span className="font-bold text-green-600">{zone.quality}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Efficiency</span>
                    <span className="font-bold text-blue-600">{zone.efficiency}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
