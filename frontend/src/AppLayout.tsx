import { Routes, Route, NavLink } from 'react-router-dom';
import AppDashboard from './pages/AppDashboard';
import SubmitIncident from './pages/SubmitIncident';
import IncidentDetail from './pages/IncidentDetail';

export default function AppLayout() {
  return (
    <div className="app-layout">
      <div className="bg-grid" />
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />

      {/* Sidebar */}
      <aside className="sidebar">
        <a href="/" className="sidebar-brand">
          <span className="logo-icon">🔍</span>
          <span>Rootly</span>
        </a>

        <nav className="sidebar-nav">
          <NavLink to="/app" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="icon">📊</span>
            Dashboard
          </NavLink>
          <NavLink to="/app/submit" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="icon">➕</span>
            New Incident
          </NavLink>
          <a href="/" className="sidebar-link" style={{ marginTop: 'auto' }}>
            <span className="icon">🏠</span>
            Landing Page
          </a>
        </nav>

        <div className="sidebar-footer">
          <p>Powered by LLaMA 3.1</p>
          <p style={{ marginTop: 4 }}>Deployed on Zerops</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Routes>
          <Route index element={<AppDashboard />} />
          <Route path="submit" element={<SubmitIncident />} />
          <Route path="incidents/:id" element={<IncidentDetail />} />
        </Routes>
      </main>
    </div>
  );
}
