use crate::{db::Database, parser, server::AppState};
use anyhow::Result;
use sha2::{Digest, Sha256};
use tokio::io::AsyncReadExt;
use tokio::net::TcpListener;
use tokio::time::{timeout, Duration};
use ulid::Ulid;

pub async fn serve(host: String, port: u16, state: AppState) -> Result<()> {
    let addr = format!("{}:{}", host, port);
    let listener = TcpListener::bind(&addr).await?;
    tracing::info!(%addr, "tcp listener started");

    loop {
        let (mut socket, peer) = listener.accept().await?;
        let st = state.clone();
        tokio::spawn(async move {
            let received_at = chrono::Utc::now();
            let mut buf: Vec<u8> = Vec::new();
            let mut chunk = [0u8; 8192];
            let idle = Duration::from_millis(st.args.idle_timeout_ms);
            let mut status = "idle_timeout";

            loop {
                match timeout(idle, socket.read(&mut chunk)).await {
                    Ok(Ok(0)) => { status = "closed_by_client"; break; }
                    Ok(Ok(n)) => {
                        if buf.len() + n > st.args.max_payload_bytes {
                            let allowed = st.args.max_payload_bytes.saturating_sub(buf.len());
                            buf.extend_from_slice(&chunk[..allowed]);
                            status = "max_size_exceeded";
                            break;
                        }
                        buf.extend_from_slice(&chunk[..n]);
                    }
                    Ok(Err(e)) => { tracing::warn!(error=%e, "tcp read error"); status = "socket_error"; break; }
                    Err(_) => { break; }
                }
            }

            if buf.is_empty() {
                tracing::debug!(peer=%peer, "empty tcp payload ignored");
                return;
            }

            let completed_at = chrono::Utc::now();
            let mut parsed = parser::parse_escpos(&buf, 576);
            if status != "ok" && status != "closed_by_client" {
                if !parsed.warnings.iter().any(|w| w == status) { parsed.warnings.push(status.to_string()); }
                if parsed.status == "ok" { parsed.status = "partial".into(); }
            }

            let mut hasher = Sha256::new();
            hasher.update(&buf);
            let sha256 = hex::encode(hasher.finalize());
            let raw_base64 = parser::raw_base64(&buf);
            let external_id = format!("job_{}", Ulid::new());
            let warnings_json = serde_json::to_string(&parsed.warnings).unwrap_or_else(|_| "[]".into());
            let commands_json = serde_json::to_string(&parsed.commands).unwrap_or_else(|_| "[]".into());
            let render_model_json = serde_json::to_string(&parsed.render_model).unwrap_or_else(|_| "{}".into());

            let db: &Database = &st.db;
            let res = db.insert_job(
                &external_id,
                st.args.tcp_port,
                &parsed.status,
                Some(peer.ip().to_string().as_str()),
                Some(peer.port()),
                buf.len(),
                &raw_base64,
                &sha256,
                &warnings_json,
                &commands_json,
                &render_model_json,
                &received_at.to_rfc3339(),
                &completed_at.to_rfc3339(),
            );

            match res {
                Ok(id) => tracing::info!(job_id=id, %external_id, bytes=buf.len(), parse_status=%parsed.status, "tcp job stored"),
                Err(e) => tracing::error!(error=%e, %external_id, "failed to store tcp job"),
            }
        });
    }
}
