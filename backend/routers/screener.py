"""
Screener API Router for Project Nexus — Stock Fetcher feature.
Provides CRUD endpoints for managing screeners (scan_clause-based filters).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import Screener

router = APIRouter(prefix="/api", tags=["screener"])


# --- Pydantic Schemas ---

class ScreenerCreate(BaseModel):
    name: str
    scan_clause: str
    is_active: bool = True


class ScreenerUpdate(BaseModel):
    name: Optional[str] = None
    scan_clause: Optional[str] = None
    is_active: Optional[bool] = None


# --- Endpoints ---

@router.get("/screeners")
def list_screeners(db: Session = Depends(get_db)):
    """List all screeners."""
    screeners = db.query(Screener).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "scan_clause": s.scan_clause,
            "is_active": s.is_active,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in screeners
    ]


@router.post("/screeners", status_code=201)
def create_screener(data: ScreenerCreate, db: Session = Depends(get_db)):
    """Create a new screener."""
    screener = Screener(
        name=data.name,
        scan_clause=data.scan_clause,
        is_active=data.is_active,
    )
    db.add(screener)
    db.commit()
    db.refresh(screener)
    return {
        "id": screener.id,
        "name": screener.name,
        "scan_clause": screener.scan_clause,
        "is_active": screener.is_active,
        "created_at": screener.created_at.isoformat() if screener.created_at else None,
        "updated_at": screener.updated_at.isoformat() if screener.updated_at else None,
        "message": "Screener created",
    }


@router.put("/screeners/{screener_id}")
def update_screener(screener_id: int, data: ScreenerUpdate, db: Session = Depends(get_db)):
    """Update an existing screener."""
    screener = db.query(Screener).filter(Screener.id == screener_id).first()
    if not screener:
        raise HTTPException(status_code=404, detail="Screener not found")

    if data.name is not None:
        screener.name = data.name
    if data.scan_clause is not None:
        screener.scan_clause = data.scan_clause
    if data.is_active is not None:
        screener.is_active = data.is_active

    db.commit()
    db.refresh(screener)
    return {
        "id": screener.id,
        "name": screener.name,
        "scan_clause": screener.scan_clause,
        "is_active": screener.is_active,
        "created_at": screener.created_at.isoformat() if screener.created_at else None,
        "updated_at": screener.updated_at.isoformat() if screener.updated_at else None,
        "message": "Screener updated",
    }


@router.delete("/screeners/{screener_id}")
def delete_screener(screener_id: int, db: Session = Depends(get_db)):
    """Delete a screener."""
    screener = db.query(Screener).filter(Screener.id == screener_id).first()
    if not screener:
        raise HTTPException(status_code=404, detail="Screener not found")
    db.delete(screener)
    db.commit()
    return {"message": "Screener deleted"}

from services.chartink_scraper import get_chartink_stocks

@router.post("/screeners/{screener_id}/run")
def run_screener(screener_id: int, db: Session = Depends(get_db)):
    """Run a specific screener by fetching its scan clause and querying Chartink."""
    screener = db.query(Screener).filter(Screener.id == screener_id).first()
    if not screener:
        raise HTTPException(status_code=404, detail="Screener not found")
        
    try:
        stocks = get_chartink_stocks(screener.scan_clause)
        return {"screener_id": screener.id, "stocks": stocks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run screener on Chartink: {e}")
