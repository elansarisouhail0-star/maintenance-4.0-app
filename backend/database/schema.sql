-- =============================================================================
-- SCHÉMA DE LA BASE DE DONNÉES — APPLICATION GMAO
-- Projet : Gestion de Maintenance Assistée par Ordinateur — Maintenance 4.0
-- École  : ENSAM Casablanca
-- SGBD   : PostgreSQL
-- =============================================================================


-- -----------------------------------------------------------------------------
-- EXTENSION : UUID pour les identifiants sécurisés (optionnel)
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
-- TABLE 1 : utilisateurs
-- Gère les comptes des utilisateurs de l'application (techniciens, responsables)
-- =============================================================================
CREATE TABLE utilisateurs (
    id              SERIAL PRIMARY KEY,
    nom             VARCHAR(100) NOT NULL,
    prenom          VARCHAR(100) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    mot_de_passe    VARCHAR(255) NOT NULL,           -- Hashé avec bcrypt
    role            VARCHAR(50) NOT NULL             -- 'admin', 'responsable', 'technicien'
                    CHECK (role IN ('admin', 'responsable', 'technicien')),
    telephone       VARCHAR(20),
    actif           BOOLEAN DEFAULT TRUE,
    date_creation   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE utilisateurs IS 'Comptes utilisateurs de l application GMAO';
COMMENT ON COLUMN utilisateurs.role IS 'Rôle : admin, responsable ou technicien';
COMMENT ON COLUMN utilisateurs.mot_de_passe IS 'Mot de passe hashé via bcrypt';


-- =============================================================================
-- TABLE 2 : sites
-- Représente les sites industriels (usines, ateliers...)
-- =============================================================================
CREATE TABLE sites (
    id              SERIAL PRIMARY KEY,
    nom             VARCHAR(150) NOT NULL,
    localisation    VARCHAR(255),
    description     TEXT,
    date_creation   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE sites IS 'Sites industriels contenant les équipements';


-- =============================================================================
-- TABLE 3 : categories_equipements
-- Catégories pour classifier les équipements (pompes, moteurs, convoyeurs...)
-- =============================================================================
CREATE TABLE categories_equipements (
    id              SERIAL PRIMARY KEY,
    nom             VARCHAR(100) NOT NULL,
    description     TEXT
);

COMMENT ON TABLE categories_equipements IS 'Classification des types d équipements';


-- =============================================================================
-- TABLE 4 : equipements
-- Cœur de la GMAO : liste de tous les équipements industriels à maintenir
-- =============================================================================
CREATE TABLE equipements (
    id                  SERIAL PRIMARY KEY,
    code                VARCHAR(50) UNIQUE NOT NULL,     -- Code unique (ex: EQ-001)
    nom                 VARCHAR(150) NOT NULL,
    description         TEXT,
    marque              VARCHAR(100),
    modele              VARCHAR(100),
    numero_serie        VARCHAR(100),
    date_installation   DATE,
    date_mise_en_service DATE,
    statut              VARCHAR(50) DEFAULT 'en_service'
                        CHECK (statut IN ('en_service', 'en_panne', 'en_maintenance', 'hors_service')),
    localisation        VARCHAR(255),                   -- Emplacement dans l usine
    qr_code             VARCHAR(255),                   -- Lien ou identifiant QR
    image_url           VARCHAR(255),
    site_id             INTEGER REFERENCES sites(id) ON DELETE SET NULL,
    categorie_id        INTEGER REFERENCES categories_equipements(id) ON DELETE SET NULL,
    date_creation       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE equipements IS 'Équipements industriels à maintenir';
COMMENT ON COLUMN equipements.code IS 'Identifiant unique lisible (ex: POMPE-001)';
COMMENT ON COLUMN equipements.statut IS 'État actuel de l équipement';


-- =============================================================================
-- TABLE 5 : types_intervention
-- Types d'interventions de maintenance (préventive, corrective, prédictive...)
-- =============================================================================
CREATE TABLE types_intervention (
    id              SERIAL PRIMARY KEY,
    nom             VARCHAR(100) NOT NULL,
    description     TEXT,
    couleur         VARCHAR(7) DEFAULT '#2196F3'         -- Couleur d affichage (hex)
);

COMMENT ON TABLE types_intervention IS 'Types d interventions de maintenance';

-- Données initiales
INSERT INTO types_intervention (nom, description, couleur) VALUES
    ('Préventive',  'Intervention planifiée pour prévenir les pannes',      '#4CAF50'),
    ('Corrective',  'Intervention suite à une panne ou dysfonctionnement',  '#F44336'),
    ('Prédictive',  'Intervention déclenchée par l IA suite à une alerte',  '#FF9800'),
    ('Améliorative','Modification pour améliorer les performances',          '#9C27B0');


-- =============================================================================
-- TABLE 6 : ordres_travail
-- Ordres de Travail (OT) : coeur opérationnel de la GMAO
-- =============================================================================
CREATE TABLE ordres_travail (
    id                  SERIAL PRIMARY KEY,
    numero              VARCHAR(50) UNIQUE NOT NULL,     -- Ex: OT-2024-0001
    titre               VARCHAR(200) NOT NULL,
    description         TEXT,
    statut              VARCHAR(50) DEFAULT 'ouvert'
                        CHECK (statut IN ('ouvert', 'en_cours', 'en_attente', 'termine', 'annule')),
    priorite            VARCHAR(20) DEFAULT 'normale'
                        CHECK (priorite IN ('basse', 'normale', 'haute', 'urgente')),
    date_creation       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_planifiee      TIMESTAMP,                       -- Date prévue d intervention
    date_debut          TIMESTAMP,                       -- Début réel de l intervention
    date_fin            TIMESTAMP,                       -- Fin réelle de l intervention
    duree_estimee       INTEGER,                         -- Durée estimée en minutes
    duree_reelle        INTEGER,                         -- Durée réelle en minutes
    cout_estime         DECIMAL(10,2),                   -- Coût estimé en MAD
    cout_reel           DECIMAL(10,2),                   -- Coût réel en MAD
    observations        TEXT,                            -- Notes du technicien
    equipement_id       INTEGER NOT NULL REFERENCES equipements(id) ON DELETE CASCADE,
    type_intervention_id INTEGER REFERENCES types_intervention(id) ON DELETE SET NULL,
    createur_id         INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    technicien_id       INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    genere_par_ia       BOOLEAN DEFAULT FALSE            -- TRUE si créé automatiquement par l IA
);

COMMENT ON TABLE ordres_travail IS 'Ordres de Travail de maintenance';
COMMENT ON COLUMN ordres_travail.numero IS 'Numéro unique lisible (ex: OT-2024-0001)';
COMMENT ON COLUMN ordres_travail.genere_par_ia IS 'Indique si l OT a été créé par le module IA';


-- =============================================================================
-- TABLE 7 : plans_maintenance_preventive
-- Plans de maintenance préventive : définit les intervalles d'entretien
-- =============================================================================
CREATE TABLE plans_maintenance_preventive (
    id                  SERIAL PRIMARY KEY,
    titre               VARCHAR(200) NOT NULL,
    description         TEXT,
    frequence_type      VARCHAR(20) NOT NULL
                        CHECK (frequence_type IN ('jours', 'semaines', 'mois', 'heures', 'km')),
    frequence_valeur    INTEGER NOT NULL,                -- Ex: toutes les 3 semaines → valeur=3
    prochaine_echeance  DATE,
    actif               BOOLEAN DEFAULT TRUE,
    equipement_id       INTEGER NOT NULL REFERENCES equipements(id) ON DELETE CASCADE,
    responsable_id      INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    date_creation       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE plans_maintenance_preventive IS 'Plans de maintenance préventive planifiée';
COMMENT ON COLUMN plans_maintenance_preventive.frequence_type IS 'Unité de fréquence : jours, semaines, mois, heures ou km';


-- =============================================================================
-- TABLE 8 : categories_pieces
-- Catégories de pièces de rechange pour le stock
-- =============================================================================
CREATE TABLE categories_pieces (
    id              SERIAL PRIMARY KEY,
    nom             VARCHAR(100) NOT NULL,
    description     TEXT
);

COMMENT ON TABLE categories_pieces IS 'Catégories des pièces de rechange';


-- =============================================================================
-- TABLE 9 : pieces_rechange
-- Stock de pièces de rechange disponibles pour la maintenance
-- =============================================================================
CREATE TABLE pieces_rechange (
    id                  SERIAL PRIMARY KEY,
    reference           VARCHAR(100) UNIQUE NOT NULL,    -- Référence fabricant
    nom                 VARCHAR(150) NOT NULL,
    description         TEXT,
    quantite_stock      INTEGER DEFAULT 0,
    quantite_minimale   INTEGER DEFAULT 1,               -- Seuil d alerte de stock
    unite               VARCHAR(20) DEFAULT 'pièce',    -- pièce, litre, kg...
    prix_unitaire       DECIMAL(10,2),                   -- Prix en MAD
    fournisseur         VARCHAR(150),
    emplacement_stock   VARCHAR(100),                    -- Localisation dans le magasin
    categorie_id        INTEGER REFERENCES categories_pieces(id) ON DELETE SET NULL,
    date_creation       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE pieces_rechange IS 'Stock de pièces de rechange';
COMMENT ON COLUMN pieces_rechange.quantite_minimale IS 'Seuil déclenchant une alerte de réapprovisionnement';


-- =============================================================================
-- TABLE 10 : consommation_pieces
-- Suivi des pièces utilisées pour chaque ordre de travail
-- =============================================================================
CREATE TABLE consommation_pieces (
    id              SERIAL PRIMARY KEY,
    quantite        INTEGER NOT NULL,
    date_utilisation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ot_id           INTEGER NOT NULL REFERENCES ordres_travail(id) ON DELETE CASCADE,
    piece_id        INTEGER NOT NULL REFERENCES pieces_rechange(id) ON DELETE CASCADE
);

COMMENT ON TABLE consommation_pieces IS 'Pièces consommées par ordre de travail';


-- =============================================================================
-- TABLE 11 : mesures_capteurs
-- Données IoT : mesures envoyées par les capteurs ESP32
-- =============================================================================
CREATE TABLE mesures_capteurs (
    id              SERIAL PRIMARY KEY,
    type_capteur    VARCHAR(50) NOT NULL,                -- 'temperature', 'vibration', 'pression'
    valeur          FLOAT NOT NULL,                      -- Valeur numérique mesurée
    unite           VARCHAR(20) NOT NULL,                -- '°C', 'mm/s', 'bar'
    timestamp       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    equipement_id   INTEGER NOT NULL REFERENCES equipements(id) ON DELETE CASCADE
);

COMMENT ON TABLE mesures_capteurs IS 'Données temps réel envoyées par les capteurs ESP32';
COMMENT ON COLUMN mesures_capteurs.type_capteur IS 'Type : temperature, vibration, pression, etc.';

-- Index pour accélérer les requêtes de séries temporelles
CREATE INDEX idx_mesures_equipement_time
    ON mesures_capteurs (equipement_id, timestamp DESC);


-- =============================================================================
-- TABLE 12 : alertes_ia
-- Alertes générées par le module d'intelligence artificielle
-- =============================================================================
CREATE TABLE alertes_ia (
    id                  SERIAL PRIMARY KEY,
    type_alerte         VARCHAR(100) NOT NULL,           -- Ex: 'surchauffe_detectee'
    message             TEXT NOT NULL,                   -- Description de l alerte
    niveau              VARCHAR(20) DEFAULT 'warning'
                        CHECK (niveau IN ('info', 'warning', 'critique')),
    valeur_detectee     FLOAT,                           -- Valeur ayant déclenché l alerte
    seuil_reference     FLOAT,                           -- Seuil normal de référence
    probabilite_panne   FLOAT,                           -- Score de confiance du modèle IA (0 à 1)
    traitee             BOOLEAN DEFAULT FALSE,            -- TRUE si l alerte a été prise en compte
    date_alerte         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_traitement     TIMESTAMP,
    equipement_id       INTEGER NOT NULL REFERENCES equipements(id) ON DELETE CASCADE,
    ot_genere_id        INTEGER REFERENCES ordres_travail(id) ON DELETE SET NULL
);

COMMENT ON TABLE alertes_ia IS 'Alertes générées par le module IA de maintenance prédictive';
COMMENT ON COLUMN alertes_ia.probabilite_panne IS 'Score de confiance du modèle entre 0 et 1';
COMMENT ON COLUMN alertes_ia.ot_genere_id IS 'OT créé automatiquement suite à cette alerte';


-- =============================================================================
-- TABLE 13 : notifications
-- Notifications envoyées aux utilisateurs (alertes, rappels, OT assignés...)
-- =============================================================================
CREATE TABLE notifications (
    id              SERIAL PRIMARY KEY,
    titre           VARCHAR(200) NOT NULL,
    message         TEXT NOT NULL,
    type            VARCHAR(50) DEFAULT 'info'
                    CHECK (type IN ('info', 'alerte', 'rappel', 'urgent')),
    lue             BOOLEAN DEFAULT FALSE,
    date_envoi      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    utilisateur_id  INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE
);

COMMENT ON TABLE notifications IS 'Notifications envoyées aux utilisateurs';


-- =============================================================================
-- VUE 1 : vue_ordres_travail_complets
-- Vue enrichie des OT avec toutes les informations liées
-- =============================================================================
CREATE VIEW vue_ordres_travail_complets AS
SELECT
    ot.id,
    ot.numero,
    ot.titre,
    ot.statut,
    ot.priorite,
    ot.date_creation,
    ot.date_planifiee,
    ot.duree_reelle,
    ot.cout_reel,
    ot.genere_par_ia,
    eq.code         AS equipement_code,
    eq.nom          AS equipement_nom,
    eq.statut       AS equipement_statut,
    ti.nom          AS type_intervention,
    CONCAT(u_tech.prenom, ' ', u_tech.nom) AS technicien,
    CONCAT(u_crea.prenom, ' ', u_crea.nom) AS createur
FROM ordres_travail ot
LEFT JOIN equipements eq         ON ot.equipement_id       = eq.id
LEFT JOIN types_intervention ti  ON ot.type_intervention_id = ti.id
LEFT JOIN utilisateurs u_tech    ON ot.technicien_id        = u_tech.id
LEFT JOIN utilisateurs u_crea    ON ot.createur_id          = u_crea.id;

COMMENT ON VIEW vue_ordres_travail_complets IS 'Vue complète des OT avec équipements et utilisateurs';


-- =============================================================================
-- VUE 2 : vue_kpis_equipements
-- Calcul automatique des KPIs de maintenance par équipement (MTBF, MTTR)
-- =============================================================================
CREATE VIEW vue_kpis_equipements AS
SELECT
    eq.id,
    eq.code,
    eq.nom,
    COUNT(ot.id)                                    AS total_interventions,
    COUNT(ot.id) FILTER (WHERE ot.statut = 'termine') AS interventions_terminees,
    AVG(ot.duree_reelle) FILTER (WHERE ot.statut = 'termine') AS mttr_minutes,
    SUM(ot.cout_reel)                               AS cout_total_mad
FROM equipements eq
LEFT JOIN ordres_travail ot ON ot.equipement_id = eq.id
GROUP BY eq.id, eq.code, eq.nom;

COMMENT ON VIEW vue_kpis_equipements IS 'KPIs de maintenance par équipement (MTTR, coûts, interventions)';


-- =============================================================================
-- VUE 3 : vue_alertes_stock
-- Pièces dont le stock est inférieur ou égal au seuil minimum
-- =============================================================================
CREATE VIEW vue_alertes_stock AS
SELECT
    id,
    reference,
    nom,
    quantite_stock,
    quantite_minimale,
    (quantite_minimale - quantite_stock) AS manquant,
    fournisseur
FROM pieces_rechange
WHERE quantite_stock <= quantite_minimale;

COMMENT ON VIEW vue_alertes_stock IS 'Pièces en rupture ou en alerte de stock';
