import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { useWorkspaceState } from "../contexts/WorkspaceStateContext";

export function GmSettingsPanel() {
  const { selectedCampaign, campaigns, token } = useWorkspaceState();
  const campaignId = selectedCampaign?.id;

  const campaign = campaigns.find((c) => c.id === campaignId) ?? selectedCampaign;
  const settings: Record<string, boolean> =
    (campaign as Record<string, unknown> & { gm_settings?: Record<string, boolean> })
      ?.gm_settings ?? {};

  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDraft({ ...settings });
  }, [campaignId, JSON.stringify(settings)]);

  if (!campaignId || !token) {
    return (
      <div className="gm-panel-content gm-settings-panel">
        <p>Sélectionnez une campagne.</p>
      </div>
    );
  }

  const toggle = (key: string) => {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      await apiRequest(`/api/campaigns/${campaignId}/settings`, token, {
        method: "PATCH",
        body: JSON.stringify(draft),
      });
      setMessage("Paramètres enregistrés.");
    } catch {
      setMessage("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: string; label: string; desc: string }[] = [
    {
      key: "allow_player_token_move",
      label: "Déplacement token joueur",
      desc: "Les joueurs peuvent déplacer leurs tokens sur la carte.",
    },
    {
      key: "show_player_hp",
      label: "Afficher les PV joueurs",
      desc: "Les PV des personnages sont visibles par tous les joueurs.",
    },
    {
      key: "fog_enabled",
      label: "Brouillard de guerre",
      desc: "Active le brouillard de guerre sur la carte.",
    },
    {
      key: "player_fog_reveal",
      label: "Révélation joueur",
      desc: "Les joueurs révèlent le brouillard autour de leur token.",
    },
    {
      key: "show_initiative_to_players",
      label: "Initiative visible",
      desc: "L'ordre d'initiative est visible par les joueurs.",
    },
    {
      key: "allow_player_map_pan",
      label: "Pan carte joueur",
      desc: "Les joueurs peuvent déplacer la vue de la carte.",
    },
  ];

  return (
    <div className="gm-panel-content gm-settings-panel" data-vtt-panel>
      <h3>Paramètres MJ</h3>
      <p className="gm-panel-desc">Configurez les permissions et le comportement de la campagne.</p>

      <div className="gm-settings-fields">
        {fields.map(({ key, label, desc }) => (
          <label key={key} className="gm-settings-toggle">
            <input type="checkbox" checked={draft[key] ?? false} onChange={() => toggle(key)} />
            <span>
              <strong>{label}</strong>
              <small>{desc}</small>
            </span>
          </label>
        ))}
      </div>

      <button className="gm-settings-save" onClick={save} disabled={saving} type="button">
        {saving ? "Enregistrement..." : "Enregistrer les paramètres"}
      </button>

      {message ? <p className="gm-settings-msg">{message}</p> : null}
    </div>
  );
}
