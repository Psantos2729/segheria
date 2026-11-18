import { negocio } from '../contenido.js';

const nav = [['#/', '/', 'Inicio'], ['#/catalogo', '/catalogo', 'Catálogo'], ['#/vendedor', '/vendedor', 'Vender']];

export default function Cabecera({ ruta }) {
  return (
    <header className="cabecera">
      <div className="cabecera__in envoltura">
        <a className="marca" href="#/">{negocio.nombre}</a>
        <nav className="nav" aria-label="Principal">
          <ul>{nav.map(([href, r, t]) => <li key={r}><a href={href} aria-current={ruta === r ? 'page' : undefined}>{t}</a></li>)}</ul>
        </nav>
      </div>
    </header>
  );
}
