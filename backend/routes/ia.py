# =============================================================================
# routes/ia.py — Module d'Intelligence Artificielle : Maintenance Prédictive
# Analyse les données capteurs et prédit les pannes avec scikit-learn
# =============================================================================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import numpy as np

from database import get_db
from models import MesureCapteur, AlerteIA, OrdreTravail, Equipement
from schemas import AlerteIAResponse

router = APIRouter()


# =============================================================================
# CONFIGURATION DES SEUILS DE TEMPÉRATURE
# Ces valeurs sont basées sur les standards industriels
# Elles peuvent être ajustées selon les spécifications des équipements
# =============================================================================
SEUIL_AVERTISSEMENT = 70.0   # °C — Température d'avertissement
SEUIL_CRITIQUE      = 85.0   # °C — Température critique (panne imminente)
FENETRE_ANALYSE     = 20     # Nombre de mesures analysées pour la tendance


# =============================================================================
# FONCTIONS D'ANALYSE IA
# =============================================================================

def calculer_tendance(valeurs: list) -> float:
    """
    Calcule la pente de la tendance par régression linéaire.
    Une pente positive indique une montée en température.
    Retourne la pente (°C par mesure).
    """
    if len(valeurs) < 2:
        return 0.0

    x = np.arange(len(valeurs))
    y = np.array(valeurs)

    # Régression linéaire simple : y = a*x + b
    # On récupère uniquement la pente (a)
    pente = np.polyfit(x, y, 1)[0]
    return float(pente)


def detecter_anomalie(valeurs: list, seuil: float = SEUIL_AVERTISSEMENT) -> bool:
    """
    Détecte si les mesures récentes présentent une anomalie.
    Utilise la méthode Z-score : anomalie si la valeur s'écarte
    de plus de 2 écarts-types de la moyenne.
    """
    if len(valeurs) < 5:
        return False

    moyenne = np.mean(valeurs)
    ecart_type = np.std(valeurs)

    if ecart_type == 0:
        return False

    # Z-score de la dernière valeur
    z_score = abs((valeurs[-1] - moyenne) / ecart_type)
    return z_score > 2.0 or valeurs[-1] > seuil


def estimer_probabilite_panne(valeur_actuelle: float, tendance: float) -> float:
    """
    Estime la probabilité de panne (entre 0 et 1) basée sur :
    - La valeur actuelle de température
    - La tendance (vitesse de montée)
    Retourne un score de 0 (aucun risque) à 1 (panne certaine)
    """
    score = 0.0

    # Contribution de la valeur actuelle
    if valeur_actuelle >= SEUIL_CRITIQUE:
        score += 0.6
    elif valeur_actuelle >= SEUIL_AVERTISSEMENT:
        score += 0.3

    # Contribution de la tendance (montée rapide = risque élevé)
    if tendance > 1.0:      # Montée > 1°C par mesure
        score += 0.4
    elif tendance > 0.5:    # Montée modérée
        score += 0.2

    return min(score, 1.0)  # Plafonner à 1.0


def generer_numero_ot_ia(db: Session) -> str:
    """Génère un numéro d'OT pour les OT créés par l'IA"""
    annee = datetime.now().year
    count = db.query(OrdreTravail).count() + 1
    return f"OT-{annee}-{str(count).zfill(4)}"


