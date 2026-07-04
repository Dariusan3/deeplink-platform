-- ============================================================
-- Account deletion — unblock right-to-erasure (GDPR Art. 17)
-- ============================================================
-- Two foreign keys reference public.users(id) WITHOUT an ON DELETE rule, so
-- they default to NO ACTION and BLOCK deleting a user when a referencing row
-- lives outside the cascade path:
--
--   collections.created_by   → a collection created in a team the user does
--                              not own (e.g. an editor in someone else's team)
--   subscriptions.granted_by → a plan an admin granted to another team
--
-- In those cases /api/account/delete fails with an FK violation and the user
-- can't erase their account. These are audit/attribution columns, not personal
-- data, so ON DELETE SET NULL is the correct behaviour: the record survives,
-- it just loses the "who created / granted this" pointer.
--
-- See docs/compliance-fixes.md → "Account deletion & the partner system".

-- collections.created_by — column is NOT NULL, so drop that first.
ALTER TABLE public.collections ALTER COLUMN created_by DROP NOT NULL;

DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'public.collections'::regclass
    AND contype = 'f'
    AND conkey = ARRAY[
      (SELECT attnum FROM pg_attribute
       WHERE attrelid = 'public.collections'::regclass AND attname = 'created_by')
    ];
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.collections DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

ALTER TABLE public.collections
  ADD CONSTRAINT collections_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- subscriptions.granted_by — already nullable.
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'public.subscriptions'::regclass
    AND contype = 'f'
    AND conkey = ARRAY[
      (SELECT attnum FROM pg_attribute
       WHERE attrelid = 'public.subscriptions'::regclass AND attname = 'granted_by')
    ];
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.subscriptions DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_granted_by_fkey
  FOREIGN KEY (granted_by) REFERENCES public.users(id) ON DELETE SET NULL;
