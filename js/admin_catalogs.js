import { supabase } from './supabase.js';
import { requireAuth } from './admin_auth.js';

/**
 * Gestión Unificada de Catálogos con Módulo de Agentes Avanzado
 */

let activeTable = 'destinations';
let editingId = null;

const tableConfigs = {
    destinations: {
        nameField: 'name',
        fields: ['name', 'slug', 'description'],
        displayNames: ['Nombre', 'Slug', 'Descripción']
    },
    property_categories: {
        nameField: 'name',
        fields: ['name', 'slug', 'description'],
        displayNames: ['Nombre', 'Slug', 'Descripción']
    },
    agents: {
        nameField: 'full_name',
        fields: ['full_name', 'slug', 'title', 'email', 'phone', 'is_active'],
        displayNames: ['Nombre Completo', 'Slug', 'Cargo', 'Email', 'Teléfono', 'Estado']
    },
    property_amenities: {
        nameField: 'name',
        fields: ['name', 'slug', 'icon'],
        displayNames: ['Nombre', 'Slug', 'Icono']
    }
};

async function init() {
    const session = await requireAuth();
    if (!session) return;
    
    document.getElementById('user-display').textContent = session.user.email;
    loadTableData();
    setupEventListeners();
}

/**
 * Carga y renderiza los datos de la tabla activa
 */
