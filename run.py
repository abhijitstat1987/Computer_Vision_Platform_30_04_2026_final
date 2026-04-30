import os
import sys
import signal
import socket

# ── Fix: Ensure venv site-packages takes priority over conda ──
# The system PYTHONPATH puts C:\ProgramData\miniconda3\Lib\site-packages first,
# which has a broken tensorflow. Move venv site-packages to the front.
os.environ.pop("PYTHONPATH", None)
_venv_sp = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".venv", "Lib", "site-packages")
if _venv_sp in sys.path:
    sys.path.remove(_venv_sp)
sys.path.insert(1, _venv_sp)

# ── Fix: socket.getfqdn / gethostbyaddr hang on corporate Windows machines ──
# The standard library's HTTPServer.server_bind() calls socket.getfqdn(host)
# which triggers a blocking DNS reverse-lookup that never completes.
# We patch at BOTH Python and C-interop level.

# 1. Patch socket module functions
_orig_getfqdn = socket.getfqdn
def _fast_getfqdn(name=""):
    if name in ("", "0.0.0.0", "127.0.0.1"):
        return "localhost"
    try:
        return _orig_getfqdn(name)
    except Exception:
        return name or "localhost"
socket.getfqdn = _fast_getfqdn

_orig_gethostbyaddr = socket.gethostbyaddr
def _fast_gethostbyaddr(ip_address):
    if ip_address in ("0.0.0.0", "127.0.0.1"):
        return ("localhost", [], [ip_address])
    try:
        return _orig_gethostbyaddr(ip_address)
    except Exception:
        return (ip_address, [], [ip_address])
socket.gethostbyaddr = _fast_gethostbyaddr

# The socket-level patches above are sufficient — getfqdn/gethostbyaddr
# will return instantly for localhost addresses, preventing the hang.


from app import create_app
from app.realtime import socketio

app = create_app()

if __name__ == "__main__":
    signal.signal(signal.SIGINT, lambda *_: sys.exit(0))
    print("\nRegistered Flask routes:")
    for rule in app.url_map.iter_rules():
        print(rule)
    print("\nStarting Flask-SocketIO on http://127.0.0.1:5000 ...", flush=True)
    socketio.run(app, host="127.0.0.1", port=5100, debug=False, use_reloader=False)
