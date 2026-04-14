from datetime import datetime, timezone, timedelta
from flask import jsonify

# IST = UTC + 5:30
IST = timezone(timedelta(hours=5, minutes=30))


def to_ist(dt: datetime) -> str:
    """Convert a naive-UTC or aware datetime to IST ISO-format string."""
    if dt is None:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IST).isoformat()


def to_ist_display(dt: datetime) -> str:
    """Convert to a human-readable IST string like '14 Apr 2026, 03:42 PM IST'."""
    if dt is None:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    ist_dt = dt.astimezone(IST)
    return ist_dt.strftime("%d %b %Y, %I:%M %p IST")


def success(data=None, message: str = "OK", status_code: int = 200, pagination=None):
    """Return a standardised success JSON response."""
    body = {"success": True, "message": message, "data": data}
    if pagination is not None:
        body["pagination"] = pagination
    return jsonify(body), status_code


def error(message: str = "An error occurred", status_code: int = 400, errors=None):
    """Return a standardised error JSON response."""
    body = {"success": False, "message": message}
    if errors is not None:
        body["errors"] = errors
    return jsonify(body), status_code
