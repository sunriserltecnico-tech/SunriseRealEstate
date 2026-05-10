import { supabase } from './supabase.js';

/**
 * Lógica de Autenticación para el Panel de Administración
 */

const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Limpiar errores previos
        errorMessage.classList.add('hidden');
        errorMessage.textContent = '';
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Desactivar botón durante el proceso
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';

        try {
            // Intentar inicio de sesión
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Si es exitoso, redirigir al panel de propiedades
            console.log('✅ Auth successful, redirecting...');
            window.location.href = 'properties.html';

        } catch (err) {
            console.error('Auth error:', err.message);
            errorMessage.textContent = err.message || 'Access Denied: Invalid Credentials';
            errorMessage.classList.remove('hidden');
            
            // Restaurar botón
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    });
}
