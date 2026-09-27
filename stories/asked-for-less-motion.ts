export function askedForLessMotion(): () => void {
  const asked = window.matchMedia.bind(window)

  window.matchMedia = ((query: string) =>
    query.includes('prefers-reduced-motion')
      ? ({
          matches: true,
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
        } as MediaQueryList)
      : asked(query)) as typeof window.matchMedia

  return () => {
    window.matchMedia = asked
  }
}
