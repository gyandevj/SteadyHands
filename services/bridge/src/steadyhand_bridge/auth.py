"""Authentication and origin validation for the SteadyHand bridge."""

import fnmatch
from typing import List, Optional
from fastapi import Header, HTTPException, status


def is_origin_allowed(origin: Optional[str], allowed_origins: List[str]) -> bool:
    """Validate if the Origin header is allowed.
    
    Permits loopback dev origins, configured domains, and chrome-extension schemes.
    """
    if not origin or origin == "null":
        # Direct non-browser clients (curl, backend tests) or local HTML file:// pages
        return True

    # Permit all Chrome Extension origins and file schemes
    if origin.startswith("chrome-extension://") or origin.startswith("file://"):
        return True

    for pattern in allowed_origins:
        if pattern == "*" or pattern == origin:
            return True
        if fnmatch.fnmatch(origin, pattern):
            return True

    return False


def verify_bearer_token(
    authorization: Optional[str] = Header(None),
    expected_token: str = "steadyhand-dev-token-secret",
) -> bool:
    """Validate HTTP Authorization: Bearer <token> header.
    
    Tokens are strictly compared and never echoed in error messages or logs.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Expected 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]
    if token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid pairing token",
        )

    return True


def mask_token(token: Optional[str]) -> str:
    """Safely mask tokens for logging without leaking secrets."""
    if not token or len(token) <= 4:
        return "***"
    return f"{token[:2]}...{token[-2:]}"
