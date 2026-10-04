/**
 * Runs in <head> before the page paints, so a dark device never flashes the light page.
 * "auto" follows the phone or computer; light/dark is chosen with ThemeToggle and kept on this device.
 * Kept out of the client component so the server layout gets the plain text.
 */
export const THEME_SCRIPT = `(function(){try{var m=window.matchMedia('(prefers-color-scheme: dark)');function apply(){var p=localStorage.getItem('acv-theme')||'auto';var d=p==='dark'||(p==='auto'&&m.matches);var r=document.documentElement;r.dataset.theme=d?'dark':'light';r.style.colorScheme=d?'dark':'light'}apply();m.addEventListener('change',apply);window.__acvTheme=apply}catch(e){}})()`
