import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
/* Router por hash: '#/catalogo?tipo=Mascotas' -> { ruta: '/catalogo', params }. Funciona en GitHub Pages sin dependencias. */
const leer = () => {
  const [ruta, q = ''] = (location.hash.slice(1) || '/').split('?');
  return { ruta: ruta || '/', params: new URLSearchParams(q) };
};
export function useRuta() {
  const [r, setR] = useState(leer);
  useEffect(() => {
    const cambiar = () => { setR(leer()); window.scrollTo({ top: 0, behavior: 'instant' }); };
    // Con View Transitions la foto del producto "se acerca" del catálogo a su página; sin ellas, cambia directo.
    const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const f = () => (document.startViewTransition && !quieto ? document.startViewTransition(() => flushSync(cambiar)) : cambiar());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return r;
}
