import { useEffect, useState } from 'react';
import { datos } from '../lib/datos.js';
import Titulo from './Titulo.jsx';

/* Solo para administradores. La seguridad real está en el servidor (es_admin en supabase.sql); aquí solo se oculta la vista. */
export default function Admin() {
  const [estado, setEstado] = useState('cargando'); // cargando | no | si
  const [lista, setLista] = useState([]);
  const [error, setError] = useState('');

  const [reportes, setReportes] = useState([]);
  const [numeros, setNumeros] = useState([]);
  const cargar = () => Promise.all([datos.adminPerfiles(), datos.adminReportes(), datos.adminNumeros()])
    .then(([l, r, n]) => { setLista(l); setReportes(r); setNumeros(n); }).catch(() => setError('No se pudo cargar la lista.'));
  useEffect(() => {
    datos.esAdmin().then((ok) => { setEstado(ok ? 'si' : 'no'); if (ok) cargar(); }).catch(() => setEstado('no'));
  }, []);

  async function cambiar(p) {
    setError('');
    try { await datos.adminAprobar(p.id, !p.aprobado); await cargar(); } catch { setError('No se pudo guardar el cambio.'); }
  }

  if (estado === 'cargando') return <section className="seccion envoltura"><p className="nota">Cargando…</p></section>;
  if (estado === 'no') return (
    <section className="seccion envoltura panel">
      <Titulo as="h1" lineas={['Acceso restringido']} />
      <p>Esta página es solo para administradores. <a href="#/vendedor">Entra con tu cuenta</a> y vuelve aquí.</p>
    </section>
  );

  async function agregar(e) {
    e.preventDefault(); setError('');
    const form = e.currentTarget;
    const lista = [...new Set(new FormData(form).get('numeros').split(/[\s,;]+/).filter(Boolean))];
    const malos = lista.filter((n) => !/^[0-9]{8}$/.test(n));
    if (malos.length) { setError(`No tienen 8 dígitos: ${malos.join(', ')}. No se agregó ninguno.`); return; }
    try { await datos.adminAgregarNumeros(lista); form.reset(); await cargar(); } catch { setError('No se pudieron agregar los números.'); }
  }
  async function quitar(n) {
    if (!confirm(`¿Quitar ${n} de la lista? Si ya tiene cuenta, se le quita la aprobación.`)) return;
    setError('');
    try { await datos.adminQuitarNumero(n); await cargar(); } catch { setError('No se pudo quitar el número.'); }
  }
  async function resolver(r, borrar) {
    if (borrar && !confirm(`¿Borrar "${r.producto_nombre}"? No se puede deshacer.`)) return;
    setError('');
    try { await datos.adminResolver(r.id, borrar); await cargar(); } catch { setError('No se pudo resolver el reporte.'); }
  }
  // Supabase no envía correos propios: el aviso de aprobación va por WhatsApp, con el mensaje ya escrito.
  const avisoWA = (p) => `https://wa.me/502${p.whatsapp}?text=${encodeURIComponent(`Hola, tu cuenta de vendedor en Catálogo Segheria ya fue aprobada. Ya puedes publicar tus productos.`)}`;
  const pendientes = lista.filter((p) => !p.aprobado).length;
  return (
    <section className="seccion envoltura">
      <Titulo as="h1" lineas={['Administración']} />
      <p className="t-lead">{pendientes ? `${pendientes} cuenta(s) sin aprobación` : 'Todas las cuentas están aprobadas.'}</p>
      {error && <p role="alert" className="error">{error}</p>}
      <ul className="admin">
        {lista.map((p) => (
          <li key={p.id} className="hoja">
            <div>
              <p className="serif t-lead">{p.negocios || '(sin negocio)'}</p>
              <p className="t-small">WhatsApp {p.whatsapp}</p>
              <p className="t-small nota">{p.email}</p>
            </div>
            <span className="mios__acciones">
              {p.aprobado && <a className="enlace" href={avisoWA(p)} target="_blank" rel="noopener">Avisar por WhatsApp</a>}
              <button className={p.aprobado ? 'enlace' : 'btn btn--chico'} onClick={() => cambiar(p)}>
                {p.aprobado ? 'Quitar aprobación' : 'Aprobar'}
              </button>
            </span>
          </li>
        ))}
      </ul>

      <h2 className="t-head panel__sub">Vendedores aprobados</h2>
      <p className="t-small nota">Solo estos números pueden crear cuenta de vendedor.</p>
      <form className="formulario hoja" onSubmit={agregar}>
        <label className="campo"><span>Agregar números (8 dígitos, separados por comas)</span>
          <textarea name="numeros" required rows={3} placeholder="55551234, 55555678, 40001111" /></label>
        <button className="btn btn--chico">Agregar</button>
      </form>
      {!numeros.length && <p className="nota">La lista está vacía: nadie puede registrarse.</p>}
      <ul className="admin">
        {numeros.map((n) => (
          <li key={n.whatsapp} className="hoja">
            <div>
              <p className="serif t-lead">{n.whatsapp}</p>
              <p className="t-small nota">{n.negocios ? `Cuenta: ${n.negocios}` : 'Aún sin cuenta'}</p>
            </div>
            <button className="enlace" onClick={() => quitar(n.whatsapp)}>Quitar</button>
          </li>
        ))}
      </ul>

      <h2 className="t-head panel__sub">Reportes</h2>
      {!reportes.length && <p className="nota">No hay reportes pendientes.</p>}
      <ul className="admin">
        {reportes.map((r) => (
          <li key={r.id} className="hoja">
            <div>
              <p className="serif t-lead">{r.producto_nombre} <span className="t-small nota">· {r.negocio}</span></p>
              <p>{r.motivo}</p>
            </div>
            <span className="mios__acciones">
              <button className="enlace" onClick={() => resolver(r, false)}>Descartar</button>
              <button className="btn btn--chico" onClick={() => resolver(r, true)}>Borrar producto</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
