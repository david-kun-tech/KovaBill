import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

function parse() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = hash.split('?');
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(qs) };
}

const motionOK = () => window.matchMedia('(prefers-reduced-motion: no-preference)').matches;

// Tiny hash router: works on GitHub Pages with no server config.
export function useHashRoute() {
  const [route, setRoute] = useState(parse);

  useEffect(() => {
    const onChange = () => {
      const update = () => {
        setRoute(parse());
        window.scrollTo(0, 0);
      };
      if (document.startViewTransition && motionOK()) {
        document.startViewTransition(() => flushSync(update));
      } else update();
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

export const navigate = (to) => {
  location.hash = to;
};
