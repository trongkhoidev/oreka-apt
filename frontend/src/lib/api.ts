const API = process.env.NEXT_PUBLIC_API || 'http://localhost:4000';

export async function fetchJSON<T>(url: string): Promise<T> {
  console.log('Fetching:', url);
  const r = await fetch(url, { cache: 'no-store' });
  console.log('Response status:', r.status);
  if (!r.ok) {
    const errorText = await r.text();
    console.error('API Error:', r.status, errorText);
    throw new Error(`${r.status}: ${errorText}`);
  }
  return r.json();
}

// Profiles
export const getProfile = (addr: string) =>
  fetchJSON(`${API}/profiles/${addr}`);

export const searchProfiles = (q = '', limit = 20) =>
  fetchJSON(`${API}/profiles?q=${encodeURIComponent(q)}&limit=${limit}`);

// Leaderboards
export const lbMonthlyOwners = (ym: string, limit = 100) =>
  fetchJSON(`${API}/leaderboards/monthly/owners?ym=${ym}&limit=${limit}`);

export const lbMonthlyUsers = (ym: string, limit = 100) =>
  fetchJSON(`${API}/leaderboards/monthly/users?ym=${ym}&limit=${limit}`);

export const lbAlltimeUsers = (limit = 1000) =>
  fetchJSON(`${API}/leaderboards/all-time/users?limit=${limit}`);


