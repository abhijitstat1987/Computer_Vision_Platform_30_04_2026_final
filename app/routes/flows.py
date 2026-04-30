from flask import Blueprint, request, jsonify
from app.models import db_config

flows_bp = Blueprint('flows', __name__)

# In-memory store for demo (replace with DB in production)
flows = []

@flows_bp.route('/flows', methods=['GET'])
def get_flows():
    return jsonify(flows)

@flows_bp.route('/flows', methods=['POST'])
def create_flow():
    data = request.json
    flow = {
        'id': data.get('id'),
        'name': data.get('name'),
        'steps': data.get('steps', []),
        'comments': data.get('comments', []),
    }
    flows.append(flow)
    return jsonify(flow), 201

@flows_bp.route('/flows/<int:flow_id>', methods=['PUT'])
def update_flow(flow_id):
    data = request.json
    for flow in flows:
        if flow['id'] == flow_id:
            flow['name'] = data.get('name', flow['name'])
            flow['steps'] = data.get('steps', flow['steps'])
            flow['comments'] = data.get('comments', flow['comments'])
            return jsonify(flow)
    return jsonify({'error': 'Flow not found'}), 404

@flows_bp.route('/flows/<int:flow_id>', methods=['DELETE'])
def delete_flow(flow_id):
    global flows
    flows = [f for f in flows if f['id'] != flow_id]
    return '', 204
