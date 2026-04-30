from enum import Enum, auto
from datetime import datetime
from typing import List, Optional

class ApprovalStatus(Enum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class ApprovalStep:
    def __init__(self, step_name: str, approver: str, status: ApprovalStatus = ApprovalStatus.PENDING, comment: Optional[str] = None, decided_at: Optional[datetime] = None):
        self.step_name = step_name
        self.approver = approver
        self.status = status
        self.comment = comment
        self.decided_at = decided_at

    def to_dict(self):
        return {
            "step_name": self.step_name,
            "approver": self.approver,
            "status": self.status.value,
            "comment": self.comment,
            "decided_at": self.decided_at.isoformat() if self.decided_at else None
        }

class ApprovalRequest:
    def __init__(self, id: int, flow_id: int, requested_by: str, steps: List[ApprovalStep], status: ApprovalStatus = ApprovalStatus.PENDING, created_at: Optional[datetime] = None, completed_at: Optional[datetime] = None):
        self.id = id
        self.flow_id = flow_id
        self.requested_by = requested_by
        self.steps = steps
        self.status = status
        self.created_at = created_at or datetime.utcnow()
        self.completed_at = completed_at

    def to_dict(self):
        return {
            "id": self.id,
            "flow_id": self.flow_id,
            "requested_by": self.requested_by,
            "steps": [s.to_dict() for s in self.steps],
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None
        }

    def advance_step(self, approver: str, approve: bool, comment: Optional[str] = None):
        for step in self.steps:
            if step.status == ApprovalStatus.PENDING and step.approver == approver:
                step.status = ApprovalStatus.APPROVED if approve else ApprovalStatus.REJECTED
                step.comment = comment
                step.decided_at = datetime.utcnow()
                break
        self.update_status()

    def update_status(self):
        if any(s.status == ApprovalStatus.REJECTED for s in self.steps):
            self.status = ApprovalStatus.REJECTED
            self.completed_at = datetime.utcnow()
        elif all(s.status == ApprovalStatus.APPROVED for s in self.steps):
            self.status = ApprovalStatus.APPROVED
            self.completed_at = datetime.utcnow()
        elif any(s.status == ApprovalStatus.IN_REVIEW for s in self.steps):
            self.status = ApprovalStatus.IN_REVIEW
        else:
            self.status = ApprovalStatus.PENDING
