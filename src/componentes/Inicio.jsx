import { Fragment } from 'react';
import { tipos, pasos, vendedores, galeria } from '../contenido.js';
import { ruta as pub } from '../lib/ruta.js';
import { useVarCss } from '../hooks/useVarCss.js';
import CircularCarousel from '../reactbits/CircularCarousel/CircularCarousel.jsx';
import Reveal from './Reveal.jsx';
import Titulo from './Titulo.jsx';

/* Cada palabra entra con desenfoque, escalonada. Solo CSS; se apaga con prefers-reduced-motion. */
const Palabras = ({ texto }) => texto.split(' ').map((p, i) => <Fragment key={i}><span className="palabra" style={{ '--i': i }}>{p}</span>{' '}</Fragment>);

const Pasos = ({ lista }) => (
  <ol className="pasos">
    {lista.map(([t, d], i) => (
      <Reveal as="li" i={i} key={t}>
        <span className="pasos__n serif" aria-hidden="true">{i + 1}</span>
        <h3 className="t-lead serif">{t}</h3>
        <p className="nota">{d}</p>
      </Reveal>
    ))}
  </ol>
);

/* Anillo 3D de React Bits con las fotos del conjunto. */
function Lugar() {
  const fondo = useVarCss('--oscuro', '#0F2A21');
  const items = galeria.fotos.map((f) => ({ src: pub(f.src), alt: f.alt, title: f.titulo }));
  return (
    <section className="seccion campo-oscuro" aria-labelledby="titulo-lugar">
      <div className="envoltura"><Reveal><Titulo id="titulo-lugar" lineas={galeria.titulo} /></Reveal></div>
      <div className="carrusel3d">
        <CircularCarousel items={items} preset="cylinder" cardWidth={420} aspectRatio={1.2}
          autoplay="drift" speed={10} captions fadeColor={fondo} cornerRadius={14} intro="rise" />
      </div>
    </section>
  );
}

export default function Inicio() {
  return (
    <>
      <section className="portada campo-oscuro">
        <div className="envoltura portada__in">
          <h1 className="t-display"><span className="linea"><Palabras texto="Compra entre vecinos." /></span><span className="linea"><Palabras texto="Cotiza por WhatsApp." /></span></h1>
          <div className="portada__fila">
            <div>
              <p className="t-lead portada__lead">Un catálogo con lo que venden los vecinos de Segheria. Filtra por tipo de negocio, elige un producto y pide tu cotización directo al vendedor.</p>
              <div className="portada__acciones">
                <a className="btn btn--claro" href="#/catalogo">Ver catálogo</a>
                <a className="enlace" href="#/vendedor">Quiero vender</a>
              </div>
            </div>
            <div className="foto foto--3x2 portada__foto">
              <img src={pub('fotos/familia.webp')} alt="Una niña y su mamá pasean a su perro por los caminamientos del conjunto" width="1500" height="630" fetchpriority="high" />
            </div>
          </div>
          <ul className="pildoras" aria-label="Tipos de negocio">
            {tipos.map((t, i) => <li key={t} style={{ '--i': i }}><a href={`#/catalogo?tipo=${encodeURIComponent(t)}`}>{t}</a></li>)}
          </ul>
        </div>
      </section>

      <section className="seccion envoltura">
        <Reveal><Titulo lineas={['Cómo funciona']} /></Reveal>
        <Pasos lista={pasos} />
      </section>

      <Lugar />

      <section className="seccion campo-acento-vino">
        <div className="envoltura">
          <Reveal><Titulo lineas={['¿Vendes algo?', 'Publícalo aquí.']} /></Reveal>
          <Pasos lista={vendedores} />
          <p className="t-small portada__nota">Para cuidar a la comunidad, tu torre y apartamento se piden al registrarte y no se muestran al público. Revisamos cada cuenta antes de publicar.</p>
          <a className="btn btn--claro" href="#/vendedor">Crear mi cuenta de vendedor</a>
        </div>
      </section>
    </>
  );
}
