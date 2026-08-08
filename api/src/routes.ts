import { Router, Request, Response } from 'express';
import {
  createIncident,
  getIncident,
  listIncidents,
  updateIncidentAnalysis,
  deleteIncident,
  getStats
} from './db';
import { publishIncident } from './nats';

const router = Router();

const MAX_LOG_LENGTH = 1_000_000; // 1MB of text
const MAX_TITLE_LENGTH = 500;
const MAX_LIST_LIMIT = 500;

function validateUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function sanitizeInput(value: any, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

// Create a new incident and queue for analysis
router.post('/incidents', async (req: Request, res: Response) => {
  try {
    const { title, logs, service, environment } = req.body;

    if (!logs || typeof logs !== 'string' || logs.trim().length === 0) {
      res.status(400).json({ error: 'logs field is required and must be non-empty' });
      return;
    }

    if (logs.length > MAX_LOG_LENGTH) {
      res.status(400).json({
        error: `logs field exceeds maximum length of ${MAX_LOG_LENGTH.toLocaleString()} characters (received ${logs.length.toLocaleString()})`,
      });
      return;
    }

    const cleanTitle = sanitizeInput(title, MAX_TITLE_LENGTH) || 'Untitled Incident';
    const cleanService = sanitizeInput(service, 200) || undefined;
    const cleanEnvironment = sanitizeInput(environment, 100) || undefined;

    const incident = await createIncident(
      cleanTitle,
      logs.trim(),
      cleanService,
      cleanEnvironment
    );

    // Queue for async analysis — if publish fails, clean up the orphaned incident
    const published = await publishIncident(incident.id, {
      title: incident.title,
      raw_logs: incident.raw_logs,
      service: incident.service,
      environment: incident.environment,
    });

    if (!published) {
      // Delete the incident since it will never be analyzed
      await deleteIncident(incident.id).catch(() => {});
      res.status(503).json({ error: 'Analysis queue unavailable. Please try again.' });
      return;
    }

    res.status(201).json({
      id: incident.id,
      title: incident.title,
      status: 'analyzing',
      created_at: incident.created_at,
    });
  } catch (err: any) {
    console.error('Create incident error:', err);
    res.status(500).json({ error: 'Failed to create incident' });
  }
});

// Get single incident with analysis
router.get('/incidents/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!validateUUID(id)) {
      res.status(400).json({ error: 'Invalid incident ID format' });
      return;
    }

    const incident = await getIncident(id);
    if (!incident) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }
    res.json(incident);
  } catch (err: any) {
    console.error('Get incident error:', err);
    res.status(500).json({ error: 'Failed to fetch incident' });
  }
});

// List incidents
router.get('/incidents', async (req: Request, res: Response) => {
  try {
    let limit = parseInt(req.query.limit as string) || 50;
    let offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string | undefined;

    if (offset < 0) offset = 0;
    if (limit < 1) limit = 50;
    if (limit > MAX_LIST_LIMIT) limit = MAX_LIST_LIMIT;

    const incidents = await listIncidents(limit, offset, status);
    res.json(incidents);
  } catch (err: any) {
    console.error('List incidents error:', err);
    res.status(500).json({ error: 'Failed to list incidents' });
  }
});

// Get dashboard stats
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err: any) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
