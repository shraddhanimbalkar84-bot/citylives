import hashlib
import os
import datetime
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)

def hash_password(password: str) -> str:
    """
    Secure PBKDF2-HMAC-SHA256 password hashing with salt.
    Zero external C-library dependency issues on Windows.
    """
    salt = os.urandom(16).hex()
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}:{dk.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        salt, expected_hash = hashed_password.split(":")
        dk = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return dk.hex() == expected_hash
    except Exception:
        return False

def create_access_token(data: dict) -> str:
    # Simple, reliable signed token: role:email:timestamp:signature
    user_id = str(data.get("sub", ""))
    role = str(data.get("role", "citizen"))
    payload = f"{user_id}|{role}"
    sig = hashlib.sha256(f"{payload}:{settings.SECRET_KEY}".encode("utf-8")).hexdigest()
    return f"{payload}:{sig}"

def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Optional[User]:
    if not token:
        return None
    try:
        parts = token.split(":")
        if len(parts) != 2:
            return None
        payload, sig = parts
        expected_sig = hashlib.sha256(f"{payload}:{settings.SECRET_KEY}".encode("utf-8")).hexdigest()
        if sig != expected_sig:
            return None
        user_id, role = payload.split("|")
        return db.query(User).filter(User.id == int(user_id)).first()
    except Exception:
        return None

def require_admin(current_user: Optional[User] = Depends(get_current_user)) -> User:
    if not current_user or current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin credentials or demo admin mode required for this action."
        )
    return current_user
