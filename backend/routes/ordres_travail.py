# =============================================================================
# routes/ordres_travail.py — CRUD des Ordres de Travail (OT)
# =============================================================================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from database import get_db
from models import OrdreTravail
from schemas import OrdreTravailCreate, OrdreTravailUpdate, OrdreTravailResponse

router = APIRouter()


def generer_numero_ot(db: Session) -> str:
    """Génère un numéro unique pour l'OT au format OT-YYYY-XXXX"""
    annee = datetime.now().year
    count = db.query(OrdreTravail).count() + 1
    return f"OT-{annee}-{str(count).zfill(4)}"


# -----------------------------------------------------------------------------
# ENDPOINT : GET /api/ordres-travail
# Liste tous les OT avec filtres optionnels
# -----------------------------------------------------------------------------
@router.get("/", response_model=List[OrdreTravailResponse])
def lister_ot(
    statut: str = None,
    priorite: str = None,
    equipement_id: int = None,
    technicien_id: int = None,
    db: Session = Depends(get_db)
):
    query = db.query(OrdreTravail)

    if statut:        query = query.filter(OrdreTravail.statut == statut)
    if priorite:      query = query.filter(OrdreTravail.priorite == priorite)
    if equipement_id: query = query.filter(OrdreTravail.equipement_id == equipement_id)
    if technicien_id: query = query.filter(OrdreTravail.technicien_id == technicien_id)

    return query.order_by(OrdreTravail.date_creation.desc()).all()


# -----------------------------------------------------------------------------
# ENDPOINT : GET /api/ordres-travail/{id}
# Retourne un OT par son identifiant
# -----------------------------------------------------------------------------
@router.get("/{ot_id}", response_model=OrdreTravailResponse)
def obtenir_ot(ot_id: int, db: Session = Depends(get_db)):
    ot = db.query(OrdreTravail).filter(OrdreTravail.id == ot_id).first()
    if not ot:
        raise HTTPException(status_code=404, detail="Ordre de travail non trouvé")
    return ot


# -----------------------------------------------------------------------------
# ENDPOINT : POST /api/ordres-travail
# Crée un nouvel OT manuellement
# -----------------------------------------------------------------------------
@router.post("/", response_model=OrdreTravailResponse, status_code=201)
def creer_ot(ot: OrdreTravailCreate, db: Session = Depends(get_db)):
    nouvel_ot = OrdreTravail(
        **ot.model_dump(),
        numero=generer_numero_ot(db)
    )
    db.add(nouvel_ot)
    db.commit()
    db.refresh(nouvel_ot)
    return nouvel_ot


# -----------------------------------------------------------------------------
# ENDPOINT : PUT /api/ordres-travail/{id}
# Met à jour le statut ou les informations d'un OT
# -----------------------------------------------------------------------------
@router.put("/{ot_id}", response_model=OrdreTravailResponse)
def modifier_ot(ot_id: int, donnees: OrdreTravailUpdate, db: Session = Depends(get_db)):
    ot = db.query(OrdreTravail).filter(OrdreTravail.id == ot_id).first()
    if not ot:
        raise HTTPException(status_code=404, detail="Ordre de travail non trouvé")

    for champ, valeur in donnees.model_dump(exclude_unset=True).items():
        setattr(ot, champ, valeur)

    db.commit()
    db.refresh(ot)
    return ot


# -----------------------------------------------------------------------------
# ENDPOINT : DELETE /api/ordres-travail/{id}
# Supprime un OT
# -----------------------------------------------------------------------------
@router.delete("/{ot_id}", status_code=204)
def supprimer_ot(ot_id: int, db: Session = Depends(get_db)):
    ot = db.query(OrdreTravail).filter(OrdreTravail.id == ot_id).first()
    if not ot:
        raise HTTPException(status_code=404, detail="Ordre de travail non trouvé")
    db.delete(ot)
    db.commit()
