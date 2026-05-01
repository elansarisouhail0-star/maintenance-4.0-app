// =============================================================================
// src/components/Sidebar.js — Navigation latérale de l'application
// =============================================================================

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const MENU = [
  { path: '/dashboard',      icon: '▦',  label: 'Dashboard' },
  { path: '/equipements',    icon: '⚙',  label: 'Équipements' },
  { path: '/ordres-travail', icon: '📋', label: 'Ordres de Travail' },
  { path: '/preventive',     icon: '📅', label: 'Préventive' },
  { path: '/stock',          icon: '📦', label: 'Stock' },
  { path: '/capteurs',       icon: '📡', label: 'Capteurs IoT' },
  { path: '/alertes-ia',     icon: '🤖', label: 'Alertes IA' },
  { path: '/simulateur',     icon: '⚗',  label: 'Simulateur IoT' },
];

export default function Sidebar() {
  const { deconnexion } = useAuth();
  const navigate = useNavigate();

  const handleDeconnexion = () => {
    deconnexion();
    navigate('/login');
  };

  return (
    <aside className="sidebar">

      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="7" fill="#2f81f7"/>
            <path d="M8 16h4l3-7 4 14 3-7h4" stroke="#fff" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <span className="sidebar-app-name">GMAO</span>
          <span className="sidebar-version">v1.0</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <span className="sidebar-section-label">Navigation</span>
        {MENU.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Profil utilisateur */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            RM
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">
              Radouane MAJDOUL
            </span>
            <span className="sidebar-user-role">
              Admin
            </span>
          </div>
        </div>
        <button className="sidebar-logout" onClick={handleDeconnexion} title="Déconnexion">
          ⏻
        </button>
      </div>

    </aside>
  );
}