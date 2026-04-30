from flask import Blueprint, request, jsonify
from app.models.agentic_flow import AgenticFlow, AgenticFlowStep
from datetime import datetime

agentic_flows_bp = Blueprint('agentic_flows', __name__)

# In-memory store for demo; replace with DB in production
agentic_flows = []

@agentic_flows_bp.route('/api/agentic-flows', methods=['GET'])
def list_flows():
    return jsonify([f.to_dict() for f in agentic_flows])

@agentic_flows_bp.route('/api/agentic-flows', methods=['POST'])
def create_flow():
    data = request.json or {}
    steps = [AgenticFlowStep(id=i+1, **step) for i, step in enumerate(data.get('steps', []))]
    flow = AgenticFlow(
        id=len(agentic_flows)+1,
        name=data.get('name', f'Flow {len(agentic_flows)+1}'),
        created_by=data.get('created_by', 'user'),
        steps=steps
    )
    agentic_flows.append(flow)
    return jsonify(flow.to_dict()), 201

@agentic_flows_bp.route('/api/agentic-flows/<int:flow_id>/execute', methods=['POST'])
def execute_flow(flow_id):
    for flow in agentic_flows:
        if flow.id == flow_id:
            next_steps = flow.get_next_steps()
            for step in next_steps:
                # Simulate step execution
                if step.type == 'approval':
                    step.status = 'waiting_approval'
                else:
                    step.status = 'completed'
                    step.result = {"output": f"Step {step.name} completed"}
            flow.updated_at = datetime.utcnow()
            flow.status = flow._compute_flow_status()
            return jsonify(flow.to_dict())
    return jsonify({'error': 'Flow not found'}), 404

@agentic_flows_bp.route('/api/agentic-flows/<int:flow_id>/step/<int:step_id>/approve', methods=['POST'])
def approve_step(flow_id, step_id):
    for flow in agentic_flows:
        if flow.id == flow_id:
            flow.update_step_status(step_id, 'completed', {"output": "Approved"})
            return jsonify(flow.to_dict())
    return jsonify({'error': 'Flow or step not found'}), 404
