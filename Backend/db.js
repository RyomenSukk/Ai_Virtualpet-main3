// Backend/db.js
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";

let db;

export async function initDb() {
  if (db) return db;

  // เก็บ db ไว้ที่ Backend/pet.db
  const filename = path.join(process.cwd(), "Backend", "pet.db");

  db = await open({
    filename,
    driver: sqlite3.Database
  });

  await db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user','assistant')),
      text TEXT NOT NULL,
      intent TEXT,
      sentiment TEXT,
      pet_state_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_convo_session_time
    ON conversations(session_id, created_at);
  `);

  return db;
}

export async function saveMessage({ sessionId, role, text, intent=null, sentiment=null, petState=null }) {
  const db = await initDb();
  await db.run(
    `INSERT INTO conversations(session_id, role, text, intent, sentiment, pet_state_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    sessionId,
    role,
    text,
    intent,
    sentiment,
    petState ? JSON.stringify(petState) : null
  );
}

export async function getRecentMessages(sessionId, limit = 12) {
  const db = await initDb();
  const rows = await db.all(
    `SELECT role, text
     FROM conversations
     WHERE session_id = ?
     ORDER BY id DESC
     LIMIT ?`,
    sessionId,
    limit
  );

  // เอาเรียงเก่า -> ใหม่
  return rows.reverse();
}
