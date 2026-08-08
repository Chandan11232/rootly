import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitIncident } from '../api';

const MAX_TITLE_LENGTH = 200;
const MAX_SERVICE_LENGTH = 100;
const MAX_LOG_LENGTH = 100_000;

export default function SubmitIncident() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [logs, setLogs] = useState('');
  const [service, setService] = useState('');
  const [environment, setEnvironment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [logWarning, setLogWarning] = useState('');

  const pollRef = useRef<number | null>(null);
  const pollTimeoutRef = useRef<number | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, []);

  // Warn when logs exceed truncation threshold
  useEffect(() => {
    if (logs.length > MAX_LOG_LENGTH) {
      setLogWarning(`Logs exceed ${MAX_LOG_LENGTH.toLocaleString()} characters and will be truncated for AI analysis.`);
    } else {
      setLogWarning('');
    }
  }, [logs]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!logs.trim()) {
      setError('Logs are required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await submitIncident({
        title: title || 'Untitled Incident',
        logs: logs.trim(),
        service: service || undefined,
        environment: environment || undefined,
      });

      // Start polling
      pollRef.current = window.setInterval(async () => {
        try {
          const res = await fetch(`/api/incidents/${result.id}`);
          if (!res.ok) return;
          const incident = await res.json();
          if (incident.status === 'resolved' || incident.status === 'closed') {
            if (pollRef.current) clearInterval(pollRef.current);
            if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
            navigate(`/app/incidents/${result.id}`);
          }
        } catch {
          // keep polling on transient errors
        }
      }, 1000);

      // Stop polling after 120s
      pollTimeoutRef.current = window.setTimeout(() => {
        if (pollRef.current) clearInterval(pollRef.current);
      }, 120000);

      navigate(`/app/incidents/${result.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  const sampleLogs = `2024-01-15 14:23:01 [ERROR] payment-service: Connection refused to postgres-primary:5432
2024-01-15 14:23:01 [WARN] payment-service: Retrying connection (attempt 1/3)
2024-01-15 14:23:04 [ERROR] payment-service: Connection refused to postgres-primary:5432
2024-01-15 14:23:04 [WARN] payment-service: Retrying connection (attempt 2/3)
2024-01-15 14:23:08 [ERROR] payment-service: Connection refused to postgres-primary:5432
2024-01-15 14:23:08 [ERROR] payment-service: Max retries exceeded. Circuit breaker OPEN.
2024-01-15 14:23:08 [ERROR] api-gateway: Timeout waiting for payment-service response
2024-01-15 14:23:09 [WARN] load-balancer: Health check failed for payment-service (3/3)
2024-01-15 14:23:10 [INFO] monitor: Alert triggered - payment-service DOWN
2024-01-15 14:23:15 [ERROR] postgres-primary: FATAL: too many connections for role "payment_user"
2024-01-15 14:23:15 [INFO] postgres-primary: Connection pool exhausted (max: 100, active: 100)
2024-01-15 14:23:16 [WARN] background-worker: Job queue backing up - 2,847 pending jobs`;

  return (
    <>
      <button className="back-btn" onClick={() => navigate('/app')}>
        ← Back to Dashboard
      </button>

      <div className="submit-card">
        <div className="submit-header">
          <h2>Submit Incident Logs</h2>
        </div>
        <div className="submit-body">
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ color: 'var(--critical)', marginBottom: 16, fontSize: '0.875rem' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label>Incident Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Payment service outage"
                maxLength={MAX_TITLE_LENGTH}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Service (optional)</label>
                <input
                  type="text"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  placeholder="e.g. payment-service"
                  maxLength={MAX_SERVICE_LENGTH}
                />
              </div>
              <div className="form-group">
                <label>Environment (optional)</label>
                <select value={environment} onChange={(e) => setEnvironment(e.target.value)}>
                  <option value="">Select environment</option>
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="development">Development</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>
                Incident Logs *
                {logs.length > 0 && (
                  <span style={{ fontWeight: 400, color: 'var(--text-dim)', marginLeft: 8 }}>
                    ({logs.length.toLocaleString()} chars)
                  </span>
                )}
              </label>
              <textarea
                value={logs}
                onChange={(e) => setLogs(e.target.value)}
                placeholder="Paste your incident logs here...

Example:
2024-01-15 14:23:01 [ERROR] payment-service: Connection refused to postgres-primary:5432
2024-01-15 14:23:01 [WARN] payment-service: Retrying connection (attempt 1/3)"
              />
              {logWarning && (
                <div style={{ color: 'var(--warning, #f59e0b)', fontSize: '0.8125rem', marginTop: 4 }}>
                  {logWarning}
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-analyze" disabled={submitting || !logs.trim()}>
                {submitting ? (
                  <>
                    <span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                    Analyzing...
                  </>
                ) : (
                  <>🔍 Analyze Incident</>
                )}
              </button>
              <button
                type="button"
                className="btn-sample"
                onClick={() => setLogs(sampleLogs)}
              >
                Load Sample
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