# =============================================================================
# ENDPOINT : POST /api/ia/analyser/{equipement_id}
# Analyse les données capteurs d'un équipement et génère des alertes si nécessaire
# Cet endpoint est appelé automatiquement après chaque réception de mesure ESP32
# =============================================================================
@router.post("/analyser/{equipement_id}")
def analyser_equipement(equipement_id: int, db: Session = Depends(get_db)):

    # Récupérer les dernières mesures de température
    mesures = (
        db.query(MesureCapteur)
        .filter(
            MesureCapteur.equipement_id == equipement_id,
            MesureCapteur.type_capteur  == "temperature"
        )
        .order_by(MesureCapteur.timestamp.desc())
        .limit(FENETRE_ANALYSE)
        .all()
    )

    if len(mesures) < 3:
        return {"message": "Données insuffisantes pour l'analyse (minimum 3 mesures requises)"}

    # Extraire les valeurs numériques (ordre chronologique)
    valeurs = [m.valeur for m in reversed(mesures)]
    derniere_valeur = valeurs[-1]

    # Calculs IA
    tendance          = calculer_tendance(valeurs)
    anomalie_detectee = detecter_anomalie(valeurs)
    probabilite       = estimer_probabilite_panne(derniere_valeur, tendance)

    # Pas d'anomalie → aucune alerte
    if not anomalie_detectee and probabilite < 0.3:
        return {
            "statut":      "normal",
            "temperature": derniere_valeur,
            "tendance":    round(tendance, 3),
            "probabilite": round(probabilite, 2)
        }

    # Déterminer le niveau d'alerte
    if probabilite >= 0.7 or derniere_valeur >= SEUIL_CRITIQUE:
        niveau  = "critique"
        message = f"CRITIQUE : Température de {derniere_valeur}°C détectée. Risque de panne élevé ({int(probabilite*100)}%). Intervention immédiate requise."
    else:
        niveau  = "warning"
        message = f"AVERTISSEMENT : Température anormale de {derniere_valeur}°C. Tendance montante ({round(tendance,2)}°C/mesure). Surveillance recommandée."

    # Créer l'alerte IA en base de données
    alerte = AlerteIA(
        type_alerte       = "anomalie_temperature",
        message           = message,
        niveau            = niveau,
        valeur_detectee   = derniere_valeur,
        seuil_reference   = SEUIL_AVERTISSEMENT,
        probabilite_panne = round(probabilite, 2),
        equipement_id     = equipement_id
    )
    db.add(alerte)
    db.flush()  # Obtenir l'ID de l'alerte avant commit

    # Si critique → créer automatiquement un Ordre de Travail préventif
    ot_id = None
    if niveau == "critique":
        ot = OrdreTravail(
            numero               = generer_numero_ot_ia(db),
            titre                = f"[IA] Maintenance prédictive — Surchauffe détectée",
            description          = message,
            statut               = "ouvert",
            priorite             = "urgente",
            equipement_id        = equipement_id,
            genere_par_ia        = True,
            type_intervention_id = 3  # ID du type "Prédictive" (inséré dans les données initiales)
        )
        db.add(ot)
        db.flush()
        alerte.ot_genere_id = ot.id
        ot_id = ot.id

    db.commit()

    return {
        "statut":           niveau,
        "temperature":      derniere_valeur,
        "tendance":         round(tendance, 3),
        "probabilite":      round(probabilite, 2),
        "alerte_id":        alerte.id,
        "ot_genere_id":     ot_id,
        "message":          message
    }


# =============================================================================
# ENDPOINT : GET /api/ia/alertes
# Retourne toutes les alertes générées par l'IA
# =============================================================================
@router.get("/alertes", response_model=List[AlerteIAResponse])
def lister_alertes(
    traitee: bool = None,
    niveau: str = None,
    equipement_id: int = None,
    db: Session = Depends(get_db)
):
    query = db.query(AlerteIA)

    if traitee is not None:  query = query.filter(AlerteIA.traitee == traitee)
    if niveau:               query = query.filter(AlerteIA.niveau == niveau)
    if equipement_id:        query = query.filter(AlerteIA.equipement_id == equipement_id)

    return query.order_by(AlerteIA.date_alerte.desc()).all()


# =============================================================================
# ENDPOINT : PUT /api/ia/alertes/{id}/traiter
# Marque une alerte comme traitée
# =============================================================================
@router.put("/alertes/{alerte_id}/traiter", response_model=AlerteIAResponse)
def traiter_alerte(alerte_id: int, db: Session = Depends(get_db)):
    alerte = db.query(AlerteIA).filter(AlerteIA.id == alerte_id).first()

    if not alerte:
        raise HTTPException(status_code=404, detail="Alerte non trouvée")

    alerte.traitee        = True
    alerte.date_traitement = datetime.utcnow()

    db.commit()
    db.refresh(alerte)
    return alerte


# =============================================================================
# ENDPOINT : GET /api/ia/statistiques/{equipement_id}
# Retourne les statistiques IA d'un équipement (pour le dashboard)
# =============================================================================
@router.get("/statistiques/{equipement_id}")
def statistiques_ia(equipement_id: int, db: Session = Depends(get_db)):

    total_alertes   = db.query(AlerteIA).filter(AlerteIA.equipement_id == equipement_id).count()
    alertes_critiques = db.query(AlerteIA).filter(
        AlerteIA.equipement_id == equipement_id,
        AlerteIA.niveau == "critique"
    ).count()
    alertes_non_traitees = db.query(AlerteIA).filter(
        AlerteIA.equipement_id == equipement_id,
        AlerteIA.traitee == False
    ).count()

    # Dernière mesure de température
    derniere_mesure = (
        db.query(MesureCapteur)
        .filter(
            MesureCapteur.equipement_id == equipement_id,
            MesureCapteur.type_capteur  == "temperature"
        )
        .order_by(MesureCapteur.timestamp.desc())
        .first()
    )

    return {
        "equipement_id":       equipement_id,
        "total_alertes":       total_alertes,
        "alertes_critiques":   alertes_critiques,
        "alertes_non_traitees": alertes_non_traitees,
        "derniere_temperature": derniere_mesure.valeur if derniere_mesure else None,
        "derniere_mesure_at":  derniere_mesure.timestamp if derniere_mesure else None
    }
