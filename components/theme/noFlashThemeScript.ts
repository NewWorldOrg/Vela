/**
 * When the resolved theme is `system` (the cookie is unset or set to `system`),
 * SSR cannot read `prefers-color-scheme`, so we run this inline script before
 * hydration to apply the `dark` class. This prevents the "light flash, then
 * switch to dark after mount" flicker. The layout injects it whenever there is
 * no explicit light/dark mode.
 *
 * The content is a constant string with no user input, so there is no XSS risk.
 */
export const NO_FLASH_THEME_SCRIPT = `
(function(){
  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  } catch (_) {}
})();
`
