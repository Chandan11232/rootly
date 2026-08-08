export const API_BASE = 'https://api-20d-3001.ny1.zerops.app/api';

export interface Incident {
  id: string;
  title: string;
  raw_logs: string;
  service?: string;
  environment?: string;
  severity?: string;
  status: string;
  analysis?: {
    summary: string;
    root_cause: string;
    confidence: number;
    symptoms: string[];
    affected_services: string[];
    suggested_actions: string[];
    runbook_links: string[];
    contributing_factors: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface Stats {
  total: number;
  open: number;
  analyzing: number;
  resolved: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });

    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try {
        const body = await res.json();
        if (body.error) message = body.error;
      } catch {}
      throw new Error(message);
    }

    return res.json();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection.');
    }
    if (err.message === 'Failed to fetch') {
      throw new Error('Network error. Is the server running?');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function submitIncident(data: {
  title: string;
  logs: string;
  service?: string;
  environment?: string;
}): Promise<{ id: string; status: string }> {
  return apiFetch(`${API_BASE}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function getIncident(id: string): Promise<Incident> {
  return apiFetch(`${API_BASE}/incidents/${encodeURIComponent(id)}`);
}

export async function listIncidents(status?: string): Promise<Incident[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const qs = params.toString();
  return apiFetch(`${API_BASE}/incidents${qs ? `?${qs}` : ''}`);
}

export async function getStats(): Promise<Stats> {
  return apiFetch(`${API_BASE}/stats`);
}
