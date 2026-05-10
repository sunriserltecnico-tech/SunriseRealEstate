import { supabase } from './supabase.js';
import { requireAuth } from './admin_auth.js';

let requestsList = [];

async function init() {
    const session = await requireAuth();
    if (!session) return;
    
    document.getElementById('user-display').textContent = session.user.email;
    
    loadRequests();
    setupSortable();
    setupEventListeners();
}

/**
 * Carga las solicitudes de la base de datos
 */
async function loadRequests() {
    try {
        const { data, error } = await supabase
            .from('listing_requests')
            .select('*')
            .neq('status', 'approved')
            .order('created_at', { ascending: false });

        if (error) throw error;

        requestsList = data;
        renderBoard();
        
    } catch (err) {
        console.error('Error loading requests:', err);
        showToast('Error al cargar solicitudes', 'error');
    }
}

/**
 * Renderiza las tarjetas en sus respectivas columnas
 */
function renderBoard() {
    const cols = {
        pending: document.getElementById('col-pending'),
        reviewed: document.getElementById('col-reviewed'),
        rejected: document.getElementById('col-rejected')
    };

    // Limpiar columnas
    Object.values(cols).forEach(col => col.innerHTML = '');

    const now = new Date();

    requestsList.forEach(req => {
        // Filtrar rechazadas antiguas (> 7 días)
        if (req.status === 'rejected') {
            const updatedAt = new Date(req.updated_at);
            const diffDays = (now - updatedAt) / (1000 * 60 * 60 * 24);
            if (diffDays > 7) return;
        }

        const card = createCard(req);
        if (cols[req.status]) {
            cols[req.status].appendChild(card);
        }
    });

    // Actualizar contadores
    document.getElementById('count-pending').textContent = requestsList.filter(r => r.status === 'pending').length;
    document.getElementById('count-reviewed').textContent = requestsList.filter(r => r.status === 'reviewed').length;
    document.getElementById('count-rejected').textContent = requestsList.filter(r => r.status === 'rejected').length;
}

/**
 * Crea el elemento HTML de la tarjeta
 */
function createCard(req) {
    const card = document.createElement('div');
    card.className = 'bg-slate-900/50 border border-white/5 p-4 rounded-xl cursor-grab active:cursor-grabbing hover:border-blue-500/30 transition-all group relative animate-fade-in';
    card.dataset.id = req.id;

    const updatedAt = new Date(req.updated_at);
    const diffDays = (new Date() - updatedAt) / (1000 * 60 * 60 * 24);
    const isOverdue = req.status === 'reviewed' && diffDays > 2;

    card.innerHTML = `
        ${isOverdue ? `
            <div class="absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 bg-orange-500 rounded-full shadow-lg shadow-orange-500/20 z-10 animate-pulse">
                <span class="material-symbols-outlined text-[14px] text-white font-bold">priority_high</span>
            </div>
        ` : ''}
        <div class="flex justify-between items-start mb-2">
            <span class="text-[10px] font-bold uppercase tracking-widest text-blue-400/80">${req.property_type}</span>
            <span class="text-[10px] text-slate-500">${new Date(req.created_at).toLocaleDateString()}</span>
        </div>
        <h4 class="font-bold text-sm text-white mb-1 truncate">${req.title || 'Sin título'}</h4>
        <div class="text-xs text-slate-400 mb-3 flex items-center gap-1">
            <span class="material-symbols-outlined text-xs">person</span>
            ${req.contact_name} ${req.contact_lastname}
        </div>
        <div class="flex justify-between items-center pt-3 border-t border-white/5">
            <span class="font-mono text-blue-400 text-xs font-bold">$${new Intl.NumberFormat().format(req.price)}</span>
            <button class="view-detail-btn text-[10px] uppercase font-bold text-slate-500 hover:text-white transition-colors">Detalles</button>
        </div>
    `;

    card.querySelector('.view-detail-btn').addEventListener('click', () => openModal(req));

    return card;
}

/**
 * Configuración de SortableJS
 */
function setupSortable() {
    const columns = ['col-pending', 'col-reviewed', 'col-rejected'];
    
    columns.forEach(id => {
        new Sortable(document.getElementById(id), {
            group: 'kanban',
            ghostClass: 'card-ghost',
            animation: 150,
            onEnd: async (evt) => {
                const id = evt.item.dataset.id;
                const newStatus = evt.to.dataset.status;
                
                if (evt.from !== evt.to) {
                    await updateRequestStatus(id, newStatus);
                }
            }
        });
    });

    // Zona especial de aprobación
    new Sortable(document.getElementById('approve-zone'), {
        group: 'kanban',
        ghostClass: 'card-ghost',
        onAdd: async (evt) => {
            const id = evt.item.dataset.id;
            // Eliminar tarjeta visualmente mientras se procesa
            evt.item.remove();
            await convertToProperty(id);
        }
    });
}

/**
 * Actualiza el estado en Supabase
 */
async function updateRequestStatus(id, status) {
    try {
        const { data, error } = await supabase
            .from('listing_requests')
            .update({ status, updated_at: new Date() })
            .eq('id', id)
            .select();

        if (error) throw error;
        
        showToast(`Estado actualizado a: ${status}`, 'success');
        loadRequests(); // Recargar para actualizar contadores y fechas
        
    } catch (err) {
        console.error('Error updating status:', err);
        showToast('Error al actualizar estado', 'error');
        loadRequests(); // Revertir visualmente
    }
}

/**
 * AUTOMATIZACIÓN CRÍTICA: Convierte solicitud en propiedad (Draft)
 */
