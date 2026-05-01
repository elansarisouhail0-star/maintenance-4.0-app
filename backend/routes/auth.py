# =============================================================================
# routes/auth.py — Authentification : inscription et connexion
# Utilise JWT (JSON Web Token) pour sécuriser les endpoints
# =============================================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
import os

from database import get_db
from models import Utilisateur
from schemas import UtilisateurCreate, UtilisateurResponse, LoginRequest, TokenResponse

router = APIRouter()

# -----------------------------------------------------------------------------
# Configuration de la sécurité
# SECRET_KEY : clé secrète pour signer les tokens JWT (à changer en production)
# ALGORITHM  : algorithme de signature HS256
# EXPIRATION : durée de validité du token en heures
# -----------------------------------------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "gmao_secret_key_ensam_casablanca")
ALGORITHM  = "HS256"
EXPIRATION_HEURES = 24

# Contexte de hashage des mots de passe avec bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# -----------------------------------------------------------------------------
# Fonctions utilitaires
# -----------------------------------------------------------------------------

def hasher_mot_de_passe(mot_de_passe: str) -> str:
    """Retourne le hash bcrypt du mot de passe"""
    return pwd_context.hash(mot_de_passe)

def verifier_mot_de_passe(mot_de_passe: str, hash: str) -> bool:
    """Vérifie si le mot de passe correspond au hash stocké"""
    return pwd_context.verify(mot_de_passe, hash)

def creer_token(data: dict) -> str:
    """Génère un token JWT avec une expiration"""
    payload = data.copy()
    expiration = datetime.utcnow() + timedelta(hours=EXPIRATION_HEURES)
    payload.update({"exp": expiration})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# -----------------------------------------------------------------------------
# ENDPOINT : POST /api/auth/inscription
# Crée un nouvel utilisateur dans la base de données
# -----------------------------------------------------------------------------
@router.post("/inscription", response_model=UtilisateurResponse, status_code=201)
def inscription(utilisateur: UtilisateurCreate, db: Session = Depends(get_db)):

    # Vérifier si l'email est déjà utilisé
    existant = db.query(Utilisateur).filter(Utilisateur.email == utilisateur.email).first()
    if existant:
        raise HTTPException(
            status_code=400,
            detail="Un compte avec cet email existe déjà"
        )

    # Créer le nouvel utilisateur avec mot de passe hashé
    nouvel_utilisateur = Utilisateur(
        nom           = utilisateur.nom,
        prenom        = utilisateur.prenom,
        email         = utilisateur.email,
        mot_de_passe  = hasher_mot_de_passe(utilisateur.mot_de_passe),
        role          = utilisateur.role,
        telephone     = utilisateur.telephone
    )

    db.add(nouvel_utilisateur)
    db.commit()
    db.refresh(nouvel_utilisateur)

    return nouvel_utilisateur


# -----------------------------------------------------------------------------
# ENDPOINT : POST /api/auth/connexion
# Vérifie les identifiants et retourne un token JWT
# -----------------------------------------------------------------------------
@router.post("/connexion", response_model=TokenResponse)
def connexion(credentials: LoginRequest, db: Session = Depends(get_db)):

    # Rechercher l'utilisateur par email
    utilisateur = db.query(Utilisateur).filter(Utilisateur.email == credentials.email).first()

    # Vérifier l'existence et le mot de passe
    if not utilisateur or not verifier_mot_de_passe(credentials.mot_de_passe, utilisateur.mot_de_passe):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect"
        )

    # Vérifier que le compte est actif
    if not utilisateur.actif:
        raise HTTPException(
            status_code=403,
            detail="Ce compte a été désactivé"
        )

    # Générer le token JWT
    token = creer_token({
        "sub":   str(utilisateur.id),
        "email": utilisateur.email,
        "role":  utilisateur.role
    })

    return {
        "access_token": token,
        "token_type":   "bearer",
        "utilisateur":  utilisateur
    }
