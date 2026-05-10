import { supabase } from './supabase.js';

/**
 * Motor de Contenido Dinámico "Cero Hardcodeo"
 * Carga textos, imágenes y fondos desde la tabla site_settings de Supabase
 * e inyecta los valores en el DOM de forma suave.
 */
async function loadGlobalContent() {
    try {
        // 1. Fetch de todas las configuraciones del sitio
        const { data, error } = await supabase
            .from('site_settings')
            .select('*'); // Traemos todos los registros

        if (error) {
            console.error('Error fetching site_settings:', error.message);
            return;
        }

        // 2. Transformar array en un diccionario (llave -> valor) para acceso rápido en memoria O(1)
        const contentDict = data.reduce((acc, item) => {
            acc[item.setting_key] = item.setting_value;
            return acc;
        }, {});

        // 3. Lógica de Inyección en el DOM
        applySettingsToDOM(contentDict);

    } catch (err) {
        console.error('Error inesperado en Content Loader:', err);
    }
}

function applySettingsToDOM(dictionary) {
    // A. Textos y HTML
    document.querySelectorAll('[data-content-key]').forEach(el => {
        const key = el.getAttribute('data-content-key');
        if (dictionary[key]) {
            el.innerHTML = dictionary[key];
            revealElement(el);
        }
    });

    // B. Imágenes (src)
    document.querySelectorAll('[data-src-key]').forEach(el => {
        const key = el.getAttribute('data-src-key');
        if (dictionary[key] && el.tagName === 'IMG') {
            el.src = dictionary[key];
            // Aseguramos que la transición ocurra una vez cargada la imagen
            el.onload = () => revealElement(el);
            // Si la imagen ya estaba en caché y cargó muy rápido
            if(el.complete) revealElement(el);
        }
    });

    // C. Fondos de Pantalla / Hero (style.backgroundImage)
    document.querySelectorAll('[data-bg-key]').forEach(el => {
        const key = el.getAttribute('data-bg-key');
        if (dictionary[key]) {
            el.style.backgroundImage = `url('${dictionary[key]}')`;
            revealElement(el);
        }
    });
}

/**
 * Función para transición suave (Mejora de UX)
 * Quita 'opacity-0' y añade clases de transición de Tailwind
 */
function revealElement(el) {
    // Si el elemento tenía opacity-0 intencionalmente para ocultarlo antes de cargar
    if (el.classList.contains('opacity-0')) {
        el.classList.remove('opacity-0');
        el.classList.add('transition-opacity', 'duration-500', 'opacity-100');
    }
}

// Ejecutar el motor central cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadGlobalContent);
} else {
    loadGlobalContent();
}
