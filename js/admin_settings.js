import { supabase } from './supabase.js';
import { requireAuth } from './admin_auth.js';

let currentSession = null;
let currentTab = 'dashboard';

// Mapeo de Pestañas a Tablas de Supabase
const TAB_TABLE_MAP = {
    home: 'home_settings',
    portfolio: 'portfolio_settings',
    about: 'about_settings',
    destination: 'destination_settings',
    concierge: 'concierge_settings',
    legal: 'legal_settings'
};

// Colecciones Asociadas
const TAB_COLLECTION_MAP = {
    destination: { table: 'destination_experiences', title: 'Destination Experiences' },
    concierge: { table: 'concierge_services', title: 'Concierge Services' }
};

document.addEventListener('DOMContentLoaded', async () => {
    currentSession = await requireAuth();
    if (!currentSession) return;

    const userDisplay = document.getElementById('user-display');
    if (userDisplay && currentSession.user && currentSession.user.email) {
        userDisplay.textContent = currentSession.user.email;
    }

    setupLogout();
    setupTabs();
    
    // Cargar tab inicial
    loadTabContent('dashboard');
});

/**
 * Hard Reset Logout Protocol
 */
function setupLogout() {
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        if (!confirm('¿Cerrar sesión?')) return;
        await supabase.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('login.html');
    });
}

/**
 * Gestión de Pestañas
 */
function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // UI Update
            tabs.forEach(t => {
                t.classList.remove('bg-brand-deep', 'text-white', 'shadow-lg', 'active');
                t.classList.add('text-brand-slate');
            });
            tab.classList.remove('text-brand-slate');
            tab.classList.add('bg-brand-deep', 'text-white', 'shadow-lg', 'active');

            // Logic Update
            currentTab = tab.getAttribute('data-tab');
            loadTabContent(currentTab);
        });
    });

    // Evento de Guardado
    document.getElementById('dynamic-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveSettings();
    });
    
    // Cerrar Modal
    document.getElementById('close-modal').addEventListener('click', closeCollectionModal);
    document.getElementById('btn-cancel').addEventListener('click', closeCollectionModal);
    
    // Guardar Item de Colección
    document.getElementById('item-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveCollectionItem();
    });
    
    // Abrir Modal Agregar
    document.getElementById('btn-add-item').addEventListener('click', () => {
        document.getElementById('item-form').reset();
        document.getElementById('item-id').value = '';
        document.getElementById('modal-title').textContent = 'Add New Item';
        document.getElementById('item-modal').classList.remove('hidden');
        // Pequeño delay para la animación
        setTimeout(() => {
            document.getElementById('item-modal').classList.add('opacity-100');
            document.getElementById('item-modal-content').classList.remove('scale-95');
        }, 10);
    });
}

/**
 * Carga el contenido según la pestaña activa
 */
async function loadTabContent(tabName) {
    const loading = document.getElementById('panel-loading');
    const panelDashboard = document.getElementById('panel-dashboard');
    const panelSettings = document.getElementById('panel-settings');
    const collectionManager = document.getElementById('collection-manager');
    
    loading.classList.remove('hidden');

    try {
        if (tabName === 'dashboard') {
            panelSettings.classList.add('hidden');
            panelDashboard.classList.remove('hidden');
            await loadAnalytics();
        } else {
            panelDashboard.classList.add('hidden');
            panelSettings.classList.remove('hidden');
            panelSettings.classList.add('flex');
            
            // Textos del Panel
            document.getElementById('settings-title').textContent = tabName.charAt(0).toUpperCase() + tabName.slice(1) + ' Settings';
            
            // Cargar Formulario Dinámico
            await generateDynamicForm(tabName);
            
            // Cargar Gestor de Colecciones si aplica
            if (TAB_COLLECTION_MAP[tabName]) {
                collectionManager.classList.remove('hidden');
                document.getElementById('collection-title').textContent = TAB_COLLECTION_MAP[tabName].title;
                await loadCollectionItems(tabName);
            } else {
                collectionManager.classList.add('hidden');
            }
        }
    } catch (err) {
        console.error('Error loading tab:', err);
        showToast('Error loading panel data', true);
    } finally {
        loading.classList.add('hidden');
    }
}

/**
 * Carga Analíticas (Agrupadas desde property_leads)
 */
