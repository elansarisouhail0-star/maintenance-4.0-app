// =============================================================================
// src/context/AuthContext.js — Contexte global d'authentification
// Gère l'état de connexion de l'utilisateur dans toute l'application
// =============================================================================

import { createContext, useContext, useState } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(() => {
    // Restaurer l'utilisateur depuis localStorage au démarrage
    const saved = localStorage.getItem('utilisateur');
    return saved ? JSON.parse(saved) : null;
  });

  const connexion = async (email, motDePasse) => {
    const response = await authAPI.connexion({ email, mot_de_passe: motDePasse });
    const { access_token, utilisateur: user } = response.data;

    localStorage.setItem('token', access_token);
    localStorage.setItem('utilisateur', JSON.stringify(user));
    setUtilisateur(user);
    return user;
  };

  const deconnexion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    setUtilisateur(null);
  };

  return (
    <AuthContext.Provider value={{ utilisateur, connexion, deconnexion }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
