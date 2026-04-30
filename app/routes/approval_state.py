
from flask import Blueprint, request, jsonify
from app.models.approval_state import ApprovalRequest, ApprovalStep, ApprovalStatus
from datetime import datetime
from app.realtime import emit_approval_update

approval_state_bp = Blueprint('approval_state', __name__)

# In-memory store for demo; replace with DB in production
approval_requests = []

@approval_state_bp.route('/api/approval-requests', methods=['GET'])
def list_approval_requests():
    return jsonify([a.to_dict() for a in approval_requests])

@approval_state_bp.route('/api/approval-requests', methods=['POST'])
def create_approval_request():
    data = request.json or {}
    steps = [ApprovalStep(**step) for step in data.get('steps', [])]
    approval = ApprovalRequest(
        id=len(approval_requests)+1,
        flow_id=data.get('flow_id'),
        requested_by=data.get('requested_by'),
        steps=steps
    )
    approval_requests.append(approval)
    emit_approval_update(approval.to_dict())
    return jsonify(approval.to_dict()), 201

@approval_state_bp.route('/api/approval-requests/<int:approval_id>/advance', methods=['POST'])
def advance_approval_step(approval_id):
    data = request.json or {}
    approver = data.get('approver')
    approve = data.get('approve', True)
    comment = data.get('comment')
    for approval in approval_requests:
        if approval.id == approval_id:
            approval.advance_step(approver, approve, comment)
            emit_approval_update(approval.to_dict())
            return jsonify(approval.to_dict())
    return jsonify({'error': 'Approval request not found'}), 404
