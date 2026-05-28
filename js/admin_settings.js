import { supabase } from './supabase.js';
import { requireAuth } from './admin_auth.js';

let currentSession = null;
let currentTab = 'dashboard';
let modalQuill = null;

// Whitelist de tamaños de fuente en pixeles de 10px a 64px de 2 en 2
const quillSizeList = [];
for (let i = 10; i <= 64; i += 2) {
    quillSizeList.push(i + 'px');
}

// Registrar Blots personalizados en Quill para formato de títulos y estilos de tamaño
if (typeof Quill !== 'undefined') {
    const SizeStyle = Quill.import('attributors/style/size');
    SizeStyle.whitelist = quillSizeList;
    Quill.register(SizeStyle, true);

    const Inline = Quill.import('blots/inline');
    const Embed = Quill.import('blots/embed');

    class SmallTitleBlot extends Inline {
        static create() {
            const node = super.create();
            node.setAttribute('class', 'text-2xl font-normal block md:inline-block');
            return node;
        }
        static formats() {
            return true;
        }
    }
    SmallTitleBlot.blotName = 'small-title';
    SmallTitleBlot.tagName = 'span';
    Quill.register(SmallTitleBlot);

    class ItalicTitleBlot extends Inline {
        static create() {
            const node = super.create();
            node.setAttribute('class', 'italic font-normal');
            return node;
        }
        static formats() {
            return true;
        }
    }
    ItalicTitleBlot.blotName = 'italic-title';
    ItalicTitleBlot.tagName = 'span';
    Quill.register(ItalicTitleBlot);

    class LineBreakBlot extends Embed {
        static create() {
            return document.createElement('br');
        }
        static value() {
            return true;
        }
    }
    LineBreakBlot.blotName = 'break';
    LineBreakBlot.tagName = 'br';
    Quill.register(LineBreakBlot);
}

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
    setupModalQuill();
    
    // Cargar tab inicial
    loadTabContent('dashboard');
});

