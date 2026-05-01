# =============================================================================
# create_admin.py — Crée le premier compte administrateur
# Exécuter UNE SEULE FOIS après avoir configuré .env
# Commande : python create_admin.py
# =============================================================================

import sys
import os
sys.path.append(os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from database import SessionLocal
from models import Utilisateur
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ─── MODIFIER CES VALEURS ────────────────────────────────────────────────────
ADMIN = {
    "nom":          "Admin",
    "prenom":       "GMAO",
    "email":        "admin@gmao.ma",
    "mot_de_passe": "admin123",
    "role":         "admin",
    "telephone":    "+212600000000",
}
# ─────────────────────────────────────────────────────────────────────────────

def creer_admin():
    db = SessionLocal()
    try:
        existant = db.query(Utilisateur).filter(Utilisateur.email == ADMIN["email"]).first()
        if existant:
            print(f"✅ Compte déjà existant : {ADMIN['email']}")
            return

        admin = Utilisateur(
            nom          = ADMIN["nom"],
            prenom       = ADMIN["prenom"],
            email        = ADMIN["email"],
            mot_de_passe = pwd_context.hash(ADMIN["mot_de_passe"]),
            role         = ADMIN["role"],
            telephone    = ADMIN["telephone"],
        )
        db.add(admin)
        db.commit()
        print("✅ Compte admin créé avec succès !")
        print(f"   Email    : {ADMIN['email']}")
        print(f"   Password : {ADMIN['mot_de_passe']}")
        print(f"   Rôle     : {ADMIN['role']}")
    finally:
        db.close()

if __name__ == "__main__":
    creer_admin()
