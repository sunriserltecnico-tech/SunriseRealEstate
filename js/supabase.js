import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Variables de configuración de Supabase (Placeholders para el usuario)
const SUPABASE_URL = 'https://lijqnmiyepemtypfsmyf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpanFubWl5ZXBlbXR5cGZzbXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMDg5MjEsImV4cCI6MjA5MzY4NDkyMX0.4HO_51XnbpCHUR-YwD5tOkzm7qb1diYIRMXw45WTPSE';

/**
 * Instancia única de Supabase para todo el proyecto.
 * Centralizamos aquí la conexión para evitar redundancias y fallos de sesión.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Utilidades Globales de Lectura
 */
export async function getAmenities() {
    const { data, error } = await supabase
        .from('property_amenities')
        .select('*')
        .order('name');
    if (error) throw error;
    return data;
}
