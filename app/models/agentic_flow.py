from typing import List, Dict, Optional
from datetime import datetime

class AgenticFlowStep:
    def __init__(self, id: int, name: str, type: str, config: Dict, depends_on: Optional[List[int]] = None, status: str = "pending", result: Optional[Dict] = None):
        self.id = id
        self.name = name
        self.type = type  # e.g., 'task', 'approval', 'llm', 'deploy', etc.
        self.config = config
        self.depends_on = depends_on or []
        self.status = status  # pending, running, completed, failed, waiting_approval
        self.result = result or {}

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "config": self.config,
            "depends_on": self.depends_on,
            "status": self.status,
            "result": self.result
        }

class AgenticFlow:
    def __init__(self, id: int, name: str, created_by: str, steps: List[AgenticFlowStep], status: str = "created", created_at: Optional[datetime] = None, updated_at: Optional[datetime] = None):
        self.id = id
        self.name = name
        self.created_by = created_by
        self.steps = steps
        self.status = status  # created, running, completed, failed, waiting_approval
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "created_by": self.created_by,
            "steps": [s.to_dict() for s in self.steps],
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }

    def get_next_steps(self):
        # Return steps that are pending and whose dependencies are completed
        completed = {s.id for s in self.steps if s.status == "completed"}
        return [s for s in self.steps if s.status == "pending" and all(d in completed for d in s.depends_on)]

    def update_step_status(self, step_id: int, status: str, result: Optional[Dict] = None):
        for s in self.steps:
            if s.id == step_id:
                s.status = status
                if result:
                    s.result = result
                self.updated_at = datetime.utcnow()
                break
        self.status = self._compute_flow_status()

    def _compute_flow_status(self):
        if any(s.status == "failed" for s in self.steps):
            return "failed"
        if all(s.status == "completed" for s in self.steps):
            return "completed"
        if any(s.status == "waiting_approval" for s in self.steps):
            return "waiting_approval"
        if any(s.status == "running" for s in self.steps):
            return "running"
        return "created"
