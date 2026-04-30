from datetime import datetime

class Approval:
    def __init__(self, id, flow_id, requested_by, status="pending", approved_by=None, requested_at=None, decided_at=None, reason=None):
        self.id = id
        self.flow_id = flow_id
        self.requested_by = requested_by
        self.status = status  # pending, approved, rejected
        self.approved_by = approved_by
        self.requested_at = requested_at or datetime.utcnow()
        self.decided_at = decided_at
        self.reason = reason

    def to_dict(self):
        return {
            "id": self.id,
            "flow_id": self.flow_id,
            "requested_by": self.requested_by,
            "status": self.status,
            "approved_by": self.approved_by,
            "requested_at": self.requested_at.isoformat(),
            "decided_at": self.decided_at.isoformat() if self.decided_at else None,
            "reason": self.reason
        }

class AuditLog:
    def __init__(self, id, flow_id, action, user, timestamp=None, details=None):
        self.id = id
        self.flow_id = flow_id
        self.action = action  # created, updated, approved, rejected, etc.
        self.user = user
        self.timestamp = timestamp or datetime.utcnow()
        self.details = details

    def to_dict(self):
        return {
            "id": self.id,
            "flow_id": self.flow_id,
            "action": self.action,
            "user": self.user,
            "timestamp": self.timestamp.isoformat(),
            "details": self.details
        }
}