async function convertToProperty(id) {
    const req = requestsList.find(r => r.id === id);
    if (!req) return;

    try {
        showToast('Convirtiendo solicitud...', 'info');

        // 1. Crear el objeto Property (Draft)
        const propertyPayload = {
            title: req.title,
            slug: req.title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Date.now().toString(36),
            description: req.description,
            price: req.price,
            status: 'draft',
            listing_type: req.operation_type === 'Venta' ? 'sale' : 'rent',
            // Mapeo de campos técnicos
            built_area_sqm: req.built_area_sqm,
            total_area_sqm: req.total_area_sqm,
            half_bathrooms: req.half_bathrooms,
            parking_spaces: req.parking_spaces,
            age_status: req.age_status,
            antiquity_years: req.antiquity_years,
            maintenance_fee: req.maintenance_fee,
            property_subtype: req.property_subtype,
            // Valores por defecto para que no truene si son obligatorios
            is_published: false,
            is_featured: false
        };

        const { data: propData, error: propError } = await supabase
            .from('properties')
            .insert([propertyPayload])
            .select();

        if (propError) throw propError;

        // 2. Marcar solicitud como aprobada
        const { error: reqError } = await supabase
            .from('listing_requests')
            .update({ status: 'approved', updated_at: new Date() })
            .eq('id', id);

        if (reqError) throw reqError;

        showToast('¡Propiedad creada como BORRADOR con éxito!', 'success');
        loadRequests();

    } catch (err) {
        console.error('Error during conversion:', err);
        showToast('Error en conversión: ' + err.message, 'error');
        loadRequests();
    }
}

/**
 * Lógica del Modal
 */
let currentModalRequestId = null;

function openModal(req) {
    currentModalRequestId = req.id;
    const modal = document.getElementById('detail-modal');
    const content = document.getElementById('modal-content');
    
    document.getElementById('modal-title').textContent = req.title || 'Detalles de Solicitud';

    // Renderizar amenidades solicitadas
    const amenitiesHtml = req.requested_amenities && req.requested_amenities.length > 0 
        ? req.requested_amenities.map(am => `<span class="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-[10px] font-bold border border-blue-500/20">${am}</span>`).join('')
        : '<span class="text-slate-600 italic">Ninguna seleccionada</span>';

    content.innerHTML = `
        <div class="space-y-6">
            <section>
                <h5 class="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Información de Contacto</h5>
                <div class="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2">
                    <p class="text-sm font-bold text-white">${req.contact_name} ${req.contact_lastname}</p>
                    <p class="text-xs text-slate-400">${req.fiscal_condition} | Doc: ${req.legal_document}</p>
                    <div class="flex gap-4 pt-2">
                        <a href="tel:${req.mobile_phone}" class="text-blue-400 text-xs flex items-center gap-1 hover:underline"><span class="material-symbols-outlined text-sm">call</span> ${req.mobile_phone}</a>
                        ${req.alt_phone ? `<span class="text-slate-600 text-xs">Alt: ${req.alt_phone}</span>` : ''}
                    </div>
                </div>
            </section>
            
            <section>
                <h5 class="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Ubicación</h5>
                <div class="bg-white/5 p-4 rounded-xl border border-white/5">
                    <p class="text-sm text-white">${req.address_street}</p>
                    <p class="text-xs text-slate-400">${req.address_neighborhood}, ${req.address_city}, ${req.address_state}</p>
                    <p class="text-[10px] text-blue-500 mt-2">Preferencia: ${req.location_preference}</p>
                </div>
            </section>
        </div>

        <div class="space-y-6">
            <section>
                <h5 class="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Ficha Técnica</h5>
                <div class="grid grid-cols-2 gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                    <div>
                        <p class="text-[10px] text-slate-500 uppercase">Construcción</p>
                        <p class="text-xs font-bold text-white">${req.built_area_sqm} m²</p>
                    </div>
                    <div>
                        <p class="text-[10px] text-slate-500 uppercase">Terreno</p>
                        <p class="text-xs font-bold text-white">${req.total_area_sqm} m²</p>
                    </div>
                    <div>
                        <p class="text-[10px] text-slate-500 uppercase">Cuartos / Baños</p>
                        <p class="text-xs font-bold text-white">${req.bedrooms} / ${req.bathrooms} (+${req.half_bathrooms})</p>
                    </div>
                    <div>
                        <p class="text-[10px] text-slate-500 uppercase">Antigüedad</p>
                        <p class="text-xs font-bold text-white">${req.age_status} ${req.antiquity_years ? `(${req.antiquity_years} años)` : ''}</p>
                    </div>
                </div>
            </section>

            <section>
                <h5 class="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Amenidades Solicitadas</h5>
                <div class="flex flex-wrap gap-2">
                    ${amenitiesHtml}
                </div>
            </section>

            <section>
                <h5 class="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Descripción</h5>
                <p class="text-xs text-slate-400 leading-relaxed italic border-l-2 border-white/10 pl-4">${req.description}</p>
            </section>
        </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

/**
 * Utilidades
 */
function setupEventListeners() {
    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('detail-modal').classList.add('hidden');
    });

    document.getElementById('modal-reject').addEventListener('click', () => {
        if (currentModalRequestId) {
            updateRequestStatus(currentModalRequestId, 'rejected');
            document.getElementById('detail-modal').classList.add('hidden');
        }
    });

    document.getElementById('modal-approve').addEventListener('click', () => {
        if (currentModalRequestId) {
            convertToProperty(currentModalRequestId);
            document.getElementById('detail-modal').classList.add('hidden');
        }
    });

    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'login.html';
    });
}

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `fixed bottom-8 right-8 px-6 py-3 rounded-xl shadow-2xl transition-all duration-500 z-[200] ${
        type === 'success' ? 'bg-green-600 text-white' : 
        type === 'info' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
    }`;
    toast.classList.remove('translate-y-24', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-24', 'opacity-0'), 3000);
}

init();
