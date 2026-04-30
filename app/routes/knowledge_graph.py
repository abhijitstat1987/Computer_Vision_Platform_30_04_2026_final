
from flask import Blueprint, request, jsonify
from app.models.knowledge_graph import KnowledgeGraph, GraphNode, GraphEdge
from app.realtime import emit_graph_update

knowledge_graph_bp = Blueprint('knowledge_graph', __name__)

# In-memory graph for demo; replace with DB in production
graph = KnowledgeGraph()

# Example: Add demo nodes/edges on startup
def _init_demo_graph():
    if not graph.nodes:
        graph.add_node(GraphNode(id="agent1", type="agent", label="Agent 1"))
        graph.add_node(GraphNode(id="flow1", type="flow", label="Flow 1"))
        graph.add_node(GraphNode(id="approval1", type="approval", label="Approval 1"))
        graph.add_edge(GraphEdge(source="agent1", target="flow1", relation="triggers"))
        graph.add_edge(GraphEdge(source="flow1", target="approval1", relation="requires_approval"))
_init_demo_graph()

@knowledge_graph_bp.route('/api/knowledge-graph', methods=['GET'])
def get_graph():
    return jsonify(graph.to_dict())

@knowledge_graph_bp.route('/api/knowledge-graph/nodes', methods=['POST'])
def add_node():
    data = request.json or {}
    node = GraphNode(id=data['id'], type=data['type'], label=data['label'], data=data.get('data', {}))
    graph.add_node(node)
    emit_graph_update(graph.to_dict())
    return jsonify(node.to_dict()), 201

@knowledge_graph_bp.route('/api/knowledge-graph/edges', methods=['POST'])
def add_edge():
    data = request.json or {}
    edge = GraphEdge(source=data['source'], target=data['target'], relation=data['relation'], data=data.get('data', {}))
    graph.add_edge(edge)
    emit_graph_update(graph.to_dict())
    return jsonify(edge.to_dict()), 201

@knowledge_graph_bp.route('/api/knowledge-graph/lineage/<node_id>', methods=['GET'])
def get_lineage(node_id):
    max_depth = int(request.args.get('max_depth', 3))
    return jsonify(graph.find_lineage(node_id, max_depth))
