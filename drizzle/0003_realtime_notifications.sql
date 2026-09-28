ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS event_key varchar(255);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS notifications_event_key_user_unique ON public.notifications (user_id, event_key);
--> statement-breakpoint
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.kiosks;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
