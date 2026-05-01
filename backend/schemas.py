# =============================================================================
# schemas.py — Schémas Pydantic pour la validation des données
# Définit la structure des données échangées entre le frontend et l'API
# =============================================================================

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, date


# =============================================================================
# SCHÉMAS : Utilisateur
# =============================================================================

class UtilisateurCreate(BaseModel):
    """Données nécessaires pour créer un nouvel utilisateur"""
    nom:        str
    prenom:     str
    email:      EmailStr
    mot_de_passe: str
    role:       str = "technicien"
    telephone:  Optional[str] = None

class UtilisateurResponse(BaseModel):
    """Données renvoyées par l'API (sans le mot de passe)"""
    id:           int
    nom:          str
    prenom:       str
    email:        str
    role:         str
    telephone:    Optional[str]
    actif:        bool
    date_creation: datetime

    class Config:
        from_attributes = True


# =============================================================================
# SCHÉMAS : Authentification
# =============================================================================

class LoginRequest(BaseModel):
    """Données de connexion"""
    email:        str
    mot_de_passe: str

class TokenResponse(BaseModel):
    """Token JWT renvoyé après connexion"""
    access_token: str
    token_type:   str = "bearer"
    utilisateur:  UtilisateurResponse


# =============================================================================
# SCHÉMAS : Équipement
# =============================================================================

class EquipementCreate(BaseModel):
    """Données pour créer un équipement"""
    code:                 str
    nom:                  str
    description:          Optional[str] = None
    marque:               Optional[str] = None
    modele:               Optional[str] = None
    numero_serie:         Optional[str] = None
    date_installation:    Optional[date] = None
    date_mise_en_service: Optional[date] = None
    statut:               str = "en_service"
    localisation:         Optional[str] = None
    site_id:              Optional[int] = None
    categorie_id:         Optional[int] = None

class EquipementUpdate(BaseModel):
    """Données pour modifier un équipement (tous les champs optionnels)"""
    nom:          Optional[str] = None
    description:  Optional[str] = None
    statut:       Optional[str] = None
    localisation: Optional[str] = None

class EquipementResponse(BaseModel):
    """Données renvoyées pour un équipement"""
    id:           int
    code:         str
    nom:          str
    description:  Optional[str]
    marque:       Optional[str]
    modele:       Optional[str]
    statut:       str
    localisation: Optional[str]
    site_id:      Optional[int]
    categorie_id: Optional[int]
    date_creation: datetime

    class Config:
        from_attributes = True


# =============================================================================
# SCHÉMAS : Ordre de Travail
# =============================================================================

class OrdreTravailCreate(BaseModel):
    """Données pour créer un OT"""
    titre:               str
    description:         Optional[str] = None
    priorite:            str = "normale"
    date_planifiee:      Optional[datetime] = None
    duree_estimee:       Optional[int] = None
    cout_estime:         Optional[float] = None
    equipement_id:       int
    type_intervention_id: Optional[int] = None
    technicien_id:       Optional[int] = None

class OrdreTravailUpdate(BaseModel):
    """Données pour modifier un OT"""
    statut:       Optional[str] = None
    priorite:     Optional[str] = None
    date_debut:   Optional[datetime] = None
    date_fin:     Optional[datetime] = None
    duree_reelle: Optional[int] = None
    cout_reel:    Optional[float] = None
    observations: Optional[str] = None
    technicien_id: Optional[int] = None

class OrdreTravailResponse(BaseModel):
    """Données renvoyées pour un OT"""
    id:                  int
    numero:              str
    titre:               str
    description:         Optional[str]
    statut:              str
    priorite:            str
    date_creation:       datetime
    date_planifiee:      Optional[datetime]
    date_debut:          Optional[datetime]
    date_fin:            Optional[datetime]
    duree_estimee:       Optional[int]
    duree_reelle:        Optional[int]
    cout_estime:         Optional[float]
    cout_reel:           Optional[float]
    observations:        Optional[str]
    equipement_id:       int
    technicien_id:       Optional[int]
    genere_par_ia:       bool

    class Config:
        from_attributes = True


# =============================================================================
# SCHÉMAS : Mesure capteur (ESP32)
# =============================================================================

class MesureCapteurCreate(BaseModel):
    """Données envoyées par l'ESP32"""
    type_capteur:  str           # Ex: "temperature"
    valeur:        float         # Ex: 72.4
    unite:         str           # Ex: "°C"
    equipement_id: int

class MesureCapteurResponse(BaseModel):
    """Données renvoyées pour une mesure"""
    id:            int
    type_capteur:  str
    valeur:        float
    unite:         str
    timestamp:     datetime
    equipement_id: int

    class Config:
        from_attributes = True


# =============================================================================
# SCHÉMAS : Alerte IA
# =============================================================================

class AlerteIAResponse(BaseModel):
    """Données renvoyées pour une alerte IA"""
    id:                int
    type_alerte:       str
    message:           str
    niveau:            str
    valeur_detectee:   Optional[float]
    seuil_reference:   Optional[float]
    probabilite_panne: Optional[float]
    traitee:           bool
    date_alerte:       datetime
    equipement_id:     int
    ot_genere_id:      Optional[int]

    class Config:
        from_attributes = True


# =============================================================================
# SCHÉMAS : Pièce de rechange
# =============================================================================

class PieceRechangeCreate(BaseModel):
    """Données pour créer une pièce"""
    reference:         str
    nom:               str
    description:       Optional[str] = None
    quantite_stock:    int = 0
    quantite_minimale: int = 1
    unite:             str = "pièce"
    prix_unitaire:     Optional[float] = None
    fournisseur:       Optional[str] = None
    emplacement_stock: Optional[str] = None

class PieceRechangeResponse(BaseModel):
    """Données renvoyées pour une pièce"""
    id:                int
    reference:         str
    nom:               str
    quantite_stock:    int
    quantite_minimale: int
    unite:             str
    prix_unitaire:     Optional[float]
    fournisseur:       Optional[str]

    class Config:
        from_attributes = True
