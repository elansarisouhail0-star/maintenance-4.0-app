# =============================================================================
# simulateur.py — Simulateur de données capteurs ESP32
# Simule des cas réels de température pour tester l'IA
# Exécuter : python simulateur.py
# =============================================================================

import requests
import time
import random
import math
from datetime import datetime

# -----------------------------------------------------------------------------
# CONFIGURATION
# Modifier l'URL si le backend tourne sur un autre port
# Modifier l'equipement_id selon ce que tu as créé dans l'app
# -----------------------------------------------------------------------------
API_URL       = "http://localhost:8000"
EQUIPEMENT_ID = 1        # ID de l'équipement dans la base
INTERVALLE    = 3        # Secondes entre chaque mesure (3s pour voir vite)

# -----------------------------------------------------------------------------
# COULEURS pour le terminal
# -----------------------------------------------------------------------------
VERT    = "\033[92m"
ORANGE  = "\033[93m"
ROUGE   = "\033[91m"
BLEU    = "\033[94m"
RESET   = "\033[0m"
GRAS    = "\033[1m"

def couleur_temp(temp):
    if temp >= 85: return ROUGE
    if temp >= 70: return ORANGE
    return VERT

def envoyer_mesure(valeur):
    """Envoie une mesure au backend FastAPI"""
    try:
        response = requests.post(
            f"{API_URL}/api/capteurs/mesure",
            json={
                "type_capteur":  "temperature",
                "valeur":        round(valeur, 2),
                "unite":         "°C",
                "equipement_id": EQUIPEMENT_ID
            },
            timeout=5
        )
        return response.status_code == 201
    except requests.exceptions.ConnectionError:
        print(f"{ROUGE}❌ Backend non accessible — vérifiez que uvicorn tourne{RESET}")
        return False

