// =============================================================================
// src/pages/Equipements.js — Gestion complète des équipements industriels
// Fonctionnalités : liste, recherche, filtres, création, modification, suppression
// =============================================================================

import { useState, useEffect } from 'react';
import { equipementsAPI } from '../services/api';
import './Equipements.css';

// ─── Statuts disponibles ─────────────────────────────────────────────────────
const STATUTS = ['en_service', 'en_panne', 'en_maintenance', 'hors_service'];

// ─── Modal de création / modification ────────────────────────────────────────
function EquipementModal({ equipement, onClose, onSave }) {
  const [form, setForm] = useState(
    equipement || {
      code: '', nom: '', description: '', marque: '',
      modele: '', numero_serie: '', statut: 'en_service', localisation: '',
    }
  );
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur]   = useState('');

  const handleSubmit = async () => {
    if (!form.code || !form.nom) {
      setErreur('Le code et le nom sont obligatoires.');
      return;
    }
    setLoading(true);
    try {
      if (equipement) {
        await equipementsAPI.modifier(equipement.id, form);
      } else {
        await equipementsAPI.creer(form);
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
          <h3 className="modal-title">
            {equipement ? 'Modifier l\'équipement' : 'Nouvel équipement'}
          </h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="label">Code *</label>
            <input className="input" placeholder="EQ-001"
              value={form.code} disabled={!!equipement}
              onChange={e => setForm({...form, code: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="label">Nom *</label>
            <input className="input" placeholder="Pompe centrifuge"
              value={form.nom}
              onChange={e => setForm({...form, nom: e.target.value})} />
          </div>
        </div>

        <div className="form-group">
          <label className="label">Description</label>
          <textarea className="input" rows={2} placeholder="Description de l'équipement..."
            value={form.description}
            onChange={e => setForm({...form, description: e.target.value})} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="label">Marque</label>
            <input className="input" placeholder="Siemens"
              value={form.marque}
              onChange={e => setForm({...form, marque: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="label">Modèle</label>
            <input className="input" placeholder="XR-500"
              value={form.modele}
              onChange={e => setForm({...form, modele: e.target.value})} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="label">Numéro de série</label>
            <input className="input" placeholder="SN-2024-XXXX"
              value={form.numero_serie}
              onChange={e => setForm({...form, numero_serie: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="label">Statut</label>
            <select className="input" value={form.statut}
              onChange={e => setForm({...form, statut: e.target.value})}>
              {STATUTS.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="label">Localisation</label>
          <input className="input" placeholder="Atelier A — Zone 3"
            value={form.localisation}
            onChange={e => setForm({...form, localisation: e.target.value})} />
        </div>

        {erreur && (
          <div className="form-error">⚠ {erreur}</div>
        )}

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Sauvegarde...' : (equipement ? 'Modifier' : 'Créer')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale Équipements ─────────────────────────────────────────────
export default function Equipements() {
  const [equipements, setEquipements]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [recherche, setRecherche]       = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [modal, setModal]               = useState(null); // null | 'creer' | equipement
  const [confirmation, setConfirmation] = useState(null);
  const [toast, setToast]               = useState(null);

  useEffect(() => { charger(); }, []);

  const charger = async () => {
    setLoading(true);
    try {
      const res = await equipementsAPI.lister();
      setEquipements(res.data);
    } catch (err) {
      afficherToast('Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const supprimer = async (id) => {
    try {
      await equipementsAPI.supprimer(id);
      setEquipements(prev => prev.filter(e => e.id !== id));
      afficherToast('Équipement supprimé', 'success');
    } catch {
      afficherToast('Erreur lors de la suppression', 'error');
    } finally {
      setConfirmation(null);
    }
  };

  const afficherToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Filtrage côté client
  const equipementsFiltres = equipements.filter(eq => {
    const matchRecherche = !recherche ||
      eq.nom.toLowerCase().includes(recherche.toLowerCase()) ||
      eq.code.toLowerCase().includes(recherche.toLowerCase()) ||
      (eq.localisation || '').toLowerCase().includes(recherche.toLowerCase());
    const matchStatut = !filtreStatut || eq.statut === filtreStatut;
    return matchRecherche && matchStatut;
  });

  return (
    <div className="page-content fade-in">

      {/* En-tête */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Équipements</h1>
          <p className="page-subtitle">{equipements.length} équipements enregistrés</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('creer')}>
          + Nouvel équipement
        </button>
      </div>

      {/* Filtres */}
      <div className="eq-filters card">
        <input
          className="input eq-search"
          placeholder="🔍  Rechercher par nom, code, localisation..."
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
        />
        <select className="input eq-filter-select" value={filtreStatut}
          onChange={e => setFiltreStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {STATUTS.map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <div className="eq-stats">
          {STATUTS.map(s => {
            const count = equipements.filter(e => e.statut === s).length;
            return count > 0 ? (
              <span key={s} className={`badge badge-${s}`}>
                {count} {s.replace(/_/g, ' ')}
              </span>
            ) : null;
          })}
        </div>
      </div>

      {/* Tableau */}
      {loading ? (
        <div className="spinner" />
      ) : equipementsFiltres.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">⚙</div>
          <p className="empty-state-text">Aucun équipement trouvé</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Nom</th>
                <th>Marque / Modèle</th>
                <th>Localisation</th>
                <th>Statut</th>
                <th>Date création</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {equipementsFiltres.map(eq => (
                <tr key={eq.id}>
                  <td>
                    <code className="eq-code">{eq.code}</code>
                  </td>
                  <td>
                    <div className="eq-nom">{eq.nom}</div>
                    {eq.description && (
                      <div className="eq-desc">{eq.description.slice(0, 60)}…</div>
                    )}
                  </td>
                  <td>
                    {eq.marque || eq.modele
                      ? <span>{eq.marque} {eq.modele}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>
                    }
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {eq.localisation || '—'}
                  </td>
                  <td>
                    <span className={`badge badge-${eq.statut}`}>
                      {eq.statut.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {new Date(eq.date_creation).toLocaleDateString('fr-FR')}
                  </td>
                  <td>
                    <div className="eq-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setModal(eq)}
                        title="Modifier"
                      >
                        ✏
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setConfirmation(eq)}
                        title="Supprimer"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal création / modification */}
      {modal && (
        <EquipementModal
          equipement={modal === 'creer' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); charger(); afficherToast('Équipement sauvegardé ✓'); }}
        />
      )}

      {/* Modal confirmation suppression */}
      {confirmation && (
        <div className="modal-overlay" onClick={() => setConfirmation(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirmer la suppression</h3>
              <button className="modal-close" onClick={() => setConfirmation(null)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: '0.9rem' }}>
              Supprimer l'équipement <strong>{confirmation.nom}</strong> ({confirmation.code}) ?
              Cette action supprimera également tous les OT et mesures associés.
            </p>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmation(null)}>Annuler</button>
              <button className="btn btn-danger" onClick={() => supprimer(confirmation.id)}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
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
