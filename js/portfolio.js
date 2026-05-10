import { supabase } from './supabase.js';

/**
 * Motor Dinámico para Portfolio.html
 * Maneja filtros, búsqueda en tiempo real y renderizado de grid editorial.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Carga de Componentes y Ajustes
    await loadLayout();
    await loadPortfolioSettings();
    await populateDestinations();

    // 2. Revisar URL Params (viniendo del Home)
    applyUrlParams();

    // 3. Búsqueda Inicial
    fetchFilteredProperties();

    // 4. Eventos de Usuario
    document.getElementById('btn-search')?.addEventListener('click', () => {
        fetchFilteredProperties();
    });

    // Búsqueda al presionar Enter en los selectores
    const filters = ['filter-location', 'filter-price', 'filter-beds'];
    filters.forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => {
            fetchFilteredProperties();
        });
    });
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
        document.getElementById('app-header').innerHTML = headerHtml;
        document.getElementById('app-footer').innerHTML = footerHtml;
    } catch (err) {
        console.error('Error al cargar layout:', err);
    }
}

/**
 * Carga textos dinámicos del portafolio
 */
async function loadPortfolioSettings() {
    try {
        const { data, error } = await supabase.from('portfolio_settings').select('*');
        if (error) throw error;

        const settings = data.reduce((acc, item) => {
            acc[item.setting_key] = item.setting_value;
            return acc;
        }, {});

        document.querySelectorAll('[data-content-key]').forEach(el => {
            const key = el.getAttribute('data-content-key');
            if (settings[key]) el.innerHTML = settings[key];
        });

        document.querySelectorAll('[data-src-key]').forEach(el => {
            const key = el.getAttribute('data-src-key');
            if (settings[key]) {
                if (el.tagName === 'IMG') el.src = settings[key];
            }
        });
    } catch (err) {
        console.error('Error al cargar settings del portafolio:', err);
    }
}

/**
 * Llena el selector de ubicación con destinos reales de la BD
 */
async function populateDestinations() {
    try {
        const { data, error } = await supabase.from('destinations').select('*').order('name');
        if (error) throw error;

        const select = document.getElementById('filter-location');
        if (!select) return;

        select.innerHTML = '<option value="">All Locations</option>';
        data.forEach(dest => {
            const option = document.createElement('option');
            option.value = dest.id;
            option.textContent = dest.name;
            select.appendChild(option);
        });
    } catch (err) {
        console.error('Error al cargar destinos:', err);
    }
}

/**
 * Captura parámetros de la URL y los aplica a los filtros
 */
function applyUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const price = params.get('price');
    
    if (price) {
        const priceSelect = document.getElementById('filter-price');
        if (priceSelect) priceSelect.value = price;
    }
    
    // Si en el futuro el Home pasa ubicación o camas, se añadirían aquí
}

/**
 * Consulta dinámica a Supabase basada en filtros seleccionados
 */
