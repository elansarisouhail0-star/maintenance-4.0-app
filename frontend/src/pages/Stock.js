// =============================================================================
// src/pages/Stock.js — Gestion des pièces de rechange
// =============================================================================

import { useState, useEffect } from 'react';
import api from '../services/api';
import './Stock.css';

export default function Stock() {
  const [pieces, setPieces]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [recherche, setRecherche] = useState('');
  const [modal, setModal]       = useState(null);
  const [toast, setToast]       = useState(null);
  const [form, setForm]         = useState({
    reference: '', nom: '', description: '',
    quantite_stock: 0, quantite_minimale: 1,
    unite: 'pièce', prix_unitaire: '', fournisseur: '', emplacement_stock: '',
  });

  useEffect(() => { charger(); }, []);

  const charger = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/pieces-rechange');
      setPieces(res.data);
    } catch {
      setPieces([]);
    } finally {
      setLoading(false);
    }
  };

  const sauvegarder = async () => {
    if (!form.reference || !form.nom) return;
    try {
      if (modal?.id) {
        await api.put(`/api/pieces-rechange/${modal.id}`, form);
      } else {
        await api.post('/api/pieces-rechange', form);
      }
      setModal(null);
      charger();
      afficherToast('Pièce sauvegardée ✓');
    } catch (err) {
      afficherToast(err.response?.data?.detail || 'Erreur', 'error');
    }
  };

  const ouvrirModal = (piece = null) => {
    setForm(piece || {
      reference: '', nom: '', description: '',
      quantite_stock: 0, quantite_minimale: 1,
      unite: 'pièce', prix_unitaire: '', fournisseur: '', emplacement_stock: '',
    });
    setModal(piece || 'nouveau');
  };

  const afficherToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const piecesFiltrees = pieces.filter(p =>
    !recherche ||
    p.nom.toLowerCase().includes(recherche.toLowerCase()) ||
    p.reference.toLowerCase().includes(recherche.toLowerCase())
  );

  const enAlerteStock = pieces.filter(p => p.quantite_stock <= p.quantite_minimale).length;

  return (
    <div className="page-content fade-in">

      <div className="page-header">
        <div>
          <h1 className="page-title">Stock — Pièces de rechange</h1>
          <p className="page-subtitle">
            {pieces.length} références ·
            {enAlerteStock > 0 && (
              <span style={{ color: 'var(--accent-orange)' }}> ⚠ {enAlerteStock} en alerte stock</span>
            )}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => ouvrirModal()}>
          + Nouvelle pièce
        </button>
      </div>

      {/* Filtres */}
      <div className="eq-filters card" style={{ marginBottom: 20 }}>
        <input className="input eq-search"
          placeholder="🔍  Rechercher par nom ou référence..."
          value={recherche} onChange={e => setRecherche(e.target.value)} />
        {enAlerteStock > 0 && (
          <span className="badge badge-warning">{enAlerteStock} alertes stock</span>
        )}
      </div>

      {/* Tableau */}
      {loading ? <div className="spinner" /> : piecesFiltrees.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">📦</div>
          <p className="empty-state-text">Aucune pièce enregistrée</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Nom</th>
                <th>Stock</th>
                <th>Seuil min.</th>
                <th>Unité</th>
                <th>Prix unitaire</th>
                <th>Fournisseur</th>
                <th>Emplacement</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {piecesFiltrees.map(p => {
                const alerte = p.quantite_stock <= p.quantite_minimale;
                return (
                  <tr key={p.id} className={alerte ? 'stock-alerte-row' : ''}>
                    <td><code className="eq-code">{p.reference}</code></td>
                    <td style={{ fontWeight: 600 }}>{p.nom}</td>
                    <td>
                      <span className={`stock-qte ${alerte ? 'stock-bas' : 'stock-ok'}`}>
                        {alerte ? '⚠ ' : ''}{p.quantite_stock}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{p.quantite_minimale}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{p.unite}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {p.prix_unitaire != null ? `${p.prix_unitaire} MAD` : '—'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {p.fournisseur || '—'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {p.emplacement_stock || '—'}
                    </td>
                    <td>
                      <div className="eq-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => ouvrirModal(p)}>✏</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{modal?.id ? 'Modifier la pièce' : 'Nouvelle pièce'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Référence *</label>
                <input className="input" placeholder="REF-001"
                  value={form.reference} disabled={!!modal?.id}
                  onChange={e => setForm({...form, reference: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">Nom *</label>
                <input className="input" placeholder="Roulement à billes"
                  value={form.nom}
                  onChange={e => setForm({...form, nom: e.target.value})} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Quantité en stock</label>
                <input className="input" type="number"
                  value={form.quantite_stock}
                  onChange={e => setForm({...form, quantite_stock: parseInt(e.target.value)})} />
              </div>
              <div className="form-group">
                <label className="label">Seuil minimum</label>
                <input className="input" type="number"
                  value={form.quantite_minimale}
                  onChange={e => setForm({...form, quantite_minimale: parseInt(e.target.value)})} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Unité</label>
                <input className="input" placeholder="pièce, litre, kg..."
                  value={form.unite}
                  onChange={e => setForm({...form, unite: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">Prix unitaire (MAD)</label>
                <input className="input" type="number" placeholder="0.00"
                  value={form.prix_unitaire}
                  onChange={e => setForm({...form, prix_unitaire: e.target.value})} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Fournisseur</label>
                <input className="input" placeholder="Nom du fournisseur"
                  value={form.fournisseur}
                  onChange={e => setForm({...form, fournisseur: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">Emplacement magasin</label>
                <input className="input" placeholder="Étagère A-3"
                  value={form.emplacement_stock}
                  onChange={e => setForm({...form, emplacement_stock: e.target.value})} />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={sauvegarder}>Sauvegarder</button>
            </div>
          </div>
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
