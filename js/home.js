import { supabase } from './supabase.js';

/**
 * Motor Dinámico para Home.html
 * Centraliza la carga de configuraciones y propiedades destacadas.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inyectar Componentes Globales
    await loadLayout();

    // 2. Cargar Contenido Dinámico (home_settings)
    await loadHomeContent();

    // 3. Cargar Propiedades Destacadas
    await loadFeaturedProperties();

    // 4. Inicializar Lógica de Búsqueda
    initHeroSearch();
});

/**
 * Carga Header y Footer
 */
async function loadLayout() {
    try {
        const [headerHtml, footerHtml] = await Promise.all([
            fetch('./components/header.html').then(res => res.text()),
            fetch('./components/footer.html').then(res => res.text())
        ]);

        const headerEl = document.getElementById('app-header');
        const footerEl = document.getElementById('app-footer');
        
        if (headerEl) headerEl.innerHTML = headerHtml;
        if (footerEl) footerEl.innerHTML = footerHtml;
    } catch (err) {
        console.error('Error al cargar componentes de diseño:', err);
    }
}

/**
 * Obtiene configuraciones de la tabla home_settings
 */
async function loadHomeContent() {
    try {
        const { data, error } = await supabase
            .from('home_settings')
            .select('*');

        if (error) throw error;

        // Convertir a diccionario llave-valor
        const settings = data.reduce((acc, item) => {
            acc[item.setting_key] = item.setting_value;
            return acc;
        }, {});

        // Inyectar Textos y HTML
        document.querySelectorAll('[data-content-key]').forEach(el => {
            const key = el.getAttribute('data-content-key');
            if (settings[key]) {
                el.innerHTML = settings[key];
            }
        });

        // Inyectar Multimedia (Video / Imágenes)
        document.querySelectorAll('[data-src-key]').forEach(el => {
            const key = el.getAttribute('data-src-key');
            if (settings[key]) {
                el.src = settings[key];
                // Si es un source de video, recargar el padre
                if (el.tagName === 'SOURCE') {
                    el.parentElement.load();
                }
            }
        });

    } catch (err) {
        console.error('Error al cargar configuraciones del Home:', err);
    }
}

/**
 * Carga las 3 propiedades destacadas más recientes
 */
async function loadFeaturedProperties() {
    try {
        const { data: properties, error } = await supabase
            .from('properties')
            .select('*, destinations(name)')
            .eq('is_featured', true)
            .eq('is_published', true)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(3);

        if (error) throw error;

        const grid = document.getElementById('featured-properties-grid');
        if (!grid) return;

        grid.innerHTML = ''; // Limpiar estático

        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        });

        properties.forEach((prop, index) => {
            const isOffset = index === 1; // Estética asimétrica: la segunda tarjeta baja un poco
            const card = document.createElement('a');
            card.href = `Property_Details.html?id=${prop.id}`;
            card.className = `group flex flex-col space-y-6 transition-all duration-500 hover:-translate-y-2 ${isOffset ? 'lg:mt-16' : ''}`;

            card.innerHTML = `
                <div class="aspect-[4/5] overflow-hidden rounded-xl bg-surface-container-low relative">
                    <img src="${prop.hero_image_url}" alt="${prop.title}" 
                         class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div class="absolute top-6 left-6 bg-surface-container-lowest/90 backdrop-blur px-4 py-1 rounded-full text-xs font-bold tracking-widest text-primary uppercase">
                        Featured
                    </div>
                </div>
                <div class="bg-surface-container-lowest p-4 rounded-xl transition-colors duration-300 group-hover:bg-surface-bright shadow-sm">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="font-headline text-2xl text-on-surface">${prop.title}</h3>
                            <p class="text-on-surface-variant text-sm flex items-center mt-1">
                                <span class="material-symbols-outlined text-sm mr-1">location_on</span> ${prop.destinations?.name || 'Bacalar, Mexico'}
                            </p>
                        </div>
                        <p class="font-headline text-xl text-primary font-bold">${formatter.format(prop.price)}</p>
                    </div>
                    <div class="flex items-center space-x-6 text-on-surface-variant text-sm border-t border-outline-variant/10 pt-6">
                        <span class="flex items-center"><span class="material-symbols-outlined mr-2">bed</span> ${prop.bedrooms}</span>
                        <span class="flex items-center"><span class="material-symbols-outlined mr-2">bathtub</span> ${prop.bathrooms}</span>
                        <span class="flex items-center"><span class="material-symbols-outlined mr-2">square_foot</span> ${prop.built_area_sqm} m²</span>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

    } catch (err) {
        console.error('Error al cargar propiedades destacadas:', err);
    }
}

/**
 * Redirección inteligente del buscador del Hero
 */
function initHeroSearch() {
    const exploreBtn = document.getElementById('search-explore-btn');
    if (!exploreBtn) return;

    exploreBtn.addEventListener('click', () => {
        const purpose = document.getElementById('search-purpose').value;
        const type = document.getElementById('search-type').value;
        const price = document.getElementById('search-price').value;

        const params = new URLSearchParams();
        if (purpose) params.append('purpose', purpose);
        if (type) params.append('type', type);
        if (price) params.append('price', price);

        window.location.href = `Portfolio.html?${params.toString()}`;
    });
}
