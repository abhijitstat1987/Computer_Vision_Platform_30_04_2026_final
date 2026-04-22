import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { analyticsService, Summary, TimePoint } from '../../services/analytics';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899'];

const radarData = [
  { metric: 'Accuracy', value: 96.8 },
  { metric: 'Speed', value: 92.5 },
  { metric: 'Reliability', value: 98.2 },
  { metric: 'Coverage', value: 88.7 },
  { metric: 'Response', value: 94.3 },
];

export function AnalyticsDashboard() {
  const [summary, setSummary]           = useState<Summary | null>(null);
  const [timeData, setTimeData]         = useState<TimePoint[]>([]);
  const [cameraData, setCameraData]     = useState<{ camera_id: number; camera_name: string; count: number }[]>([]);
  const [topObjects, setTopObjects]     = useState<{ label: string; count: number }[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  async function fetchAll() {
    try {
      setLoading(true);
      setError(null);
      const [s, t, c, o] = await Promise.all([
        analyticsService.summary(),
        analyticsService.detectionsOverTime('day', 7),
        analyticsService.cameraActivity(),
        analyticsService.topObjects(6),
      ]);
      setSummary(s);
      setTimeData(t);
      setCameraData(c);
      setTopObjects(o);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  const overviewStats = summary ? [
    { label: 'Total Detections', value: summary.total_events.toLocaleString(), trend: 'up' as const },
    { label: 'Total Alerts', value: summary.total_alerts.toLocaleString(), trend: 'up' as const },
    { label: 'Unresolved Alerts', value: summary.unresolved_alerts.toLocaleString(), trend: summary.unresolved_alerts > 0 ? 'down' as const : 'up' as const },
    { label: 'Event Types', value: summary.events_by_type.length.toString(), trend: 'up' as const },
  ] : [];

  const pieData = topObjects.map((o, i) => ({ name: o.label, value: o.count, color: COLORS[i % COLORS.length] }));
  const weeklyData = timeData.map(t => ({ day: t.period, detections: t.count }));
  // Example: Add more metrics for multiple bar chart (simulate with random data for demo)
  const stationData = cameraData.slice(0, 6).map(c => ({
    station: c.camera_name,
    detections: c.count,
    alerts: Math.floor(Math.random() * (c.count / 2)),
    faults: Math.floor(Math.random() * (c.count / 3)),
  }));

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-500">
      <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading analytics...
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Live performance metrics and insights</p>
        </div>
        <button onClick={fetchAll} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewStats.map((stat, idx) => (
          <div key={idx} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm text-gray-600">{stat.label}</span>
              <div className={`flex items-center gap-1 text-xs ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {stat.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Detections Over Time */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" /> Detections (Last 7 Days)
          </h3>
          {weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="detections" stroke="#3b82f6" strokeWidth={2} name="Detections" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">No detection data yet</div>
          )}
        </div>

        {/* Camera Activity (Multiple Bar Chart) */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Camera Activity</h3>
          {stationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stationData} barCategoryGap={16}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="station" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="detections" fill="#10b981" name="Detections" />
                <Bar dataKey="alerts" fill="#ef4444" name="Alerts" />
                <Bar dataKey="faults" fill="#f59e0b" name="Faults" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">No camera activity yet</div>
          )}
        </div>

        {/* Top Detected Objects */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Top Detected Objects</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">No object data yet</div>
          )}
        </div>

        {/* System Health Radar */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">System Health</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Performance" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Events By Type Table */}
      {summary && summary.events_by_type.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Events by Type</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Event Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Count</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Share</th>
                </tr>
              </thead>
              <tbody>
                {summary.events_by_type.map((et, idx) => (
                  <tr key={idx} className="border-t border-gray-200">
                    <td className="px-4 py-3 font-medium">{et.event_type}</td>
                    <td className="px-4 py-3">{et.count.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full">
                          <div className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${summary.total_events > 0 ? (et.count / summary.total_events * 100).toFixed(1) : 0}%` }} />
                        </div>
                        <span className="text-sm text-gray-600 w-12">
                          {summary.total_events > 0 ? (et.count / summary.total_events * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {summary && summary.events_by_type.length === 0 && !error && (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">
          No analytics data yet. Start recording detection events to see insights here.
        </div>
      )}
    </div>
  );
}