def analyser_avec_ia():
    """Déclenche l'analyse IA après envoi de mesures"""
    try:
        response = requests.post(
            f"{API_URL}/api/ia/analyser/{EQUIPEMENT_ID}",
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            statut = data.get("statut", "normal")
            proba  = data.get("probabilite", 0)
            if statut == "critique":
                print(f"  {ROUGE}{GRAS}🚨 IA : CRITIQUE — Probabilité panne {int(proba*100)}% — OT généré automatiquement !{RESET}")
            elif statut == "warning":
                print(f"  {ORANGE}⚠  IA : AVERTISSEMENT — Probabilité panne {int(proba*100)}%{RESET}")
            else:
                print(f"  {VERT}✅ IA : Normal{RESET}")
    except:
        pass

def barre_progression(valeur, max_val=100, largeur=30):
    """Affiche une barre de progression colorée"""
    pct     = min(valeur / max_val, 1.0)
    rempli  = int(pct * largeur)
    vide    = largeur - rempli
    couleur = couleur_temp(valeur)
    return f"{couleur}{'█' * rempli}{'░' * vide}{RESET} {couleur}{valeur:.1f}°C{RESET}"

# =============================================================================
# SCÉNARIOS DE SIMULATION
# =============================================================================

def scenario_normal(duree=30):
    """
    Scénario 1 : Fonctionnement normal
    Température stable entre 55-65°C avec légères variations
    """
    print(f"\n{BLEU}{GRAS}═══ SCÉNARIO 1 : Fonctionnement Normal ═══{RESET}")
    print(f"Température stable entre 55-65°C — {duree} mesures\n")

    base = 60.0
    for i in range(duree):
        # Variation aléatoire naturelle
        bruit    = random.gauss(0, 1.5)
        sinusoide = 3 * math.sin(i * 0.3)
        temp     = base + bruit + sinusoide
        temp     = max(50, min(68, temp))

        ok = envoyer_mesure(temp)
        statut_envoi = f"{VERT}✓{RESET}" if ok else f"{ROUGE}✗{RESET}"

        print(f"  [{i+1:02d}/{duree}] {statut_envoi} {barre_progression(temp)} "
              f"| {datetime.now().strftime('%H:%M:%S')}")

        if (i + 1) % 10 == 0:
            analyser_avec_ia()

        time.sleep(INTERVALLE)


def scenario_montee_progressive(duree=40):
    """
    Scénario 2 : Montée progressive (usure, surcharge)
    Température monte de 60°C à 80°C sur la durée
    """
    print(f"\n{ORANGE}{GRAS}═══ SCÉNARIO 2 : Montée Progressive (Usure) ═══{RESET}")
    print(f"Température montant de 60°C à 80°C — {duree} mesures\n")

    for i in range(duree):
        progression = i / duree
        temp_base   = 60 + (progression * 20)
        bruit       = random.gauss(0, 0.8)
        temp        = temp_base + bruit

        ok = envoyer_mesure(temp)
        statut_envoi = f"{VERT}✓{RESET}" if ok else f"{ROUGE}✗{RESET}"

        print(f"  [{i+1:02d}/{duree}] {statut_envoi} {barre_progression(temp)} "
              f"| Tendance: +{progression*20:.1f}°C | {datetime.now().strftime('%H:%M:%S')}")

        if (i + 1) % 8 == 0:
            analyser_avec_ia()

        time.sleep(INTERVALLE)


def scenario_surchauffe_critique(duree=25):
    """
    Scénario 3 : Surchauffe critique (panne imminente)
    Température dépasse 85°C — l'IA doit générer un OT automatiquement
    """
    print(f"\n{ROUGE}{GRAS}═══ SCÉNARIO 3 : SURCHAUFFE CRITIQUE 🔥 ═══{RESET}")
    print(f"Température dépassant 85°C — L'IA va générer un OT automatique !\n")

    for i in range(duree):
        if i < 8:
            # Montée rapide
            temp = 70 + (i * 2.5) + random.gauss(0, 0.5)
        else:
            # Zone critique avec oscillations
            temp = 88 + random.gauss(0, 2)
            temp = max(84, min(96, temp))

        ok = envoyer_mesure(temp)
        statut_envoi = f"{VERT}✓{RESET}" if ok else f"{ROUGE}✗{RESET}"

        alerte = f"{ROUGE}{GRAS} ⚠ ZONE CRITIQUE !{RESET}" if temp >= 85 else ""
        print(f"  [{i+1:02d}/{duree}] {statut_envoi} {barre_progression(temp)}{alerte} "
              f"| {datetime.now().strftime('%H:%M:%S')}")

        if (i + 1) % 5 == 0:
            analyser_avec_ia()

        time.sleep(INTERVALLE)


def scenario_retour_normal(duree=20):
    """
    Scénario 4 : Retour à la normale après intervention
    Simule le refroidissement après une maintenance
    """
    print(f"\n{VERT}{GRAS}═══ SCÉNARIO 4 : Retour Normal (Après Maintenance) ═══{RESET}")
    print(f"Refroidissement de 88°C à 58°C — {duree} mesures\n")

    for i in range(duree):
        progression = i / duree
        temp_base   = 88 - (progression * 30)
        bruit       = random.gauss(0, 0.6)
        temp        = max(55, temp_base + bruit)

        ok = envoyer_mesure(temp)
        statut_envoi = f"{VERT}✓{RESET}" if ok else f"{ROUGE}✗{RESET}"

        print(f"  [{i+1:02d}/{duree}] {statut_envoi} {barre_progression(temp)} "
              f"| Refroidissement: -{progression*30:.1f}°C | {datetime.now().strftime('%H:%M:%S')}")

        if (i + 1) % 7 == 0:
            analyser_avec_ia()

        time.sleep(INTERVALLE)


def scenario_pic_soudain(duree=30):
    """
    Scénario 5 : Pic soudain (court-circuit ou blocage mécanique)
    Température normale puis pic brutal suivi de retour
    """
    print(f"\n{ROUGE}{GRAS}═══ SCÉNARIO 5 : Pic Soudain (Court-circuit) ═══{RESET}")
    print(f"Pic brutal à 92°C puis retour — {duree} mesures\n")

    for i in range(duree):
        if i < 10:
            # Phase normale
            temp = 62 + random.gauss(0, 1.5)
        elif i < 15:
            # Pic brutal
            temp = 62 + ((i - 10) / 5) * 30 + random.gauss(0, 1)
        elif i < 20:
            # Zone critique
            temp = 90 + random.gauss(0, 2)
        else:
            # Retour progressif
            temp = 90 - ((i - 20) / 10) * 30 + random.gauss(0, 1.5)
            temp = max(58, temp)

        ok = envoyer_mesure(temp)
        statut_envoi = f"{VERT}✓{RESET}" if ok else f"{ROUGE}✗{RESET}"

        phase = "Normal" if i < 10 else ("↑ Montée" if i < 15 else ("🔥 Pic" if i < 20 else "↓ Retour"))
        print(f"  [{i+1:02d}/{duree}] {statut_envoi} {barre_progression(temp)} "
              f"| Phase: {phase} | {datetime.now().strftime('%H:%M:%S')}")

        if (i + 1) % 5 == 0:
            analyser_avec_ia()

        time.sleep(INTERVALLE)


def scenario_complet():
    """
    Scénario COMPLET : Enchaîne tous les scénarios
    Parfait pour une démonstration complète en soutenance
    """
    print(f"\n{BLEU}{GRAS}{'='*55}{RESET}")
    print(f"{BLEU}{GRAS}   DÉMONSTRATION COMPLÈTE GMAO — Maintenance 4.0{RESET}")
    print(f"{BLEU}{GRAS}{'='*55}{RESET}")
    print(f"  Équipement ID : {EQUIPEMENT_ID}")
    print(f"  Intervalle    : {INTERVALLE}s entre chaque mesure")
    print(f"  Backend       : {API_URL}")
    print(f"{BLEU}{GRAS}{'='*55}{RESET}\n")

    scenario_normal(duree=20)
    print(f"\n{GRAS}⏳ Pause 3 secondes...{RESET}\n")
    time.sleep(3)

    scenario_montee_progressive(duree=25)
    print(f"\n{GRAS}⏳ Pause 3 secondes...{RESET}\n")
    time.sleep(3)

    scenario_surchauffe_critique(duree=20)
    print(f"\n{GRAS}⏳ Pause 3 secondes...{RESET}\n")
    time.sleep(3)

    scenario_retour_normal(duree=15)

    print(f"\n{VERT}{GRAS}{'='*55}{RESET}")
    print(f"{VERT}{GRAS}   ✅ DÉMONSTRATION TERMINÉE{RESET}")
    print(f"{VERT}{GRAS}{'='*55}{RESET}")
    print(f"  → Vérifiez les Alertes IA dans l'application")
    print(f"  → Vérifiez les OT générés automatiquement")
    print(f"  → Vérifiez le graphique dans Capteurs IoT\n")


# =============================================================================
# MENU PRINCIPAL
# =============================================================================
def menu():
    print(f"\n{BLEU}{GRAS}╔══════════════════════════════════════╗{RESET}")
    print(f"{BLEU}{GRAS}║   SIMULATEUR GMAO — Maintenance 4.0  ║{RESET}")
    print(f"{BLEU}{GRAS}╚══════════════════════════════════════╝{RESET}\n")
    print(f"  {GRAS}Équipement ID : {EQUIPEMENT_ID}{RESET}")
    print(f"  {GRAS}Backend       : {API_URL}{RESET}\n")
    print("  Choisissez un scénario :\n")
    print(f"  {VERT}[1]{RESET} Fonctionnement Normal (55-65°C)")
    print(f"  {ORANGE}[2]{RESET} Montée Progressive — Usure (60→80°C)")
    print(f"  {ROUGE}[3]{RESET} Surchauffe Critique 🔥 (>85°C) — OT Auto")
    print(f"  {VERT}[4]{RESET} Retour Normal après Maintenance")
    print(f"  {ROUGE}[5]{RESET} Pic Soudain — Court-circuit")
    print(f"  {BLEU}[6]{RESET} DÉMONSTRATION COMPLÈTE (tous les scénarios)")
    print(f"  [0] Quitter\n")

    choix = input("  Votre choix : ").strip()

    if   choix == "1": scenario_normal()
    elif choix == "2": scenario_montee_progressive()
    elif choix == "3": scenario_surchauffe_critique()
    elif choix == "4": scenario_retour_normal()
    elif choix == "5": scenario_pic_soudain()
    elif choix == "6": scenario_complet()
    elif choix == "0":
        print(f"\n{VERT}Au revoir !{RESET}\n")
        return
    else:
        print(f"{ORANGE}Choix invalide{RESET}")

    input(f"\n{GRAS}Appuyez sur Entrée pour revenir au menu...{RESET}")
    menu()

if __name__ == "__main__":
    menu()
