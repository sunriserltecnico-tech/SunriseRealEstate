/**
 * ============================================
 * Sunrise Bacalar — WhatsApp Smart Funnel Widget
 * ============================================
 * Self-contained widget with:
 * - 4-step qualification funnel
 * - Conditional logic (hot/warm/cold leads)
 * - i18n (ES/EN)
 * - WhatsApp message generation via wa.me
 * - Google Meet integration via Apps Script
 * - Supabase registration in qualified_leads
 */
import { supabase } from './supabase.js';

(function () {
    'use strict';

    // ── i18n Translations ─────────────────────────
    const i18n = {
        es: {
            widgetTitle: 'Recibe información personalizada',
            widgetSubtitle: 'Responde algunas preguntas y te enviaremos opciones que se ajusten a tu perfil',
            step: 'Paso',
            of: 'de',
            next: 'Siguiente',
            back: 'Atrás',
            close: 'Cerrar',
            // Step 1
            step1Title: 'Tu Perfil',
            step1Subtitle: 'Cuéntanos sobre tu búsqueda',
            q1: '¿Para qué buscas esta propiedad?',
            q1_options: [
                { value: 'first_home', label: 'Primera casa', icon: 'home' },
                { value: 'vacation', label: 'Casa vacacional', icon: 'beach_access' },
                { value: 'investment', label: 'Inversión para rentas (Airbnb)', icon: 'trending_up' },
                { value: 'development', label: 'Desarrollo turístico/comercial', icon: 'domain' },
                { value: 'exploring', label: 'Solo explorando', icon: 'explore' }
            ],
            q2: '¿Ya conoces Bacalar?',
            q2_options: [
                { value: 'multiple_visits', label: 'Sí, he estado varias veces', icon: 'favorite' },
                { value: 'once', label: 'Solo una vez', icon: 'looks_one' },
                { value: 'no_but_invest', label: 'No, pero me interesa invertir', icon: 'account_balance' },
                { value: 'researching', label: 'Estoy investigando opciones', icon: 'search' }
            ],
            q3: '¿En qué etapa te encuentras?',
            q3_options: [
                { value: '0_3_months', label: 'Listo(a) para comprar (0–3 meses)', icon: 'bolt' },
                { value: '3_6_months', label: 'Evaluando opciones (3–6 meses)', icon: 'schedule' },
                { value: '6_plus', label: 'Planeando a futuro (+6 meses)', icon: 'event' },
                { value: 'just_researching', label: 'Solo investigando', icon: 'menu_book' }
            ],
            // Step 2
            step2Title: 'Capacidad de Inversión',
            step2Subtitle: 'Esto nos ayuda a filtrar opciones para ti',
            q4: 'Rango de inversión aproximado:',
            q4_options: [
                { value: '1m_3m', label: '$1M – $3M MXN', icon: 'payments' },
                { value: '3m_5m', label: '$3M – $5M MXN', icon: 'account_balance_wallet' },
                { value: '5m_10m', label: '$5M – $10M MXN', icon: 'diamond' },
                { value: '10m_plus', label: '+$10M MXN', icon: 'workspace_premium' },
                { value: 'prefer_call', label: 'Prefiero comentarlo en llamada', icon: 'call' }
            ],
            q5: '¿Cómo planeas adquirir la propiedad?',
            q5_options: [
                { value: 'own_resources', label: 'Recursos propios', icon: 'savings' },
                { value: 'financing', label: 'Financiamiento', icon: 'credit_card' },
                { value: 'mixed', label: 'Mixto', icon: 'swap_horiz' },
                { value: 'unsure', label: 'Aún no lo sé', icon: 'help_outline' }
            ],
            // Step 3
            step3Title: 'Tu Intención',
            step3Subtitle: 'Selecciona lo que más te importa',
            q7: '¿Qué es lo más importante para ti?',
            q7_hint: 'Selecciona hasta 2 opciones',
            q7_options: [
                { value: 'high_appreciation', label: 'Alta plusvalía', icon: 'trending_up' },
                { value: 'roi', label: 'Retorno de inversión', icon: 'monetization_on' },
                { value: 'lagoon_proximity', label: 'Cercanía a la laguna', icon: 'water' },
                { value: 'privacy', label: 'Privacidad / naturaleza', icon: 'park' },
                { value: 'strategic_location', label: 'Ubicación estratégica', icon: 'pin_drop' },
                { value: 'development_potential', label: 'Potencial de desarrollo', icon: 'architecture' }
            ],
            q8: '¿Te gustaría recibir opciones similares?',
            q8_yes: 'Sí, envíame opciones filtradas',
            q8_no: 'No, solo esta propiedad',
            q9: '¿Cuándo te gustaría recibir información?',
            q9_options: [
                { value: 'today', label: 'Hoy mismo', icon: 'bolt' },
                { value: 'this_week', label: 'Esta semana', icon: 'date_range' },
                { value: 'just_exploring', label: 'Solo estoy explorando', icon: 'explore' }
            ],
            // Step 4
            step4Title: 'Último paso',
            step4Subtitle: 'Elige cómo quieres que te contactemos',
            optionWhatsapp: 'Recibir información por WhatsApp',
            optionMeet: 'Agendar asesoría personalizada',
            nameLabel: 'Tu nombre',
            namePlaceholder: 'Nombre completo',
            whatsappLabel: 'Tu WhatsApp',
            whatsappPlaceholder: '+52 1 983 000 0000',
            emailLabel: 'Email (opcional)',
            emailPlaceholder: 'tu@email.com',
            emailRequired: 'Email (requerido para la invitación)',
            dayLabel: '¿Qué día te funciona mejor?',
            dayOptions: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
            langLabel: '¿Prefieres llamada en:',
            langEs: 'Español',
            langEn: 'Inglés',
            notesLabel: '¿Algo importante antes de la llamada?',
            notesPlaceholder: 'Ejemplo: busco terreno con vista a la laguna...',
            btnWhatsapp: 'Enviar por WhatsApp',
            btnMeet: 'Agendar videollamada',
            sending: 'Enviando...',
            scheduling: 'Agendando...',
            successWa: '¡Listo! Redirigiendo a WhatsApp...',
            successMeet: '¡Asesoría agendada! Revisa tu email para la invitación.',
            errorGeneric: 'Hubo un error. Por favor intenta de nuevo.',
            errorName: 'Por favor ingresa tu nombre',
            errorWhatsapp: 'Por favor ingresa tu WhatsApp',
            errorEmail: 'Por favor ingresa tu email para la invitación',
            meetNotConfigured: 'Videollamada no disponible en este momento. Se enviará por WhatsApp.',
            poweredBy: 'Sunrise Real Estate'
        },
        en: {
            widgetTitle: 'Get personalized information',
            widgetSubtitle: 'Answer a few questions and we\'ll send you options tailored to your profile',
            step: 'Step',
            of: 'of',
            next: 'Next',
            back: 'Back',
            close: 'Close',
            step1Title: 'Your Profile',
            step1Subtitle: 'Tell us about your search',
            q1: 'What are you looking for this property for?',
            q1_options: [
                { value: 'first_home', label: 'Primary residence', icon: 'home' },
                { value: 'vacation', label: 'Vacation home', icon: 'beach_access' },
                { value: 'investment', label: 'Rental investment (Airbnb)', icon: 'trending_up' },
                { value: 'development', label: 'Tourism/commercial development', icon: 'domain' },
                { value: 'exploring', label: 'Just exploring', icon: 'explore' }
            ],
            q2: 'Have you been to Bacalar?',
            q2_options: [
                { value: 'multiple_visits', label: 'Yes, several times', icon: 'favorite' },
                { value: 'once', label: 'Only once', icon: 'looks_one' },
                { value: 'no_but_invest', label: 'No, but interested in investing', icon: 'account_balance' },
                { value: 'researching', label: 'Researching options in Mexico', icon: 'search' }
            ],
            q3: 'What stage are you at?',
            q3_options: [
                { value: '0_3_months', label: 'Ready to buy (0–3 months)', icon: 'bolt' },
                { value: '3_6_months', label: 'Evaluating options (3–6 months)', icon: 'schedule' },
                { value: '6_plus', label: 'Planning ahead (+6 months)', icon: 'event' },
                { value: 'just_researching', label: 'Just researching', icon: 'menu_book' }
            ],
            step2Title: 'Investment Capacity',
            step2Subtitle: 'This helps us filter the best options for you',
            q4: 'Approximate investment range:',
            q4_options: [
                { value: '1m_3m', label: '$1M – $3M MXN', icon: 'payments' },
                { value: '3m_5m', label: '$3M – $5M MXN', icon: 'account_balance_wallet' },
                { value: '5m_10m', label: '$5M – $10M MXN', icon: 'diamond' },
                { value: '10m_plus', label: '+$10M MXN', icon: 'workspace_premium' },
                { value: 'prefer_call', label: 'Prefer to discuss on a call', icon: 'call' }
            ],
            q5: 'How do you plan to purchase?',
            q5_options: [
                { value: 'own_resources', label: 'Own resources', icon: 'savings' },
                { value: 'financing', label: 'Financing', icon: 'credit_card' },
                { value: 'mixed', label: 'Mixed', icon: 'swap_horiz' },
                { value: 'unsure', label: 'Not sure yet', icon: 'help_outline' }
            ],
            step3Title: 'Your Intent',
            step3Subtitle: 'Select what matters most to you',
            q7: 'What\'s most important to you?',
            q7_hint: 'Select up to 2 options',
            q7_options: [
                { value: 'high_appreciation', label: 'High appreciation', icon: 'trending_up' },
                { value: 'roi', label: 'Return on investment', icon: 'monetization_on' },
                { value: 'lagoon_proximity', label: 'Lagoon proximity', icon: 'water' },
                { value: 'privacy', label: 'Privacy / nature', icon: 'park' },
                { value: 'strategic_location', label: 'Strategic location', icon: 'pin_drop' },
                { value: 'development_potential', label: 'Development potential', icon: 'architecture' }
            ],
            q8: 'Would you like to receive similar options?',
            q8_yes: 'Yes, send me filtered options',
            q8_no: 'No, only this property',
            q9: 'When would you like to receive information?',
            q9_options: [
                { value: 'today', label: 'Today', icon: 'bolt' },
                { value: 'this_week', label: 'This week', icon: 'date_range' },
                { value: 'just_exploring', label: 'Just exploring', icon: 'explore' }
            ],
            step4Title: 'Last step',
            step4Subtitle: 'Choose how you\'d like us to contact you',
            optionWhatsapp: 'Receive info via WhatsApp',
            optionMeet: 'Schedule a private consultation',
            nameLabel: 'Your name',
            namePlaceholder: 'Full name',
            whatsappLabel: 'Your WhatsApp',
            whatsappPlaceholder: '+52 1 983 000 0000',
            emailLabel: 'Email (optional)',
            emailPlaceholder: 'you@email.com',
            emailRequired: 'Email (required for invitation)',
            dayLabel: 'What day works best for you?',
            dayOptions: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            langLabel: 'Preferred call language:',
            langEs: 'Spanish',
            langEn: 'English',
            notesLabel: 'Anything important before the call?',
            notesPlaceholder: 'E.g.: looking for a lot with lagoon views...',
            btnWhatsapp: 'Send via WhatsApp',
            btnMeet: 'Schedule video call',
            sending: 'Sending...',
            scheduling: 'Scheduling...',
            successWa: 'Done! Redirecting to WhatsApp...',
            successMeet: 'Consultation scheduled! Check your email for the invitation.',
            errorGeneric: 'An error occurred. Please try again.',
            errorName: 'Please enter your name',
            errorWhatsapp: 'Please enter your WhatsApp number',
            errorEmail: 'Please enter your email for the invitation',
            meetNotConfigured: 'Video call unavailable right now. Will be sent via WhatsApp.',
            poweredBy: 'Sunrise Real Estate'
        }
    };

    // ── State ──────────────────────────────────
    let lang = 'es';
    let currentStep = 1;
    const totalSteps = 4;
    const answers = {
        purchase_purpose: null,
        knows_bacalar: null,
        purchase_stage: null,
        budget_range: null,
        payment_method: null,
        priorities: [],
        wants_similar_options: false,
        urgency: null,
        full_name: '',
        whatsapp: '',
        email: '',
        conversion_type: 'whatsapp',
        preferred_day: '',
        preferred_language: 'es',
        pre_call_notes: ''
    };

    let waNumber = '5219838340349';
    let meetWebhookUrl = '';
    let isOpen = false;
    let widgetRoot = null;

    // ── Helpers ────────────────────────────────
    const t = (key) => i18n[lang][key] || key;

    function getLeadScore() {
        const stage = answers.purchase_stage;
        const budget = answers.budget_range;
        const highBudget = ['3m_5m', '5m_10m', '10m_plus', 'prefer_call'].includes(budget);
        const readyToBuy = stage === '0_3_months';
        const evaluating = stage === '3_6_months';

        if (readyToBuy && highBudget) return 'hot';
        if (evaluating || (readyToBuy && !highBudget)) return 'warm';
        if (stage === '3_6_months' && highBudget) return 'hot';
        return 'cold';
    }

    function shouldOfferMeet() {
        const score = getLeadScore();
        return score === 'hot';
    }

    function getScoreEmoji(score) {
        if (score === 'hot') return '🔥';
        if (score === 'warm') return '🟡';
        return '❄️';
    }

    function getScoreLabel(score) {
        if (lang === 'es') {
            if (score === 'hot') return 'LEAD CALIENTE';
            if (score === 'warm') return 'LEAD A NUTRIR';
            return 'LEAD FRÍO';
        }
        if (score === 'hot') return 'HOT LEAD';
        if (score === 'warm') return 'WARM LEAD';
        return 'COLD LEAD';
    }

    function getLabelForValue(questionKey, value) {
        const opts = t(questionKey);
        if (Array.isArray(opts)) {
            const found = opts.find(o => o.value === value);
            return found ? found.label : value;
        }
        return value;
    }

    function buildWhatsAppMessage() {
        const score = getLeadScore();
        const emoji = getScoreEmoji(score);
        const label = getScoreLabel(score);
        const priorities = answers.priorities.map(p => getLabelForValue('q7_options', p)).join(', ');

        const lines = [
            `🏡 *${lang === 'es' ? 'NUEVO PROSPECTO' : 'NEW PROSPECT'} — Sunrise Bacalar*`,
            `━━━━━━━━━━━━━━━━━━━━━━`,
            `${emoji} ${label}`,
            ``,
            `👤 *${lang === 'es' ? 'Nombre' : 'Name'}:* ${answers.full_name}`,
            `📱 *WhatsApp:* ${answers.whatsapp}`,
        ];

        if (answers.email) {
            lines.push(`📧 *Email:* ${answers.email}`);
        }

        lines.push(
            ``,
            `📋 *${lang === 'es' ? 'PERFIL' : 'PROFILE'}*`,
            `• ${lang === 'es' ? 'Propósito' : 'Purpose'}: ${getLabelForValue('q1_options', answers.purchase_purpose)}`,
            `• ${lang === 'es' ? 'Conoce Bacalar' : 'Knows Bacalar'}: ${getLabelForValue('q2_options', answers.knows_bacalar)}`,
            `• ${lang === 'es' ? 'Etapa' : 'Stage'}: ${getLabelForValue('q3_options', answers.purchase_stage)}`,
            ``,
            `💰 *${lang === 'es' ? 'CAPACIDAD' : 'CAPACITY'}*`,
            `• ${lang === 'es' ? 'Rango' : 'Range'}: ${getLabelForValue('q4_options', answers.budget_range)}`,
            `• ${lang === 'es' ? 'Forma de pago' : 'Payment'}: ${getLabelForValue('q5_options', answers.payment_method)}`,
            ``,
            `🎯 *${lang === 'es' ? 'INTENCIÓN' : 'INTENT'}*`,
            `• ${lang === 'es' ? 'Prioridades' : 'Priorities'}: ${priorities || '—'}`,
            `• ${lang === 'es' ? 'Opciones similares' : 'Similar options'}: ${answers.wants_similar_options ? (lang === 'es' ? 'Sí' : 'Yes') : 'No'}`,
            `• ${lang === 'es' ? 'Urgencia' : 'Urgency'}: ${getLabelForValue('q9_options', answers.urgency)}`
        );

        lines.push(``, `📍 *${lang === 'es' ? 'Página' : 'Page'}:* ${window.location.href}`);

        return lines.join('\n');
    }

    // ── CSS ────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('sw-widget-styles')) return;
        const style = document.createElement('style');
        style.id = 'sw-widget-styles';
        style.textContent = `
            #sw-widget-fab {
                position: fixed;
                bottom: 28px;
                right: 28px;
                z-index: 9999;
                width: 64px;
                height: 64px;
                border-radius: 50%;
                background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
                border: none;
                cursor: pointer;
                box-shadow: 0 6px 24px rgba(37, 211, 102, 0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
                animation: sw-pulse 2.5s infinite;
            }
            #sw-widget-fab:hover {
                transform: scale(1.1);
                box-shadow: 0 8px 32px rgba(37, 211, 102, 0.55);
            }
            #sw-widget-fab svg {
                width: 32px;
                height: 32px;
                fill: white;
            }
            #sw-widget-fab.sw-hidden { display: none; }

            @keyframes sw-pulse {
                0%, 100% { box-shadow: 0 6px 24px rgba(37, 211, 102, 0.4); }
                50% { box-shadow: 0 6px 32px rgba(37, 211, 102, 0.7), 0 0 0 12px rgba(37, 211, 102, 0.1); }
            }

            #sw-widget-panel {
                position: fixed;
                bottom: 100px;
                right: 28px;
                z-index: 9998;
                width: 420px;
                max-height: calc(100vh - 140px);
                background: rgba(255, 255, 255, 0.97);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border-radius: 24px;
                border: 1px solid rgba(255, 255, 255, 0.8);
                box-shadow: 0 25px 60px rgba(19, 28, 39, 0.15), 0 0 0 1px rgba(19, 28, 39, 0.05);
                overflow: hidden;
                display: flex;
                flex-direction: column;
                transform: translateY(20px) scale(0.95);
                opacity: 0;
                pointer-events: none;
                transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
                font-family: 'Manrope', sans-serif;
            }
            #sw-widget-panel.sw-open {
                transform: translateY(0) scale(1);
                opacity: 1;
                pointer-events: auto;
            }

            @media (max-width: 480px) {
                #sw-widget-panel {
                    width: calc(100vw - 24px);
                    right: 12px;
                    bottom: 90px;
                    max-height: calc(100vh - 110px);
                    border-radius: 20px;
                }
                #sw-widget-fab {
                    bottom: 20px;
                    right: 20px;
                    width: 56px;
                    height: 56px;
                }
                #sw-widget-fab svg { width: 28px; height: 28px; }
            }

            .sw-header {
                background: linear-gradient(135deg, #205483 0%, #3d6c9d 100%);
                padding: 20px 24px;
                color: white;
                position: relative;
                flex-shrink: 0;
            }
            .sw-header-top {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 4px;
            }
            .sw-header h3 {
                font-family: 'Noto Serif', serif;
                font-size: 18px;
                font-weight: 700;
                margin: 0;
                line-height: 1.3;
            }
            .sw-header p {
                font-size: 12px;
                opacity: 0.85;
                margin: 4px 0 0;
                line-height: 1.4;
            }
            .sw-lang-toggle {
                display: flex;
                gap: 2px;
                background: rgba(255,255,255,0.15);
                border-radius: 8px;
                padding: 2px;
                flex-shrink: 0;
            }
            .sw-lang-btn {
                padding: 4px 10px;
                border-radius: 6px;
                border: none;
                background: transparent;
                color: rgba(255,255,255,0.7);
                font-size: 11px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s;
                font-family: 'Manrope', sans-serif;
            }
            .sw-lang-btn.active {
                background: rgba(255,255,255,0.25);
                color: white;
            }
            .sw-close-btn {
                position: absolute;
                top: 12px;
                right: 12px;
                background: rgba(255,255,255,0.15);
                border: none;
                color: white;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                transition: background 0.2s;
                font-family: 'Material Symbols Outlined';
            }
            .sw-close-btn:hover { background: rgba(255,255,255,0.3); }

            .sw-progress {
                display: flex;
                gap: 6px;
                padding: 0 24px;
                margin: 16px 0 0;
            }
            .sw-progress-bar {
                flex: 1;
                height: 4px;
                border-radius: 4px;
                background: rgba(255,255,255,0.2);
                overflow: hidden;
                transition: all 0.3s;
            }
            .sw-progress-bar .sw-fill {
                height: 100%;
                border-radius: 4px;
                background: #6AC0B2;
                width: 0%;
                transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .sw-progress-bar.sw-done .sw-fill { width: 100%; }
            .sw-progress-bar.sw-active .sw-fill { width: 50%; }

            .sw-body {
                flex: 1;
                overflow-y: auto;
                padding: 20px 24px;
                scrollbar-width: thin;
                scrollbar-color: #cbd5e1 transparent;
            }
            .sw-body::-webkit-scrollbar { width: 5px; }
            .sw-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

            .sw-step {
                display: none;
                animation: sw-slide-in 0.35s ease-out;
            }
            .sw-step.sw-active { display: block; }
            @keyframes sw-slide-in {
                from { opacity: 0; transform: translateX(20px); }
                to { opacity: 1; transform: translateX(0); }
            }

            .sw-step-label {
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 2px;
                color: #3d6c9d;
                margin-bottom: 4px;
            }
            .sw-step-title {
                font-family: 'Noto Serif', serif;
                font-size: 20px;
                font-weight: 700;
                color: #131c27;
                margin: 0 0 4px;
            }
            .sw-step-desc {
                font-size: 13px;
                color: #727780;
                margin: 0 0 20px;
            }

            .sw-question {
                margin-bottom: 20px;
            }
            .sw-question-label {
                font-size: 13px;
                font-weight: 700;
                color: #131c27;
                margin-bottom: 10px;
                display: block;
            }
            .sw-question-hint {
                font-size: 11px;
                color: #727780;
                font-weight: 400;
                margin-left: 4px;
            }

            .sw-options {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .sw-option {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                border-radius: 14px;
                border: 2px solid #e5effd;
                background: #f7f9ff;
                cursor: pointer;
                transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
                user-select: none;
            }
            .sw-option:hover {
                border-color: #70B2DE;
                background: #edf4ff;
                transform: translateX(4px);
            }
            .sw-option.sw-selected {
                border-color: #3d6c9d;
                background: linear-gradient(135deg, #edf4ff 0%, #d1e4ff 100%);
                box-shadow: 0 2px 12px rgba(61, 108, 157, 0.15);
            }
            .sw-option.sw-selected .sw-option-icon {
                background: #3d6c9d;
                color: white;
            }
            .sw-option-icon {
                width: 36px;
                height: 36px;
                border-radius: 10px;
                background: #dfe9f8;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                transition: all 0.25s;
                font-family: 'Material Symbols Outlined';
                font-size: 20px;
                color: #3d6c9d;
            }
            .sw-option-label {
                font-size: 13px;
                font-weight: 600;
                color: #131c27;
                flex: 1;
            }
            .sw-option-check {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                border: 2px solid #c2c7d0;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                transition: all 0.25s;
                font-family: 'Material Symbols Outlined';
                font-size: 14px;
                color: transparent;
            }
            .sw-option.sw-selected .sw-option-check {
                border-color: #3d6c9d;
                background: #3d6c9d;
                color: white;
            }
            .sw-option.sw-checkbox .sw-option-check { border-radius: 6px; }

            .sw-footer {
                padding: 16px 24px;
                border-top: 1px solid #e5effd;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
                background: rgba(255,255,255,0.9);
            }
            .sw-btn {
                padding: 10px 24px;
                border-radius: 12px;
                border: none;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.25s;
                font-family: 'Manrope', sans-serif;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .sw-btn-back {
                background: transparent;
                color: #727780;
            }
            .sw-btn-back:hover { color: #131c27; }
            .sw-btn-next {
                background: linear-gradient(135deg, #205483 0%, #3d6c9d 100%);
                color: white;
                box-shadow: 0 4px 16px rgba(32, 84, 131, 0.3);
            }
            .sw-btn-next:hover {
                box-shadow: 0 6px 20px rgba(32, 84, 131, 0.45);
                transform: translateY(-1px);
            }
            .sw-btn-next:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }
            .sw-btn-wa {
                background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
                color: white;
                box-shadow: 0 4px 16px rgba(37, 211, 102, 0.3);
                width: 100%;
                justify-content: center;
                padding: 14px;
                border-radius: 14px;
                font-size: 14px;
            }
            .sw-btn-wa:hover {
                box-shadow: 0 6px 20px rgba(37, 211, 102, 0.45);
                transform: translateY(-1px);
            }
            .sw-btn-meet {
                background: linear-gradient(135deg, #4285F4 0%, #1a73e8 100%);
                color: white;
                box-shadow: 0 4px 16px rgba(66, 133, 244, 0.3);
                width: 100%;
                justify-content: center;
                padding: 14px;
                border-radius: 14px;
                font-size: 14px;
            }
            .sw-btn-meet:hover {
                box-shadow: 0 6px 20px rgba(66, 133, 244, 0.45);
                transform: translateY(-1px);
            }

            .sw-conversion-toggle {
                display: flex;
                gap: 8px;
                margin-bottom: 20px;
            }
            .sw-conv-option {
                flex: 1;
                padding: 14px 12px;
                border-radius: 14px;
                border: 2px solid #e5effd;
                background: #f7f9ff;
                cursor: pointer;
                text-align: center;
                transition: all 0.25s;
            }
            .sw-conv-option:hover { border-color: #70B2DE; }
            .sw-conv-option.sw-selected {
                border-color: #3d6c9d;
                background: linear-gradient(135deg, #edf4ff 0%, #d1e4ff 100%);
            }
            .sw-conv-option .sw-conv-icon {
                font-family: 'Material Symbols Outlined';
                font-size: 28px;
                color: #3d6c9d;
                display: block;
                margin-bottom: 6px;
            }
            .sw-conv-option .sw-conv-label {
                font-size: 11px;
                font-weight: 700;
                color: #131c27;
            }

            .sw-input-group {
                margin-bottom: 14px;
            }
            .sw-input-group label {
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #515B67;
                display: block;
                margin-bottom: 6px;
            }
            .sw-input-group input,
            .sw-input-group textarea,
            .sw-input-group select {
                width: 100%;
                padding: 10px 14px;
                border: 2px solid #e5effd;
                border-radius: 12px;
                background: #f7f9ff;
                font-size: 14px;
                font-family: 'Manrope', sans-serif;
                color: #131c27;
                outline: none;
                transition: border-color 0.2s;
                box-sizing: border-box;
            }
            .sw-input-group input:focus,
            .sw-input-group textarea:focus,
            .sw-input-group select:focus {
                border-color: #3d6c9d;
                background: white;
            }
            .sw-input-group textarea { resize: vertical; min-height: 70px; }

            .sw-meet-fields { display: none; }
            .sw-meet-fields.sw-visible { display: block; }

            .sw-day-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 6px;
            }
            .sw-day-btn {
                padding: 8px;
                border-radius: 10px;
                border: 2px solid #e5effd;
                background: #f7f9ff;
                font-size: 12px;
                font-weight: 600;
                color: #131c27;
                cursor: pointer;
                transition: all 0.2s;
                font-family: 'Manrope', sans-serif;
                text-align: center;
            }
            .sw-day-btn:hover { border-color: #70B2DE; }
            .sw-day-btn.sw-selected {
                border-color: #3d6c9d;
                background: #3d6c9d;
                color: white;
            }

            .sw-lang-row {
                display: flex;
                gap: 8px;
            }
            .sw-lang-option {
                flex: 1;
                padding: 10px;
                border-radius: 10px;
                border: 2px solid #e5effd;
                background: #f7f9ff;
                font-size: 13px;
                font-weight: 600;
                color: #131c27;
                cursor: pointer;
                text-align: center;
                transition: all 0.2s;
            }
            .sw-lang-option:hover { border-color: #70B2DE; }
            .sw-lang-option.sw-selected {
                border-color: #3d6c9d;
                background: #3d6c9d;
                color: white;
            }

            .sw-error-msg {
                background: #fef2f2;
                border: 1px solid #fecaca;
                color: #991b1b;
                padding: 10px 14px;
                border-radius: 10px;
                font-size: 12px;
                font-weight: 600;
                margin-bottom: 14px;
                display: none;
            }
            .sw-error-msg.sw-visible { display: block; }

            .sw-success-panel {
                display: none;
                text-align: center;
                padding: 40px 24px;
            }
            .sw-success-panel.sw-visible { display: block; }
            .sw-success-icon {
                font-family: 'Material Symbols Outlined';
                font-size: 56px;
                color: #6AC0B2;
                margin-bottom: 16px;
            }
            .sw-success-title {
                font-family: 'Noto Serif', serif;
                font-size: 20px;
                font-weight: 700;
                color: #131c27;
                margin-bottom: 8px;
            }
            .sw-success-desc {
                font-size: 13px;
                color: #727780;
                line-height: 1.5;
            }
        `;
        document.head.appendChild(style);
    }

    // ── Render ─────────────────────────────────
    function createWidget() {
        injectStyles();

        // FAB Button
        const fab = document.createElement('button');
        fab.id = 'sw-widget-fab';
        fab.setAttribute('aria-label', 'WhatsApp');
        fab.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
        fab.onclick = togglePanel;
        document.body.appendChild(fab);

        // Panel
        const panel = document.createElement('div');
        panel.id = 'sw-widget-panel';
        document.body.appendChild(panel);

        widgetRoot = panel;
        renderPanel();
    }

    function renderPanel() {
        const panel = widgetRoot;
        panel.innerHTML = '';

        // Header
        const header = document.createElement('div');
        header.className = 'sw-header';
        header.innerHTML = `
            <div class="sw-header-top">
                <div>
                    <h3>${t('widgetTitle')}</h3>
                    <p>${t('widgetSubtitle')}</p>
                </div>
            </div>
            <div class="sw-lang-toggle" style="position:absolute;top:44px;right:50px;">
                <button class="sw-lang-btn ${lang === 'es' ? 'active' : ''}" data-lang="es">ES</button>
                <button class="sw-lang-btn ${lang === 'en' ? 'active' : ''}" data-lang="en">EN</button>
            </div>
            <button class="sw-close-btn" aria-label="Close">close</button>
            <div class="sw-progress">
                ${Array.from({ length: totalSteps }, (_, i) => {
                    const step = i + 1;
                    let cls = '';
                    if (step < currentStep) cls = 'sw-done';
                    else if (step === currentStep) cls = 'sw-active';
                    return `<div class="sw-progress-bar ${cls}"><div class="sw-fill"></div></div>`;
                }).join('')}
            </div>
        `;
        panel.appendChild(header);

        // Lang toggle
        header.querySelectorAll('.sw-lang-btn').forEach(btn => {
            btn.onclick = () => {
                lang = btn.dataset.lang;
                renderPanel();
            };
        });
        header.querySelector('.sw-close-btn').onclick = togglePanel;

        // Body
        const body = document.createElement('div');
        body.className = 'sw-body';
        panel.appendChild(body);

        // Success panel (hidden)
        const success = document.createElement('div');
        success.className = 'sw-success-panel';
        success.id = 'sw-success';
        body.appendChild(success);

        // Steps
        renderStep1(body);
        renderStep2(body);
        renderStep3(body);
        renderStep4(body);

        // Show active step
        body.querySelectorAll('.sw-step').forEach((s, i) => {
            if (i + 1 === currentStep) s.classList.add('sw-active');
        });

        // Footer
        const footer = document.createElement('div');
        footer.className = 'sw-footer';
        footer.id = 'sw-footer';
        renderFooter(footer);
        panel.appendChild(footer);
    }

    function renderRadioQuestion(parent, questionLabelKey, optionsKey, answerKey) {
        const q = document.createElement('div');
        q.className = 'sw-question';
        q.innerHTML = `<span class="sw-question-label">${t(questionLabelKey)}</span>`;
        const opts = document.createElement('div');
        opts.className = 'sw-options';
        t(optionsKey).forEach(opt => {
            const o = document.createElement('div');
            o.className = `sw-option ${answers[answerKey] === opt.value ? 'sw-selected' : ''}`;
            o.innerHTML = `
                <span class="sw-option-icon">${opt.icon}</span>
                <span class="sw-option-label">${opt.label}</span>
                <span class="sw-option-check">check</span>
            `;
            o.onclick = () => {
                answers[answerKey] = opt.value;
                opts.querySelectorAll('.sw-option').forEach(el => el.classList.remove('sw-selected'));
                o.classList.add('sw-selected');
                updateFooter();
            };
            opts.appendChild(o);
        });
        q.appendChild(opts);
        parent.appendChild(q);
    }

    function renderStep1(body) {
        const step = document.createElement('div');
        step.className = 'sw-step';
        step.dataset.step = '1';
        step.innerHTML = `
            <div class="sw-step-label">${t('step')} 1 ${t('of')} ${totalSteps}</div>
            <h4 class="sw-step-title">${t('step1Title')}</h4>
            <p class="sw-step-desc">${t('step1Subtitle')}</p>
        `;
        renderRadioQuestion(step, 'q1', 'q1_options', 'purchase_purpose');
        renderRadioQuestion(step, 'q2', 'q2_options', 'knows_bacalar');
        renderRadioQuestion(step, 'q3', 'q3_options', 'purchase_stage');
        body.appendChild(step);
    }

    function renderStep2(body) {
        const step = document.createElement('div');
        step.className = 'sw-step';
        step.dataset.step = '2';
        step.innerHTML = `
            <div class="sw-step-label">${t('step')} 2 ${t('of')} ${totalSteps}</div>
            <h4 class="sw-step-title">${t('step2Title')}</h4>
            <p class="sw-step-desc">${t('step2Subtitle')}</p>
        `;
        renderRadioQuestion(step, 'q4', 'q4_options', 'budget_range');
        renderRadioQuestion(step, 'q5', 'q5_options', 'payment_method');
        body.appendChild(step);
    }

    function renderStep3(body) {
        const step = document.createElement('div');
        step.className = 'sw-step';
        step.dataset.step = '3';
        step.innerHTML = `
            <div class="sw-step-label">${t('step')} 3 ${t('of')} ${totalSteps}</div>
            <h4 class="sw-step-title">${t('step3Title')}</h4>
            <p class="sw-step-desc">${t('step3Subtitle')}</p>
        `;

        // Q7 – Checkboxes (max 2)
        const q7 = document.createElement('div');
        q7.className = 'sw-question';
        q7.innerHTML = `<span class="sw-question-label">${t('q7')}<span class="sw-question-hint">(${t('q7_hint')})</span></span>`;
        const opts7 = document.createElement('div');
        opts7.className = 'sw-options';
        t('q7_options').forEach(opt => {
            const o = document.createElement('div');
            o.className = `sw-option sw-checkbox ${answers.priorities.includes(opt.value) ? 'sw-selected' : ''}`;
            o.innerHTML = `
                <span class="sw-option-icon">${opt.icon}</span>
                <span class="sw-option-label">${opt.label}</span>
                <span class="sw-option-check">check</span>
            `;
            o.onclick = () => {
                const idx = answers.priorities.indexOf(opt.value);
                if (idx >= 0) {
                    answers.priorities.splice(idx, 1);
                    o.classList.remove('sw-selected');
                } else if (answers.priorities.length < 2) {
                    answers.priorities.push(opt.value);
                    o.classList.add('sw-selected');
                }
                updateFooter();
            };
            opts7.appendChild(o);
        });
        q7.appendChild(opts7);
        step.appendChild(q7);

        // Q8 – Similar options (yes/no)
        const q8 = document.createElement('div');
        q8.className = 'sw-question';
        q8.innerHTML = `<span class="sw-question-label">${t('q8')}</span>`;
        const opts8 = document.createElement('div');
        opts8.className = 'sw-options';
        [{ value: true, label: t('q8_yes'), icon: 'thumb_up' }, { value: false, label: t('q8_no'), icon: 'thumb_down' }].forEach(opt => {
            const o = document.createElement('div');
            o.className = `sw-option ${answers.wants_similar_options === opt.value ? 'sw-selected' : ''}`;
            o.innerHTML = `
                <span class="sw-option-icon">${opt.icon}</span>
                <span class="sw-option-label">${opt.label}</span>
                <span class="sw-option-check">check</span>
            `;
            o.onclick = () => {
                answers.wants_similar_options = opt.value;
                opts8.querySelectorAll('.sw-option').forEach(el => el.classList.remove('sw-selected'));
                o.classList.add('sw-selected');
                updateFooter();
            };
            opts8.appendChild(o);
        });
        q8.appendChild(opts8);
        step.appendChild(q8);

        // Q9 – Urgency
        renderRadioQuestion(step, 'q9', 'q9_options', 'urgency');

        body.appendChild(step);
    }

    function renderStep4(body) {
        const step = document.createElement('div');
        step.className = 'sw-step';
        step.dataset.step = '4';

        const offerMeet = shouldOfferMeet();
        step.innerHTML = `
            <div class="sw-step-label">${t('step')} 4 ${t('of')} ${totalSteps}</div>
            <h4 class="sw-step-title">${t('step4Title')}</h4>
            <p class="sw-step-desc">${t('step4Subtitle')}</p>
            <div class="sw-error-msg" id="sw-error"></div>
        `;

        // Conversion toggle (WhatsApp vs Meet) — only if hot lead
        if (offerMeet) {
            const toggle = document.createElement('div');
            toggle.className = 'sw-conversion-toggle';
            toggle.innerHTML = `
                <div class="sw-conv-option ${answers.conversion_type === 'whatsapp' ? 'sw-selected' : ''}" data-type="whatsapp">
                    <span class="sw-conv-icon">chat</span>
                    <span class="sw-conv-label">${t('optionWhatsapp')}</span>
                </div>
                <div class="sw-conv-option ${answers.conversion_type === 'videocall' ? 'sw-selected' : ''}" data-type="videocall">
                    <span class="sw-conv-icon">videocam</span>
                    <span class="sw-conv-label">${t('optionMeet')}</span>
                </div>
            `;
            toggle.querySelectorAll('.sw-conv-option').forEach(opt => {
                opt.onclick = () => {
                    answers.conversion_type = opt.dataset.type;
                    toggle.querySelectorAll('.sw-conv-option').forEach(o => o.classList.remove('sw-selected'));
                    opt.classList.add('sw-selected');
                    // Toggle meet fields
                    const meetFields = step.querySelector('.sw-meet-fields');
                    const emailGroup = step.querySelector('[data-field="email"]');
                    const waGroup = step.querySelector('[data-field="whatsapp"]');
                    if (answers.conversion_type === 'videocall') {
                        meetFields?.classList.add('sw-visible');
                        if (emailGroup) emailGroup.querySelector('label').textContent = t('emailRequired');
                        if (waGroup) waGroup.style.display = 'none';
                    } else {
                        meetFields?.classList.remove('sw-visible');
                        if (emailGroup) emailGroup.querySelector('label').textContent = t('emailLabel');
                        if (waGroup) waGroup.style.display = '';
                    }
                    updateFooter();
                };
            });
            step.appendChild(toggle);
        }

        // Contact fields
        const fields = document.createElement('div');
        fields.innerHTML = `
            <div class="sw-input-group">
                <label>${t('nameLabel')}</label>
                <input type="text" id="sw-name" placeholder="${t('namePlaceholder')}" value="${answers.full_name}">
            </div>
            <div class="sw-input-group" data-field="whatsapp" style="${answers.conversion_type === 'videocall' ? 'display:none' : ''}">
                <label>${t('whatsappLabel')}</label>
                <input type="tel" id="sw-whatsapp" placeholder="${t('whatsappPlaceholder')}" value="${answers.whatsapp}">
            </div>
            <div class="sw-input-group" data-field="email">
                <label>${answers.conversion_type === 'videocall' ? t('emailRequired') : t('emailLabel')}</label>
                <input type="email" id="sw-email" placeholder="${t('emailPlaceholder')}" value="${answers.email}">
            </div>
        `;
        step.appendChild(fields);

        // Meet-specific fields
        if (offerMeet) {
            const meetFields = document.createElement('div');
            meetFields.className = `sw-meet-fields ${answers.conversion_type === 'videocall' ? 'sw-visible' : ''}`;
            meetFields.innerHTML = `
                <div class="sw-input-group">
                    <label>${t('dayLabel')}</label>
                    <div class="sw-day-grid" id="sw-day-grid"></div>
                </div>
                <div class="sw-input-group">
                    <label>${t('langLabel')}</label>
                    <div class="sw-lang-row" id="sw-call-lang">
                        <div class="sw-lang-option ${answers.preferred_language === 'es' ? 'sw-selected' : ''}" data-lang="es">🇲🇽 ${t('langEs')}</div>
                        <div class="sw-lang-option ${answers.preferred_language === 'en' ? 'sw-selected' : ''}" data-lang="en">🇺🇸 ${t('langEn')}</div>
                    </div>
                </div>
                <div class="sw-input-group">
                    <label>${t('notesLabel')}</label>
                    <textarea id="sw-notes" placeholder="${t('notesPlaceholder')}">${answers.pre_call_notes}</textarea>
                </div>
            `;
            step.appendChild(meetFields);

            // Render day grid after appending to DOM
            setTimeout(() => {
                const dayGrid = step.querySelector('#sw-day-grid');
                if (dayGrid) {
                    t('dayOptions').forEach(day => {
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.className = `sw-day-btn ${answers.preferred_day === day ? 'sw-selected' : ''}`;
                        btn.textContent = day;
                        btn.onclick = () => {
                            answers.preferred_day = day;
                            dayGrid.querySelectorAll('.sw-day-btn').forEach(b => b.classList.remove('sw-selected'));
                            btn.classList.add('sw-selected');
                        };
                        dayGrid.appendChild(btn);
                    });
                }
                const callLang = step.querySelector('#sw-call-lang');
                if (callLang) {
                    callLang.querySelectorAll('.sw-lang-option').forEach(opt => {
                        opt.onclick = () => {
                            answers.preferred_language = opt.dataset.lang;
                            callLang.querySelectorAll('.sw-lang-option').forEach(o => o.classList.remove('sw-selected'));
                            opt.classList.add('sw-selected');
                        };
                    });
                }
            }, 0);
        }

        body.appendChild(step);
    }

    function renderFooter(footer) {
        footer.innerHTML = '';
        if (currentStep === 1) {
            footer.innerHTML = `<div></div>`;
            const next = document.createElement('button');
            next.className = 'sw-btn sw-btn-next';
            next.innerHTML = `${t('next')} <span class="material-symbols-outlined" style="font-size:16px">arrow_forward</span>`;
            next.disabled = !isStep1Valid();
            next.onclick = () => goToStep(2);
            footer.appendChild(next);
        } else if (currentStep === 2) {
            const back = document.createElement('button');
            back.className = 'sw-btn sw-btn-back';
            back.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px">arrow_back</span> ${t('back')}`;
            back.onclick = () => goToStep(1);
            footer.appendChild(back);
            const next = document.createElement('button');
            next.className = 'sw-btn sw-btn-next';
            next.innerHTML = `${t('next')} <span class="material-symbols-outlined" style="font-size:16px">arrow_forward</span>`;
            next.disabled = !isStep2Valid();
            next.onclick = () => goToStep(3);
            footer.appendChild(next);
        } else if (currentStep === 3) {
            const back = document.createElement('button');
            back.className = 'sw-btn sw-btn-back';
            back.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px">arrow_back</span> ${t('back')}`;
            back.onclick = () => goToStep(2);
            footer.appendChild(back);
            const next = document.createElement('button');
            next.className = 'sw-btn sw-btn-next';
            next.innerHTML = `${t('next')} <span class="material-symbols-outlined" style="font-size:16px">arrow_forward</span>`;
            next.disabled = !isStep3Valid();
            next.onclick = () => goToStep(4);
            footer.appendChild(next);
        } else if (currentStep === 4) {
            const back = document.createElement('button');
            back.className = 'sw-btn sw-btn-back';
            back.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px">arrow_back</span> ${t('back')}`;
            back.onclick = () => goToStep(3);
            footer.appendChild(back);

            if (answers.conversion_type === 'videocall') {
                const btn = document.createElement('button');
                btn.className = 'sw-btn sw-btn-meet';
                btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px">videocam</span> ${t('btnMeet')}`;
                btn.onclick = handleMeetSubmit;
                footer.appendChild(btn);
            } else {
                const btn = document.createElement('button');
                btn.className = 'sw-btn sw-btn-wa';
                btn.innerHTML = `<svg style="width:18px;height:18px;fill:white;margin-right:4px" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> ${t('btnWhatsapp')}`;
                btn.onclick = handleWhatsAppSubmit;
                footer.appendChild(btn);
            }
        }
    }

    // ── Validation ─────────────────────────────
    function isStep1Valid() {
        return answers.purchase_purpose && answers.knows_bacalar && answers.purchase_stage;
    }
    function isStep2Valid() {
        return answers.budget_range && answers.payment_method;
    }
    function isStep3Valid() {
        return answers.priorities.length > 0 && answers.urgency;
    }

    function updateFooter() {
        const footer = document.getElementById('sw-footer');
        if (footer) renderFooter(footer);
    }

    // ── Navigation ─────────────────────────────
    function goToStep(step) {
        // Sync input values from step 4 before leaving
        syncStep4Inputs();
        currentStep = step;
        renderPanel();
        // Re-open the panel state
        setTimeout(() => {
            widgetRoot.classList.add('sw-open');
        }, 10);
    }

    function syncStep4Inputs() {
        const name = document.getElementById('sw-name');
        const wa = document.getElementById('sw-whatsapp');
        const email = document.getElementById('sw-email');
        const notes = document.getElementById('sw-notes');
        if (name) answers.full_name = name.value.trim();
        if (wa) answers.whatsapp = wa.value.trim();
        if (email) answers.email = email.value.trim();
        if (notes) answers.pre_call_notes = notes.value.trim();
    }

    // ── Toggle ─────────────────────────────────
    function togglePanel() {
        isOpen = !isOpen;
        const panel = document.getElementById('sw-widget-panel');
        const fab = document.getElementById('sw-widget-fab');
        if (isOpen) {
            panel.classList.add('sw-open');
            fab.style.transform = 'scale(0)';
            fab.style.opacity = '0';
        } else {
            panel.classList.remove('sw-open');
            fab.style.transform = '';
            fab.style.opacity = '';
        }
    }

    // Expose to global scope for external buttons
    window.openSunriseWidget = function() {
        if (!isOpen) {
            togglePanel();
        }
    };

    // ── Submit Handlers ────────────────────────
    async function handleWhatsAppSubmit() {
        syncStep4Inputs();
        const errEl = document.getElementById('sw-error');

        if (!answers.full_name) {
            showError(errEl, t('errorName'));
            return;
        }
        if (!answers.whatsapp) {
            showError(errEl, t('errorWhatsapp'));
            return;
        }
        hideError(errEl);

        const footer = document.getElementById('sw-footer');
        const btn = footer.querySelector('.sw-btn-wa');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px;animation:spin 1s linear infinite">sync</span> ${t('sending')}`;
        }

        try {
            // Register in Supabase
            await registerLead();

            // Build WhatsApp message
            const msg = buildWhatsAppMessage();
            const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;

            showSuccess(t('successWa'));

            setTimeout(() => {
                window.open(waUrl, '_blank');
            }, 1000);
        } catch (err) {
            console.error('Widget error:', err);
            showError(errEl, t('errorGeneric'));
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = t('btnWhatsapp');
            }
        }
    }

    async function handleMeetSubmit() {
        syncStep4Inputs();
        const errEl = document.getElementById('sw-error');

        if (!answers.full_name) {
            showError(errEl, t('errorName'));
            return;
        }
        if (!answers.email) {
            showError(errEl, t('errorEmail'));
            return;
        }
        hideError(errEl);

        const footer = document.getElementById('sw-footer');
        const btn = footer.querySelector('.sw-btn-meet');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px;animation:spin 1s linear infinite">sync</span> ${t('scheduling')}`;
        }

        try {
            let meetLink = '';

            if (meetWebhookUrl) {
                // Call Google Apps Script
                const response = await fetch(meetWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clientName: answers.full_name,
                        clientEmail: answers.email,
                        preferredDay: answers.preferred_day,
                        language: answers.preferred_language,
                        preCallNotes: answers.pre_call_notes,
                        leadScore: getLeadScore(),
                        purchasePurpose: getLabelForValue('q1_options', answers.purchase_purpose),
                        budgetRange: getLabelForValue('q4_options', answers.budget_range)
                    }),
                    mode: 'no-cors'
                });

                try {
                    const result = await response.json();
                    if (result.meetLink) meetLink = result.meetLink;
                } catch (e) {
                    // no-cors mode doesn't return body, that's ok
                }
            }

            // Register in Supabase
            answers.meet_link = meetLink;
            await registerLead();

            showSuccess(t('successMeet'));
        } catch (err) {
            console.error('Meet scheduling error:', err);
            showError(errEl, t('errorGeneric'));
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = t('btnMeet');
            }
        }
    }

    async function registerLead() {
        const score = getLeadScore();
        const payload = {
            full_name: answers.full_name,
            whatsapp: answers.whatsapp || null,
            email: answers.email || null,
            purchase_purpose: answers.purchase_purpose,
            knows_bacalar: answers.knows_bacalar,
            purchase_stage: answers.purchase_stage,
            budget_range: answers.budget_range,
            payment_method: answers.payment_method,
            priorities: answers.priorities,
            wants_similar_options: answers.wants_similar_options,
            urgency: answers.urgency,
            preferred_day: answers.preferred_day || null,
            preferred_language: answers.preferred_language || null,
            pre_call_notes: answers.pre_call_notes || null,
            lead_score: score,
            conversion_type: answers.conversion_type,
            meet_link: answers.meet_link || null,
            source_page: window.location.href,
            widget_language: lang
        };

        const { error } = await supabase.from('qualified_leads').insert([payload]);
        if (error) {
            console.error('Supabase insert error:', error);
            throw error;
        }
    }

    function showError(el, msg) {
        if (el) {
            el.textContent = msg;
            el.classList.add('sw-visible');
        }
    }
    function hideError(el) {
        if (el) el.classList.remove('sw-visible');
    }

    function showSuccess(message) {
        // Hide steps and footer
        widgetRoot.querySelectorAll('.sw-step').forEach(s => s.classList.remove('sw-active'));
        const footer = document.getElementById('sw-footer');
        if (footer) footer.style.display = 'none';

        const success = document.getElementById('sw-success');
        if (success) {
            success.className = 'sw-success-panel sw-visible';
            success.innerHTML = `
                <div class="sw-success-icon">check_circle</div>
                <h4 class="sw-success-title">${message}</h4>
                <p class="sw-success-desc">${t('poweredBy')}</p>
            `;
        }

        // Reset and close after showing success message for 3.5 seconds
        setTimeout(() => {
            resetWidget();
        }, 3500);
    }

    function resetWidget() {
        answers.purchase_purpose = null;
        answers.knows_bacalar = null;
        answers.purchase_stage = null;
        answers.budget_range = null;
        answers.payment_method = null;
        answers.priorities = [];
        answers.wants_similar_options = false;
        answers.urgency = null;
        answers.full_name = '';
        answers.whatsapp = '';
        answers.email = '';
        answers.conversion_type = 'whatsapp';
        answers.preferred_day = '';
        answers.preferred_language = 'es';
        answers.pre_call_notes = '';

        currentStep = 1;

        if (isOpen) {
            togglePanel();
        }

        // Wait for close animation before re-rendering
        setTimeout(() => {
            renderPanel();
        }, 400);
    }

    // ── Init ──────────────────────────────────
    async function init() {
        // Load WhatsApp number from Supabase
        try {
            const { data } = await supabase
                .from('sticky_contact_settings')
                .select('setting_value')
                .eq('setting_key', 'whatsapp_number')
                .single();
            if (data?.setting_value) {
                waNumber = data.setting_value.replace(/\D/g, '');
            }
        } catch (e) {
            console.warn('Widget: Using fallback WhatsApp number');
        }

        // Load Meet webhook URL from Supabase
        try {
            const { data } = await supabase
                .from('sticky_contact_settings')
                .select('setting_value')
                .eq('setting_key', 'google_meet_webhook_url')
                .single();
            if (data?.setting_value) {
                meetWebhookUrl = data.setting_value;
            }
        } catch (e) {
            console.warn('Widget: Google Meet webhook not configured');
        }

        createWidget();
    }

    // Add spin animation
    const spinStyle = document.createElement('style');
    spinStyle.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
    document.head.appendChild(spinStyle);

    // Boot
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