async function fetchFilteredProperties() {
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return;

    // Loader elegante
    grid.innerHTML = '<div class="col-span-12 text-center py-32 text-on-surface-variant animate-pulse italic">Curating your sanctuary...</div>';

    const locationId = document.getElementById('filter-location').value;
    const priceRange = document.getElementById('filter-price').value;
    const minBeds = document.getElementById('filter-beds').value;

    let query = supabase
        .from('properties')
        .select('*, destinations(name)')
        .eq('is_published', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

    if (locationId) {
        query = query.eq('destination_id', locationId);
    }

    if (priceRange) {
        const [min, max] = priceRange.split('-').map(Number);
        query = query.gte('price', min).lte('price', max);
    }

    if (minBeds) {
        query = query.gte('bedrooms', Number(minBeds));
    }

    const { data: properties, error } = await query;

    if (error) {
        console.error('Error fetching properties:', error);
        grid.innerHTML = '<div class="col-span-12 text-center py-20 text-error">Error loading properties.</div>';
        return;
    }

    if (!properties || properties.length === 0) {
        grid.innerHTML = `
            <div class="col-span-12 text-center py-32 space-y-6">
                <span class="material-symbols-outlined text-7xl text-outline-variant/30">search_off</span>
                <p class="text-2xl font-headline text-on-surface-variant">No sanctuaries found matching your criteria.</p>
                <button onclick="window.location.href='Portfolio.html'" class="text-primary font-bold underline underline-offset-4 hover:opacity-80 transition-opacity">Clear all filters</button>
            </div>
        `;
        return;
    }

    renderProperties(properties);
}

/**
 * Renderiza el grid respetando el diseño editorial (Bento Layout)
 */
function renderProperties(properties) {
    const grid = document.getElementById('portfolio-grid');
    grid.innerHTML = '';

    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    });

    properties.forEach((prop, index) => {
        const isFirst = index === 0;
        const card = document.createElement('div');
        
        // Estructura condicional basada en el índice (La primera es la "Featured")
        if (isFirst) {
            card.className = 'md:col-span-8 bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm group hover:shadow-xl transition-all duration-500';
            card.innerHTML = `
                <a href="Property_Details.html?id=${prop.id}">
                    <div class="relative h-[500px] overflow-hidden">
                        <img class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="${prop.hero_image_url}" alt="${prop.title}"/>
                        <div class="absolute top-6 left-6 flex gap-2">
                            <span class="bg-surface-bright/90 backdrop-blur px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-primary">Featured Selection</span>
                        </div>
                    </div>
                    <div class="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <p class="font-label text-xs uppercase tracking-[0.2em] text-outline mb-2">${prop.destinations?.name || 'Bacalar, Mexico'}</p>
                            <h3 class="font-headline text-3xl font-bold text-on-surface mb-6">${prop.title}</h3>
                            <div class="flex gap-8 text-on-surface-variant font-medium">
                                <span class="flex items-center gap-2"><span class="material-symbols-outlined text-sm">bed</span> ${prop.bedrooms} Beds</span>
                                <span class="flex items-center gap-2"><span class="material-symbols-outlined text-sm">bathtub</span> ${prop.bathrooms} Baths</span>
                                <span class="flex items-center gap-2"><span class="material-symbols-outlined text-sm">straighten</span> ${prop.built_area_sqm} m²</span>
                            </div>
                        </div>
                        <div class="text-right w-full md:w-auto">
                            <p class="text-primary font-headline text-3xl font-bold">${formatter.format(prop.price)}</p>
                            <span class="mt-4 text-primary font-label text-sm uppercase tracking-widest font-bold flex items-center gap-2 group/btn justify-end">
                                View Details 
                                <span class="material-symbols-outlined text-lg transition-transform group-hover/btn:translate-x-1">arrow_right_alt</span>
                            </span>
                        </div>
                    </div>
                </a>
            `;
        } else {
            card.className = 'md:col-span-4 bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm group hover:shadow-xl transition-all duration-500';
            card.innerHTML = `
                <a href="Property_Details.html?id=${prop.id}">
                    <div class="relative h-[300px] overflow-hidden">
                        <img class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="${prop.hero_image_url}" alt="${prop.title}"/>
                    </div>
                    <div class="p-8">
                        <p class="font-label text-xs uppercase tracking-[0.2em] text-outline mb-2">${prop.destinations?.name || 'Bacalar, Mexico'}</p>
                        <h3 class="font-headline text-2xl font-bold text-on-surface mb-6">${prop.title}</h3>
                        <div class="grid grid-cols-2 gap-4 text-on-surface-variant mb-8">
                            <span class="flex items-center gap-2"><span class="material-symbols-outlined text-sm">bed</span> ${prop.bedrooms} Beds</span>
                            <span class="flex items-center gap-2"><span class="material-symbols-outlined text-sm">bathtub</span> ${prop.bathrooms} Baths</span>
                        </div>
                        <div class="flex justify-between items-center pt-6 border-t border-surface-container-high">
                            <p class="text-primary font-headline text-xl font-bold">${formatter.format(prop.price)}</p>
                            <span class="material-symbols-outlined text-outline">favorite</span>
                        </div>
                    </div>
                </a>
            `;
        }
        grid.appendChild(card);
    });
}
