// Shared types for Incident Analyzer
// Incident severity levels
const Severity = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info'
};

// Incident status
const Status = {
  OPEN: 'open',
  ANALYZING: 'analyzing',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
};

module.exports = { Severity, Status };
