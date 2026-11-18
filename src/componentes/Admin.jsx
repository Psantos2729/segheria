import { useEffect, useState } from 'react';
import { datos } from '../lib/datos.js';
import Titulo from './Titulo.jsx';

/* Solo para administradores. La seguridad real está en el servidor (es_admin en supabase.sql); aquí solo se oculta la vista. */
export default function Admin() {
  const [estado, setEstado] = useState('cargando'); // cargando | no | si
  const [lista, setLista] = useState([]);
  const [error, setError] = useState('');

  const cargar = () => datos.adminPerfiles().then(setLista).catch(() => setError('No se pudo cargar la lista.'));
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

  const pendientes = lista.filter((p) => !p.aprobado).length;
  return (
    <section className="seccion envoltura">
      <Titulo as="h1" lineas={['Administración']} />
      <p className="t-lead">{pendientes ? `${pendientes} cuenta(s) por aprobar` : 'No hay cuentas pendientes.'}</p>
      {error && <p role="alert" className="error">{error}</p>}
      <ul className="admin">
        {lista.map((p) => (
          <li key={p.id} className="hoja">
            <div>
              <p className="serif t-lead">{p.nombre_negocio} <span className="t-small nota">· {p.tipo}</span></p>
              <p className="t-small">Torre {p.torre} · Apto {p.apto} · WhatsApp {p.whatsapp}</p>
              <p className="t-small nota">{p.email}</p>
            </div>
            <button className={p.aprobado ? 'enlace' : 'btn btn--chico'} onClick={() => cambiar(p)}>
              {p.aprobado ? 'Quitar aprobación' : 'Aprobar'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
