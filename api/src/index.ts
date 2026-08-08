import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { initDB } from './db';
import { connectNATS } from './nats';
import routes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS — allow all origins in dev, restrict in production
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : true,
  methods: ['GET', 'POST'],
  maxAge: 86400,
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // 10 incident submissions per minute
  message: { error: 'Too many incident submissions, please slow down' },
});

app.use(limiter);
app.use(express.json({ limit: '5mb' }));

// Apply stricter rate limit to incident creation
app.use('/api/incidents', (req, res, next) => {
  if (req.method === 'POST') {
    return submitLimiter(req, res, next);
  }
  next();
});

app.use('/api', routes);

async function start() {
  try {
    await initDB();
    await connectNATS();

    app.listen(PORT, () => {
      console.log(`API server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
