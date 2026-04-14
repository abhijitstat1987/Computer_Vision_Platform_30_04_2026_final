import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock, Filter, Loader2, X } from 'lucide-react';
import { alertsService, Alert } from '../../services/alerts';

export function AlertsPage() {
  const [alerts, setAlerts]           = useState<Alert[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [filterType, setFilterType]   = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => { fetchAlerts(); }, []);

  async function fetchAlerts() {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      const data = await alertsService.list(params as any);
      setAlerts(Array.isArray(data) ? data : []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleAcknowledge(id: number) {
    try {
      const updated = await alertsService.update(id, { status: 'acknowledged' });
      setAlerts(prev => prev.map(a => a.id === updated.id ? updated : a));
    } catch (e: any) { setError(e.message); }
  }

  async function handleResolve(id: number) {
    try {
      const updated = await alertsService.update(id, { status: 'resolved' });
      setAlerts(prev => prev.map(a => a.id === updated.id ? updated : a));
    } catch (e: any) { setError(e.message); }
  }

  // Map backend status "unresolved" → display "active"
  const displayStatus = (status: string) => status === 'unresolved' ? 'active' : status;

  // Infer severity from alert_type for icon/color purposes
  const getSeverity = (alertType: string) => {
    const t = alertType.toLowerCase();
    if (t.includes('critical') || t.includes('emergency') || t.includes('ppe') || t.includes('fall')) return 'critical';
    if (t.includes('warning') || t.includes('zone') || t.includes('hazard')) return 'warning';
    return 'info';
  };

  const filteredAlerts = alerts.filter(alert => {
    const severity = getSeverity(alert.alert_type);
    if (filterType !== 'all' && severity !== filterType) return false;
    const ds = displayStatus(alert.status);
    if (filterStatus !== 'all' && ds !== filterStatus) return false;
    return true;
  });

  const getAlertIcon = (alertType: string) => {
    const severity = getSeverity(alertType);
    switch (severity) {
      case 'critical': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':  return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:         return <CheckCircle className="w-5 h-5 text-blue-600" />;
    }
  };

  const getAlertBadgeColor = (alertType: string) => {
    const severity = getSeverity(alertType);
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700';
      case 'warning':  return 'bg-yellow-100 text-yellow-700';
      default:         return 'bg-blue-100 text-blue-700';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const ds = displayStatus(status);
    switch (ds) {
      case 'active':       return 'bg-red-100 text-red-700';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-700';
      case 'resolved':     return 'bg-green-100 text-green-700';
      default:             return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-gray-500">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading alerts...
    </div>
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between">
          {error}<button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-gray-900">Alert Management</h2>
        <p className="text-gray-600">Monitor and manage system alerts across all projects</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {alerts.filter(a => getSeverity(a.alert_type) === 'critical').length}
              </div>
              <div className="text-sm text-gray-600">Critical</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {alerts.filter(a => getSeverity(a.alert_type) === 'warning').length}
              </div>
              <div className="text-sm text-gray-600">Warning</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {alerts.filter(a => getSeverity(a.alert_type) === 'info').length}
              </div>
              <div className="text-sm text-gray-600">Info</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {alerts.filter(a => a.status === 'resolved').length}
              </div>
              <div className="text-sm text-gray-600">Resolved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <div className="flex gap-4 flex-1">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Types</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <button onClick={fetchAlerts} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            Refresh
          </button>
        </div>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 && (
        <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-lg">
          No alerts match the current filters.
        </div>
      )}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => (
          <div key={alert.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="pt-1">{getAlertIcon(alert.alert_type)}</div>

              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-semibold">{alert.message}</h4>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getAlertBadgeColor(alert.alert_type)}`}>
                        {getSeverity(alert.alert_type)}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadgeColor(alert.status)}`}>
                        {displayStatus(alert.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">#{alert.id} • Camera #{alert.camera_id} • {alert.alert_type}</p>
                  </div>
                  <div className="flex gap-2">
                    {alert.status === 'unresolved' && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Acknowledge
                      </button>
                    )}
                    {alert.status === 'acknowledged' && (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {alert.created_at}
                  </div>
                  {alert.event_id && <span>Event #{alert.event_id}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
