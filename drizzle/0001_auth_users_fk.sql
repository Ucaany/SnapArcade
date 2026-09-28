-- Supabase Auth integration. Drizzle does not model the auth schema, so these
-- foreign keys are applied here to keep profiles and invitations bound to auth.users.
DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_auth_users_id_fk FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE public.invitations ADD CONSTRAINT invitations_invited_by_auth_users_id_fk FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
