import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    await loadLayout();
    await loadConciergeSettings();
    await loadServices();
    setupForm();
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
 * Carga textos e imágenes del Hero/CTA
 */
async function loadConciergeSettings() {
    try {
        const { data, error } = await supabase.from('concierge_settings').select('*');
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
            if (settings[key] && el.tagName === 'IMG') {
                el.src = settings[key];
            }
        });
    } catch (err) {
        console.error('Error al cargar settings de concierge:', err);
    }
}

/**
 * Renderiza la cuadrícula de servicios
 */
async function loadServices() {
    try {
        const { data: services, error } = await supabase
            .from('concierge_services')
            .select('*')
            .order('display_order', { ascending: true });

        if (error) throw error;

        const grid = document.getElementById('services-grid');
        if (!grid || !services) return;

        grid.innerHTML = ''; // Vaciar por si acaso

        services.forEach((service, index) => {
            // Alternar md:col-span-8 y md:col-span-4 para diseño asimétrico
            const spanClass = index % 2 === 0 ? 'md:col-span-8' : 'md:col-span-4';
            
            const card = document.createElement('div');
            card.className = `${spanClass} bg-surface-container-lowest p-10 rounded-xl flex flex-col justify-between group transition-all duration-500 hover:shadow-xl overflow-hidden relative`;
            
            card.innerHTML = `
                <div class="relative z-10 flex-1">
                    <span class="material-symbols-outlined text-primary text-4xl mb-8 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">${service.icon || 'star'}</span>
                    <h2 class="text-3xl font-bold mb-4">${service.title}</h2>
                    <p class="text-on-surface-variant font-light leading-relaxed mb-8">${service.description}</p>
                </div>
                <div class="relative z-10 mt-auto flex items-center">
                    <button class="bg-surface-container-low text-primary px-8 py-3 rounded-xl font-bold hover:bg-primary hover:text-on-primary transition-all duration-300 flex items-center gap-2">
                        Request Service <span class="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                </div>
                <!-- Subtle Gradient Hover Effect -->
                <div class="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            `;
            grid.appendChild(card);
        });

    } catch (err) {
        console.error('Error al cargar servicios:', err);
    }
}

/**
 * Maneja el formulario de Concierge
 */
function setupForm() {
    const form = document.getElementById('concierge-form');
    if (!form) return;

    const errorMsg = document.getElementById('concierge-error');
    const successMsg = document.getElementById('concierge-success');
    const btn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('concierge-name').value.trim();
        const email = document.getElementById('concierge-email').value.trim();
        const message = document.getElementById('concierge-message').value.trim();

        // UI Feedback
        btn.disabled = true;
        btn.innerHTML = 'Sending Request...';
        btn.classList.add('opacity-80', 'cursor-not-allowed');
        errorMsg.classList.add('hidden');
        successMsg.classList.add('hidden');

        try {
            // 1. Registrar Lead
            const { error: insertError } = await supabase.from('property_leads').insert([{
                full_name: name,
                contact_method: 'email',
                contact_value: email,
                location: 'Concierge Service',
                event_type: 'message_sent'
            }]);

            if (insertError) throw insertError;

            // 2. Obtener número de WhatsApp dinámico
            let waNumber = '5211234567890'; // Default fallback
            const { data: contactSettings } = await supabase.from('sticky_contact_settings').select('*');
            if (contactSettings) {
                const waSetting = contactSettings.find(s => s.setting_key === 'whatsapp_number');
                if (waSetting && waSetting.setting_value) {
                    // Limpiar número (remover +, espacios, etc)
                    waNumber = waSetting.setting_value.replace(/[^0-9]/g, '');
                }
            }

            // 3. UI Success & Reset
            successMsg.classList.remove('hidden');
            form.reset();
            
            // 4. Redirigir a WhatsApp
            const text = encodeURIComponent(`Hola, requiero un servicio de Concierge especializado:\n\n${message}`);
            window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank');

        } catch (err) {
            console.error('Error procesando concierge form:', err);
            errorMsg.textContent = 'Hubo un error al procesar tu solicitud. Por favor intenta de nuevo.';
            errorMsg.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Contact a Specialist';
            btn.classList.remove('opacity-80', 'cursor-not-allowed');
        }
    });
}
