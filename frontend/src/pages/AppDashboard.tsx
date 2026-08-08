import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listIncidents, getStats, type Incident, type Stats } from '../api';

export default function AppDashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
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

  return (
    <>
      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon purple">📊</div>
          <div className="stat-number">{stats?.total || 0}</div>
          <div className="stat-label">Total Incidents</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">🔴</div>
          <div className="stat-number">{stats?.critical || 0}</div>
          <div className="stat-label">Critical</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">⚠️</div>
          <div className="stat-number">{stats?.analyzing || 0}</div>
          <div className="stat-label">Analyzing</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-number">{stats?.resolved || 0}</div>
          <div className="stat-label">Resolved</div>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="content-card">
        <div className="content-card-header">
          <h2>Recent Incidents</h2>
          <a href="/app/submit" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '0.8125rem' }}>
            + New Incident
          </a>
        </div>
        <div className="content-card-body">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner" />
              <span className="loading-text">Loading incidents...</span>
            </div>
          ) : incidents.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📋</div>
              <h3>No incidents yet</h3>
              <p>Submit your first incident log to see AI-powered analysis.</p>
            </div>
          ) : (
            <div className="incident-list">
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  className="incident-row"
                  onClick={() => navigate(`/app/incidents/${inc.id}`)}
                >
                  <div className={`severity-dot ${inc.severity || 'info'}`} />
                  <div className="info">
                    <h4>{inc.title}</h4>
                    <div className="meta">
                      {new Date(inc.created_at).toLocaleString()}
                      {inc.service && ` · ${inc.service}`}
                      {inc.environment && ` · ${inc.environment}`}
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
        </div>
      </div>
    </>
  );
}
