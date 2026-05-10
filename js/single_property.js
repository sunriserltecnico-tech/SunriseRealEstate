import { supabase } from './supabase.js';

export async function renderSingleProperty() {
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
            if (agentName) agentName.textContent = `${prop.agents.first_name} ${prop.agents.last_name}`;
            if (agentTitle) agentTitle.textContent = prop.agents.title || 'Senior Portfolio Advisor';
        }

        // 3. Galería Asimétrica y Lightbox
        const { data: images } = await supabase
            .from('property_images')
            .select('*')
            .eq('property_id', propertyId)
            .order('display_order');

        if (images && images.length > 0) {
            // Hero Asimétrico (primeras 3)
            const heroImages = document.querySelectorAll('.grid-cols-12 img');
            if (heroImages[0] && images[0]) heroImages[0].src = images[0].image_url;
            if (heroImages[1] && images[1]) heroImages[1].src = images[1].image_url;
            if (heroImages[2] && images[2]) heroImages[2].src = images[2].image_url;

            // Botón de Fotos
            const viewPhotosBtn = document.querySelector('.grid-cols-12 button');
            if (viewPhotosBtn) {
                viewPhotosBtn.innerHTML = `<span class="material-symbols-outlined text-lg">grid_view</span> VIEW ALL ${images.length} PHOTOS`;
                
                // Modal Lightbox
                const lightboxModal = document.createElement('div');
                lightboxModal.className = 'fixed inset-0 z-[100] bg-black/95 backdrop-blur-md hidden flex-col items-center justify-center p-8 transition-opacity duration-300 opacity-0';
                
                const closeBtn = document.createElement('button');
                closeBtn.className = 'absolute top-8 right-8 text-white/50 hover:text-white transition-colors p-2';
                closeBtn.innerHTML = '<span class="material-symbols-outlined text-4xl">close</span>';
                
                const galleryGrid = document.createElement('div');
                galleryGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-screen-2xl max-h-full overflow-y-auto mt-16 pb-16 custom-scrollbar';
                
                images.forEach(img => {
                    const imgEl = document.createElement('img');
                    imgEl.src = img.image_url;
                    imgEl.className = 'w-full h-80 object-cover rounded-xl hover:scale-[1.02] transition-transform duration-300 cursor-pointer';
                    galleryGrid.appendChild(imgEl);
                });

                lightboxModal.appendChild(closeBtn);
                lightboxModal.appendChild(galleryGrid);
                document.body.appendChild(lightboxModal);

                viewPhotosBtn.addEventListener('click', () => {
                    lightboxModal.classList.remove('hidden');
                    // Pequeño timeout para permitir que el display block tome efecto antes de la transición de opacidad
                    setTimeout(() => lightboxModal.classList.replace('opacity-0', 'opacity-100'), 10);
                });

                closeBtn.addEventListener('click', () => {
                    lightboxModal.classList.replace('opacity-100', 'opacity-0');
                    setTimeout(() => lightboxModal.classList.add('hidden'), 300);
                });
            }
        }

        // 4. Bento Box de Amenidades
        const { data: amenitiesLinks } = await supabase
            .from('property_amenity_links')
            .select('custom_description, property_amenities(name, icon)')
            .eq('property_id', propertyId);

        const amenitiesContainer = document.querySelector('.grid.sm\\:grid-cols-2');
        if (amenitiesContainer && amenitiesLinks) {
            amenitiesContainer.innerHTML = ''; // Vaciar
            
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

        // 5. Portafolio Comparable (Related Listings)
        const comparableContainer = document.querySelector('section:last-of-type .grid');
        const comparableSection = document.querySelector('section:last-of-type');
        
        if (comparableContainer && comparableSection) {
            // Construir query dinámica (or category or destination)
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
                            <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="${comp.hero_image_url || 'https://via.placeholder.com/600'}"/>
                            <div class="absolute top-4 right-4 bg-surface-container-lowest/90 px-3 py-1 rounded-full text-xs font-bold text-primary">${formatter.format(comp.price)}</div>
                        </div>
                        <h4 class="font-headline text-xl mb-1">${comp.title}</h4>
                        <p class="text-sm text-on-surface-variant">${comp.bedrooms} Bed • ${comp.bathrooms} Bath • ${comp.built_area_sqm} SQFT</p>
                    `;
                    comparableContainer.appendChild(compEl);
                });
            } else {
                comparableSection.style.display = 'none';
            }
        }

    } catch (err) {
        console.error('Error loading property:', err);
        // Podríamos redirigir si hay error crítico
        // window.location.href = 'Portfolio.html';
    }
}
