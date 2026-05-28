//! Commons discovery broadcasts — public Kind **30078** (`pacto_commons_broadcast`).

use nostr_sdk::prelude::*;
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::collections::HashMap;
use tauri::{AppHandle, Runtime};

use crate::stored_event::event_kind;
use crate::{get_nostr_client, TRUSTED_RELAYS};

pub const COMMONS_BROADCAST_D_TAG: &str = "pacto_commons_broadcast";
pub const COMMONS_BROADCAST_SCHEMA: &str = "pacto.commons.broadcast.v1";
pub const COMMONS_CLIENT_TAG: &str = "pacto";
pub const COMMONS_MAX_LOOKBACK_SECS: u64 = 72 * 3600;
const EXPIRY_SKEW_SECS: i64 = 60;
const MAX_TAGS: usize = 3;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommonsSquadWire {
    pub id: String,
    pub name: String,
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommonsBroadcastWire {
    pub schema: String,
    pub subject: String,
    pub message: String,
    pub duration_hours: u32,
    pub expires_at: i64,
    pub tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub squad: Option<CommonsSquadWire>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audience: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommonsSquadPublishInput {
    pub id: String,
    pub name: String,
    pub kind: String,
    #[serde(default)]
    pub icon_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommonsPublishBroadcastInput {
    pub subject: String,
    pub message: String,
    pub duration_hours: u32,
    pub tags: Vec<String>,
    #[serde(default)]
    pub audience: Option<String>,
    #[serde(default)]
    pub squad: Option<CommonsSquadPublishInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommonsBroadcastDto {
    pub event_id: String,
    pub author_npub: String,
    pub subject: String,
    pub subject_id: String,
    pub message: String,
    pub duration_hours: u32,
    pub expires_at: i64,
    pub tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audience: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub squad_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub squad_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub squad_kind: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub squad_icon_url: Option<String>,
    pub created_at: i64,
}

pub fn normalize_commons_tag(raw: &str) -> Option<String> {
    let t = raw.trim().trim_start_matches('#').to_lowercase();
    if t.is_empty() || t.len() > 32 {
        return None;
    }
    if !t
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
    {
        return None;
    }
    Some(t)
}

pub fn normalize_commons_tags(raw: &[String]) -> Result<Vec<String>, String> {
    if raw.is_empty() {
        return Err("At least one tag is required".into());
    }
    if raw.len() > MAX_TAGS {
        return Err(format!("At most {MAX_TAGS} tags allowed"));
    }
    let mut out = Vec::new();
    for item in raw {
        let t = normalize_commons_tag(item).ok_or_else(|| format!("Invalid tag: {item}"))?;
        if !out.contains(&t) {
            out.push(t);
        }
    }
    if out.is_empty() {
        return Err("At least one tag is required".into());
    }
    Ok(out)
}

fn valid_duration_hours(h: u32) -> bool {
    matches!(h, 24 | 48 | 72)
}

fn valid_audience(a: &str) -> bool {
    a == "new_user" || a == "active_user"
}

fn unix_now_secs() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

pub fn has_commons_broadcast_d_tag(tags: &Tags) -> bool {
    tags.find(TagKind::d())
        .and_then(|t| t.content())
        .map(|c| c == COMMONS_BROADCAST_D_TAG)
        .unwrap_or(false)
}

pub fn has_commons_client_tag(tags: &Tags) -> bool {
    tags.find(TagKind::Custom(Cow::Borrowed("client")))
        .and_then(|t| t.content())
        .map(|c| c == COMMONS_CLIENT_TAG)
        .unwrap_or(false)
}

fn tag_content<'a>(tags: &'a Tags, kind: TagKind<'a>) -> Option<&'a str> {
    tags.find(kind).and_then(|t| t.content())
}

pub fn try_parse_broadcast_event(event: &Event) -> Option<(CommonsBroadcastWire, String)> {
    if event.kind.as_u16() != event_kind::APPLICATION_SPECIFIC {
        return None;
    }
    if !has_commons_broadcast_d_tag(&event.tags) || !has_commons_client_tag(&event.tags) {
        return None;
    }
    let wire: CommonsBroadcastWire = serde_json::from_str(event.content.trim()).ok()?;
    if wire.schema != COMMONS_BROADCAST_SCHEMA {
        return None;
    }
    if wire.subject != "user" && wire.subject != "squad" {
        return None;
    }
    if wire.message.trim().is_empty() || !valid_duration_hours(wire.duration_hours) {
        return None;
    }
    let tags = normalize_commons_tags(&wire.tags).ok()?;
    if wire.expires_at <= unix_now_secs() {
        return None;
    }
    let created = event.created_at.as_u64() as i64;
    let expected = created + (wire.duration_hours as i64 * 3600);
    if (wire.expires_at - expected).abs() > EXPIRY_SKEW_SECS {
        return None;
    }
    if let Some(ref aud) = wire.audience {
        if !valid_audience(aud) {
            return None;
        }
    }
    if wire.subject == "squad" {
        let squad = wire.squad.as_ref()?;
        if squad.id.trim().is_empty() || squad.name.trim().is_empty() {
            return None;
        }
        if squad.kind != "squad" && squad.kind != "squad-pair" {
            return None;
        }
        if tag_content(&event.tags, TagKind::Custom(Cow::Borrowed("squad"))) != Some(squad.id.as_str())
        {
            return None;
        }
    } else if wire.squad.is_some() {
        return None;
    }
    let tag_subject = tag_content(&event.tags, TagKind::Custom(Cow::Borrowed("subject")))?;
    if tag_subject != wire.subject {
        return None;
    }
    let exp_tag = tag_content(&event.tags, TagKind::Custom(Cow::Borrowed("exp")))?;
    if exp_tag.parse::<i64>().ok()? != wire.expires_at {
        return None;
    }
    for t in &tags {
        if !event.tags.iter().any(|tag| {
            tag.kind() == TagKind::SingleLetter(SingleLetterTag::lowercase(Alphabet::T))
                && tag.content() == Some(t.as_str())
        }) {
            return None;
        }
    }
    let mut normalized = wire;
    normalized.tags = tags;
    let author_npub = event.pubkey.to_bech32().ok()?;
    Some((normalized, author_npub))
}

fn subject_id_for(wire: &CommonsBroadcastWire, author_npub: &str) -> String {
    if wire.subject == "squad" {
        wire.squad
            .as_ref()
            .map(|s| s.id.clone())
            .unwrap_or_default()
    } else {
        author_npub.to_string()
    }
}

pub fn ensure_commons_broadcasts_table(conn: &rusqlite::Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"CREATE TABLE IF NOT EXISTS commons_broadcasts (
            event_id TEXT PRIMARY KEY NOT NULL,
            author_pubkey TEXT NOT NULL,
            author_npub TEXT NOT NULL,
            subject TEXT NOT NULL,
            subject_id TEXT NOT NULL,
            message TEXT NOT NULL,
            duration_hours INTEGER NOT NULL,
            expires_at INTEGER NOT NULL,
            tags_json TEXT NOT NULL,
            audience TEXT,
            squad_id TEXT,
            squad_name TEXT,
            squad_kind TEXT,
            squad_icon_url TEXT,
            created_at INTEGER NOT NULL,
            content_json TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_commons_broadcasts_expires ON commons_broadcasts(expires_at);
        CREATE INDEX IF NOT EXISTS idx_commons_broadcasts_subject ON commons_broadcasts(subject_id, created_at);"#,
    )
    .map_err(|e| format!("Failed to create commons_broadcasts table: {e}"))
}

fn prune_expired_broadcasts(conn: &rusqlite::Connection) -> Result<(), String> {
    let now = unix_now_secs();
    conn.execute(
        "DELETE FROM commons_broadcasts WHERE expires_at <= ?1",
        params![now],
    )
    .map_err(|e| format!("Failed to prune commons broadcasts: {e}"))?;
    Ok(())
}

fn upsert_broadcast_row(
    conn: &rusqlite::Connection,
    event: &Event,
    wire: &CommonsBroadcastWire,
    author_npub: &str,
) -> Result<(), String> {
    let tags_json = serde_json::to_string(&wire.tags).map_err(|e| e.to_string())?;
    let content_json = serde_json::to_string(wire).map_err(|e| e.to_string())?;
    let subject_id = subject_id_for(wire, author_npub);
    let (squad_id, squad_name, squad_kind, squad_icon_url) = if let Some(ref s) = wire.squad {
        (
            Some(s.id.clone()),
            Some(s.name.clone()),
            Some(s.kind.clone()),
            s.icon_url.clone(),
        )
    } else {
        (None, None, None, None)
    };
    conn.execute(
        r#"INSERT INTO commons_broadcasts (
            event_id, author_pubkey, author_npub, subject, subject_id, message,
            duration_hours, expires_at, tags_json, audience, squad_id, squad_name,
            squad_kind, squad_icon_url, created_at, content_json
        ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)
        ON CONFLICT(event_id) DO UPDATE SET
            expires_at=excluded.expires_at,
            message=excluded.message,
            tags_json=excluded.tags_json,
            content_json=excluded.content_json"#,
        params![
            event.id.to_hex(),
            event.pubkey.to_hex(),
            author_npub,
            wire.subject,
            subject_id,
            wire.message,
            wire.duration_hours as i64,
            wire.expires_at,
            tags_json,
            wire.audience,
            squad_id,
            squad_name,
            squad_kind,
            squad_icon_url,
            event.created_at.as_u64() as i64,
            content_json,
        ],
    )
    .map_err(|e| format!("Failed to upsert commons broadcast: {e}"))?;
    Ok(())
}

fn row_to_dto(row: &rusqlite::Row<'_>) -> rusqlite::Result<CommonsBroadcastDto> {
    let tags_json: String = row.get(8)?;
    let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
    Ok(CommonsBroadcastDto {
        event_id: row.get(0)?,
        author_npub: row.get(2)?,
        subject: row.get(3)?,
        subject_id: row.get(4)?,
        message: row.get(5)?,
        duration_hours: row.get::<_, i64>(6)? as u32,
        expires_at: row.get(7)?,
        tags,
        audience: row.get(9)?,
        squad_id: row.get(10)?,
        squad_name: row.get(11)?,
        squad_kind: row.get(12)?,
        squad_icon_url: row.get(13)?,
        created_at: row.get(14)?,
    })
}

fn list_active_broadcasts(
    conn: &rusqlite::Connection,
    limit: u32,
) -> Result<Vec<CommonsBroadcastDto>, String> {
    let now = unix_now_secs();
    let mut stmt = conn
        .prepare(
            r#"SELECT event_id, author_pubkey, author_npub, subject, subject_id, message,
                      duration_hours, expires_at, tags_json, audience, squad_id, squad_name,
                      squad_kind, squad_icon_url, created_at
               FROM commons_broadcasts
               WHERE expires_at > ?1
               ORDER BY created_at DESC
               LIMIT ?2"#,
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![now, limit as i64], row_to_dto)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>();

    let mut best: HashMap<(String, String), CommonsBroadcastDto> = HashMap::new();
    for dto in rows {
        let key = (dto.author_npub.clone(), dto.subject_id.clone());
        best.entry(key)
            .and_modify(|cur| {
                if dto.created_at > cur.created_at {
                    *cur = dto.clone();
                }
            })
            .or_insert(dto);
    }
    let mut out: Vec<_> = best.into_values().collect();
    out.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    out.truncate(limit as usize);
    Ok(out)
}

async fn sync_broadcasts_from_relays(limit: u32) -> Result<u32, String> {
    let client = get_nostr_client().map_err(|_| "Nostr client not initialized".to_string())?;
    let since = unix_now_secs().saturating_sub(COMMONS_MAX_LOOKBACK_SECS as i64);
    let filter = Filter::new()
        .kind(Kind::ApplicationSpecificData)
        .custom_tag(
            SingleLetterTag::lowercase(Alphabet::D),
            COMMONS_BROADCAST_D_TAG,
        )
        .since(Timestamp::from(since as u64))
        .limit(limit as usize);

    let mut events = client
        .stream_events_from(
            TRUSTED_RELAYS.to_vec(),
            filter,
            std::time::Duration::from_secs(12),
        )
        .await
        .map_err(|e| e.to_string())?;

    let handle = crate::TAURI_APP
        .get()
        .ok_or_else(|| "App handle not initialized".to_string())?;
    let conn = crate::account_manager::get_db_connection(handle)?;
    ensure_commons_broadcasts_table(&conn)?;
    prune_expired_broadcasts(&conn)?;

    let mut ingested = 0u32;
    while let Some(event) = events.next().await {
        if let Some((wire, author_npub)) = try_parse_broadcast_event(&event) {
            if upsert_broadcast_row(&conn, &event, &wire, &author_npub).is_ok() {
                ingested += 1;
            }
        }
    }
    crate::account_manager::return_db_connection(conn);
    Ok(ingested)
}

#[tauri::command]
pub async fn commons_publish_broadcast<R: Runtime>(
    handle: AppHandle<R>,
    input: CommonsPublishBroadcastInput,
) -> Result<CommonsBroadcastDto, String> {
    let subject = input.subject.trim();
    if subject != "user" && subject != "squad" {
        return Err("subject must be user or squad".into());
    }
    let message = input.message.trim();
    if message.is_empty() {
        return Err("message is required".into());
    }
    if !valid_duration_hours(input.duration_hours) {
        return Err("durationHours must be 24, 48, or 72".into());
    }
    let tags = normalize_commons_tags(&input.tags)?;
    if let Some(ref aud) = input.audience {
        if !valid_audience(aud) {
            return Err("Invalid audience".into());
        }
    }

    let squad_wire = if subject == "squad" {
        let s = input
            .squad
            .ok_or_else(|| "squad metadata required for squad broadcasts".to_string())?;
        if s.id.trim().is_empty() || s.name.trim().is_empty() {
            return Err("squad id and name are required".into());
        }
        if s.kind != "squad" && s.kind != "squad-pair" {
            return Err("squad kind must be squad or squad-pair".into());
        }
        Some(CommonsSquadWire {
            id: s.id.trim().to_string(),
            name: s.name.trim().to_string(),
            kind: s.kind,
            icon_url: s.icon_url.filter(|u| !u.trim().is_empty()),
        })
    } else {
        if input.squad.is_some() {
            return Err("squad metadata not allowed for user broadcasts".into());
        }
        None
    };

    let now = unix_now_secs();
    let expires_at = now + (input.duration_hours as i64 * 3600);
    let wire = CommonsBroadcastWire {
        schema: COMMONS_BROADCAST_SCHEMA.into(),
        subject: subject.into(),
        message: message.into(),
        duration_hours: input.duration_hours,
        expires_at,
        tags: tags.clone(),
        squad: squad_wire.clone(),
        audience: input.audience.clone(),
    };
    let content = serde_json::to_string(&wire).map_err(|e| e.to_string())?;

    let client = get_nostr_client().map_err(|_| "Nostr client not initialized".to_string())?;
    let signer = client.signer().await.map_err(|e| e.to_string())?;
    let pk = signer.get_public_key().await.map_err(|e| e.to_string())?;
    let author_npub = pk.to_bech32().map_err(|e| e.to_string())?;

    let mut builder = EventBuilder::new(Kind::ApplicationSpecificData, &content)
        .tag(Tag::custom(TagKind::d(), [COMMONS_BROADCAST_D_TAG]))
        .tag(Tag::custom(
            TagKind::Custom(Cow::Borrowed("client")),
            [COMMONS_CLIENT_TAG],
        ))
        .tag(Tag::custom(
            TagKind::Custom(Cow::Borrowed("subject")),
            [subject],
        ))
        .tag(Tag::custom(
            TagKind::Custom(Cow::Borrowed("exp")),
            [expires_at.to_string()],
        ));
    for t in &tags {
        builder = builder.tag(Tag::custom(
            TagKind::SingleLetter(SingleLetterTag::lowercase(Alphabet::T)),
            [t.as_str()],
        ));
    }
    if let Some(ref squad) = squad_wire {
        builder = builder.tag(Tag::custom(
            TagKind::Custom(Cow::Borrowed("squad")),
            [squad.id.as_str()],
        ));
    }

    let event = client
        .sign_event_builder(builder)
        .await
        .map_err(|e| e.to_string())?;
    client
        .send_event_to(TRUSTED_RELAYS.iter().copied(), &event)
        .await
        .map_err(|e| e.to_string())?;

    let conn = crate::account_manager::get_db_connection(&handle)?;
    ensure_commons_broadcasts_table(&conn)?;
    upsert_broadcast_row(&conn, &event, &wire, &author_npub)?;
    prune_expired_broadcasts(&conn)?;
    crate::account_manager::return_db_connection(conn);

    Ok(CommonsBroadcastDto {
        event_id: event.id.to_hex(),
        author_npub: author_npub.clone(),
        subject: subject.to_string(),
        subject_id: subject_id_for(&wire, &author_npub),
        message: wire.message,
        duration_hours: wire.duration_hours,
        expires_at: wire.expires_at,
        tags,
        audience: wire.audience,
        squad_id: squad_wire.as_ref().map(|s| s.id.clone()),
        squad_name: squad_wire.as_ref().map(|s| s.name.clone()),
        squad_kind: squad_wire.as_ref().map(|s| s.kind.clone()),
        squad_icon_url: squad_wire.as_ref().and_then(|s| s.icon_url.clone()),
        created_at: event.created_at.as_u64() as i64,
    })
}

#[tauri::command]
pub async fn commons_fetch_broadcasts(limit: Option<u32>) -> Result<Vec<CommonsBroadcastDto>, String> {
    let limit = limit.unwrap_or(100).clamp(1, 500);
    let _ = sync_broadcasts_from_relays(limit).await?;
    let handle = crate::TAURI_APP
        .get()
        .ok_or_else(|| "App handle not initialized".to_string())?;
    let conn = crate::account_manager::get_db_connection(handle)?;
    ensure_commons_broadcasts_table(&conn)?;
    prune_expired_broadcasts(&conn)?;
    let rows = list_active_broadcasts(&conn, limit)?;
    crate::account_manager::return_db_connection(conn);
    Ok(rows)
}

#[tauri::command]
pub async fn commons_get_local_active(
    subject: String,
    subject_id: String,
) -> Result<Option<CommonsBroadcastDto>, String> {
    let subject = subject.trim();
    if subject != "user" && subject != "squad" {
        return Err("subject must be user or squad".into());
    }
    let subject_id = subject_id.trim();
    if subject_id.is_empty() {
        return Err("subjectId is required".into());
    }

    let client = get_nostr_client().map_err(|_| "Nostr client not initialized".to_string())?;
    let signer = client.signer().await.map_err(|e| e.to_string())?;
    let pk = signer.get_public_key().await.map_err(|e| e.to_string())?;
    let my_npub = pk.to_bech32().map_err(|e| e.to_string())?;

    if subject == "user" && subject_id != my_npub {
        return Err("subjectId must match current user for user broadcasts".into());
    }

    let handle = crate::TAURI_APP
        .get()
        .ok_or_else(|| "App handle not initialized".to_string())?;
    let conn = crate::account_manager::get_db_connection(handle)?;
    ensure_commons_broadcasts_table(&conn)?;
    prune_expired_broadcasts(&conn)?;
    let now = unix_now_secs();
    let mut stmt = conn
        .prepare(
            r#"SELECT event_id, author_pubkey, author_npub, subject, subject_id, message,
                      duration_hours, expires_at, tags_json, audience, squad_id, squad_name,
                      squad_kind, squad_icon_url, created_at
               FROM commons_broadcasts
               WHERE author_npub = ?1 AND subject = ?2 AND subject_id = ?3 AND expires_at > ?4
               ORDER BY created_at DESC
               LIMIT 1"#,
        )
        .map_err(|e| e.to_string())?;
    let dto = stmt
        .query_row(params![my_npub, subject, subject_id, now], row_to_dto)
        .optional()
        .map_err(|e| e.to_string())?;
    drop(stmt);
    crate::account_manager::return_db_connection(conn);
    Ok(dto)
}

#[cfg(test)]
mod tests {
    use super::*;
    use nostr_sdk::EventBuilder;

    #[test]
    fn normalize_tag_strips_hash_and_lowercases() {
        assert_eq!(normalize_commons_tag("#Neo").as_deref(), Some("neo"));
        assert_eq!(normalize_commons_tag("DAO").as_deref(), Some("dao"));
        assert!(normalize_commons_tag("bad-hyphen").is_none());
    }

    #[test]
    fn rejects_empty_tag_list() {
        assert!(normalize_commons_tags(&[]).is_err());
    }

    #[test]
    fn rejects_malformed_schema() {
        let pk = Keys::generate().public_key();
        let content = r#"{"schema":"other","subject":"user","message":"hi","durationHours":24,"expiresAt":9999999999,"tags":["neo"]}"#;
        let event = EventBuilder::new(Kind::ApplicationSpecificData, content)
            .tag(Tag::custom(TagKind::d(), [COMMONS_BROADCAST_D_TAG]))
            .tag(Tag::custom(
                TagKind::Custom(Cow::Borrowed("client")),
                [COMMONS_CLIENT_TAG],
            ))
            .tag(Tag::custom(TagKind::Custom(Cow::Borrowed("subject")), ["user"]))
            .tag(Tag::custom(
                TagKind::Custom(Cow::Borrowed("exp")),
                ["9999999999"],
            ))
            .tag(Tag::custom(
                TagKind::SingleLetter(SingleLetterTag::lowercase(Alphabet::T)),
                ["neo"],
            ))
            .sign_with_keys(&Keys::generate())
            .unwrap();
        assert!(try_parse_broadcast_event(&event).is_none());
        let _ = pk;
    }

    #[test]
    fn parse_valid_user_broadcast() {
        let keys = Keys::generate();
        let created = unix_now_secs();
        let expires = created + 86400;
        let content = format!(
            r#"{{"schema":"{COMMONS_BROADCAST_SCHEMA}","subject":"user","message":"hello","durationHours":24,"expiresAt":{expires},"tags":["neo"]}}"#
        );
        let event = EventBuilder::new(Kind::ApplicationSpecificData, &content)
            .tag(Tag::custom(TagKind::d(), [COMMONS_BROADCAST_D_TAG]))
            .tag(Tag::custom(
                TagKind::Custom(Cow::Borrowed("client")),
                [COMMONS_CLIENT_TAG],
            ))
            .tag(Tag::custom(TagKind::Custom(Cow::Borrowed("subject")), ["user"]))
            .tag(Tag::custom(
                TagKind::Custom(Cow::Borrowed("exp")),
                [expires.to_string()],
            ))
            .tag(Tag::custom(
                TagKind::SingleLetter(SingleLetterTag::lowercase(Alphabet::T)),
                ["neo"],
            ))
            .sign_with_keys(&keys)
            .unwrap();
        let (wire, npub) = try_parse_broadcast_event(&event).expect("parse");
        assert_eq!(wire.subject, "user");
        assert_eq!(wire.message, "hello");
        assert!(npub.starts_with("npub1"));
    }
}
