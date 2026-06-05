import { Bell, Mail, Megaphone } from "lucide-react";
import { useEffect, useState } from "react";

import { apiRequest } from "../api/client";
import type { GmMessage } from "../api/types";

type PlayerNotificationsProps = {
  campaignId: string;
  token: string;
  userId: string;
};

export function PlayerNotifications({ campaignId, token, userId }: PlayerNotificationsProps) {
  const [inbox, setInbox] = useState<GmMessage[]>([]);
  const [announcements, setAnnouncements] = useState<GmMessage[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const unreadCount =
    inbox.filter((m) => !m.read_at).length + announcements.filter((m) => !m.read_at).length;

  async function loadAll() {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        apiRequest<GmMessage[]>(`/api/campaigns/${campaignId}/inbox`, token),
        apiRequest<GmMessage[]>(`/api/campaigns/${campaignId}/announcements`, token),
      ]);
      setInbox(results[0].status === "fulfilled" ? results[0].value : []);
      setAnnouncements(results[1].status === "fulfilled" ? results[1].value : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    const interval = setInterval(() => void loadAll(), 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [campaignId, token]);

  async function markRead(msg: GmMessage) {
    if (msg.read_at) return;
    try {
      await apiRequest(`/api/messages/${msg.id}/read`, token, { method: "POST" });
      setInbox((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, read_at: new Date().toISOString() } : m)),
      );
    } catch {
      // silent
    }
  }

  return (
    <div className="player-notifications" aria-live="polite" aria-label="Notifications du MJ">
      <button
        className={`notification-bell ${unreadCount > 0 ? "has-unread" : ""}`}
        onClick={() => {
          setOpen(!open);
          if (!open) void loadAll();
        }}
        type="button"
        aria-label={`Notifications — ${unreadCount} non lu(s)`}
        aria-expanded={open}
      >
        <Bell size={18} />
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-dropdown">
          <h4>
            <Mail size={14} /> Messages du MJ
          </h4>
          {loading ? (
            <p className="muted">Chargement...</p>
          ) : inbox.length === 0 ? (
            <p className="muted">Aucun message privé.</p>
          ) : (
            <ul className="msg-list">
              {inbox.slice(0, 10).map((m) => (
                <li
                  key={m.id}
                  className={`msg-item ${m.kind} ${!m.read_at ? "unread" : ""}`}
                  onClick={() => markRead(m)}
                >
                  <span className="msg-content">
                    {m.kind === "secret_roll" ? "🎲 " : ""}
                    {m.content}
                  </span>
                  <span className="msg-time">
                    {new Date(m.created_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <h4>
            <Megaphone size={14} /> Annonces
          </h4>
          {announcements.length === 0 ? (
            <p className="muted">Aucune annonce.</p>
          ) : (
            <ul className="msg-list">
              {announcements.slice(0, 5).map((m) => (
                <li
                  key={m.id}
                  className={`msg-item announcement ${!m.read_at ? "unread" : ""}`}
                  onClick={() => markRead(m)}
                >
                  <span className="msg-content">{m.content}</span>
                  <span className="msg-time">
                    {new Date(m.created_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
