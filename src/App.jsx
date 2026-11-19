import { useEffect } from 'react';
import { useRuta } from './hooks/useRuta.js';
import { negocio } from './contenido.js';
import Cabecera from './componentes/Cabecera.jsx';
import Inicio from './componentes/Inicio.jsx';
import Catalogo from './componentes/Catalogo.jsx';
import Producto from './componentes/Producto.jsx';
import Vendedor from './componentes/Vendedor.jsx';
import Admin from './componentes/Admin.jsx';
import { datos } from './lib/datos.js';
import Pie from './componentes/Pie.jsx';

/* Para una página nueva: crea el componente y agrégalo aquí. */
const paginas = {
  '/': [Inicio, negocio.nombre],
  '/catalogo': [Catalogo, `Catálogo | ${negocio.nombre}`],
  '/producto': [Producto, `Producto | ${negocio.nombre}`],
  '/vendedor': [Vendedor, `Vender | ${negocio.nombre}`],
  '/admin': [Admin, `Administración | ${negocio.nombre}`]
};

export default function App() {
  const { ruta, params } = useRuta();
  const [Pagina, titulo] = paginas[ruta] || paginas['/'];
  useEffect(() => { document.title = titulo; }, [titulo]);
  // Al volver del enlace de "olvidé mi contraseña", lleva a la pantalla de nueva contraseña.
  useEffect(() => datos.alRecuperar(() => { location.hash = '#/vendedor?recuperar=1'; }), []);
  return (
    <>
      <a className="salto" href="#principal" onClick={(e) => { e.preventDefault(); document.getElementById('principal').focus(); }}>Saltar al contenido</a>
      <Cabecera ruta={ruta} />
      <main id="principal" tabIndex={-1}><Pagina params={params} /></main>
      <Pie />
    </>
  );
}
