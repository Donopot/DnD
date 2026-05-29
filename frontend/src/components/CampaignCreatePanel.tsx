import type { FormEvent } from "react";
import { Plus } from "lucide-react";

type CampaignCreatePanelProps = {
  isBusy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function CampaignCreatePanel({ isBusy, onSubmit }: CampaignCreatePanelProps) {
  return (
    <section className="panel">
      <h2>Nouvelle campagne</h2>

      <form onSubmit={onSubmit} className="form-stack">
        <label>
          Nom
          <input name="name" minLength={2} maxLength={120} required />
        </label>

        <label>
          Description
          <textarea name="description" maxLength={2000} rows={4} />
        </label>

        <button className="primary-button" disabled={isBusy} type="submit">
          <Plus aria-hidden="true" />
          Creer
        </button>
      </form>
    </section>
  );
}
