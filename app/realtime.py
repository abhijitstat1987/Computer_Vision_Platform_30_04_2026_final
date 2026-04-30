from flask_socketio import SocketIO, emit

socketio = SocketIO(cors_allowed_origins="*")

# Example event for approval updates
def emit_approval_update(approval_data):
    socketio.emit('approval_update', approval_data, broadcast=True)

# Example event for knowledge graph updates
def emit_graph_update(graph_data):
    socketio.emit('graph_update', graph_data, broadcast=True)
