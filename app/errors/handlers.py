from flask import jsonify
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError


def register_error_handlers(app):

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"success": False, "message": str(e)}), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "message": "Resource not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"success": False, "message": "Method not allowed"}), 405

    @app.errorhandler(500)
    def internal_error(e):
        from app.extensions import db
        db.session.rollback()
        return jsonify({"success": False, "message": "Internal server error"}), 500

    @app.errorhandler(ValidationError)
    def handle_validation(e):
        return jsonify({
            "success": False,
            "message": "Validation failed",
            "errors":  e.messages,
        }), 422

    @app.errorhandler(IntegrityError)
    def handle_integrity(e):
        from app.extensions import db
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Database integrity error",
            "errors":  str(e.orig),
        }), 409
