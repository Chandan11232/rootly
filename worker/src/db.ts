import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/incident_analyzer',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function updateIncidentAnalysis(id: string, analysis: any, severity: string) {
  const result = await pool.query(
    `UPDATE incidents
     SET analysis = $2, severity = $3, status = 'resolved', updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, JSON.stringify(analysis), severity]
  );
  if (!result.rows[0]) {
    console.warn(`updateIncidentAnalysis: incident ${id} not found`);
  }
  return result.rows[0];
}

export async function markIncidentFailed(id: string, error: string) {
  const result = await pool.query(
    `UPDATE incidents
     SET status = 'closed', analysis = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, JSON.stringify({ error: error.slice(0, 1000) })]
  );
  if (!result.rows[0]) {
    console.warn(`markIncidentFailed: incident ${id} not found`);
  }
}

export default pool;
