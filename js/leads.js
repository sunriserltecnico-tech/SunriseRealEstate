import { supabase } from './supabase.js';

export function initLeadForm(config) {
    const { formId, source, propertyId } = config;
    const form = document.getElementById(formId);
    if (!form) return;

    // Form elements
    const nameInput = document.getElementById('lead-name');
    const contactMethodRadios = document.getElementsByName('contact_method');
    const emailContainer = document.getElementById('contact-email-container');
    const phoneContainer = document.getElementById('contact-phone-container');
    const emailInput = document.getElementById('lead-email');
    const phoneInput = document.getElementById('lead-phone');
    const messageInput = form.querySelector('[data-lead="message"]');
    const errorMsg = document.getElementById('lead-error-msg');
    const successMsg = document.getElementById('lead-success-msg');
    const submitBtn = form.querySelector('button[type="submit"]');
    const downloadPdfBtn = document.getElementById('btn-download-pdf');

    // Initialize intl-tel-input
    let iti;
    if (window.intlTelInput) {
        iti = window.intlTelInput(phoneInput, {
            utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
            preferredCountries: ['us', 'ca', 'mx'],
            separateDialCode: true,
        });
    }

    // Toggle Email / Phone
    contactMethodRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'email') {
                emailContainer.classList.remove('hidden');
                phoneContainer.classList.add('hidden');
                emailInput.required = true;
                phoneInput.required = false;
            } else {
                emailContainer.classList.add('hidden');
                phoneContainer.classList.remove('hidden');
                emailInput.required = false;
                phoneInput.required = true;
            }
        });
    });

    // Extract property data from DOM (removing <br> tags if any)
    const titleEl = document.querySelector('[data-prop="title"]');
    const locationEl = document.querySelector('[data-prop="location"]');
    const propertyTitle = titleEl ? titleEl.innerHTML.replace(/<br\s*[\/]?>/gi, ' ').replace(/\n/g, '').trim() : 'Unknown Property';
    const propertyLocation = locationEl ? locationEl.textContent.trim() : 'Unknown Location';

    // Core function to register the lead
    const registerLead = async (eventType) => {
        const method = document.querySelector('input[name="contact_method"]:checked').value;
        let contactValue = '';

        if (method === 'email') {
            contactValue = emailInput.value;
        } else {
            if (iti && iti.isValidNumber()) {
                contactValue = iti.getNumber();
            }
        }

        const name = nameInput.value;

        const { error } = await supabase.from('property_leads').insert([{
            full_name: name,
            contact_method: method,
            contact_value: contactValue,
            property_id: propertyId || null,
            property_title: propertyTitle,
            location: propertyLocation,
            event_type: eventType
        }]);

        if (error) throw error;
        return true;
    };

    // Event: WhatsApp Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsg.classList.add('hidden');
        successMsg.classList.add('hidden');
        
        // Full form validation is handled by HTML5 required attributes for Submit
        if (document.querySelector('input[name="contact_method"]:checked').value === 'phone' && (!iti || !iti.isValidNumber())) {
            errorMsg.textContent = 'Please enter a valid phone number.';
            errorMsg.classList.remove('hidden');
            return;
        }

        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> Processing...';

        try {
            await registerLead('message_sent');

            // Get WhatsApp number from sticky_contact_settings or fallback
            let waNumber = '5219838340349'; // Fallback
            try {
                const { data } = await supabase
                    .from('sticky_contact_settings')
                    .select('setting_value')
                    .eq('setting_key', 'whatsapp_number')
                    .single();
                if (data && data.setting_value) waNumber = data.setting_value.replace(/\D/g, '');
            } catch (err) {
                console.warn('Could not load custom WhatsApp number, using fallback.');
            }

            const msgText = messageInput.value || `I am interested in ${propertyTitle}.`;
            const waMessage = `Hola, me interesa la propiedad ${propertyTitle} en ${propertyLocation}.\n\nMi nombre es ${nameInput.value}.\n\nMensaje: ${msgText}`;

            successMsg.textContent = 'Redirecting to WhatsApp...';
            successMsg.classList.remove('hidden');

            setTimeout(() => {
                window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`, '_blank');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                form.reset();
            }, 1000);

        } catch (err) {
            console.error('Lead error:', err);
            errorMsg.textContent = err.message || 'There was an error processing your request. Please try again.';
            errorMsg.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    // Event: PDF Generation (Lead Magnet)
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', async () => {
            errorMsg.classList.add('hidden');

            // Critical Validation: Only Name and Contact are required for PDF
            const method = document.querySelector('input[name="contact_method"]:checked').value;
            const isNameValid = nameInput.value.trim().length > 0;
            let isContactValid = false;

            if (method === 'email') {
                isContactValid = emailInput.value.trim().length > 0 && emailInput.checkValidity();
            } else {
                isContactValid = iti && iti.isValidNumber();
            }

            if (!isNameValid || !isContactValid) {
                errorMsg.textContent = 'Please enter your name and contact info to download the brochure.';
                errorMsg.classList.remove('hidden');
                
                // Highlight invalid fields visually
                if (!isNameValid) nameInput.reportValidity();
                else if (method === 'email') emailInput.reportValidity();
                return;
            }

            const originalText = downloadPdfBtn.innerHTML;
            downloadPdfBtn.disabled = true;
            downloadPdfBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> Generating PDF...';

            try {
                // Silently register the brochure download
                await registerLead('brochure_download');

                // PDF generation logic using html2pdf
                if (!window.html2pdf) throw new Error('PDF generator not loaded.');

                const element = document.body;
                
                // Hide non-editorial elements temporarily
                const sidebar = document.querySelector('.md\\:col-span-5'); // Target the contact sidebar
                const openInMapsBtn = document.querySelector('a[href="#"]:contains("OPEN IN MAPS")') || document.querySelector('a.underline-offset-4');
                const footer = document.getElementById('app-footer');
                const globalNav = document.querySelector('nav') || document.querySelector('header');
                
                // Find "Comparable Portfolio" section (usually the last section or the one with bg-surface-container-low/50)
                const sections = document.querySelectorAll('section');
                let portfolioSection = null;
                sections.forEach(sec => {
                    if (sec.innerHTML.includes('Comparable Portfolio')) {
                        portfolioSection = sec;
                    }
                });

                // Helper to safely hide
                const hideEl = (el) => { if(el) { el.dataset.prevDisplay = el.style.display; el.style.display = 'none'; } };
                const restoreEl = (el) => { if(el) { el.style.display = el.dataset.prevDisplay || ''; } };

                hideEl(sidebar);
                hideEl(openInMapsBtn);
                hideEl(footer);
                if (globalNav) hideEl(globalNav.closest('header') || globalNav);
                hideEl(portfolioSection);

                const opt = {
                    margin:       0.5,
                    filename:     `${propertyTitle.replace(/\s+/g, '_')}_Brochure.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2, useCORS: true, windowWidth: 1200 },
                    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
                };

                await html2pdf().set(opt).from(element).save().then(() => {
                    // Restore elements after PDF is saved
                    restoreEl(sidebar);
                    restoreEl(openInMapsBtn);
                    restoreEl(footer);
                    if (globalNav) restoreEl(globalNav.closest('header') || globalNav);
                    restoreEl(portfolioSection);

                    downloadPdfBtn.innerHTML = '<span class="material-symbols-outlined text-sm">check</span> Downloaded';
                    setTimeout(() => {
                        downloadPdfBtn.disabled = false;
                        downloadPdfBtn.innerHTML = originalText;
                    }, 3000);
                });

            } catch (err) {
                console.error('PDF error:', err);
                errorMsg.textContent = err.message || 'Error generating PDF. Make sure your details are correct.';
                errorMsg.classList.remove('hidden');
                
                // Ensure elements are restored if error occurs
                const restoreEl = (el) => { if(el) { el.style.display = el.dataset.prevDisplay || ''; } };
                restoreEl(document.querySelector('.md\\:col-span-5'));
                restoreEl(document.querySelector('a.underline-offset-4'));
                restoreEl(document.getElementById('app-footer'));
                const nav = document.querySelector('nav');
                if (nav) restoreEl(nav.closest('header') || nav);
                
                const sections = document.querySelectorAll('section');
                sections.forEach(sec => {
                    if (sec.innerHTML.includes('Comparable Portfolio')) restoreEl(sec);
                });

                downloadPdfBtn.disabled = false;
                downloadPdfBtn.innerHTML = originalText;
            }
        });
    }
}
