# =============================================================================
# models.py — Modèles SQLAlchemy correspondant aux tables PostgreSQL
# Chaque classe représente une table de la base de données
# =============================================================================

from sqlalchemy import (
    Column, Integer, String, Text, Boolean,
    Float, DateTime, Date, ForeignKey, Numeric
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


# =============================================================================
# MODÈLE : Utilisateur
# =============================================================================
class Utilisateur(Base):
    __tablename__ = "utilisateurs"

    id              = Column(Integer, primary_key=True, index=True)
    nom             = Column(String(100), nullable=False)
    prenom          = Column(String(100), nullable=False)
    email           = Column(String(150), unique=True, nullable=False, index=True)
    mot_de_passe    = Column(String(255), nullable=False)
    role            = Column(String(50), nullable=False, default="technicien")
    telephone       = Column(String(20))
    actif           = Column(Boolean, default=True)
    date_creation   = Column(DateTime, server_default=func.now())

    # Relations
    ot_crees        = relationship("OrdreTravail", foreign_keys="OrdreTravail.createur_id",  back_populates="createur")
    ot_assignes     = relationship("OrdreTravail", foreign_keys="OrdreTravail.technicien_id", back_populates="technicien")
    notifications   = relationship("Notification", back_populates="utilisateur")


# =============================================================================
# MODÈLE : Site industriel
# =============================================================================
class Site(Base):
    __tablename__ = "sites"

    id              = Column(Integer, primary_key=True, index=True)
    nom             = Column(String(150), nullable=False)
    localisation    = Column(String(255))
    description     = Column(Text)
    date_creation   = Column(DateTime, server_default=func.now())

    equipements     = relationship("Equipement", back_populates="site")


# =============================================================================
# MODÈLE : Catégorie d'équipement
# =============================================================================
class CategorieEquipement(Base):
    __tablename__ = "categories_equipements"

    id              = Column(Integer, primary_key=True, index=True)
    nom             = Column(String(100), nullable=False)
    description     = Column(Text)

    equipements     = relationship("Equipement", back_populates="categorie")


# =============================================================================
# MODÈLE : Équipement industriel
# =============================================================================
class Equipement(Base):
    __tablename__ = "equipements"

    id                   = Column(Integer, primary_key=True, index=True)
    code                 = Column(String(50), unique=True, nullable=False, index=True)
    nom                  = Column(String(150), nullable=False)
    description          = Column(Text)
    marque               = Column(String(100))
    modele               = Column(String(100))
    numero_serie         = Column(String(100))
    date_installation    = Column(Date)
    date_mise_en_service = Column(Date)
    statut               = Column(String(50), default="en_service")
    localisation         = Column(String(255))
    qr_code              = Column(String(255))
    image_url            = Column(String(255))
    site_id              = Column(Integer, ForeignKey("sites.id"))
    categorie_id         = Column(Integer, ForeignKey("categories_equipements.id"))
    date_creation        = Column(DateTime, server_default=func.now())

    # Relations
    site                 = relationship("Site",               back_populates="equipements")
    categorie            = relationship("CategorieEquipement", back_populates="equipements")
    ordres_travail       = relationship("OrdreTravail",       back_populates="equipement")
    mesures              = relationship("MesureCapteur",      back_populates="equipement")
    alertes              = relationship("AlerteIA",           back_populates="equipement")
    plans_preventifs     = relationship("PlanMaintenancePreventive", back_populates="equipement")


# =============================================================================
# MODÈLE : Type d'intervention
# =============================================================================
class TypeIntervention(Base):
    __tablename__ = "types_intervention"

    id              = Column(Integer, primary_key=True, index=True)
    nom             = Column(String(100), nullable=False)
    description     = Column(Text)
    couleur         = Column(String(7), default="#2196F3")

    ordres_travail  = relationship("OrdreTravail", back_populates="type_intervention")


# =============================================================================
# MODÈLE : Ordre de Travail (OT)
# =============================================================================
class OrdreTravail(Base):
    __tablename__ = "ordres_travail"

    id                   = Column(Integer, primary_key=True, index=True)
    numero               = Column(String(50), unique=True, nullable=False, index=True)
    titre                = Column(String(200), nullable=False)
    description          = Column(Text)
    statut               = Column(String(50), default="ouvert")
    priorite             = Column(String(20), default="normale")
    date_creation        = Column(DateTime, server_default=func.now())
    date_planifiee       = Column(DateTime)
    date_debut           = Column(DateTime)
    date_fin             = Column(DateTime)
    duree_estimee        = Column(Integer)
    duree_reelle         = Column(Integer)
    cout_estime          = Column(Numeric(10, 2))
    cout_reel            = Column(Numeric(10, 2))
    observations         = Column(Text)
    equipement_id        = Column(Integer, ForeignKey("equipements.id"),        nullable=False)
    type_intervention_id = Column(Integer, ForeignKey("types_intervention.id"))
    createur_id          = Column(Integer, ForeignKey("utilisateurs.id"))
    technicien_id        = Column(Integer, ForeignKey("utilisateurs.id"))
    genere_par_ia        = Column(Boolean, default=False)

    # Relations
    equipement           = relationship("Equipement",        back_populates="ordres_travail")
    type_intervention    = relationship("TypeIntervention",  back_populates="ordres_travail")
    createur             = relationship("Utilisateur", foreign_keys=[createur_id],  back_populates="ot_crees")
    technicien           = relationship("Utilisateur", foreign_keys=[technicien_id], back_populates="ot_assignes")
    consommations        = relationship("ConsommationPiece", back_populates="ot")


# =============================================================================
# MODÈLE : Plan de maintenance préventive
# =============================================================================
class PlanMaintenancePreventive(Base):
    __tablename__ = "plans_maintenance_preventive"

    id                = Column(Integer, primary_key=True, index=True)
    titre             = Column(String(200), nullable=False)
    description       = Column(Text)
    frequence_type    = Column(String(20), nullable=False)
    frequence_valeur  = Column(Integer, nullable=False)
    prochaine_echeance= Column(Date)
    actif             = Column(Boolean, default=True)
    equipement_id     = Column(Integer, ForeignKey("equipements.id"), nullable=False)
    responsable_id    = Column(Integer, ForeignKey("utilisateurs.id"))
    date_creation     = Column(DateTime, server_default=func.now())

    equipement        = relationship("Equipement", back_populates="plans_preventifs")


# =============================================================================
# MODÈLE : Catégorie de pièce de rechange
# =============================================================================
class CategoriePiece(Base):
    __tablename__ = "categories_pieces"

    id          = Column(Integer, primary_key=True, index=True)
    nom         = Column(String(100), nullable=False)
    description = Column(Text)

    pieces      = relationship("PieceRechange", back_populates="categorie")


# =============================================================================
# MODÈLE : Pièce de rechange
# =============================================================================
class PieceRechange(Base):
    __tablename__ = "pieces_rechange"

    id                = Column(Integer, primary_key=True, index=True)
    reference         = Column(String(100), unique=True, nullable=False)
    nom               = Column(String(150), nullable=False)
    description       = Column(Text)
    quantite_stock    = Column(Integer, default=0)
    quantite_minimale = Column(Integer, default=1)
    unite             = Column(String(20), default="pièce")
    prix_unitaire     = Column(Numeric(10, 2))
    fournisseur       = Column(String(150))
    emplacement_stock = Column(String(100))
    categorie_id      = Column(Integer, ForeignKey("categories_pieces.id"))
    date_creation     = Column(DateTime, server_default=func.now())

    consommations     = relationship("ConsommationPiece", back_populates="piece")
    categorie         = relationship("CategoriePiece",    back_populates="pieces")


# =============================================================================
# MODÈLE : Consommation de pièces par OT
# =============================================================================
class ConsommationPiece(Base):
    __tablename__ = "consommation_pieces"

    id               = Column(Integer, primary_key=True, index=True)
    quantite         = Column(Integer, nullable=False)
    date_utilisation = Column(DateTime, server_default=func.now())
    ot_id            = Column(Integer, ForeignKey("ordres_travail.id"), nullable=False)
    piece_id         = Column(Integer, ForeignKey("pieces_rechange.id"), nullable=False)

    ot               = relationship("OrdreTravail",  back_populates="consommations")
    piece            = relationship("PieceRechange", back_populates="consommations")


# =============================================================================
# MODÈLE : Mesure capteur (données ESP32)
# =============================================================================
class MesureCapteur(Base):
    __tablename__ = "mesures_capteurs"

    id            = Column(Integer, primary_key=True, index=True)
    type_capteur  = Column(String(50), nullable=False)
    valeur        = Column(Float, nullable=False)
    unite         = Column(String(20), nullable=False)
    timestamp     = Column(DateTime, server_default=func.now(), index=True)
    equipement_id = Column(Integer, ForeignKey("equipements.id"), nullable=False)

    equipement    = relationship("Equipement", back_populates="mesures")


# =============================================================================
# MODÈLE : Alerte générée par l'IA
# =============================================================================
class AlerteIA(Base):
    __tablename__ = "alertes_ia"

    id                = Column(Integer, primary_key=True, index=True)
    type_alerte       = Column(String(100), nullable=False)
    message           = Column(Text, nullable=False)
    niveau            = Column(String(20), default="warning")
    valeur_detectee   = Column(Float)
    seuil_reference   = Column(Float)
    probabilite_panne = Column(Float)
    traitee           = Column(Boolean, default=False)
    date_alerte       = Column(DateTime, server_default=func.now())
    date_traitement   = Column(DateTime)
    equipement_id     = Column(Integer, ForeignKey("equipements.id"), nullable=False)
    ot_genere_id      = Column(Integer, ForeignKey("ordres_travail.id"))

    equipement        = relationship("Equipement", back_populates="alertes")


# =============================================================================
# MODÈLE : Notification utilisateur
# =============================================================================
class Notification(Base):
    __tablename__ = "notifications"

    id             = Column(Integer, primary_key=True, index=True)
    titre          = Column(String(200), nullable=False)
    message        = Column(Text, nullable=False)
    type           = Column(String(50), default="info")
    lue            = Column(Boolean, default=False)
    date_envoi     = Column(DateTime, server_default=func.now())
    utilisateur_id = Column(Integer, ForeignKey("utilisateurs.id"), nullable=False)

    utilisateur    = relationship("Utilisateur", back_populates="notifications")
