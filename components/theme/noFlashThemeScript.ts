export const NO_FLASH_THEME_SCRIPT = `
(function(){
  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  } catch (_) {}
})();
`
