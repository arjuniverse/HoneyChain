const BASE = '/api';

async function request(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body: JSON.stringify(body) }),
  put: (p, body) => request(p, { method: 'PUT', body: JSON.stringify(body) }),
  roles: () => request('/roles'),
  me: () => request('/me'),
  hives: (beekeeperId) => request(beekeeperId ? `/hives?beekeeper_id=${beekeeperId}` : '/hives'),
  hive: (id) => request(`/hives/${id}`),
  readings: (id, limit = 400) => request(`/hives/${id}/readings?limit=${limit}`),
  hiveAlerts: (id) => request(`/hives/${id}/alerts`),
  alerts: (beekeeperId) => request(beekeeperId ? `/alerts?beekeeper_id=${beekeeperId}` : '/alerts'),
  simulate: (id, body) => request(`/hives/${id}/simulate`, { method: 'POST', body: JSON.stringify(body) }),
  stress: (id, level) => request(`/hives/${id}/stress`, { method: 'POST', body: JSON.stringify({ level }) }),
  predict: (id) => request(`/hives/${id}/predict`),
  weather: () => request('/weather'),
  assistant: (text, lang = 'en') => request('/assistant', { method: 'POST', body: JSON.stringify({ text, lang }) }),
  beekeepers: () => request('/beekeepers'),
  registerBeekeeper: (b) => request('/beekeepers', { method: 'POST', body: JSON.stringify(b) }),
  registerHive: (b) => request('/hives', { method: 'POST', body: JSON.stringify(b) }),
  batches: (beekeeperId) => request(beekeeperId ? `/batches?beekeeper_id=${beekeeperId}` : '/batches'),
  batch: (id) => request(`/batches/${id}`),
  createBatch: (b) => request('/batches', { method: 'POST', body: JSON.stringify(b) }),
  addBatchEvent: (id, b) => request(`/batches/${id}/event`, { method: 'POST', body: JSON.stringify(b) }),
  labQueue: () => request('/lab/queue'),
  qualify: (b) => request('/lab/qualify', { method: 'POST', body: JSON.stringify(b) }),
  verifyQr: (b) => request('/qr/verify', { method: 'POST', body: JSON.stringify(b) }),
  scanHistory: (id) => request(`/qr/scan-history/${id}`),
  counterfeit: () => request('/counterfeit/alerts'),
  marketplace: () => request('/marketplace'),
  listOnMarket: (b) => request('/marketplace', { method: 'POST', body: JSON.stringify(b) }),
  adminStats: () => request('/admin/stats'),
  adminAlerts: () => request('/admin/alerts'),
  adminDrilldown: () => request('/admin/drilldown'),
  productionSeries: () => request('/admin/production-series'),
  chainVerify: () => request('/chain/verify'),
  chainStats: () => request('/chain/stats'),
  system: () => request('/system'),
};

export const WS = { WS: 1 };