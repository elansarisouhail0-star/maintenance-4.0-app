// =============================================================================
// src/pages/Simulateur.js — Simulateur de données capteurs dans l'application
// Permet de lancer des scénarios réels simulés directement depuis le navigateur
// =============================================================================

import { useState, useRef, useEffect } from 'react';
import { equipementsAPI, capteursAPI, iaAPI } from '../services/api';
import './Simulateur.css';

// ─── Scénarios disponibles ────────────────────────────────────────────────────
const SCENARIOS = [
  {
    id:          1,
    nom:         'Fonctionnement Normal',
    description: 'Température stable entre 55–65°C avec légères variations naturelles',
    icone:       '✅',
    couleur:     'var(--accent-green)',
    duree:       20,
    niveau:      'normal',
  },
  {
    id:          2,
    nom:         'Montée Progressive',
    description: 'Température monte de 60°C à 80°C — simule une usure ou surcharge',
    icone:       '📈',
    couleur:     'var(--accent-orange)',
    duree:       25,
    niveau:      'warning',
  },
  {
    id:          3,
    nom:         'Surchauffe Critique 🔥',
    description: 'Température dépasse 85°C — l\'IA génère un OT automatiquement !',
    icone:       '🚨',
    couleur:     'var(--accent-red)',
    duree:       20,
    niveau:      'critique',
  },
  {
    id:          4,
    nom:         'Retour Normal',
    description: 'Refroidissement de 88°C à 58°C — simule un retour après maintenance',
    icone:       '❄️',
    couleur:     'var(--accent-blue)',
    duree:       15,
    niveau:      'normal',
  },
  {
    id:          5,
    nom:         'Pic Soudain',
    description: 'Température normale puis pic brutal à 92°C — simule un court-circuit',
    icone:       '⚡',
    couleur:     'var(--accent-red)',
    duree:       30,
    niveau:      'critique',
  },
  {
    id:          6,
    nom:         'Démonstration Complète',
    description: 'Enchaîne tous les scénarios — parfait pour la soutenance',
    icone:       '🎓',
    couleur:     'var(--accent-purple)',
    duree:       80,
    niveau:      'complet',
  },
];

// ─── Génération des températures selon le scénario ───────────────────────────
function genererTemperature(scenarioId, index, total) {
  const rand  = () => (Math.random() - 0.5) * 3;
  const gauss = (moy, sigma) => moy + (Math.random() - 0.5) * sigma * 2;

  switch (scenarioId) {
    case 1: // Normal
      return Math.max(50, Math.min(68,
        60 + gauss(0, 1.5) + 3 * Math.sin(index * 0.3)
      ));

    case 2: // Montée progressive
      return 60 + (index / total) * 20 + gauss(0, 0.8);

    case 3: // Surchauffe critique
      if (index < 8) return 70 + index * 2.5 + rand();
      return Math.max(84, Math.min(96, 88 + gauss(0, 2)));

    case 4: // Retour normal
      return Math.max(55, 88 - (index / total) * 30 + gauss(0, 0.6));

    case 5: // Pic soudain
      if (index < 10) return 62 + gauss(0, 1.5);
      if (index < 15) return 62 + ((index - 10) / 5) * 30 + rand();
      if (index < 20) return Math.max(84, Math.min(96, 90 + gauss(0, 2)));
      return Math.max(58, 90 - ((index - 20) / 10) * 30 + gauss(0, 1.5));

    default:
      return 60 + gauss(0, 2);
  }
}

// ─── Composant carte scénario ─────────────────────────────────────────────────
function ScenarioCard({ scenario, actif, enCours, onClick }) {
  return (
    <button
      className={`scenario-card ${actif ? 'actif' : ''} ${enCours && !actif ? 'desactive' : ''}`}
      style={{ '--scenario-couleur': scenario.couleur }}
      onClick={() => onClick(scenario)}
      disabled={enCours}
    >
      <div className="scenario-icone">{scenario.icone}</div>
      <div className="scenario-info">
        <div className="scenario-nom">{scenario.nom}</div>
        <div className="scenario-desc">{scenario.description}</div>
        <div className="scenario-meta">
          <span className={`badge badge-${scenario.niveau === 'normal' ? 'en_service' : scenario.niveau === 'warning' ? 'warning' : scenario.niveau === 'critique' ? 'critique' : 'info'}`}>
            {scenario.niveau}
          </span>
          <span className="scenario-duree">~{scenario.duree} mesures</span>
        </div>
      </div>
    </button>
  );
}

