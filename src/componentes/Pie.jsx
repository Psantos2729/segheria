import { negocio } from '../contenido.js';

export default function Pie() {
  return (
    <footer className="pie">
      <div className="envoltura pie__in">
        <div>
          <p className="serif t-head">{negocio.nombre}</p>
          <p className="t-small">Un espacio de vecinos para vecinos. Cada vendedor publica y atiende sus propios productos.</p>
        </div>
        <ul className="pie__nav">
          <li><a href="#/catalogo">Ver catálogo</a></li>
          <li><a href="#/vendedor">Quiero vender</a></li>
        </ul>
        <p className="t-small pie__imprenta">Sitio comunitario no oficial. Los precios y la entrega se acuerdan directamente con cada vendedor.</p>
      </div>
    </footer>
  );
}
