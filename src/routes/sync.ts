import { Router, Request, Response } from 'express';
import { SyncService } from '../services/syncService';
import { TaskService } from '../services/taskService';
import { Database } from '../db/database';

export function createSyncRouter(db: Database): Router {
  const router = Router();
  const taskService = new TaskService(db);
  const syncService = new SyncService(db, taskService);

  // Trigger manual sync
  router.post('/sync', async (req: Request, res: Response) => {
    // TODO: Implement sync endpoint
    // 1. Check connectivity first
    // 2. Call syncService.sync()
    // 3. Return sync result

    try {
      // 1. Check if the server is reachable
      const online = await syncService.checkConnectivity();
      if (!online) {
        return res.status(503).json({ error: 'Server not reachable. Please try again later.' });
      }

      // 2. Start the sync process
      const result = await syncService.sync();

      // 3. Return sync summary
      res.json({
        success: result.success,
        synced_items: result.synced_items,
        failed_items: result.failed_items,
        errors: result.errors,
        message: 'Sync completed successfully'
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to sync', details: error.message });
    }
  });




  // Check sync status
  router.get('/status', async (req: Request, res: Response) => {
    // TODO: Implement sync status endpoint
    // 1. Get pending sync count
    // 2. Get last sync timestamp
    // 3. Check connectivity
    // 4. Return status summary

    try {
    const pendingItems = await db.all(`SELECT COUNT(*) as count FROM sync_queue`);
    const pendingCount = pendingItems[0]?.count || 0;

    const lastSync = await db.get(`
      SELECT MAX(last_synced_at) as last_sync 
      FROM tasks 
      WHERE sync_status = 'synced'
    `);

    const online = await syncService.checkConnectivity();

    res.json({
      online,
      pending: pendingCount,
      last_sync: lastSync?.last_sync || null,
      timestamp: new Date(),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get sync status', details: error.message });
  }
  });





  // Batch sync endpoint (for server-side)
  router.post('/batch', async (req: Request, res: Response) => {
    // TODO: Implement batch sync endpoint
    // This would be implemented on the server side
    // to handle batch sync requests from clients

    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Invalid batch format' });
      }

      // Here, you could process each sync operation on the server side
      // For now, just echo back that the batch was received
      res.json({ received: items.length, message: 'Batch sync received (mock)' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to process batch sync', details: error.message });
    }
    
  });

  // Health check endpoint
  router.get('/health', async (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  return router;
}