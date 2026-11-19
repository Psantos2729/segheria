import { useEffect, useState } from 'react';
import { tipos, colorTipo } from '../contenido.js';
import { datos, demo } from '../lib/datos.js';
import Titulo from './Titulo.jsx';
import SpotlightCard from '../reactbits/SpotlightCard/SpotlightCard.jsx';
import CountUp from '../reactbits/CountUp/CountUp.jsx';

const quetzales = (n) => (n == null ? 'Precio por cotizar' : `Q${Number(n).toLocaleString('es-GT')}`);
const waUrl = (p) => `https://wa.me/502${p.vendedor.whatsapp}?text=${encodeURIComponent(
  `Hola, vi "${p.nombre}" en Catálogo Segheria y quiero cotizarlo${p.precio != null ? ` (${quetzales(p.precio)})` : ''}.`)}`;
// Sin tildes ni mayúsculas, para que "galeta" y "Galetá" encuentren lo mismo.
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function Reportar({ id }) {
  const [hecho, setHecho] = useState(false);
  const [error, setError] = useState('');
  async function enviar(e) {
    e.preventDefault(); setError('');
    try { await datos.reportar(id, new FormData(e.currentTarget).get('motivo').trim()); setHecho(true); }
    catch { setError('No se pudo enviar. Intenta de nuevo.'); }
  }
  return (
    <details className="reporte">
      <summary className="t-small nota">Reportar</summary>
      {hecho ? <p className="t-small" role="status">Gracias, lo revisaremos.</p> : (
        <form onSubmit={enviar}>
          <label className="campo"><span className="t-small">¿Qué está mal?</span><textarea name="motivo" required minLength={3} maxLength={300} rows={2} /></label>
          {error && <p role="alert" className="error t-small">{error}</p>}
          <button className="btn btn--chico">Enviar reporte</button>
        </form>
      )}
    </details>
  );
}

export default function Catalogo({ params }) {
  const tipo = params.get('tipo') || '';
  const vend = params.get('vendedor') || '';
  const [q, setQ] = useState('');
  const [productos, setProductos] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { datos.listar().then(setProductos).catch(() => setError('No pudimos cargar el catálogo. Intenta de nuevo en un momento.')); }, []);

  const ver = (productos || [])
    .filter((p) => (!tipo || p.vendedor.tipo === tipo) && (!vend || p.vendedor_id === vend)
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
      <div className="filtros" role="group" aria-label="Filtrar por tipo de negocio">
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
            <div className="foto foto--4x3">
              {p.imagenes.length
                ? <div className="tira">{p.imagenes.map((src, i) => <img key={src} src={src} alt={`${p.nombre}, foto ${i + 1}`} loading="lazy" />)}</div>
                : <span className="producto__sin serif" aria-hidden="true" style={{ background: colorTipo[p.vendedor.tipo] }}>{p.nombre[0]}</span>}
              {p.agotado && <span className="etiqueta">Agotado</span>}
            </div>
            <div className="producto__cuerpo">
              <p className="t-small nota">{p.vendedor.tipo}</p>
              <h2 className="t-lead serif">{p.nombre}</h2>
              <p className="producto__precio">{quetzales(p.precio)}</p>
              {p.descripcion && <p className="nota">{p.descripcion}</p>}
              <p className="t-small nota"><a href={`#/catalogo?vendedor=${p.vendedor_id}`}>{p.vendedor.nombre_negocio}</a> · Torre {p.vendedor.torre}</p>
              {p.agotado
                ? <p className="btn btn--barra btn--apagado">Agotado por ahora</p>
                : <a className="btn btn--barra" href={waUrl(p)} target="_blank" rel="noopener">Cotizar por WhatsApp</a>}
              <Reportar id={p.id} />
            </div>
            </SpotlightCard>
          </li>
        ))}
      </ul>
    </section>
  );
}
