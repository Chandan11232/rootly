export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Status = 'open' | 'analyzing' | 'resolved' | 'closed';

export interface Incident {
  id: string;
  title: string;
  raw_logs: string;
  service?: string;
  environment?: string;
  severity?: Severity;
  status: Status;
  analysis?: RootCauseAnalysis;
  created_at: string;
  updated_at: string;
}

export interface RootCauseAnalysis {
  summary: string;
  root_cause: string;
  confidence: number;
  symptoms: string[];
  affected_services: string[];
  suggested_actions: string[];
  runbook_links: string[];
  contributing_factors: string[];
}

export interface AnalyzeRequest {
  logs: string;
  title?: string;
  service?: string;
  environment?: string;
}

export interface AnalyzeResponse {
  incident_id: string;
  analysis: RootCauseAnalysis;
}
