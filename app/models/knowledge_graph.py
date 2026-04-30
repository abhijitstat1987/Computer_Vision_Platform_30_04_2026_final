from typing import List, Dict, Any
from datetime import datetime

class GraphNode:
    def __init__(self, id: str, type: str, label: str, data: Dict[str, Any] = None):
        self.id = id
        self.type = type  # agent, flow, approval, etc.
        self.label = label
        self.data = data or {}

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "label": self.label,
            "data": self.data
        }

class GraphEdge:
    def __init__(self, source: str, target: str, relation: str, data: Dict[str, Any] = None):
        self.source = source
        self.target = target
        self.relation = relation  # e.g., "triggers", "depends_on", "approved_by"
        self.data = data or {}

    def to_dict(self):
        return {
            "source": self.source,
            "target": self.target,
            "relation": self.relation,
            "data": self.data
        }

class KnowledgeGraph:
    def __init__(self):
        self.nodes: List[GraphNode] = []
        self.edges: List[GraphEdge] = []

    def add_node(self, node: GraphNode):
        self.nodes.append(node)

    def add_edge(self, edge: GraphEdge):
        self.edges.append(edge)

    def to_dict(self):
        return {
            "nodes": [n.to_dict() for n in self.nodes],
            "edges": [e.to_dict() for e in self.edges]
        }

    def find_lineage(self, node_id: str, max_depth: int = 3):
        # Simple BFS for lineage
        visited = set()
        queue = [(node_id, 0)]
        lineage_nodes = set([node_id])
        lineage_edges = []
        while queue:
            current, depth = queue.pop(0)
            if depth >= max_depth:
                continue
            for edge in self.edges:
                if edge.source == current and edge.target not in visited:
                    lineage_nodes.add(edge.target)
                    lineage_edges.append(edge)
                    queue.append((edge.target, depth+1))
                elif edge.target == current and edge.source not in visited:
                    lineage_nodes.add(edge.source)
                    lineage_edges.append(edge)
                    queue.append((edge.source, depth+1))
            visited.add(current)
        return {
            "nodes": [n.to_dict() for n in self.nodes if n.id in lineage_nodes],
            "edges": [e.to_dict() for e in lineage_edges]
        }
