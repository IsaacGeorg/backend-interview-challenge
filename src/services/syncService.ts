import axios from 'axios';
import { Task, SyncQueueItem, SyncResult, BatchSyncRequest, BatchSyncResponse, SyncError } from '../types';
import { Database } from '../db/database';
import { TaskService } from './taskService';
import { v4 as uuidv4 } from 'uuid';

export class SyncService {
  private apiUrl: string;
  
  constructor(
    private db: Database,
    private taskService: TaskService,
    apiUrl: string = process.env.API_BASE_URL || 'http://localhost:3000/api'
  ) {
    this.apiUrl = apiUrl;
  }

  async sync(): Promise<SyncResult> {

    // TODO: Main sync orchestration method
    // 1. Get all items from sync queue
    // 2. Group items by batch (use SYNC_BATCH_SIZE from env)
    // 3. Process each batch
    // 4. Handle success/failure for each item
    // 5. Update sync status in database
    // 6. Return sync result summary

    try {
    // 1️⃣ Get all items from sync_queue
    const queueItems: SyncQueueItem[] = await this.db.all(`SELECT * FROM sync_queue`);
    if (queueItems.length === 0) {
      return {
        success: false,
        synced_items: 0,
        failed_items: 0,
        errors: [],
      };
    }

    // 2️⃣ Group items into batches
    const batchSize = parseInt(process.env.SYNC_BATCH_SIZE || '10', 10);
    const batches = [];
    for (let i = 0; i < queueItems.length; i += batchSize) {
      batches.push(queueItems.slice(i, i + batchSize));
    }

    // 3️⃣ Process batches
    let synced = 0;
    let failed = 0;
    const errors: SyncError[] = [];

    for (const batch of batches) {
      try {
        const result = await this.processBatch(batch); // TODO: implement next
        result.processed_items.forEach((item) => {
          if (item.status === 'success') {
            synced++;
          }else failed++;

          if (item.error) {
            errors.push({
              task_id: item.client_id,
              operation: 'sync',
              error: item.error || 'Unknown sync error',
              timestamp: new Date(),
            });
          }
        });
      } catch (err: any) {
        failed += batch.length;
        errors.push({
          task_id: 'batch',
          operation: 'sync',
          error: err.message,
          timestamp: new Date(),
        });
      }
    }

    // 4️⃣ Return result summary
    const overallSuccess = failed === 0 && errors.length === 0;
    return {
      success: overallSuccess,
      synced_items: synced,
      failed_items: failed,
      errors,
    };
  } catch (error: any) {
    // Catch unexpected database or logic errors
    
    return {
      success: false,
      synced_items: 0,
      failed_items: 0,
      errors: [
        {
          task_id: 'none',
          operation: 'sync',
          error: error.message,
          timestamp: new Date(),
        },
      ],
    };
  }
    
  }

  async addToSyncQueue(taskId: string, operation: 'create' | 'update' | 'delete', data: Partial<Task>): Promise<void> {
    // TODO: Add operation to sync queue
    // 1. Create sync queue item
    // 2. Store serialized task data
    // 3. Insert into sync_queue table

    const syncItemId = uuidv4();

  const sql = `
    INSERT INTO sync_queue (id, task_id, operation, data)
    VALUES (?, ?, ?, ?)
  `;

  try {
    await this.db.run(sql, [
      syncItemId,              // unique ID for the sync queue item
      taskId,                  // the ID of the task being synced
      operation,               // what action happened: create, update, or delete
      JSON.stringify(data),    // store task data as JSON string
    ]);
  } catch (error) {
    console.error(' Failed to add item to sync queue:', error);
    throw error;
  }
  }

