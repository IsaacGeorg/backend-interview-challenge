import { v4 as uuidv4 } from 'uuid';
import { Task } from '../types';
import { Database } from '../db/database';
import { SyncService } from './syncService';

export class TaskService {
  constructor(private db: Database) {}

  async createTask(taskData: Partial<Task>): Promise<Task> {
    // TODO: Implement task creation
    // 1. Generate UUID for the task
    const id = uuidv4();
    // 2. Set default values (completed: false, is_deleted: false)
    const newTask: Task ={


      id,
      title: taskData.title || 'Untitled title',
      description: taskData.description || '',
      completed : false,
      is_deleted : false,
      // 3. Set sync_status to 'pending'
      sync_status: 'pending',
      created_at : new Date(),
      updated_at : new Date(),
      server_id : taskData.server_id || undefined,
      last_synced_at : undefined
    };
    
    // 4. Insert into database
    await this.db.insert('tasks', newTask);
    // 5. Add to sync queue
    return newTask;
    
  }


  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    // TODO: Implement task update
    // 1. Check if task exists
    // 2. Update task in database
    // 3. Update updated_at timestamp
    // 4. Set sync_status to 'pending'
    // 5. Add to sync queue

    const task = await this.db.get('tasks', [id]);
    if (!task) return null;

    const updatedTask: Task = {
      ...task,
      ...updates,
      updated_at: new Date(),
      sync_status: 'pending', // mark for sync after offline update
    };

    await this.db.update('tasks', id, updatedTask);
    return updatedTask;
    
  }

  async deleteTask(id: string): Promise<boolean> {
    // TODO: Implement soft delete
    // 1. Check if task exists
    // 2. Set is_deleted to true
    // 3. Update updated_at timestamp
    // 4. Set sync_status to 'pending'
    // 5. Add to sync queue

    const task = await this.db.get('tasks', [id]);
  if (!task) return false;

  // 2️⃣ Create an updated version of the task
  const deletedTask: Task = {
    ...task,
    is_deleted: true,
    updated_at: new Date(),
    sync_status: 'pending', // Mark for sync on next online update
  };

  // 3️ Update the record (don’t remove it)
  await this.db.update('tasks', id, deletedTask);

  // 4️ Optionally: add to sync queue for deletion sync
  // If you have a SyncService instance, call:
  // await this.syncService.addToSyncQueue(id, 'delete', deletedTask);

  return true;
  }

  async getTask(id: string): Promise<Task | null> {
    // TODO: Implement get single task
    // 1. Query database for task by id
    // 2. Return null if not found or is_deleted is true

    // 1. Query the local database for the task by its ID
  const task = await this.db.get('tasks', [id]); // wrap in array if db expects key array

  // 2. If no task found OR it's marked as deleted, return null
  if (!task || task.is_deleted) {
    return null;
  }

  return task;
  }

  async getAllTasks(): Promise<Task[]> {
    // TODO: Implement get all non-deleted tasks
    // 1. Query database for all tasks where is_deleted = false
    // 2. Return array of tasks

    // 1. Fetch all tasks from the local DB
  const tasks = await this.db.getAll('tasks');

  // 2. Return only tasks that are not deleted
  return tasks.filter((t: Task) => !t.is_deleted);
  }


  async getTasksNeedingSync(): Promise<Task[]> {
    // TODO: Get all tasks with sync_status = 'pending' or 'error'

    // 1. Get all tasks
  const tasks = await this.db.getAll('tasks');

  // 2. Return only those that need syncing
  // (status pending or error — depending on your sync system)
  return tasks.filter(
    (t: Task) =>
      t.sync_status === 'pending' ||
      t.sync_status === 'error'
  );
    
  }
}