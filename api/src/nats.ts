import { connect, StringCodec, NatsConnection } from 'nats';

const sc = StringCodec();
let js: any;

export async function connectNATS() {
  const nc: NatsConnection = await connect({
    servers: process.env.NATS_URL || 'nats://localhost:4222',
    maxReconnectAttempts: -1,
    reconnectTimeWait: 2000,
  });

  js = nc.jetstream();
  console.log('Connected to NATS');
}

export async function publishIncident(incidentId: string, data: any): Promise<boolean> {
  if (!js) {
    console.error('Cannot publish: NATS JetStream not initialized');
    return false;
  }

  try {
    const payload = sc.encode(JSON.stringify({ incident_id: incidentId, ...data }));
    await js.publish('incidents.analyze', payload);
    console.log(`Published incident ${incidentId} for analysis`);
    return true;
  } catch (err: any) {
    console.error(`Failed to publish incident ${incidentId}:`, err.message);
    return false;
  }
}

export function getJetStream() {
  return js;
}
