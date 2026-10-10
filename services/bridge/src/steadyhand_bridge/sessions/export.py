"""Session export serializing trial events into clean benchmark format."""

from typing import Dict, Any
from .store import SessionStore


def export_session_summary(store: SessionStore, session_id: str) -> Dict[str, Any]:
    """Export benchmark session events and high-level trial metrics."""
    events = store.get_events(session_id)

    task_counts: Dict[str, int] = {}
    kind_counts: Dict[str, int] = {}

    for ev in events:
        kind_counts[ev.kind] = kind_counts.get(ev.kind, 0) + 1
        task_counts[ev.task_id] = task_counts.get(ev.task_id, 0) + 1

    return {
        "v": 1,
        "session_id": session_id,
        "total_events": len(events),
        "task_counts": task_counts,
        "kind_counts": kind_counts,
        "events": [ev.model_dump() for ev in events],
    }
