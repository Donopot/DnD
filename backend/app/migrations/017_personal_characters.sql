-- Phase 19b: Personnages hors campagne, vault personnel, soumissions
-- Permet aux joueurs et MJ de créer des personnages sans campagne
-- et aux joueurs de soumettre leurs personnages au MJ pour approbation.

begin;

-- 1. Permettre les personnages hors campagne (vault personnel)
alter table characters
  alter column campaign_id drop not null;

-- 2. Rendre owner_user_id obligatoire
--    (un personnage a toujours un propriétaire, même hors campagne)
alter table characters
  alter column owner_user_id set not null;

-- 3. Statut du personnage
alter table characters
  add column if not exists status text not null default 'active'
  check (status in ('personal', 'submitted', 'active', 'archived'));

-- 4. Campagne cible pour les soumissions
alter table characters
  add column if not exists submitted_to_campaign_id uuid
  references campaigns(id) on delete set null;

-- 5. Mettre à jour les personnages existants
update characters set status = 'active' where campaign_id is not null;
update characters set status = 'personal' where campaign_id is null;

-- 6. Index
create index if not exists characters_status_idx on characters(status);
create index if not exists characters_submitted_to_idx on characters(submitted_to_campaign_id);

commit;
