update campaign_invites
set use_count = greatest(0, least(use_count, max_uses))
where max_uses is not null and (use_count < 0 or use_count > max_uses);

update characters
set hp_current = hp_max
where hp_current > hp_max;

alter table campaign_invites
    add constraint campaign_invites_max_uses_positive
    check (max_uses is null or max_uses >= 1);

alter table campaign_invites
    add constraint campaign_invites_use_count_valid
    check (use_count >= 0 and (max_uses is null or use_count <= max_uses));

alter table characters
    add constraint characters_hp_current_lte_max
    check (hp_current <= hp_max);
