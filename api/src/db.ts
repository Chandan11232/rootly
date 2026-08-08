import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/incident_analyzer',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        raw_logs TEXT NOT NULL,
        service TEXT,
        environment TEXT,
        severity TEXT DEFAULT 'info',
        status TEXT DEFAULT 'open',
        analysis JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
      CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_incidents_service ON incidents(service);
    `);
    console.log('Database initialized');
  } finally {
    client.release();
  }
}

export async function createIncident(title: string, rawLogs: string, service?: string, environment?: string) {
  const result = await pool.query(
    `INSERT INTO incidents (title, raw_logs, service, environment)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [title, rawLogs, service || null, environment || null]
  );
  return result.rows[0];
}

export async function updateIncidentAnalysis(id: string, analysis: any, severity: string) {
  const result = await pool.query(
    `UPDATE incidents
     SET analysis = $2, severity = $3, status = 'resolved', updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, JSON.stringify(analysis), severity]
  );
  return result.rows[0];
}

export async function deleteIncident(id: string) {
  await pool.query('DELETE FROM incidents WHERE id = $1', [id]);
}

export async function getIncident(id: string) {
  const result = await pool.query('SELECT * FROM incidents WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function listIncidents(limit = 50, offset = 0, status?: string) {
  let query = 'SELECT * FROM incidents';
  const params: any[] = [];

  if (status) {
    query += ' WHERE status = $1';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getStats() {
  const result = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'open') as open,
      COUNT(*) FILTER (WHERE status = 'analyzing') as analyzing,
      COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
      COUNT(*) FILTER (WHERE severity = 'critical') as critical,
      COUNT(*) FILTER (WHERE severity = 'high') as high,
      COUNT(*) FILTER (WHERE severity = 'medium') as medium,
      COUNT(*) FILTER (WHERE severity = 'low') as low
    FROM incidents
  `);
  return result.rows[0];
}

export default pool;
