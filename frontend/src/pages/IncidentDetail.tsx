import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getIncident, type Incident } from '../api';

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function safeArray<T>(val: T[] | null | undefined): T[] {
  return Array.isArray(val) ? val : [];
}

function safeNumber(val: number | null | undefined, fallback: number = 0): number {
  return typeof val === 'number' && !isNaN(val) ? val : fallback;
}

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    let active = true;

    async function loadIncident() {
      try {
        const inc = await getIncident(id!);
        if (active) setIncident(inc);
      } catch {
        if (active) {
          setError('Failed to load incident');
          setTimeout(() => navigate('/app'), 2000);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadIncident();
    const interval = setInterval(loadIncident, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id, navigate]);

  if (loading || !incident) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <span className="loading-text">{error || 'Loading incident...'}</span>
      </div>
    );
  }

  const isAnalyzing = incident.status === 'analyzing' || incident.status === 'open';
  const analysis = incident.analysis;

  return (
    <>
      <button className="back-btn" onClick={() => navigate('/app')}>
        ← Back to Dashboard
      </button>

      {/* Header Card */}
      <div className="analysis-card">
        <div className="analysis-header">
          <div>
            <h2>{incident.title}</h2>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {incident.severity && (
                <span className={`badge ${incident.severity}`}>{incident.severity}</span>
              )}
              <span className={`badge ${incident.status}`}>{incident.status}</span>
              {incident.service && <span className="tag">{incident.service}</span>}
              {incident.environment && <span className="tag">{incident.environment}</span>}
            </div>
          </div>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
            {new Date(incident.created_at).toLocaleString()}
          </span>
        </div>

        <div className="analysis-body">
          {isAnalyzing ? (
            <div className="loading-state">
              <div className="loading-spinner" />
              <span className="loading-text">AI is analyzing your incident logs...</span>
            </div>
          ) : analysis ? (
            <>
              {/* Summary */}
              {analysis.summary && (
                <div className="analysis-section">
                  <h3>Summary</h3>
                  <p>{analysis.summary}</p>
                </div>
              )}

              {/* Root Cause */}
              {analysis.root_cause && (
                <div className="analysis-section">
                  <h3>Root Cause</h3>
                  <p>{analysis.root_cause}</p>
                </div>
              )}

              {/* Confidence */}
              <div className="analysis-section">
                <h3>Confidence</h3>
                <div className="confidence-wrapper">
                  <div className="confidence-bar">
                    <div
                      className="confidence-fill"
                      style={{ width: `${safeNumber(analysis.confidence, 0.5) * 100}%` }}
                    />
                  </div>
                  <span className="confidence-value">
                    {Math.round(safeNumber(analysis.confidence, 0.5) * 100)}%
                  </span>
                </div>
              </div>

              {/* Symptoms */}
              {safeArray(analysis.symptoms).length > 0 && (
                <div className="analysis-section">
                  <h3>Symptoms</h3>
                  <div className="tag-list">
                    {safeArray(analysis.symptoms).map((s, i) => (
                      <span key={i} className="tag">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Affected Services */}
              {safeArray(analysis.affected_services).length > 0 && (
                <div className="analysis-section">
                  <h3>Affected Services</h3>
                  <div className="tag-list">
                    {safeArray(analysis.affected_services).map((s, i) => (
                      <span key={i} className="tag">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contributing Factors */}
              {safeArray(analysis.contributing_factors).length > 0 && (
                <div className="analysis-section">
                  <h3>Contributing Factors</h3>
                  <div className="action-list">
                    {safeArray(analysis.contributing_factors).map((f, i) => (
                      <div key={i} className="action-item">
                        <span className="number">!</span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Actions */}
              {safeArray(analysis.suggested_actions).length > 0 && (
                <div className="analysis-section">
                  <h3>Suggested Actions</h3>
                  <div className="action-list">
                    {safeArray(analysis.suggested_actions).map((a, i) => (
                      <div key={i} className="action-item">
                        <span className="number">{i + 1}</span>
                        <span>{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Runbook Links */}
              {safeArray(analysis.runbook_links).filter(isValidHttpUrl).length > 0 && (
                <div className="analysis-section">
                  <h3>Runbook Links</h3>
                  <div className="tag-list">
                    {safeArray(analysis.runbook_links)
                      .filter(isValidHttpUrl)
                      .map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tag"
                          style={{ textDecoration: 'none', color: 'var(--accent-glow)' }}
                        >
                          📄 {link}
                        </a>
                      ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <div className="icon">🔍</div>
              <h3>No analysis available</h3>
              {incident.status === 'closed' && (
                <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', marginTop: 8 }}>
                  Analysis failed. The incident could not be processed.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Raw Logs */}
      <div className="analysis-card">
        <div className="analysis-header">
          <h2>Raw Logs</h2>
        </div>
        <div className="analysis-body">
          <div className="raw-logs">{incident.raw_logs}</div>
        </div>
      </div>
    </>
  );
}
