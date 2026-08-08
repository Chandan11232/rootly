import { connect, StringCodec, consumerOpts, createInbox, nanos } from 'nats';
import dotenv from 'dotenv';
import { analyzeIncident } from './analyzer';
import { updateIncidentAnalysis, markIncidentFailed } from './db';

dotenv.config();

const sc = StringCodec();

interface IncidentMessage {
  incident_id?: string;
  raw_logs?: string;
  title?: string;
  service?: string;
  environment?: string;
}

function validateMessage(data: any): data is IncidentMessage & { incident_id: string; raw_logs: string } {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.incident_id !== 'string' || data.incident_id.length === 0) return false;
  if (typeof data.raw_logs !== 'string' || data.raw_logs.trim().length === 0) return false;
  // Validate UUID format loosely (36 chars with hyphens)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.incident_id)) return false;
  return true;
}

async function start() {
  const natsUrl = process.env.NATS_URL || 'nats://localhost:4222';
  const nc = await connect({ servers: natsUrl });
  const js = nc.jetstream();

  console.log('Worker connected to NATS, waiting for incidents...');

  // Create ephemeral consumer (unique per worker instance)
  const opts = consumerOpts();
  opts.manualAck();
  opts.ackExplicit();
  opts.deliverTo(createInbox());
  opts.deliverLastPerSubject();

  const psub = await js.subscribe('incidents.analyze', opts);

  (async () => {
    for await (const msg of psub) {
      let data: IncidentMessage | null = null;
      try {
        const decoded = sc.decode(msg.data);
        data = JSON.parse(decoded);

        if (!validateMessage(data)) {
          console.error('Invalid message format:', decoded.slice(0, 200));
          msg.term();
          continue;
        }

        console.log(`Processing incident: ${data.incident_id}`);

        const analysis = await analyzeIncident(data.raw_logs);

        await updateIncidentAnalysis(
          data.incident_id,
          {
            summary: analysis.summary,
            root_cause: analysis.root_cause,
            confidence: analysis.confidence,
            symptoms: analysis.symptoms,
            affected_services: analysis.affected_services,
            suggested_actions: analysis.suggested_actions,
            runbook_links: analysis.runbook_links,
            contributing_factors: analysis.contributing_factors,
          },
          analysis.severity
        );

        console.log(`Incident ${data.incident_id} analyzed: ${analysis.severity}`);
        msg.ack();
      } catch (err: any) {
        console.error(`Failed to process incident:`, err.message);
        if (data?.incident_id) {
          await markIncidentFailed(data.incident_id, err.message).catch(() => {});
        }
        msg.term();
      }
    }
  })();

  console.log('Worker listening on incidents.analyze');
}

start().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
