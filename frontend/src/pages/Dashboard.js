// =============================================================================
// src/pages/Dashboard.js — Tableau de bord principal
// Affiche les KPIs, graphiques et alertes en temps réel
// =============================================================================

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { equipementsAPI, otAPI, iaAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

// ─── Composant carte KPI ─────────────────────────────────────────────────────
function KpiCard({ titre, valeur, sous_titre, couleur, icone }) {
  return (
    <div className="kpi-card card fade-in" style={{ borderTopColor: couleur }}>
      <div className="kpi-top">
        <span className="kpi-icon" style={{ background: `${couleur}20`, color: couleur }}>
          {icone}
        </span>
        <span className="kpi-valeur" style={{ color: couleur }}>{valeur}</span>
      </div>
      <div className="kpi-titre">{titre}</div>
      {sous_titre && <div className="kpi-sous-titre">{sous_titre}</div>}
    </div>
  );
}

// ─── Tooltip personnalisé pour le graphique ───────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name} : <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { utilisateur } = useAuth();
  const [kpis, setKpis]           = useState(null);
  const [alertes, setAlertes]     = useState([]);
  const [otRecents, setOtRecents] = useState([]);
  const [loading, setLoading]     = useState(true);

  // Données simulées pour le graphique de température (remplacées par données réelles)
  const [donneesGraphique] = useState(() =>
    Array.from({ length: 12 }, (_, i) => ({
      heure: `${String(i * 2).padStart(2, '0')}:00`,
      temperature: 55 + Math.random() * 30,
      seuil: 70,
    }))
  );

  useEffect(() => {
    chargerDonnees();
  }, []);

  const chargerDonnees = async () => {
    try {
      const [eqRes, otRes, alertesRes] = await Promise.all([
        equipementsAPI.lister(),
        otAPI.lister({ limit: 5 }),
        iaAPI.alertes({ traitee: false }),
      ]);

      const equipements = eqRes.data;
      const ots = otRes.data;

      setKpis({
        total_eq:      equipements.length,
        eq_en_service: equipements.filter(e => e.statut === 'en_service').length,
        eq_en_panne:   equipements.filter(e => e.statut === 'en_panne').length,
        ot_ouverts:    ots.filter(o => o.statut === 'ouvert').length,
        ot_en_cours:   ots.filter(o => o.statut === 'en_cours').length,
        alertes_ia:    alertesRes.data.length,
      });

      setAlertes(alertesRes.data.slice(0, 5));
      setOtRecents(ots);
    } catch (err) {
      console.error('Erreur chargement dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const traiterAlerte = async (id) => {
    await iaAPI.traiterAlerte(id);
    setAlertes(prev => prev.filter(a => a.id !== id));
  };

  if (loading) return (
    <div className="page-content">
      <div className="spinner" />
    </div>
  );

  return (
    <div className="page-content fade-in">

      {/* En-tête */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Bonjour {utilisateur?.prenom} — {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
          </p>
        </div>
        <div className="dashboard-live">
          <span className="live-dot" />
          <span>Temps réel</span>
        </div>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <KpiCard
            titre="Équipements"
            valeur={kpis.total_eq}
            sous_titre={`${kpis.eq_en_service} en service`}
            couleur="var(--accent-blue)"
            icone="⚙"
          />
          <KpiCard
            titre="En panne"
            valeur={kpis.eq_en_panne}
            sous_titre="Intervention requise"
            couleur="var(--accent-red)"
            icone="⚠"
          />
          <KpiCard
            titre="OT ouverts"
            valeur={kpis.ot_ouverts}
            sous_titre={`${kpis.ot_en_cours} en cours`}
            couleur="var(--accent-orange)"
            icone="📋"
          />
          <KpiCard
            titre="Alertes IA"
            valeur={kpis.alertes_ia}
            sous_titre="Non traitées"
            couleur="var(--accent-purple)"
            icone="🤖"
          />
        </div>
      )}

      {/* Graphique + Alertes */}
      <div className="dashboard-row">

        {/* Graphique température */}
        <div className="card dashboard-chart-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Température — Équipement EQ-001</h3>
              <p className="card-subtitle">Dernières 24 heures · Seuil d'alerte : 70°C</p>
            </div>
            <span className="badge badge-warning">Live</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={donneesGraphique} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="var(--border-light)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="heure" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} domain={[40, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone" dataKey="temperature" name="Temp. (°C)"
                stroke="var(--accent-blue)" strokeWidth={2}
                dot={false} activeDot={{ r: 4, fill: 'var(--accent-blue)' }}
              />
              <Line
                type="monotone" dataKey="seuil" name="Seuil"
                stroke="var(--accent-red)" strokeWidth={1.5}
                strokeDasharray="4 4" dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Alertes IA */}
        <div className="card dashboard-alertes-card">
          <div className="card-header">
            <h3 className="card-title">Alertes IA</h3>
            <span className="badge badge-warning">{alertes.length}</span>
          </div>

          {alertes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <p className="empty-state-text">Aucune alerte active</p>
            </div>
          ) : (
            <div className="alertes-list">
              {alertes.map(alerte => (
                <div key={alerte.id} className={`alerte-item alerte-${alerte.niveau}`}>
                  <div className="alerte-header">
                    <span className={`badge badge-${alerte.niveau}`}>{alerte.niveau}</span>
                    <span className="alerte-proba">
                      {alerte.probabilite_panne
                        ? `${Math.round(alerte.probabilite_panne * 100)}% risque`
                        : ''}
                    </span>
                  </div>
                  <p className="alerte-message">{alerte.message}</p>
                  <div className="alerte-footer">
                    <span className="alerte-date">
                      {new Date(alerte.date_alerte).toLocaleString('fr-FR')}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => traiterAlerte(alerte.id)}
                    >
                      Traiter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* OT récents */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header" style={{ marginBottom: 16 }}>
          <h3 className="card-title">Ordres de Travail récents</h3>
          <a href="/ordres-travail" className="btn btn-secondary btn-sm">Voir tout</a>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Titre</th>
                <th>Statut</th>
                <th>Priorité</th>
                <th>Généré par IA</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {otRecents.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                    Aucun ordre de travail
                  </td>
                </tr>
              ) : (
                otRecents.map(ot => (
                  <tr key={ot.id}>
                    <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{ot.numero}</code></td>
                    <td>{ot.titre}</td>
                    <td><span className={`badge badge-${ot.statut}`}>{ot.statut.replace('_', ' ')}</span></td>
                    <td><span className={`priorite-${ot.priorite}`}>● {ot.priorite}</span></td>
                    <td>{ot.genere_par_ia ? <span className="badge badge-info">IA</span> : '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(ot.date_creation).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
