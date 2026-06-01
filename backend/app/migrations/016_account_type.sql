-- 016_account_type: distinguish GM vs Player accounts
alter table users add column if not exists account_type text not null default 'gm' check (account_type in ('gm', 'player'));

create index if not exists users_account_type_idx on users(account_type);
