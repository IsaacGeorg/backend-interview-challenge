import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { Task, SyncQueueItem } from '../types';

const sqlite = sqlite3.verbose();

export class Database {
  getAll(table: string): Promise<any[]> {
    const sql = `SELECT * FROM ${table}`;
  return this.all(sql);
  }
  async delete(table: string, id: string): Promise <void> {
    const sql = `UPDATE ${table} SET is_deleted = 1, updated_at=CURRENT_TIMESTAMP WHERE id = ?`;
    await this.run(sql, [id]);
  }

  async update(table: string, id: string, data: any): Promise<void> {

  const keys = Object.keys(data);
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(data), id];
  const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
  await this.run(sql, values);
    
  }


  async insert(table: string, data:any): Promise<void> {
  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(', ');
  const values = Object.values(data);
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  await this.run(sql, values);
  }


  private db: sqlite3.Database;

  constructor(filename: string = ':memory:') {
    this.db = new sqlite.Database(filename);
  }

  async initialize(): Promise<void> {
    await this.createTables();
  }

  private async createTables(): Promise<void> {
    const createTasksTable = `
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        completed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_deleted INTEGER DEFAULT 0,
        sync_status TEXT DEFAULT 'pending',
        server_id TEXT,
        last_synced_at DATETIME
      )
    `;

    const createSyncQueueTable = `
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      )
    `;

    await this.run(createTasksTable);
    await this.run(createSyncQueueTable);
  }

  // Helper methods
  run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}