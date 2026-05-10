import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inyectar el contenedor del modal en el body
    const modalHTML = `
        <div id="dynamic-legal-modal" class="fixed inset-0 z-[100] hidden items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity duration-300 opacity-0">
            <div class="bg-white/90 backdrop-blur-2xl border border-white shadow-2xl w-full max-w-3xl max-h-[80vh] rounded-3xl overflow-hidden flex flex-col relative transform scale-95 transition-transform duration-300" id="dynamic-legal-modal-inner">
                
                <!-- Header -->
                <div class="flex justify-between items-center p-6 border-b border-slate-200/50">
                    <h3 id="dynamic-legal-title" class="text-xl font-bold text-sky-900 uppercase tracking-widest text-sm">Información Legal</h3>
                    <button id="close-dynamic-legal-modal" class="p-2 text-slate-400 hover:text-sky-900 transition-colors rounded-full hover:bg-slate-100/50">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <!-- Content -->
                <div id="dynamic-legal-content" class="p-8 overflow-y-auto custom-scrollbar text-sm text-slate-600 leading-relaxed font-sans flex-1">
                    <!-- Contenido dinámico -->
                </div>
                
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('dynamic-legal-modal');
    const modalInner = document.getElementById('dynamic-legal-modal-inner');
    const modalTitle = document.getElementById('dynamic-legal-title');
    const modalContent = document.getElementById('dynamic-legal-content');
    const closeBtn = document.getElementById('close-dynamic-legal-modal');

    const openModal = async (target) => {
        // Mostrar modal (Fade in)
        modal.classList.remove('hidden');
        // Pequeño delay para permitir que el display:block se aplique antes de animar opacidad
        requestAnimationFrame(() => {
            modal.classList.add('flex');
            modal.classList.remove('opacity-0');
            modalInner.classList.remove('scale-95');
        });

        const titles = {
            'privacy_policy': 'Política de Privacidad',
            'terms_of_service': 'Términos de Servicio'
        };
        
        modalTitle.textContent = titles[target] || 'Información Legal';
        modalContent.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 gap-4">
                <span class="material-symbols-outlined animate-spin text-sky-900 text-4xl">sync</span>
                <p class="italic text-slate-400">Cargando documento oficial...</p>
            </div>
        `;

        try {
            const { data, error } = await supabase
                .from('legal_settings')
                .select('setting_value')
                .eq('setting_key', target)
                .single();

            if (error) {
                if (error.code === 'PGRST116') { // No rows found
                    modalContent.innerHTML = `
                        <div class="py-12 text-center">
                            <span class="material-symbols-outlined text-4xl text-slate-300 mb-4">description</span>
                            <p class="text-slate-500 italic">El documento solicitado no se encuentra disponible actualmente.</p>
                        </div>
                    `;
                    return;
                }
                throw error;
            }

            if (data && data.setting_value) {
                // Inyectar contenido. Reemplazamos saltos de línea por <br> si es texto plano.
                const content = data.setting_value.includes('<') ? data.setting_value : data.setting_value.replace(/\n/g, '<br>');
                modalContent.innerHTML = content;
            } else {
                modalContent.innerHTML = '<p class="text-center py-8 text-slate-400 italic">No hay contenido disponible para mostrar.</p>';
            }
        } catch (err) {
            console.error('Error fetching legal content:', err);
            modalContent.innerHTML = `
                <div class="py-12 text-center text-red-500">
                    <span class="material-symbols-outlined text-4xl mb-2">error</span>
                    <p>Hubo un problema al cargar el documento legal. Por favor, intente de nuevo más tarde.</p>
                </div>
            `;
        }
    };

    const closeModal = () => {
        modal.classList.add('opacity-0');
        modalInner.classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 300); // Wait for transition
    };

    // Delegación de eventos para los links (necesario porque el footer puede ser inyectado dinámicamente)
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-legal-target]');
        if (trigger) {
            e.preventDefault();
            const target = trigger.getAttribute('data-legal-target');
            openModal(target);
        }
    });

    // Eventos de Cierre
    closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });
});
