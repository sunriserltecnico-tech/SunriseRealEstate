-- PARCHE RLS (CÓPIALO Y PÉGALO EN SUPABASE DESPUÉS DE TU OLDSCHEMA)
DROP POLICY IF EXISTS "destinations_auth_write" ON public.destinations;
CREATE POLICY "destinations_auth_insert" ON public.destinations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "destinations_auth_update" ON public.destinations FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "destinations_auth_delete" ON public.destinations FOR DELETE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "categories_auth_write" ON public.property_categories;
CREATE POLICY "categories_auth_insert" ON public.property_categories FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "categories_auth_update" ON public.property_categories FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "categories_auth_delete" ON public.property_categories FOR DELETE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "agents_auth_write" ON public.agents;
CREATE POLICY "agents_auth_insert" ON public.agents FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "agents_auth_update" ON public.agents FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "agents_auth_delete" ON public.agents FOR DELETE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "properties_auth_write" ON public.properties;
CREATE POLICY "properties_auth_insert" ON public.properties FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "properties_auth_update" ON public.properties FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "properties_auth_delete" ON public.properties FOR DELETE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "settings_auth_write" ON public.site_settings;
CREATE POLICY "settings_auth_insert" ON public.site_settings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "settings_auth_update" ON public.site_settings FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "settings_auth_delete" ON public.site_settings FOR DELETE USING (auth.uid() IS NOT NULL);