function setupModalQuill() {
    const modalQuillContainer = document.getElementById('modal-quill-editor');
    if (modalQuillContainer && typeof Quill !== 'undefined') {
        modalQuill = new Quill(modalQuillContainer, {
            theme: 'snow',
            placeholder: 'Escribe la descripción aquí...',
            modules: {
                toolbar: [
                    [{ 'size': quillSizeList }],
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link', 'clean']
                ]
            }
        });
        
        const itemDescInput = document.getElementById('item-desc');
        modalQuill.on('text-change', () => {
            itemDescInput.value = modalQuill.root.innerHTML === '<p><br></p>' ? '' : modalQuill.root.innerHTML;
        });
    }
}

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
        if (modalQuill) {
            modalQuill.root.innerHTML = '';
        }
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
    const panelLeads = document.getElementById('panel-leads');
    const collectionManager = document.getElementById('collection-manager');
    
    loading.classList.remove('hidden');

    try {
        // Hide all panels first
        panelDashboard.classList.add('hidden');
        panelSettings.classList.add('hidden');
        panelSettings.classList.remove('flex');
        if (panelLeads) panelLeads.classList.add('hidden');

        if (tabName === 'dashboard') {
            panelDashboard.classList.remove('hidden');
            await loadAnalytics();
        } else if (tabName === 'leads') {
            if (panelLeads) {
                panelLeads.classList.remove('hidden');
                await loadQualifiedLeads();
                setupLeadFilters();
                setupLeadDetailModal();
            }
        } else {
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
        
        if (item.setting_key.includes('title')) {
            // Formulario oculto para sincronización con Supabase
            inputEl = document.createElement('textarea');
            inputEl.className = 'hidden';
            inputEl.value = item.setting_value || '';
            inputEl.name = item.setting_key;
            inputEl.dataset.original = item.setting_value || '';
            wrapper.insertBefore(labelDiv, wrapper.firstChild);
            wrapper.appendChild(inputEl);
            
            // Generar editor visual e interactivo
            createVisualEditor(wrapper, inputEl, item, tabName, settings);
        } else if (isLargeText) {
            // Formulario oculto para sincronización con Supabase
            inputEl = document.createElement('textarea');
            inputEl.className = 'hidden';
            inputEl.value = item.setting_value || '';
            inputEl.name = item.setting_key;
            inputEl.dataset.original = item.setting_value || '';
            
            // Contenedor para editor visual Quill
            const editorContainer = document.createElement('div');
            editorContainer.className = 'bg-white rounded-lg border border-brand-sage/50 text-sm min-h-[150px]';
            
            wrapper.insertBefore(labelDiv, wrapper.firstChild);
            wrapper.appendChild(inputEl);
            wrapper.appendChild(editorContainer);
            
            // Inicializar editor Quill
            if (typeof Quill !== 'undefined') {
                const quill = new Quill(editorContainer, {
                    theme: 'snow',
                    placeholder: 'Escribe el contenido aquí...',
                    modules: {
                        toolbar: [
                            [{ 'size': quillSizeList }],
                            ['bold', 'italic', 'underline'],
                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                            ['link', 'clean']
                        ]
                    }
                });
                quill.root.innerHTML = item.setting_value || '';
                
                // Sincronizar en tiempo real
                quill.on('text-change', () => {
                    inputEl.value = quill.root.innerHTML === '<p><br></p>' ? '' : quill.root.innerHTML;
                    // Disparar evento change para marcar cambios detectados
                    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
                });
            } else {
                // Fallback a textarea normal si no se carga Quill
                inputEl.className = 'w-full px-4 py-3 rounded-lg bg-white border border-brand-sage/50 focus:ring-2 focus:ring-brand-sky outline-none custom-scrollbar text-sm';
                inputEl.classList.remove('hidden');
            }
        } else {
            inputEl = document.createElement('input');
            inputEl.type = 'text';
            inputEl.className = 'w-full px-4 py-3 rounded-lg bg-white border border-brand-sage/50 focus:ring-2 focus:ring-brand-sky outline-none text-sm';
            inputEl.value = item.setting_value || '';
            inputEl.name = item.setting_key;
            inputEl.dataset.original = item.setting_value || '';
            
            if (isUrl) {
                const previewBtn = document.createElement('button');
                previewBtn.type = 'button';
                previewBtn.textContent = 'Preview Media';
                previewBtn.className = 'text-xs text-brand-sky underline font-bold mt-2 hover:text-brand-deep';
                previewBtn.onclick = () => window.open(inputEl.value, '_blank');
                wrapper.appendChild(previewBtn);
            }
            wrapper.insertBefore(labelDiv, wrapper.firstChild);
            wrapper.appendChild(inputEl);
        }

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
    const inputs = form.querySelectorAll('input[name], textarea[name]');
    const updates = [];
    const uniqueKeys = new Set();

    inputs.forEach(input => {
        if (!input.name) return; // double check

        if (input.value !== input.dataset.original) {
            // Check for uniqueness to avoid PostgreSQL ON CONFLICT error (code 21000)
            if (!uniqueKeys.has(input.name)) {
                updates.push({
                    setting_key: input.name,
                    setting_value: input.value
                });
                uniqueKeys.add(input.name);
            }
        }
    });

    if (updates.length === 0) {
        showToast('No changes detected.');
        return;
    }

    const btn = document.querySelector('button[type="submit"][form="dynamic-form"]');
    const originalText = btn ? btn.innerHTML : 'Save Changes';
    if (btn) {
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Guardando...';
        btn.disabled = true;
    }

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
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
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
    
    const descVal = item.description || '';
    document.getElementById('item-desc').value = descVal;
    if (modalQuill) {
        modalQuill.root.innerHTML = descVal;
    }
    
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

/**
 * Editor Visual WYSIWYG e interactivo para Títulos
 */
function createVisualEditor(wrapper, hiddenInput, item, tabName, allSettings) {
    const isHero = item.setting_key.endsWith('_hero_title');
    
    // 1. Barra de herramientas visuales con formato nativo de Quill
    const toolbar = document.createElement('div');
    toolbar.className = 'mb-2';
    toolbar.innerHTML = `
        <div class="ql-toolbar ql-snow rounded-xl border border-brand-sage/50 bg-slate-100 p-2 flex items-center gap-1">
            <span class="ql-formats">
                <select class="ql-size" title="Tamaño de Letra"></select>
            </span>
            <span class="ql-formats">
                <button class="ql-bold" title="Negrita"></button>
                <button class="ql-italic" title="Cursiva"></button>
                <button class="ql-underline" title="Subrayado"></button>
            </span>
            <span class="ql-formats">
                <button class="ql-custom-br" title="Salto de Línea">
                    <span class="material-symbols-outlined text-sm font-bold">keyboard_return</span>
                </button>
                <button class="ql-custom-small" title="Texto Chico">
                    <span class="material-symbols-outlined text-sm font-bold">text_fields</span>
                </button>
            </span>
            <span class="ql-formats">
                <button class="ql-clean" title="Quitar Formato"></button>
            </span>
        </div>
    `;

    const sizeSelect = toolbar.querySelector('.ql-size');
    if (sizeSelect) {
        quillSizeList.forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            if (val === '16px') {
                opt.setAttribute('selected', 'selected');
            }
            sizeSelect.appendChild(opt);
        });
    }

    // 2. Contenedor de Vista Previa / Editor
    const canvas = document.createElement('div');
    
    // Obtener la imagen de fondo si es un hero
    let bgUrl = '';
    if (isHero) {
        if (tabName === 'about') {
            const img = allSettings.find(s => s.setting_key === 'about_hero_image');
            bgUrl = img ? img.setting_value : '';
        } else if (tabName === 'portfolio') {
            const img = allSettings.find(s => s.setting_key === 'portfolio_hero_image');
            bgUrl = img ? img.setting_value : 'https://lh3.googleusercontent.com/aida-public/AB6AXuBfQRnZS-4n0fbkvhetsDh1UdVIhGAWlTjviuxuSGx2i8KkxrO92XNuDDef8DUx3OYIUMLXl8Lnh9wtRsoCVwGZbg-UuNDH_yE3lBlLaFHVuMgITjShCV52ypTCi2MX-S2Ia8g4vidqKva7h1e8jpaXXne4BADBFJ2DRFvLnRF6LoScnVBOp-EzucUDGYXuDFOla_UIyosbnqztWfGxz7fs2TRwmPk-WlZLt7JM8ZSBQTtACIK566YegwjvPWHf2HzEueYLMweWhK8';
        } else if (tabName === 'destination') {
            const img = allSettings.find(s => s.setting_key === 'dest_hero_image');
            bgUrl = img ? img.setting_value : '';
        } else if (tabName === 'concierge') {
            const img = allSettings.find(s => s.setting_key === 'concierge_hero_image');
            bgUrl = img ? img.setting_value : '';
        } else if (tabName === 'home') {
            bgUrl = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDfnBRqsAYtnU2MGEAhNKUNLRBtwtsIp_1MT-Q-Ra9G8qrTuTGjZFdN_R8t7uyjBZpVftYXrZnS1RFRQanZK-He7w5zXeKIHueDEMCMhBPjjk9BqlUE5H6Q1qo5cYDy8u50fM3WnMzvvyB93-hUpSLqWvrq08e7GZtygLV8kTHaSDlUN9110BlSlvjRiEk2TTxo4H2824uh2SpPODYI1VQWzmUMJ8v_mCPWKY6B0MHPBBh2pIEoV31DgK0EpcrVoKYERlbunqMBFKQ';
        }
    }

    // Configurar estilos del Canvas y del elemento de edición
    if (isHero) {
        if (tabName === 'about') {
            canvas.className = 'relative aspect-[16/9] w-full rounded-2xl overflow-hidden flex items-center justify-center text-center p-8 bg-slate-900 border border-brand-sage/20 shadow-inner';
            canvas.innerHTML = `
                ${bgUrl ? `<img src="${bgUrl}" class="absolute inset-0 w-full h-full object-cover opacity-90">` : ''}
                <div class="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-[#f8fafc]"></div>
                <div class="quill-title-editor relative z-10 w-full font-headline text-4xl md:text-5xl lg:text-6xl text-[#131c27] font-bold tracking-tight text-center" style="font-family: 'Noto Serif', serif; line-height: 1.1;"></div>
            `;
        } else if (tabName === 'destination') {
            canvas.className = 'relative aspect-[16/9] w-full rounded-2xl overflow-hidden flex items-center justify-center text-center p-8 bg-slate-950 border border-brand-sage/20 shadow-inner';
            canvas.innerHTML = `
                ${bgUrl ? `<img src="${bgUrl}" class="absolute inset-0 w-full h-full object-cover">` : ''}
                <div class="absolute inset-0 bg-black/35 backdrop-blur-[1px]"></div>
                <div class="quill-title-editor relative z-10 w-full font-headline text-4xl md:text-5xl lg:text-6xl text-white font-bold tracking-tight drop-shadow-xl text-center" style="font-family: 'Noto Serif', serif; line-height: 1.1;"></div>
            `;
        } else if (tabName === 'concierge') {
            canvas.className = 'relative aspect-[16/9] w-full rounded-2xl overflow-hidden flex items-center justify-start text-left p-12 bg-[#f7f9ff] border border-brand-sage/20 shadow-inner';
            canvas.innerHTML = `
                <div class="absolute inset-0 bg-gradient-to-tr from-brand-deep/5 to-brand-mint/5 pointer-events-none"></div>
                <div class="quill-title-editor relative z-10 w-full font-headline text-3xl md:text-4xl lg:text-5xl text-[#131c27] font-bold text-left" style="font-family: 'Noto Serif', serif; line-height: 1.1;"></div>
            `;
        } else if (tabName === 'portfolio') {
            canvas.className = 'relative aspect-[16/9] w-full rounded-2xl overflow-hidden flex items-center justify-center text-center p-8 bg-slate-950 border border-brand-sage/20 shadow-inner';
            canvas.innerHTML = `
                ${bgUrl ? `<img src="${bgUrl}" class="absolute inset-0 w-full h-full object-cover">` : ''}
                <div class="absolute inset-0 bg-black/40"></div>
                <div class="quill-title-editor relative z-10 w-full font-headline text-4xl md:text-5xl text-white font-bold tracking-tight text-center" style="font-family: 'Noto Serif', serif; line-height: 1.1;"></div>
            `;
        } else if (tabName === 'home') {
            canvas.className = 'relative aspect-[16/9] w-full rounded-2xl overflow-hidden flex items-center justify-center text-center p-8 bg-slate-950 border border-brand-sage/20 shadow-inner';
            canvas.innerHTML = `
                ${bgUrl ? `<img src="${bgUrl}" class="absolute inset-0 w-full h-full object-cover">` : ''}
                <div class="absolute inset-0 bg-black/30"></div>
                <div class="quill-title-editor relative z-10 w-full font-headline text-4xl md:text-5xl text-white font-bold tracking-tight drop-shadow-xl text-center" style="font-family: 'Noto Serif', serif; line-height: 1.1;"></div>
            `;
        }
    } else {
        // Título de Sección
        canvas.className = 'relative w-full rounded-xl p-8 bg-brand-light/10 border border-brand-sage/20 flex items-center justify-center text-center shadow-inner';
        canvas.innerHTML = `
            <div class="absolute inset-0 bg-gradient-to-tr from-brand-deep/5 to-brand-mint/5 pointer-events-none"></div>
            <div class="quill-title-editor relative z-10 w-full font-headline text-2xl font-bold text-brand-deep text-center" style="font-family: 'Noto Serif', serif; line-height: 1.2;"></div>
        `;
    }

    const editEl = canvas.querySelector('.quill-title-editor');
    
    // Inicializar Quill en editEl
    if (typeof Quill !== 'undefined') {
        const quill = new Quill(editEl, {
            theme: 'snow',
            modules: {
                toolbar: {
                    container: toolbar.querySelector('.ql-toolbar'),
                    handlers: {
                        'custom-br': function() {
                            const range = this.quill.getSelection();
                            if (range) {
                                this.quill.insertEmbed(range.index, 'break', true);
                                this.quill.setSelection(range.index + 1);
                            }
                        },
                        'custom-small': function() {
                            const range = this.quill.getSelection();
                            if (range) {
                                const currentFormat = this.quill.getFormat(range);
                                this.quill.format('small-title', !currentFormat['small-title']);
                            }
                        }
                    }
                },
                keyboard: {
                    bindings: {
                        enter: {
                            key: 'Enter',
                            handler: function(range, context) {
                                this.quill.insertEmbed(range.index, 'break', true);
                                this.quill.setSelection(range.index + 1);
                                return false; // Evitar la creación de un nuevo párrafo
                            }
                        }
                    }
                }
            }
        });

        // Asegurarse de que el HTML esté envuelto en un párrafo para Quill
        const initialVal = item.setting_value || '';
        const initialHtml = initialVal.startsWith('<p>') ? initialVal : `<p>${initialVal || '<br>'}</p>`;
        quill.root.innerHTML = initialHtml;

        // 3. Sincronizar en tiempo real con el input oculto
        quill.on('text-change', () => {
            let htmlVal = quill.root.innerHTML;
            if (htmlVal.startsWith('<p>') && htmlVal.endsWith('</p>')) {
                htmlVal = htmlVal.substring(3, htmlVal.length - 4);
            }
            hiddenInput.value = htmlVal === '<br>' || htmlVal === '<br/>' ? '' : htmlVal.replace(/&nbsp;/g, ' ').trim();
            // Disparar evento change en el input oculto para marcar cambios detectados
            hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        });
    } else {
        // Fallback en caso de que Quill no esté cargado
        editEl.innerHTML = item.setting_value || '';
        editEl.setAttribute('contenteditable', 'true');
        editEl.addEventListener('input', () => {
            hiddenInput.value = editEl.innerHTML.replace(/&nbsp;/g, ' ').trim();
            hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }

    // Añadir toolbar y canvas al wrapper
    wrapper.appendChild(toolbar);
    wrapper.appendChild(canvas);
}

// ============================================
// Qualified Leads Panel
// ============================================

let allQualifiedLeads = [];
let currentLeadFilter = 'all';

const LEAD_LABELS = {
    purchase_purpose: {
        first_home: 'Primera casa',
        vacation: 'Casa vacacional',
        investment: 'Inversión (Airbnb)',
        development: 'Desarrollo',
        exploring: 'Solo explorando'
    },
    knows_bacalar: {
        multiple_visits: 'Varias visitas',
        once: 'Una vez',
        no_but_invest: 'No, pero invierte',
        researching: 'Investigando'
    },
    purchase_stage: {
        '0_3_months': '0–3 meses',
        '3_6_months': '3–6 meses',
        '6_plus': '+6 meses',
        just_researching: 'Solo investigando'
    },
    budget_range: {
        '1m_3m': '$1M–$3M',
        '3m_5m': '$3M–$5M',
        '5m_10m': '$5M–$10M',
        '10m_plus': '+$10M',
        prefer_call: 'En llamada'
    },
    payment_method: {
        own_resources: 'Recursos propios',
        financing: 'Financiamiento',
        mixed: 'Mixto',
        unsure: 'No lo sé'
    },
    priorities: {
        high_appreciation: 'Alta plusvalía',
        roi: 'Retorno inversión',
        lagoon_proximity: 'Cercanía laguna',
        privacy: 'Privacidad',
        strategic_location: 'Ubicación estratégica',
        development_potential: 'Potencial desarrollo'
    },
    urgency: {
        today: 'Hoy mismo',
        this_week: 'Esta semana',
        just_exploring: 'Solo explorando'
    }
};

function getLabel(category, value) {
    return LEAD_LABELS[category]?.[value] || value || '—';
}

function getScoreBadge(score) {
    if (score === 'hot') return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600">🔥 Caliente</span>';
    if (score === 'warm') return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">🟡 Nutrir</span>';
    return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-500">❄️ Frío</span>';
}

function getTypeBadge(type) {
    if (type === 'videocall') return '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-600">📹 Meet</span>';
    return '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-600">💬 WA</span>';
}

async function loadQualifiedLeads() {
    try {
        const { data: leads, error } = await supabase
            .from('qualified_leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        allQualifiedLeads = leads || [];
        renderLeadsKPIs();
        renderLeadsTable();
    } catch (err) {
        console.error('Error loading qualified leads:', err);
        const tbody = document.getElementById('leads-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-red-400">Error al cargar leads.</td></tr>';
    }
}

function renderLeadsKPIs() {
    const total = allQualifiedLeads.length;
    const hot = allQualifiedLeads.filter(l => l.lead_score === 'hot').length;
    const warm = allQualifiedLeads.filter(l => l.lead_score === 'warm').length;
    const cold = allQualifiedLeads.filter(l => l.lead_score === 'cold').length;

    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('kpi-total', total);
    el('kpi-hot', hot);
    el('kpi-warm', warm);
    el('kpi-cold', cold);
}

function renderLeadsTable() {
    const tbody = document.getElementById('leads-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let filtered = allQualifiedLeads;
    if (currentLeadFilter === 'hot' || currentLeadFilter === 'warm' || currentLeadFilter === 'cold') {
        filtered = allQualifiedLeads.filter(l => l.lead_score === currentLeadFilter);
    } else if (currentLeadFilter === 'whatsapp' || currentLeadFilter === 'videocall') {
        filtered = allQualifiedLeads.filter(l => l.conversion_type === currentLeadFilter);
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-brand-slate/60">No hay leads con este filtro.</td></tr>';
        return;
    }

    filtered.forEach(lead => {
        const date = new Date(lead.created_at);
        const dateStr = date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
        const timeStr = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-brand-light/20 transition-colors';
        tr.innerHTML = `
            <td class="px-4 py-3">
                <div class="text-xs font-medium">${dateStr}</div>
                <div class="text-[10px] text-brand-slate/50">${timeStr}</div>
            </td>
            <td class="px-4 py-3">
                <div class="font-bold text-brand-deep text-sm">${lead.full_name}</div>
                <div class="text-[10px] text-brand-slate/60">${lead.whatsapp || lead.email || ''}</div>
            </td>
            <td class="px-4 py-3 text-center">${getScoreBadge(lead.lead_score)}</td>
            <td class="px-4 py-3 text-xs">${getLabel('purchase_purpose', lead.purchase_purpose)}</td>
            <td class="px-4 py-3 text-xs font-medium">${getLabel('budget_range', lead.budget_range)}</td>
            <td class="px-4 py-3 text-xs">${getLabel('purchase_stage', lead.purchase_stage)}</td>
            <td class="px-4 py-3 text-center">${getTypeBadge(lead.conversion_type)}</td>
            <td class="px-4 py-3 text-center">
                <div class="flex gap-1 justify-center">
                    <button class="btn-lead-detail p-1.5 rounded-lg bg-brand-sky/10 text-brand-sky hover:bg-brand-sky/20 transition-colors" data-id="${lead.id}" title="Ver detalle">
                        <span class="material-symbols-outlined text-[16px]">visibility</span>
                    </button>
                    ${lead.whatsapp ? `<a href="https://wa.me/${lead.whatsapp.replace(/\D/g, '')}" target="_blank" class="p-1.5 rounded-lg bg-green-50 text-green-500 hover:bg-green-100 transition-colors" title="Abrir WhatsApp">
                        <span class="material-symbols-outlined text-[16px]">chat</span>
                    </a>` : ''}
                    ${lead.meet_link ? `<a href="${lead.meet_link}" target="_blank" class="p-1.5 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-100 transition-colors" title="Abrir Meet">
                        <span class="material-symbols-outlined text-[16px]">videocam</span>
                    </a>` : ''}
                    <button class="btn-lead-delete p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors" data-id="${lead.id}" title="Eliminar">
                        <span class="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Bind detail buttons
    tbody.querySelectorAll('.btn-lead-detail').forEach(btn => {
        btn.addEventListener('click', () => {
            const lead = allQualifiedLeads.find(l => l.id === btn.dataset.id);
            if (lead) openLeadDetail(lead);
        });
    });

    // Bind delete buttons
    tbody.querySelectorAll('.btn-lead-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('¿Eliminar este lead?')) return;
            try {
                const { error } = await supabase.from('qualified_leads').delete().eq('id', btn.dataset.id);
                if (error) throw error;
                showToast('Lead eliminado.');
                await loadQualifiedLeads();
            } catch (err) {
                showToast('Error al eliminar lead.', true);
            }
        });
    });
}

function setupLeadFilters() {
    document.querySelectorAll('.lead-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentLeadFilter = btn.dataset.filter;
            // Update active filter styles
            document.querySelectorAll('.lead-filter-btn').forEach(b => {
                b.className = 'lead-filter-btn px-4 py-2 rounded-lg text-xs font-bold bg-white text-brand-slate border border-brand-sage/30 hover:bg-brand-light/50';
            });
            btn.className = 'lead-filter-btn px-4 py-2 rounded-lg text-xs font-bold bg-brand-deep text-white';
            renderLeadsTable();
        });
    });
}

function setupLeadDetailModal() {
    const closeBtn = document.getElementById('close-lead-detail');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeLeadDetail);
    }
}

function openLeadDetail(lead) {
    const modal = document.getElementById('lead-detail-modal');
    const body = document.getElementById('lead-detail-body');
    const title = document.getElementById('lead-detail-title');
    if (!modal || !body) return;

    title.textContent = `${lead.full_name} — ${getScoreBadge(lead.lead_score)}`;
    title.innerHTML = `${lead.full_name}`;

    const priorities = (lead.priorities || []).map(p => getLabel('priorities', p)).join(', ') || '—';
    const date = new Date(lead.created_at);
    const dateStr = date.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    body.innerHTML = `
        <div class="space-y-5">
            <!-- Score Badge -->
            <div class="flex items-center gap-3">
                ${getScoreBadge(lead.lead_score)}
                ${getTypeBadge(lead.conversion_type)}
                <span class="text-xs text-brand-slate/50">${dateStr} · ${timeStr}</span>
            </div>

            <!-- Contact Info -->
            <div class="bg-brand-light/30 rounded-xl p-4 space-y-2">
                <h4 class="text-xs font-bold uppercase tracking-widest text-brand-deep">Contacto</h4>
                <div class="grid grid-cols-2 gap-2 text-sm">
                    <div><span class="text-brand-slate/60">Nombre:</span> <strong>${lead.full_name}</strong></div>
                    <div><span class="text-brand-slate/60">WhatsApp:</span> <strong>${lead.whatsapp || '—'}</strong></div>
                    <div><span class="text-brand-slate/60">Email:</span> <strong>${lead.email || '—'}</strong></div>
                    <div><span class="text-brand-slate/60">Idioma widget:</span> <strong>${lead.widget_language?.toUpperCase() || '—'}</strong></div>
                </div>
            </div>

            <!-- Profile -->
            <div class="bg-blue-50/50 rounded-xl p-4 space-y-2">
                <h4 class="text-xs font-bold uppercase tracking-widest text-brand-deep">📋 Perfil del Comprador</h4>
                <div class="grid grid-cols-1 gap-1.5 text-sm">
                    <div><span class="text-brand-slate/60">Propósito:</span> <strong>${getLabel('purchase_purpose', lead.purchase_purpose)}</strong></div>
                    <div><span class="text-brand-slate/60">Conoce Bacalar:</span> <strong>${getLabel('knows_bacalar', lead.knows_bacalar)}</strong></div>
                    <div><span class="text-brand-slate/60">Etapa:</span> <strong>${getLabel('purchase_stage', lead.purchase_stage)}</strong></div>
                </div>
            </div>

            <!-- Capacity -->
            <div class="bg-green-50/50 rounded-xl p-4 space-y-2">
                <h4 class="text-xs font-bold uppercase tracking-widest text-brand-deep">💰 Capacidad</h4>
                <div class="grid grid-cols-2 gap-1.5 text-sm">
                    <div><span class="text-brand-slate/60">Rango:</span> <strong>${getLabel('budget_range', lead.budget_range)}</strong></div>
                    <div><span class="text-brand-slate/60">Pago:</span> <strong>${getLabel('payment_method', lead.payment_method)}</strong></div>
                </div>
            </div>

            <!-- Intent -->
            <div class="bg-purple-50/50 rounded-xl p-4 space-y-2">
                <h4 class="text-xs font-bold uppercase tracking-widest text-brand-deep">🎯 Intención</h4>
                <div class="grid grid-cols-1 gap-1.5 text-sm">
                    <div><span class="text-brand-slate/60">Prioridades:</span> <strong>${priorities}</strong></div>
                    <div><span class="text-brand-slate/60">Opciones similares:</span> <strong>${lead.wants_similar_options ? 'Sí' : 'No'}</strong></div>
                    <div><span class="text-brand-slate/60">Urgencia:</span> <strong>${getLabel('urgency', lead.urgency)}</strong></div>
                </div>
            </div>

            ${lead.conversion_type === 'videocall' ? `
            <!-- Videocall -->
            <div class="bg-indigo-50/50 rounded-xl p-4 space-y-2">
                <h4 class="text-xs font-bold uppercase tracking-widest text-brand-deep">📹 Videollamada</h4>
                <div class="grid grid-cols-2 gap-1.5 text-sm">
                    <div><span class="text-brand-slate/60">Día preferido:</span> <strong>${lead.preferred_day || '—'}</strong></div>
                    <div><span class="text-brand-slate/60">Idioma:</span> <strong>${lead.preferred_language === 'en' ? 'Inglés' : 'Español'}</strong></div>
                </div>
                ${lead.pre_call_notes ? `<div class="text-sm mt-2"><span class="text-brand-slate/60">Notas:</span><br><em class="text-brand-deep">${lead.pre_call_notes}</em></div>` : ''}
                ${lead.meet_link ? `<a href="${lead.meet_link}" target="_blank" class="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-indigo-500 text-white rounded-lg text-xs font-bold hover:bg-indigo-600 transition-colors"><span class="material-symbols-outlined text-sm">videocam</span> Abrir Meet</a>` : ''}
            </div>
            ` : ''}

            <!-- Source -->
            <div class="text-xs text-brand-slate/40 border-t border-brand-sage/20 pt-3">
                <span class="font-medium">Página origen:</span> ${lead.source_page || '—'}
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('opacity-100');
        document.getElementById('lead-detail-content').classList.remove('scale-95');
    }, 10);
}

function closeLeadDetail() {
    const modal = document.getElementById('lead-detail-modal');
    if (!modal) return;
    modal.classList.remove('opacity-100');
    document.getElementById('lead-detail-content')?.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.style.display = '';
    }, 300);
}
