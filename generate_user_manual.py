#!/usr/bin/env python3
"""
Industrial AI — Vision Platform
Comprehensive User Manual Generator
Generates a detailed PDF user manual with platform overview,
step-by-step guides, and UI descriptions.
"""

from fpdf import FPDF
import os, datetime

# ─── Constants ────────────────────────────────────────────────────────────────
NAVY     = (10, 22, 40)       # #0a1628
SKY      = (14, 165, 233)     # #0ea5e9
DARK_SKY = (12, 74, 110)      # #0c4a6e
WHITE    = (255, 255, 255)
BLACK    = (30, 30, 30)
GRAY     = (100, 100, 100)
LIGHT_BG = (248, 250, 252)    # #f8fafc
ACCENT   = (16, 185, 129)     # emerald-500
AMBER    = (245, 158, 11)
RED      = (239, 68, 68)

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "Industrial_AI_Vision_Platform_User_Manual.pdf")
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "screenshots")

# Map screenshot labels -> actual screenshot filenames
SCREENSHOT_MAP = {
    "Platform Architecture Diagram":   "01_safety_dashboard.png",
    "Main Layout":                     "01_safety_dashboard.png",
    "Safety Vision Dashboard":         "01_safety_dashboard.png",
    "Quality Vision Dashboard":        "02_quality_dashboard.png",
    "System Overview Dashboard":       "03_system_overview.png",
    "Hierarchy Configuration":         "04_hierarchy_setup.png",
    "Project Management":              "05_project_management.png",
    "Use Case Management":             "19_use_case_mgmt.png",
    "Workflow Builder":                "20_workflow_builder.png",
    "Camera Configuration":            "06_config_cameras.png",
    "Configuration Page":              "09_config_llm.png",
    "Labeling Platform":               "10_labeling_platform.png",
    "Label Review":                    "11_label_review.png",
    "Model Development":               "12_model_development.png",
    "Model Benchmark":                 "13_model_benchmark.png",
    "Model Deployment":                "14_model_deployment.png",
    "Analytics Dashboard":             "15_analytics.png",
    "Alert Management":                "16_alerts.png",
    "Reports Page":                    "17_reports.png",
    "AI Agent Builder":                "21_agent_session.png",
    "End-to-End Flow":                 "05_project_management.png",
}


class UserManualPDF(FPDF):
    """Custom PDF class for the Industrial AI User Manual."""

    def __init__(self):
        super().__init__('P', 'mm', 'A4')
        self.set_auto_page_break(True, margin=25)
        self.set_margins(20, 20, 20)
        self.chapter_num = 0
        self.section_num = 0

    @staticmethod
    def sanitize(text):
        """Replace Unicode chars that latin-1 can't encode."""
        replacements = {
            '\u2014': ' - ',   # em-dash
            '\u2013': '-',     # en-dash
            '\u2018': "'",     # left single quote
            '\u2019': "'",     # right single quote
            '\u201c': '"',     # left double quote
            '\u201d': '"',     # right double quote
            '\u2022': '-',     # bullet
            '\u2026': '...',   # ellipsis
            '\u00d7': 'x',     # multiplication sign
            '\u2192': '->',    # right arrow
            '\u2190': '<-',    # left arrow
            '\u2265': '>=',    # greater-equal
            '\u2264': '<=',    # less-equal
            '\u00b7': '-',     # middle dot
        }
        for old, new in replacements.items():
            text = text.replace(old, new)
        # Final fallback: strip any remaining non-latin1 chars
        return text.encode('latin-1', 'replace').decode('latin-1')

    # ── Header / Footer ──────────────────────────────────────────────────────
    def header(self):
        if self.page_no() == 1:
            return  # Cover page — no header
        self.set_fill_color(*NAVY)
        self.rect(0, 0, 210, 12, 'F')
        self.set_font('Helvetica', 'B', 7)
        self.set_text_color(*WHITE)
        self.set_xy(20, 3)
        self.cell(0, 6, 'Industrial AI  |  Vision Platform  |  User Manual', ln=False)
        self.set_xy(150, 3)
        self.cell(40, 6, f'Page {self.page_no()}', align='R')
        self.set_text_color(*BLACK)
        self.ln(16)

    def footer(self):
        if self.page_no() == 1:
            return
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 7)
        self.set_text_color(*GRAY)
        self.cell(0, 8, f'Confidential  |  Industrial AI Vision Platform  |  Version 2.4.1  |  April 2026', align='C')

    # ── Helpers ───────────────────────────────────────────────────────────────
    def cover_page(self):
        self.add_page()
        # Full navy background
        self.set_fill_color(*NAVY)
        self.rect(0, 0, 210, 297, 'F')

        # Top accent line
        self.set_fill_color(*SKY)
        self.rect(0, 0, 210, 4, 'F')

        # Logo area — hexagonal representation
        self.set_fill_color(15, 40, 71)  # slightly lighter navy
        cx, cy, r = 105, 75, 30
        self.set_fill_color(15, 40, 71)
        self.ellipse(cx - r, cy - r, r * 2, r * 2, 'F')
        self.set_fill_color(*SKY)
        self.ellipse(cx - 12, cy - 12, 24, 24, 'F')
        self.set_fill_color(*WHITE)
        self.ellipse(cx - 6, cy - 6, 12, 12, 'F')
        self.set_fill_color(*NAVY)
        self.ellipse(cx - 3, cy - 3, 6, 6, 'F')

        # Title
        self.set_font('Helvetica', 'B', 36)
        self.set_text_color(*WHITE)
        self.set_xy(20, 120)
        self.cell(170, 16, 'Industrial AI', align='C')
        self.set_xy(20, 138)
        self.set_font('Helvetica', '', 20)
        self.set_text_color(*SKY)
        self.cell(170, 12, 'Vision Platform', align='C')

        # Subtitle
        self.set_font('Helvetica', 'B', 16)
        self.set_text_color(148, 163, 184)  # slate-400
        self.set_xy(20, 165)
        self.cell(170, 10, 'User Manual & Operations Guide', align='C')

        # Version bar
        self.set_fill_color(15, 40, 71)
        self.rect(40, 190, 130, 30, 'F')
        self.set_font('Helvetica', '', 10)
        self.set_text_color(*SKY)
        self.set_xy(40, 193)
        self.cell(130, 8, 'Version 2.4.1  |  Enterprise Edition', align='C')
        self.set_text_color(148, 163, 184)
        self.set_font('Helvetica', '', 9)
        self.set_xy(40, 204)
        self.cell(130, 8, f'Generated: {datetime.date.today().strftime("%B %d, %Y")}', align='C')

        # Bottom accent
        self.set_fill_color(*SKY)
        self.rect(0, 293, 210, 4, 'F')

    def chapter_title(self, title):
        self.chapter_num += 1
        self.section_num = 0
        self.add_page()
        # Chapter banner
        self.set_fill_color(*NAVY)
        self.rect(20, self.get_y(), 170, 16, 'F')
        self.set_fill_color(*SKY)
        self.rect(20, self.get_y(), 4, 16, 'F')
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(*WHITE)
        self.set_x(30)
        self.cell(155, 16, self.sanitize(f'Chapter {self.chapter_num}:  {title}'), ln=True)
        self.set_text_color(*BLACK)
        self.ln(6)

    def section_title(self, title):
        self.section_num += 1
        self.ln(4)
        self.set_fill_color(*LIGHT_BG)
        self.rect(20, self.get_y(), 170, 10, 'F')
        self.set_draw_color(*SKY)
        self.rect(20, self.get_y(), 170, 10, 'D')
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(*DARK_SKY)
        self.set_x(24)
        self.cell(0, 10, self.sanitize(f'{self.chapter_num}.{self.section_num}  {title}'), ln=True)
        self.set_text_color(*BLACK)
        self.set_draw_color(200, 200, 200)
        self.ln(3)

    def sub_section(self, title):
        self.ln(2)
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(*DARK_SKY)
        self.cell(0, 7, self.sanitize(title), ln=True)
        self.set_text_color(*BLACK)
        self.ln(1)

    def body_text(self, text):
        self.set_font('Helvetica', '', 9.5)
        self.set_text_color(50, 50, 50)
        self.multi_cell(170, 5.5, self.sanitize(text))
        self.ln(2)

    def bullet_list(self, items):
        self.set_font('Helvetica', '', 9.5)
        self.set_text_color(50, 50, 50)
        for item in items:
            self.set_x(26)
            self.set_fill_color(*SKY)
            y_dot = self.get_y() + 2
            self.ellipse(27, y_dot, 2.5, 2.5, 'F')
            self.set_x(32)
            self.set_font('Helvetica', '', 9.5)
            self.set_text_color(50, 50, 50)
            self.multi_cell(152, 5.5, self.sanitize(item))
            self.ln(1)
        self.ln(2)

    def numbered_list(self, items):
        self.set_font('Helvetica', '', 9.5)
        self.set_text_color(50, 50, 50)
        for i, item in enumerate(items, 1):
            self.set_x(26)
            self.set_font('Helvetica', 'B', 9.5)
            self.set_text_color(*DARK_SKY)
            self.cell(10, 5.5, f'{i}.')
            self.set_font('Helvetica', '', 9.5)
            self.set_text_color(50, 50, 50)
            self.multi_cell(154, 5.5, self.sanitize(item))
            self.ln(1)
        self.ln(2)

    def info_box(self, title, text, color=SKY):
        self.set_fill_color(color[0], color[1], color[2])
        self.rect(20, self.get_y(), 3, 18, 'F')
        self.set_fill_color(240, 249, 255)
        self.rect(23, self.get_y(), 167, 18, 'F')
        y = self.get_y()
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(*color)
        self.set_xy(27, y + 1)
        self.cell(0, 5, title)
        self.set_font('Helvetica', '', 8.5)
        self.set_text_color(60, 60, 60)
        self.set_xy(27, y + 7)
        self.multi_cell(158, 4.5, self.sanitize(text))
        self.set_y(y + 20)
        self.ln(2)

    def tip_box(self, text):
        self.info_box("TIP", text, ACCENT)

    def warning_box(self, text):
        self.info_box("WARNING", text, AMBER)

    def table(self, headers, rows, col_widths=None):
        if col_widths is None:
            col_widths = [170 / len(headers)] * len(headers)
        # Header
        self.set_fill_color(*NAVY)
        self.set_text_color(*WHITE)
        self.set_font('Helvetica', 'B', 8.5)
        for i, h in enumerate(headers):
            self.cell(col_widths[i], 8, self.sanitize(h), border=1, fill=True, align='C')
        self.ln()
        # Rows
        self.set_font('Helvetica', '', 8.5)
        self.set_text_color(50, 50, 50)
        for ri, row in enumerate(rows):
            fill = ri % 2 == 0
            if fill:
                self.set_fill_color(*LIGHT_BG)
            for i, cell in enumerate(row):
                self.cell(col_widths[i], 7, self.sanitize(str(cell)), border=1, fill=fill, align='C' if i > 0 else 'L')
            self.ln()
        self.ln(4)

    def screenshot_placeholder(self, label, description=""):
        """Embed a real screenshot image if available, else draw a placeholder."""
        img_file = SCREENSHOT_MAP.get(label, "")
        img_path = os.path.join(SCREENSHOT_DIR, img_file) if img_file else ""

        if img_path and os.path.exists(img_path):
            # Real screenshot available — embed it
            # Check if we need a page break (image will be ~95mm tall)
            if self.get_y() > 175:
                self.add_page()

            y = self.get_y()
            img_w = 170  # mm width (full content width)

            # Caption above image
            self.set_font('Helvetica', 'B', 8.5)
            self.set_text_color(*DARK_SKY)
            self.cell(170, 5, self.sanitize(f'Figure: {label}'), align='C')
            self.ln(2)

            # Thin border around image
            iy = self.get_y()
            self.set_draw_color(200, 210, 220)

            # Embed the PNG image — fpdf2 auto-calculates height from aspect ratio
            self.image(img_path, x=20, y=iy, w=img_w)
            img_bottom = self.get_y()

            # Draw border around the image
            img_h = img_bottom - iy
            self.rect(20, iy, img_w, img_h, 'D')

            # Caption below
            if description:
                self.set_font('Helvetica', 'I', 7.5)
                self.set_text_color(*GRAY)
                self.cell(170, 5, self.sanitize(description), align='C')
                self.ln(2)

            self.set_text_color(*BLACK)
            self.set_draw_color(200, 200, 200)
            self.ln(4)
        else:
            # Fallback: placeholder box
            y = self.get_y()
            if y > 240:
                self.add_page()
                y = self.get_y()
            h = 55
            self.set_draw_color(200, 210, 220)
            self.set_fill_color(248, 250, 252)
            self.rect(25, y, 160, h, 'DF')
            self.set_draw_color(180, 195, 210)
            self.rect(30, y + 5, 150, h - 10, 'D')
            self.set_fill_color(*SKY)
            self.ellipse(99, y + 16, 12, 12, 'F')
            self.set_fill_color(*WHITE)
            self.ellipse(102, y + 19, 6, 6, 'F')
            self.set_font('Helvetica', 'B', 9)
            self.set_text_color(*DARK_SKY)
            self.set_xy(25, y + 32)
            self.cell(160, 6, self.sanitize(f'[ Screenshot: {label} ]'), align='C')
            if description:
                self.set_font('Helvetica', 'I', 8)
                self.set_text_color(*GRAY)
                self.set_xy(25, y + 39)
                self.cell(160, 5, self.sanitize(description), align='C')
            self.set_y(y + h + 4)
            self.set_text_color(*BLACK)


