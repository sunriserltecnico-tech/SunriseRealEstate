-- =============================================================================
-- SUNRISE BACALAR REAL ESTATE — SUPABASE DATABASE SCHEMA
-- Fase 1: DDL completo con RLS (Row Level Security)
-- Versión: 1.0.0
-- =============================================================================

-- -----------------------------------------------------------------------------
-- EXTENSIONES
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para búsqueda de texto completo

-- =============================================================================
-- TABLA: destinations
-- Destinos geográficos (Bacalar, Tulum, Playa del Carmen, etc.)
-- =============================================================================
CREATE TABLE public.destinations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,                             -- "Bacalar"
    slug        TEXT NOT NULL UNIQUE,                      -- "bacalar"
    country     TEXT NOT NULL DEFAULT 'Mexico',            -- "Mexico"
    region      TEXT,                                      -- "Quintana Roo"
    description TEXT,
    hero_image_url TEXT,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    display_order INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_destinations_slug ON public.destinations(slug);
CREATE INDEX idx_destinations_featured ON public.destinations(is_featured);

-- =============================================================================
-- TABLA: property_categories
-- Categorías editoriales de propiedades
-- =============================================================================
CREATE TABLE public.property_categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,                             -- "Waterfront Estate"
    slug        TEXT NOT NULL UNIQUE,                      -- "waterfront-estate"
    description TEXT,
    icon        TEXT,                                      -- Material Symbol name
    color_hex   TEXT,                                      -- Color de etiqueta
    display_order INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_property_categories_slug ON public.property_categories(slug);

-- =============================================================================
-- TABLA: agents
-- Asesores y equipo de Sunrise Bacalar
-- =============================================================================
CREATE TABLE public.agents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name       TEXT NOT NULL,                         -- "Julian Vane"
    slug            TEXT NOT NULL UNIQUE,                  -- "julian-vane"
    title           TEXT NOT NULL,                         -- "Senior Portfolio Advisor"
    bio             TEXT,
    avatar_url      TEXT,
    email           TEXT UNIQUE,
    phone           TEXT,
    whatsapp        TEXT,
    linkedin_url    TEXT,
    instagram_url   TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    display_order   INT NOT NULL DEFAULT 0,
    -- Campos de autenticación (vincula con auth.users de Supabase)
    auth_user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agents_slug ON public.agents(slug);
CREATE INDEX idx_agents_auth_user ON public.agents(auth_user_id);
CREATE INDEX idx_agents_active ON public.agents(is_active);

-- =============================================================================
-- TABLA: properties
-- Propiedades inmobiliarias — entidad principal del sistema
-- =============================================================================
CREATE TABLE public.properties (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identidad
    title               TEXT NOT NULL,                     -- "Casa de los Siete Cielos"
    slug                TEXT NOT NULL UNIQUE,              -- "casa-de-los-siete-cielos"
    subtitle            TEXT,                              -- "Waterfront Estate"
    tagline             TEXT,                              -- "An architectural masterpiece..."
    description         TEXT NOT NULL,                    -- Descripción larga editorial

    -- Precio y tipo de operación
    price               NUMERIC(15, 2) NOT NULL,           -- 4850000.00
    price_currency      TEXT NOT NULL DEFAULT 'USD',
    original_price      NUMERIC(15, 2),                   -- Precio antes de descuento
    listing_type        TEXT NOT NULL DEFAULT 'sale'
                            CHECK (listing_type IN ('sale', 'rent', 'lease')),
    status              TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'sold', 'rented', 'off_market', 'draft')),

    -- Características físicas
    bedrooms            INT,                               -- 6
    bathrooms           NUMERIC(4,1),                      -- 7.5
    area_sqft           NUMERIC(10,2),                    -- 8400
    area_sqm            NUMERIC(10,2),                    -- calculado o ingresado
    lot_size_sqft       NUMERIC(10,2),
    year_built          INT,
    floors              INT,

    -- Ubicación
    destination_id      UUID REFERENCES public.destinations(id) ON DELETE SET NULL,
    city                TEXT,                              -- "Bacalar"
    state               TEXT,                              -- "Quintana Roo"
    country             TEXT NOT NULL DEFAULT 'Mexico',
    address             TEXT,                              -- Dirección completa
    latitude            DECIMAL(10, 8),
    longitude           DECIMAL(11, 8),
    google_maps_url     TEXT,

    -- Relaciones
    category_id         UUID REFERENCES public.property_categories(id) ON DELETE SET NULL,
    agent_id            UUID REFERENCES public.agents(id) ON DELETE SET NULL,

    -- Imágenes
    hero_image_url      TEXT,                              -- Imagen principal
    gallery_image_urls  TEXT[],                           -- Array de URLs adicionales

    -- SEO
    seo_title           TEXT,                              -- Máx 60 chars
    seo_description     TEXT,                              -- Máx 160 chars
    seo_keywords        TEXT[],                           -- Array de palabras clave
    og_image_url        TEXT,                              -- Open Graph image

    -- Flags editoriales
    is_featured         BOOLEAN NOT NULL DEFAULT false,
    is_new_listing      BOOLEAN NOT NULL DEFAULT false,
    is_exclusive        BOOLEAN NOT NULL DEFAULT false,
    is_published        BOOLEAN NOT NULL DEFAULT false,

    -- Métricas
    view_count          INT NOT NULL DEFAULT 0,
    inquiry_count       INT NOT NULL DEFAULT 0,

    -- Auditoría
    published_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para búsquedas frecuentes
