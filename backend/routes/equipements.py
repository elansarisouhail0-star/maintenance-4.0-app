# =============================================================================
# routes/equipements.py — CRUD complet pour les équipements industriels
# CRUD : Create / Read / Update / Delete
# =============================================================================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Equipement
from schemas import EquipementCreate, EquipementUpdate, EquipementResponse

router = APIRouter()


# -----------------------------------------------------------------------------
# ENDPOINT : GET /api/equipements
# Retourne la liste de tous les équipements
# -----------------------------------------------------------------------------
@router.get("/", response_model=List[EquipementResponse])
def lister_equipements(
    skip: int = 0,
    limit: int = 100,
    statut: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(Equipement)

    # Filtrer par statut si fourni (ex: ?statut=en_panne)
    if statut:
        query = query.filter(Equipement.statut == statut)

    return query.offset(skip).limit(limit).all()


# -----------------------------------------------------------------------------
# ENDPOINT : GET /api/equipements/{id}
# Retourne un équipement par son identifiant
# -----------------------------------------------------------------------------
@router.get("/{equipement_id}", response_model=EquipementResponse)
def obtenir_equipement(equipement_id: int, db: Session = Depends(get_db)):
    equipement = db.query(Equipement).filter(Equipement.id == equipement_id).first()

    if not equipement:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")

    return equipement


# -----------------------------------------------------------------------------
# ENDPOINT : POST /api/equipements
# Crée un nouvel équipement
# -----------------------------------------------------------------------------
@router.post("/", response_model=EquipementResponse, status_code=201)
def creer_equipement(equipement: EquipementCreate, db: Session = Depends(get_db)):

    # Vérifier que le code est unique
    existant = db.query(Equipement).filter(Equipement.code == equipement.code).first()
    if existant:
        raise HTTPException(status_code=400, detail="Un équipement avec ce code existe déjà")

    nouvel_equipement = Equipement(**equipement.model_dump())
    db.add(nouvel_equipement)
    db.commit()
    db.refresh(nouvel_equipement)

    return nouvel_equipement


# -----------------------------------------------------------------------------
# ENDPOINT : PUT /api/equipements/{id}
# Modifie un équipement existant
# -----------------------------------------------------------------------------
@router.put("/{equipement_id}", response_model=EquipementResponse)
def modifier_equipement(
    equipement_id: int,
    donnees: EquipementUpdate,
    db: Session = Depends(get_db)
):
    equipement = db.query(Equipement).filter(Equipement.id == equipement_id).first()

    if not equipement:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")

    # Mettre à jour uniquement les champs fournis
    for champ, valeur in donnees.model_dump(exclude_unset=True).items():
        setattr(equipement, champ, valeur)

    db.commit()
    db.refresh(equipement)

    return equipement


# -----------------------------------------------------------------------------
# ENDPOINT : DELETE /api/equipements/{id}
# Supprime un équipement
# -----------------------------------------------------------------------------
@router.delete("/{equipement_id}", status_code=204)
def supprimer_equipement(equipement_id: int, db: Session = Depends(get_db)):
    equipement = db.query(Equipement).filter(Equipement.id == equipement_id).first()

    if not equipement:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")

    db.delete(equipement)
    db.commit()
