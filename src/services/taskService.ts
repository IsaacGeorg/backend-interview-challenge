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
    this.db.insert('tasks', newTask);
    // 5. Add to sync queue
    return newTask;
    throw new Error('Not implemented');
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

    this.db.update('tasks', id, updatedTask);
    return task;
    throw new Error('Not implemented');
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
    const deletedTask: Task = {
      ...task,
    is_deleted: true,
    updated_at: new Date(),
    sync_status: 'pending',
  };

  this.db.delete('tasks', id, deletedTask);
  return true;
  }

  async getTask(id: string): Promise<Task | null> {
    // TODO: Implement get single task
    // 1. Query database for task by id
    // 2. Return null if not found or is_deleted is true
    throw new Error('Not implemented');
  }

  async getAllTasks(): Promise<Task[]> {
    // TODO: Implement get all non-deleted tasks
    // 1. Query database for all tasks where is_deleted = false
    // 2. Return array of tasks
    throw new Error('Not implemented');
  }

  async getTasksNeedingSync(): Promise<Task[]> {
    // TODO: Get all tasks with sync_status = 'pending' or 'error'
    throw new Error('Not implemented');
  }
}