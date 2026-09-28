CREATE OR REPLACE FUNCTION public.current_profile_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid()
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.current_profile_role() FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.current_profile_role() TO authenticated;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.current_owner_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE WHEN p.role = 'owner' THEN o.id ELSE staff_owner.id END
  FROM public.profiles p
  LEFT JOIN public.owners o ON o.user_id = p.id
  LEFT JOIN public.owners staff_owner ON staff_owner.user_id = p.owner_id
  WHERE p.id = auth.uid()
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.current_owner_id() FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.current_owner_id() TO authenticated;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.can_access_kiosk(target_kiosk uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.current_profile_role() = 'superadmin'
    OR EXISTS (SELECT 1 FROM public.kiosks k WHERE k.id = target_kiosk AND k.owner_id = public.current_owner_id())
    OR EXISTS (SELECT 1 FROM public.staff_assignments a WHERE a.kiosk_id = target_kiosk AND a.staff_id = auth.uid())
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.can_access_kiosk(uuid) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.can_access_kiosk(uuid) TO authenticated;
--> statement-breakpoint
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','invitations','owners','subscription_plans','subscriptions','invoices','kiosks','staff_assignments','payment_credentials','vouchers','sessions','session_photos','voucher_redemptions','transactions','kiosk_packages','notifications','activity_logs'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END $$;
--> statement-breakpoint
DROP POLICY IF EXISTS profiles_read ON public.profiles;
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.current_profile_role() = 'superadmin' OR (public.current_profile_role() = 'owner' AND (id = (SELECT user_id FROM public.owners WHERE id = public.current_owner_id()) OR owner_id = (SELECT user_id FROM public.owners WHERE id = public.current_owner_id()))));
--> statement-breakpoint
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND role::text = public.current_profile_role() AND owner_id IS NOT DISTINCT FROM (SELECT p.owner_id FROM public.profiles p WHERE p.id = auth.uid()) AND status::text IS NOT DISTINCT FROM (SELECT p.status::text FROM public.profiles p WHERE p.id = auth.uid()) AND email IS NOT DISTINCT FROM (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid()));
--> statement-breakpoint
DROP POLICY IF EXISTS invitations_admin ON public.invitations;
CREATE POLICY invitations_admin ON public.invitations FOR ALL TO authenticated USING (public.current_profile_role() = 'superadmin') WITH CHECK (public.current_profile_role() = 'superadmin');
--> statement-breakpoint
DROP POLICY IF EXISTS owners_access ON public.owners;
CREATE POLICY owners_access ON public.owners FOR ALL TO authenticated USING (id = public.current_owner_id() OR public.current_profile_role() = 'superadmin') WITH CHECK (id = public.current_owner_id() OR public.current_profile_role() = 'superadmin');
--> statement-breakpoint
DROP POLICY IF EXISTS plans_read ON public.subscription_plans;
CREATE POLICY plans_read ON public.subscription_plans FOR SELECT TO authenticated USING (is_active OR public.current_profile_role() = 'superadmin');
--> statement-breakpoint
DROP POLICY IF EXISTS plans_admin ON public.subscription_plans;
CREATE POLICY plans_admin ON public.subscription_plans FOR ALL TO authenticated USING (public.current_profile_role() = 'superadmin') WITH CHECK (public.current_profile_role() = 'superadmin');
--> statement-breakpoint
DROP POLICY IF EXISTS subscriptions_access ON public.subscriptions;
CREATE POLICY subscriptions_access ON public.subscriptions FOR ALL TO authenticated USING (owner_id = public.current_owner_id() OR public.current_profile_role() = 'superadmin') WITH CHECK (owner_id = public.current_owner_id() OR public.current_profile_role() = 'superadmin');
--> statement-breakpoint
DROP POLICY IF EXISTS invoices_access ON public.invoices;
CREATE POLICY invoices_access ON public.invoices FOR ALL TO authenticated USING (owner_id = public.current_owner_id() OR public.current_profile_role() = 'superadmin') WITH CHECK (owner_id = public.current_owner_id() OR public.current_profile_role() = 'superadmin');
--> statement-breakpoint
DROP POLICY IF EXISTS kiosks_access ON public.kiosks;
CREATE POLICY kiosks_access ON public.kiosks FOR ALL TO authenticated USING (owner_id = public.current_owner_id() OR public.current_profile_role() = 'superadmin' OR public.can_access_kiosk(id)) WITH CHECK (owner_id = public.current_owner_id() OR public.current_profile_role() = 'superadmin');
--> statement-breakpoint
DROP POLICY IF EXISTS staff_assignments_access ON public.staff_assignments;
CREATE POLICY staff_assignments_access ON public.staff_assignments FOR ALL TO authenticated USING (public.current_profile_role() = 'superadmin' OR EXISTS (SELECT 1 FROM public.kiosks k WHERE k.id = kiosk_id AND k.owner_id = public.current_owner_id()) OR staff_id = auth.uid()) WITH CHECK (public.current_profile_role() = 'superadmin' OR EXISTS (SELECT 1 FROM public.kiosks k WHERE k.id = kiosk_id AND k.owner_id = public.current_owner_id()));
--> statement-breakpoint
ALTER TABLE public.payment_credentials ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON public.payment_credentials FROM anon, authenticated;
--> statement-breakpoint
DROP POLICY IF EXISTS vouchers_access ON public.vouchers;
CREATE POLICY vouchers_access ON public.vouchers FOR ALL TO authenticated USING (owner_id = public.current_owner_id() OR public.current_profile_role() = 'superadmin') WITH CHECK (owner_id = public.current_owner_id() OR public.current_profile_role() = 'superadmin');
--> statement-breakpoint
DROP POLICY IF EXISTS sessions_access ON public.sessions;
CREATE POLICY sessions_access ON public.sessions FOR ALL TO authenticated USING (owner_id = public.current_owner_id() OR public.current_profile_role() = 'superadmin' OR public.can_access_kiosk(kiosk_id)) WITH CHECK (owner_id = public.current_owner_id() OR public.current_profile_role() = 'superadmin' OR public.can_access_kiosk(kiosk_id));
--> statement-breakpoint
DROP POLICY IF EXISTS session_photos_access ON public.session_photos;
CREATE POLICY session_photos_access ON public.session_photos FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND (s.owner_id = public.current_owner_id() OR public.current_profile_role() = 'superadmin' OR public.can_access_kiosk(s.kiosk_id)))) WITH CHECK (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND (s.owner_id = public.current_owner_id() OR public.current_profile_role() = 'superadmin' OR public.can_access_kiosk(s.kiosk_id))));
--> statement-breakpoint
DROP POLICY IF EXISTS voucher_redemptions_access ON public.voucher_redemptions;
CREATE POLICY voucher_redemptions_access ON public.voucher_redemptions FOR ALL TO authenticated USING (owner_id = public.current_owner_id() OR public.current_profile_role() = 'superadmin' OR EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND public.can_access_kiosk(s.kiosk_id))) WITH CHECK (owner_id = public.current_owner_id() OR public.current_profile_role() = 'superadmin' OR EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND public.can_access_kiosk(s.kiosk_id)));
--> statement-breakpoint
DROP POLICY IF EXISTS transactions_access ON public.transactions;
CREATE POLICY transactions_access ON public.transactions FOR ALL TO authenticated USING (owner_id = public.current_owner_id() OR public.current_profile_role() = 'superadmin' OR public.can_access_kiosk(kiosk_id)) WITH CHECK (owner_id = public.current_owner_id() OR public.current_profile_role() = 'superadmin');
--> statement-breakpoint
DROP POLICY IF EXISTS kiosk_packages_access ON public.kiosk_packages;
CREATE POLICY kiosk_packages_access ON public.kiosk_packages FOR ALL TO authenticated USING (owner_id = public.current_owner_id() OR public.current_profile_role() = 'superadmin') WITH CHECK (owner_id = public.current_owner_id() OR public.current_profile_role() = 'superadmin');
--> statement-breakpoint
DROP POLICY IF EXISTS notifications_access ON public.notifications;
CREATE POLICY notifications_access ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid() OR public.current_profile_role() = 'superadmin') WITH CHECK (user_id = auth.uid() OR public.current_profile_role() = 'superadmin');
--> statement-breakpoint
DROP POLICY IF EXISTS activity_logs_read ON public.activity_logs;
CREATE POLICY activity_logs_read ON public.activity_logs FOR SELECT TO authenticated USING (public.current_profile_role() = 'superadmin' OR owner_id = public.current_owner_id() OR user_id = auth.uid() OR (kiosk_id IS NOT NULL AND public.can_access_kiosk(kiosk_id)));
--> statement-breakpoint