async function loadAnalytics() {
    try {
        const { data: leads, error } = await supabase.from('property_leads').select('*');
        if (error) throw error;

        const tbody = document.getElementById('analytics-tbody');
        tbody.innerHTML = '';

        if (!leads || leads.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-brand-slate/60">No analytics data available yet.</td></tr>';
            return;
        }

        // Agrupar por "location" o "property_title" (lo que esté disponible, a veces es Concierge Service)
        const summary = {};
        
        leads.forEach(lead => {
            const key = lead.property_title || lead.location || 'Unknown Source';
            if (!summary[key]) {
                summary[key] = { msgs: 0, downloads: 0, total: 0 };
            }
            if (lead.event_type === 'message_sent') summary[key].msgs++;
            if (lead.event_type === 'brochure_download') summary[key].downloads++;
            summary[key].total++;
        });

        Object.entries(summary).sort((a, b) => b[1].total - a[1].total).forEach(([source, metrics]) => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-brand-light/20 transition-colors';
            tr.innerHTML = `
                <td class="px-6 py-4 font-medium text-brand-deep">${source}</td>
                <td class="px-6 py-4 text-center">${metrics.msgs}</td>
                <td class="px-6 py-4 text-center">${metrics.downloads}</td>
                <td class="px-6 py-4 text-center font-bold text-brand-sky">${metrics.total}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error('Error loading analytics:', err);
    }
}

/**
 * Genera el formulario dinámicamente según las llaves en BD
 */
async function generateDynamicForm(tabName) {
    const table = TAB_TABLE_MAP[tabName];
    if (!table) return;

    const { data: settings, error } = await supabase.from(table).select('*').order('setting_key');
    if (error) throw error;

    const form = document.getElementById('dynamic-form');
    form.innerHTML = '';

    if (!settings || settings.length === 0) {
        form.innerHTML = '<p class="text-brand-slate/60 italic p-4 bg-brand-sage/10 rounded-xl">No configuration keys found for this section. Please add them in Supabase first.</p>';
        return;
    }

    settings.forEach(item => {
        const isUrl = item.setting_key.includes('image') || item.setting_key.includes('video') || item.setting_value.startsWith('http');
        const isLargeText = item.setting_value.length > 100 || item.setting_key.includes('policy') || item.setting_key.includes('terms') || item.setting_key.includes('text') || item.setting_key.includes('desc');
        
        const wrapper = document.createElement('div');
        wrapper.className = 'space-y-2 bg-white/40 p-4 rounded-xl border border-brand-sage/20';
        
        const labelDiv = document.createElement('div');
        labelDiv.className = 'flex justify-between items-center';
        labelDiv.innerHTML = `
            <label class="font-bold text-brand-deep text-sm tracking-wide uppercase">${formatKeyName(item.setting_key)}</label>
            <span class="text-[9px] font-mono bg-brand-light text-brand-slate px-2 py-1 rounded">${item.setting_key}</span>
        `;
        
        let inputEl;
        
        if (isLargeText) {
            inputEl = document.createElement('textarea');
            inputEl.rows = "4";
            inputEl.className = 'w-full px-4 py-3 rounded-lg bg-white border border-brand-sage/50 focus:ring-2 focus:ring-brand-sky outline-none custom-scrollbar text-sm';
            inputEl.value = item.setting_value;
        } else {
            inputEl = document.createElement('input');
            inputEl.type = 'text';
            inputEl.className = 'w-full px-4 py-3 rounded-lg bg-white border border-brand-sage/50 focus:ring-2 focus:ring-brand-sky outline-none text-sm';
            inputEl.value = item.setting_value;
            
            if (isUrl) {
                const previewBtn = document.createElement('button');
                previewBtn.type = 'button';
                previewBtn.textContent = 'Preview Media';
                previewBtn.className = 'text-xs text-brand-sky underline font-bold mt-2 hover:text-brand-deep';
                previewBtn.onclick = () => window.open(inputEl.value, '_blank');
                wrapper.appendChild(previewBtn);
            }
        }
        
        inputEl.name = item.setting_key;
        inputEl.dataset.original = item.setting_value;
        
        wrapper.insertBefore(labelDiv, wrapper.firstChild);
        wrapper.appendChild(inputEl);
        form.appendChild(wrapper);
    });
}

function formatKeyName(key) {
    return key.replace(/_/g, ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase());
}

/**
 * Guarda los cambios del panel activo
 */
async function saveSettings() {
    if (currentTab === 'dashboard') return;
    const table = TAB_TABLE_MAP[currentTab];
    if (!table) return;

    const form = document.getElementById('dynamic-form');
    const inputs = form.querySelectorAll('input, textarea');
    const updates = [];

    inputs.forEach(input => {
        if (input.value !== input.dataset.original) {
            updates.push({
                setting_key: input.name,
                setting_value: input.value
            });
        }
    });

    if (updates.length === 0) {
        showToast('No changes detected.');
        return;
    }

    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Guardando...';
    btn.disabled = true;

    try {
        const { error } = await supabase.from(table).upsert(updates, { onConflict: 'setting_key' });
        if (error) throw error;

        // Actualizar valores originales
        inputs.forEach(input => input.dataset.original = input.value);
        showToast(`${currentTab.toUpperCase()} configuration updated successfully.`);
    } catch (err) {
        console.error('Error saving settings:', err);
        showToast('Error saving changes', true);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

/**
 * Carga Ítems de la Colección (Experiences / Services)
 */
async function loadCollectionItems(tabName) {
    const config = TAB_COLLECTION_MAP[tabName];
    const { data: items, error } = await supabase.from(config.table).select('*').order('display_order', { ascending: true });
    
    const list = document.getElementById('collection-list');
    list.innerHTML = '';

    if (error) {
        console.error('Error loading collection:', error);
        return;
    }

    if (!items || items.length === 0) {
        list.innerHTML = '<p class="text-sm text-brand-slate/60">No items found. Create one above.</p>';
        return;
    }

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'bg-white p-4 rounded-xl border border-brand-sage/30 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow';
        div.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-lg bg-brand-light flex items-center justify-center overflow-hidden flex-shrink-0">
                    ${item.image_url ? `<img src="${item.image_url}" class="w-full h-full object-cover">` : `<span class="material-symbols-outlined text-brand-deep">${item.icon || 'star'}</span>`}
                </div>
                <div>
                    <h4 class="font-bold text-brand-deep text-sm">${item.title}</h4>
                    <p class="text-xs text-brand-slate/70 line-clamp-1">${item.description || item.category || ''}</p>
                </div>
            </div>
            <div class="flex gap-2">
                <button class="btn-edit-item text-brand-sky hover:text-brand-deep p-2 bg-brand-sky/10 rounded-lg transition-colors" data-id="${item.id}">
                    <span class="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button class="btn-delete-item text-red-400 hover:text-red-600 p-2 bg-red-50 rounded-lg transition-colors" data-id="${item.id}">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
            </div>
        `;
        list.appendChild(div);
    });

    // Event Listeners for Edit/Delete
    list.querySelectorAll('.btn-edit-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = items.find(i => i.id === btn.dataset.id);
            if (item) openCollectionModal(item);
        });
    });

    list.querySelectorAll('.btn-delete-item').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to delete this item?')) return;
            try {
                const { error } = await supabase.from(config.table).delete().eq('id', btn.dataset.id);
                if (error) throw error;
                showToast('Item deleted successfully.');
                loadCollectionItems(currentTab);
            } catch (err) {
                showToast('Error deleting item', true);
            }
        });
    });
}

