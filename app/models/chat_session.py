from datetime import datetime
from app.extensions import db
from app.utils.response import to_ist


class ChatSession(db.Model):
    __tablename__ = "chat_sessions"

    id         = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title      = db.Column(db.String(255), nullable=False, default="New Chat")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow,
                           onupdate=datetime.utcnow)

    messages = db.relationship("ChatMessage", backref="session",
                                cascade="all, delete-orphan",
                                order_by="ChatMessage.created_at")

    def to_dict(self, include_messages: bool = False):
        d = {
            "id":        self.id,
            "title":     self.title,
            "createdAt": to_ist(self.created_at),
            "updatedAt": to_ist(self.updated_at),
        }
        if include_messages:
            d["messages"] = [m.to_dict() for m in self.messages]
        return d


class ChatMessage(db.Model):
    __tablename__ = "chat_messages"

    id         = db.Column(db.Integer, primary_key=True, autoincrement=True)
    session_id = db.Column(db.Integer, db.ForeignKey("chat_sessions.id", ondelete="CASCADE"),
                           nullable=False)
    role       = db.Column(db.Enum("user", "assistant", "system", name="chat_role_enum"),
                           nullable=False)
    content    = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id":        self.id,
            "sessionId": self.session_id,
            "role":      self.role,
            "content":   self.content,
            "createdAt": to_ist(self.created_at),
        }
