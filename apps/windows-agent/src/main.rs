mod config;
mod db;
mod parser;
mod server;
mod tcp;

use anyhow::Result;
use clap::Parser;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Parser, Debug, Clone)]
#[command(name = "oppe-windows-agent", about = "Open POS Printer Emulator - Windows local agent")]
pub struct Args {
    /// HTTP UI/API bind address
    #[arg(long, env = "OPPE_HTTP_HOST", default_value = "127.0.0.1")]
    http_host: String,

    /// HTTP UI/API port
    #[arg(long, env = "OPPE_HTTP_PORT", default_value_t = 8080)]
    http_port: u16,

    /// TCP ESC/POS listener bind address
    #[arg(long, env = "OPPE_TCP_HOST", default_value = "0.0.0.0")]
    tcp_host: String,

    /// TCP ESC/POS listener port
    #[arg(long, env = "OPPE_TCP_PORT", default_value_t = 9100)]
    tcp_port: u16,

    /// SQLite database path
    #[arg(long, env = "OPPE_DB_PATH", default_value = "oppe-windows.db")]
    db_path: String,

    /// Idle timeout in milliseconds before finalizing a TCP job
    #[arg(long, env = "OPPE_IDLE_TIMEOUT_MS", default_value_t = 1500)]
    idle_timeout_ms: u64,

    /// Max payload bytes per TCP job
    #[arg(long, env = "OPPE_MAX_PAYLOAD_BYTES", default_value_t = 1_048_576)]
    max_payload_bytes: usize,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info,oppe_windows_agent=debug".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let args = Args::parse();
    tracing::info!(?args.http_host, args.http_port, ?args.tcp_host, args.tcp_port, "starting OPPE Windows agent");

    let db = db::Database::open(&args.db_path)?;
    db.init()?;

    let state = server::AppState::new(db, args.clone());

    let tcp_state = state.clone();
    let tcp_host = args.tcp_host.clone();
    let tcp_port = args.tcp_port;
    tokio::spawn(async move {
        if let Err(e) = tcp::serve(tcp_host, tcp_port, tcp_state).await {
            tracing::error!(error = %e, "tcp server failed");
        }
    });

    server::serve(args.http_host, args.http_port, state).await?;
    Ok(())
}
