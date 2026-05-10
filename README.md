# 🌅 Sunrise Bacalar | Luxury Real Estate CMS

![Sunrise Bacalar Logo](assets/Sunrise%20Bacalar%20-%20Logo%20Color.svg)

**Sunrise Bacalar** es una plataforma inmobiliaria de lujo diseñada para ofrecer una experiencia visual de alto impacto (Clear Glassmorphism) y una gestión técnica "Zero Hardcode". Todo el contenido del sitio, desde los textos del Hero hasta los perfiles de los agentes, se gestiona dinámicamente mediante un Panel de Administración personalizado conectado a Supabase.

---

## 🚀 Tecnologías Core

- **Frontend**: HTML5, Vanilla JavaScript (ES6+), Tailwind CSS (M3 Custom Theme).
- **Backend-as-a-Service**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage).
- **Diseño**: Estética *Clear Glassmorphism*, capas tonales y micro-animaciones fluidas.
- **Iconografía**: Google Material Symbols Outlined.

---

## 🏗️ Arquitectura "Zero Hardcode"

La web funciona mediante un motor de inyección dinámica. En lugar de editar archivos HTML, el sistema busca atributos específicos en el DOM:

- `data-content-key`: Inyecta texto o HTML desde las tablas de configuración.
- `data-src-key`: Inyecta URLs de imágenes o videos.
- `data-prop`: En las páginas de detalle, mapea atributos específicos de una propiedad (precio, área, etc.).

Cada página principal tiene un script asociado (`js/home.js`, `js/portfolio.js`, etc.) que sincroniza el estado de la base de datos con la interfaz en tiempo real.

---

## 🌐 Funcionalidades del Sitio Público

### 1. Home (`Home.html`)
- **Hero Dinámico**: Video de fondo y títulos gestionados desde el CMS.
- **Buscador Integrado**: Filtros rápidos por ubicación y tipo de propiedad.
- **Sección About & Stats**: Contadores dinámicos y narrativa de marca.

### 2. Portfolio & Filtros (`Portfolio.html`)
- **Grid Inteligente**: Carga de propiedades con sistema de "Skeleton Loading".
- **Filtros Avanzados**: Búsqueda por rango de precio, habitaciones y destino.
- **Lead Capture**: Botones de WhatsApp y formularios de consulta integrados.

### 3. Detalle de Propiedad (`Property_Details.html`)
- **Inyección 100% Dinámica**: Carga datos, galería, amenidades y agente asignado mediante el ID en la URL.
- **Conversión**: Formulario de contacto que registra leads directamente en la tabla `property_leads`.

### 4. Destination & Concierge
- **Bento Grids**: Layouts asimétricos para experiencias locales y servicios VIP.
- **Servicios Dinámicos**: Los servicios de Concierge se pueden añadir o quitar sin tocar el código.

---

## 🛠️ Panel de Administración (`/admin`)

El centro de mando para la gestión operativa del negocio.

### 1. Dashboard de Analítica
- Visualización de leads en tiempo real.
- Resumen de interés por propiedad.

### 2. Gestión de Propiedades (`properties.html`)
- CRUD completo de listados.
- Subida de imágenes y asignación de agentes.
- Control de estado (Disponible, Vendida, Off-Market).

### 3. Catálogos Base (`catalogs.html`)
- **Destinos**: Gestión de ubicaciones geográficas.
- **Categorías**: Tipos de propiedades (Villas, Penthouses, Terrenos).
- **Agentes (Módulo Avanzado)**: Perfiles profesionales completos con redes sociales, biografía y orden de visualización.
- **Amenidades**: Catálogo de íconos para las propiedades.

### 4. Configuración Global (`settings.html`)
- Editor visual para todas las secciones de la web (Home, About, Destination).
- **Gestión Legal**: Editor de Política de Privacidad y Términos de Servicio que se actualizan automáticamente en los modales del sitio público.

---

## 📦 Instalación y Configuración

1. **Configuración de Supabase**:
   - Crea un proyecto en Supabase.
   - Ejecuta las migraciones SQL (proporcionadas en la carpeta `/supabase` si existen).
   - Configura las tablas: `properties`, `agents`, `*_settings`, `property_leads`.

2. **Variables de Entorno**:
   - Edita el archivo `js/supabase.js` e inserta tu `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

3. **Despliegue**:
   - Sube los archivos a cualquier servidor estático (Vercel, Netlify, GitHub Pages) o úsalo localmente con un servidor tipo `Live Server`.

---

## 🛡️ Seguridad
- **Admin Auth**: Todas las rutas dentro de `/admin` están protegidas por `js/admin_auth.js`.
- **Sesiones**: Implementación de `requireAuth()` que redirige al login si no hay una sesión activa.
- **Hard Logout**: Protocolo de cierre de sesión que limpia el almacenamiento local y de sesión para máxima seguridad.

---

**Desarrollado por**: Noveno & Guglielmo Donati
**© 2026 Sunrise Real Estate**