  private async processBatch(items: SyncQueueItem[]): Promise<BatchSyncResponse> {
    // TODO: Process a batch of sync items
    // 1. Prepare batch request
    // 2. Send to server
    // 3. Handle response
    // 4. Apply conflict resolution if needed

    const batchPayload = items.map(item => ({
    task_id: item.task_id,
    operation: item.operation,
    data: JSON.parse(item.data),
  }));

  try {
    const response = await axios.post(`${this.apiUrl}/sync/batch`, { items: batchPayload });
    const { processed_items } = response.data as BatchSyncResponse;

    // Handle each processed item
    for (const result of processed_items) {
      const item = items.find(i => i.task_id === result.client_id);
      if (!item) continue;

      if (result.status === 'success') {
        await this.updateSyncStatus(result.client_id, 'synced', result.resolved_data);
      } else if (result.status === 'conflict') {
        const localTask = JSON.parse(item.data);
        const resolvedTask = await this.resolveConflict(localTask, result.resolved_data!);
        await this.updateSyncStatus(result.client_id, 'synced', resolvedTask);
      } else {
        await this.handleSyncError(item, new Error(result.error || 'Unknown error'));
      }
    }

    //  Return correct object according to interface
    return { processed_items };

  } catch (error) {
    console.error('Batch sync failed:', error);

    const failedResults = items.map(item => ({
      client_id: item.task_id,
      server_id: '',
      status: 'error' as const,
      error: (error as Error).message || 'Batch sync failed',
    }));

    for (const item of items) {
      await this.handleSyncError(item, error as Error);
    }

    // On error, return empty processed_items
    return { processed_items: failedResults };
  }
  }

  private async resolveConflict(localTask: Task, serverTask: Task): Promise<Task> {
    // TODO: Implement last-write-wins conflict resolution
    // 1. Compare updated_at timestamps
    // 2. Return the more recent version
    // 3. Log conflict resolution decision

    const localTime = new Date(localTask.updated_at).getTime();
  const serverTime = new Date(serverTask.updated_at).getTime();

  const resolvedTask = localTime > serverTime ? localTask : serverTask;

  console.log(`Conflict resolved for task ${localTask.id}: using ${localTime > serverTime ? 'local' : 'server'} version`);

  return resolvedTask;
  }

  private async updateSyncStatus(taskId: string, status: 'synced' | 'error', serverData?: Partial<Task>): Promise<void> {
    // TODO: Update task sync status
    // 1. Update sync_status field
    // 2. Update server_id if provided
    // 3. Update last_synced_at timestamp
    // 4. Remove from sync queue if successful

    const now = new Date().toISOString();

  const updates: any = {
    sync_status: status,
    last_synced_at: now,
  };

  if (serverData?.server_id) updates.server_id = serverData.server_id;

  await this.db.run(
    `UPDATE tasks SET sync_status = ?, last_synced_at = ?, server_id = COALESCE(?, server_id) WHERE id = ?`,
    [status, now, updates.server_id || null, taskId]
  );

  // If successfully synced, remove from queue
  if (status === 'synced') {
    await this.db.run(`DELETE FROM sync_queue WHERE task_id = ?`, [taskId]);
  }
  }



  private async handleSyncError(item: SyncQueueItem, error: Error): Promise<void> {
    // TODO: Handle sync errors
    // 1. Increment retry count
    // 2. Store error message
    // 3. If retry count exceeds limit, mark as permanent failure

    const MAX_RETRIES = 3;

  const newRetryCount = (item.retry_count || 0) + 1;
  const isPermanentFailure = newRetryCount >= MAX_RETRIES;

  await this.db.run(
    `UPDATE sync_queue
     SET retry_count = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [newRetryCount, error.message, item.id]
  );

  if (isPermanentFailure) {
    console.warn(`Task ${item.task_id} marked as permanently failed after ${newRetryCount} retries.`);
    await this.updateSyncStatus(item.task_id, 'error');
  }
  }


  async checkConnectivity(): Promise<boolean> {
    // TODO: Check if server is reachable
    // 1. Make a simple health check request
    // 2. Return true if successful, false otherwise
    try {
      await axios.get(`${this.apiUrl}/health`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}


