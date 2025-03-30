import express from 'express';

const router = express.Router();

/**
 * @route GET /health
 * @desc Health check endpoint for load balancers
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    // Check if the application can access environment variables
    const envStatus = {
      mongodb: process.env.MONGODB_URI ? 'available' : 'missing',
      redis: process.env.REDIS_URL ? 'available' : 'missing',
      jwt: process.env.JWT_SECRET ? 'available' : 'missing'
    };

    // Return health status
    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      services: envStatus
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Failed to perform health check'
    });
  }
});

export default router; 