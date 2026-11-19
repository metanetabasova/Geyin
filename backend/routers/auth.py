
from fastapi import APIRouter, Depends, HTTPException
from sqlite3 import Connection, IntegrityError
from schemas.user import UserCreate, UserLogin
from database.connection import get_db
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import hashlib
import secrets
import base64
import json
import hmac
import time


router = APIRouter(prefix="/auth", tags=["Authentication"])

SECRET_KEY = "geyin-development-secret-key-change-before-production"


security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Connection = Depends(get_db)
):
    token = credentials.credentials

    try:
        header, payload, signature = token.split(".")

        message = header + "." + payload

        expected_signature = hmac.new(
            SECRET_KEY.encode(),
            message.encode(),
            hashlib.sha256
        ).digest()

        expected_signature = base64.urlsafe_b64encode(
            expected_signature
        ).rstrip(b"=").decode()

        if not hmac.compare_digest(signature, expected_signature):
            raise ValueError("Invalid signature")

        decoded_payload = payload + "=" * (-len(payload) % 4)

        data = json.loads(
            base64.urlsafe_b64decode(decoded_payload)
        )

        if data.get("exp", 0) < time.time():
            raise ValueError("Token expired")

        user = db.execute(
            "SELECT * FROM users WHERE id = ?",
            (int(data["sub"]),)
        ).fetchone()

        if not user:
            raise ValueError("User not found")

        return user

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )


def hash_password(password):
    salt = secrets.token_hex(16)

    hashed = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode(),
        salt.encode(),
        600000
    )

    return salt + ":" + hashed.hex()


def verify_password(password, stored_password):
    salt, stored_hash = stored_password.split(":")

    hashed = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode(),
        salt.encode(),
        600000
    )

    return hmac.compare_digest(hashed.hex(), stored_hash)


def create_token(user_id):
    header = {"alg": "HS256", "typ": "JWT"}

    payload = {
        "sub": str(user_id),
        "exp": int(time.time()) + 1800
    }

    def encode(data):
        return base64.urlsafe_b64encode(
            json.dumps(data, separators=(",", ":")).encode()
        ).rstrip(b"=").decode()

    first = encode(header) + "." + encode(payload)

    signature = hmac.new(
        SECRET_KEY.encode(),
        first.encode(),
        hashlib.sha256
    ).digest()

    signature = base64.urlsafe_b64encode(
        signature
    ).rstrip(b"=").decode()

    return first + "." + signature


@router.post("/signup", status_code=201)
def signup(user: UserCreate, db: Connection = Depends(get_db)):

    hashed_password = hash_password(user.password)

    try:
        cursor = db.execute(
            """
            INSERT INTO users (username, email, hashed_password)
            VALUES (?, ?, ?)
            """,
            (user.username, user.email, hashed_password)
        )

        db.commit()

        return {
            "id": cursor.lastrowid,
            "username": user.username,
            "email": user.email
        }

    except IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Username or email already exists"
        )


@router.post("/login")
def login(user: UserLogin, db: Connection = Depends(get_db)):

    existing_user = db.execute(
        "SELECT * FROM users WHERE email = ?",
        (user.email,)
    ).fetchone()

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(
        user.password,
        existing_user["hashed_password"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_token(existing_user["id"])

    return {
        "access_token": token,
        "token_type": "bearer"
    }
