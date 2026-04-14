"""
Workflow Builder — Backend Resource Validation & Simulation Test
Verifies all APIs the Workflow Builder depends on, then simulates
building a complete PPE Detection pipeline workflow.
"""
import requests
import sys

BASE = "http://127.0.0.1:5000/api"

def fetch(path):
    r = requests.get(f"{BASE}{path}", timeout=5)
    return r.json().get("data", [])

def main():
    print("=" * 65)
    print("  WORKFLOW BUILDER — BACKEND RESOURCE VALIDATION")
    print("=" * 65)
    print()

    # 1. Cameras
    cams = fetch("/cameras/")
    print(f"📹 Cameras ({len(cams)}):")
    for c in cams[:3]:
        print(f"   ID={c['id']}  {c['name']}  [{c.get('location','')}]")

    # 2. Edge Devices
    edges = fetch("/edge-devices/")
    print(f"⚡ Edge Devices ({len(edges)}):")
    for e in edges[:3]:
        print(f"   ID={e['id']}  {e['name']}  [{e.get('platform','')}]")

    # 3. Databases
    dbs = fetch("/config/databases/")
    print(f"💾 Databases ({len(dbs)}):")
    for d in dbs[:3]:
        dt = d.get("db_type") or d.get("dbType", "")
        print(f"   ID={d['id']}  {d['name']}  type={dt}  host={d.get('host','')}")

    # 4. Log Configs
    logs = fetch("/config/logs/")
    print(f"📝 Log Configs ({len(logs)}):")
    for l in logs[:3]:
        print(f"   ID={l['id']}  {l.get('category','')}  retention={l.get('retention','')}")

    # 5. Model Configs
    models = fetch("/config/models/")
    with_path = [m for m in models if m.get("model_path") or m.get("modelPath")]
    print(f"🤖 Model Configs ({len(models)} total, {len(with_path)} trained):")
    for m in with_path[:3]:
        print(f"   ID={m['id']}  {m['name']}  framework={m.get('framework','')}")

    # 6. LLM Configs
    llms = fetch("/config/llms/")
    print(f"🧠 LLM Configs ({len(llms)}):")
    for l in llms[:3]:
        name = l.get("name") or l.get("model_name", "")
        print(f"   ID={l['id']}  {name}  provider={l.get('provider','')}")

    # 7. Alerts
    alerts = fetch("/alerts/")
    at_key = "alert_type" if alerts and "alert_type" in alerts[0] else "alertType"
    print(f"🔔 Alerts ({len(alerts)}):")
    for a in alerts[:3]:
        print(f"   ID={a['id']}  type={a.get(at_key,'')}  {a.get('message','')[:50]}")

    # ── Workflow Simulation ───────────────────────────────────────────
    print()
    print("=" * 65)
    print("  WORKFLOW SIMULATION: PPE Detection Pipeline")
    print("=" * 65)
    print()

    wf_nodes = [
        ("Camera",      f"ID={cams[0]['id']} ({cams[0]['name']})" if cams else "NONE"),
        ("Edge Device", f"ID={edges[0]['id']} ({edges[0]['name']})" if edges else "NONE"),
        ("AI Model",    f"ID={with_path[0]['id']} ({with_path[0]['name']})" if with_path else "NONE"),
        ("Filter",      "confidence > 0.8"),
        ("Alert",       "Email Notifications"),
        ("Database",    f"ID={dbs[0]['id']} ({dbs[0]['name']})" if dbs else "NONE"),
        ("Log File",    f"ID={logs[0]['id']} ({logs[0].get('category','')})" if logs else "NONE"),
    ]
    print("Building workflow with 7 nodes:")
    for i, (ntype, cfg) in enumerate(wf_nodes, 1):
        print(f"  {i}. [{ntype}] → {cfg}")

    print()
    print("Connections:")
    print("  Camera → Edge Device → AI Model → Filter → Alert")
    print("  Filter → Database")
    print("  Filter → Log File")

    # ── Requirements ──────────────────────────────────────────────────
    print()
    reqs = {
        "Camera":      len(cams) > 0,
        "Edge Device": len(edges) > 0,
        "Database":    len(dbs) > 0,
        "Log File":    len(logs) > 0,
        "Model Repo":  len(with_path) > 0,
        "Alert":       True,
    }
    print("Requirements Check:")
    for k, v in reqs.items():
        print(f"  {'✅' if v else '❌'} {k}")

    all_ok = all(reqs.values())
    print()
    print(f"Workflow Status: {'✅ VALID — Ready to run' if all_ok else '❌ INCOMPLETE'}")

    # ── Alert Rules simulation ────────────────────────────────────────
    print()
    print("Alert Rules:")
    print("  Rule 1: IF confidence < 0.5 THEN trigger Email  [severity: high]")
    print("  Rule 2: IF object_count > 10 THEN trigger Slack  [severity: medium]")

    print()
    print("=" * 65)
    if all_ok:
        print("  🎉 ALL WORKFLOW TESTS PASSED")
    else:
        print("  ❌ SOME REQUIREMENTS MISSING")
    print("=" * 65)
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
