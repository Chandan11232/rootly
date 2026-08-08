import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listIncidents, getStats, type Incident, type Stats } from '../api';

export default function Dashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [inc, st] = await Promise.all([listIncidents(), getStats()]);
      setIncidents(inc);
      setStats(st);
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="loading"><span className="spinner"></span> Loading incidents...</div>;
  }

  return (
    <>
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="number">{stats.total}</div>
            <div className="label">Total</div>
          </div>
          <div className="stat-card">
            <div className="number">{stats.open}</div>
            <div className="label">Open</div>
          </div>
          <div className="stat-card">
            <div className="number">{stats.analyzing}</div>
            <div className="label">Analyzing</div>
          </div>
          <div className="stat-card">
            <div className="number">{stats.resolved}</div>
            <div className="label">Resolved</div>
          </div>
          <div className="stat-card critical">
            <div className="number">{stats.critical}</div>
            <div className="label">Critical</div>
          </div>
          <div className="stat-card high">
            <div className="number">{stats.high}</div>
            <div className="label">High</div>
          </div>
          <div className="stat-card medium">
            <div className="number">{stats.medium}</div>
            <div className="label">Medium</div>
          </div>
          <div className="stat-card low">
            <div className="number">{stats.low}</div>
            <div className="label">Low</div>
          </div>
        </div>
      )}

      <section className="incidents-section">
        <h2>Recent Incidents</h2>
        {incidents.length === 0 ? (
          <div className="empty">
            <h3>No incidents yet</h3>
            <p>Submit your first incident log to get started.</p>
          </div>
        ) : (
          <div className="incident-list">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="incident-card"
                onClick={() => navigate(`/incidents/${inc.id}`)}
              >
                <div className="info">
                  <h3>{inc.title}</h3>
                  <div className="meta">
                    <span>{new Date(inc.created_at).toLocaleString()}</span>
                    {inc.service && <span>Service: {inc.service}</span>}
                    {inc.environment && <span>Env: {inc.environment}</span>}
                  </div>
                </div>
                <div className="badges">
                  {inc.severity && (
                    <span className={`badge ${inc.severity}`}>{inc.severity}</span>
                  )}
                  <span className={`badge ${inc.status}`}>{inc.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
