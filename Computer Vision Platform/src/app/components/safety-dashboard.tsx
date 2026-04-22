import { Shield, AlertTriangle, Users, Activity, TrendingUp, HardHat, Eye, MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const safetyStats = [
  { label: 'Active Safety Cameras', value: '18', icon: Eye, gradient: 'from-blue-500 to-blue-600', change: '+2 this week', trend: 'up' },
  { label: 'PPE Compliance', value: '96.8%', icon: HardHat, gradient: 'from-green-500 to-emerald-600', change: '+2.1% improvement', trend: 'up' },
  { label: 'Active Alerts', value: '12', icon: AlertTriangle, gradient: 'from-amber-500 to-orange-600', change: '3 critical', trend: 'down' },
  { label: 'Workers Monitored', value: '247', icon: Users, gradient: 'from-purple-500 to-purple-600', change: 'Across 4 zones', trend: 'up' },
];

const safetyDetectionData = [
  { hour: '00:00', ppe: 12, zone: 8, fall: 2 },
  { hour: '04:00', ppe: 8, zone: 5, fall: 1 },
  { hour: '08:00', ppe: 32, zone: 18, fall: 3 },
  { hour: '12:00', ppe: 45, zone: 24, fall: 5 },
  { hour: '16:00', ppe: 38, zone: 20, fall: 4 },
  { hour: '20:00', ppe: 22, zone: 14, fall: 2 },
];

const ppeComplianceData = [
  { zone: 'Zone A', compliance: 98.5, violations: 12 },
  { zone: 'Zone B', compliance: 96.2, violations: 24 },
  { zone: 'Zone C', compliance: 94.8, violations: 32 },
  { zone: 'Zone D', compliance: 97.1, violations: 18 },
];

const incidentTypes = [
  { name: 'No Helmet', value: 35, color: '#ef4444' },
  { name: 'No Vest', value: 28, color: '#f59e0b' },
  { name: 'Restricted Area', value: 22, color: '#3b82f6' },
  { name: 'Fall Risk', value: 15, color: '#8b5cf6' },
];

const recentSafetyAlerts = [
  { time: '2 min ago', message: 'PPE violation detected - Worker without helmet in Zone A', severity: 'high', zone: 'Zone A' },
  { time: '8 min ago', message: 'Restricted area access detected - Zone B-3', severity: 'medium', zone: 'Zone B' },
  { time: '15 min ago', message: 'Fall risk detected - Worker near edge in Zone C', severity: 'high', zone: 'Zone C' },
  { time: '22 min ago', message: 'PPE compliance verified - All workers in Zone D', severity: 'low', zone: 'Zone D' },
  { time: '28 min ago', message: 'Safety protocol violation - Zone A-2', severity: 'medium', zone: 'Zone A' },
];

const zoneStatus = [
  { zone: 'Zone A - Assembly', workers: 68, cameras: 5, compliance: 98.5, status: 'safe' },
  { zone: 'Zone B - Manufacturing', workers: 92, cameras: 6, compliance: 96.2, status: 'warning' },
  { zone: 'Zone C - Warehouse', workers: 54, cameras: 4, compliance: 94.8, status: 'warning' },
  { zone: 'Zone D - Quality Check', workers: 33, cameras: 3, compliance: 97.1, status: 'safe' },
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

export function SafetyDashboard() {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 rounded-xl p-4 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
            <Shield className="w-6 h-6 text-blue-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white leading-tight">Worker Safety Command Center</h2>
            <p className="text-sm text-blue-200">Real-time PPE Detection, Safety Zone Monitoring & Incident Prevention</p>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-blue-200">All systems operational • 247 workers monitored</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3">
        {safetyStats.map((stat) => {
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
                    {stat.trend === 'up' ? 'Improving' : 'Alert'}
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
              <Activity className="w-4 h-4 text-blue-600" />
              Safety Detection Activity
            </h3>
            <span className="px-2 py-0.5 bg-blue-50 rounded text-xs font-semibold text-blue-700">Live</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={safetyDetectionData} barCategoryGap={16} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" stroke="#999" tick={{ fontSize: 11 }} />
              <YAxis stroke="#999" tick={{ fontSize: 11 }} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="ppe" fill="#ef4444" name="PPE Violations" />
              <Bar dataKey="zone" fill="#f59e0b" name="Zone Violations" />
              <Bar dataKey="fall" fill="#8b5cf6" name="Fall Risks" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <HardHat className="w-4 h-4 text-green-600" />
              PPE Compliance by Zone
            </h3>
            <span className="text-xs text-gray-400">Current rates</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={ppeComplianceData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="zone" stroke="#999" tick={{ fontSize: 11 }} />
              <YAxis domain={[90, 100]} stroke="#999" tick={{ fontSize: 11 }} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="compliance" fill="#10b981" radius={[6, 6, 0, 0]} name="Compliance %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Incident Types and Recent Alerts */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Safety Violation Distribution
          </h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={incidentTypes} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                  {incidentTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 flex-1">
              {incidentTypes.map((type, idx) => (
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
            <Shield className="w-4 h-4 text-blue-600" />
            Recent Safety Alerts
          </h3>
          <div className="space-y-2">
            {recentSafetyAlerts.map((alert, idx) => (
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
                    <span className="text-xs text-blue-600 font-medium">{alert.zone}</span>
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

      {/* Zone Status Overview */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-purple-600" />
          Zone Status Overview
        </h3>
        <div className="grid grid-cols-4 gap-3">
          {zoneStatus.map((zone, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800 text-xs">{zone.zone}</h4>
                <div className={`w-2.5 h-2.5 rounded-full ${
                  zone.status === 'safe' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                }`} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Workers</span>
                  <span className="font-bold text-gray-900">{zone.workers}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Cameras</span>
                  <span className="font-bold text-gray-900">{zone.cameras}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Compliance</span>
                  <span className={`font-bold ${zone.compliance >= 97 ? 'text-green-600' : 'text-amber-600'}`}>
                    {zone.compliance}%
                  </span>
                </div>
              </div>
              <div className={`mt-2 px-2 py-1 rounded text-xs font-semibold text-center ${
                zone.status === 'safe' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {zone.status === 'safe' ? '✓ All Safe' : '⚠ Needs Attention'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
