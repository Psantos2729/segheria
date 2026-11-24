import { tipos, pasos, vendedores, galeria } from '../contenido.js';
import { ruta as pub } from '../lib/ruta.js';
import { useVarCss } from '../hooks/useVarCss.js';
import CircularCarousel from '../reactbits/CircularCarousel/CircularCarousel.jsx';
import BlurText from '../reactbits/BlurText/BlurText.jsx';
import Aurora from '../reactbits/Aurora/Aurora.jsx';
import ShinyText from '../reactbits/ShinyText/ShinyText.jsx';
import FadeContent from '../reactbits/FadeContent/FadeContent.jsx';
import AnimatedContent from '../reactbits/AnimatedContent/AnimatedContent.jsx';
import Titulo from './Titulo.jsx';

const Pasos = ({ lista }) => (
  <ol className="pasos">
    {lista.map(([t, d], i) => (
      <li key={t}>
        <AnimatedContent distance={40} duration={0.7} delay={i * 0.12}>
          <span className="pasos__n serif" aria-hidden="true">{i + 1}</span>
          <h3 className="t-lead serif">{t}</h3>
          <p className="nota">{d}</p>
        </AnimatedContent>
      </li>
    ))}
  </ol>
);

/* Anillo 3D de React Bits con las fotos del conjunto. */
function Lugar() {
  const fondo = useVarCss('--oscuro', '#0F2A21');
  const items = galeria.fotos.map((f) => ({ src: pub(f.src), alt: f.alt, title: f.titulo }));
  return (
    <section className="seccion campo-oscuro" aria-labelledby="titulo-lugar">
      <div className="envoltura"><FadeContent blur duration={0.9}><Titulo id="titulo-lugar" lineas={galeria.titulo} /></FadeContent></div>
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
        <div className="portada__fondo" aria-hidden="true">
          <Aurora colorStops={['#0F2A21', '#E0705F', '#8E2A46']} amplitude={0.9} blend={0.6} speed={0.6} opacity={0.55} />
        </div>
        <div className="envoltura portada__in">
          <div role="heading" aria-level="1" className="t-display portada__h1">
            <BlurText text="Compra entre vecinos." delay={110} />
            <BlurText text="Cotiza por WhatsApp." delay={110} />
          </div>
          <div className="portada__fila">
            <div>
              <p className="t-lead portada__lead">Un catálogo con lo que venden los vecinos de Segheria. Filtra por tipo de producto, elige un producto y pide tu cotización directo al vendedor.</p>
              <div className="portada__acciones">
                <a className="btn btn--claro" href="#/catalogo"><ShinyText text="Ver catálogo" color="#25161B" shineColor="#E0705F" speed={3} /></a>
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
        <FadeContent blur duration={0.9}><Titulo lineas={['Cómo funciona']} /></FadeContent>
        <Pasos lista={pasos} />
      </section>

      <Lugar />

      <section className="seccion campo-acento-vino">
        <div className="envoltura">
          <FadeContent blur duration={0.9}><Titulo lineas={['¿Vendes algo?', 'Publícalo aquí.']} /></FadeContent>
          <Pasos lista={vendedores} />
          <p className="t-small portada__nota">Para cuidar a la comunidad, solo pueden vender los números de WhatsApp aprobados por la administración.</p>
          <a className="btn btn--claro" href="#/vendedor">Crear mi cuenta de vendedor</a>
        </div>
      </section>
    </>
  );
}