async function loadTableData() {
    const tbody = document.getElementById('catalog-tbody');
    const loader = document.getElementById('table-loader');
    const emptyState = document.getElementById('empty-state');
    const indicator = document.getElementById('active-tab-indicator');

    tbody.innerHTML = '';
    loader.classList.remove('hidden');
    emptyState.classList.add('hidden');
    indicator.textContent = activeTable.replace('_', ' ');

    try {
        const { data, error } = await supabase
            .from(activeTable)
            .select('*')
            .order(activeTable === 'agents' ? 'display_order' : 'created_at', { ascending: true });

        if (error) throw error;
        loader.classList.add('hidden');

        if (!data || data.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        tbody.innerHTML = data.map(item => {
            const config = tableConfigs[activeTable];
            let extraInfo = '';

            if (activeTable === 'agents') {
                extraInfo = `
                    <div class="flex items-center gap-3">
                        <div class="w-2 h-2 rounded-full ${item.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}"></div>
                        <span class="text-[10px] font-bold uppercase tracking-wider">${item.title || 'Agent'}</span>
                    </div>
                `;
            } else if (activeTable === 'property_amenities') {
                extraInfo = `<span class="material-symbols-outlined text-brand-deep text-xl">${item.icon || 'star'}</span>`;
            } else {
                extraInfo = `<span class="text-[10px] text-brand-slate/60 italic line-clamp-1">${item.description || ''}</span>`;
            }

            return `
                <tr class="transition-all group border-b border-brand-sage/10">
                    <td class="px-8 py-5">
                        <div class="flex items-center gap-4">
                            ${activeTable === 'agents' ? `<img src="${item.avatar_url || '../assets/placeholder-avatar.jpg'}" class="w-10 h-10 rounded-full object-cover border border-brand-sage/30">` : ''}
                            <div>
                                <div class="font-bold text-brand-deep">${item[config.nameField]}</div>
                                <div class="text-[10px] text-brand-slate/50 font-mono uppercase">${activeTable}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-8 py-5">
                        <span class="text-xs font-mono text-brand-slate bg-brand-light/50 px-2.5 py-1 rounded-lg border border-brand-sage/20">${item.slug}</span>
                    </td>
                    <td class="px-8 py-5">${extraInfo}</td>
                    <td class="px-8 py-5 text-right">
                        <div class="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                            <button class="edit-btn p-2 hover:bg-brand-deep hover:text-white rounded-lg transition-all" data-id="${item.id}" title="Editar">
                                <span class="material-symbols-outlined text-xl">edit_note</span>
                            </button>
                            <button class="delete-btn p-2 hover:bg-red-500 hover:text-white rounded-lg transition-all" data-id="${item.id}" title="Eliminar">
                                <span class="material-symbols-outlined text-xl">delete_sweep</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

/**
 * Maneja el UPSERT unificado
 */
async function handleSubmit(e) {
    e.preventDefault();
    
    const payload = { updated_at: new Date() };
    const id = document.getElementById('entry-id').value;

    const btn = document.getElementById('submit-btn');
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> Guardando...';

    try {
        if (activeTable === 'agents') {
            let avatarUrl = document.getElementById('agent-avatar').value || null;
            const avatarFile = document.getElementById('agent-avatar-file').files[0];
            
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const filePath = `avatars/${fileName}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('agent-avatars')
                    .upload(filePath, avatarFile);
                if (uploadError) throw uploadError;
                
                const { data: { publicUrl } } = supabase.storage
                    .from('agent-avatars')
                    .getPublicUrl(filePath);
                avatarUrl = publicUrl;
            }
            
            payload.full_name = document.getElementById('agent-fullname').value;
            payload.slug = document.getElementById('agent-slug').value;
            payload.title = document.getElementById('agent-title').value;
            payload.avatar_url = avatarUrl;
            payload.bio = document.getElementById('agent-bio').value;
            payload.email = document.getElementById('agent-email').value;
            payload.phone = document.getElementById('agent-phone').value;
            payload.whatsapp = document.getElementById('agent-whatsapp').value;
            payload.linkedin_url = document.getElementById('agent-linkedin').value;
            payload.instagram_url = document.getElementById('agent-instagram').value;
            payload.display_order = parseInt(document.getElementById('agent-order').value) || 0;
            payload.is_active = document.getElementById('agent-active').checked;
        } else {
            payload.name = document.getElementById('entry-name').value;
            payload.slug = document.getElementById('entry-slug').value;
            payload.description = document.getElementById('entry-desc').value;
            
            if (activeTable === 'destinations') {
                let heroImageUrl = document.getElementById('current-dest-hero-url').dataset.url || null;
                const destHeroFile = document.getElementById('entry-dest-hero-file').files[0];
                
                if (destHeroFile) {
                    const fileExt = destHeroFile.name.split('.').pop();
                    const fileName = `${Date.now()}.${fileExt}`;
                    const filePath = `destinations/${fileName}`;
                    
                    const { error: uploadError } = await supabase.storage
                        .from('property-images')
                        .upload(filePath, destHeroFile);
                    if (uploadError) throw uploadError;
                    
                    const { data: { publicUrl } } = supabase.storage
                        .from('property-images')
                        .getPublicUrl(filePath);
                    heroImageUrl = publicUrl;
                }
                
                payload.hero_image_url = heroImageUrl;
                payload.country = document.getElementById('entry-dest-country').value || 'Mexico';
                payload.region = document.getElementById('entry-dest-region').value || null;
                payload.display_order = parseInt(document.getElementById('entry-dest-order').value) || 0;
                payload.is_featured = document.getElementById('entry-dest-featured').checked;
            } else if (activeTable === 'property_categories') {
                payload.color_hex = document.getElementById('entry-cat-color').value || null;
                payload.display_order = parseInt(document.getElementById('entry-cat-order').value) || 0;
                payload.icon = document.getElementById('entry-icon').value || null;
            } else if (activeTable === 'property_amenities') {
                payload.icon = document.getElementById('entry-icon').value;
                payload.category = document.getElementById('entry-am-category').value || null;
            }
        }

        if (id) payload.id = id;

        const { error } = await supabase.from(activeTable).upsert(payload);
        if (error) throw error;

        showToast(id ? 'Cambios sincronizados' : 'Registro creado con éxito', 'success');
        resetForm();
        loadTableData();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}

/**
 * Generador de Slugs
 */
function generateSlug(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function setupEventListeners() {
    // Tabs Switcher
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
            e.target.classList.add('tab-active');
            activeTable = e.target.dataset.tab;
            
            const agentFields = document.getElementById('agent-fields');
            const standardFields = document.getElementById('standard-fields');
            
            if (activeTable === 'agents') {
                agentFields.classList.remove('hidden');
                standardFields.classList.add('hidden');
            } else {
                agentFields.classList.add('hidden');
                standardFields.classList.remove('hidden');
                
                // Icono para amenidades y categorías
                document.getElementById('icon-container').classList.toggle('hidden', activeTable !== 'property_amenities' && activeTable !== 'property_categories');
                
                // Mostrar campos específicos según tabla activa
                document.getElementById('destination-specific-fields').classList.toggle('hidden', activeTable !== 'destinations');
                document.getElementById('category-specific-fields').classList.toggle('hidden', activeTable !== 'property_categories');
                document.getElementById('amenity-specific-fields').classList.toggle('hidden', activeTable !== 'property_amenities');
            }

            resetForm();
            loadTableData();
        });
    });

    // Slug Listeners
    document.getElementById('entry-name').addEventListener('input', (e) => {
        if (!editingId) document.getElementById('entry-slug').value = generateSlug(e.target.value);
    });

    document.getElementById('agent-fullname').addEventListener('input', (e) => {
        if (!editingId) document.getElementById('agent-slug').value = generateSlug(e.target.value);
    });

    // Icon Preview
    document.getElementById('entry-icon').addEventListener('input', (e) => {
        document.getElementById('icon-preview').textContent = e.target.value || 'star';
    });

    document.getElementById('catalog-form').addEventListener('submit', handleSubmit);
    document.getElementById('cancel-btn').addEventListener('click', resetForm);
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'login.html';
    });

    // Edit/Delete Delegation
    document.getElementById('catalog-tbody').addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        if (editBtn) handleEdit(editBtn.dataset.id);
        if (deleteBtn && confirm('¿Eliminar este registro permanentemente?')) handleDelete(deleteBtn.dataset.id);
    });
}

