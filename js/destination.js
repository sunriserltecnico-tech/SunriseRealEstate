import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    await loadLayout();
    await loadDestinationSettings();
    await loadExperiences();
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
        console.error('Error al cargar layout:', err);
    }
}

/**
 * Carga y renderiza el contenido de destination_settings
 */
async function loadDestinationSettings() {
    try {
        const { data, error } = await supabase.from('destination_settings').select('*');
        if (error) throw error;

        // Convertir array en un diccionario clave: valor
        const settings = data.reduce((acc, item) => {
            acc[item.setting_key] = item.setting_value;
            return acc;
        }, {});

        // 1. Inyección de Textos
        document.querySelectorAll('[data-content-key]').forEach(el => {
            const key = el.getAttribute('data-content-key');
            if (settings[key]) {
                el.innerHTML = settings[key];
            }
        });

        // 2. Inyección de Imágenes en etiquetas <img>
        document.querySelectorAll('[data-src-key]').forEach(el => {
            const key = el.getAttribute('data-src-key');
            if (settings[key] && el.tagName === 'IMG') {
                el.src = settings[key];
            }
        });

        // 3. Inyección de Imágenes como Fondo (Hero o CTA bg)
        document.querySelectorAll('[data-bg-key]').forEach(el => {
            const key = el.getAttribute('data-bg-key');
            if (settings[key]) {
                el.style.backgroundImage = `url('${settings[key]}')`;
            }
        });

    } catch (err) {
        console.error('Error al cargar settings de destination:', err);
    }
}

/**
 * Carga y renderiza las experiencias dinámicas
 */
async function loadExperiences() {
    try {
        const { data: experiences, error } = await supabase
            .from('destination_experiences')
            .select('*')
            .order('display_order', { ascending: true });

        if (error) throw error;

        const grid = document.getElementById('experiences-grid');
        if (!grid || !experiences) return;

        grid.innerHTML = ''; // Limpiar el grid

        experiences.forEach(exp => {
            const card = document.createElement('div');
            card.className = 'group relative aspect-[3/4] rounded-xl overflow-hidden bg-surface-container-lowest';
            card.innerHTML = `
                <img src="${exp.image_url}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="${exp.title}">
                <div class="absolute inset-0 bg-gradient-to-t from-on-surface/80 via-transparent to-transparent opacity-60"></div>
                <div class="absolute bottom-0 left-0 p-8 w-full">
                    <span class="font-label text-primary-fixed-dim text-xs uppercase tracking-widest font-bold">${exp.category}</span>
                    <h3 class="font-headline text-2xl text-surface-bright mt-2">${exp.title}</h3>
                    <p class="text-surface-bright/80 text-sm mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">${exp.description}</p>
                </div>
            `;
            grid.appendChild(card);
        });

    } catch (err) {
        console.error('Error al cargar experiencias:', err);
    }
}