CREATE INDEX idx_properties_slug ON public.properties(slug);
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_properties_published ON public.properties(is_published);
CREATE INDEX idx_properties_featured ON public.properties(is_featured);
CREATE INDEX idx_properties_destination ON public.properties(destination_id);
CREATE INDEX idx_properties_category ON public.properties(category_id);
CREATE INDEX idx_properties_agent ON public.properties(agent_id);
CREATE INDEX idx_properties_price ON public.properties(price);
CREATE INDEX idx_properties_listing_type ON public.properties(listing_type);
CREATE INDEX idx_properties_bedrooms ON public.properties(bedrooms);

-- Índice de texto completo para búsqueda semántica
CREATE INDEX idx_properties_search
    ON public.properties
    USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- =============================================================================
-- TABLA: property_amenities
-- Catálogo de amenidades disponibles
-- =============================================================================
CREATE TABLE public.property_amenities (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL UNIQUE,                  -- "Infinity Lagoon Pool"
    slug            TEXT NOT NULL UNIQUE,                  -- "infinity-lagoon-pool"
    description     TEXT,
    icon            TEXT,                                  -- Material Symbol: "pool"
    category        TEXT,                                  -- "outdoor", "indoor", "tech", "eco"
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLA: property_amenity_links
-- Relación N:N entre propiedades y amenidades con descripción personalizada
-- =============================================================================
CREATE TABLE public.property_amenity_links (
    property_id     UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    amenity_id      UUID NOT NULL REFERENCES public.property_amenities(id) ON DELETE CASCADE,
    custom_description TEXT,                              -- "Temperature controlled with integrated spa"
    PRIMARY KEY (property_id, amenity_id)
);

CREATE INDEX idx_amenity_links_property ON public.property_amenity_links(property_id);

-- =============================================================================
-- TABLA: property_images
-- Galería de imágenes por propiedad (con metadatos para SEO)
-- =============================================================================
CREATE TABLE public.property_images (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id     UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    storage_path    TEXT,                                  -- Path en Supabase Storage
    public_url      TEXT NOT NULL,                        -- URL pública de la imagen
    alt_text        TEXT,                                  -- Atributo alt (crítico para SEO)
    caption         TEXT,
    width           INT,
    height          INT,
    file_size_bytes INT,
    mime_type       TEXT DEFAULT 'image/jpeg',
    is_hero         BOOLEAN NOT NULL DEFAULT false,       -- Imagen principal
    display_order   INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_property_images_property ON public.property_images(property_id);
CREATE INDEX idx_property_images_hero ON public.property_images(property_id, is_hero);
CREATE INDEX idx_property_images_order ON public.property_images(property_id, display_order);

-- =============================================================================
-- TABLA: inquiries
-- Formularios de contacto / solicitudes de visita por propiedad
-- =============================================================================
CREATE TABLE public.inquiries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id     UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    agent_id        UUID REFERENCES public.agents(id) ON DELETE SET NULL,

    -- Datos del cliente
    full_name       TEXT NOT NULL,
    email           TEXT NOT NULL,
    phone           TEXT,
    message         TEXT,

    -- Metadatos
    source          TEXT DEFAULT 'website',               -- "website", "whatsapp", "email"
    status          TEXT NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new', 'contacted', 'in_progress', 'closed', 'spam')),
    notes           TEXT,                                  -- Notas internas del agente

    -- Tracking
    ip_address      INET,
    user_agent      TEXT,
    referrer_url    TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inquiries_property ON public.inquiries(property_id);
CREATE INDEX idx_inquiries_agent ON public.inquiries(agent_id);
CREATE INDEX idx_inquiries_status ON public.inquiries(status);
CREATE INDEX idx_inquiries_created ON public.inquiries(created_at DESC);

-- =============================================================================
-- TABLA: newsletter_subscribers
-- Lista de emails suscritos al newsletter
-- =============================================================================
CREATE TABLE public.newsletter_subscribers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           TEXT NOT NULL UNIQUE,
    full_name       TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    source          TEXT DEFAULT 'website',               -- "footer", "portfolio", "popup"
    subscribed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ
);

CREATE INDEX idx_newsletter_email ON public.newsletter_subscribers(email);
CREATE INDEX idx_newsletter_active ON public.newsletter_subscribers(is_active);

-- =============================================================================
-- TABLA: site_settings
-- Configuración global del sitio (key-value flexible)
-- =============================================================================
CREATE TABLE public.site_settings (
    key             TEXT PRIMARY KEY,                      -- "company_name", "hero_title", etc.
    value           TEXT,
    value_json      JSONB,                                 -- Para valores complejos
    description     TEXT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLA: seo_audit_logs
-- Registro de auditorías SEO realizadas desde el panel de control
-- =============================================================================
CREATE TABLE public.seo_audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id     UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    audited_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Scores (0-100)
    score_overall       INT,
    score_title         INT,
    score_description   INT,
    score_keywords      INT,
    score_images        INT,
    score_headings      INT,

    -- Datos del análisis
    audit_results   JSONB NOT NULL,                       -- JSON con detalles y recomendaciones

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seo_audit_property ON public.seo_audit_logs(property_id);
CREATE INDEX idx_seo_audit_created ON public.seo_audit_logs(created_at DESC);

-- =============================================================================
-- FUNCIÓN: update_updated_at_column
-- Trigger para actualizar automáticamente updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers a todas las tablas con updated_at
CREATE TRIGGER trg_destinations_updated_at
    BEFORE UPDATE ON public.destinations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_property_categories_updated_at
    BEFORE UPDATE ON public.property_categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_agents_updated_at
    BEFORE UPDATE ON public.agents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_properties_updated_at
    BEFORE UPDATE ON public.properties
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_inquiries_updated_at
    BEFORE UPDATE ON public.inquiries
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- FUNCIÓN: increment_property_view_count
-- Incrementa el contador de vistas de una propiedad de forma segura
-- =============================================================================
CREATE OR REPLACE FUNCTION public.increment_property_views(property_slug TEXT)
RETURNS void AS $$
BEGIN
    UPDATE public.properties
    SET view_count = view_count + 1
    WHERE slug = property_slug AND is_published = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Política: Lectura pública, escritura solo para usuarios autenticados
-- =============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_amenity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_audit_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- DESTINATIONS: Lectura pública, escritura autenticada
-- ---------------------------------------------------------------
CREATE POLICY "destinations_public_read"
    ON public.destinations FOR SELECT
    USING (true);

CREATE POLICY "destinations_auth_write"
    ON public.destinations FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- PROPERTY_CATEGORIES: Lectura pública, escritura autenticada
-- ---------------------------------------------------------------
CREATE POLICY "categories_public_read"
    ON public.property_categories FOR SELECT
    USING (true);

CREATE POLICY "categories_auth_write"
    ON public.property_categories FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- AGENTS: Lectura pública de agentes activos, escritura autenticada
-- ---------------------------------------------------------------
CREATE POLICY "agents_public_read"
    ON public.agents FOR SELECT
    USING (is_active = true);

CREATE POLICY "agents_auth_read_all"
    ON public.agents FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "agents_auth_write"
    ON public.agents FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- PROPERTIES: Solo propiedades publicadas son públicas
-- ---------------------------------------------------------------
CREATE POLICY "properties_public_read"
    ON public.properties FOR SELECT
    USING (is_published = true AND status != 'draft');

CREATE POLICY "properties_auth_read_all"
    ON public.properties FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "properties_auth_write"
    ON public.properties FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- PROPERTY_AMENITIES: Lectura pública
-- ---------------------------------------------------------------
CREATE POLICY "amenities_public_read"
    ON public.property_amenities FOR SELECT
    USING (true);

CREATE POLICY "amenities_auth_write"
    ON public.property_amenities FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- PROPERTY_AMENITY_LINKS: Lectura pública
-- ---------------------------------------------------------------
CREATE POLICY "amenity_links_public_read"
    ON public.property_amenity_links FOR SELECT
    USING (true);

CREATE POLICY "amenity_links_auth_write"
    ON public.property_amenity_links FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- PROPERTY_IMAGES: Lectura pública
-- ---------------------------------------------------------------
CREATE POLICY "images_public_read"
    ON public.property_images FOR SELECT
    USING (true);

CREATE POLICY "images_auth_write"
    ON public.property_images FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- INQUIRIES: Inserción pública (formularios), lectura solo autenticados
-- ---------------------------------------------------------------
CREATE POLICY "inquiries_public_insert"
    ON public.inquiries FOR INSERT
    WITH CHECK (true);

CREATE POLICY "inquiries_auth_read"
    ON public.inquiries FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "inquiries_auth_update"
    ON public.inquiries FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- NEWSLETTER_SUBSCRIBERS: Inserción pública, lectura autenticada
-- ---------------------------------------------------------------
CREATE POLICY "newsletter_public_insert"
    ON public.newsletter_subscribers FOR INSERT
    WITH CHECK (true);

CREATE POLICY "newsletter_auth_read"
    ON public.newsletter_subscribers FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "newsletter_auth_write"
    ON public.newsletter_subscribers FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- SITE_SETTINGS: Lectura pública, escritura autenticada
-- ---------------------------------------------------------------
CREATE POLICY "settings_public_read"
    ON public.site_settings FOR SELECT
    USING (true);

CREATE POLICY "settings_auth_write"
    ON public.site_settings FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- SEO_AUDIT_LOGS: Solo acceso autenticado
-- ---------------------------------------------------------------
CREATE POLICY "seo_audit_auth_all"
    ON public.seo_audit_logs FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- =============================================================================
-- SUPABASE STORAGE BUCKETS
-- =============================================================================
-- NOTA: Ejecutar en Supabase Dashboard > Storage, o via API

-- Bucket para imágenes de propiedades (público)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'property-images',
    'property-images',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
) ON CONFLICT (id) DO NOTHING;

-- Bucket para avatars de agentes (público)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'agent-avatars',
    'agent-avatars',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Política de Storage: lectura pública, escritura autenticada
CREATE POLICY "property_images_public_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'property-images');

CREATE POLICY "property_images_auth_upload"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'property-images' AND auth.role() = 'authenticated');