async function handleEdit(id) {
    try {
        const { data, error } = await supabase.from(activeTable).select('*').eq('id', id).single();
        if (error) throw error;

        editingId = id;
        document.getElementById('entry-id').value = data.id;

        if (activeTable === 'agents') {
            document.getElementById('agent-fullname').value = data.full_name || '';
            document.getElementById('agent-slug').value = data.slug || '';
            document.getElementById('agent-title').value = data.title || '';
            document.getElementById('agent-avatar').value = data.avatar_url || '';
            document.getElementById('agent-bio').value = data.bio || '';
            document.getElementById('agent-email').value = data.email || '';
            document.getElementById('agent-phone').value = data.phone || '';
            document.getElementById('agent-whatsapp').value = data.whatsapp || '';
            document.getElementById('agent-linkedin').value = data.linkedin_url || '';
            document.getElementById('agent-instagram').value = data.instagram_url || '';
            document.getElementById('agent-order').value = data.display_order || 0;
            document.getElementById('agent-active').checked = data.is_active;
            document.getElementById('current-agent-avatar-url').textContent = data.avatar_url ? 'Imagen actual: ' + data.avatar_url.split('/').pop() : '';
        } else {
            document.getElementById('entry-name').value = data.name || '';
            document.getElementById('entry-slug').value = data.slug || '';
            document.getElementById('entry-desc').value = data.description || '';
            
            if (activeTable === 'destinations') {
                document.getElementById('entry-dest-country').value = data.country || 'Mexico';
                document.getElementById('entry-dest-region').value = data.region || '';
                document.getElementById('entry-dest-order').value = data.display_order || 0;
                document.getElementById('entry-dest-featured').checked = data.is_featured || false;
                document.getElementById('current-dest-hero-url').textContent = data.hero_image_url ? 'Imagen actual: ' + data.hero_image_url.split('/').pop() : '';
                document.getElementById('current-dest-hero-url').dataset.url = data.hero_image_url || '';
            } else if (activeTable === 'property_categories') {
                document.getElementById('entry-cat-color').value = data.color_hex || '';
                document.getElementById('entry-cat-order').value = data.display_order || 0;
                document.getElementById('entry-icon').value = data.icon || 'star';
                document.getElementById('icon-preview').textContent = data.icon || 'star';
            } else if (activeTable === 'property_amenities') {
                document.getElementById('entry-icon').value = data.icon || 'star';
                document.getElementById('icon-preview').textContent = data.icon || 'star';
                document.getElementById('entry-am-category').value = data.category || '';
            }
        }

        document.getElementById('form-title').textContent = 'Editando Registro';
        document.getElementById('form-subtitle').textContent = `ID: ${id}`;
        document.getElementById('submit-btn').innerHTML = '<span class="material-symbols-outlined text-sm">update</span> Actualizar Registro';
        document.getElementById('cancel-btn').classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        showToast('Error al cargar datos', 'error');
    }
}

async function handleDelete(id) {
    try {
        const { error } = await supabase.from(activeTable).delete().eq('id', id);
        if (error) throw error;
        showToast('Registro eliminado', 'success');
        loadTableData();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

function resetForm() {
    editingId = null;
    document.getElementById('catalog-form').reset();
    document.getElementById('entry-id').value = '';
    document.getElementById('form-title').textContent = 'Gestionar Registro';
    document.getElementById('form-subtitle').textContent = 'Añadiendo nuevo elemento';
    document.getElementById('submit-btn').innerHTML = '<span class="material-symbols-outlined text-sm">save</span> Guardar Registro';
    document.getElementById('cancel-btn').classList.add('hidden');
    document.getElementById('icon-preview').textContent = 'star';

    // Limpiar campos específicos de catálogos
    const destHero = document.getElementById('current-dest-hero-url');
    if (destHero) {
        destHero.textContent = '';
        destHero.dataset.url = '';
    }
    const agentAvatar = document.getElementById('current-agent-avatar-url');
    if (agentAvatar) {
        agentAvatar.textContent = '';
    }
    const agentAvatarHidden = document.getElementById('agent-avatar');
    if (agentAvatarHidden) {
        agentAvatarHidden.value = '';
    }
    
    // Forzar re-preview del icono
    const iconPreview = document.getElementById('icon-preview');
    if (iconPreview) iconPreview.textContent = 'star';
}

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `fixed bottom-8 right-8 px-8 py-4 rounded-2xl shadow-2xl transition-all duration-500 z-[100] ${
        type === 'success' ? 'bg-[#3D6C9D] text-white border border-white/20' : 'bg-red-600 text-white'
    }`;
    toast.classList.remove('translate-y-24', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-24', 'opacity-0'), 4000);
}

init();
