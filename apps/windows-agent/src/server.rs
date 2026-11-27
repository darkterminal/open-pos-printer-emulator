use crate::{db::{Database, JobRow}, Args};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{Html, IntoResponse, Response},
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use std::sync::Arc;
use tower_http::trace::TraceLayer;

#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub args: Arc<Args>,
}

impl AppState {
    pub fn new(db: Database, args: Args) -> Self {
        Self { db, args: Arc::new(args) }
    }
}

#[derive(Debug, Deserialize)]
struct JobsQuery {
    limit: Option<i64>,
}

pub async fn serve(host: String, port: u16, state: AppState) -> anyhow::Result<()> {
    let app = Router::new()
        .route("/", get(index))
        .route("/health", get(health))
        .route("/api/jobs", get(list_jobs))
        .route("/api/jobs/{id}", get(get_job))
        .with_state(state)
        .layer(TraceLayer::new_for_http());

    let addr = format!("{}:{}", host, port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!(%addr, "http ui/api started");
    axum::serve(listener, app).await?;
    Ok(())
}

async fn health(State(state): State<AppState>) -> impl IntoResponse {
    let count = state.db.count_jobs().unwrap_or(-1);
    Json(serde_json::json!({
        "status": "ok",
        "service": "oppe-windows-agent",
        "version": env!("CARGO_PKG_VERSION"),
        "jobs": count,
        "tcp_port": state.args.tcp_port,
        "http_port": state.args.http_port,
    }))
}

async fn list_jobs(State(state): State<AppState>, Query(q): Query<JobsQuery>) -> impl IntoResponse {
    let limit = q.limit.unwrap_or(50).clamp(1, 200);
    match state.db.list_jobs(limit) {
        Ok(jobs) => Json(serde_json::json!({ "data": jobs })).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn get_job(State(state): State<AppState>, Path(id): Path<i64>) -> Response {
    match state.db.get_job(id) {
        Ok(Some(job)) => Json(job_to_json(job)).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, "Job not found").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

fn job_to_json(job: JobRow) -> serde_json::Value {
    let warnings: serde_json::Value = serde_json::from_str(&job.warnings_json).unwrap_or(serde_json::json!([]));
    let commands: serde_json::Value = serde_json::from_str(&job.commands_json).unwrap_or(serde_json::json!([]));
    let render_model: serde_json::Value = serde_json::from_str(&job.render_model_json).unwrap_or(serde_json::json!({}));
    serde_json::json!({
        "id": job.id,
        "external_id": job.external_id,
        "listener_port": job.listener_port,
        "status": job.status,
        "source_ip": job.source_ip,
        "source_port": job.source_port,
        "bytes_received": job.bytes_received,
        "raw_base64": job.raw_base64,
        "sha256": job.sha256,
        "warnings": warnings,
        "commands": commands,
        "render_model": render_model,
        "received_at": job.received_at,
        "completed_at": job.completed_at,
        "created_at": job.created_at,
    })
}

async fn index(State(state): State<AppState>) -> Html<String> {
    let jobs = state.db.list_jobs(50).unwrap_or_default();
    let jobs_json = serde_json::to_string(&jobs).unwrap_or_else(|_| "[]".into());
    let tcp_port = state.args.tcp_port;
    Html(render_index(&jobs_json, tcp_port))
}

fn render_index(jobs_json: &str, tcp_port: u16) -> String {
    let template = include_str!("../static/index.html");
    template
        .replace("__JOBS_JSON__", jobs_json)
        .replace("__TCP_PORT__", &tcp_port.to_string())
}
