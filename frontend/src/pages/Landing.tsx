import { useEffect, useState } from 'react';

export default function Landing() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <div className="landing">
      <div className="bg-grid" />
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />

      {/* Navbar */}
      <nav className="navbar">
        <a href="/" className="navbar-brand">
          <span className="logo-icon">🔍</span>
          <span>Rootly</span>
        </a>
        <div className="navbar-links">
          <a href="#features">Features</a>
          <a href="#architecture">Architecture</a>
          <a href="/app" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.8125rem' }}>
            Open App →
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">
          <span className="dot" />
          AI-Powered Incident Analysis
        </div>

        <h1>
          Find the root cause<br />
          <span className="gradient-text">in seconds, not hours</span>
        </h1>

        <p className="subtitle">
          Paste your incident logs and get instant AI-powered root cause analysis.
          Severity assessment, affected services, actionable runbooks — all in one click.
        </p>

        <div className="hero-actions">
          <a href="/app" className="btn btn-primary">
            Start Analyzing →
          </a>
          <a href="#features" className="btn btn-ghost">
            See How It Works
          </a>
        </div>

        {/* Terminal Preview */}
        <div className="hero-visual">
          <div className="hero-terminal">
            <div className="terminal-header">
              <span className="terminal-dot red" />
              <span className="terminal-dot yellow" />
              <span className="terminal-dot green" />
              <span className="terminal-title">rootly — live analysis</span>
            </div>
            <div className="terminal-body">
              <div className="terminal-line">
                <span className="t-prompt">$</span>
                <span className="t-dim">cat /var/log/payment-service.out | head -5</span>
              </div>
              <div className="terminal-line">
                <span className="t-error">[ERROR]</span>
                <span>payment-service: Connection refused to postgres-primary:5432</span>
              </div>
              <div className="terminal-line">
                <span className="t-warn">[WARN]</span>
                <span>payment-service: Circuit breaker OPEN after 3 failed retries</span>
              </div>
              <div className="terminal-line">
                <span className="t-error">[ERROR]</span>
                <span>postgres-primary: FATAL: too many connections for role "payment_user"</span>
              </div>
              <div className="terminal-line">
                <span className="t-error">[CRITICAL]</span>
                <span>monitor: payment-service DOWN — 0/3 health checks passing</span>
              </div>
              <div className="terminal-line">
                <span className="t-prompt">$</span>
                <span className="t-success">incidentctl analyze --file payment-outage.log</span>
              </div>
              <div className="terminal-line">
                <span className="t-info">▸</span>
                <span className="t-dim">Analyzing 12 log entries...</span>
              </div>
              <div className="terminal-line">
                <span className="t-success">✓</span>
                <span>Root cause found: Connection pool exhaustion (100/100 active)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features" id="features">
        <div className="section-header">
          <h2>Why Rootly?</h2>
          <p>Stop spending hours digging through logs. Let AI find the root cause for you.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon purple">⚡</div>
            <h3>Instant Analysis</h3>
            <p>Paste logs, get answers in seconds. No more scrolling through thousands of lines to find the needle.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon blue">🧠</div>
            <h3>AI-Powered Insights</h3>
            <p>LLaMA 3.1 analyzes your logs and identifies root causes, symptoms, and contributing factors automatically.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon green">📊</div>
            <h3>Severity Scoring</h3>
            <p>Automatic severity classification from CRITICAL to LOW based on impact analysis of your incident.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon orange">🔗</div>
            <h3>Service Dependency Mapping</h3>
            <p>Automatically identifies affected services and maps the cascade failure chain across your infrastructure.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon red">📋</div>
            <h3>Actionable Runbooks</h3>
            <p>Get specific, numbered steps to resolve the incident — not generic advice you already know.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon cyan">🔄</div>
            <h3>Async Processing</h3>
            <p>Submit logs and keep working. NATS-powered queue processes incidents in the background without blocking.</p>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="architecture" id="architecture">
        <div className="section-header">
          <h2>Built on Real Infrastructure</h2>
          <p>Five services working together, deployed on Zerops.</p>
        </div>

        <div className="arch-diagram">
          <div className="arch-nodes">
            <div className="arch-node">
              <div className="icon">🖥️</div>
              <div className="name">Frontend</div>
              <div className="tech">React + Vite</div>
            </div>
            <div className="arch-arrow">→</div>
            <div className="arch-node">
              <div className="icon">⚙️</div>
              <div className="name">API Server</div>
              <div className="tech">Express.js</div>
            </div>
            <div className="arch-arrow">→</div>
            <div className="arch-node">
              <div className="icon">📨</div>
              <div className="name">NATS Queue</div>
              <div className="tech">Message Broker</div>
            </div>
            <div className="arch-arrow">→</div>
            <div className="arch-node">
              <div className="icon">🤖</div>
              <div className="name">AI Worker</div>
              <div className="tech">LLaMA 3.1</div>
            </div>
            <div className="arch-arrow">→</div>
            <div className="arch-node">
              <div className="icon">🗄️</div>
              <div className="name">PostgreSQL</div>
              <div className="tech">Database</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-box">
          <h2>Ready to analyze your next incident?</h2>
          <p>No signup required. Open the app and start analyzing logs immediately.</p>
          <a href="/app" className="btn btn-primary" style={{ fontSize: '1rem', padding: '16px 36px' }}>
            Open Rootly →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>
          Built with ❤️ for The Zerops Challenge · Powered by{' '}
          <a href="https://zerops.io" target="_blank" rel="noopener">Zerops</a>{' '}
          · AI by <a href="https://groq.com" target="_blank" rel="noopener">Groq</a> &{' '}
          <a href="https://ollama.com" target="_blank" rel="noopener">Ollama</a>
        </p>
      </footer>
    </div>
  );
}
