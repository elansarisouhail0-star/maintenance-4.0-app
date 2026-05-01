# =============================================================================
# main.py — Point d'entrée principal de l'application FastAPI
# Projet : Application GMAO — Maintenance 4.0
# École  : ENSAM Casablanca
# =============================================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import auth, equipements, ordres_travail, capteurs, ia, stock

# -----------------------------------------------------------------------------
# Initialisation de l'application FastAPI
# -----------------------------------------------------------------------------
app = FastAPI(
    title="API GMAO — Maintenance 4.0",
    description="Backend de l'application de Gestion de Maintenance Assistée par Ordinateur",
    version="1.0.0"
)

# -----------------------------------------------------------------------------
# Configuration CORS : autorise le frontend React à communiquer avec l'API
# En production, remplacer "*" par l'URL exacte du frontend
# -----------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Enregistrement des routes (endpoints) de l'API
# -----------------------------------------------------------------------------
app.include_router(auth.router,            prefix="/api/auth",            tags=["Authentification"])
app.include_router(equipements.router,     prefix="/api/equipements",     tags=["Équipements"])
app.include_router(ordres_travail.router,  prefix="/api/ordres-travail",  tags=["Ordres de Travail"])
app.include_router(capteurs.router,        prefix="/api/capteurs",        tags=["Capteurs IoT"])
app.include_router(ia.router,              prefix="/api/ia",              tags=["Intelligence Artificielle"])
app.include_router(stock.router,           prefix="/api/pieces-rechange", tags=["Stock"])

# -----------------------------------------------------------------------------
# Route de test : vérifier que l'API est en ligne
# -----------------------------------------------------------------------------
@app.get("/", tags=["Statut"])
def root():
    return {
        "statut": "en ligne",
        "application": "API GMAO",
        "version": "1.0.0"
    }
