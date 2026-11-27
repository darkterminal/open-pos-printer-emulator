use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedCommand {
    pub offset: usize,
    pub hex: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub args: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RenderSegment {
    pub text: String,
    pub bold: bool,
    pub underline: bool,
    pub width: u8,
    pub height: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderLine {
    pub text: String,
    pub align: String,
    pub bold: bool,
    pub underline: bool,
    pub width: u8,
    pub height: u8,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kind: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub segments: Option<Vec<RenderSegment>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderModel {
    pub width_dots: u16,
    pub lines: Vec<RenderLine>,
    pub actions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParseResult {
    pub status: String, // ok | partial | parse_error
    pub warnings: Vec<String>,
    pub commands: Vec<ParsedCommand>,
    pub render_model: RenderModel,
}

#[derive(Clone, Copy)]
struct TextState {
    align: &'static str,
    bold: bool,
    underline: bool,
    width: u8,
    height: u8,
}

impl Default for TextState {
    fn default() -> Self {
        Self { align: "left", bold: false, underline: false, width: 1, height: 1 }
    }
}

fn to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect::<Vec<_>>().join(" ")
}

fn push_cmd(commands: &mut Vec<ParsedCommand>, offset: usize, bytes: &[u8], name: &str, args: Option<serde_json::Value>) {
    commands.push(ParsedCommand { offset, hex: to_hex(bytes), name: name.to_string(), args });
}

pub fn parse_escpos(buffer: &[u8], width_dots: u16) -> ParseResult {
    let mut commands = Vec::new();
    let mut warnings = Vec::new();
    let mut lines: Vec<RenderLine> = Vec::new();
    let mut actions: Vec<String> = Vec::new();
    let mut state = TextState::default();
    let mut segments: Vec<RenderSegment> = Vec::new();
    let mut unknown_count = 0usize;

    let flush_line = |segments: &mut Vec<RenderSegment>, lines: &mut Vec<RenderLine>, state: &TextState| {
        if segments.is_empty() { return; }
        let text = segments.iter().map(|s| s.text.as_str()).collect::<String>();
        let first = segments.iter().find(|s| !s.text.is_empty()).cloned().unwrap_or(RenderSegment { bold: state.bold, underline: state.underline, width: state.width, height: state.height, ..Default::default() });
        lines.push(RenderLine {
            text,
            align: state.align.to_string(),
            bold: first.bold,
            underline: first.underline,
            width: first.width,
            height: first.height,
            kind: None,
            label: None,
            segments: Some(segments.clone()),
        });
        segments.clear();
    };

    let push_text = |segments: &mut Vec<RenderSegment>, state: &TextState, ch: char| {
        if let Some(last) = segments.last_mut() {
            if last.bold == state.bold && last.underline == state.underline && last.width == state.width && last.height == state.height {
                last.text.push(ch);
                return;
            }
        }
        segments.push(RenderSegment { text: ch.to_string(), bold: state.bold, underline: state.underline, width: state.width, height: state.height });
    };

    let mut i = 0usize;
    while i < buffer.len() {
        let b = buffer[i];
        let offset = i;

        match b {
            0x1B => { // ESC
                let Some(c1) = buffer.get(i + 1).copied() else { warnings.push("truncated_esc".into()); break; };
                match c1 {
                    b'@' => { push_cmd(&mut commands, offset, &[b, c1], "ESC_@", None); state = TextState::default(); i += 2; }
                    b'E' => { let n = *buffer.get(i+2).unwrap_or(&0); state.bold = n & 1 == 1; push_cmd(&mut commands, offset, &[b,c1,n], "ESC_E", Some(serde_json::json!({"bold": state.bold}))); i += 3; }
                    b'-' => { let n = *buffer.get(i+2).unwrap_or(&0); state.underline = n != 0; push_cmd(&mut commands, offset, &[b,c1,n], "ESC_-", Some(serde_json::json!({"underline": state.underline}))); i += 3; }
                    b'a' => { let n = *buffer.get(i+2).unwrap_or(&0); state.align = match n { 1 => "center", 2 => "right", _ => "left" }; push_cmd(&mut commands, offset, &[b,c1,n], "ESC_a", Some(serde_json::json!({"align": state.align}))); i += 3; }
                    b'd' => { let n = *buffer.get(i+2).unwrap_or(&0); push_cmd(&mut commands, offset, &[b,c1,n], "ESC_d", Some(serde_json::json!({"lines": n}))); for _ in 0..n { flush_line(&mut segments, &mut lines, &state); lines.push(RenderLine{ text:String::new(), align:state.align.to_string(), bold:state.bold, underline:state.underline, width:state.width, height:state.height, kind:None, label:None, segments:None }); } actions.push("feed".into()); i+=3; }
                    b'!' => { let n = *buffer.get(i+2).unwrap_or(&0); state.bold = n & 0x08 != 0; state.underline = n & 0x80 != 0; state.width = if n & 0x20 != 0 {2} else {1}; state.height = if n & 0x10 != 0 {2} else {1}; push_cmd(&mut commands, offset, &[b,c1,n], "ESC_!", Some(serde_json::json!({"value":n}))); i+=3; }
                    b'*' => {
                        // ESC * m nL nH d...
                        let m = *buffer.get(i+2).unwrap_or(&0);
                        let nl = *buffer.get(i+3).unwrap_or(&0) as usize;
                        let nh = *buffer.get(i+4).unwrap_or(&0) as usize;
                        let k = nl + nh * 256;
                        let dots = match m { 0|1 => 8usize, 32|33 => 24usize, _ => 8usize };
                        let bytes_per_col = dots / 8;
                        let data_len = k * bytes_per_col;
                        let end = (i + 5 + data_len).min(buffer.len());
                        let payload = &buffer[(i+5).min(buffer.len())..end];
                        push_cmd(&mut commands, offset, &[b,c1,m,nl as u8,nh as u8], "ESC_*", Some(serde_json::json!({"mode":m,"k":k,"bytes":data_len})));
                        flush_line(&mut segments, &mut lines, &state);
                        lines.push(RenderLine{ text: format!("[image] ESC * {}x{}", k, dots), align:state.align.to_string(), bold:false, underline:false, width:1, height:1, kind:Some("image".into()), label:Some("raster".into()), segments:None });
                        actions.push("image".into());
                        if i + 5 + data_len > buffer.len() { warnings.push("truncated_esc_star_payload".into()); i = buffer.len(); } else { i = i + 5 + data_len; }
                        let _ = payload; // preview decode omitted in MVP
                    }
                    _ => { unknown_count += 1; push_cmd(&mut commands, offset, &[b,c1], "ESC_UNKNOWN", Some(serde_json::json!({"command": c1}))); i += 2; }
                }
            }
            0x1D => { // GS
                let Some(c1) = buffer.get(i + 1).copied() else { warnings.push("truncated_gs".into()); break; };
                match c1 {
                    b'V' => {
                        let m = *buffer.get(i+2).unwrap_or(&0);
                        push_cmd(&mut commands, offset, &[b,c1,m], "GS_V", Some(serde_json::json!({"mode":m})));
                        flush_line(&mut segments, &mut lines, &state);
                        lines.push(RenderLine{ text:"[cut]".into(), align:"left".into(), bold:false, underline:false, width:1, height:1, kind:Some("action".into()), label:Some("cut".into()), segments:None });
                        actions.push("cut".into());
                        i += 3;
                    }
                    b'!' => {
                        let n = *buffer.get(i+2).unwrap_or(&0);
                        state.width = if n & 0x0F >= 1 { ((n & 0x0F) + 1).min(8) } else { 1 };
                        state.height = if (n >> 4) >= 1 { (((n >> 4) & 0x0F) + 1).min(8) } else { 1 };
                        push_cmd(&mut commands, offset, &[b,c1,n], "GS_!", Some(serde_json::json!({"value":n})));
                        i += 3;
                    }
                    b'v' if buffer.get(i+2).copied() == Some(b'0') => {
                        let m = *buffer.get(i+3).unwrap_or(&0);
                        let xl = *buffer.get(i+4).unwrap_or(&0) as usize;
                        let xh = *buffer.get(i+5).unwrap_or(&0) as usize;
                        let yl = *buffer.get(i+6).unwrap_or(&0) as usize;
                        let yh = *buffer.get(i+7).unwrap_or(&0) as usize;
                        let width_bytes = xl + xh * 256;
                        let height = yl + yh * 256;
                        let data_len = width_bytes * height;
                        let end = (i + 8 + data_len).min(buffer.len());
                        let payload = &buffer[(i+8).min(buffer.len())..end];
                        push_cmd(&mut commands, offset, &[b,c1,b'0',m,xl as u8,xh as u8,yl as u8,yh as u8], "GS_v_0", Some(serde_json::json!({"mode":m,"width_dots":width_bytes*8,"height":height,"bytes":data_len})));
                        flush_line(&mut segments, &mut lines, &state);
                        // optional small preview - store base64 if reasonably small
                        let _ = payload;
                        lines.push(RenderLine{ text: format!("[image] raster {}x{} dots", width_bytes*8, height), align:state.align.to_string(), bold:false, underline:false, width:1, height:1, kind:Some("image".into()), label:Some("raster".into()), segments:None });
                        actions.push("image".into());
                        if i + 8 + data_len > buffer.len() { warnings.push("truncated_gs_v_0_payload".into()); i = buffer.len(); } else { i = i + 8 + data_len; }
                    }
                    b'(' => {
                        // GS ( ... - capture generically
                        let p_l = *buffer.get(i+2).unwrap_or(&0) as usize;
                        let p_h = *buffer.get(i+3).unwrap_or(&0) as usize;
                        let len = p_l + p_h * 256;
                        let end = (i+4+len).min(buffer.len());
                        push_cmd(&mut commands, offset, &buffer[i..end.min(i+8)], "GS_(", Some(serde_json::json!({"fn": c1, "len": len})));
                        if i + 4 + len > buffer.len() { warnings.push("truncated_gs_(".into()); i = buffer.len(); } else { i = i + 4 + len; }
                    }
                    _ => { unknown_count += 1; push_cmd(&mut commands, offset, &[b,c1], "GS_UNKNOWN", Some(serde_json::json!({"command": c1}))); i += 2; }
                }
            }
            0x0A => { flush_line(&mut segments, &mut lines, &state); push_cmd(&mut commands, offset, &[b], "LF", None); i += 1; }
            0x0D => { push_cmd(&mut commands, offset, &[b], "CR", None); i += 1; }
            0x09 => { push_text(&mut segments, &state, '\t'); push_cmd(&mut commands, offset, &[b], "HT", None); i += 1; }
            0x20..=0x7E => { push_text(&mut segments, &state, b as char); i += 1; }
            _ => {
                if b >= 0x80 {
                    // naive latin1 fallback for MVP
                    push_text(&mut segments, &state, b as char);
                    i += 1;
                } else {
                    unknown_count += 1;
                    push_cmd(&mut commands, offset, &[b], "BYTE_UNKNOWN", Some(serde_json::json!({"byte": b})));
                    i += 1;
                }
            }
        }
    }

    flush_line(&mut segments, &mut lines, &state);
    if unknown_count > 0 { warnings.push(format!("unknown_commands:{unknown_count}")); }
    let meaningful = commands.iter().any(|c| c.name != "CR" && c.name != "LF") || lines.iter().any(|l| !l.text.is_empty());
    if buffer.is_empty() {
        warnings.push("empty_payload".into());
    } else if !meaningful {
        warnings.push("no_recognized_commands".into());
    }
    let status = if buffer.is_empty() { "parse_error" } else if !warnings.is_empty() || unknown_count > 0 { "partial" } else { "ok" }.to_string();

    ParseResult {
        status,
        warnings: warnings.into_iter().collect::<std::collections::BTreeSet<_>>().into_iter().collect(),
        commands,
        render_model: RenderModel { width_dots, lines, actions: actions.into_iter().collect::<std::collections::BTreeSet<_>>().into_iter().collect() },
    }
}

pub fn raw_base64(buffer: &[u8]) -> String { B64.encode(buffer) }

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_simple_text_receipt() {
        let mut buf = Vec::new();
        buf.extend_from_slice(b"\x1B\x40"); // init
        buf.extend_from_slice(b"Hello OPPE\n");
        buf.extend_from_slice(b"\x1D\x56\x00"); // cut
        let res = parse_escpos(&buf, 576);
        assert!(res.render_model.lines.iter().any(|l| l.text.contains("Hello OPPE")));
        assert!(res.render_model.actions.iter().any(|a| a == "cut"));
    }
}
