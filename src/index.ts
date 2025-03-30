import express from 'express';
import cors from 'cors';
import { config } from './config/config';
import { database } from './utils/database';
import { startQueueConsumer } from './services/queueConsumer';
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import { errorHandler } from './middleware/errorHandler';
import taskCommentRoutes from './routes/taskCommentRoutes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok',  
    timestamp: new Date().toISOString(),
    db: database.getMongoClient()?.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.use('/auth', authRoutes);
app.use('/tasks', taskRoutes);
app.use('/comments', taskCommentRoutes);

app.use(errorHandler);

const startServer = async () => {
  try {
    await database.connectMongoDB();
    
    try {
      await startQueueConsumer();
    } catch (error) {
      console.error('Failed to start queue consumer:', error instanceof Error ? error.message : 'Unknown error');
    }

    const port = config.port;
    app.listen(port, () => {
      console.log(`Server started on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
};

startServer();

process.on('SIGTERM', async () => {
  await database.disconnectMongoDB();
  await database.disconnectRedis();
  process.exit(0);
}); 