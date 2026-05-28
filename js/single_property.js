import { supabase } from './supabase.js';

export async function renderSingleProperty() {
    // 0. Cargar Header y Footer dinámicamente
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
        console.error('Error al cargar componentes globales del diseño:', err);
    }

    // 1. Extraer ID de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('id');

    if (!propertyId) {
        window.location.href = 'Portfolio.html';
        return;
    }

    try {
        // 2. Fetch Datos Centrales y Agente
        const { data: prop, error: propError } = await supabase
            .from('properties')
            .select('*, destinations(name), agents(*)')
            .eq('id', propertyId)
            .single();

        if (propError || !prop) throw propError || new Error('Property not found');

        // Inyección DOM: Datos Centrales
        const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
        
        document.querySelectorAll('[data-prop]').forEach(el => {
            const key = el.getAttribute('data-prop');
            if (key === 'title') el.textContent = prop.title;
            else if (key === 'price') el.textContent = formatter.format(prop.price);
            else if (key === 'sqft') el.textContent = prop.built_area_sqm;
            else if (key === 'bedrooms') el.textContent = String(prop.bedrooms).padStart(2, '0');
            else if (key === 'bathrooms') el.textContent = prop.bathrooms;
            else if (key === 'description') el.textContent = prop.description;
            else if (key === 'location') el.textContent = prop.destinations?.name || 'Bacalar, Mexico';
        });

        // Agente
        const agentCard = document.querySelector('.sticky.top-32 .flex.items-center.gap-4');
        if (agentCard && prop.agents) {
            const agentImg = agentCard.querySelector('img');
            const agentName = agentCard.querySelector('h4');
            const agentTitle = agentCard.querySelector('p');
            
            if (agentImg) agentImg.src = prop.agents.avatar_url || 'https://via.placeholder.com/150';
            if (agentName) {
                const name = prop.agents.full_name || `${prop.agents.first_name || ''} ${prop.agents.last_name || ''}`.trim();
                agentName.textContent = name;
            }
            if (agentTitle) agentTitle.textContent = prop.agents.title || 'Senior Portfolio Advisor';
        }

        // ─────────────────────────────────────────────────────────────
        // 3. Galería Asimétrica y Lightbox — FIX APLICADO
        // ─────────────────────────────────────────────────────────────
        const { data: images, error: imgError } = await supabase
            .from('property_images')
            .select('*')
            .eq('property_id', propertyId)
            .order('display_order');

        if (imgError) console.warn('Error fetching images:', imgError.message);

        if (images && images.length > 0) {

            // FIX #1: Usar IDs explícitos en lugar del selector frágil .grid-cols-12 img
            const heroImg0 = document.getElementById('hero-img-0');
            const heroImg1 = document.getElementById('hero-img-1');
            const heroImg2 = document.getElementById('hero-img-2');

            // Cargar imágenes con fallback seguro
            if (heroImg0) {
                heroImg0.src = (images[0] && images[0].public_url) ? images[0].public_url : (prop.hero_image_url || '');
            }
            if (heroImg1 && images[1]) heroImg1.src = images[1].public_url;
            if (heroImg2 && images[2]) heroImg2.src = images[2].public_url;

            // Actualizar contador del botón utilizando ID único
            const photosBtn = document.getElementById('view-all-photos-btn');

            if (photosBtn) {
                photosBtn.innerHTML = `<span class="material-symbols-outlined text-lg">grid_view</span> VIEW ALL ${images.length} PHOTOS`;
            }

            // FIX #2 y #3: Lightbox con display correcto — sin conflicto hidden/flex
            const lightboxModal = document.createElement('div');
            // No incluir 'hidden' ni 'flex-col' en el className inicial — manejar display con style
            lightboxModal.style.display = 'none';
            lightboxModal.className = 'fixed inset-0 z-[100] bg-black/95 backdrop-blur-md items-center justify-center p-8 transition-opacity duration-300 opacity-0';

            const closeBtn = document.createElement('button');
            closeBtn.className = 'absolute top-8 right-8 text-white/50 hover:text-white transition-colors p-2';
            closeBtn.innerHTML = '<span class="material-symbols-outlined text-4xl">close</span>';

            const galleryGrid = document.createElement('div');
            galleryGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-screen-2xl max-h-[90vh] overflow-y-auto mt-16 pb-16';

            images.forEach(img => {
                const imgEl = document.createElement('img');
                imgEl.src = img.public_url;
                imgEl.alt = img.alt_text || 'Sunrise Bacalar Property';
                imgEl.loading = 'lazy';
                imgEl.className = 'w-full h-80 object-cover rounded-xl hover:scale-[1.02] transition-transform duration-300 cursor-pointer';
                
                // Al hacer clic en una miniatura, abrir vista de zoom en pantalla completa
                imgEl.addEventListener('click', () => {
                    const zoomOverlay = document.createElement('div');
                    zoomOverlay.className = 'fixed inset-0 z-[120] bg-black/95 flex items-center justify-center p-4 transition-opacity duration-300 opacity-0 cursor-zoom-out';
                    
                    const largeImg = document.createElement('img');
                    largeImg.src = img.public_url;
                    largeImg.alt = img.alt_text || 'Sunrise Bacalar Property Large';
                    largeImg.className = 'max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl transition-transform duration-300 scale-95';
                    
                    const closeZoomBtn = document.createElement('button');
                    closeZoomBtn.className = 'absolute top-6 right-6 text-white/70 hover:text-white transition-colors p-2 z-[130] bg-black/50 rounded-full';
                    closeZoomBtn.innerHTML = '<span class="material-symbols-outlined text-3xl">close</span>';
                    
                    zoomOverlay.appendChild(largeImg);
                    zoomOverlay.appendChild(closeZoomBtn);
                    document.body.appendChild(zoomOverlay);
                    
                    // Forzar reflow antes de aplicar animaciones de transición
                    void zoomOverlay.offsetHeight;
                    zoomOverlay.classList.replace('opacity-0', 'opacity-100');
                    largeImg.classList.replace('scale-95', 'scale-100');
                    
                    const closeZoom = () => {
                        zoomOverlay.classList.replace('opacity-100', 'opacity-0');
                        largeImg.classList.replace('scale-100', 'scale-95');
                        setTimeout(() => { zoomOverlay.remove(); }, 300);
                    };
                    
                    zoomOverlay.addEventListener('click', closeZoom);
                    closeZoomBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        closeZoom();
                    });
                });

                galleryGrid.appendChild(imgEl);
            });

            lightboxModal.appendChild(closeBtn);
            lightboxModal.appendChild(galleryGrid);
            document.body.appendChild(lightboxModal);

            // FIX #3: Abrir con style.display = 'flex' para evitar conflicto Tailwind hidden vs flex
            const openLightbox = () => {
                lightboxModal.style.display = 'flex';
                // Forzar reflow antes de animar opacidad
                void lightboxModal.offsetHeight;
                lightboxModal.classList.replace('opacity-0', 'opacity-100');
            };

            const closeLightbox = () => {
                lightboxModal.classList.replace('opacity-100', 'opacity-0');
                setTimeout(() => { lightboxModal.style.display = 'none'; }, 300);
            };

            if (photosBtn) photosBtn.addEventListener('click', openLightbox);
            closeBtn.addEventListener('click', closeLightbox);
            lightboxModal.addEventListener('click', (e) => { if (e.target === lightboxModal) closeLightbox(); });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lightboxModal.style.display === 'flex') closeLightbox(); });

        } else if (prop.hero_image_url) {
            // Fallback si no hay property_images pero sí hero_image_url en la propiedad
            const heroImg0 = document.getElementById('hero-img-0');
            if (heroImg0) heroImg0.src = prop.hero_image_url;
        }

        // ─────────────────────────────────────────────────────────────
        // 4. Bento Box de Amenidades
        // ─────────────────────────────────────────────────────────────
        const { data: amenitiesLinks } = await supabase
            .from('property_amenity_links')
            .select('custom_description, property_amenities(name, icon)')
            .eq('property_id', propertyId);

        const amenitiesContainer = document.querySelector('.grid.sm\\:grid-cols-2');
        if (amenitiesContainer && amenitiesLinks && amenitiesLinks.length > 0) {
            amenitiesContainer.innerHTML = '';
            
            amenitiesLinks.forEach(link => {
                const amenity = link.property_amenities;
                if (!amenity) return;

                const card = document.createElement('div');
                card.className = 'p-8 bg-surface-container-lowest rounded-xl flex items-start gap-4 hover:shadow-lg transition-shadow duration-300';
                
                card.innerHTML = `
                    <span class="material-symbols-outlined text-primary-container text-3xl">${amenity.icon || 'star'}</span>
                    <div>
                        <h4 class="font-bold text-on-surface">${amenity.name}</h4>
                        <p class="text-sm text-on-surface-variant">${link.custom_description || ''}</p>
                    </div>
                `;
                amenitiesContainer.appendChild(card);
            });
        }

        // ─────────────────────────────────────────────────────────────
        // 5. Portafolio Comparable (Related Listings)
        // ─────────────────────────────────────────────────────────────
        const comparableContainer = document.querySelector('section:last-of-type .grid');
        const comparableSection = document.querySelector('section:last-of-type');
        
        if (comparableContainer && comparableSection) {
            const { data: comparables } = await supabase
                .from('properties')
                .select('*')
                .eq('status', 'active')
                .neq('id', propertyId)
                .or(`destination_id.eq.${prop.destination_id},category_id.eq.${prop.category_id}`)
                .limit(3);

            if (comparables && comparables.length > 0) {
                comparableContainer.innerHTML = '';
                
                comparables.forEach(comp => {
                    const compEl = document.createElement('a');
                    compEl.href = `Property_Details.html?id=${comp.id}`;
                    compEl.className = 'group cursor-pointer block';
                    
                    compEl.innerHTML = `
                        <div class="h-80 rounded-xl overflow-hidden mb-6 relative">
                            <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="${comp.hero_image_url || 'https://via.placeholder.com/600'}" alt="${comp.title}" loading="lazy"/>
                            <div class="absolute top-4 right-4 bg-surface-container-lowest/90 px-3 py-1 rounded-full text-xs font-bold text-primary">${formatter.format(comp.price)}</div>
                        </div>
                        <h4 class="font-headline text-xl mb-1">${comp.title}</h4>
                        <p class="text-sm text-on-surface-variant">${comp.bedrooms} Bed • ${comp.bathrooms} Bath • ${comp.built_area_sqm} m²</p>
                    `;
                    comparableContainer.appendChild(compEl);
                });
            } else {
                comparableSection.style.display = 'none';
            }
        }

    } catch (err) {
        console.error('Error loading property:', err);
    }
}
