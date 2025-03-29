import { RequestContext } from '../../middleware/context';

declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
} 