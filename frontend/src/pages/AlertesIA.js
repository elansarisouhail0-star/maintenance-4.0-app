// =============================================================================
// src/pages/AlertesIA.js — Page de gestion des alertes générées par l'IA
// =============================================================================

import { useState, useEffect } from 'react';
import { iaAPI, equipementsAPI } from '../services/api';
import './AlertesIA.css';

export default function AlertesIA() {
  const [alertes, setAlertes]         = useState([]);
  const [equipements, setEquipements] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filtre, setFiltre]           = useState({ niveau: '', traitee: 'false', equipement_id: '' });
  const [toast, setToast]             = useState(null);

  useEffect(() => { charger(); }, []);

  const charger = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtre.niveau)        params.niveau         = filtre.niveau;
      if (filtre.traitee !== '') params.traitee        = filtre.traitee === 'true';
      if (filtre.equipement_id) params.equipement_id  = filtre.equipement_id;

      const [alertesRes, eqRes] = await Promise.all([
        iaAPI.alertes(params),
        equipementsAPI.lister(),
      ]);
      setAlertes(alertesRes.data);
      setEquipements(eqRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { charger(); }, [filtre]);

  const traiter = async (id) => {
    await iaAPI.traiterAlerte(id);
    setAlertes(prev => prev.map(a => a.id === id ? { ...a, traitee: true } : a));
    afficherToast('Alerte marquée comme traitée ✓');
  };

  const afficherToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getNomEquipement = (id) => {
    const eq = equipements.find(e => e.id === id);
    return eq ? `${eq.code} — ${eq.nom}` : `#${id}`;
  };

  // Stats
  const critiques     = alertes.filter(a => a.niveau === 'critique').length;
  const warnings      = alertes.filter(a => a.niveau === 'warning').length;
  const nonTraitees   = alertes.filter(a => !a.traitee).length;

  return (
    <div className="page-content fade-in">

      <div className="page-header">
        <div>
          <h1 className="page-title">Alertes IA</h1>
          <p className="page-subtitle">Détection d'anomalies et maintenance prédictive</p>
        </div>
        <button className="btn btn-secondary" onClick={charger}>↻ Actualiser</button>
      </div>

      {/* Statistiques */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="card ia-stat ia-stat-critique">
          <div className="ia-stat-val">{critiques}</div>
          <div className="ia-stat-label">Alertes critiques</div>
        </div>
        <div className="card ia-stat ia-stat-warning">
          <div className="ia-stat-val">{warnings}</div>
          <div className="ia-stat-label">Avertissements</div>
        </div>
        <div className="card ia-stat ia-stat-pending">
          <div className="ia-stat-val">{nonTraitees}</div>
          <div className="ia-stat-label">Non traitées</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="eq-filters card" style={{ marginBottom: 20 }}>
        <select className="input" style={{ width: 160 }}
          value={filtre.niveau} onChange={e => setFiltre({...filtre, niveau: e.target.value})}>
          <option value="">Tous les niveaux</option>
          <option value="critique">Critique</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <select className="input" style={{ width: 160 }}
          value={filtre.traitee} onChange={e => setFiltre({...filtre, traitee: e.target.value})}>
          <option value="false">Non traitées</option>
          <option value="true">Traitées</option>
          <option value="">Toutes</option>
        </select>
        <select className="input" style={{ width: 220 }}
          value={filtre.equipement_id} onChange={e => setFiltre({...filtre, equipement_id: e.target.value})}>
          <option value="">Tous les équipements</option>
          {equipements.map(eq => (
            <option key={eq.id} value={eq.id}>{eq.code} — {eq.nom}</option>
          ))}
        </select>
      </div>

      {/* Liste des alertes */}
      {loading ? <div className="spinner" /> : alertes.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">✅</div>
          <p className="empty-state-text">Aucune alerte correspondant aux filtres</p>
        </div>
      ) : (
        <div className="alertes-ia-liste">
          {alertes.map(alerte => (
            <div key={alerte.id} className={`alerte-ia-card card alerte-ia-${alerte.niveau} ${alerte.traitee ? 'traitee' : ''}`}>

              <div className="alerte-ia-top">
                <div className="alerte-ia-badges">
                  <span className={`badge badge-${alerte.niveau}`}>{alerte.niveau.toUpperCase()}</span>
                  {alerte.traitee && <span className="badge badge-termine">Traitée</span>}
                  {alerte.ot_genere_id && (
                    <span className="badge badge-info">OT #{alerte.ot_genere_id} généré</span>
                  )}
                </div>
                {!alerte.traitee && (
                  <button className="btn btn-secondary btn-sm" onClick={() => traiter(alerte.id)}>
                    ✓ Marquer traitée
                  </button>
                )}
              </div>

              <p className="alerte-ia-message">{alerte.message}</p>

              <div className="alerte-ia-details">
                <div className="alerte-ia-detail">
                  <span className="detail-label">Équipement</span>
                  <span className="detail-val">{getNomEquipement(alerte.equipement_id)}</span>
                </div>
                {alerte.valeur_detectee != null && (
                  <div className="alerte-ia-detail">
                    <span className="detail-label">Valeur détectée</span>
                    <span className="detail-val" style={{ color: 'var(--accent-orange)', fontFamily: 'var(--font-mono)' }}>
                      {alerte.valeur_detectee.toFixed(1)} °C
                    </span>
                  </div>
                )}
                {alerte.probabilite_panne != null && (
                  <div className="alerte-ia-detail">
                    <span className="detail-label">Probabilité panne</span>
                    <span className="detail-val">
                      <div className="proba-bar">
                        <div className="proba-fill"
                          style={{
                            width: `${alerte.probabilite_panne * 100}%`,
                            background: alerte.probabilite_panne > 0.7
                              ? 'var(--accent-red)'
                              : alerte.probabilite_panne > 0.4
                                ? 'var(--accent-orange)'
                                : 'var(--accent-green)',
                          }}
                        />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                        {Math.round(alerte.probabilite_panne * 100)}%
                      </span>
                    </span>
                  </div>
                )}
                <div className="alerte-ia-detail">
                  <span className="detail-label">Date alerte</span>
                  <span className="detail-val" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                    {new Date(alerte.date_alerte).toLocaleString('fr-FR')}
                  </span>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            <span>{toast.type === 'success' ? '✅' : '❌'}</span>
            {toast.message}
          </div>
        </div>
      )}

    </div>
  );
}
