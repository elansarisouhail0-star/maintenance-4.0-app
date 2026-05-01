// =============================================================================
// src/pages/Capteurs.js — Monitoring temps réel des capteurs ESP32
// =============================================================================

import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { capteursAPI, equipementsAPI, iaAPI } from '../services/api';
import './Capteurs.css';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>{label}</p>
      <p style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>
        {payload[0]?.value?.toFixed(1)} °C
      </p>
    </div>
  );
}

export default function Capteurs() {
  const [equipements, setEquipements]     = useState([]);
  const [equipementActif, setEquipementActif] = useState(null);
  const [mesures, setMesures]             = useState([]);
  const [derniereMesure, setDerniereMesure] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [autoRefresh, setAutoRefresh]     = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    chargerEquipements();
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (!equipementActif) return;
    chargerMesures();
    if (autoRefresh) {
      intervalRef.current = setInterval(chargerMesures, 10000); // Rafraîchir toutes les 10s
    }
    return () => clearInterval(intervalRef.current);
  }, [equipementActif, autoRefresh]);

  const chargerEquipements = async () => {
    const res = await equipementsAPI.lister();
    setEquipements(res.data);
    if (res.data.length > 0) setEquipementActif(res.data[0]);
    setLoading(false);
  };

  const chargerMesures = async () => {
    if (!equipementActif) return;
    try {
      const [mesuresRes, derniereRes] = await Promise.all([
        capteursAPI.historique(equipementActif.id, { limit: 50, type_capteur: 'temperature' }),
        capteursAPI.derniereMesure(equipementActif.id),
      ]);

      // Inverser pour ordre chronologique et formater pour le graphique
      const donnees = mesuresRes.data.reverse().map(m => ({
        heure:  new Date(m.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        valeur: parseFloat(m.valeur.toFixed(1)),
      }));

      setMesures(donnees);
      setDerniereMesure(derniereRes.data);
    } catch {
      // Pas de mesures encore disponibles
      setMesures([]);
      setDerniereMesure(null);
    }
  };

  const analyserAvecIA = async () => {
    if (!equipementActif) return;
    try {
      await iaAPI.analyser(equipementActif.id);
      alert('Analyse IA effectuée. Vérifiez la page Alertes IA.');
    } catch {
      alert('Erreur lors de l\'analyse IA');
    }
  };

  const getTempColor = (val) => {
    if (!val) return 'var(--text-muted)';
    if (val >= 85) return 'var(--accent-red)';
    if (val >= 70) return 'var(--accent-orange)';
    return 'var(--accent-green)';
  };

  const getTempStatut = (val) => {
    if (!val) return { label: 'Aucune donnée', classe: 'info' };
    if (val >= 85) return { label: 'CRITIQUE', classe: 'critique' };
    if (val >= 70) return { label: 'AVERTISSEMENT', classe: 'warning' };
    return { label: 'NORMAL', classe: 'en_service' };
  };

  if (loading) return <div className="page-content"><div className="spinner" /></div>;

  const statut = getTempStatut(derniereMesure?.valeur);

  return (
    <div className="page-content fade-in">

      <div className="page-header">
        <div>
          <h1 className="page-title">Capteurs IoT</h1>
          <p className="page-subtitle">Monitoring temps réel · ESP32</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn ${autoRefresh ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '⏸ Pause' : '▶ Live'}
          </button>
          <button className="btn btn-secondary" onClick={analyserAvecIA}>
            🤖 Analyser avec l'IA
          </button>
        </div>
      </div>

      <div className="capteurs-layout">

        {/* Sélecteur d'équipement */}
        <div className="card capteurs-sidebar">
          <h3 className="card-title" style={{ marginBottom: 14 }}>Équipements</h3>
          {equipements.map(eq => (
            <button
              key={eq.id}
              className={`eq-selector ${equipementActif?.id === eq.id ? 'active' : ''}`}
              onClick={() => setEquipementActif(eq)}
            >
              <span className={`badge badge-${eq.statut}`} style={{ fontSize: '0.65rem' }}>
                {eq.statut.replace(/_/g, ' ')}
              </span>
              <div className="eq-selector-nom">{eq.nom}</div>
              <div className="eq-selector-code">{eq.code}</div>
            </button>
          ))}
        </div>

        {/* Panneau principal */}
        <div className="capteurs-main">

          {/* Valeur actuelle */}
          {derniereMesure ? (
            <div className="card capteur-actuel">
              <div className="capteur-actuel-header">
                <div>
                  <p className="capteur-actuel-label">Température actuelle</p>
                  <div className="capteur-actuel-valeur" style={{ color: getTempColor(derniereMesure.valeur) }}>
                    {derniereMesure.valeur.toFixed(1)}
                    <span className="capteur-actuel-unite">°C</span>
                  </div>
                </div>
                <div className="capteur-actuel-meta">
                  <span className={`badge badge-${statut.classe}`}>{statut.label}</span>
                  <div className="capteur-timestamp">
                    Dernière mise à jour :<br />
                    {new Date(derniereMesure.timestamp).toLocaleString('fr-FR')}
                  </div>
                </div>
              </div>

              {/* Barre de progression thermique */}
              <div className="capteur-barre-container">
                <div className="capteur-barre-labels">
                  <span>0°C</span>
                  <span style={{ color: 'var(--accent-orange)' }}>70°C</span>
                  <span style={{ color: 'var(--accent-red)' }}>85°C</span>
                  <span>100°C</span>
                </div>
                <div className="capteur-barre">
                  <div
                    className="capteur-barre-fill"
                    style={{
                      width: `${Math.min((derniereMesure.valeur / 100) * 100, 100)}%`,
                      background: getTempColor(derniereMesure.valeur),
                    }}
                  />
                  <div className="capteur-barre-seuil" style={{ left: '70%' }} />
                  <div className="capteur-barre-seuil" style={{ left: '85%' }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="card empty-state">
              <div className="empty-state-icon">📡</div>
              <p className="empty-state-text">
                Aucune mesure reçue pour cet équipement.<br />
                Vérifiez que l'ESP32 est connecté et envoie des données.
              </p>
            </div>
          )}

          {/* Graphique historique */}
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-header">
              <div>
                <h3 className="card-title">Historique de température</h3>
                <p className="card-subtitle">
                  {mesures.length} mesures — {equipementActif?.nom}
                  {autoRefresh && <span className="live-badge"> · Live</span>}
                </p>
              </div>
            </div>

            {mesures.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <p className="empty-state-text">Pas encore de données à afficher</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={mesures} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                  <CartesianGrid stroke="var(--border-light)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="heure" tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={70} stroke="var(--accent-orange)" strokeDasharray="4 4"
                    label={{ value: 'Seuil 70°C', fill: 'var(--accent-orange)', fontSize: 11 }} />
                  <ReferenceLine y={85} stroke="var(--accent-red)" strokeDasharray="4 4"
                    label={{ value: 'Critique 85°C', fill: 'var(--accent-red)', fontSize: 11 }} />
                  <Line
                    type="monotone" dataKey="valeur"
                    stroke="var(--accent-blue)" strokeWidth={2}
                    dot={false} activeDot={{ r: 4, fill: 'var(--accent-blue)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
