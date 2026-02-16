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

    -- ตารางเก็บประวัติการคุย (เดิม)
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

    -- ✅ (ใหม่) ตารางเก็บสถานะล่าสุดของน้องแมว (มีแค่ 1 แถวเสมอ)
    CREATE TABLE IF NOT EXISTS pet_status (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      hunger REAL,
      happiness REAL,
      bond REAL,
      action TEXT,
      emotion TEXT,
      last_updated_at INTEGER
    );
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
  return rows.reverse();
}

// ✅ (ใหม่) โหลดสถานะล่าสุดจาก DB
export async function loadPetStateDB() {
  const db = await initDb();
  const row = await db.get(`SELECT * FROM pet_status WHERE id = 1`);
  if (!row) return null;

  return {
    hunger: row.hunger,
    happiness: row.happiness,
    bond: row.bond,
    action: row.action,
    emotion: row.emotion,
    lastUpdatedAt: row.last_updated_at
  };
}

// ✅ (ใหม่) บันทึกสถานะล่าสุดลง DB
export async function savePetStateDB(state) {
  const db = await initDb();
  await db.run(`
    INSERT INTO pet_status (id, hunger, happiness, bond, action, emotion, last_updated_at)
    VALUES (1, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      hunger=excluded.hunger,
      happiness=excluded.happiness,
      bond=excluded.bond,
      action=excluded.action,
      emotion=excluded.emotion,
      last_updated_at=excluded.last_updated_at
  `, state.hunger, state.happiness, state.bond, state.action, state.emotion, state.lastUpdatedAt);
}