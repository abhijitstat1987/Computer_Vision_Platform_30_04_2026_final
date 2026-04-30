
import React, { useEffect, useState } from "react";
import { onApprovalUpdate, disconnectSocket } from "../utils/realtime";

interface Approval {
  id: number;
  flow_id: number;
  requested_by: string;
  status: string;
  approved_by?: string;
  requested_at: string;
  decided_at?: string;
  reason?: string;
}

interface AuditLog {
  id: number;
  flow_id: number;
  action: string;
  user: string;
  timestamp: string;
  details?: string;
}

const ApprovalAuditPage: React.FC = () => {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovals();
    fetchAuditLogs();
    // Real-time approval updates
    const handleRealtime = (data: any) => {
      fetchApprovals();
      if (selectedFlowId) fetchAuditLogs(selectedFlowId);
    };
    onApprovalUpdate(handleRealtime);
    return () => {
      disconnectSocket();
    };
  }, [selectedFlowId]);

  const fetchApprovals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/approvals");
      const data = await res.json();
      setApprovals(data);
    } catch (err) {
      setError("Failed to fetch approvals");
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async (flowId?: number) => {
    setLoading(true);
    setError(null);
    try {
      let url = "/api/audit_logs";
      if (flowId) url += `?flow_id=${flowId}`;
      const res = await fetch(url);
      const data = await res.json();
      setAuditLogs(data);
    } catch (err) {
      setError("Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFlow = (flowId: number) => {
    setSelectedFlowId(flowId);
    fetchAuditLogs(flowId);
  };

  const handleApprove = async (approvalId: number) => {
    setLoading(true);
    setError(null);
    try {
      await fetch(`/api/approvals/${approvalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved", approved_by: "admin" })
      });
      fetchApprovals();
      if (selectedFlowId) fetchAuditLogs(selectedFlowId);
    } catch (err) {
      setError("Failed to approve");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (approvalId: number) => {
    setLoading(true);
    setError(null);
    try {
      await fetch(`/api/approvals/${approvalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", approved_by: "admin" })
      });
      fetchApprovals();
      if (selectedFlowId) fetchAuditLogs(selectedFlowId);
    } catch (err) {
      setError("Failed to reject");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Approval & Audit</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <div className="flex gap-8">
        <div className="w-1/2">
          <h3 className="font-semibold mb-2">Pending Approvals</h3>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <table className="min-w-full border">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Flow</th>
                  <th>Requested By</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((a) => (
                  <tr key={a.id} className={a.status === "pending" ? "bg-yellow-50" : ""}>
                    <td>{a.id}</td>
                    <td>
                      <button className="underline text-blue-600" onClick={() => handleSelectFlow(a.flow_id)}>
                        {a.flow_id}
                      </button>
                    </td>
                    <td>{a.requested_by}</td>
                    <td>{a.status}</td>
                    <td>
                      {a.status === "pending" && (
                        <>
                          <button className="px-2 py-1 bg-green-500 text-white rounded mr-2" onClick={() => handleApprove(a.id)}>
                            Approve
                          </button>
                          <button className="px-2 py-1 bg-red-500 text-white rounded" onClick={() => handleReject(a.id)}>
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="w-1/2">
          <h3 className="font-semibold mb-2">Audit Log {selectedFlowId && `(Flow ${selectedFlowId})`}</h3>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <table className="min-w-full border">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Timestamp</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.id}</td>
                    <td>{log.action}</td>
                    <td>{log.user}</td>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalAuditPage;