# ─── Build Manual ─────────────────────────────────────────────────────────────
def build_manual():
    pdf = UserManualPDF()

    # ══════════════════════════════════════════════════════════════════════════
    #  COVER PAGE
    # ══════════════════════════════════════════════════════════════════════════
    pdf.cover_page()

    # ══════════════════════════════════════════════════════════════════════════
    #  TABLE OF CONTENTS
    # ══════════════════════════════════════════════════════════════════════════
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 18)
    pdf.set_text_color(*NAVY)
    pdf.cell(0, 12, 'Table of Contents', ln=True)
    pdf.set_draw_color(*SKY)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(6)

    toc = [
        ("1", "Platform Overview & Architecture", ""),
        ("2", "Getting Started", ""),
        ("3", "Vision Dashboard (Safety & Quality)", ""),
        ("4", "System Overview (Command Center)", ""),
        ("5", "Hierarchy Setup", ""),
        ("6", "Project Management", ""),
        ("7", "Use Case Management", ""),
        ("8", "Workflow Builder (DAG Engine)", ""),
        ("9", "Configuration Module", ""),
        ("  ", "  9.1  Camera Configuration", ""),
        ("  ", "  9.2  Edge Device Configuration", ""),
        ("  ", "  9.3  Database Configuration", ""),
        ("  ", "  9.4  Log File Configuration", ""),
        ("  ", "  9.5  Model Repository", ""),
        ("  ", "  9.6  LLM Repository", ""),
        ("10", "Labeling Platform", ""),
        ("11", "Label Review & Verification", ""),
        ("12", "Model Development & Training", ""),
        ("13", "Model Benchmark", ""),
        ("14", "Model Deployment", ""),
        ("15", "Analytics Dashboard", ""),
        ("16", "Alert Management", ""),
        ("17", "Reports", ""),
        ("18", "AI Agent Builder (Agentic AI)", ""),
        ("19", "End-to-End Project Build Guide", ""),
        ("20", "Troubleshooting & FAQ", ""),
    ]

    for ch, title, _ in toc:
        is_sub = ch.strip() == ""
        pdf.set_font('Helvetica', '' if is_sub else 'B', 9 if is_sub else 10)
        pdf.set_text_color(*DARK_SKY if not is_sub else GRAY)
        x_offset = 30 if is_sub else 24
        pdf.set_x(x_offset)
        pdf.cell(0, 6, f'{ch}   {title}' if ch.strip() else f'    {title}', ln=True)
    pdf.ln(6)

    # ══════════════════════════════════════════════════════════════════════════
    #  CHAPTER 1: PLATFORM OVERVIEW
    # ══════════════════════════════════════════════════════════════════════════
    pdf.chapter_title("Platform Overview & Architecture")

    pdf.body_text(
        "Industrial AI Vision Platform is an enterprise-grade computer vision solution designed for "
        "manufacturing, industrial safety, and quality control environments. The platform provides an "
        "end-to-end pipeline from camera ingestion through AI model training, deployment, and real-time "
        "monitoring with intelligent alerting."
    )

    pdf.section_title("Key Capabilities")
    pdf.bullet_list([
        "Dual-mode dashboards: Safety Vision (PPE, zone monitoring, fall detection) and Quality Vision (defect detection, dimensional analysis, color verification)",
        "Hierarchical project organization with Business and Geography hierarchies",
        "Visual DAG-based Workflow Builder for composing detection pipelines",
        "Full image labeling platform with manual annotation, auto-labeling (YOLOv8), and label review/verification",
        "Model training (YOLOv8 & TensorFlow) with real-time log streaming and metric charts",
        "Model benchmarking: side-by-side comparison of multiple models on the same dataset",
        "One-click model deployment to edge stations with FPS, latency, and uptime monitoring",
        "Real-time analytics with detection trends, camera activity, top objects, and system health radar",
        "Alert management with severity classification (Critical, Warning, Info) and acknowledge/resolve workflows",
        "AI Agent Builder: conversational agentic AI that builds your entire project pipeline through chat",
        "IST (Indian Standard Time) timestamps across all records",
        "Reports generation for safety, quality, performance, incident, and technical audits",
    ])

    pdf.section_title("Technology Stack")
    pdf.table(
        ["Layer", "Technology", "Details"],
        [
            ["Frontend", "React + TypeScript", "Vite build, Tailwind CSS v4, Recharts"],
            ["Backend", "Flask 3.0 (Python)", "RESTful API, SQLAlchemy ORM"],
            ["Database", "MySQL 8.4", "Persistent storage, migrations"],
            ["AI/ML", "YOLOv8 + TensorFlow", "Object detection, classification"],
            ["UI Framework", "Tailwind CSS v4", "Inter font, custom theme"],
            ["State Mgmt", "React Hooks", "useState, useEffect, useCallback"],
            ["Charting", "Recharts", "Area, Bar, Pie, Radar, Line charts"],
        ],
        [50, 55, 65]
    )

    pdf.section_title("Platform Architecture")
    pdf.body_text(
        "The platform follows a classic three-tier architecture:\n\n"
        "1. Presentation Tier: Single-page React application served via Vite dev server (port 5173). "
        "Uses Inter font family and a professional Navy/Sky-blue design system.\n\n"
        "2. Application Tier: Flask REST API (port 5000) with blueprint-based route organization. "
        "Each feature module (projects, cameras, training, agent, etc.) has its own blueprint with "
        "dedicated service and model layers.\n\n"
        "3. Data Tier: MySQL database with SQLAlchemy ORM. Models include: Project, UseCase, Camera, "
        "EdgeDevice, LabelDataset, LabelImage, LabelAnnotation, TrainingJob, Experiment, "
        "ModelDeployment, Alert, DetectionEvent, DbConfig, LogConfig, ModelConfig, LlmConfig, "
        "ChatSession, LlmAnalysis, LlmJob, AgentSession, and AgentStep."
    )

    pdf.screenshot_placeholder("Platform Architecture Diagram", "Three-tier architecture: React Frontend -> Flask API -> MySQL Database")

    # ══════════════════════════════════════════════════════════════════════════
    #  CHAPTER 2: GETTING STARTED
    # ══════════════════════════════════════════════════════════════════════════
    pdf.chapter_title("Getting Started")

    pdf.section_title("System Requirements")
    pdf.table(
        ["Component", "Minimum", "Recommended"],
        [
            ["OS", "Windows 10 / Ubuntu 20.04", "Windows 11 / Ubuntu 22.04"],
            ["Python", "3.11+", "3.13"],
            ["Node.js", "18+", "20 LTS"],
            ["MySQL", "8.0+", "8.4"],
            ["RAM", "8 GB", "16 GB"],
            ["GPU (Training)", "CPU-only supported", "NVIDIA CUDA GPU"],
            ["Browser", "Chrome 90+", "Chrome latest / Edge"],
        ],
        [50, 60, 60]
    )

    pdf.section_title("Installation Steps")
    pdf.numbered_list([
        "Clone the repository and navigate to the project root directory.",
        "Create a Python virtual environment: python -m venv .venv",
        "Activate the virtual environment: .venv\\Scripts\\activate (Windows) or source .venv/bin/activate (Linux/Mac)",
        "Install Python dependencies: pip install -r requirements.txt",
        "Configure MySQL: Create the database 'vision_platform_db' and update config.py with credentials.",
        "Initialize the database: The schema is auto-created via SQLAlchemy on first run.",
        "Start the Flask backend: python run.py (runs on http://127.0.0.1:5000)",
        "Install frontend dependencies: cd 'Computer Vision Platform' && npm install",
        "Start the frontend dev server: npm run dev (runs on http://localhost:5173)",
        "Open your browser and navigate to http://localhost:5173",
    ])

    pdf.tip_box("Set PYTHONPATH to empty before running Flask: $env:PYTHONPATH = '' (PowerShell) to avoid module conflicts with other Python environments.")

    pdf.section_title("First Login & Navigation")
    pdf.body_text(
        "Upon opening the platform, you will see the main layout with:\n\n"
        "- Header Bar: Dark navy gradient with the Industrial AI logo, Safety/Quality vision toggle, and system status indicator.\n"
        "- Left Sidebar: Navigation menu with 14 sections plus the AI Agent Builder (marked NEW).\n"
        "- Main Content Area: Dynamic content based on the selected navigation item.\n"
        "- Footer: Platform version and edition information."
    )
    pdf.screenshot_placeholder("Main Layout", "Header with logo, sidebar navigation, and content area")

    # ══════════════════════════════════════════════════════════════════════════
    #  CHAPTER 3: VISION DASHBOARD
    # ══════════════════════════════════════════════════════════════════════════
    pdf.chapter_title("Vision Dashboard (Safety & Quality)")

    pdf.body_text(
        "The Vision Dashboard is the platform's landing page. It offers two specialized views "
        "toggled via the header buttons: Safety Vision and Quality Vision. Each provides real-time "
        "monitoring dashboards tailored to their respective use cases."
    )

    pdf.section_title("Safety Vision Dashboard")
    pdf.body_text(
        "The Worker Safety Command Center provides real-time PPE detection, safety zone monitoring, "
        "and incident prevention capabilities."
    )
    pdf.sub_section("Key Metrics (Stats Cards)")
    pdf.bullet_list([
        "Active Safety Cameras: Number of cameras actively monitoring for safety events",
        "PPE Compliance: Percentage of workers wearing proper personal protective equipment",
        "Active Alerts: Current unresolved safety alerts with critical count",
        "Workers Monitored: Total workers being tracked across all zones",
    ])
    pdf.sub_section("Charts & Visualizations")
    pdf.bullet_list([
        "Safety Detection Trends: Area chart showing PPE violations, zone breaches, and fall risks over 24 hours",
        "PPE Compliance by Zone: Bar chart comparing compliance rates across zones A-D",
        "Incident Types Distribution: Pie chart breaking down No Helmet, No Vest, Restricted Area, and Fall Risk incidents",
        "Zone Status Table: Detailed view with workers count, camera count, compliance rate, and safety status per zone",
        "Recent Safety Alerts: Live feed of the latest safety events with severity indicators and timestamps",
    ])
    pdf.screenshot_placeholder("Safety Vision Dashboard", "Stats cards, detection trend chart, PPE compliance, incident pie chart, zone status table")

    pdf.section_title("Quality Vision Dashboard")
    pdf.body_text(
        "The Quality Inspection Command Center focuses on defect detection, dimensional analysis, "
        "and production line quality monitoring."
    )
    pdf.sub_section("Key Metrics")
    pdf.bullet_list([
        "Quality Pass Rate: Overall percentage of products passing inspection (e.g., 97.3%)",
        "Inspected Products: Total products inspected today",
        "Defects Detected: Count of defective items found",
        "Quality Cameras: Number of active quality inspection cameras",
    ])
    pdf.sub_section("Charts & Visualizations")
    pdf.bullet_list([
        "Quality Trend: Area chart showing pass/fail rates over time",
        "Defects by Type: Pie chart (Surface Defects, Dimensional Issues, Color Mismatch, Assembly Errors)",
        "Production Line Performance: Table with per-line inspected, passed, defects, and rate",
        "Model Accuracy: Bar chart of inspection model performance (Surface, Dimension, Color, Assembly)",
        "Zone Productivity: Throughput, quality, and efficiency metrics per production zone",
        "Recent Quality Alerts: Live feed of quality events",
    ])
    pdf.screenshot_placeholder("Quality Vision Dashboard", "Quality stats, defect distribution, production line performance, model accuracy")

    # ══════════════════════════════════════════════════════════════════════════
    #  CHAPTER 4: SYSTEM OVERVIEW
    # ══════════════════════════════════════════════════════════════════════════
    pdf.chapter_title("System Overview (Command Center)")

    pdf.body_text(
        "The System Overview serves as the centralized Command Center, providing a holistic view "
        "of all platform operations with live data from the backend APIs."
    )

    pdf.section_title("Dashboard Cards")
    pdf.bullet_list([
        "Active Cameras: Count of cameras currently active, with total count as subtitle",
        "Detections Today: Total detection events captured today across all cameras",
        "Unresolved Alerts: Number of alerts requiring attention, with trend indicator",
        "Total Cameras: Overall camera count with active count as subtitle",
    ])

    pdf.section_title("Interactive Charts")
    pdf.bullet_list([
        "Detection Activity (Area Chart): 24-hour view of detections and alerts with gradient fills",
        "Model Accuracy (Horizontal Bar): Performance of each AI model (PPE Detection, Quality Control, Safety Zone, Defect Detection)",
        "Alert Type Distribution (Pie): Breakdown of alert categories",
        "System Health (Cards): Component-level status for Edge Devices, Cameras, Models, and Database with uptime percentages",
    ])

    pdf.section_title("Data Refresh")
    pdf.body_text(
        "The dashboard fetches data from the /api/dashboard endpoint on load. Click the 'Refresh' "
        "button in the header to reload all metrics. The system status indicator shows a live green "
        "pulse when all systems are operational."
    )
    pdf.screenshot_placeholder("System Overview Dashboard", "Command Center with stats cards, detection chart, model accuracy, alert distribution")

    # ══════════════════════════════════════════════════════════════════════════
    #  CHAPTER 5: HIERARCHY SETUP
    # ══════════════════════════════════════════════════════════════════════════
    pdf.chapter_title("Hierarchy Setup")

    pdf.body_text(
        "The Hierarchy Configuration module allows you to define your organization's structure "
        "through two independent hierarchies: Business Hierarchy and Geography Hierarchy. "
        "These hierarchies are used throughout the platform to organize projects, assign cameras, "
        "and generate reports by organizational unit."
    )

    pdf.section_title("Business Hierarchy")
    pdf.body_text(
        "The Business Hierarchy defines your company's operational structure. Default levels are:"
    )
    pdf.table(
        ["Level", "Example", "Description"],
        [
            ["Level 1: Company", "TechCorp Industries", "Parent organization"],
            ["Level 2: Manufacturing Unit", "Plant A, Plant B", "Individual facilities"],
            ["Level 3: Product Line", "Electronics, Assembly", "Product-specific divisions"],
        ],
        [50, 55, 65]
    )

    pdf.section_title("Geography Hierarchy")
    pdf.body_text(
        "The Geography Hierarchy maps physical locations:"
    )
    pdf.table(
        ["Level", "Example", "Description"],
        [
            ["Level 1: Country", "United States", "Country of operation"],
            ["Level 2: State/Province", "California", "Regional location"],
            ["Level 3: City", "San Jose", "City location"],
            ["Level 4: Location/Site", "Building 1", "Specific site"],
        ],
        [50, 55, 65]
    )

    pdf.section_title("Managing Hierarchy Levels & Nodes")
    pdf.sub_section("Adding a New Level")
    pdf.numbered_list([
        "Select the Business or Geography tab.",
        "Click 'Add Level' in the Hierarchy Levels panel.",
        "Enter the level name and click Save.",
        "The new level appears at the bottom of the level stack.",
    ])
    pdf.sub_section("Adding Nodes")
    pdf.numbered_list([
        "Click 'Add Node' in the Hierarchy Nodes panel.",
        "Select the level for this node from the dropdown.",
        "If the level is Level 2+, select a parent node from the level above.",
        "Enter the node name and description, then click Save.",
    ])
    pdf.sub_section("Editing & Deleting")
    pdf.body_text(
        "Click the pencil icon to edit any level name or node. Click the trash icon to delete. "
        "Deleting a level removes all nodes under it. Deleting a node cascades to all child nodes."
    )
    pdf.warning_box("Deleting a hierarchy level removes ALL nodes associated with that level. This action cannot be undone.")
    pdf.screenshot_placeholder("Hierarchy Configuration", "Business/Geography tabs, level list, node tree with CRUD actions")

    # ══════════════════════════════════════════════════════════════════════════
    #  CHAPTER 6: PROJECT MANAGEMENT
    # ══════════════════════════════════════════════════════════════════════════
    pdf.chapter_title("Project Management")

    pdf.body_text(
        "Projects are the top-level organizational unit in the platform. Each project represents "
        "a distinct computer vision initiative and contains use cases, workflows, cameras, and "
        "associated configurations."
    )

    pdf.section_title("Project Dashboard Overview")
    pdf.body_text(
        "The Project Management page displays:\n"
        "- Quick Stats: Active Projects, In Planning, Total Use Cases, Total Projects\n"
        "- Project Cards: Each project shown with its icon, name, status badge, business hierarchy, "
        "geography hierarchy, and action buttons."
    )
    pdf.screenshot_placeholder("Project Management", "Header with stats, project cards showing hierarchy details")

    pdf.section_title("Creating a New Project")
    pdf.numbered_list([
        "Click the 'New Project' button in the header area.",
        "Enter the Project Name (required) and Description.",
        "Set the Status: Planning (default), Active, or Inactive.",
        "Fill in Business Hierarchy: Company, Manufacturing Unit, Product Line.",
        "Fill in Geography Hierarchy: Country, State/Province, City, Location/Site.",
        "Click 'Save Project' to create the project.",
    ])

    pdf.section_title("Project Card Details")
    pdf.body_text(
        "Each project card displays:\n"
        "- Project name with status badge (Active/Planning/Inactive)\n"
        "- Project ID number\n"
        "- Description text\n"
        "- Business Hierarchy panel (blue background) showing Company > MFG Unit > Product Line\n"
        "- Geography Hierarchy panel (green background) showing Country > State > City > Site\n"
        "- Action buttons: View Use Cases, Edit, Delete"
    )

    pdf.section_title("Managing Projects")
    pdf.sub_section("Editing a Project")
    pdf.body_text("Click the Edit (pencil) icon on any project card. The modal pre-fills with existing data. Make changes and save.")
    pdf.sub_section("Deleting a Project")
    pdf.body_text("Click the Delete (trash) icon. A confirmation dialog appears. Deleting a project removes all associated use cases and workflows.")
    pdf.sub_section("Viewing Use Cases")
    pdf.body_text("Click the 'Use Cases' button or the eye icon to navigate to the Use Case Management page for that project.")

    pdf.warning_box("Deleting a project will permanently remove all its use cases, workflows, and associated data. Proceed with caution.")

    # ══════════════════════════════════════════════════════════════════════════
    #  CHAPTER 7: USE CASE MANAGEMENT
    # ══════════════════════════════════════════════════════════════════════════
    pdf.chapter_title("Use Case Management")

    pdf.body_text(
        "Use Cases define specific computer vision tasks within a project. Each use case has a type "
        "(Safety, Quality, Maintenance, Productivity), priority level, and status. Use cases contain "
        "workflows that define the processing pipeline."
    )

    pdf.section_title("Navigating to Use Cases")
    pdf.body_text(
        "From the Project Management page, click on a project's 'Use Cases' button. The breadcrumb "
        "at the top shows: Projects > [Project Name]. You can navigate back to Projects at any time."
    )

    pdf.section_title("Creating a Use Case")
    pdf.numbered_list([
        "Click 'New Use Case' in the header.",
        "Enter the Use Case Name and Description.",
        "Select the Type: safety, quality, maintenance, or productivity.",
        "Set the Priority: high, medium, or low.",
        "Set the Status: development (default), active, or inactive.",
        "Click Save to create the use case.",
    ])

    pdf.section_title("Use Case Cards")
    pdf.body_text(
        "Each use case displays:\n"
        "- Name and icon\n"
        "- Status badge (color-coded: green=active, blue=development, gray=inactive)\n"
        "- Type badge (blue=safety, green=quality, purple=maintenance, amber=productivity)\n"
        "- Priority badge (red=high, amber=medium, blue=low)\n"
        "- Description text\n"
        "- Workflow count\n"
        "- Action buttons: Open Workflow Builder, Edit, Delete"
    )

    pdf.section_title("Quick Stats")
    pdf.bullet_list([
        "Total Use Cases: Count of all use cases under the project",
        "Active: Number currently in active status",
        "High Priority: Count of high-priority use cases",
        "Total Workflows: Sum of all workflows across use cases",
    ])
    pdf.screenshot_placeholder("Use Case Management", "Breadcrumb, stats cards, use case cards with type/priority/status badges")

    # ══════════════════════════════════════════════════════════════════════════
    #  CHAPTER 8: WORKFLOW BUILDER
    # ══════════════════════════════════════════════════════════════════════════
    pdf.chapter_title("Workflow Builder (DAG Engine)")

    pdf.body_text(
        "The Workflow Builder is a powerful visual DAG (Directed Acyclic Graph) engine that allows "
        "you to compose computer vision processing pipelines by connecting nodes on a canvas. Each "
        "node represents a processing stage, and connections define data flow."
    )

    pdf.section_title("Node Types")
    pdf.table(
        ["Node", "Icon", "Required", "Description"],
        [
            ["Camera", "Camera", "Yes", "Capture images from camera feed"],
            ["Edge Device", "Lightning", "Yes", "Edge compute processing unit"],
            ["Dataset", "Image", "No", "Upload images, label & train model"],
            ["AI Model", "Robot", "Yes", "Run model inference on frames"],
            ["LLM", "Brain", "No", "LLM analysis (optional intelligence)"],
            ["Filter", "Search", "No", "Filter results by confidence threshold"],
            ["Alert", "Bell", "Yes", "Send alerts on detections"],
            ["Database", "Disk", "Yes", "Store detection events"],
            ["Log File", "Note", "Yes", "Write to log file for audit trail"],
        ],
        [30, 25, 25, 90]
    )

    pdf.section_title("DAG Connection Rules")
    pdf.body_text(
        "The workflow enforces strict directed connection rules to ensure valid pipelines:"
    )
    pdf.table(
        ["From Node", "Can Connect To"],
        [
            ["Camera", "Edge Device"],
            ["Edge Device", "AI Model, Dataset"],
            ["Dataset", "AI Model"],
            ["AI Model", "Filter, LLM, Alert, Database, Log"],
            ["LLM", "Alert, Database, Log"],
            ["Filter", "Alert, Database, Log"],
            ["Alert", "Database, Log"],
            ["Database", "Log"],
            ["Log", "(Terminal node)"],
        ],
        [55, 115]
    )

    pdf.section_title("Building a Workflow")
    pdf.numbered_list([
        "Navigate to a Use Case and click 'Open Workflow Builder'.",
        "Click 'New Workflow' and enter a name.",
        "Drag nodes from the left palette onto the canvas. Nodes snap to a 20px grid.",
        "To connect nodes: Click the output port (green circle) of a source node, then click the input port (blue circle) of the target node.",
        "The system validates connections against DAG rules and prevents invalid links.",
        "Configure each node by clicking it: select camera, edge device, model, dataset, etc. from dropdowns populated with real backend data.",
        "Add Alert Rules via the Alert Rules button to define conditions, operators, values, actions, and severity levels.",
        "The Requirements Panel on the right shows completion status of all required nodes.",
        "Click 'Save' to persist the workflow. Click 'Run' to execute the pipeline.",
    ])

    pdf.section_title("Dataset Node (Special)")
    pdf.body_text(
        "The Dataset node enables a training-within-workflow experience:\n"
        "- Upload images directly within the workflow builder\n"
        "- Select an existing dataset from the labeling platform\n"
        "- Choose training framework (YOLOv8/TensorFlow)\n"
        "- Configure epochs, batch size, image size\n"
        "- Launch training jobs without leaving the workflow builder"
    )

    pdf.section_title("Running a Workflow")
    pdf.body_text(
        "When you click 'Run', the system executes each pipeline step in order:\n"
        "1. Initialize Camera Feed\n"
        "2. Connect to Edge Device\n"
        "3. Load AI Model\n"
        "4. Configure Filters\n"
        "5. Set up Alert Rules\n"
        "6. Connect Database\n"
        "7. Initialize Log File\n"
        "8. Start Inference Pipeline\n\n"
        "Each step shows a real-time status (pending, running, success, error) in the Run Panel."
    )
    pdf.screenshot_placeholder("Workflow Builder", "Canvas with connected nodes, node palette, requirements panel, DAG connections")

    # ══════════════════════════════════════════════════════════════════════════
    #  CHAPTER 9: CONFIGURATION
    # ══════════════════════════════════════════════════════════════════════════
    pdf.chapter_title("Configuration Module")

    pdf.body_text(
        "The Configuration page provides centralized management for all infrastructure components. "
        "It features a tabbed interface with six configuration sections: Cameras, Edge Devices, "
        "Database, Log Files, Model Repository, and LLM Repository."
    )

    pdf.section_title("Camera Configuration")
    pdf.body_text(
        "Manage IP cameras and video feeds used for computer vision processing."
    )
    pdf.sub_section("Camera Fields")
    pdf.table(
        ["Field", "Type", "Description"],
        [
            ["Name", "Text", "Descriptive camera name (e.g., 'Assembly Line Cam 1')"],
            ["Location", "Text", "Physical location of the camera"],
            ["Status", "Select", "active or inactive"],
            ["FPS", "Number", "Frames per second (default: 30)"],
            ["Resolution", "Text", "Video resolution (e.g., 1920x1080)"],
            ["IP Address", "Text", "Network IP of the camera"],
            ["RTSP URL", "Text", "RTSP streaming URL"],
            ["Hardware Model", "Text", "Camera hardware model name"],
        ],
        [40, 25, 105]
    )
    pdf.sub_section("Operations")
    pdf.body_text("Add, edit, and delete cameras. Status toggles show green (active) or gray (inactive) badges. Each camera card displays all configured fields.")
    pdf.screenshot_placeholder("Camera Configuration", "Camera list with Add/Edit/Delete, status badges, RTSP URL display")

    pdf.section_title("Edge Device Configuration")
    pdf.body_text(
        "Manage edge computing devices that run AI inference near camera feeds."
    )
    pdf.sub_section("Edge Device Fields")
    pdf.table(
        ["Field", "Type", "Description"],
        [
            ["Name", "Text", "Device name (e.g., 'Edge Node A-01')"],
            ["Location", "Text", "Physical location"],
            ["Status", "Select", "online, offline, maintenance"],
            ["CPU Usage", "Text", "Current CPU utilization (e.g., '45%')"],
            ["Memory", "Text", "Memory usage percentage"],
            ["Storage", "Text", "Storage usage percentage"],
            ["Models Loaded", "Number", "Count of AI models currently loaded"],
            ["IP Address", "Text", "Device IP address"],
            ["Platform", "Text", "Hardware platform (e.g., 'NVIDIA Jetson')"],
            ["GPU Model", "Text", "GPU model name"],
        ],
        [40, 25, 105]
    )

    pdf.section_title("Database Configuration")
    pdf.body_text(
        "Configure database connections for storing detection events, alerts, and analytics data."
    )
    pdf.table(
        ["Field", "Type", "Description"],
        [
            ["Name", "Text", "Configuration name"],
            ["Host", "Text", "Database server hostname or IP"],
            ["Port", "Number", "Connection port (default: 5432 PostgreSQL, 3306 MySQL)"],
            ["DB Type", "Select", "postgresql, mysql, mongodb, sqlite"],
            ["Username", "Text", "Database username"],
            ["Database Name", "Text", "Target database name"],
            ["Status", "Auto", "connected or disconnected"],
        ],
        [40, 25, 105]
    )

    pdf.section_title("Log File Configuration")
    pdf.body_text("Configure log file locations, retention policies, and categories for audit trails and debugging.")

    pdf.section_title("Model Repository")
    pdf.body_text("Manage AI model configurations including framework type, model paths, and versioning. Models registered here appear in workflow builder dropdowns and deployment options.")

    pdf.section_title("LLM Repository")
    pdf.body_text(
        "Configure Large/Small Language Model integrations for advanced AI analysis."
    )
    pdf.table(
        ["Field", "Type", "Description"],
        [
            ["Name", "Text", "Model name (e.g., 'GPT-4 Vision')"],
            ["Provider", "Text", "Provider (OpenAI, Anthropic, Local, etc.)"],
            ["Size", "Text", "Model size (e.g., '7B', '70B')"],
            ["Type", "Text", "LLM type (chat, vision, embedding)"],
            ["Context Length", "Text", "Max context window"],
            ["Status", "Select", "available, unavailable, loading"],
            ["Endpoint", "Text", "API endpoint URL"],
            ["Description", "Text", "Model description"],
        ],
        [40, 25, 105]
    )
    pdf.screenshot_placeholder("Configuration Page", "Tabbed interface with Camera, Edge, Database, Log, Model, LLM tabs")

    # ══════════════════════════════════════════════════════════════════════════
    #  CHAPTER 10: LABELING PLATFORM
    # ══════════════════════════════════════════════════════════════════════════
    pdf.chapter_title("Labeling Platform")

    pdf.body_text(
        "The Image Labeling Platform provides comprehensive tools for creating labeled datasets "
        "for training computer vision models. It supports three modes: Dataset Management, "
        "Manual Labeling, and Auto-Labeling."
    )

    pdf.section_title("Datasets Tab")
    pdf.numbered_list([
        "Click 'New Dataset' to create a new labeled dataset.",
        "Enter a dataset name.",
        "Define label classes: Enter class names (e.g., 'person', 'vehicle', 'helmet') and assign colors.",
        "Click the '+' button to add more classes.",
        "Optionally, upload images immediately during creation.",
        "Click Create to finalize the dataset.",
    ])
    pdf.body_text(
        "The Datasets tab shows cards for each dataset with:\n"
        "- Dataset name and total images count\n"
        "- Class list with color indicators\n"
        "- Progress bar showing labeled vs. unlabeled images\n"
        "- Upload More Images button\n"
        "- Export button (downloads YOLO-format annotations)\n"
        "- Delete button"
    )

    pdf.section_title("Manual Labeling Tab")
    pdf.body_text(
        "The manual labeling interface provides a full-featured annotation canvas:"
    )
    pdf.numbered_list([
        "Select a dataset from the dropdown.",
        "The left panel shows all images with thumbnails and status badges (unlabeled, labeled, auto_labeled, verified).",
        "Click an image to load it on the interactive canvas.",
        "Select a labeling tool: Bounding Box (default), Polygon, or Point.",
        "Select the target class from the class palette above the canvas.",
        "Draw annotations: Click and drag to create bounding boxes. The box appears with the class color and label.",
        "Annotations appear in the right panel with class name, coordinates, and delete option.",
        "Click 'Save Annotations' to persist. The image status updates to 'labeled'.",
    ])

    pdf.sub_section("Canvas Features")
    pdf.bullet_list([
        "Zoom: Scale the image for detailed annotation",
        "Class colors: Each class has a distinct color for visual differentiation",
        "Hover highlights: Annotations highlight when the cursor hovers over them",
        "Real-time coordinate display: Shows x, y, width, height in the annotation list",
        "Unsaved changes indicator: A badge shows when there are unsaved annotations",
    ])

    pdf.section_title("Auto-Labeling Tab")
    pdf.body_text(
        "Automated labeling uses a pre-trained YOLOv8 model to generate annotations automatically:"
    )
    pdf.numbered_list([
        "Select a dataset from the dropdown.",
        "Choose the auto-label model (default: yolov8n.pt).",
        "Set the confidence threshold (default: 0.25). Higher values = fewer but more confident predictions.",
        "Click 'Run Auto-Label' to start.",
        "A progress bar shows real-time status: processing image count and percentage.",
        "When complete, all images receive 'auto_labeled' status with generated bounding boxes.",
        "Review auto-labeled annotations in the Label Review module before using for training.",
    ])

    pdf.tip_box("Auto-labeling works best as a starting point. Always review and correct auto-generated labels in the Label Review module for highest training quality.")
    pdf.screenshot_placeholder("Labeling Platform", "Three-tab interface: Datasets list, Manual canvas with annotations, Auto-label progress")

    # ══════════════════════════════════════════════════════════════════════════
    #  CHAPTER 11: LABEL REVIEW
    # ══════════════════════════════════════════════════════════════════════════
    pdf.chapter_title("Label Review & Verification")

    pdf.body_text(
        "The Label Review module provides a dedicated quality assurance interface for verifying "
        "labeled and auto-labeled images before they are used for model training."
    )

    pdf.section_title("Review Interface")
    pdf.bullet_list([
        "Dataset Selector: Choose which dataset to review from the dropdown.",
        "Summary Stats: Cards showing counts for Unlabeled, Labeled, Auto-Labeled, and Verified images.",
        "Filter Controls: Filter by status (all, unlabeled, labeled, auto_labeled, verified) and by class.",
        "Image Grid: Thumbnails with status badges and annotation previews.",
        "Review Canvas: Full-size image with bounding box overlays in class-specific colors.",
    ])

    pdf.section_title("Review Actions")
    pdf.numbered_list([
        "Select an image from the grid or use Previous/Next navigation.",
        "Inspect annotations: Each bounding box is drawn with its class color and label.",
        "Verify: Click 'Verify' to approve the annotations. The image status changes to 'verified' (green badge).",
        "Reject: Click 'Reject' to flag the image for re-annotation.",
        "Re-annotate: Click 'Re-annotate' to open the inline editor and modify annotations.",
        "Bulk actions: Select multiple images using checkboxes and bulk-verify or bulk-reject.",
    ])

    pdf.section_title("Re-annotation Editor")
    pdf.body_text(
        "The inline editor opens a full canvas overlay where you can:\n"
        "- View existing annotations as colored bounding boxes\n"
        "- Delete individual annotations by clicking the X next to each\n"
        "- Draw new bounding boxes by clicking and dragging\n"
        "- Select different classes from the class palette\n"
        "- Click 'Save Annotations' to persist changes"
    )
    pdf.screenshot_placeholder("Label Review", "Image grid with status badges, review canvas with bounding boxes, verify/reject buttons")

    # ══════════════════════════════════════════════════════════════════════════
    #  CHAPTER 12: MODEL DEVELOPMENT
    # ══════════════════════════════════════════════════════════════════════════
    pdf.chapter_title("Model Development & Training")

    pdf.body_text(
        "The Model Development module manages the complete model training lifecycle, from dataset "
        "selection through training execution, log monitoring, and model validation."
    )

    pdf.section_title("Starting a Training Job")
    pdf.numbered_list([
        "Click 'Start Training' to open the training configuration modal.",
        "Select a Dataset: Choose from available labeled datasets. Only datasets with labeled images appear.",
        "Select Model Type: YOLOv8n (nano), YOLOv8s (small), YOLOv8m (medium), YOLOv8l (large), YOLOv8x (extra-large), or TensorFlow.",
        "Set Epochs: Number of training iterations (default: 50).",
        "Set Batch Size: Images per batch (default: 16, reduce for limited memory).",
        "Set Image Size: Training image resolution (default: 640px).",
        "Select Device: CPU or GPU (if NVIDIA CUDA is available).",
        "Click 'Start Training' to launch the job.",
    ])

    pdf.section_title("Monitoring Training")
    pdf.body_text(
        "Active training jobs show real-time status:"
    )
    pdf.bullet_list([
        "Status Badge: Running (blue, animated), Queued (yellow), Completed (green), Failed (red), Cancelled (gray)",
        "Progress Bar: Visual percentage of completion",
        "Auto-Refresh: Running jobs automatically poll every 3 seconds for updates",
        "View Logs: Click 'Logs' to see real-time training output in a terminal-style panel",
        "Metrics: Upon completion, view Precision, Recall, mAP@0.5, and mAP@0.5:0.95",
    ])

    pdf.section_title("Training Job Card Details")
    pdf.table(
        ["Field", "Description"],
        [
            ["Job ID", "Unique identifier for the training job"],
            ["Model Type", "Architecture used (YOLOv8n, TensorFlow, etc.)"],
            ["Dataset ID", "Reference to the training dataset"],
            ["Status", "Current job status with icon"],
            ["Epochs", "Number of training iterations"],
            ["Batch Size", "Images per training batch"],
            ["Image Size", "Training resolution"],
            ["Device", "CPU or GPU"],
            ["Precision", "Model precision metric (on completion)"],
            ["Recall", "Model recall metric (on completion)"],
            ["mAP@0.5", "Mean Average Precision at 0.5 IoU"],
            ["mAP@0.5:0.95", "Mean Average Precision at 0.5-0.95 IoU"],
            ["Output Dir", "Path to trained model weights"],
        ],
        [45, 125]
    )

    pdf.section_title("Model Validation")
    pdf.body_text(
        "After training completes, validate the model against a test dataset:"
    )
    pdf.numbered_list([
        "Click the 'Validate' button on a completed training job.",
        "Select the validation dataset (can be different from training data).",
        "Set confidence threshold (default: 0.25) and IoU threshold (default: 0.6).",
        "Click 'Run Validation' to evaluate the model.",
        "Results show detailed metrics: Precision, Recall, mAP@0.5, mAP@0.5:0.95, and per-class performance.",
    ])

    pdf.section_title("Job Actions")
    pdf.bullet_list([
        "View Logs: See full training output log",
        "View Chart: Visualize training loss curves",
        "Download: Download trained model weights",
        "Re-run: Create a new job with the same parameters",
        "Delete: Remove the job and its output files",
    ])
    pdf.screenshot_placeholder("Model Development", "Training jobs list with status badges, log viewer panel, training modal with parameters")

    # ══════════════════════════════════════════════════════════════════════════
    #  CHAPTER 13: MODEL BENCHMARK
    # ══════════════════════════════════════════════════════════════════════════
    pdf.chapter_title("Model Benchmark")

    pdf.body_text(
        "The Model Benchmark module enables side-by-side comparison of multiple trained models "
        "on the same dataset to identify the best-performing model for deployment."
    )

    pdf.section_title("Running a Benchmark")
    pdf.numbered_list([
        "Open the 'Select Models' panel to see all trained models from completed training jobs.",
        "Each model card shows: Job ID, model type, framework (PyTorch/TensorFlow), and training date.",
        "Select 2 or more models by clicking their cards (checkmark appears).",
        "Select a benchmark dataset from the dropdown.",
        "Click 'Run Benchmark' to start the evaluation.",
        "A progress bar shows percentage completion during evaluation.",
        "Results appear in a comparison table upon completion.",
    ])

    pdf.section_title("Benchmark Metrics")
    pdf.table(
        ["Metric", "Description", "Visual"],
        [
            ["mAP@0.5", "Mean Average Precision at IoU 0.5", "Blue progress bar"],
            ["mAP@0.5:0.95", "Mean Average Precision 0.5-0.95", "Purple progress bar"],
            ["Precision", "True positives / (True + False positives)", "Green progress bar"],
            ["Recall", "True positives / (True + False negatives)", "Amber progress bar"],
            ["Speed (ms)", "Inference time per image", "Purple bar (inverted)"],
        ],
        [45, 85, 40]
    )

    pdf.body_text(
        "The results table is sortable by any metric. Click a column header to sort. "
        "The winner (highest mAP@0.5) is highlighted with a gold crown icon. "
        "Per-class breakdown is available in the expandable details section."
    )
    pdf.screenshot_placeholder("Model Benchmark", "Model selection grid, dataset picker, results comparison table with metric bars")

    # ══════════════════════════════════════════════════════════════════════════
    #  CHAPTER 14: MODEL DEPLOYMENT
    # ══════════════════════════════════════════════════════════════════════════
    pdf.chapter_title("Model Deployment")

    pdf.body_text(
        "The Model Deployment module manages the lifecycle of AI models deployed to edge stations "
        "for real-time inference."
    )

    pdf.section_title("Creating a Deployment")
    pdf.numbered_list([
        "Click 'New Deployment' to open the deployment modal.",
        "Select a model from the available models list (PPE Detection, Safety Zone, etc.).",
        "Select one or more target stations from the station grid (Station A-01 through D-04).",
        "Click 'Deploy' to create the deployment in 'stopped' status.",
    ])

    pdf.section_title("Deployment Card Metrics")
    pdf.table(
        ["Metric", "Description"],
        [
            ["Model Name", "Deployed model identifier"],
            ["Status", "running (green) or stopped (gray)"],
            ["Stations", "List of stations where model is deployed"],
            ["FPS", "Frames per second processing rate"],
            ["Latency", "Inference latency per frame"],
            ["Uptime", "Deployment uptime percentage"],
            ["Detections", "Total detections since deployment"],
        ],
        [50, 120]
    )

    pdf.section_title("Deployment Actions")
    pdf.bullet_list([
        "Start: Begin inference on all assigned stations",
        "Stop: Halt inference (with confirmation)",
        "Configure: Open settings modal for threshold, resolution, and station adjustments",
        "Delete: Remove the deployment entirely",
    ])
    pdf.screenshot_placeholder("Model Deployment", "Deployment cards with metrics, station grid, available models panel")

    # ══════════════════════════════════════════════════════════════════════════
    #  CHAPTER 15: ANALYTICS
    # ══════════════════════════════════════════════════════════════════════════
    pdf.chapter_title("Analytics Dashboard")

    pdf.body_text(
        "The Analytics Dashboard provides comprehensive data visualization and insights "
        "from all detection events, alerts, and camera activity across the platform."
    )

    pdf.section_title("Overview Statistics")
    pdf.bullet_list([
        "Total Detections: Cumulative detection events across all cameras and time",
        "Total Alerts: All alerts generated by the system",
        "Unresolved Alerts: Alerts still requiring attention",
        "Event Types: Number of distinct event categories",
    ])

    pdf.section_title("Charts")
    pdf.bullet_list([
        "Detections Over Time (Line Chart): 7-day trend of daily detections",
        "Camera Activity (Bar Chart): Per-camera detection counts (top 6)",
        "Top Detected Objects (Pie Chart): Distribution of most frequently detected object classes",
        "System Health (Radar Chart): Multi-axis performance view covering Accuracy, Speed, Reliability, Coverage, and Response",
        "Events by Type (Table): Detailed breakdown with count, share percentage, and progress bars",
    ])
    pdf.screenshot_placeholder("Analytics Dashboard", "Stats cards, line chart, bar chart, pie chart, radar chart, events table")

    # ══════════════════════════════════════════════════════════════════════════
    #  CHAPTER 16: ALERTS
    # ══════════════════════════════════════════════════════════════════════════
    pdf.chapter_title("Alert Management")

    pdf.body_text(
        "The Alert Management page provides a centralized view of all system alerts "
        "with filtering, severity classification, and workflow actions."
    )

    pdf.section_title("Alert Summary Cards")
    pdf.table(
        ["Card", "Color", "Description"],
        [
            ["Critical", "Red", "Alerts for PPE violations, fall risks, emergency events"],
            ["Warning", "Yellow", "Zone breaches, hazard proximity, equipment warnings"],
            ["Info", "Blue", "Informational events, compliance checks"],
            ["Resolved", "Green", "Successfully addressed alerts"],
        ],
        [40, 30, 100]
    )

    pdf.section_title("Filtering Alerts")
    pdf.body_text("Use the filter bar to narrow down alerts by Type (Critical/Warning/Info) and Status (Active/Acknowledged/Resolved). Click Refresh to reload from the backend.")

    pdf.section_title("Alert Actions")
    pdf.numbered_list([
        "Acknowledge: Mark an alert as seen/being handled. Status changes from 'active' to 'acknowledged'.",
        "Resolve: Close the alert after the issue is addressed. Status changes to 'resolved'.",
        "View Details: See full alert information including camera, event type, detection time, and associated detections.",
    ])

    pdf.section_title("Alert Severity Classification")
    pdf.body_text(
        "The system automatically classifies alert severity based on the alert type:\n"
        "- Critical: PPE violations, fall detections, emergency events\n"
        "- Warning: Zone intrusions, hazard proximity, equipment issues\n"
        "- Info: Compliance verifications, routine checks"
    )
    pdf.screenshot_placeholder("Alert Management", "Summary cards, filter bar, alert list with severity icons and action buttons")

    # ══════════════════════════════════════════════════════════════════════════
    #  CHAPTER 17: REPORTS
    # ══════════════════════════════════════════════════════════════════════════
    pdf.chapter_title("Reports")

    pdf.body_text(
        "The Reports module provides comprehensive report generation, scheduling, and management "
        "for safety, quality, performance, incident, and technical audits."
    )

    pdf.section_title("Report Types")
    pdf.table(
        ["Type", "Color", "Example"],
        [
            ["Safety", "Blue", "Weekly Safety Report"],
            ["Quality", "Green", "Monthly Quality Metrics"],
            ["Performance", "Amber", "Station Performance Analysis"],
            ["Incident", "Red", "Incident Summary Report"],
            ["Technical", "Purple", "Model Accuracy Report"],
        ],
        [40, 30, 100]
    )

    pdf.section_title("Generating a Report")
    pdf.numbered_list([
        "Click 'Generate Report' in the header.",
        "Enter the report name.",
        "Select the report type from the dropdown.",
        "Select the project scope (specific project or 'All Projects').",
        "Set the reporting period.",
        "Click 'Generate' to create the report. Status shows 'generating' while processing.",
        "After generation completes (~3 seconds), status changes to 'completed' with file size.",
    ])

    pdf.section_title("Report Actions")
    pdf.bullet_list([
        "View: Open the report in the built-in viewer",
        "Download: Download the report file (PDF format)",
        "Delete: Remove the report permanently",
    ])

    pdf.section_title("Report Templates")
    pdf.body_text(
        "Pre-configured templates for common report schedules:\n"
        "- Daily Safety Summary (Safety Team)\n"
        "- Weekly Performance Report (Management)\n"
        "- Monthly Analytics (All Stakeholders)\n"
        "- Quarterly Review (Executive Team)"
    )
    pdf.screenshot_placeholder("Reports Page", "Report list with status badges, type filters, generate report modal, project stats table")

    # ══════════════════════════════════════════════════════════════════════════
    #  CHAPTER 18: AI AGENT BUILDER
    # ══════════════════════════════════════════════════════════════════════════
    pdf.chapter_title("AI Agent Builder (Agentic AI)")

    pdf.body_text(
        "The AI Agent Builder is a conversational agentic AI system that guides you through "
        "building a complete computer vision project pipeline via natural-language chat. Instead "
        "of manually navigating through multiple configuration screens, the agent walks you through "
        "every step in a friendly, conversational manner."
    )

    pdf.section_title("How It Works")
    pdf.body_text(
        "The agent operates in two phases:\n\n"
        "Phase 1 - Information Gathering: The agent asks you a series of questions across 10 topics, "
        "collecting all the details needed for your project. Each question builds on the previous "
        "answer.\n\n"
        "Phase 2 - Auto-Execution: After you review and confirm the collected information, the agent "
        "automatically creates all resources via backend API calls in the correct order."
    )

    pdf.section_title("Gathering Phases (10 Steps)")
    pdf.table(
        ["Phase", "Topic", "What the Agent Asks"],
        [
            ["1", "Project Name", "What would you like to call this project?"],
            ["2", "Organization", "Company name, business unit, product line"],
            ["3", "Geography", "Country, state, city, site/plant location"],
            ["4", "Use Case", "Name, type (safety/quality), priority, description"],
            ["5", "Data Storage", "Database name, type, host, port, credentials"],
            ["6", "Edge Device", "Device name, location, IP, platform, GPU"],
            ["7", "Camera Setup", "Camera name, location, IP, RTSP URL, resolution"],
            ["8", "LLM/SLM", "Model name, provider, type, endpoint (optional)"],
            ["9", "Dataset", "Dataset name, classes, image upload (optional)"],
            ["10", "Review", "Full summary of all collected information"],
        ],
        [20, 40, 110]
    )

    pdf.section_title("Review & Confirmation")
    pdf.body_text(
        "After gathering all information, the agent presents a comprehensive review summary "
        "with all details organized by category. You can:\n"
        "- Confirm: Proceed with auto-execution of all steps\n"
        "- Request Changes: Tell the agent what to modify in natural language\n"
        "- The agent regenerates the review with your changes applied"
    )

    pdf.section_title("Auto-Execution Steps (7 Steps)")
    pdf.table(
        ["Step", "Action", "API Called"],
        [
            ["1", "Create Project", "POST /api/projects/"],
            ["2", "Create Use Case", "POST /api/projects/{id}/use-cases/"],
            ["3", "Create Dataset", "POST /api/label-datasets/"],
            ["4", "Create Camera", "POST /api/cameras/"],
            ["5", "Create Edge Device", "POST /api/edge-devices/"],
            ["6", "Create DB Config", "POST /api/config/databases/"],
            ["7", "Create LLM Config", "POST /api/config/llms/"],
        ],
        [20, 50, 100]
    )

    pdf.section_title("Chat Interface Features")
    pdf.bullet_list([
        "Bot Avatar: Sky-blue gradient circle with robot icon",
        "User Avatar: Dark gray circle with 'You' text",
        "Markdown Rendering: Bold, links, code blocks, numbered/bulleted lists",
        "Thinking Indicator: Bouncing sky-blue dots with 'Working on it...' text",
        "Progress Tracker: Left panel showing all 10+ phases with completion indicators",
        "Session Management: Create new sessions, view history, delete old sessions",
        "Quick Actions: Suggested next steps appear as clickable cards below messages",
        "Image Upload: Drag-and-drop or click-to-upload images for dataset creation",
    ])

    pdf.section_title("Using the Agent")
    pdf.numbered_list([
        "Navigate to 'AI Agent Builder' in the sidebar (marked NEW).",
        "Click 'New Session' to start a fresh conversation.",
        "The agent greets you and asks for your project name.",
        "Reply naturally in the chat input at the bottom.",
        "Answer each question — the phase tracker on the left updates in real-time.",
        "At the review step, inspect all details. Type 'yes' or 'confirm' to proceed.",
        "The agent creates all 7 resources automatically, showing progress for each step.",
        "Upon completion, the agent provides links to all created resources.",
        "Navigate to the project, use case, or workflow builder directly from the chat.",
    ])

    pdf.tip_box("You can request changes at the review step by saying something like 'Change the camera IP to 192.168.1.50' and the agent will update accordingly.")
    pdf.screenshot_placeholder("AI Agent Builder", "Chat interface with bot messages, user replies, progress tracker, quick actions")

    # ══════════════════════════════════════════════════════════════════════════
    #  CHAPTER 19: END-TO-END PROJECT BUILD GUIDE
    # ══════════════════════════════════════════════════════════════════════════
    pdf.chapter_title("End-to-End Project Build Guide")

    pdf.body_text(
        "This chapter provides a complete step-by-step walkthrough for building a computer vision "
        "project from scratch, covering every stage of the pipeline."
    )

    pdf.section_title("Method 1: Manual Build (Through UI)")

    pdf.sub_section("Step 1: Set Up Hierarchy")
    pdf.numbered_list([
        "Go to 'Hierarchy Setup' in the sidebar.",
        "Add your company under Business Hierarchy (e.g., 'Acme Manufacturing').",
        "Add a Manufacturing Unit (e.g., 'Plant Mumbai').",
        "Add a Product Line (e.g., 'Electronic Components').",
        "Switch to Geography tab and add Country > State > City > Site.",
    ])

    pdf.sub_section("Step 2: Create a Project")
    pdf.numbered_list([
        "Go to 'Projects & Use Cases' in the sidebar.",
        "Click 'New Project'.",
        "Enter name: 'Factory Safety Monitoring'.",
        "Set status to 'Active'.",
        "Fill in business hierarchy: Acme Manufacturing > Plant Mumbai > Electronic Components.",
        "Fill in geography: India > Maharashtra > Mumbai > Plant-A Building 1.",
        "Click Save.",
    ])

    pdf.sub_section("Step 3: Create a Use Case")
    pdf.numbered_list([
        "From the project card, click 'Use Cases'.",
        "Click 'New Use Case'.",
        "Enter name: 'PPE Compliance Detection'.",
        "Type: safety, Priority: high, Status: active.",
        "Click Save.",
    ])

    pdf.sub_section("Step 4: Configure Infrastructure")
    pdf.numbered_list([
        "Go to 'Configuration' in the sidebar.",
        "Cameras tab: Add cameras with names, locations, RTSP URLs.",
        "Edge Devices tab: Register edge nodes with IP addresses and GPU info.",
        "Database tab: Add MySQL/PostgreSQL connection for storing detections.",
        "Model Repo tab: Register model paths and frameworks.",
        "LLM Repo tab: (Optional) Configure LLM for intelligent analysis.",
    ])

    pdf.sub_section("Step 5: Create & Label a Dataset")
    pdf.numbered_list([
        "Go to 'Labeling Platform' in the sidebar.",
        "Click 'New Dataset'. Name it 'PPE Detection Dataset v1'.",
        "Add classes: 'helmet', 'no_helmet', 'vest', 'no_vest'.",
        "Upload training images (JPG/PNG files).",
        "Switch to 'Manual Labeling' tab.",
        "Select the dataset, then annotate each image by drawing bounding boxes around objects.",
        "Select the appropriate class for each bounding box.",
        "Click 'Save Annotations' after labeling each image.",
        "Alternatively, run Auto-Label to generate initial annotations, then review in Label Review.",
    ])

    pdf.sub_section("Step 6: Review Labels")
    pdf.numbered_list([
        "Go to 'Label Review' in the sidebar.",
        "Select your dataset.",
        "Review each image: verify correct annotations, reject wrong ones.",
        "Re-annotate any images that need corrections.",
        "Mark all reviewed images as 'Verified'.",
    ])

    pdf.sub_section("Step 7: Train a Model")
    pdf.numbered_list([
        "Go to 'Model Development' in the sidebar.",
        "Click 'Start Training'.",
        "Select your labeled dataset.",
        "Choose model: YOLOv8n (for fast training) or YOLOv8m (for higher accuracy).",
        "Set epochs: 50 (recommended for initial training).",
        "Set batch size: 16 (reduce to 8 if limited memory).",
        "Device: CPU or GPU.",
        "Click 'Start Training' and monitor progress.",
        "View logs in real-time. Wait for 'Completed' status.",
        "Review final metrics: Precision, Recall, mAP@0.5, mAP@0.5:0.95.",
    ])

    pdf.sub_section("Step 8: Benchmark Models (Optional)")
    pdf.numbered_list([
        "Go to 'Model Benchmark' in the sidebar.",
        "Select 2+ trained models for comparison.",
        "Select a test dataset.",
        "Run benchmark and compare metrics side-by-side.",
        "Identify the best model based on mAP and speed.",
    ])

    pdf.sub_section("Step 9: Deploy the Model")
    pdf.numbered_list([
        "Go to 'Model Deployment' in the sidebar.",
        "Click 'New Deployment'.",
        "Select your trained model.",
        "Choose target stations.",
        "Create deployment, then click 'Start' to begin inference.",
        "Monitor FPS, latency, uptime, and detection counts.",
    ])

    pdf.sub_section("Step 10: Build a Workflow")
    pdf.numbered_list([
        "Go back to your Use Case and click 'Open Workflow'.",
        "Create a new workflow.",
        "Drag nodes onto the canvas: Camera -> Edge Device -> AI Model -> Alert -> Database -> Log.",
        "Connect nodes following DAG rules.",
        "Configure each node with your actual cameras, devices, models, and databases.",
        "Add alert rules for detection conditions.",
        "Save and run the workflow.",
    ])

    pdf.sub_section("Step 11: Monitor & Respond")
    pdf.numbered_list([
        "Check 'Vision Dashboard' for real-time monitoring.",
        "Review 'Analytics' for trends and insights.",
        "Manage 'Alerts' — acknowledge and resolve as needed.",
        "Generate 'Reports' for stakeholder communication.",
    ])

    pdf.section_title("Method 2: AI Agent Build (Automated)")
    pdf.body_text(
        "For a much faster approach, use the AI Agent Builder to create your entire project "
        "pipeline through conversation:"
    )
    pdf.numbered_list([
        "Go to 'AI Agent Builder' in the sidebar.",
        "Click 'New Session'.",
        "Answer the agent's 10 questions about your project (project name, organization, geography, use case, database, edge device, camera, LLM, dataset).",
        "Review the auto-generated summary.",
        "Confirm to let the agent create everything automatically.",
        "The agent creates: Project, Use Case, Dataset, Camera, Edge Device, DB Config, and LLM Config in under 30 seconds.",
        "Follow the provided links to continue with labeling, training, and deployment using the manual steps above.",
    ])

    pdf.info_box("COMPARISON", "Manual Build: ~30 minutes for full setup | Agent Build: ~5 minutes for initial setup. The agent handles infrastructure creation; you still need to upload images, label data, and train models manually.", DARK_SKY)
    pdf.screenshot_placeholder("End-to-End Flow", "Complete pipeline: Project -> Use Case -> Dataset -> Label -> Train -> Benchmark -> Deploy -> Monitor")

    # ══════════════════════════════════════════════════════════════════════════
    #  CHAPTER 20: TROUBLESHOOTING
    # ══════════════════════════════════════════════════════════════════════════
    pdf.chapter_title("Troubleshooting & FAQ")

    pdf.section_title("Common Issues")
    pdf.table(
        ["Issue", "Cause", "Solution"],
        [
            ["Flask won't start", "Port 5000 in use", "Kill process on port 5000: Stop-Process by PID"],
            ["CORS errors", "Frontend/backend mismatch", "Ensure Flask CORS is enabled for *"],
            ["Training fails", "Insufficient labels", "Need minimum 5 labeled images per class"],
            ["Auto-label slow", "Large dataset", "Use GPU or reduce image count per batch"],
            ["IST timestamps wrong", "Server timezone", "Platform forces UTC+5:30 in code"],
            ["Agent session stuck", "Phase mismatch", "Delete session and create a new one"],
            ["Images not loading", "Upload path issue", "Check uploads/ directory permissions"],
            ["308 Redirect errors", "Trailing slash", "Add trailing / to API URLs"],
        ],
        [42, 45, 83]
    )

    pdf.section_title("Frequently Asked Questions")

    pdf.sub_section("Q: What image formats are supported for labeling?")
    pdf.body_text("JPG, JPEG, and PNG formats are supported. Images are stored in the uploads/images/{dataset_id}/ directory.")

    pdf.sub_section("Q: Can I train TensorFlow models?")
    pdf.body_text("Yes. TensorFlow training runs in a separate virtual environment (C:\\tf_env by default) via subprocess. Select 'TensorFlow' as the model type when starting training.")

    pdf.sub_section("Q: How does the AI Agent know what to create?")
    pdf.body_text("The agent follows a pre-defined 10-phase gathering protocol. Each phase collects specific information and stores it in the session config JSON. On confirmation, the agent reads the config and calls the appropriate REST APIs to create each resource.")

    pdf.sub_section("Q: Can I use the platform without GPU?")
    pdf.body_text("Yes. Set device to 'cpu' during training. YOLOv8n (nano) model trains reasonably on CPU. For production, GPU is recommended for faster inference.")

    pdf.sub_section("Q: What database does the platform use?")
    pdf.body_text("The platform uses MySQL 8.4 for persistent storage via SQLAlchemy ORM. The database name is 'vision_platform_db'. Tables are auto-created on first run.")

    pdf.sub_section("Q: How are timestamps handled?")
    pdf.body_text("All timestamps are stored in UTC and converted to IST (UTC+5:30) for display. The backend uses Python's timezone(timedelta(hours=5, minutes=30)) for conversion. The frontend formats dates using 'en-IN' locale with 'Asia/Kolkata' timezone.")

    pdf.sub_section("Q: Can multiple users work simultaneously?")
    pdf.body_text("Yes. The platform is stateless on the frontend (React SPA) and the Flask backend handles concurrent API requests. Each user's agent sessions are independently tracked in the database.")

    pdf.sub_section("Q: How do I export labeled datasets?")
    pdf.body_text("In the Labeling Platform, click the 'Export' button on any dataset. This downloads a ZIP file containing images and YOLO-format annotation files (.txt) ready for training.")

    # ══════════════════════════════════════════════════════════════════════════
    #  BACK COVER
    # ══════════════════════════════════════════════════════════════════════════
    pdf.add_page()
    pdf.set_fill_color(*NAVY)
    pdf.rect(0, 0, 210, 297, 'F')
    pdf.set_fill_color(*SKY)
    pdf.rect(0, 0, 210, 4, 'F')

    pdf.set_font('Helvetica', 'B', 24)
    pdf.set_text_color(*WHITE)
    pdf.set_xy(20, 100)
    pdf.cell(170, 14, 'Industrial AI', align='C')
    pdf.set_font('Helvetica', '', 16)
    pdf.set_text_color(*SKY)
    pdf.set_xy(20, 118)
    pdf.cell(170, 10, 'Vision Platform', align='C')

    pdf.set_font('Helvetica', '', 11)
    pdf.set_text_color(148, 163, 184)
    pdf.set_xy(20, 145)
    pdf.cell(170, 8, 'Enterprise Computer Vision Solution', align='C')
    pdf.set_xy(20, 155)
    pdf.cell(170, 8, 'for Industrial Safety & Quality Control', align='C')

    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(100, 116, 139)
    pdf.set_xy(20, 180)
    pdf.cell(170, 7, 'Version 2.4.1  |  April 2026', align='C')
    pdf.set_xy(20, 188)
    pdf.cell(170, 7, 'Confidential  |  For Internal Use Only', align='C')

    pdf.set_fill_color(*SKY)
    pdf.rect(0, 293, 210, 4, 'F')

    # ── Save ──────────────────────────────────────────────────────────────────
    pdf.output(OUTPUT_PATH)
    print(f"\n{'='*60}")
    print(f"  User Manual Generated Successfully!")
    print(f"  Output: {OUTPUT_PATH}")
    print(f"  Pages: {pdf.page_no()}")
    print(f"  Chapters: {pdf.chapter_num}")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    build_manual()
