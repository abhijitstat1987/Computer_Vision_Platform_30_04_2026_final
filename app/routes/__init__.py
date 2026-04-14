from flask import Flask


def register_blueprints(app: Flask) -> None:
    from .dashboard          import dashboard_bp
    from .cameras            import cameras_bp
    from .detections         import detections_bp
    from .alerts             import alerts_bp
    from .analytics          import analytics_bp
    from .snapshots          import snapshots_bp
    from .projects           import projects_bp
    from .use_cases          import use_cases_bp
    from .edge_devices       import edge_devices_bp
    from .experiments        import experiments_bp
    from .model_deployments  import model_deployments_bp
    from .db_configs         import db_configs_bp
    from .model_configs      import model_configs_bp
    from .log_configs        import log_configs_bp
    from .llm_configs        import llm_configs_bp
    from .label_datasets     import label_datasets_bp
    from .label_images       import label_images_bp, label_img_static
    from .label_annotations  import label_annotations_bp
    from .training           import training_bp
    from .inference          import inference_bp
    from .label_review       import label_review_bp
    from .benchmark          import benchmark_bp
    from .llm_analytics      import llm_analytics_bp
    from .llm_training       import llm_training_bp
    from .chat               import chat_bp
    from .agent              import agent_bp

    app.register_blueprint(dashboard_bp,          url_prefix="/api")
    app.register_blueprint(cameras_bp,            url_prefix="/api/cameras")
    app.register_blueprint(detections_bp,         url_prefix="/api/detections")
    app.register_blueprint(alerts_bp,             url_prefix="/api/alerts")
    app.register_blueprint(analytics_bp,          url_prefix="/api/analytics")
    app.register_blueprint(snapshots_bp,          url_prefix="/uploads")
    app.register_blueprint(projects_bp,           url_prefix="/api/projects")
    app.register_blueprint(use_cases_bp,          url_prefix="/api")
    app.register_blueprint(edge_devices_bp,       url_prefix="/api/edge-devices")
    app.register_blueprint(experiments_bp,        url_prefix="/api/experiments")
    app.register_blueprint(model_deployments_bp,  url_prefix="/api/model-deployments")
    app.register_blueprint(db_configs_bp,         url_prefix="/api/config/databases")
    app.register_blueprint(model_configs_bp,      url_prefix="/api/config/models")
    app.register_blueprint(log_configs_bp,        url_prefix="/api/config/logs")
    app.register_blueprint(llm_configs_bp,        url_prefix="/api/config/llms")
    app.register_blueprint(label_datasets_bp,     url_prefix="/api/label-datasets")
    app.register_blueprint(label_images_bp,       url_prefix="/api/label-datasets")
    app.register_blueprint(label_annotations_bp,  url_prefix="/api/label-datasets")
    app.register_blueprint(label_img_static,      url_prefix="/uploads")
    app.register_blueprint(training_bp,           url_prefix="/api/training")
    app.register_blueprint(inference_bp,          url_prefix="/api/inference")
    app.register_blueprint(label_review_bp,       url_prefix="/api/label-datasets")
    app.register_blueprint(benchmark_bp,          url_prefix="/api/benchmark")
    app.register_blueprint(llm_analytics_bp,      url_prefix="/api/llm")
    app.register_blueprint(llm_training_bp,       url_prefix="/api/llm/training")
    app.register_blueprint(chat_bp,               url_prefix="/api/chat")
    app.register_blueprint(agent_bp,              url_prefix="/api/agent")
