# =============================================================================
# routes/stock.py — CRUD des pièces de rechange
# =============================================================================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import PieceRechange
from schemas import PieceRechangeCreate, PieceRechangeResponse

router = APIRouter()


@router.get("/", response_model=List[PieceRechangeResponse])
def lister_pieces(db: Session = Depends(get_db)):
    return db.query(PieceRechange).all()


@router.get("/alertes", response_model=List[PieceRechangeResponse])
def pieces_en_alerte(db: Session = Depends(get_db)):
    """Retourne les pièces dont le stock est inférieur ou égal au seuil minimum"""
    return db.query(PieceRechange).filter(
        PieceRechange.quantite_stock <= PieceRechange.quantite_minimale
    ).all()


@router.get("/{piece_id}", response_model=PieceRechangeResponse)
def obtenir_piece(piece_id: int, db: Session = Depends(get_db)):
    piece = db.query(PieceRechange).filter(PieceRechange.id == piece_id).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Pièce non trouvée")
    return piece


@router.post("/", response_model=PieceRechangeResponse, status_code=201)
def creer_piece(piece: PieceRechangeCreate, db: Session = Depends(get_db)):
    existant = db.query(PieceRechange).filter(PieceRechange.reference == piece.reference).first()
    if existant:
        raise HTTPException(status_code=400, detail="Référence déjà existante")
    nouvelle = PieceRechange(**piece.model_dump())
    db.add(nouvelle)
    db.commit()
    db.refresh(nouvelle)
    return nouvelle


@router.put("/{piece_id}", response_model=PieceRechangeResponse)
def modifier_piece(piece_id: int, donnees: PieceRechangeCreate, db: Session = Depends(get_db)):
    piece = db.query(PieceRechange).filter(PieceRechange.id == piece_id).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Pièce non trouvée")
    for champ, valeur in donnees.model_dump(exclude_unset=True).items():
        setattr(piece, champ, valeur)
    db.commit()
    db.refresh(piece)
    return piece


@router.delete("/{piece_id}", status_code=204)
def supprimer_piece(piece_id: int, db: Session = Depends(get_db)):
    piece = db.query(PieceRechange).filter(PieceRechange.id == piece_id).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Pièce non trouvée")
    db.delete(piece)
    db.commit()
