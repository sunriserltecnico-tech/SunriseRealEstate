import { supabase } from './supabase.js';
import { initSearchWidget, executeSearch } from './search_widget.js';

document.addEventListener('DOMContentLoaded', async () => {
    await loadLayout();
    await loadAboutSettings();
    await loadTeam();
    await initSearchWidget('about');
    initAboutSearch();
});

async function loadLayout() {
    try {
        const [headerHtml, footerHtml] = await Promise.all([
            fetch('./components/header.html').then(res => res.text()),
            fetch('./components/footer.html').then(res => res.text())
        ]);
        document.getElementById('app-header').innerHTML = headerHtml;
        document.getElementById('app-footer').innerHTML = footerHtml;
    } catch (err) {
        console.error('Error loading layout:', err);
    }
}

async function loadAboutSettings() {
    try {
        const { data, error } = await supabase.from('about_settings').select('*');
        if (error) throw error;

        const settings = data.reduce((acc, item) => {
            acc[item.setting_key] = item.setting_value;
            return acc;
        }, {});

        document.querySelectorAll('[data-content-key]').forEach(el => {
            const key = el.getAttribute('data-content-key');
            if (settings[key]) el.innerHTML = settings[key];
        });

        document.querySelectorAll('[data-src-key]').forEach(el => {
            const key = el.getAttribute('data-src-key');
            if (settings[key]) {
                if (el.tagName === 'IMG') el.src = settings[key];
            }
        });
    } catch (err) {
        console.error('Error loading about settings:', err);
    }
}

async function loadTeam() {
    try {
        const { data: agents, error } = await supabase
            .from('agents')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true });

        if (error) throw error;

        const grid = document.getElementById('team-grid');
        if (!grid || !agents) return;

        grid.innerHTML = ''; 

        agents.forEach(agent => {
            const fullName = agent.full_name || `${agent.first_name || ''} ${agent.last_name || ''}`.trim();
            const card = document.createElement('div');
            card.className = 'group relative cursor-pointer';
            
            // Build social links
            let socialLinks = '';
            if (agent.whatsapp) socialLinks += `<a href="https://wa.me/${agent.whatsapp}" target="_blank" class="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors"><span class="material-symbols-outlined text-white text-lg">chat</span></a>`;
            if (agent.email) socialLinks += `<a href="mailto:${agent.email}" class="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors"><span class="material-symbols-outlined text-white text-lg">mail</span></a>`;
            if (agent.linkedin_url) socialLinks += `<a href="${agent.linkedin_url}" target="_blank" class="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors"><span class="material-symbols-outlined text-white text-lg">link</span></a>`;
            if (agent.instagram_url) socialLinks += `<a href="${agent.instagram_url}" target="_blank" class="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors"><span class="material-symbols-outlined text-white text-lg">camera</span></a>`;

            card.innerHTML = `
                <div class="aspect-[3/4] rounded-xl overflow-hidden mb-5 relative bg-brand-light/20">
                    <img class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-transform duration-1000 group-hover:scale-110" 
                         src="${agent.avatar_url || 'https://via.placeholder.com/400x500'}" alt="${fullName}">
                    
                    <!-- Hover Overlay -->
                    <div class="absolute inset-0 bg-brand-deep/60 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-8 backdrop-blur-md">
                        <div class="space-y-4 translate-y-8 group-hover:translate-y-0 transition-transform duration-500">
                            <p class="text-sm text-white/90 leading-relaxed font-sans italic line-clamp-6">
                                "${agent.bio || 'Curating your Sunrise experience with dedication and architectural passion.'}"
                            </p>
                            <div class="flex gap-2 pt-2 border-t border-white/20">
                                ${socialLinks}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-1">
                    <h4 class="font-headline text-2xl text-brand-deep group-hover:text-brand-sky transition-colors">${fullName}</h4>
                    <h5 class="font-label text-[10px] uppercase tracking-[0.3em] text-brand-slate/60 font-bold">${agent.title || 'Curator'}</h5>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        console.error('Error loading team:', err);
    }
}

function initAboutSearch() {
    const exploreBtn = document.getElementById('search-explore-btn');
    if (!exploreBtn) return;
    exploreBtn.addEventListener('click', () => {
        executeSearch('about');
    });
}