CREATE POLICY "property_images_auth_delete"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'property-images' AND auth.role() = 'authenticated');

CREATE POLICY "agent_avatars_public_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'agent-avatars');

CREATE POLICY "agent_avatars_auth_upload"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'agent-avatars' AND auth.role() = 'authenticated');

-- =============================================================================
-- VISTAS ÚTILES (para queries frecuentes del frontend)
-- =============================================================================

-- Vista: propiedades publicadas con datos relacionados
CREATE VIEW public.published_properties AS
    SELECT
        p.*,
        d.name AS destination_name,
        d.slug AS destination_slug,
        d.country AS destination_country,
        c.name AS category_name,
        c.slug AS category_slug,
        c.icon AS category_icon,
        a.full_name AS agent_name,
        a.title AS agent_title,
        a.avatar_url AS agent_avatar_url,
        a.phone AS agent_phone,
        a.whatsapp AS agent_whatsapp
    FROM public.properties p
    LEFT JOIN public.destinations d ON p.destination_id = d.id
    LEFT JOIN public.property_categories c ON p.category_id = c.id
    LEFT JOIN public.agents a ON p.agent_id = a.id
    WHERE p.is_published = true
      AND p.status != 'draft';

-- =============================================================================
-- DATOS INICIALES: Configuración del sitio
-- =============================================================================
INSERT INTO public.site_settings (key, value, description) VALUES
    ('company_name', 'Sunrise Bacalar', 'Nombre de la empresa'),
    ('company_tagline', 'Curated Coastal Living', 'Tagline principal'),
    ('company_founded', '2012', 'Año de fundación'),
    ('contact_email', 'concierge@sunrise.luxury', 'Email de contacto principal'),
    ('contact_phone', '+52 (983) 123 4567', 'Teléfono principal'),
    ('contact_whatsapp', '+529831234567', 'WhatsApp (sin formato)'),
    ('contact_address', 'Avenida Costera 142, Bacalar, Quintana Roo 77930', 'Dirección física'),
    ('social_instagram', '', 'URL de Instagram'),
    ('social_linkedin', '', 'URL de LinkedIn'),
    ('hectares_preserved', '500', 'Hectáreas preservadas (stat homepage)'),
    ('years_of_trust', '15', 'Años de trayectoria (stat homepage)'),
    ('asset_value_sold', '2.4B+', 'Valor total de activos vendidos')
ON CONFLICT (key) DO NOTHING;
