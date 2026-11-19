import { useEffect, useRef, useState } from 'react';
import { negocio, colorTipo } from '../contenido.js';
import { datos, recientes } from '../lib/datos.js';
import ProfileCard from '../reactbits/ProfileCard/ProfileCard.jsx';
import { quetzales, waUrl } from './Catalogo.jsx';

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
      <summary className="t-small nota">Reportar este producto</summary>
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

/* Página de un producto: fotos grandes y todos sus datos sobre una tarjeta de vidrio. */
export default function Producto({ params }) {
  const id = params.get('id');
  // Si venimos del catálogo, el producto ya está en memoria y se pinta al instante (undefined = cargando, null = no existe).
  const [p, setP] = useState(() => recientes.productos?.find((x) => x.id === id));
  const [foto, setFoto] = useState(0);
  const [error, setError] = useState('');
  const visor = useRef(null); // <dialog> con la foto completa
  useEffect(() => {
    datos.listar().then((l) => setP(l.find((x) => x.id === id) || null)).catch(() => setError('No pudimos cargar el producto. Intenta de nuevo en un momento.'));
  }, [id]);
  useEffect(() => { if (p) document.title = `${p.nombre} | ${negocio.nombre}`; }, [p]);

  if (error || !p) return (
    <section className="seccion envoltura">
      <p className={error ? 'error' : 'nota'} role={error ? 'alert' : undefined}>{error || (p === null ? 'Este producto ya no está en el catálogo.' : 'Cargando…')}</p>
      <a className="enlace" href="#/catalogo">Volver al catálogo</a>
    </section>
  );

  const fotos = p.imagenes;
  const color = colorTipo[p.tipo] || '#E0705F'; // color hex: ProfileCard calcula con él
  const verCompleta = () => fotos.length && visor.current.showModal();
  const mover = (paso) => setFoto((foto + paso + fotos.length) % fotos.length);
  return (
    <section className="detalle" style={{ '--tono': color }}>
      <div className="detalle__fondo" aria-hidden="true">
        {fotos[0] && <img src={fotos[0]} alt="" />}
      </div>
      <div className="envoltura detalle__in">
        <a className="enlace detalle__volver" href="#/catalogo">← Volver al catálogo</a>
        <article className="vidrio detalle__tarjeta">
          <div className="detalle__galeria">
            {/* Tocar la tarjeta abre la foto completa (menos el botón de cotizar, que abre WhatsApp). */}
            <div className={`detalle__carta${fotos.length ? ' detalle__carta--ampliable' : ''}`} style={{ viewTransitionName: `p-${p.id}` }}
              onClick={(e) => { if (!e.target.closest('.profile-card__contact')) verCompleta(); }}>
              <ProfileCard
                avatarUrl={fotos[foto] || ''}
                name={p.nombre}
                title={quetzales(p.precio)}
                handle=""
                status={`${p.vendedor.nombre_negocio} · Torre ${p.vendedor.torre}`}
                statusColor={p.agotado ? '#9CA3AF' : '#22c55e'}
                contactText={p.agotado ? '' : 'Cotizar'}
                onContactClick={() => window.open(waUrl(p), '_blank', 'noopener')}
                backdropColor={color}
                theme="light"
                radius={18}
                className="detalle__profile"
              />
              {p.agotado && <span className="etiqueta">Agotado</span>}
            </div>
            {fotos.length > 1 && (
              <ul className="miniaturas" aria-label="Fotos del producto">
                {fotos.map((src, i) => (
                  <li key={src}>
                    <button type="button" aria-pressed={i === foto} aria-label={`Ver foto ${i + 1}`} onClick={() => setFoto(i)}>
                      <img src={src} alt="" loading="lazy" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {fotos.length > 0 && <button type="button" className="enlace" onClick={verCompleta}>Ver foto completa</button>}
          </div>
          <div className="detalle__info">
            <p className="t-small detalle__tipo">{p.tipo}</p>
            <h1 className="t-head">{p.nombre}</h1>
            <p className="detalle__precio serif">{quetzales(p.precio)}</p>
            {p.descripcion && <p className="detalle__desc">{p.descripcion}</p>}
            <dl className="detalle__datos">
              <div><dt>Vende</dt><dd><a href={`#/catalogo?vendedor=${p.vendedor_id}`}>{p.vendedor.nombre_negocio}</a></dd></div>
              <div><dt>Torre</dt><dd>{p.vendedor.torre}</dd></div>
            </dl>
            {p.agotado
              ? <p className="btn btn--barra btn--apagado">Agotado por ahora</p>
              : <a className="btn btn--barra" href={waUrl(p)} target="_blank" rel="noopener">Cotizar por WhatsApp</a>}
            <Reportar id={p.id} />
          </div>
        </article>
      </div>
      {fotos.length > 0 && (
        <dialog ref={visor} className="visor" aria-label={`Fotos de ${p.nombre}`}
          onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}
          onKeyDown={(e) => { if (fotos.length > 1 && e.key === 'ArrowRight') mover(1); if (fotos.length > 1 && e.key === 'ArrowLeft') mover(-1); }}>
          <img key={fotos[foto]} src={fotos[foto]} alt={`${p.nombre}, foto ${foto + 1} de ${fotos.length}`} />
          <button type="button" className="visor__boton visor__cerrar" aria-label="Cerrar" onClick={() => visor.current.close()}>×</button>
          {fotos.length > 1 && (
            <>
              <button type="button" className="visor__boton visor__flecha visor__flecha--ant" aria-label="Foto anterior" onClick={() => mover(-1)}>‹</button>
              <button type="button" className="visor__boton visor__flecha visor__flecha--sig" aria-label="Foto siguiente" onClick={() => mover(1)}>›</button>
              <p className="visor__cuenta">{foto + 1} / {fotos.length}</p>
            </>
          )}
        </dialog>
      )}
    </section>
  );
}
