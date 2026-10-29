// Tabs, theme and language toggles, start-up.
(function () {
    'use strict';
    const B = window.BB84;

    function selectTab(name) {
        document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
        document.querySelectorAll('.tab-panel').forEach(p => { p.hidden = p.id !== 'tab-' + name; });
        // charts measure their box for tooltips, so redraw once visible
        if (name === 'lab') B.Lab.rerender();
        if (name === 'sim') B.SimUI.rerender();
        try { localStorage.setItem('bb84-tab', name); } catch (e) { /* storage unavailable */ }
    }

    function rerenderAll() {
        B.SimUI.rerender();
        B.Lab.rerender();
    }

    // the button names the language currently shown; clicking switches to the other one
    function labelLangButton() {
        document.getElementById('lang-btn').textContent = B.I18N.lang === 'zh' ? '繁體中文' : 'English';
    }
    function applyLang(lang) {
        B.I18N.setLang(lang);
        labelLangButton();
        B.SimUI.relang();
        B.Lab.relang();
    }

    // translate static labels before the UI modules read or redraw them
    B.I18N.applyStatic();

    document.addEventListener('DOMContentLoaded', () => {
        B.SimUI.init();
        B.Lab.init();
        labelLangButton();
        document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => selectTab(t.dataset.tab)));

        document.getElementById('theme-btn').addEventListener('click', () => {
            const next = B.Charts.currentTheme() === 'dark' ? 'light' : 'dark';
            document.documentElement.dataset.theme = next;
            try { localStorage.setItem('bb84-theme', next); } catch (e) { /* storage unavailable */ }
            rerenderAll();
        });
        document.getElementById('lang-btn').addEventListener('click', () => applyLang(B.I18N.lang === 'zh' ? 'en' : 'zh'));
        if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', rerenderAll);

        let tab = 'sim';
        try {
            const theme = localStorage.getItem('bb84-theme');
            if (theme) { document.documentElement.dataset.theme = theme; rerenderAll(); }
            tab = localStorage.getItem('bb84-tab') || 'sim';
        } catch (e) { /* storage unavailable */ }
        selectTab(tab);
    });
})();
