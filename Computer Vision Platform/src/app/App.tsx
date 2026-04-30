import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/app/components/main-layout';
import { SafetyDashboard } from '@/app/components/safety-dashboard';
import { QualityDashboard } from '@/app/components/quality-dashboard';
import { Dashboard } from '@/app/components/dashboard';
import { HierarchyConfiguration } from '@/app/components/hierarchy-configuration';
import { ProjectManagement } from '@/app/components/project-management';
import { UseCaseManagement } from '@/app/components/use-case-management';
import { ConfigurationPage } from '@/app/components/configuration-page';
import { ModelDevelopment } from '@/app/components/model-development';
import { ModelDeployment } from '@/app/components/model-deployment';
import { CompleteWorkflowBuilder } from '@/app/components/complete-workflow-builder';
import { AnalyticsDashboard } from '@/app/components/analytics-dashboard';
import { AlertsPage } from '@/app/components/alerts-page';
import { ReportsPage } from '@/app/components/reports-page';
import { LabelingPlatform } from '@/app/components/labeling-platform';
import { LabelReview } from '@/app/components/label-review';
import { ModelBenchmark } from '@/app/components/model-benchmark';
import { AgentBuilder } from '@/app/components/agent-builder';
import { AIChatbot } from '@/app/components/ai-chatbot';
import { AgenticAutomation } from '@/app/components/agentic-automation';
import ApprovalAuditPage from '@/app/components/approval-audit-page';

export default function App() {
  const [activeVision, setActiveVision] = useState<'safety' | 'quality'>('safety');

  return (
    <Router>
      <div className="h-screen overflow-hidden">
        <MainLayout activeVision={activeVision} onVisionChange={setActiveVision}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route 
              path="/dashboard" 
              element={
                activeVision === 'safety' ? <SafetyDashboard /> : <QualityDashboard />
              } 
            />
            <Route path="/overview" element={<Dashboard />} />
            <Route path="/hierarchy" element={<HierarchyConfiguration />} />
            <Route path="/projects" element={<ProjectManagement />} />
            <Route path="/projects/:projectId/use-cases" element={<UseCaseManagement />} />
            <Route path="/projects/:projectId/use-cases/:useCaseId/workflows" element={<CompleteWorkflowBuilder />} />
            <Route path="/labeling" element={<LabelingPlatform />} />
            <Route path="/label-review" element={<LabelReview />} />
            <Route path="/model-benchmark" element={<ModelBenchmark />} />
            <Route path="/configuration/*" element={<ConfigurationPage />} />
            <Route path="/model-development" element={<ModelDevelopment />} />
            <Route path="/model-deployment" element={<ModelDeployment />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/chatbot" element={<AIChatbot />} />
            <Route path="/agent" element={<AgentBuilder />} />
            <Route path="/agentic-automation" element={<AgenticAutomation />} />
            <Route path="/approvals" element={<ApprovalAuditPage />} />
          </Routes>
        </MainLayout>
      </div>
    </Router>
  );

}