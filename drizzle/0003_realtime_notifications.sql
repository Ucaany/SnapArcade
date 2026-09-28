-- Notifications: the event_key uniqueness index is declared in the Drizzle schema.
-- This migration only registers the realtime publication for kiosk status and notifications.
DO $$ BEGIN
  IF to_regclass('public.kiosks') IS NULL THEN RETURN; END IF;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.kiosks;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF to_regclass('public.notifications') IS NULL THEN RETURN; END IF;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
