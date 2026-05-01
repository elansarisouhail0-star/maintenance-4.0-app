# =============================================================================
# database.py — Connexion à la base de données Supabase (PostgreSQL)
# Utilise SQLAlchemy comme ORM pour interagir avec PostgreSQL
# =============================================================================

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# -----------------------------------------------------------------------------
# URL de connexion à Supabase
# Format : postgresql://utilisateur:motdepasse@host:port/nom_base
# Ces valeurs se trouvent dans : Supabase → Settings → Database → Connection string
# -----------------------------------------------------------------------------
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "DATABASE_URL = "sqlite:///./gmao.db""
)

# -----------------------------------------------------------------------------
# Création du moteur SQLAlchemy
# pool_pre_ping=True : vérifie la connexion avant chaque requête
# -----------------------------------------------------------------------------
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# -----------------------------------------------------------------------------
# Session locale : utilisée dans chaque endpoint pour accéder à la BDD
# autocommit=False : les transactions sont validées manuellement
# autoflush=False  : les données ne sont pas envoyées automatiquement
# -----------------------------------------------------------------------------
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# -----------------------------------------------------------------------------
# Base déclarative : toutes les classes modèles héritent de cette base
# -----------------------------------------------------------------------------
Base = declarative_base()

# -----------------------------------------------------------------------------
# Dépendance FastAPI : fournit une session BDD à chaque requête
# Le bloc finally garantit que la session est toujours fermée
# -----------------------------------------------------------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
