"""Session logging and telemetry non-leakage tests."""

from steadyhand_bridge.sessions.store import SessionStore
from steadyhand_bridge.sessions.export import export_session_summary
from steadyhand_bridge.contracts import SessionTaskEvent


def test_session_lifecycle_and_deduplication():
    store = SessionStore()
    sess_id = store.create_session()

    events = [
        SessionTaskEvent(
            event_id="e1",
            task_id="t1",
            t_monotonic_ms=100.0,
            config_revision=1,
            source="synthetic",
            kind="task.started",
        ),
        SessionTaskEvent(
            event_id="e2",
            task_id="t1",
            t_monotonic_ms=500.0,
            config_revision=1,
            source="synthetic",
            kind="selection.dispatched",
        ),
    ]

    accepted = store.add_events(sess_id, events)
    assert accepted == ["e1", "e2"]

    # Re-sending duplicate event e1 must be ignored
    accepted_repeat = store.add_events(sess_id, [events[0]])
    assert accepted_repeat == []

    # Export summary
    export = export_session_summary(store, sess_id)
    assert export["total_events"] == 2
    assert export["kind_counts"]["task.started"] == 1
    assert export["kind_counts"]["selection.dispatched"] == 1


def test_session_sanitizes_form_and_url_telemetry():
    store = SessionStore()
    sess_id = store.create_session()

    event = SessionTaskEvent(
        event_id="e3",
        task_id="t2",
        t_monotonic_ms=200.0,
        config_revision=1,
        source="synthetic",
        kind="selection.dispatched",
        details={
            "target_id": "btn-submit",
            "text": "My Secret Password",  # Disallowed
            "url": "https://example.com/secret",  # Disallowed
            "value": "Confidential input",  # Disallowed
            "safe_metric": 42.0,  # Allowed
        },
    )

    store.add_events(sess_id, [event])
    logged = store.get_events(sess_id)[0]

    assert "text" not in logged.details
    assert "url" not in logged.details
    assert "value" not in logged.details
    assert logged.details.get("safe_metric") == 42.0
