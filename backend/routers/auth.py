from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import UserSession
import os
from dotenv import load_dotenv
import requests

load_dotenv()

router = APIRouter(prefix="/api/auth", tags=["auth"])

API_KEY = os.getenv("UPSTOX_API_KEY", "")
API_SECRET = os.getenv("UPSTOX_API_SECRET", "")
REDIRECT_URI = os.getenv("UPSTOX_REDIRECT_URI", "")
TOKEN_URL = "https://api.upstox.com/v2/login/authorization/token"

@router.get("/upstox/login")
def get_upstox_login_url():
    """Returns the Upstox OAuth URL for the frontend to redirect the user."""
    auth_url = f"https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id={API_KEY}&redirect_uri={REDIRECT_URI}"
    return {"login_url": auth_url}

@router.post("/upstox/callback")
def handle_upstox_callback(code: str, db: Session = Depends(get_db)):
    """Exchange auth code for access token and save it to the DB."""
    try:
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        data = {
            'grant_type': 'authorization_code',
            'code': code,
            'client_id': API_KEY,
            'client_secret': API_SECRET,
            'redirect_uri': REDIRECT_URI
        }
        response = requests.post(TOKEN_URL, headers=headers, data=data)
        response.raise_for_status()
        token_data = response.json()
        access_token = token_data.get("access_token")
        
        if not access_token:
            raise HTTPException(status_code=400, detail="No access token received from Upstox")

        # Save or update session in DB
        session = db.query(UserSession).first()
        if session:
            session.access_token = access_token
        else:
            session = UserSession(access_token=access_token)
            db.add(session)
        db.commit()

        return {"message": "Authentication successful", "access_token": access_token}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/upstox/status")
def get_auth_status(db: Session = Depends(get_db)):
    """Check if the user is currently authenticated with Upstox."""
    session = db.query(UserSession).first()
    if session and session.access_token:
        # Validate token against Upstox API
        headers = {
            'Authorization': f'Bearer {session.access_token}',
            'Accept': 'application/json'
        }
        try:
            url = "https://api.upstox.com/v2/user/profile"
            resp = requests.get(url, headers=headers)
            if resp.status_code == 401:
                # Token is expired or invalid, delete it so user can login again
                db.delete(session)
                db.commit()
                return {"authenticated": False}
        except Exception:
            pass # On network errors, assume still authenticated for now
            
        return {"authenticated": True}
    return {"authenticated": False}

@router.post("/upstox/logout")
def logout_upstox(db: Session = Depends(get_db)):
    """Log out the user by clearing the session from DB."""
    session = db.query(UserSession).first()
    if session:
        db.delete(session)
        db.commit()
    return {"message": "Logged out successfully"}
