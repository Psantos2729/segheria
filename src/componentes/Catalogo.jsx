import { useEffect, useState } from 'react';
import { tipos } from '../contenido.js';
import { datos, demo } from '../lib/datos.js';
import Titulo from './Titulo.jsx';

const quetzales = (n) => (n == null ? 'Precio por cotizar' : `Q${Number(n).toLocaleString('es-GT')}`);
const waUrl = (p) => `https://wa.me/502${p.vendedor.whatsapp}?text=${encodeURIComponent(
  `Hola, vi "${p.nombre}" en Catálogo Segheria y quiero cotizarlo${p.precio != null ? ` (${quetzales(p.precio)})` : ''}.`)}`;

export default function Catalogo({ params }) {
  const tipo = params.get('tipo') || '';
  const [productos, setProductos] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { datos.listar().then(setProductos).catch(() => setError('No pudimos cargar el catálogo. Intenta de nuevo en un momento.')); }, []);
  const ver = (productos || []).filter((p) => !tipo || p.vendedor.tipo === tipo);

  return (
    <section className="seccion envoltura">
      <Titulo as="h1" lineas={['Catálogo de vecinos']} />
      {demo && <p className="aviso t-small">Modo demo: los datos se guardan solo en este navegador.</p>}
      <div className="filtros" role="group" aria-label="Filtrar por tipo de negocio">
        {['', ...tipos].map((t) => (
          <a key={t} className="filtro" href={t ? `#/catalogo?tipo=${encodeURIComponent(t)}` : '#/catalogo'} aria-current={tipo === t ? 'true' : undefined}>{t || 'Todos'}</a>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      {!error && !productos && <p className="nota">Cargando…</p>}
      {productos && !ver.length && <p className="t-lead">Todavía no hay productos {tipo ? `en “${tipo}”` : ''}. ¿Vendes algo? <a href="#/vendedor">Publícalo aquí</a>.</p>}
      <ul className="productos">
        {ver.map((p) => (
          <li key={p.id} className="producto">
            <div className="foto foto--4x3">{p.imagen ? <img src={p.imagen} alt={p.nombre} loading="lazy" /> : <span className="producto__sin serif" aria-hidden="true">{p.nombre[0]}</span>}</div>
            <div className="producto__cuerpo">
              <p className="t-small nota">{p.vendedor.tipo}</p>
              <h2 className="t-lead serif">{p.nombre}</h2>
              <p className="producto__precio">{quetzales(p.precio)}</p>
              {p.descripcion && <p className="nota">{p.descripcion}</p>}
              <p className="t-small nota">{p.vendedor.nombre_negocio} · Torre {p.vendedor.torre}</p>
              <a className="btn btn--barra" href={waUrl(p)} target="_blank" rel="noopener">Cotizar por WhatsApp</a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
