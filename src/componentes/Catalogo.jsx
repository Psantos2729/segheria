import { useEffect, useState } from 'react';
import { tipos, colorTipo } from '../contenido.js';
import { datos, demo, recientes, enOferta, precioActual } from '../lib/datos.js';
import Titulo from './Titulo.jsx';
import SpotlightCard from '../reactbits/SpotlightCard/SpotlightCard.jsx';
import CountUp from '../reactbits/CountUp/CountUp.jsx';

export const quetzales = (n) => (n == null ? 'Precio por cotizar' : `Q${Number(n).toLocaleString('es-GT')}`);
export const waUrl = (p) => `https://wa.me/502${p.vendedor.whatsapp}?text=${encodeURIComponent(
  `Hola, vi "${p.nombre}" en Catálogo Segheria y quiero cotizarlo${p.precio != null ? ` (${quetzales(precioActual(p))}${enOferta(p) ? ', en oferta' : ''})` : ''}.`)}`;
// Precio con la oferta: el normal tachado y el rebajado al lado.
export const Precio = ({ p, className }) => (enOferta(p)
  ? <p className={className}><s className="precio--antes">{quetzales(p.precio)}</s> <span className="precio--oferta">{quetzales(p.oferta_precio)}</span></p>
  : <p className={className}>{quetzales(p.precio)}</p>);
const pedirCodigo = () => window.dispatchEvent(new Event('pedir-codigo'));
// Sin el código de los condóminos no llega el WhatsApp: el botón pide el código en vez de abrir el chat.
export const Cotizar = ({ p }) => (p.vendedor.whatsapp
  ? <a className="btn btn--barra" href={waUrl(p)} target="_blank" rel="noopener">Cotizar por WhatsApp</a>
  : <button type="button" className="btn btn--barra" onClick={pedirCodigo}>Pon el código para cotizar</button>);
export const abrirChat = (p) => (p.vendedor.whatsapp ? window.open(waUrl(p), '_blank', 'noopener') : pedirCodigo());
// Sin tildes ni mayúsculas, para que "galeta" y "Galetá" encuentren lo mismo.
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function Catalogo({ params }) {
  const tipo = params.get('tipo') || '';
  const vend = params.get('vendedor') || '';
  const [q, setQ] = useState('');
  const [productos, setProductos] = useState(recientes.productos);
  const [error, setError] = useState('');
  useEffect(() => { datos.listar().then(setProductos).catch(() => setError('No pudimos cargar el catálogo. Intenta de nuevo en un momento.')); }, []);

  const ver = (productos || [])
    .filter((p) => (!tipo || p.tipo === tipo) && (!vend || p.vendedor_id === vend)
      && (!q || norm(`${p.nombre} ${p.descripcion || ''} ${p.vendedor.nombre_negocio}`).includes(norm(q))))
    .sort((a, b) => Number(a.agotado) - Number(b.agotado)); // los agotados al final
  const tienda = vend && productos?.find((p) => p.vendedor_id === vend)?.vendedor.nombre_negocio;

  return (
    <section className="seccion envoltura">
      <Titulo as="h1" lineas={tienda ? [tienda] : ['Catálogo de vecinos']} />
      {vend && <p><a className="enlace" href="#/catalogo">Ver todo el catálogo</a></p>}
      {demo && <p className="aviso t-small">Modo demo: los datos se guardan solo en este navegador.</p>}
      <label className="campo buscar"><span className="sr-only">Buscar productos</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar un producto o negocio" /></label>
      <div className="filtros" role="group" aria-label="Filtrar por tipo de producto">
        {['', ...tipos].map((t) => (
          <a key={t} className="filtro" href={t ? `#/catalogo?tipo=${encodeURIComponent(t)}` : '#/catalogo'} aria-current={!vend && tipo === t ? 'true' : undefined}>{t || 'Todos'}</a>
        ))}
      </div>
      {productos && !!ver.length && <p className="t-small nota"><CountUp to={ver.length} duration={1} /> {ver.length === 1 ? 'producto' : 'productos'}</p>}
      {error && <p role="alert">{error}</p>}
      {!error && !productos && <p className="nota">Cargando…</p>}
      {productos && !ver.length && <p className="t-lead">No encontramos productos con ese filtro. ¿Vendes algo? <a href="#/vendedor">Publícalo aquí</a>.</p>}
      <ul className="productos">
        {ver.map((p) => (
          <li key={p.id} className={`producto${p.agotado ? ' producto--agotado' : ''}`}>
            <SpotlightCard className="producto__tarjeta" theme="light" spotlightColor="#E0705F" intensity={0.18}>
            <a className="foto foto--4x3" href={`#/producto?id=${p.id}`} tabIndex={-1} aria-hidden="true" style={{ viewTransitionName: `p-${p.id}` }}>
              {p.imagenes.length
                ? <img src={p.imagenes[0]} alt="" loading="lazy" />
                : <span className="producto__sin serif" style={{ background: colorTipo[p.tipo] }}>{p.nombre[0]}</span>}
              {p.agotado && <span className="etiqueta">Agotado</span>}
              {!p.agotado && enOferta(p) && <span className="etiqueta etiqueta--oferta">Oferta</span>}
              {p.imagenes.length > 1 && <span className="etiqueta etiqueta--fotos">{p.imagenes.length} fotos</span>}
            </a>
            <div className="producto__cuerpo">
              <p className="t-small nota">{p.tipo}</p>
              <h2 className="t-lead serif"><a className="producto__enlace" href={`#/producto?id=${p.id}`}>{p.nombre}</a></h2>
              <Precio p={p} className="producto__precio" />
              {p.descripcion && <p className="nota producto__desc">{p.descripcion}</p>}
              <p className="t-small nota"><a href={`#/catalogo?vendedor=${p.vendedor_id}`}>{p.vendedor.nombre_negocio}</a></p>
              <div className="producto__acciones">
                {p.agotado
                  ? <p className="btn btn--barra btn--apagado">Agotado por ahora</p>
                  : <Cotizar p={p} />}
                <a className="enlace" href={`#/producto?id=${p.id}`}>Ver detalles y fotos</a>
              </div>
            </div>
            </SpotlightCard>
          </li>
        ))}
      </ul>
    </section>
  );
}
