import { BarChart3, Dice1, Swords, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import type { GameLogEntry, Roll } from "../api/types";

type SessionStatsProps = {
  campaignId: string;
  token: string;
};

type Stats = {
  totalRolls: number;
  avgRoll: number;
  nat20s: number;
  nat1s: number;
  highestRoll: number;
  lowestRoll: number;
  mostRolledBy: string;
  totalNotes: number;
  combatEvents: number;
  sessionCount: number;
  lastSessionAt: string | null;
};

export function SessionStats({ campaignId, token }: SessionStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) return;
    void loadStats();
  }, [campaignId]);

  async function loadStats() {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Load rolls
      const rollsRes = await fetch(`/api/campaigns/${campaignId}/rolls?limit=500`, { headers });
      const rolls: Roll[] = rollsRes.ok ? await rollsRes.json() : [];

      // Load log
      const logRes = await fetch(`/api/campaigns/${campaignId}/log?limit=500`, { headers });
      const log: GameLogEntry[] = logRes.ok ? await logRes.json() : [];

      // Sessions
      const sessionsRes = await fetch(`/api/campaigns/${campaignId}/log/sessions`, { headers });
      const sessions: Array<{ label: string; at: string }> = sessionsRes.ok
        ? await sessionsRes.json()
        : [];

      // Compute stats
      const totals = rolls.filter((r) => r.total > 0);
      const avg =
        totals.length > 0 ? Math.round(totals.reduce((s, r) => s + r.total, 0) / totals.length) : 0;
      const nat20s = totals.filter((r) => r.total === 20).length;
      const nat1s = totals.filter((r) => r.total === 1).length;
      const highest = totals.length > 0 ? Math.max(...totals.map((r) => r.total)) : 0;
      const lowest = totals.length > 0 ? Math.min(...totals.map((r) => r.total)) : 0;

      // Most rolled character
      const charRolls: Record<string, number> = {};
      for (const r of totals) {
        if (r.character_id) {
          charRolls[r.character_id] = (charRolls[r.character_id] || 0) + 1;
        }
      }
      const mostRolled = Object.entries(charRolls).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

      setStats({
        totalRolls: totals.length,
        avgRoll: avg,
        nat20s,
        nat1s,
        highestRoll: highest,
        lowestRoll: lowest,
        mostRolledBy: mostRolled,
        totalNotes: log.filter((e) => e.entry_type === "note").length,
        combatEvents: log.filter((e) => e.category === "combat").length,
        sessionCount: sessions.length,
        lastSessionAt: sessions.length > 0 ? sessions[sessions.length - 1].at : null,
      });
    } catch {
      /* ignore */
    }
    setLoading(false);
  }

  if (loading) return <p className="muted">Chargement...</p>;
  if (!stats) return <p className="muted">Aucune donnée disponible.</p>;

  return (
    <div className="session-stats">
      <div className="ss-grid">
        <div className="ss-card">
          <Dice1 size={16} />
          <div>
            <span className="ss-value">{stats.totalRolls}</span>
            <span className="ss-label">Jets totaux</span>
          </div>
        </div>
        <div className="ss-card">
          <BarChart3 size={16} />
          <div>
            <span className="ss-value">{stats.avgRoll}</span>
            <span className="ss-label">Moyenne</span>
          </div>
        </div>
        <div className="ss-card highlight">
          <span className="ss-nat">{stats.nat20s}</span>
          <span className="ss-label">Nat 20 🎉</span>
        </div>
        <div className="ss-card danger">
          <span className="ss-nat">{stats.nat1s}</span>
          <span className="ss-label">Nat 1 💀</span>
        </div>
        <div className="ss-card">
          <Swords size={16} />
          <div>
            <span className="ss-value">{stats.combatEvents}</span>
            <span className="ss-label">Événements combat</span>
          </div>
        </div>
        <div className="ss-card">
          <Timer size={16} />
          <div>
            <span className="ss-value">{stats.sessionCount}</span>
            <span className="ss-label">Sessions</span>
          </div>
        </div>
      </div>

      <div className="ss-details">
        <div className="ss-detail-row">
          <span>Plus haut jet</span>
          <span className="ss-detail-val">{stats.highestRoll}</span>
        </div>
        <div className="ss-detail-row">
          <span>Plus bas jet</span>
          <span className="ss-detail-val">{stats.lowestRoll}</span>
        </div>
        <div className="ss-detail-row">
          <span>Notes de session</span>
          <span className="ss-detail-val">{stats.totalNotes}</span>
        </div>
        {stats.lastSessionAt && (
          <div className="ss-detail-row">
            <span>Dernière session</span>
            <span className="ss-detail-val">
              {new Date(stats.lastSessionAt).toLocaleDateString("fr-FR")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
