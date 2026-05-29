import { Shield } from "lucide-react";

type AppTopbarProps = {
  displayName: string;
  realtimeStatus: "offline" | "connecting" | "online";
  presenceCount: number;
};

export function AppTopbar({ displayName, realtimeStatus, presenceCount }: AppTopbarProps) {
  return (
    <header className="topbar">
      <div>
        <p className="small-label">Connecte comme {displayName}</p>
        <h1>Campagnes</h1>
      </div>

      <div className="topbar-status">
        <span className={`realtime-pill ${realtimeStatus}`}>{realtimeStatus}</span>
        <span>{presenceCount} connecte(s)</span>
        <Shield aria-hidden="true" />
      </div>
    </header>
  );
}
