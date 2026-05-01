// Login.js — Page de connexion thème clair professionnel
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const { connexion } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ email: '', mot_de_passe: '' });
  const [erreur, setErreur]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur(''); setLoading(true);
    try {
      await connexion(form.email, form.mot_de_passe);
      navigate('/dashboard');
    } catch (err) {
      setErreur(err.response?.data?.detail || 'Email ou mot de passe incorrect');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-panel fade-in">
        <div className="login-brand">
          <div className="login-logo">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <path d="M8 16h4l3-7 4 14 3-7h4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 className="login-app-name">GMAO</h1>
            <p className="login-tagline">Maintenance 4.0 — ENSAM Casablanca</p>
          </div>
        </div>

        <h2 className="login-title">Bienvenue 👋</h2>
        <p className="login-subtitle">Connectez-vous à votre espace de maintenance industrielle</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="label">Adresse email</label>
            <input className="input" type="email" placeholder="votre@email.com"
              value={form.email} onChange={e => setForm({...form, email: e.target.value})} required autoFocus />
          </div>
          <div className="form-group">
            <label className="label">Mot de passe</label>
            <input className="input" type="password" placeholder="••••••••"
              value={form.mot_de_passe} onChange={e => setForm({...form, mot_de_passe: e.target.value})} required />
          </div>
          {erreur && <div className="login-error"><span>⚠</span> {erreur}</div>}
          <button className="btn btn-primary login-btn btn-lg" type="submit" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : null}
            {loading ? 'Connexion...' : 'Se connecter →'}
          </button>
        </form>

        <div className="login-status">
          <span className="status-dot green" /><span>Système opérationnel</span>
          <span className="status-sep">·</span>
          <span className="status-dot blue" /><span>IA Maintenance 4.0 active</span>
        </div>
      </div>

      <div className="login-deco" aria-hidden="true">
        <div className="deco-content">
          <div className="deco-stat"><span className="deco-value">4.0</span><span className="deco-label">Industrie</span></div>
          <div className="deco-divider" />
          <div className="deco-stat"><span className="deco-value">IA</span><span className="deco-label">Prédictive</span></div>
          <div className="deco-divider" />
          <div className="deco-stat"><span className="deco-value">IoT</span><span className="deco-label">Capteurs</span></div>
        </div>
        <p className="deco-desc">Plateforme intelligente de gestion de maintenance industrielle avec détection d'anomalies en temps réel et prédiction des pannes par intelligence artificielle.</p>
        <div className="deco-features">
          <div className="deco-feature">
            <span className="deco-feature-icon">📊</span>
            <div><div className="deco-feature-text">Dashboard temps réel</div><div className="deco-feature-desc">KPIs, MTBF, MTTR mis à jour automatiquement</div></div>
          </div>
          <div className="deco-feature">
            <span className="deco-feature-icon">🤖</span>
            <div><div className="deco-feature-text">IA Prédictive</div><div className="deco-feature-desc">Détection d'anomalies et génération automatique d'OT</div></div>
          </div>
          <div className="deco-feature">
            <span className="deco-feature-icon">📡</span>
            <div><div className="deco-feature-text">Capteurs IoT</div><div className="deco-feature-desc">Monitoring température ESP32 en continu</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
