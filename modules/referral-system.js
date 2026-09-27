/**
 * Referral System Module
 * Handles referral code management, dashboard data, and reward tracking.
 */

import { apiUrl } from '../api-base.js';

const API_BASE = apiUrl('/api/referral');

let cachedDashboard = null;
let refreshTimer = null;

async function apiFetch(url) {
  const resp = await fetch(url);
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || `Server error ${resp.status}`);
  }
  return resp.json();
}

export async function getReferralCode(uid) {
  return apiFetch(`${API_BASE}?path=code&uid=${encodeURIComponent(uid)}`);
}

export async function claimReferral(code, referredUid) {
  const resp = await fetch(`${API_BASE}?path=claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: code.toUpperCase(), referredUid }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Claim failed');
  return data;
}

export async function verifyReferral(referralId) {
  const resp = await fetch(`${API_BASE}?path=verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ referralId }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Verification failed');
  return data;
}

export async function getDashboard(uid) {
  const data = await apiFetch(`${API_BASE}?path=dashboard&uid=${encodeURIComponent(uid)}`);
  cachedDashboard = data;
  return data;
}

export async function getLeaderboard(uid, limit = 20) {
  return apiFetch(`${API_BASE}?path=leaderboard&uid=${encodeURIComponent(uid)}&limit=${limit}`);
}

export async function getTiers() {
  const resp = await fetch(`${API_BASE}?path=tiers`);
  if (!resp.ok) throw new Error('Failed to load tiers');
  return resp.json();
}

export async function getBadges() {
  const resp = await fetch(`${API_BASE}?path=badges`);
  if (!resp.ok) throw new Error('Failed to load badges');
  return resp.json();
}

export function extractReferralCode() {
  const params = new URLSearchParams(window.location.search);
  return params.get('ref') || sessionStorage.getItem('aquila_ref') || null;
}

export function clearReferralCode() {
  sessionStorage.removeItem('aquila_ref');
}

export function autoClaimReferral(uid) {
  const code = extractReferralCode();
  if (!code || !uid) return Promise.resolve(null);
  return claimReferral(code, uid).then(result => {
    clearReferralCode();
    return result;
  }).catch(err => {
    console.warn('Referral claim deferred:', err.message);
    return null;
  });
}

export function shareReferral(link) {
  const payload = {
    title: 'Join me on Learning Allied',
    text: 'Learn faster with Learning Allied — a neuroscience-powered study companion. Join me!',
    url: link,
  };
  if (navigator.canShare?.(payload)) {
    navigator.share(payload).catch(() => {});
  } else {
    navigator.clipboard.writeText(link).catch(() => {});
    return 'copied';
  }
  return 'shared';
}

export function startDashboardRefresh(uid, intervalMs = 30000) {
  stopDashboardRefresh();
  refreshTimer = setInterval(() => {
    getDashboard(uid).catch(() => {});
  }, intervalMs);
}

export function stopDashboardRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}
