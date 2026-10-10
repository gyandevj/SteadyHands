"""In-memory session store for non-personal task event logging and evaluation."""

import uuid
from typing import Dict, List, Optional, Set
from ..contracts import SessionTaskEvent


DISALLOWED_KEYS = {"text", "value", "html", "url", "password", "input", "query", "user"}


def sanitize_details(details: Optional[Dict[str, any]]) -> Dict[str, any]:
    """Sanitize event metadata ensuring no personal data, form values, or URLs are recorded."""
    if not details:
        return {}
    clean = {}
    for k, v in details.items():
        if k.lower() in DISALLOWED_KEYS:
            continue
        if isinstance(v, (int, float, bool, str)):
            # Ensure strings don't look like URLs or form values
            if isinstance(v, str) and (v.startswith("http://") or v.startswith("https://")):
                continue
            clean[k] = v
    return clean


class SessionStore:
    """Manages in-memory trial/evaluation sessions."""

    def __init__(self, max_sessions: int = 50, max_events_per_session: int = 2000):
        self.max_sessions = max_sessions
        self.max_events_per_session = max_events_per_session
        self._sessions: Dict[str, List[SessionTaskEvent]] = {}
        self._event_ids: Dict[str, Set[str]] = {}

    def create_session(self) -> str:
        """Create a new session, returning the session ID."""
        session_id = f"sess-{uuid.uuid4().hex[:8]}"
        self._sessions[session_id] = []
        self._event_ids[session_id] = set()
        return session_id

    def add_events(self, session_id: str, events: List[SessionTaskEvent]) -> List[str]:
        """Add task events. Duplicate event_ids are ignored.
        
        Returns:
            List of newly accepted event IDs.
        """
        if session_id not in self._sessions:
            raise KeyError(f"Session not found: {session_id}")

        session_list = self._sessions[session_id]
        id_set = self._event_ids[session_id]
        accepted = []

        for ev in events:
            if ev.event_id in id_set:
                continue
            if len(session_list) >= self.max_events_per_session:
                break

            # Strip any sensitive keys from details
            sanitized = SessionTaskEvent(
                event_id=ev.event_id,
                task_id=ev.task_id,
                t_monotonic_ms=ev.t_monotonic_ms,
                config_revision=ev.config_revision,
                source=ev.source,
                kind=ev.kind,
                details=sanitize_details(ev.details),
            )
            session_list.append(sanitized)
            id_set.add(ev.event_id)
            accepted.append(ev.event_id)

        return accepted

    def get_events(self, session_id: str) -> List[SessionTaskEvent]:
        if session_id not in self._sessions:
            raise KeyError(f"Session not found: {session_id}")
        return list(self._sessions[session_id])
