import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { itemsRouter } from './domains/items/items.routes';
import { relationshipsRouter } from './domains/relationships/relationships.routes';
import { viewsRouter } from './domains/views/views.routes';
import { errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: process.env.NODE_ENV === 'production' }));
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/items',     itemsRouter);
  app.use('/api/tags',      relationshipsRouter);
  app.use('/api/dashboard', viewsRouter);

  // Serve React build in production
  if (process.env.NODE_ENV === 'production') {
    const publicPath = path.join(__dirname, '..', 'public');
    app.use(express.static(publicPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(publicPath, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}
