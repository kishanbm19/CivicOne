"""Role and workflow transition permissions for civic services."""

TRANSITIONS = {
    "submitted": {"classified", "assigned"},
    "classified": {"assigned"},
    "assigned": {"acknowledged", "in_progress"},
    "acknowledged": {"in_progress", "on_hold"},
    "in_progress": {"on_hold", "resolved"},
    "on_hold": {"in_progress"},
    "resolved": {"closed", "reopened"},
    "closed": {"reopened"},
    "reopened": {"assigned", "in_progress"},
}


def can_transition(old: str, new: str) -> bool:
    """Check if the given complaint status transition is allowed."""
    return new in TRANSITIONS.get(old, set())

