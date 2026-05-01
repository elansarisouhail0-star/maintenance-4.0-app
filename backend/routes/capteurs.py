# =============================================================================
# routes/capteurs.py — Réception et consultation des données capteurs ESP32
# =============================================================================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import MesureCapteur, Equipement
from schemas import MesureCapteurCreate, MesureCapteurResponse

router = APIRouter()


# -----------------------------------------------------------------------------
# ENDPOINT : POST /api/capteurs/mesure
# Reçoit une mesure envoyée par l'ESP32 via WiFi
# L'ESP32 appelle cet endpoint périodiquement (ex: toutes les 30 secondes)
# -----------------------------------------------------------------------------
@router.post("/mesure", response_model=MesureCapteurResponse, status_code=201)
def recevoir_mesure(mesure: MesureCapteurCreate, db: Session = Depends(get_db)):

    # Vérifier que l'équipement existe
    equipement = db.query(Equipement).filter(Equipement.id == mesure.equipement_id).first()
    if not equipement:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")

    # Enregistrer la mesure
    nouvelle_mesure = MesureCapteur(**mesure.model_dump())
    db.add(nouvelle_mesure)
    db.commit()
    db.refresh(nouvelle_mesure)

    return nouvelle_mesure


# -----------------------------------------------------------------------------
# ENDPOINT : GET /api/capteurs/mesures/{equipement_id}
# Retourne les N dernières mesures d'un équipement pour afficher le graphique
# -----------------------------------------------------------------------------
@router.get("/mesures/{equipement_id}", response_model=List[MesureCapteurResponse])
def historique_mesures(
    equipement_id: int,
    limit: int = 100,
    type_capteur: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(MesureCapteur).filter(MesureCapteur.equipement_id == equipement_id)

    if type_capteur:
        query = query.filter(MesureCapteur.type_capteur == type_capteur)

    return query.order_by(MesureCapteur.timestamp.desc()).limit(limit).all()


# -----------------------------------------------------------------------------
# ENDPOINT : GET /api/capteurs/derniere/{equipement_id}
# Retourne uniquement la dernière mesure (affichage temps réel)
# -----------------------------------------------------------------------------
@router.get("/derniere/{equipement_id}", response_model=MesureCapteurResponse)
def derniere_mesure(equipement_id: int, db: Session = Depends(get_db)):
    mesure = (
        db.query(MesureCapteur)
        .filter(MesureCapteur.equipement_id == equipement_id)
        .order_by(MesureCapteur.timestamp.desc())
        .first()
    )

    if not mesure:
        raise HTTPException(status_code=404, detail="Aucune mesure trouvée pour cet équipement")

    return mesure
