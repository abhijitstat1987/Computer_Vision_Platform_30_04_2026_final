import { useState } from 'react';
import { FileText, Download, Calendar, TrendingUp, Eye, Trash2, X, Save, Filter, BarChart3, PieChart, Users, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';

interface Report {
  id: string;
  name: string;
  type: 'Safety' | 'Quality' | 'Performance' | 'Incident' | 'Technical';
  project: string;
  period: string;
  status: 'completed' | 'generating' | 'scheduled';
  generatedDate: string;
  size: string;
}

const initialReports: Report[] = [
  { id: 'RPT-001', name: 'Weekly Safety Report', type: 'Safety', project: 'Manufacturing Plant A', period: 'Jan 20 - Jan 27, 2024', status: 'completed', generatedDate: '2024-01-27', size: '2.4 MB' },
  { id: 'RPT-002', name: 'Monthly Quality Metrics', type: 'Quality', project: 'All Projects', period: 'December 2023', status: 'completed', generatedDate: '2024-01-05', size: '5.1 MB' },
  { id: 'RPT-003', name: 'Station Performance Analysis', type: 'Performance', project: 'Manufacturing Plant B', period: 'Q4 2023', status: 'completed', generatedDate: '2024-01-10', size: '3.8 MB' },
  { id: 'RPT-004', name: 'Incident Summary Report', type: 'Incident', project: 'All Projects', period: 'January 2024', status: 'generating', generatedDate: '-', size: '-' },
  { id: 'RPT-005', name: 'Model Accuracy Report', type: 'Technical', project: 'All Projects', period: 'Jan 1 - Jan 27, 2024', status: 'scheduled', generatedDate: 'Jan 31, 2024', size: '-' },
];

const reportTemplates = [
  { name: 'Daily Safety Summary', frequency: 'Daily', recipients: 'Safety Team' },
  { name: 'Weekly Performance Report', frequency: 'Weekly', recipients: 'Management' },
  { name: 'Monthly Analytics', frequency: 'Monthly', recipients: 'All Stakeholders' },
  { name: 'Quarterly Review', frequency: 'Quarterly', recipients: 'Executive Team' },
];

const projectStats = [
  { project: 'Manufacturing Plant A', stations: 12, alerts: 145, incidents: 28, accuracy: '96.5%' },
  { project: 'Manufacturing Plant B', stations: 8, alerts: 98, incidents: 18, accuracy: '95.2%' },
  { project: 'Quality Control', stations: 6, alerts: 67, incidents: 12, accuracy: '98.1%' },
  { project: 'Assembly Line D', stations: 5, alerts: 52, incidents: 9, accuracy: '94.8%' },
];

const areaStats = [
  { area: 'Zone A', detections: 45280, alerts: 128, efficiency: '94.2%' },
  { area: 'Zone B', detections: 38150, alerts: 96, efficiency: '96.8%' },
  { area: 'Zone C', detections: 52340, alerts: 145, efficiency: '92.5%' },
  { area: 'Zone D', detections: 28450, alerts: 74, efficiency: '95.3%' },
];

const chartData = projectStats.map(p => ({
  name: p.project.split(' ').slice(-1)[0],
  alerts: p.alerts,
  incidents: p.incidents,
}));

const pieData = [
  { name: 'Safety', value: 35, color: '#3b82f6' },
  { name: 'Quality', value: 25, color: '#10b981' },
  { name: 'Performance', value: 20, color: '#f59e0b' },
  { name: 'Incident', value: 15, color: '#ef4444' },
  { name: 'Technical', value: 5, color: '#8b5cf6' },
];

export function ReportsPage() {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [isNewReportModalOpen, setIsNewReportModalOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState('all');
  const [newReportName, setNewReportName] = useState('');
  const [newReportType, setNewReportType] = useState<Report['type']>('Safety');
  const [newReportProject, setNewReportProject] = useState('');
  const [newReportPeriod, setNewReportPeriod] = useState('');

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
      case 'generating':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
      case 'scheduled':
        return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'Safety':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Quality':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Performance':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Incident':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'Technical':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleDownloadReport = (report: Report) => {
    alert(`Downloading ${report.name}...`);
  };

  const handleViewReport = (report: Report) => {
    alert(`Opening ${report.name} in viewer...`);
  };

  const handleDeleteReport = (reportId: string) => {
    if (confirm('Are you sure you want to delete this report?')) {
      setReports(reports.filter(r => r.id !== reportId));
    }
  };

  const handleGenerateReport = () => {
    if (!newReportName.trim()) return;

    const newReport: Report = {
      id: `RPT-${String(reports.length + 1).padStart(3, '0')}`,
      name: newReportName,
      type: newReportType,
      project: newReportProject || 'All Projects',
      period: newReportPeriod || 'Current Period',
      status: 'generating',
      generatedDate: '-',
      size: '-',
    };

    setReports([newReport, ...reports]);
    setIsNewReportModalOpen(false);
    setNewReportName('');
    setNewReportType('Safety');
    setNewReportProject('');
    setNewReportPeriod('');

    // Simulate report generation
    setTimeout(() => {
      setReports(prev => prev.map(r => 
        r.id === newReport.id 
          ? { ...r, status: 'completed' as const, generatedDate: new Date().toISOString().split('T')[0], size: '3.2 MB' }
          : r
      ));
    }, 3000);
  };

  const filteredReports = selectedReportType === 'all' 
    ? reports 
    : reports.filter(r => r.type.toLowerCase() === selectedReportType);

  return (
    <div className="space-y-6">
      {/* Header with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 shadow-2xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Reports & Analytics</h2>
              <p className="text-blue-100">Comprehensive insights across projects, stations, and operational areas</p>
            </div>
            <button 
              onClick={() => setIsNewReportModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <FileText className="w-5 h-5" />
              <span className="font-semibold">Generate Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <FileText className="w-7 h-7" />
            </div>
            <TrendingUp className="w-6 h-6 opacity-70" />
          </div>
          <div className="text-4xl font-bold mb-1">{reports.length}</div>
          <div className="text-blue-100 text-sm font-medium">Total Reports</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Building2 className="w-7 h-7" />
            </div>
            <TrendingUp className="w-6 h-6 opacity-70" />
          </div>
          <div className="text-4xl font-bold mb-1">4</div>
          <div className="text-green-100 text-sm font-medium">Active Projects</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <BarChart3 className="w-7 h-7" />
            </div>
            <TrendingUp className="w-6 h-6 opacity-70" />
          </div>
          <div className="text-4xl font-bold mb-1">31</div>
          <div className="text-purple-100 text-sm font-medium">Monitoring Stations</div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Users className="w-7 h-7" />
            </div>
            <TrendingUp className="w-6 h-6 opacity-70" />
          </div>
          <div className="text-4xl font-bold mb-1">4</div>
          <div className="text-amber-100 text-sm font-medium">Coverage Areas</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Alerts & Incidents by Project
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                }}
              />
              <Bar dataKey="alerts" fill="url(#alertGradient)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="incidents" fill="url(#incidentGradient)" radius={[8, 8, 0, 0]} />
              <defs>
                <linearGradient id="alertGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#60a5fa" />
                </linearGradient>
                <linearGradient id="incidentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#f87171" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <PieChart className="w-6 h-6 text-purple-600" />
            Reports by Category
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <RePieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}
              >
                {pieData.map((entry, index) => (
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
            </RePieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-3 bg-white rounded-xl p-2 shadow-md border border-gray-100">
        <Filter className="w-5 h-5 text-gray-400 ml-2" />
        <button
          onClick={() => setSelectedReportType('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            selectedReportType === 'all'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          All Reports
        </button>
        {['Safety', 'Quality', 'Performance', 'Incident', 'Technical'].map((type) => (
          <button
            key={type}
            onClick={() => setSelectedReportType(type.toLowerCase())}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedReportType === type.toLowerCase()
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Generated Reports */}
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <FileText className="w-7 h-7 text-blue-600" />
          Generated Reports ({filteredReports.length})
        </h3>
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <div key={report.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 border border-gray-100 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5 flex-1">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <FileText className="w-8 h-8 text-white" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h4 className="text-lg font-bold text-gray-800">{report.name}</h4>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(report.status)} shadow-md`}>
                        {report.status}
                      </span>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getTypeBadgeColor(report.type)}`}>
                        {report.type}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 block mb-1">Report ID</span>
                        <span className="font-semibold text-gray-800">{report.id}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-1">Project</span>
                        <span className="font-semibold text-gray-800">{report.project}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-1">Period</span>
                        <span className="font-semibold text-gray-800">{report.period}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-1">Generated</span>
                        <span className="font-semibold text-gray-800">{report.generatedDate}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-1">File Size</span>
                        <span className="font-semibold text-gray-800">{report.size}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {report.status === 'completed' && (
                    <>
                      <button 
                        onClick={() => handleViewReport(report)}
                        className="p-3 hover:bg-blue-50 rounded-xl transition-all text-blue-600"
                        title="View Report"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDownloadReport(report)}
                        className="p-3 hover:bg-green-50 rounded-xl transition-all text-green-600"
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteReport(report.id)}
                        className="p-3 hover:bg-red-50 rounded-xl transition-all text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  {report.status === 'generating' && (
                    <div className="px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                        <span className="font-medium">Processing...</span>
                      </div>
                    </div>
                  )}
                  {report.status === 'scheduled' && (
                    <div className="px-4 py-2 text-sm text-amber-600 bg-amber-50 rounded-xl font-medium">
                      Scheduled
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Statistics Tables */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Project Stats */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              Statistics by Project
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {projectStats.map((project, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-all">
                  <div className="font-bold text-gray-800 mb-3">{project.project}</div>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Stations</div>
                      <div className="font-bold text-blue-600">{project.stations}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Alerts</div>
                      <div className="font-bold text-amber-600">{project.alerts}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Incidents</div>
                      <div className="font-bold text-red-600">{project.incidents}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Accuracy</div>
                      <div className="font-bold text-green-600">{project.accuracy}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Area Stats */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Statistics by Area
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {areaStats.map((area, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-all">
                  <div className="font-bold text-gray-800 mb-3">{area.area}</div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Detections</div>
                      <div className="font-bold text-blue-600">{area.detections.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Alerts</div>
                      <div className="font-bold text-amber-600">{area.alerts}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Efficiency</div>
                      <div className="font-bold text-green-600">{area.efficiency}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled Reports */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Scheduled Reports
          </h3>
        </div>
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            {reportTemplates.map((template, idx) => (
              <div key={idx} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 hover:shadow-md transition-all border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-gray-800">{template.name}</div>
                  <span className="px-3 py-1 text-xs font-semibold bg-white rounded-full text-purple-600 border border-purple-200">
                    {template.frequency}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  <Users className="w-4 h-4 inline mr-1" />
                  {template.recipients}
                </div>
                <button className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-medium">
                  Configure Schedule
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New Report Modal */}
      {isNewReportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Generate New Report</h3>
              <button onClick={() => setIsNewReportModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Report Name *</label>
                <input
                  type="text"
                  value={newReportName}
                  onChange={(e) => setNewReportName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="Enter report name"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Report Type *</label>
                <select
                  value={newReportType}
                  onChange={(e) => setNewReportType(e.target.value as Report['type'])}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                >
                  <option value="Safety">Safety Report</option>
                  <option value="Quality">Quality Report</option>
                  <option value="Performance">Performance Report</option>
                  <option value="Incident">Incident Report</option>
                  <option value="Technical">Technical Report</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Project</label>
                <input
                  type="text"
                  value={newReportProject}
                  onChange={(e) => setNewReportProject(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="All Projects"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Period</label>
                <input
                  type="text"
                  value={newReportPeriod}
                  onChange={(e) => setNewReportPeriod(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="e.g., January 2024"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleGenerateReport}
                disabled={!newReportName.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-5 h-5 inline mr-2" />
                Generate Report
              </button>
              <button
                onClick={() => { setIsNewReportModalOpen(false); setNewReportName(''); }}
                className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
