import { useEffect, useState } from 'react';
import { negocio } from '../contenido.js';
import { datos } from '../lib/datos.js';
import { ruta as pub } from '../lib/ruta.js';

const nav = [['#/', '/', 'Inicio'], ['#/catalogo', '/catalogo', 'Catálogo'], ['#/vendedor', '/vendedor', 'Vender']];

export default function Cabecera({ ruta }) {
  const [admin, setAdmin] = useState(false);
  // Se pregunta al servidor en cada cambio de página: aparece tras iniciar sesión y desaparece al salir.
  useEffect(() => { datos.esAdmin().then(setAdmin).catch(() => setAdmin(false)); }, [ruta]);
  const items = admin ? [...nav, ['#/admin', '/admin', 'Admin']] : nav;
  return (
    <header className="cabecera">
      <div className="cabecera__in envoltura">
        <a className="marca" href="#/"><img src={pub('icono.svg')} alt="" width="36" height="36" />{negocio.nombre}</a>
        <nav className="nav" aria-label="Principal">
          <ul>{items.map(([href, r, t]) => <li key={r}><a href={href} aria-current={ruta === r ? 'page' : undefined}>{t}</a></li>)}</ul>
        </nav>
      </div>
    </header>
  );
}
