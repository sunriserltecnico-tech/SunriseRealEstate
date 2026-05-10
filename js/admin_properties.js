import { supabase } from './supabase.js';
import { requireAuth } from './admin_auth.js';

/**
 * Núcleo de Gestión de Propiedades (CRUD Maestro)
 */

let propertiesList = [];
let editingId = null;

async function init() {
    // 1. Guardián de Sesión
    const session = await requireAuth();
    if (!session) return;
    
    document.getElementById('user-display').textContent = session.user.email;

    // 2. Precarga de Datos Relacionados (Llaves Foráneas)
    await preloadSelects();

    // 3. Carga Inicial de Propiedades
    loadProperties();

    // 4. Listeners
    setupEventListeners();
}

/**
 * Precarga los menús desplegables desde las tablas base
 */
async function preloadSelects() {
    try {
        const [destRes, catRes, agentRes, amRes] = await Promise.all([
            supabase.from('destinations').select('id, name'),
            supabase.from('property_categories').select('id, name'),
            supabase.from('agents').select('id, full_name'),
            supabase.from('property_amenities').select('id, name').order('name')
        ]);

        fillSelect('prop-destination', destRes.data, 'name');
        fillSelect('prop-category', catRes.data, 'name');
        fillSelect('prop-agent', agentRes.data, 'full_name');
        
        renderAmenitiesCheckboxes(amRes.data);

    } catch (err) {
        console.error('Error preloading catalogs:', err);
        showToast('Error al cargar catálogos base', 'error');
    }
}

function renderAmenitiesCheckboxes(amenities) {
    const container = document.getElementById('amenities-container');
    if (!container || !amenities) return;
    
    container.innerHTML = amenities.map(am => `
        <div class="amenity-card group relative p-3 rounded-xl border border-white/5 bg-slate-900/30 hover:bg-slate-900/60 transition-all">
            <div class="flex items-start gap-3 mb-2">
                <input type="checkbox" id="amenity-${am.id}" value="${am.id}" 
                    class="amenity-checkbox mt-1 w-4 h-4 rounded border-white/10 bg-slate-900 text-blue-600 focus:ring-0 cursor-pointer">
                <div class="flex-1">
                    <label for="amenity-${am.id}" class="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                        <span class="material-symbols-outlined text-lg text-blue-400">${am.icon || 'star'}</span>
                        ${am.name}
                    </label>
                </div>
            </div>
            <input type="text" id="amenity-desc-${am.id}" placeholder="Detalles..." 
                class="amenity-desc w-full text-[10px] bg-black/20 border border-white/5 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500/50 transition-all opacity-30 pointer-events-none">
        </div>
    `).join('');

    // Listener para habilitar/deshabilitar inputs según el checkbox
    container.querySelectorAll('.amenity-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const descInput = document.getElementById(`amenity-desc-${e.target.value}`);
            if (e.target.checked) {
                descInput.classList.remove('opacity-30', 'pointer-events-none');
            } else {
                descInput.classList.add('opacity-30', 'pointer-events-none');
                descInput.value = '';
            }
        });
    });
}

function fillSelect(elementId, data, labelField) {
    const select = document.getElementById(elementId);
    if (!select || !data) return;
    
    select.innerHTML = '<option value="">Seleccionar...</option>' + 
        data.map(item => `<option value="${item.id}">${item[labelField]}</option>`).join('');
}

/**
 * Carga y renderiza el listado de propiedades
 */
