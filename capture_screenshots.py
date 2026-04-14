#!/usr/bin/env python3
"""
Capture screenshots of every major page in the Industrial AI Vision Platform
using Playwright headless Chromium.
"""

import os, time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
OUT  = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(OUT, exist_ok=True)

# (filename, path, wait_ms, extra_actions_description)
PAGES = [
    # 1 - Safety Dashboard (default landing)
    ("01_safety_dashboard",   "/dashboard",                  3000, None),
    # 2 - Quality Dashboard (toggle needed)
    ("02_quality_dashboard",  "/dashboard",                  2000, "quality"),
    # 3 - System Overview
    ("03_system_overview",    "/overview",                   3000, None),
    # 4 - Hierarchy Setup
    ("04_hierarchy_setup",    "/hierarchy",                  2000, None),
    # 5 - Project Management
    ("05_project_management", "/projects",                   2000, None),
    # 6 - Configuration - Cameras
    ("06_config_cameras",     "/configuration/cameras",      2000, None),
    # 7 - Configuration - Edge Devices
    ("07_config_edge",        "/configuration/edge-devices", 2000, None),
    # 8 - Configuration - Database
    ("08_config_database",    "/configuration/database",     2000, None),
    # 9 - Configuration - LLM Repo
    ("09_config_llm",         "/configuration/llm-repo",     2000, None),
    # 10 - Labeling Platform
    ("10_labeling_platform",  "/labeling",                   2500, None),
    # 11 - Label Review
    ("11_label_review",       "/label-review",               2500, None),
    # 12 - Model Development
    ("12_model_development",  "/model-development",          2000, None),
    # 13 - Model Benchmark
    ("13_model_benchmark",    "/model-benchmark",            2000, None),
    # 14 - Model Deployment
    ("14_model_deployment",   "/model-deployment",           2000, None),
    # 15 - Analytics
    ("15_analytics",          "/analytics",                  3000, None),
    # 16 - Alerts
    ("16_alerts",             "/alerts",                     2000, None),
    # 17 - Reports
    ("17_reports",            "/reports",                    2000, None),
    # 18 - AI Agent Builder
    ("18_agent_builder",      "/agent",                      2500, None),
]

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=2,  # retina-quality
        )
        page = context.new_page()

        # Initial load to let React hydrate
        print("Loading app...")
        page.goto(f"{BASE}/dashboard", wait_until="networkidle")
        page.wait_for_timeout(3000)

        for fname, path, wait_ms, extra in PAGES:
            print(f"  Capturing {fname} -> {path}")

            page.goto(f"{BASE}{path}", wait_until="networkidle")
            page.wait_for_timeout(wait_ms)

            # Handle special actions
            if extra == "quality":
                # Click the Quality Vision button in the header
                try:
                    quality_btn = page.locator("button:has-text('Quality Vision')")
                    if quality_btn.count() > 0:
                        quality_btn.first.click()
                        page.wait_for_timeout(2000)
                except:
                    pass

            out_path = os.path.join(OUT, f"{fname}.png")
            page.screenshot(path=out_path, full_page=False)
            print(f"    -> Saved {out_path}")

        # Additional: capture a Use Case page if we have project 1
        try:
            print("  Capturing use_case_management...")
            page.goto(f"{BASE}/projects/1/use-cases", wait_until="networkidle")
            page.wait_for_timeout(2000)
            page.screenshot(path=os.path.join(OUT, "19_use_case_mgmt.png"), full_page=False)
        except Exception as e:
            print(f"    Skipped use cases: {e}")

        # Additional: capture workflow builder if available
        try:
            print("  Capturing workflow_builder...")
            page.goto(f"{BASE}/projects/1/use-cases/1/workflows", wait_until="networkidle")
            page.wait_for_timeout(2500)
            page.screenshot(path=os.path.join(OUT, "20_workflow_builder.png"), full_page=False)
        except Exception as e:
            print(f"    Skipped workflow: {e}")

        # Additional: Agent with a new session
        try:
            print("  Capturing agent_session...")
            page.goto(f"{BASE}/agent", wait_until="networkidle")
            page.wait_for_timeout(2000)
            # Click New Session if button exists
            new_btn = page.locator("button:has-text('New Session'), button:has-text('New Chat'), button:has-text('Start')")
            if new_btn.count() > 0:
                new_btn.first.click()
                page.wait_for_timeout(3000)
            page.screenshot(path=os.path.join(OUT, "21_agent_session.png"), full_page=False)
        except Exception as e:
            print(f"    Skipped agent session: {e}")

        browser.close()

    # List what we captured
    files = sorted(os.listdir(OUT))
    print(f"\n{'='*50}")
    print(f"  Captured {len(files)} screenshots in {OUT}")
    for f in files:
        size_kb = os.path.getsize(os.path.join(OUT, f)) / 1024
        print(f"    {f:40s}  {size_kb:7.1f} KB")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()
