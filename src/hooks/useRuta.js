import { useEffect, useState } from 'react';
/* Router por hash: '#/catalogo?tipo=Mascotas' -> { ruta: '/catalogo', params }. Funciona en GitHub Pages sin dependencias. */
const leer = () => {
  const [ruta, q = ''] = (location.hash.slice(1) || '/').split('?');
  return { ruta: ruta || '/', params: new URLSearchParams(q) };
};
export function useRuta() {
  const [r, setR] = useState(leer);
  useEffect(() => {
    const f = () => { setR(leer()); window.scrollTo({ top: 0, behavior: 'instant' }); };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return r;
}
