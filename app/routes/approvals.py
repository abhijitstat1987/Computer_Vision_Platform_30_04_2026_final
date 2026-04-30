
from flask import Blueprint, request, jsonify
from app.models.approval import Approval, AuditLog
from datetime import datetime

approvals_bp = Blueprint('approvals', __name__)

# In-memory stores (replace with DB in production)
approvals = []
audit_logs = []

# --- Approval Endpoints ---
@approvals_bp.route('/api/approvals', methods=['GET'])
def list_approvals():
    return jsonify([a.to_dict() for a in approvals])

@approvals_bp.route('/api/approvals', methods=['POST'])
def create_approval():
    data = request.json or {}
    approval = Approval(
        id=len(approvals)+1,
        flow_id=data.get('flow_id'),
        requested_by=data.get('requested_by'),
        status="pending"
    )
    approvals.append(approval)
    audit_logs.append(AuditLog(
        id=len(audit_logs)+1,
        flow_id=approval.flow_id,
        action="approval_requested",
        user=approval.requested_by
    ))
    return jsonify(approval.to_dict()), 201

@approvals_bp.route('/api/approvals/<int:approval_id>', methods=['PATCH'])
def update_approval(approval_id):
    data = request.json or {}
    for approval in approvals:
        if approval.id == approval_id:
            approval.status = data.get('status', approval.status)
            approval.approved_by = data.get('approved_by', approval.approved_by)
            approval.decided_at = datetime.utcnow()
            approval.reason = data.get('reason', approval.reason)
            audit_logs.append(AuditLog(
                id=len(audit_logs)+1,
                flow_id=approval.flow_id,
                action=f"approval_{approval.status}",
                user=approval.approved_by or approval.requested_by,
                details=approval.reason
            ))
            return jsonify(approval.to_dict())
    return jsonify({"error": "Approval not found"}), 404

# --- Audit Log Endpoints ---
@approvals_bp.route('/api/audit_logs', methods=['GET'])
def list_audit_logs():
    flow_id = request.args.get('flow_id')
    if flow_id:
        filtered = [a.to_dict() for a in audit_logs if str(a.flow_id) == str(flow_id)]
        return jsonify(filtered)
    return jsonify([a.to_dict() for a in audit_logs])
