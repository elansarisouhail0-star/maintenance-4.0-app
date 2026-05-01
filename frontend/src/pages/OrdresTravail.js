// =============================================================================
// src/pages/OrdresTravail.js — Gestion complète des Ordres de Travail
// =============================================================================

import { useState, useEffect } from 'react';
import { otAPI, equipementsAPI } from '../services/api';
import './OrdresTravail.css';

const STATUTS   = ['ouvert', 'en_cours', 'en_attente', 'termine', 'annule'];
const PRIORITES = ['basse', 'normale', 'haute', 'urgente'];

// ─── Modal OT ─────────────────────────────────────────────────────────────────
function OTModal({ ot, equipements, onClose, onSave }) {
  const [form, setForm] = useState(ot || {
    titre: '', description: '', priorite: 'normale',
    equipement_id: '', technicien_id: null,
    date_planifiee: '', duree_estimee: '', cout_estime: '',
  });
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur]   = useState('');

  const handleSubmit = async () => {
    if (!form.titre || !form.equipement_id) {
      setErreur('Le titre et l\'équipement sont obligatoires.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        equipement_id: parseInt(form.equipement_id),
        duree_estimee: form.duree_estimee ? parseInt(form.duree_estimee) : null,
        cout_estime:   form.cout_estime   ? parseFloat(form.cout_estime) : null,
        date_planifiee: form.date_planifiee || null,
      };
      if (ot) {
        await otAPI.modifier(ot.id, payload);
      } else {
        await otAPI.creer(payload);
      }
      onSave();
    } catch (err) {
      setErreur(err.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{ot ? 'Modifier l\'OT' : 'Nouvel Ordre de Travail'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="form-group">
          <label className="label">Titre *</label>
          <input className="input" placeholder="Description courte de l'intervention"
            value={form.titre} onChange={e => setForm({...form, titre: e.target.value})} />
        </div>

        <div className="form-group">
          <label className="label">Description</label>
          <textarea className="input" rows={3} placeholder="Détails de l'intervention..."
            value={form.description}
            onChange={e => setForm({...form, description: e.target.value})} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="label">Équipement *</label>
            <select className="input" value={form.equipement_id}
              onChange={e => setForm({...form, equipement_id: e.target.value})}>
              <option value="">Sélectionner...</option>
              {equipements.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.code} — {eq.nom}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Priorité</label>
            <select className="input" value={form.priorite}
              onChange={e => setForm({...form, priorite: e.target.value})}>
              {PRIORITES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="label">Date planifiée</label>
            <input className="input" type="datetime-local"
              value={form.date_planifiee}
              onChange={e => setForm({...form, date_planifiee: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="label">Durée estimée (min)</label>
            <input className="input" type="number" placeholder="120"
              value={form.duree_estimee}
              onChange={e => setForm({...form, duree_estimee: e.target.value})} />
          </div>
        </div>

        <div className="form-group">
          <label className="label">Coût estimé (MAD)</label>
          <input className="input" type="number" placeholder="0.00"
            value={form.cout_estime}
            onChange={e => setForm({...form, cout_estime: e.target.value})} />
        </div>

        {/* Champs modification uniquement */}
        {ot && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Statut</label>
                <select className="input" value={form.statut}
                  onChange={e => setForm({...form, statut: e.target.value})}>
                  {STATUTS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Durée réelle (min)</label>
                <input className="input" type="number"
                  value={form.duree_reelle || ''}
                  onChange={e => setForm({...form, duree_reelle: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Observations technicien</label>
              <textarea className="input" rows={2}
                value={form.observations || ''}
                onChange={e => setForm({...form, observations: e.target.value})} />
            </div>
          </>
        )}

        {erreur && <div className="form-error">⚠ {erreur}</div>}

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Sauvegarde...' : (ot ? 'Modifier' : 'Créer')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale OT ──────────────────────────────────────────────────────
export default function OrdresTravail() {
  const [ots, setOts]                   = useState([]);
  const [equipements, setEquipements]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtrePriorite, setFiltrePriorite] = useState('');
  const [recherche, setRecherche]       = useState('');
  const [modal, setModal]               = useState(null);
  const [toast, setToast]               = useState(null);

  useEffect(() => { charger(); }, []);

  const charger = async () => {
    setLoading(true);
    try {
      const [otRes, eqRes] = await Promise.all([
        otAPI.lister(),
        equipementsAPI.lister(),
      ]);
      setOts(otRes.data);
      setEquipements(eqRes.data);
    } finally {
      setLoading(false);
    }
  };

  const supprimer = async (id) => {
    if (!window.confirm('Supprimer cet ordre de travail ?')) return;
    await otAPI.supprimer(id);
    setOts(prev => prev.filter(o => o.id !== id));
    afficherToast('OT supprimé');
  };

  const afficherToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const otsFiltres = ots.filter(o => {
    const matchRecherche  = !recherche || o.titre.toLowerCase().includes(recherche.toLowerCase()) || o.numero.toLowerCase().includes(recherche.toLowerCase());
    const matchStatut     = !filtreStatut    || o.statut   === filtreStatut;
    const matchPriorite   = !filtrePriorite  || o.priorite === filtrePriorite;
    return matchRecherche && matchStatut && matchPriorite;
  });

  const getNomEquipement = (id) => {
    const eq = equipements.find(e => e.id === id);
    return eq ? `${eq.code} — ${eq.nom}` : `#${id}`;
  };

  return (
    <div className="page-content fade-in">

      <div className="page-header">
        <div>
          <h1 className="page-title">Ordres de Travail</h1>
          <p className="page-subtitle">{ots.length} OT au total</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('creer')}>
          + Nouvel OT
        </button>
      </div>

      {/* Compteurs par statut */}
      <div className="ot-compteurs">
        {STATUTS.map(s => {
          const count = ots.filter(o => o.statut === s).length;
          return (
            <button
              key={s}
              className={`ot-compteur ${filtreStatut === s ? 'active' : ''}`}
              onClick={() => setFiltreStatut(filtreStatut === s ? '' : s)}
            >
              <span className={`badge badge-${s}`}>{count}</span>
              <span className="ot-compteur-label">{s.replace(/_/g, ' ')}</span>
            </button>
          );
        })}
      </div>

      {/* Filtres */}
      <div className="eq-filters card" style={{ marginBottom: 20 }}>
        <input className="input eq-search"
          placeholder="🔍  Rechercher par titre ou numéro..."
          value={recherche} onChange={e => setRecherche(e.target.value)} />
        <select className="input" style={{ width: 160 }}
          value={filtrePriorite} onChange={e => setFiltrePriorite(e.target.value)}>
          <option value="">Toutes priorités</option>
          {PRIORITES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Tableau */}
      {loading ? <div className="spinner" /> : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Titre</th>
                <th>Équipement</th>
                <th>Statut</th>
                <th>Priorité</th>
                <th>Date planifiée</th>
                <th>Coût (MAD)</th>
                <th>IA</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {otsFiltres.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                    Aucun ordre de travail trouvé
                  </td>
                </tr>
              ) : otsFiltres.map(ot => (
                <tr key={ot.id}>
                  <td><code className="eq-code">{ot.numero}</code></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{ot.titre}</div>
                    {ot.observations && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {ot.observations.slice(0, 50)}…
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {getNomEquipement(ot.equipement_id)}
                  </td>
                  <td><span className={`badge badge-${ot.statut}`}>{ot.statut.replace(/_/g, ' ')}</span></td>
                  <td>
                    <span className={`ot-priorite priorite-${ot.priorite}`}>
                      ● {ot.priorite}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {ot.date_planifiee
                      ? new Date(ot.date_planifiee).toLocaleDateString('fr-FR')
                      : '—'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    {ot.cout_reel != null
                      ? `${ot.cout_reel} MAD`
                      : ot.cout_estime != null
                        ? `~${ot.cout_estime} MAD`
                        : '—'}
                  </td>
                  <td>
                    {ot.genere_par_ia
                      ? <span className="badge badge-info" title="Généré par l'IA">🤖 IA</span>
                      : '—'}
                  </td>
                  <td>
                    <div className="eq-actions">
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => setModal(ot)}>✏</button>
                      <button className="btn btn-danger btn-sm"
                        onClick={() => supprimer(ot.id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <OTModal
          ot={modal === 'creer' ? null : modal}
          equipements={equipements}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); charger(); afficherToast('OT sauvegardé ✓'); }}
        />
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
