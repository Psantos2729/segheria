import { tipos, pasos, vendedores } from '../contenido.js';
import Reveal from './Reveal.jsx';
import Titulo from './Titulo.jsx';

/* Cada palabra entra con desenfoque, escalonada. Solo CSS; se apaga con prefers-reduced-motion. */
const Palabras = ({ texto }) => texto.split(' ').map((p, i) => <span key={i}><span className="palabra" style={{ '--i': i }}>{p}</span>{' '}</span>);

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

export default function Inicio() {
  return (
    <>
      <section className="portada campo-oscuro">
        <div className="envoltura portada__in">
          <div>
            <h1 className="t-display"><span className="linea"><Palabras texto="Compra entre vecinos." /></span><span className="linea"><Palabras texto="Cotiza por WhatsApp." /></span></h1>
            <p className="t-lead portada__lead">Un catálogo con lo que venden los vecinos de Segheria. Filtra por tipo de negocio, elige un producto y pide tu cotización directo al vendedor.</p>
            <div className="portada__acciones">
              <a className="btn btn--claro" href="#/catalogo">Ver catálogo</a>
              <a className="enlace" href="#/vendedor">Quiero vender</a>
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
