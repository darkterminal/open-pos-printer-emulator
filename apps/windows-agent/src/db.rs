use anyhow::{Context, Result};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobRow {
    pub id: i64,
    pub external_id: String,
    pub listener_port: i64,
    pub status: String,
    pub source_ip: Option<String>,
    pub source_port: Option<i64>,
    pub bytes_received: i64,
    pub raw_base64: String,
    pub sha256: String,
    pub warnings_json: String,
    pub commands_json: String,
    pub render_model_json: String,
    pub received_at: String,
    pub completed_at: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct JobSummary {
    pub id: i64,
    pub external_id: String,
    pub listener_port: i64,
    pub status: String,
    pub source_ip: Option<String>,
    pub bytes_received: i64,
    pub received_at: String,
    pub created_at: String,
}

impl Database {
    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        let conn = Connection::open(path.as_ref()).with_context(|| format!("open db {:?}", path.as_ref()))?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA foreign_keys=ON;")?;
        Ok(Self { conn: Arc::new(Mutex::new(conn)) })
    }

    pub fn init(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                external_id TEXT NOT NULL UNIQUE,
                listener_port INTEGER NOT NULL,
                status TEXT NOT NULL,
                source_ip TEXT,
                source_port INTEGER,
                bytes_received INTEGER NOT NULL DEFAULT 0,
                raw_base64 TEXT NOT NULL,
                sha256 TEXT NOT NULL,
                warnings_json TEXT NOT NULL DEFAULT '[]',
                commands_json TEXT NOT NULL DEFAULT '[]',
                render_model_json TEXT NOT NULL DEFAULT '{}',
                received_at TEXT NOT NULL,
                completed_at TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
            "#,
        )?;
        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    pub fn insert_job(
        &self,
        external_id: &str,
        listener_port: u16,
        status: &str,
        source_ip: Option<&str>,
        source_port: Option<u16>,
        bytes_received: usize,
        raw_base64: &str,
        sha256: &str,
        warnings_json: &str,
        commands_json: &str,
        render_model_json: &str,
        received_at: &str,
        completed_at: &str,
    ) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            r#"INSERT INTO jobs (external_id, listener_port, status, source_ip, source_port, bytes_received, raw_base64, sha256, warnings_json, commands_json, render_model_json, received_at, completed_at, created_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)"#,
            params![
                external_id,
                listener_port as i64,
                status,
                source_ip,
                source_port.map(|p| p as i64),
                bytes_received as i64,
                raw_base64,
                sha256,
                warnings_json,
                commands_json,
                render_model_json,
                received_at,
                completed_at,
                now,
            ],
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn list_jobs(&self, limit: i64) -> Result<Vec<JobSummary>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, external_id, listener_port, status, source_ip, bytes_received, received_at, created_at FROM jobs ORDER BY id DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit], |row| {
            Ok(JobSummary {
                id: row.get(0)?,
                external_id: row.get(1)?,
                listener_port: row.get(2)?,
                status: row.get(3)?,
                source_ip: row.get(4)?,
                bytes_received: row.get(5)?,
                received_at: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?;
        let mut out = Vec::new();
        for r in rows { out.push(r?); }
        Ok(out)
    }

    pub fn get_job(&self, id: i64) -> Result<Option<JobRow>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, external_id, listener_port, status, source_ip, source_port, bytes_received, raw_base64, sha256, warnings_json, commands_json, render_model_json, received_at, completed_at, created_at FROM jobs WHERE id=?1")?;
        let row = stmt.query_row(params![id], |row| {
            Ok(JobRow {
                id: row.get(0)?,
                external_id: row.get(1)?,
                listener_port: row.get(2)?,
                status: row.get(3)?,
                source_ip: row.get(4)?,
                source_port: row.get(5)?,
                bytes_received: row.get(6)?,
                raw_base64: row.get(7)?,
                sha256: row.get(8)?,
                warnings_json: row.get(9)?,
                commands_json: row.get(10)?,
                render_model_json: row.get(11)?,
                received_at: row.get(12)?,
                completed_at: row.get(13)?,
                created_at: row.get(14)?,
            })
        }).optional()?;
        Ok(row)
    }

    pub fn count_jobs(&self) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM jobs", [], |r| r.get(0))?;
        Ok(count)
    }
}