function openCollectionModal(item) {
    document.getElementById('modal-title').textContent = 'Edit Item';
    document.getElementById('item-id').value = item.id;
    document.getElementById('item-title').value = item.title || '';
    document.getElementById('item-desc').value = item.description || '';
    document.getElementById('item-image').value = item.image_url || item.icon || '';
    document.getElementById('item-category').value = item.category || '';
    document.getElementById('item-order').value = item.display_order || 0;
    
    document.getElementById('item-modal').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('item-modal').classList.add('opacity-100');
        document.getElementById('item-modal-content').classList.remove('scale-95');
    }, 10);
}

function closeCollectionModal() {
    document.getElementById('item-modal').classList.remove('opacity-100');
    document.getElementById('item-modal-content').classList.add('scale-95');
    setTimeout(() => {
        document.getElementById('item-modal').classList.add('hidden');
    }, 300);
}

async function saveCollectionItem() {
    const config = TAB_COLLECTION_MAP[currentTab];
    if (!config) return;

    const id = document.getElementById('item-id').value;
    const isImage = document.getElementById('item-image').value.startsWith('http');
    
    const payload = {
        title: document.getElementById('item-title').value,
        description: document.getElementById('item-desc').value,
        category: document.getElementById('item-category').value,
        display_order: parseInt(document.getElementById('item-order').value) || 0
    };

    if (currentTab === 'destination') {
        payload.image_url = isImage ? document.getElementById('item-image').value : '';
    } else if (currentTab === 'concierge') {
        payload.icon = document.getElementById('item-image').value; // Usamos la misma entrada para icon
    }

    try {
        let res;
        if (id) {
            res = await supabase.from(config.table).update(payload).eq('id', id);
        } else {
            res = await supabase.from(config.table).insert([payload]);
        }
        if (res.error) throw res.error;

        showToast('Item saved successfully.');
        closeCollectionModal();
        loadCollectionItems(currentTab);
    } catch (err) {
        console.error('Error saving item:', err);
        showToast('Error saving item', true);
    }
}

/**
 * Toast Notifications
 */
let toastTimeout;
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toast-msg');
    const icon = document.getElementById('toast-icon');

    msg.textContent = message;
    
    if (isError) {
        toast.classList.replace('border-brand-sage/30', 'border-red-200');
        icon.textContent = 'error';
        icon.classList.replace('text-brand-mint', 'text-red-500');
    } else {
        toast.classList.replace('border-red-200', 'border-brand-sage/30');
        icon.textContent = 'check_circle';
        icon.classList.replace('text-red-500', 'text-brand-mint');
    }

    toast.classList.remove('translate-y-24', 'opacity-0');
    
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.add('translate-y-24', 'opacity-0');
    }, 4000);
}
