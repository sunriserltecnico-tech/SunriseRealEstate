import { supabase } from './supabase.js';

/**
 * Guardián de Sesión (Admin Auth Guard)
 * Este script protege las rutas privadas del CMS.
 */

export async function requireAuth() {
    try {
        // Verificar sesión actual
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
            console.warn('⛔ Acceso denegado: No hay sesión activa. Redirigiendo a login...');
            window.location.href = 'login.html';
            return null;
        }

        console.log('✅ Acceso autorizado.');
        
        // Ejecutar verificación de solicitudes pendientes de forma asíncrona
        checkPendingRequests();
        
        return session;

    } catch (err) {
        console.error('Error in Auth Guard:', err);
        window.location.href = 'login.html';
        return null;
    }
}

/**
 * Verifica solicitudes pendientes e inyecta el badge en el header globalmente
 */
async function checkPendingRequests() {
    try {
        const { count, error } = await supabase
            .from('listing_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        if (error) throw error;

        // Intentar encontrar el enlace de solicitudes
        const maxRetries = 15;
        let retries = 0;

        const injectBadge = () => {
            const navLink = document.getElementById('nav-listing-req');
            
            if (!navLink) {
                if (retries < maxRetries) {
                    retries++;
                    setTimeout(injectBadge, 200);
                }
                return;
            }

            // Limpiar badge anterior
            const existingBadge = document.getElementById('global-nav-badge');
            if (existingBadge) existingBadge.remove();

            if (count > 0) {
                const badge = document.createElement('span');
                badge.id = 'global-nav-badge';
                badge.className = 'absolute -top-2 -right-3 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md animate-pulse z-20 pointer-events-none';
                badge.textContent = count > 9 ? '9+' : count;
                
                navLink.classList.add('relative');
                navLink.appendChild(badge);
            }
        };

        injectBadge();

    } catch (err) {
        console.error('Error checking pending requests:', err);
    }
}