async function loadProperties() {
    const tbody = document.getElementById('properties-tbody');
    const loader = document.getElementById('table-loader');
    const emptyState = document.getElementById('empty-state');

    tbody.innerHTML = '';
    loader.classList.remove('hidden');
    emptyState.classList.add('hidden');

    try {
        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        propertiesList = data;
        loader.classList.add('hidden');

        if (!data || data.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        tbody.innerHTML = data.map(prop => `
            <tr class="hover:bg-brand-sage/20 transition-colors group border-b border-brand-sage/10">
                <td class="px-6 py-4">
                    <div class="font-bold text-[#3D6C9D]">${prop.title}</div>
                    <div class="text-[10px] text-brand-slate/80">${prop.subtitle || ''}</div>
                </td>
                <td class="px-6 py-4 font-mono text-brand-deep font-bold text-sm">
                    $${new Intl.NumberFormat().format(prop.price)}
                </td>
                <td class="px-6 py-4">
                    <span class="status-pill status-${prop.status}">${prop.status}</span>
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="edit-btn p-2 text-brand-slate hover:text-brand-deep transition-colors" data-id="${prop.id}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button class="delete-btn p-2 text-brand-slate hover:text-red-500 transition-colors" data-id="${prop.id}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        showToast('Error al cargar propiedades', 'error');
    }
}

/**
 * Lógica de Guardado (Storage + DB Upsert)
 */
async function handleSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('prop-id').value;
    const title = document.getElementById('prop-title').value;
    const fileInput = document.getElementById('prop-hero-file');
    
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    try {
        let heroImageUrl = document.getElementById('current-hero-url').dataset.url || null;

        // 1. Subida de imagen si existe nuevo archivo
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `hero/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('property-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('property-images')
                .getPublicUrl(filePath);
            
            heroImageUrl = publicUrl;
        }

        // 2. Preparar objeto
        const payload = {
            title,
            slug: generateSlug(title),
            subtitle: document.getElementById('prop-subtitle').value,
            price: parseFloat(document.getElementById('prop-price').value),
            status: document.getElementById('prop-status').value,
            destination_id: document.getElementById('prop-destination').value,
            category_id: document.getElementById('prop-category').value,
            agent_id: document.getElementById('prop-agent').value,
            listing_type: document.getElementById('prop-listing-type').value,
            description: document.getElementById('prop-description').value,
            is_published: document.getElementById('prop-published').checked,
            is_featured: document.getElementById('prop-featured').checked,
            hero_image_url: heroImageUrl,
            // Nuevos Campos
            built_area_sqm: parseFloat(document.getElementById('prop-built-area').value) || null,
            total_area_sqm: parseFloat(document.getElementById('prop-total-area').value) || null,
            half_bathrooms: parseInt(document.getElementById('prop-half-bathrooms').value) || 0,
            parking_spaces: parseInt(document.getElementById('prop-parking-spaces').value) || 0,
            age_status: document.getElementById('prop-age-status').value,
            antiquity_years: document.getElementById('prop-age-status').value === 'Años de uso' 
                ? parseInt(document.getElementById('prop-antiquity-years').value) 
                : null,
            maintenance_fee: parseFloat(document.getElementById('prop-maintenance-fee').value) || null,
            property_subtype: document.getElementById('prop-subtype').value || null,
            updated_at: new Date()
        };

        if (id) payload.id = id;

        // 3. Upsert
        const { data: upsertData, error: upsertError } = await supabase
            .from('properties')
            .upsert(payload)
            .select();

        if (upsertError) throw upsertError;
        
        const savedPropertyId = upsertData[0].id;
        editingId = savedPropertyId;
        document.getElementById('prop-id').value = savedPropertyId;
        
        // Habilitar y desbloquear secciones Nivel 3
        document.getElementById('gallery-section').classList.remove('hidden');
        document.getElementById('amenities-section').classList.remove('hidden');
        document.getElementById('submit-btn').textContent = 'Actualizar Propiedad';
        document.getElementById('form-title').textContent = 'Editando Propiedad';

        showToast('Propiedad guardada. Ahora puedes gestionar fotos y amenidades.', 'success');
        
        // Recargar listado sin limpiar el formulario
        loadProperties();

    } catch (err) {
        console.error('Error saving property:', err);
        showToast('Error: ' + err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar Propiedad';
    }
}

async function handleDelete(id) {
    if (!confirm('¿Estás seguro de eliminar esta propiedad? Esta acción es irreversible.')) return;

    try {
        // Tarea 4: Borrado con .select() para validar RLS
        const { data, error } = await supabase
            .from('properties')
            .delete()
            .eq('id', id)
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            showToast('⚠️ Acción bloqueada por RLS o registro no encontrado', 'error');
            return;
        }

        showToast('Propiedad eliminada', 'success');
        loadProperties();

    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

function handleEdit(id) {
    const prop = propertiesList.find(p => p.id === id);
    if (!prop) return;

    editingId = id;
    document.getElementById('prop-id').value = prop.id;
    document.getElementById('prop-title').value = prop.title;
    document.getElementById('prop-subtitle').value = prop.subtitle || '';
    document.getElementById('prop-price').value = prop.price;
    document.getElementById('prop-status').value = prop.status;
    document.getElementById('prop-destination').value = prop.destination_id || '';
    document.getElementById('prop-category').value = prop.category_id || '';
    document.getElementById('prop-agent').value = prop.agent_id || '';
    document.getElementById('prop-listing-type').value = prop.listing_type;
    document.getElementById('prop-description').value = prop.description || '';
    document.getElementById('prop-published').checked = prop.is_published;
    document.getElementById('prop-featured').checked = prop.is_featured;
    
    // Cargar Nuevos Campos
    document.getElementById('prop-built-area').value = prop.built_area_sqm || '';
    document.getElementById('prop-total-area').value = prop.total_area_sqm || '';
    document.getElementById('prop-half-bathrooms').value = prop.half_bathrooms || 0;
    document.getElementById('prop-parking-spaces').value = prop.parking_spaces || 0;
    document.getElementById('prop-age-status').value = prop.age_status || 'A estrenar';
    document.getElementById('prop-antiquity-years').value = prop.antiquity_years || '';
    document.getElementById('prop-maintenance-fee').value = prop.maintenance_fee || '';
    document.getElementById('prop-subtype').value = prop.property_subtype || '';

    // Disparar cambio en antigüedad para visibilidad
    document.getElementById('prop-age-status').dispatchEvent(new Event('change'));
    
    const heroDisplay = document.getElementById('current-hero-url');
    heroDisplay.textContent = prop.hero_image_url ? 'Imagen actual: ' + prop.hero_image_url.split('/').pop() : '';
    heroDisplay.dataset.url = prop.hero_image_url || '';

    document.getElementById('form-title').textContent = 'Editando Propiedad';
    document.getElementById('cancel-btn').classList.remove('hidden');
    
    // Habilitar y cargar secciones Nivel 3
    document.getElementById('gallery-section').classList.remove('hidden');
    document.getElementById('amenities-section').classList.remove('hidden');
    loadPropertyGallery(id);
    loadPropertyAmenities(id);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Utilidades
 */
function setupEventListeners() {
    document.getElementById('property-form').addEventListener('submit', handleSubmit);
    document.getElementById('cancel-btn').addEventListener('click', resetForm);
    document.getElementById('new-property-btn').addEventListener('click', () => {
        resetForm();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('properties-tbody').addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        
        if (editBtn) handleEdit(editBtn.dataset.id);
        if (deleteBtn) handleDelete(deleteBtn.dataset.id);
    });

    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'login.html';
    });

    // Toggle Antigüedad
    const ageStatusSelect = document.getElementById('prop-age-status');
    const antiquityContainer = document.getElementById('antiquity-years-container');
    if (ageStatusSelect) {
        ageStatusSelect.addEventListener('change', (e) => {
            if (e.target.value === 'Años de uso') {
                antiquityContainer.classList.remove('hidden');
            } else {
                antiquityContainer.classList.add('hidden');
                document.getElementById('prop-antiquity-years').value = '';
            }
        });
    }

    // Guardar amenidades de forma independiente
    const btnSaveAmenities = document.getElementById('btn-save-amenities');
    if (btnSaveAmenities) {
        btnSaveAmenities.addEventListener('click', async () => {
            const propId = document.getElementById('prop-id').value;
            if (!propId) return showToast('Primero guarda la propiedad principal', 'error');
            
            btnSaveAmenities.disabled = true;
            btnSaveAmenities.textContent = 'Guardando...';
            await saveAmenities(propId);
            btnSaveAmenities.disabled = false;
            btnSaveAmenities.textContent = 'Guardar Amenidades';
            showToast('Amenidades actualizadas', 'success');
        });
    }

    // Subida automática de galería al seleccionar archivos
    const galleryInput = document.getElementById('prop-gallery-files');
    if (galleryInput) {
        galleryInput.addEventListener('change', async () => {
            const propId = document.getElementById('prop-id').value;
            if (!propId) {
                showToast('Guarda la propiedad antes de subir fotos', 'error');
                galleryInput.value = '';
                return;
            }
            await uploadGalleryImages(propId);
            loadPropertyGallery(propId);
        });
    }
    
    // Delegación para eliminar imagen de galería
    const galleryPreview = document.getElementById('gallery-preview');
    if (galleryPreview) {
        galleryPreview.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.delete-gallery-btn');
            if (deleteBtn) {
                if (!confirm('¿Borrar esta imagen de la galería?')) return;
                const imgId = deleteBtn.dataset.id;
                const storagePath = deleteBtn.dataset.path;
                
                try {
                    if (storagePath) {
                        await supabase.storage.from('property-images').remove([storagePath]);
                    }
                    
                    const { data, error } = await supabase
                        .from('property_images')
                        .delete()
                        .eq('id', imgId)
                        .select();
                        
                    if (error) throw error;
                    if (!data || data.length === 0) throw new Error("Bloqueado por RLS o no encontrado");
                    
                    showToast('Imagen borrada', 'success');
                    loadPropertyGallery(editingId);
                } catch (err) {
                    showToast('Error al borrar imagen: ' + err.message, 'error');
                }
            }
        });
    }
}

function generateSlug(text) {
    return text.toLowerCase().trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function resetForm() {
    editingId = null;
    document.getElementById('property-form').reset();
    document.getElementById('prop-id').value = '';
    document.getElementById('current-hero-url').textContent = '';
    document.getElementById('current-hero-url').dataset.url = '';
    document.getElementById('form-title').textContent = 'Nueva Propiedad';
    document.getElementById('submit-btn').textContent = 'Guardar Propiedad';
    document.getElementById('cancel-btn').classList.add('hidden');
    
    document.getElementById('gallery-section').classList.add('hidden');
    document.getElementById('amenities-section').classList.add('hidden');
    document.getElementById('gallery-preview').innerHTML = '';
    document.querySelectorAll('.amenity-checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('.amenity-desc').forEach(input => input.value = '');

    // Resetear campos técnicos
    document.getElementById('prop-built-area').value = '';
    document.getElementById('prop-total-area').value = '';
    document.getElementById('prop-half-bathrooms').value = 0;
    document.getElementById('prop-parking-spaces').value = 0;
    document.getElementById('prop-age-status').value = 'A estrenar';
    document.getElementById('prop-antiquity-years').value = '';
    document.getElementById('antiquity-years-container').classList.add('hidden');
    document.getElementById('prop-maintenance-fee').value = '';
    document.getElementById('prop-subtype').value = '';
}

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `fixed bottom-8 right-8 px-6 py-3 rounded-xl shadow-2xl transition-all duration-500 z-[100] ${
        type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`;
    toast.classList.remove('translate-y-24', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-24', 'opacity-0'), 3000);
}

// --- FUNCIONES NIVEL 3: GALERÍA Y AMENIDADES ---

async function loadPropertyGallery(propertyId) {
    const previewContainer = document.getElementById('gallery-preview');
    previewContainer.innerHTML = '<div class="text-[10px] text-slate-500">Cargando...</div>';
    
    try {
        const { data, error } = await supabase
            .from('property_images')
            .select('*')
            .eq('property_id', propertyId)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        if (!data || data.length === 0) {
            previewContainer.innerHTML = '<div class="text-[10px] text-slate-500 col-span-3">No hay imágenes en la galería.</div>';
            return;
        }
        
        previewContainer.innerHTML = data.map(img => `
            <div class="relative group aspect-video bg-slate-900 rounded overflow-hidden">
                <img src="${img.public_url}" class="w-full h-full object-cover">
                <button type="button" class="delete-gallery-btn absolute top-1 right-1 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity" data-id="${img.id}" data-path="${img.storage_path}">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
        `).join('');
    } catch (err) {
        previewContainer.innerHTML = '<div class="text-[10px] text-red-500 col-span-3">Error al cargar galería.</div>';
    }
}

async function loadPropertyAmenities(propertyId) {
    document.querySelectorAll('.amenity-checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('.amenity-desc').forEach(input => input.value = '');
    
    try {
        const { data, error } = await supabase
            .from('property_amenity_links')
            .select('*')
            .eq('property_id', propertyId);
            
        if (error) throw error;
        
        data.forEach(link => {
            const cb = document.getElementById(`amenity-${link.amenity_id}`);
            const desc = document.getElementById(`amenity-desc-${link.amenity_id}`);
            if (cb) {
                cb.checked = true;
                // Disparar evento change para activar el input
                cb.dispatchEvent(new Event('change'));
            }
            if (desc) desc.value = link.custom_description || '';
        });
    } catch (err) {
        console.error('Error loading amenities:', err);
    }
}

async function saveAmenities(propertyId) {
    try {
        await supabase
            .from('property_amenity_links')
            .delete()
            .eq('property_id', propertyId)
            .select();
            
        const linksToInsert = [];
        document.querySelectorAll('.amenity-checkbox:checked').forEach(cb => {
            const amenityId = cb.value;
            const desc = document.getElementById(`amenity-desc-${amenityId}`).value;
            linksToInsert.push({
                property_id: propertyId,
                amenity_id: amenityId,
                custom_description: desc || null
            });
        });
        
        if (linksToInsert.length > 0) {
            const { error } = await supabase
                .from('property_amenity_links')
                .insert(linksToInsert);
            if (error) throw error;
        }
    } catch (err) {
        console.error('Error saving amenities:', err);
        showToast('Error al guardar amenidades', 'error');
    }
}

async function uploadGalleryImages(propertyId) {
    const fileInput = document.getElementById('prop-gallery-files');
    if (!fileInput.files || fileInput.files.length === 0) return;
    
    try {
        const uploadPromises = Array.from(fileInput.files).map(async (file) => {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `gallery/${propertyId}/${fileName}`;
            
            const { error: uploadError } = await supabase.storage
                .from('property-images')
                .upload(filePath, file);
                
            if (uploadError) throw uploadError;
            
            const { data: { publicUrl } } = supabase.storage
                .from('property-images')
                .getPublicUrl(filePath);
                
            return {
                property_id: propertyId,
                storage_path: filePath,
                public_url: publicUrl,
                alt_text: ''
            };
        });
        
        const imageRecords = await Promise.all(uploadPromises);
        
        if (imageRecords.length > 0) {
            const { error } = await supabase
                .from('property_images')
                .insert(imageRecords);
            if (error) throw error;
        }
        
        fileInput.value = '';
    } catch (err) {
        console.error('Error uploading gallery:', err);
        showToast('Error al subir algunas imágenes', 'error');
    }
}

init();
