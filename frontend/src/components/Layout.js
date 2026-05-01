// =============================================================================
// src/components/Layout.js — Mise en page principale avec sidebar
// =============================================================================

import Sidebar from './Sidebar';
import './Layout.css';

export default function Layout({ children }) {
  return (
    <div className="layout">
      <Sidebar />
      <main className="layout-main">
        {children}
      </main>
    </div>
  );
}