// ─── Page principale Simulateur ───────────────────────────────────────────────
export default function Simulateur() {
  const [equipements, setEquipements]       = useState([]);
  const [equipementId, setEquipementId]     = useState('');
  const [scenarioActif, setScenarioActif]   = useState(null);
  const [enCours, setEnCours]               = useState(false);
  const [logs, setLogs]                     = useState([]);
  const [progression, setProgression]       = useState(0);
  const [total, setTotal]                   = useState(0);
  const [tempActuelle, setTempActuelle]     = useState(null);
  const [stats, setStats]                   = useState({ envoyes: 0, alertes: 0, ot: 0 });
  const stopRef   = useRef(false);
  const logsRef   = useRef(null);

  useEffect(() => {
    equipementsAPI.lister().then(res => {
      setEquipements(res.data);
      if (res.data.length > 0) setEquipementId(res.data[0].id);
    });
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  const ajouterLog = (message, type = 'info') => {
    const heure = new Date().toLocaleTimeString('fr-FR');
    setLogs(prev => [...prev, { message, type, heure, id: Date.now() }]);
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const lancerScenario = async (scenario) => {
    if (!equipementId) {
      ajouterLog('⚠ Sélectionnez un équipement d\'abord', 'warning');
      return;
    }

    // Scénario complet — enchaîne les autres
    if (scenario.id === 6) {
      await lancerDemoComplete();
      return;
    }

    setScenarioActif(scenario);
    setEnCours(true);
    stopRef.current = false;
    setLogs([]);
    setProgression(0);
    setTotal(scenario.duree);
    setStats({ envoyes: 0, alertes: 0, ot: 0 });

    ajouterLog(`🚀 Démarrage : ${scenario.nom}`, 'success');
    ajouterLog(`📡 Équipement ID : ${equipementId} — ${scenario.duree} mesures`, 'info');

    let envoyes = 0, alertes = 0, ot = 0;

    for (let i = 0; i < scenario.duree; i++) {
      if (stopRef.current) {
        ajouterLog('⏹ Simulation arrêtée par l\'utilisateur', 'warning');
        break;
      }

      const temp = genererTemperature(scenario.id, i, scenario.duree);
      setTempActuelle(temp);

      try {
        await capteursAPI.historique; // ping
        const res = await fetch('http://localhost:8000/api/capteurs/mesure', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            type_capteur:  'temperature',
            valeur:        parseFloat(temp.toFixed(2)),
            unite:         '°C',
            equipement_id: parseInt(equipementId),
          }),
        });

        if (res.ok) {
          envoyes++;
          const couleurTemp = temp >= 85 ? 'error' : temp >= 70 ? 'warning' : 'success';
          ajouterLog(
            `[${String(i+1).padStart(2,'0')}/${scenario.duree}] 🌡 ${temp.toFixed(1)}°C${temp >= 85 ? ' 🔥 CRITIQUE' : temp >= 70 ? ' ⚠ Élevée' : ''}`,
            couleurTemp
          );
        }
      } catch {
        ajouterLog(`[${i+1}] ❌ Erreur d'envoi`, 'error');
      }

      setProgression(i + 1);
      setStats({ envoyes, alertes, ot });

      // Analyse IA tous les 5 mesures
      if ((i + 1) % 5 === 0) {
        try {
          const iaRes = await fetch(`http://localhost:8000/api/ia/analyser/${equipementId}`, {
            method: 'POST'
          });
          if (iaRes.ok) {
            const data = await iaRes.json();
            if (data.statut === 'critique') {
              alertes++;
              ot += data.ot_genere_id ? 1 : 0;
              ajouterLog(`🤖 IA → CRITIQUE ! Probabilité panne : ${Math.round(data.probabilite * 100)}%${data.ot_genere_id ? ` — OT #${data.ot_genere_id} créé automatiquement !` : ''}`, 'error');
            } else if (data.statut === 'warning') {
              alertes++;
              ajouterLog(`🤖 IA → Avertissement — Probabilité : ${Math.round(data.probabilite * 100)}%`, 'warning');
            } else if (data.statut === 'normal') {
              ajouterLog(`🤖 IA → Normal ✓`, 'success');
            }
            setStats({ envoyes, alertes, ot });
          }
        } catch { /* ignore */ }
      }

      await sleep(1500); // 1.5 secondes entre chaque mesure
    }

    ajouterLog(`✅ Simulation terminée — ${envoyes} mesures envoyées`, 'success');
    setEnCours(false);
    setScenarioActif(null);
  };

  const lancerDemoComplete = async () => {
    const sequence = [
      { ...SCENARIOS[0], duree: 15 },
      { ...SCENARIOS[1], duree: 15 },
      { ...SCENARIOS[2], duree: 15 },
      { ...SCENARIOS[3], duree: 12 },
    ];

    setEnCours(true);
    stopRef.current = false;
    setLogs([]);
    setStats({ envoyes: 0, alertes: 0, ot: 0 });

    ajouterLog('🎓 DÉMONSTRATION COMPLÈTE — Maintenance 4.0', 'success');
    ajouterLog('Enchaînement de 4 scénarios...', 'info');

    for (const sc of sequence) {
      if (stopRef.current) break;
      setScenarioActif(sc);
      setTotal(sc.duree);
      setProgression(0);
      ajouterLog(`\n━━━ ${sc.icone} ${sc.nom} ━━━`, 'info');
      await lancerScenarioInterne(sc);
      if (!stopRef.current) {
        ajouterLog('⏳ Pause 2 secondes...', 'info');
        await sleep(2000);
      }
    }

    ajouterLog('\n🎉 DÉMONSTRATION TERMINÉE !', 'success');
    ajouterLog('→ Vérifiez Capteurs IoT pour le graphique', 'info');
    ajouterLog('→ Vérifiez Alertes IA pour les détections', 'info');
    ajouterLog('→ Vérifiez Ordres de Travail pour les OT générés', 'info');
    setEnCours(false);
    setScenarioActif(null);
  };

  const lancerScenarioInterne = async (scenario) => {
    for (let i = 0; i < scenario.duree; i++) {
      if (stopRef.current) break;

      const temp = genererTemperature(scenario.id, i, scenario.duree);
      setTempActuelle(temp);

      try {
        await fetch('http://localhost:8000/api/capteurs/mesure', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            type_capteur:  'temperature',
            valeur:        parseFloat(temp.toFixed(2)),
            unite:         '°C',
            equipement_id: parseInt(equipementId),
          }),
        });

        const couleur = temp >= 85 ? 'error' : temp >= 70 ? 'warning' : 'success';
        ajouterLog(
          `  [${String(i+1).padStart(2,'0')}] 🌡 ${temp.toFixed(1)}°C${temp >= 85 ? ' 🔥' : temp >= 70 ? ' ⚠' : ''}`,
          couleur
        );
      } catch { /* ignore */ }

      setProgression(i + 1);

      if ((i + 1) % 5 === 0) {
        try {
          const iaRes = await fetch(`http://localhost:8000/api/ia/analyser/${equipementId}`, { method: 'POST' });
          if (iaRes.ok) {
            const data = await iaRes.json();
            if (data.statut !== 'normal' && data.probabilite) {
              const type = data.statut === 'critique' ? 'error' : 'warning';
              ajouterLog(`  🤖 IA → ${data.statut.toUpperCase()} (${Math.round(data.probabilite*100)}%)${data.ot_genere_id ? ' — OT généré !' : ''}`, type);
            }
          }
        } catch { /* ignore */ }
      }

      await sleep(1500);
    }
  };

  const arreter = () => {
    stopRef.current = true;
    ajouterLog('⏹ Arrêt demandé...', 'warning');
  };

  const getTempColor = (t) => {
    if (!t) return 'var(--text-muted)';
    if (t >= 85) return 'var(--accent-red)';
    if (t >= 70) return 'var(--accent-orange)';
    return 'var(--accent-green)';
  };

  const pct = total > 0 ? Math.round((progression / total) * 100) : 0;

  return (
    <div className="page-content fade-in">

      <div className="page-header">
        <div>
          <h1 className="page-title">Simulateur IoT</h1>
          <p className="page-subtitle">Simulation de données capteurs en temps réel — Maintenance 4.0</p>
        </div>
        {enCours && (
          <button className="btn btn-danger" onClick={arreter}>⏹ Arrêter</button>
        )}
      </div>

      <div className="sim-layout">

        {/* Colonne gauche */}
        <div className="sim-left">

          {/* Sélecteur équipement */}
          <div className="card sim-eq-card">
            <h3 className="card-title" style={{ marginBottom: 12 }}>Équipement cible</h3>
            <select className="input" value={equipementId}
              onChange={e => setEquipementId(e.target.value)} disabled={enCours}>
              <option value="">Sélectionner un équipement...</option>
              {equipements.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.code} — {eq.nom}</option>
              ))}
            </select>
            {equipements.length === 0 && (
              <p className="sim-hint">⚠ Créez d'abord un équipement dans la page Équipements</p>
            )}
          </div>

          {/* Scénarios */}
          <div className="sim-scenarios">
            {SCENARIOS.map(sc => (
              <ScenarioCard
                key={sc.id}
                scenario={sc}
                actif={scenarioActif?.id === sc.id}
                enCours={enCours}
                onClick={lancerScenario}
              />
            ))}
          </div>

        </div>

        {/* Colonne droite */}
        <div className="sim-right">

          {/* Température actuelle */}
          <div className="card sim-temp-card">
            <div className="sim-temp-header">
              <div>
                <p className="sim-temp-label">Température envoyée</p>
                <div className="sim-temp-valeur" style={{ color: getTempColor(tempActuelle) }}>
                  {tempActuelle ? `${tempActuelle.toFixed(1)}°C` : '—'}
                </div>
              </div>
              <div className="sim-temp-statut">
                {tempActuelle >= 85 ? (
                  <span className="badge badge-critique">CRITIQUE 🔥</span>
                ) : tempActuelle >= 70 ? (
                  <span className="badge badge-warning">ÉLEVÉE ⚠</span>
                ) : tempActuelle ? (
                  <span className="badge badge-en_service">NORMALE ✓</span>
                ) : (
                  <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>EN ATTENTE</span>
                )}
              </div>
            </div>

            {/* Barre de progression */}
            {enCours && (
              <div className="sim-progress-container">
                <div className="sim-progress-header">
                  <span className="sim-progress-label">
                    {scenarioActif?.nom} — {progression}/{total} mesures
                  </span>
                  <span className="sim-progress-pct">{pct}%</span>
                </div>
                <div className="sim-progress-bar">
                  <div
                    className="sim-progress-fill"
                    style={{
                      width: `${pct}%`,
                      background: scenarioActif?.couleur || 'var(--accent-blue)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="sim-stats">
            <div className="card sim-stat">
              <div className="sim-stat-val" style={{ color: 'var(--accent-blue)' }}>{stats.envoyes}</div>
              <div className="sim-stat-label">Mesures envoyées</div>
            </div>
            <div className="card sim-stat">
              <div className="sim-stat-val" style={{ color: 'var(--accent-orange)' }}>{stats.alertes}</div>
              <div className="sim-stat-label">Alertes IA</div>
            </div>
            <div className="card sim-stat">
              <div className="sim-stat-val" style={{ color: 'var(--accent-green)' }}>{stats.ot}</div>
              <div className="sim-stat-label">OT générés</div>
            </div>
          </div>

          {/* Logs */}
          <div className="card sim-logs-card">
            <div className="sim-logs-header">
              <h3 className="card-title">Journal en temps réel</h3>
              <button className="btn btn-secondary btn-sm"
                onClick={() => setLogs([])}>Effacer</button>
            </div>
            <div className="sim-logs" ref={logsRef}>
              {logs.length === 0 ? (
                <p className="sim-logs-empty">Lancez un scénario pour voir les logs...</p>
              ) : (
                logs.map(log => (
                  <div key={log.id} className={`sim-log sim-log-${log.type}`}>
                    <span className="sim-log-heure">{log.heure}</span>
                    <span className="sim-log-msg">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
