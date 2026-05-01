// =============================================================================
// src/services/api.js — Configuration Axios et appels API centralisés
// Toutes les communications avec le backend FastAPI passent par ce fichier
// =============================================================================

import axios from 'axios';

// URL de base du backend (à modifier selon l'environnement de déploiement)
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Instance Axios configurée
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Intercepteur : ajoute automatiquement le token JWT à chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Intercepteur : redirige vers login si le token est expiré (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('utilisateur');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── AUTH ────────────────────────────────────────────────────────────────────
export const authAPI = {
  connexion:   (data) => api.post('/api/auth/connexion', data),
  inscription: (data) => api.post('/api/auth/inscription', data),
};

// ─── ÉQUIPEMENTS ─────────────────────────────────────────────────────────────
export const equipementsAPI = {
  lister:    (params) => api.get('/api/equipements', { params }),
  obtenir:   (id)     => api.get(`/api/equipements/${id}`),
  creer:     (data)   => api.post('/api/equipements', data),
  modifier:  (id, data) => api.put(`/api/equipements/${id}`, data),
  supprimer: (id)     => api.delete(`/api/equipements/${id}`),
};

// ─── ORDRES DE TRAVAIL ───────────────────────────────────────────────────────
export const otAPI = {
  lister:    (params) => api.get('/api/ordres-travail', { params }),
  obtenir:   (id)     => api.get(`/api/ordres-travail/${id}`),
  creer:     (data)   => api.post('/api/ordres-travail', data),
  modifier:  (id, data) => api.put(`/api/ordres-travail/${id}`, data),
  supprimer: (id)     => api.delete(`/api/ordres-travail/${id}`),
};

// ─── CAPTEURS ────────────────────────────────────────────────────────────────
export const capteursAPI = {
  historique:    (id, params) => api.get(`/api/capteurs/mesures/${id}`, { params }),
  derniereMesure: (id)        => api.get(`/api/capteurs/derniere/${id}`),
};

// ─── INTELLIGENCE ARTIFICIELLE ───────────────────────────────────────────────
export const iaAPI = {
  analyser:       (id)     => api.post(`/api/ia/analyser/${id}`),
  alertes:        (params) => api.get('/api/ia/alertes', { params }),
  traiterAlerte:  (id)     => api.put(`/api/ia/alertes/${id}/traiter`),
  statistiques:   (id)     => api.get(`/api/ia/statistiques/${id}`),
};

export default api;
