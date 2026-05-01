# =============================================================================
# demo_data.py — Script de données de démonstration
# Industrie générale : pompes, moteurs, compresseurs, convoyeurs
# Exécuter UNE SEULE FOIS : python demo_data.py
# =============================================================================

import sys, os
sys.path.append(os.path.dirname(__file__))

from database import SessionLocal, engine, Base
from models import (
    Utilisateur, Site, CategorieEquipement, Equipement,
    TypeIntervention, OrdreTravail, PieceRechange, CategoriePiece,
    MesureCapteur, AlerteIA
)
from passlib.context import CryptContext
from datetime import datetime, timedelta
import random, math

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def creer_tables():
    Base.metadata.create_all(bind=engine)
    print("✅ Tables vérifiées")

def demo_data():
    db = SessionLocal()
    try:
        # ── Vérifier si déjà chargé ──────────────────────────────────────────
        if db.query(Equipement).count() > 0:
            print("⚠  Données déjà présentes. Supprimez gmao.db pour recommencer.")
            return

        print("\n🚀 Chargement des données de démonstration...\n")

        # ── 1. UTILISATEURS ──────────────────────────────────────────────────
        print("👥 Création des utilisateurs...")
        users = [
            Utilisateur(nom="CHAJII",    prenom="Hamza",   email="admin@gmao.ma",      mot_de_passe=pwd_context.hash("admin123"),   role="admin"),
            Utilisateur(nom="BENNANI",   prenom="Youssef", email="resp@gmao.ma",        mot_de_passe=pwd_context.hash("resp123"),    role="responsable"),
            Utilisateur(nom="ALAMI",     prenom="Karim",   email="tech1@gmao.ma",       mot_de_passe=pwd_context.hash("tech123"),    role="technicien", telephone="0661234567"),
            Utilisateur(nom="TAZI",      prenom="Sara",    email="tech2@gmao.ma",       mot_de_passe=pwd_context.hash("tech123"),    role="technicien", telephone="0662345678"),
            Utilisateur(nom="IDRISSI",   prenom="Omar",    email="tech3@gmao.ma",       mot_de_passe=pwd_context.hash("tech123"),    role="technicien", telephone="0663456789"),
        ]
        for u in users: db.add(u)
        db.flush()
        print(f"   ✓ {len(users)} utilisateurs créés")

        # ── 2. SITES ─────────────────────────────────────────────────────────
        print("🏭 Création des sites...")
        sites = [
            Site(nom="Usine Principale", localisation="Zone Industrielle Casablanca", description="Site de production principal"),
            Site(nom="Atelier Mécanique", localisation="Bâtiment B — Casablanca",     description="Atelier de maintenance mécanique"),
        ]
        for s in sites: db.add(s)
        db.flush()
        print(f"   ✓ {len(sites)} sites créés")

        # ── 3. CATÉGORIES ÉQUIPEMENTS ────────────────────────────────────────
        print("📂 Création des catégories...")
        cats = [
            CategorieEquipement(nom="Pompes",        description="Pompes centrifuges et volumétriques"),
            CategorieEquipement(nom="Moteurs",        description="Moteurs électriques industriels"),
            CategorieEquipement(nom="Compresseurs",   description="Compresseurs d'air industriels"),
            CategorieEquipement(nom="Convoyeurs",     description="Systèmes de convoyage"),
            CategorieEquipement(nom="Échangeurs",     description="Échangeurs de chaleur"),
        ]
        for c in cats: db.add(c)
        db.flush()
        print(f"   ✓ {len(cats)} catégories créées")

        # ── 4. TYPES D'INTERVENTION ──────────────────────────────────────────
        types_interv = [
            TypeIntervention(nom="Préventive",   description="Intervention planifiée",           couleur="#059669"),
            TypeIntervention(nom="Corrective",   description="Intervention suite à panne",       couleur="#dc2626"),
            TypeIntervention(nom="Prédictive",   description="Intervention IA — anomalie",       couleur="#d97706"),
            TypeIntervention(nom="Améliorative", description="Amélioration des performances",    couleur="#7c3aed"),
        ]
        for t in types_interv: db.add(t)
        db.flush()

        # ── 5. ÉQUIPEMENTS ───────────────────────────────────────────────────
        print("⚙  Création des équipements industriels...")
        equipements_data = [
            dict(code="POMPE-001", nom="Pompe Centrifuge P-101",      marque="Grundfos",  modele="CM10-A",    statut="en_service",     localisation="Atelier A — Zone Pompage",    categorie_id=cats[0].id, site_id=sites[0].id),
            dict(code="POMPE-002", nom="Pompe Doseuse P-102",         marque="ProMinent", modele="Gamma/L",   statut="en_maintenance", localisation="Atelier A — Zone Chimique",   categorie_id=cats[0].id, site_id=sites[0].id),
            dict(code="MOTEUR-001",nom="Moteur Électrique M-201",     marque="Siemens",   modele="1LE0001",   statut="en_service",     localisation="Atelier B — Ligne 1",         categorie_id=cats[1].id, site_id=sites[0].id),
            dict(code="MOTEUR-002",nom="Moteur Asynchrone M-202",     marque="ABB",       modele="M2BAX",     statut="en_panne",       localisation="Atelier B — Ligne 2",         categorie_id=cats[1].id, site_id=sites[0].id),
            dict(code="COMP-001",  nom="Compresseur à Vis C-301",     marque="Atlas Copco",modele="GA22",     statut="en_service",     localisation="Salle Compresseurs",           categorie_id=cats[2].id, site_id=sites[0].id),
            dict(code="COMP-002",  nom="Compresseur Piston C-302",    marque="Kaeser",    modele="SK19",      statut="en_service",     localisation="Salle Compresseurs",           categorie_id=cats[2].id, site_id=sites[0].id),
            dict(code="CONV-001",  nom="Convoyeur à Bande CB-401",    marque="Flexlink",  modele="XL",        statut="en_service",     localisation="Ligne Production — Sortie",   categorie_id=cats[3].id, site_id=sites[0].id),
            dict(code="ECHANGEUR-001", nom="Échangeur Plaques E-501", marque="Alfa Laval",modele="M6-FW",     statut="en_service",     localisation="Chaufferie",                  categorie_id=cats[4].id, site_id=sites[1].id),
        ]
        equip_objs = []
        for eq in equipements_data:
            obj = Equipement(
                description=f"Équipement industriel {eq['nom']} — Site {eq.get('site_id',1)}",
                date_installation=datetime(2020, 1, 1) + timedelta(days=random.randint(0, 1000)),
                **eq
            )
            db.add(obj)
            equip_objs.append(obj)
        db.flush()
        print(f"   ✓ {len(equip_objs)} équipements créés")

        # ── 6. ORDRES DE TRAVAIL ─────────────────────────────────────────────
        print("📋 Création des ordres de travail...")
        ots_data = [
            dict(numero="OT-2024-0001", titre="Remplacement joints pompe P-101",           statut="termine",    priorite="haute",    equipement=equip_objs[0], type_id=1, tech=users[2], duree_r=120, cout_r=850),
            dict(numero="OT-2024-0002", titre="Vérification roulements moteur M-201",       statut="termine",    priorite="normale",  equipement=equip_objs[2], type_id=0, tech=users[3], duree_r=90,  cout_r=420),
            dict(numero="OT-2024-0003", titre="Réparation fuite pompe doseuse P-102",       statut="en_cours",   priorite="urgente",  equipement=equip_objs[1], type_id=1, tech=users[2], duree_r=None,cout_r=None),
            dict(numero="OT-2024-0004", titre="Panne moteur asynchrone M-202",              statut="ouvert",     priorite="urgente",  equipement=equip_objs[3], type_id=1, tech=users[4], duree_r=None,cout_r=None),
            dict(numero="OT-2024-0005", titre="Maintenance préventive compresseur C-301",   statut="en_attente", priorite="normale",  equipement=equip_objs[4], type_id=0, tech=users[3], duree_r=None,cout_r=None),
            dict(numero="OT-2024-0006", titre="Lubrification convoyeur CB-401",             statut="termine",    priorite="basse",    equipement=equip_objs[6], type_id=0, tech=users[4], duree_r=45,  cout_r=120),
            dict(numero="OT-2024-0007", titre="[IA] Surchauffe détectée — Pompe P-101",    statut="ouvert",     priorite="urgente",  equipement=equip_objs[0], type_id=2, tech=users[2], genere_ia=True),
            dict(numero="OT-2024-0008", titre="Nettoyage filtre échangeur E-501",           statut="termine",    priorite="normale",  equipement=equip_objs[7], type_id=0, tech=users[3], duree_r=60,  cout_r=200),
            dict(numero="OT-2024-0009", titre="Remplacement courroie compresseur C-302",    statut="en_cours",   priorite="haute",    equipement=equip_objs[5], type_id=1, tech=users[4]),
            dict(numero="OT-2024-0010", titre="[IA] Vibration anormale — Moteur M-201",    statut="ouvert",     priorite="haute",    equipement=equip_objs[2], type_id=2, tech=users[2], genere_ia=True),
            dict(numero="OT-2024-0011", titre="Révision annuelle pompe P-101",              statut="en_attente", priorite="normale",  equipement=equip_objs[0], type_id=0, tech=users[3]),
            dict(numero="OT-2024-0012", titre="Contrôle pression compresseur C-301",        statut="termine",    priorite="basse",    equipement=equip_objs[4], type_id=0, tech=users[4], duree_r=30,  cout_r=80),
        ]

        ot_objs = []
        for i, ot in enumerate(ots_data):
            obj = OrdreTravail(
                numero               = ot['numero'],
                titre                = ot['titre'],
                statut               = ot['statut'],
                priorite             = ot['priorite'],
                equipement_id        = ot['equipement'].id,
                type_intervention_id = types_interv[ot.get('type_id', 0)].id,
                technicien_id        = ot['tech'].id,
                createur_id          = users[1].id,
                genere_par_ia        = ot.get('genere_ia', False),
                duree_reelle         = ot.get('duree_r'),
                cout_reel            = ot.get('cout_r'),
                date_planifiee       = datetime.now() + timedelta(days=random.randint(-10, 15)),
                date_creation        = datetime.now() - timedelta(days=random.randint(0, 30)),
                description          = f"Intervention de maintenance sur {ot['equipement'].nom}",
            )
            db.add(obj)
            ot_objs.append(obj)
        db.flush()
        print(f"   ✓ {len(ot_objs)} ordres de travail créés")

        # ── 7. PIÈCES DE RECHANGE ────────────────────────────────────────────
        print("📦 Création du stock pièces de rechange...")
        cat_pieces = [
            CategoriePiece(nom="Étanchéité",   description="Joints, garnitures, roulements"),
            CategoriePiece(nom="Électrique",   description="Fusibles, contacteurs, câbles"),
            CategoriePiece(nom="Mécanique",    description="Courroies, roulements, engrenages"),
            CategoriePiece(nom="Filtration",   description="Filtres huile, air, eau"),
        ]
        for c in cat_pieces: db.add(c)
        db.flush()

        pieces = [
            PieceRechange(reference="JT-001", nom="Joint torique 50mm",        quantite_stock=12, quantite_minimale=5,  unite="pièce", prix_unitaire=45,    fournisseur="Socomec Maroc",   categorie_id=cat_pieces[0].id),
            PieceRechange(reference="JT-002", nom="Garniture mécanique G-25",  quantite_stock=3,  quantite_minimale=4,  unite="pièce", prix_unitaire=380,   fournisseur="Grundfos Maroc",  categorie_id=cat_pieces[0].id),
            PieceRechange(reference="RB-001", nom="Roulement SKF 6205",        quantite_stock=8,  quantite_minimale=6,  unite="pièce", prix_unitaire=125,   fournisseur="SKF Casablanca",  categorie_id=cat_pieces[0].id),
            PieceRechange(reference="RB-002", nom="Roulement à billes 6308",   quantite_stock=4,  quantite_minimale=4,  unite="pièce", prix_unitaire=190,   fournisseur="NSK Maroc",       categorie_id=cat_pieces[0].id),
            PieceRechange(reference="FU-001", nom="Fusible 16A",               quantite_stock=25, quantite_minimale=10, unite="pièce", prix_unitaire=12,    fournisseur="Schneider Maroc", categorie_id=cat_pieces[1].id),
            PieceRechange(reference="CO-001", nom="Contacteur LC1-D25",        quantite_stock=2,  quantite_minimale=3,  unite="pièce", prix_unitaire=850,   fournisseur="Schneider Maroc", categorie_id=cat_pieces[1].id),
            PieceRechange(reference="CR-001", nom="Courroie trapézoïdale B-62",quantite_stock=6,  quantite_minimale=4,  unite="pièce", prix_unitaire=95,    fournisseur="Gates Maroc",     categorie_id=cat_pieces[2].id),
            PieceRechange(reference="FI-001", nom="Filtre à huile hydraulique",quantite_stock=5,  quantite_minimale=3,  unite="pièce", prix_unitaire=220,   fournisseur="Hydac Maroc",     categorie_id=cat_pieces[3].id),
            PieceRechange(reference="FI-002", nom="Cartouche filtre air 10µm", quantite_stock=2,  quantite_minimale=5,  unite="pièce", prix_unitaire=150,   fournisseur="Parker Maroc",    categorie_id=cat_pieces[3].id),
            PieceRechange(reference="LU-001", nom="Graisse industrielle EP2",  quantite_stock=8,  quantite_minimale=3,  unite="kg",    prix_unitaire=85,    fournisseur="Total Maroc",     categorie_id=cat_pieces[2].id),
        ]
        for p in pieces: db.add(p)
        db.flush()
        print(f"   ✓ {len(pieces)} pièces de rechange créées")

        # ── 8. MESURES CAPTEURS ──────────────────────────────────────────────
        print("📡 Génération des mesures capteurs (historique 24h)...")
        total_mesures = 0
        for eq in equip_objs[:4]:  # Les 4 premiers équipements
            base_temp = random.uniform(55, 68)
            for j in range(48):  # 48 mesures = toutes les 30min sur 24h
                ts  = datetime.now() - timedelta(minutes=(47-j)*30)
                bruit = random.gauss(0, 1.5)
                sinus = 3 * math.sin(j * 0.2)

                # Moteur en panne → température anormale
                if eq.code == "MOTEUR-002":
                    if j < 30:
                        temp = base_temp + bruit + sinus
                    else:
                        temp = base_temp + (j-30)*0.8 + bruit  # Montée progressive
                else:
                    temp = base_temp + bruit + sinus

                mesure = MesureCapteur(
                    type_capteur  = "temperature",
                    valeur        = round(max(40, min(100, temp)), 2),
                    unite         = "°C",
                    timestamp     = ts,
                    equipement_id = eq.id,
                )
                db.add(mesure)
                total_mesures += 1

        db.flush()
        print(f"   ✓ {total_mesures} mesures capteurs générées")

        # ── 9. ALERTES IA ────────────────────────────────────────────────────
        print("🤖 Génération des alertes IA...")
        alertes = [
            AlerteIA(type_alerte="anomalie_temperature", message="CRITIQUE : Température de 89.3°C détectée sur MOTEUR-002. Risque de panne élevé (82%). Intervention immédiate requise.",        niveau="critique", valeur_detectee=89.3, seuil_reference=70.0, probabilite_panne=0.82, traitee=False, equipement_id=equip_objs[3].id, date_alerte=datetime.now()-timedelta(hours=2)),
            AlerteIA(type_alerte="anomalie_temperature", message="AVERTISSEMENT : Température anormale de 74.1°C sur POMPE-001. Tendance montante. Surveillance recommandée.",                   niveau="warning",  valeur_detectee=74.1, seuil_reference=70.0, probabilite_panne=0.45, traitee=False, equipement_id=equip_objs[0].id, date_alerte=datetime.now()-timedelta(hours=5)),
            AlerteIA(type_alerte="anomalie_temperature", message="CRITIQUE : Pic de température à 92.7°C sur POMPE-002. OT correctif généré automatiquement.",                                   niveau="critique", valeur_detectee=92.7, seuil_reference=70.0, probabilite_panne=0.91, traitee=True,  equipement_id=equip_objs[1].id, date_alerte=datetime.now()-timedelta(hours=12), date_traitement=datetime.now()-timedelta(hours=10)),
            AlerteIA(type_alerte="anomalie_temperature", message="AVERTISSEMENT : Légère hausse détectée sur COMP-001. Température à 71.2°C. À surveiller.",                                     niveau="warning",  valeur_detectee=71.2, seuil_reference=70.0, probabilite_panne=0.28, traitee=True,  equipement_id=equip_objs[4].id, date_alerte=datetime.now()-timedelta(hours=18), date_traitement=datetime.now()-timedelta(hours=16)),
            AlerteIA(type_alerte="anomalie_temperature", message="CRITIQUE : Surchauffe prolongée sur MOTEUR-002. Température moyenne 87°C depuis 2h. Risque panne critique.",                   niveau="critique", valeur_detectee=87.0, seuil_reference=70.0, probabilite_panne=0.76, traitee=False, equipement_id=equip_objs[3].id, date_alerte=datetime.now()-timedelta(hours=1)),
        ]
        for a in alertes: db.add(a)
        db.flush()
        print(f"   ✓ {len(alertes)} alertes IA créées")

        db.commit()

        print("\n" + "="*55)
        print("✅  DONNÉES DE DÉMONSTRATION CHARGÉES AVEC SUCCÈS !")
        print("="*55)
        print("\n📋 Comptes disponibles :")
        print("   Admin       : admin@gmao.ma   / admin123")
        print("   Responsable : resp@gmao.ma    / resp123")
        print("   Technicien  : tech1@gmao.ma   / tech123")
        print("\n📊 Données chargées :")
        print(f"   • {len(equip_objs)} équipements industriels")
        print(f"   • {len(ot_objs)} ordres de travail")
        print(f"   • {len(pieces)} pièces de rechange")
        print(f"   • {total_mesures} mesures capteurs")
        print(f"   • {len(alertes)} alertes IA")
        print("\n🚀 Lancez le simulateur pour ajouter des données temps réel !")
        print("="*55 + "\n")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Erreur : {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    creer_tables()
    demo_data()
