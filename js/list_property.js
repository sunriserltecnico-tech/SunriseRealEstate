import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    let currentStep = 1;
    const totalSteps = 4;
    
    const form = document.getElementById('listing-form');
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const submitBtn = document.getElementById('submit-btn');
    const progressBarFill = document.getElementById('progress-bar-fill');
    
    // UI Elements
    const fiscalCondition = document.getElementById('fiscal-condition');
    const legalDocLabel = document.getElementById('legal-doc-label');
    const legalDocInput = document.getElementById('legal-doc');
    
    const ageTypeRadios = document.getElementsByName('age_type');
    const yearsContainer = document.getElementById('years-container');
    const ageYearsInput = document.getElementById('antiquity-years-input');

    // Navigation logic
    function updateStepsUI() {
        // Update Sections
        for (let i = 1; i <= totalSteps; i++) {
            const section = document.getElementById(`step-${i}`);
            if (i === currentStep) {
                section.classList.remove('step-hidden');
                section.classList.add('step-active', 'animate-fade-in');
            } else {
                section.classList.add('step-hidden');
                section.classList.remove('step-active', 'animate-fade-in');
            }
        }
        
        // Update Progress Bar (adjust calculation based on visual steps)
        const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
        progressBarFill.style.width = `${progressPercentage}%`;
        
        // Update indicators
        document.querySelectorAll('.step-indicator').forEach(indicator => {
            const step = parseInt(indicator.dataset.step);
            const circle = indicator.querySelector('div');
            const label = indicator.querySelector('span');
            
            if (step <= currentStep) {
                circle.classList.remove('bg-brand-sage', 'text-white');
                circle.classList.add('bg-brand-deep', 'text-white');
                label.classList.remove('text-brand-slate');
                label.classList.add('text-brand-deep');
            } else {
                circle.classList.add('bg-brand-sage', 'text-white');
                circle.classList.remove('bg-brand-deep');
                label.classList.add('text-brand-slate');
                label.classList.remove('text-brand-deep');
            }
        });

        // Update Buttons
        if (currentStep === 1) {
            prevBtn.classList.add('hidden');
        } else {
            prevBtn.classList.remove('hidden');
        }
        
        if (currentStep === totalSteps) {
            nextBtn.classList.add('hidden');
            submitBtn.classList.remove('hidden');
        } else {
            nextBtn.classList.remove('hidden');
            submitBtn.classList.add('hidden');
        }
    }

    function validateStep() {
        const currentSection = document.getElementById(`step-${currentStep}`);
        const inputs = currentSection.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.classList.add('border-red-500', 'focus:ring-red-500');
                input.classList.remove('border-brand-sage', 'focus:ring-brand-sky');
            } else {
                input.classList.remove('border-red-500', 'focus:ring-red-500');
                input.classList.add('border-brand-sage', 'focus:ring-brand-sky');
            }
        });
        
        return isValid;
    }

    nextBtn.addEventListener('click', () => {
        if (validateStep()) {
            currentStep++;
            updateStepsUI();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            alert('Por favor, completa todos los campos requeridos.');
        }
    });

    prevBtn.addEventListener('click', () => {
        currentStep--;
        updateStepsUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Dynamic Logic
    fiscalCondition.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'Sin Obligaciones') {
            legalDocLabel.textContent = 'CURP';
            legalDocInput.maxLength = 18;
            legalDocInput.placeholder = 'Ingresa tu CURP de 18 caracteres';
        } else if (val === 'Persona Física' || val === 'Persona Moral') {
            legalDocLabel.textContent = 'RFC';
            legalDocInput.maxLength = 13; // 12 for Moral, 13 for Fisica, we allow 13
            legalDocInput.placeholder = 'Ingresa tu RFC';
        } else {
            legalDocLabel.textContent = 'RFC o CURP';
            legalDocInput.removeAttribute('maxlength');
            legalDocInput.placeholder = '';
        }
        legalDocInput.value = '';
    });

    Array.from(ageTypeRadios).forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'Años de uso') {
                yearsContainer.classList.remove('hidden');
                ageYearsInput.required = true;
            } else {
                yearsContainer.classList.add('hidden');
                ageYearsInput.required = false;
                ageYearsInput.value = '';
            }
        });
    });

    // Qty Buttons Logic
    document.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.target.dataset.target;
            const action = e.target.dataset.action;
            const input = document.getElementById(targetId);
            let val = parseInt(input.value) || 0;
            
            if (action === 'plus') {
                val++;
            } else if (action === 'minus' && val > 0) {
                val--;
            }
            input.value = val;
        });
    });

    // Fetch and render amenities
    async function loadPublicAmenities() {
        const grid = document.getElementById('public-amenities-grid');
        try {
            const { data, error } = await supabase
                .from('property_amenities')
                .select('id, name, icon')
                .order('name');
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                grid.innerHTML = data.map(am => `
                    <label class="flex items-center gap-3 p-3 rounded-lg border border-brand-sage/30 bg-white hover:border-brand-sky transition-all cursor-pointer group">
                        <input type="checkbox" name="public-amenity" value="${am.name}" class="amenity-checkbox w-4 h-4 text-brand-deep focus:ring-brand-sky rounded">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-brand-sky text-lg">${am.icon || 'star'}</span>
                            <span class="text-xs font-semibold text-brand-slate group-hover:text-brand-deep transition-colors">${am.name}</span>
                        </div>
                    </label>
                `).join('');
            } else {
                grid.innerHTML = '<div class="col-span-full text-center text-xs text-brand-slate/50 italic">No hay amenidades disponibles.</div>';
            }
        } catch (err) {
            console.error('Error loading amenities:', err);
            grid.innerHTML = '<div class="col-span-full text-center text-xs text-red-500 italic">Error al cargar amenidades.</div>';
        }
    }

    loadPublicAmenities();

    // Fetch and render destinations (cities)
    async function loadDestinations() {
        const citySelect = document.getElementById('city');
        try {
            const { data, error } = await supabase
                .from('destinations')
                .select('name')
                .order('name');
            
            if (error) throw error;
            
            citySelect.innerHTML = '<option value="">Selecciona una ciudad...</option>';
            
            if (data && data.length > 0) {
                data.forEach(dest => {
                    const option = document.createElement('option');
                    option.value = dest.name;
                    option.textContent = dest.name;
                    citySelect.appendChild(option);
                });
            }
        } catch (err) {
            console.error('Error loading destinations:', err);
            citySelect.innerHTML = '<option value="">Error al cargar ciudades</option>';
        }
    }

    loadDestinations();

    // Submit form
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateStep()) {
            alert('Por favor, completa todos los campos requeridos en el último paso.');
            return;
        }

        submitBtn.disabled = true;
        const originalBtnHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span>Enviando...</span>';

        try {
            const ageStatusValue = document.querySelector('input[name="age_type"]:checked').value;
            
            const payload = {
                // Contacto
                contact_name: document.getElementById('first-name').value,
                contact_lastname: document.getElementById('last-name').value,
                fiscal_condition: document.getElementById('fiscal-condition').value,
                legal_document: document.getElementById('legal-doc').value,
                mobile_phone: document.getElementById('mobile-phone').value,
                alt_phone: document.getElementById('alt-phone').value || null,

                // Publicación
                operation_type: 'Venta',
                property_type: document.getElementById('property-type').value,
                property_subtype: document.getElementById('property-subtype').value || null,

                // Ubicación
                address_street: document.getElementById('street').value,
                address_state: document.getElementById('state').value,
                address_city: document.getElementById('city').value,
                address_neighborhood: document.getElementById('neighborhood').value,
                location_preference: 'Aproximada',

                // Superficies
                built_area_sqm: parseFloat(document.getElementById('built-area').value) || 0,
                total_area_sqm: parseFloat(document.getElementById('total-area').value) || 0,

                // Características
                bedrooms: parseInt(document.getElementById('bedrooms').value) || 0,
                bathrooms: parseInt(document.getElementById('bathrooms').value) || 0,
                half_bathrooms: parseInt(document.getElementById('half-bathrooms').value) || 0,
                parking_spaces: parseInt(document.getElementById('parking').value) || 0,

                // Antigüedad
                age_status: ageStatusValue,
                antiquity_years: ageStatusValue === 'Años de uso' 
                    ? parseInt(document.getElementById('antiquity-years-input').value) 
                    : null,

                // Precio y Textos
                price: parseFloat(document.getElementById('price').value) || 0,
                currency: 'MXN',
                maintenance_fee: parseFloat(document.getElementById('maintenance').value) || null,
                title: document.getElementById('property-title').value,
                description: document.getElementById('description').value,
                
                // Amenidades solicitadas
                requested_amenities: Array.from(document.querySelectorAll('.amenity-checkbox:checked')).map(cb => cb.value),
                
                status: 'pending'
            };

            const { error } = await supabase
                .from('listing_requests')
                .insert([payload]);

            if (error) throw error;

            // Mostrar estado de éxito
            form.classList.add('hidden');
            const progressContainer = document.querySelector('.bg-brand-sage\\/30');
            if (progressContainer) progressContainer.classList.add('hidden');
            
            document.getElementById('success-state').classList.remove('hidden');
            document.getElementById('success-state').classList.add('flex');

        } catch (err) {
            console.error('Error al enviar la solicitud:', err);
            alert('Hubo un error al procesar tu solicitud: ' + err.message);
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
        }
    });

    // Initialize UI
    updateStepsUI();
});
