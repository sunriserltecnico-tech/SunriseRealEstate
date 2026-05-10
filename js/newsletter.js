import { supabase } from './supabase.js';

/**
 * Módulo Global de Newsletter
 * Maneja la lógica de suscripción para cualquier formulario con la clase .newsletter-form
 */
document.addEventListener('DOMContentLoaded', () => {
    const forms = document.querySelectorAll('.newsletter-form');
    
    forms.forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = form.querySelector('input[name="email"]');
            if (!emailInput || !emailInput.value) return;
            
            const email = emailInput.value.trim();
            const btn = form.querySelector('button[type="submit"]');
            const originalBtnText = btn ? btn.innerHTML : 'Subscribe Now';
            
            // UI: Loading State
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = 'Subscribing...';
                btn.classList.add('opacity-80', 'cursor-not-allowed');
            }

            try {
                // Insert en BD
                const { error } = await supabase
                    .from('newsletter_subscribers')
                    .insert([{ email }]);
                
                if (error) {
                    // Si el email ya existe (violación de unicidad en BD)
                    if (error.code === '23505' || error.message.includes('duplicate')) {
                        throw new Error('Already subscribed');
                    }
                    throw error;
                }
                
                // UI: Success State (Reemplazar formulario por mensaje elegante)
                const container = form.parentElement;
                
                // Animación de salida del form
                form.style.transition = 'opacity 0.3s ease';
                form.style.opacity = '0';
                
                setTimeout(() => {
                    container.innerHTML = `
                        <div class="animate-fade-in-up py-4 text-center">
                            <p class="text-primary font-headline text-xl md:text-2xl mb-2 transition-all duration-700 transform translate-y-0 opacity-100">
                                Welcome to the inner circle.
                            </p>
                            <p class="text-on-surface-variant text-md transition-all duration-700 delay-100 transform translate-y-0 opacity-100">
                                Your curation begins now.
                            </p>
                        </div>
                    `;
                }, 300);

            } catch (err) {
                console.error('Newsletter subscription error:', err);
                
                // UI: Error State
                if (btn) {
                    btn.disabled = false;
                    btn.classList.remove('opacity-80', 'cursor-not-allowed');
                    
                    if (err.message === 'Already subscribed') {
                        btn.innerHTML = 'Already Subscribed';
                        setTimeout(() => btn.innerHTML = originalBtnText, 3000);
                    } else {
                        btn.innerHTML = 'Error. Try Again.';
                        setTimeout(() => btn.innerHTML = originalBtnText, 3000);
                    }
                }
            }
        });
    });
});
