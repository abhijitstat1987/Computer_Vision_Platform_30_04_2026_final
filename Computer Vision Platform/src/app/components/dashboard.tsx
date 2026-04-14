import { useState, useEffect } from 'react';
import { Camera, Activity, AlertTriangle, CheckCircle, Zap, TrendingUp, Shield, Eye, Cpu, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { api } from '../../services/api';

interface DashboardData {
  total_cameras: number;
  active_cameras: number;
  total_detections_today: number;
  unresolved_alerts: number;
  recent_events: { id: number; camera_name: string; event_type: string; detected_at: string }[];
}

const detectionData = [
  { hour: '00:00', detections: 12, alerts: 2 },
  { hour: '03:00', detections: 8,  alerts: 1 },
  { hour: '06:00', detections: 24, alerts: 4 },
  { hour: '09:00', detections: 58, alerts: 7 },
  { hour: '12:00', detections: 45, alerts: 5 },
  { hour: '15:00', detections: 62, alerts: 9 },
  { hour: '18:00', detections: 38, alerts: 3 },
  { hour: '21:00', detections: 20, alerts: 2 },
];

const modelPerformance = [
  { name: 'PPE Detection',     accuracy: 96.8 },
  { name: 'Quality Control',   accuracy: 94.2 },
  { name: 'Safety Zone',       accuracy: 98.1 },
  { name: 'Defect Detection',  accuracy: 91.5 },
];

const alertTypes = [
  { name: 'No PPE', value: 45, color: '#ef4444' },
  { name: 'Safety Zone', value: 28, color: '#f59e0b' },
  { name: 'Quality Issues', value: 18, color: '#3b82f6' },
  { name: 'Others', value: 9, color: '#8b5cf6' },
];

const systemHealth = [
  { component: 'Edge Devices', status: 'healthy', uptime: '99.9%', color: 'green' },
  { component: 'Cameras', status: 'healthy', uptime: '99.5%', color: 'green' },
  { component: 'Models', status: 'warning', uptime: '98.2%', color: 'yellow' },
  { component: 'Database', status: 'healthy', uptime: '100%', color: 'green' },
];

export function Dashboard() {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  async function fetchDashboard() {
    try {
      setLoading(true);
      const d = await api.get<DashboardData>('/api/dashboard');
      setData(d);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchDashboard(); }, []);

  const stats = data ? [
    { label: 'Active Cameras', value: String(data.active_cameras), icon: Camera, gradient: 'from-blue-500 to-blue-600', change: `${data.total_cameras} total`, trend: 'up' as const },
    { label: 'Detections Today', value: String(data.total_detections_today), icon: Activity, gradient: 'from-green-500 to-emerald-600', change: 'Today only', trend: 'up' as const },
    { label: 'Unresolved Alerts', value: String(data.unresolved_alerts), icon: AlertTriangle, gradient: 'from-amber-500 to-orange-600', change: 'Needs attention', trend: data.unresolved_alerts > 0 ? 'down' as const : 'up' as const },
    { label: 'Total Cameras', value: String(data.total_cameras), icon: CheckCircle, gradient: 'from-purple-500 to-purple-600', change: `${data.active_cameras} active`, trend: 'up' as const },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-2xl p-8 shadow-2xl">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Eye className="w-7 h-7 text-blue-300" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">Command Center</h2>
                <p className="text-blue-200">Real-time Industrial AI & Safety Monitoring</p>
              </div>
            </div>
            <button onClick={fetchDashboard} className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-blue-200 mt-4">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            {error ? <span className="text-red-300">{error}</span> : 'All systems operational • Live data'}
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 border border-gray-100">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-14 h-14 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    stat.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    <TrendingUp className={`w-3 h-3 inline mr-1 ${stat.trend === 'down' ? 'rotate-180' : ''}`} />
                    {stat.trend === 'up' ? 'Up' : 'Down'}
                  </div>
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-2">{stat.value}</div>
                <div className="text-sm font-medium text-gray-600 mb-2">{stat.label}</div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  {stat.change}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detection Activity */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-600" />
                Detection Activity
              </h3>
              <p className="text-sm text-gray-500 mt-1">Last 24 hours</p>
            </div>
            <div className="px-3 py-1 bg-blue-50 rounded-lg text-sm font-semibold text-blue-700">
              Live
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={detectionData}>
              <defs>
                <linearGradient id="colorDetections" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                }}
              />
              <Area type="monotone" dataKey="detections" stroke="#3b82f6" fillOpacity={1} fill="url(#colorDetections)" strokeWidth={3} />
              <Area type="monotone" dataKey="alerts" stroke="#f59e0b" fillOpacity={1} fill="url(#colorAlerts)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Model Performance */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Cpu className="w-6 h-6 text-green-600" />
                Model Accuracy
              </h3>
              <p className="text-sm text-gray-500 mt-1">Current performance</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={modelPerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" domain={[85, 100]} stroke="#666" />
              <YAxis dataKey="name" type="category" width={120} stroke="#666" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                }}
              />
              <Bar dataKey="accuracy" fill="url(#barGradient)" radius={[0, 8, 8, 0]}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alert Distribution and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alert Distribution */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            Alert Distribution
          </h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={alertTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {alertTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {alertTypes.map((type, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }}></div>
                <span className="text-gray-700">{type.name}</span>
                <span className="text-gray-500 ml-auto">{type.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Zap className="w-6 h-6 text-purple-600" />
            Recent Events
          </h3>
          <div className="space-y-4 max-h-72 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading...
              </div>
            ) : data && data.recent_events.length > 0 ? data.recent_events.map((event, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all">
                <div className="w-2 h-2 rounded-full mt-2 bg-blue-500"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium">{event.event_type} — {event.camera_name}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(event.detected_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                  {event.event_type}
                </span>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-400 text-sm">No recent events</div>
            )}
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" />
          System Health
        </h3>
        <div className="grid md:grid-cols-4 gap-4">
          {systemHealth.map((system, idx) => (
            <div key={idx} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">{system.component}</span>
                <div className={`w-3 h-3 rounded-full ${
                  system.color === 'green' ? 'bg-green-500' :
                  system.color === 'yellow' ? 'bg-yellow-500' :
                  'bg-red-500'
                } ${system.color === 'green' ? 'animate-pulse' : ''}`}></div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{system.uptime}</div>
              <div className={`text-xs font-medium ${
                system.status === 'healthy' ? 'text-green-600' :
                system.status === 'warning' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {system.status.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
