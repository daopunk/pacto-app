//! Normalized virtual bucket for MLS default channels (`announcements` | `monitor` | `polls`).
//! Mirrors `docs/mls/VIRTUAL_CHANNEL_ROUTING_ADR.md` for SQLite persistence and list APIs.

use crate::stored_event::event_kind;

/// Resolve persisted bucket for timeline message kinds (14, 15, 30078). Other kinds return `None`.
pub fn normalize_virtual_bucket_for_message(kind: u16, content: &str, tags: &[Vec<String>]) -> Option<String> {
    if kind != event_kind::PRIVATE_DIRECT_MESSAGE
        && kind != event_kind::FILE_ATTACHMENT
        && kind != event_kind::APPLICATION_SPECIFIC
    {
        return None;
    }

    if let Some(v) = tags
        .iter()
        .find(|t| t.first().map(|s| s.as_str()) == Some("pacto_bucket"))
        .and_then(|t| t.get(1).map(|s| s.as_str()))
    {
        if matches!(v, "announcements" | "monitor" | "polls") {
            return Some(v.to_string());
        }
    }

    let trimmed = content.trim();
    if trimmed.starts_with('{') {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(trimmed) {
            if let Some(vb) = val.get("pacto_virtual_bucket").and_then(|x| x.as_str()) {
                if matches!(vb, "announcements" | "monitor" | "polls") {
                    return Some(vb.to_string());
                }
            }
            if val.get("schema").and_then(|x| x.as_str()) == Some("pacto.dashboard_poll.v1")
                && val.get("action").and_then(|x| x.as_str()) == Some("vote")
            {
                return Some("polls".to_string());
            }
            let ty = val.get("type").and_then(|x| x.as_str());
            if ty == Some("dashboard_poll_created") {
                return Some("polls".to_string());
            }
            if matches!(
                ty,
                Some(
                    "squad_safe_updated"
                        | "safe_proposal"
                        | "squad_member_evm_share"
                        | "governance_updated"
                )
            ) {
                return Some("monitor".to_string());
            }
        }
    }

    if tags.iter().any(|t| {
        t.first().map(|s| s.as_str()) == Some("d")
            && t.get(1).map(|s| s.as_str()) == Some(crate::dashboard_poll::DASHBOARD_POLL_D_TAG)
    }) {
        return Some("polls".to_string());
    }

    Some("announcements".to_string())
}
