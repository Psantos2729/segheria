import { useEffect, useState } from 'react';
import { tipos, torres } from '../contenido.js';
import { datos, demo, MAX_FOTOS } from '../lib/datos.js';
import Titulo from './Titulo.jsx';

const Campo = ({ etiqueta, children }) => <label className="campo"><span>{etiqueta}</span>{children}</label>;
const formAObj = (e) => Object.fromEntries(new FormData(e.currentTarget));

function Acceso({ alEntrar }) {
  const [modo, setModo] = useState('entrar'); // entrar | nuevo | olvido
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const cambiar = (m) => { setModo(m); setError(''); setAviso(''); };

  async function enviar(e) {
    e.preventDefault(); setError(''); setOcupado(true);
    const f = formAObj(e);
    try {
      if (modo === 'olvido') { await datos.recuperar(f.email); setAviso('Si ese correo tiene cuenta, te enviamos un enlace para cambiar la contraseña. Ábrelo en este mismo navegador.'); return; }
      if (modo === 'nuevo') {
        const { email, pass, nombre_negocio, tipo, torre, apto, whatsapp } = f;
        const r = await datos.registrar({ email, pass, perfil: { nombre_negocio, tipo, torre: Number(torre), apto: apto.trim(), whatsapp } });
        if (r.aviso) { setAviso(r.aviso); return; }
      } else await datos.entrar(f.email, f.pass);
      alEntrar();
    } catch (err) { setError(err.message || 'Algo salió mal. Revisa los datos.'); } finally { setOcupado(false); }
  }

  const nuevo = modo === 'nuevo';
  return (
    <form className="formulario hoja" onSubmit={enviar}>
      <h2 className="t-head">{{ entrar: 'Entra a tu cuenta', nuevo: 'Crea tu cuenta de vendedor', olvido: 'Recupera tu contraseña' }[modo]}</h2>
      <Campo etiqueta="Correo"><input name="email" type="email" required autoComplete="email" /></Campo>
      {modo !== 'olvido' && <Campo etiqueta="Contraseña (mínimo 8 caracteres)"><input name="pass" type="password" required minLength={8} autoComplete={nuevo ? 'new-password' : 'current-password'} /></Campo>}
      {nuevo && (
        <>
          <Campo etiqueta="Nombre de tu negocio"><input name="nombre_negocio" required minLength={2} maxLength={60} /></Campo>
          <Campo etiqueta="Tipo principal de tu negocio"><select name="tipo" required>{tipos.map((t) => <option key={t}>{t}</option>)}</select></Campo>
          <div className="formulario__par">
            <Campo etiqueta="Torre"><select name="torre" required>{torres.map((t) => <option key={t}>{t}</option>)}</select></Campo>
            <Campo etiqueta="Apartamento"><input name="apto" required maxLength={6} placeholder="Ej. 304" /></Campo>
          </div>
          <Campo etiqueta="WhatsApp (8 dígitos)"><input name="whatsapp" required pattern="[0-9]{8}" inputMode="numeric" placeholder="55551234" /></Campo>
          <p className="t-small nota">Tu torre y apartamento no se muestran al público; solo los usamos para verificar que eres vecino.</p>
        </>
      )}
      {error && <p role="alert" className="error">{error}</p>}
      {aviso && <p role="status">{aviso}</p>}
      <button className="btn" disabled={ocupado}>{{ entrar: 'Entrar', nuevo: 'Crear cuenta', olvido: 'Enviar enlace' }[modo]}</button>
      {modo === 'entrar' && <button type="button" className="enlace" onClick={() => cambiar('olvido')}>Olvidé mi contraseña</button>}
      <button type="button" className="enlace" onClick={() => cambiar(nuevo ? 'entrar' : modo === 'olvido' ? 'entrar' : 'nuevo')}>
        {nuevo ? 'Ya tengo cuenta' : modo === 'olvido' ? 'Volver' : 'Soy nuevo: crear cuenta'}
      </button>
    </form>
  );
}

/* Se muestra al volver del enlace del correo (el evento PASSWORD_RECOVERY lleva aquí con ?recuperar=1). */
function NuevaPass({ alTerminar }) {
  const [error, setError] = useState('');
  async function enviar(e) {
    e.preventDefault(); setError('');
    try { await datos.cambiarPass(formAObj(e).pass); location.hash = '#/vendedor'; alTerminar(); }
    catch { setError('No se pudo cambiar la contraseña. Pide un enlace nuevo.'); }
  }
  return (
    <form className="formulario hoja" onSubmit={enviar}>
      <h2 className="t-head">Elige tu nueva contraseña</h2>
      <Campo etiqueta="Nueva contraseña (mínimo 8 caracteres)"><input name="pass" type="password" required minLength={8} autoComplete="new-password" /></Campo>
      {error && <p role="alert" className="error">{error}</p>}
      <button className="btn">Guardar contraseña</button>
    </form>
  );
}

function Panel({ usuario, alSalir }) {
  const [mios, setMios] = useState([]);
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState(''); // errores de la lista (cargar, agotado, borrar); los del formulario van en "error"
  const cargar = () => datos.listar().then((l) => { setMios(l.filter((p) => p.vendedor_id === usuario.id)); setFallo(''); })
    .catch(() => setFallo('No se pudieron cargar tus productos. Revisa tu conexión y recarga la página.'));
  useEffect(() => { cargar(); }, []);
  const aprobado = usuario.perfil?.aprobado;

  async function publicar(e) {
    e.preventDefault(); setError(''); setOcupado(true);
    const form = e.currentTarget; const f = formAObj(e);
    const fotos = [...form.elements.foto.files].slice(0, MAX_FOTOS);
    const cambios = { nombre: f.nombre, tipo: f.tipo, descripcion: f.descripcion || null, precio: f.precio === '' ? null : Number(f.precio) };
    try {
      if (editando) await datos.actualizarProducto(editando.id, cambios, fotos); else await datos.crearProducto(cambios, fotos);
      form.reset(); setEditando(null); await cargar();
    } catch (err) {
      setError(/límite/.test(err.message) ? err.message : 'No se pudo guardar. Revisa los datos e intenta otra vez.');
    } finally { setOcupado(false); }
  }
  const intentar = async (accion) => {
    setFallo('');
    try { await accion(); await cargar(); } catch { setFallo('No se pudo guardar el cambio. Revisa tu conexión o vuelve a entrar.'); }
  };
  const alternar = (p) => intentar(() => datos.actualizarProducto(p.id, { agotado: !p.agotado }));
  const borrar = (p) => {
    if (confirm(`¿Borrar "${p.nombre}"? No se puede deshacer.`)) intentar(async () => { await datos.borrarProducto(p.id); if (editando?.id === p.id) setEditando(null); });
  };

  return (
    <>
      <p className="t-lead">{usuario.perfil?.nombre_negocio} · Torre {usuario.perfil?.torre} · {usuario.perfil?.tipo}</p>
      {!aprobado && <p className="aviso">Tu cuenta está en revisión. Cuando la aprobemos podrás publicar productos.</p>}
      {aprobado && (
        <form className="formulario hoja" onSubmit={publicar} key={editando?.id || 'nuevo'}>
          <h2 className="t-head">{editando ? 'Editar producto' : 'Nuevo producto'}</h2>
          <Campo etiqueta="Nombre"><input name="nombre" required minLength={2} maxLength={80} defaultValue={editando?.nombre} /></Campo>
          <Campo etiqueta="Tipo de producto">
            <select name="tipo" required defaultValue={editando?.tipo || usuario.perfil?.tipo}>{tipos.map((t) => <option key={t}>{t}</option>)}</select>
          </Campo>
          <Campo etiqueta="Descripción (opcional)"><textarea name="descripcion" rows={3} maxLength={500} defaultValue={editando?.descripcion || ''} /></Campo>
          <Campo etiqueta="Precio en quetzales (vacío = “Precio por cotizar”)"><input name="precio" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={editando?.precio ?? ''} /></Campo>
          <Campo etiqueta={`Fotos (opcional, hasta ${MAX_FOTOS})${editando ? '. Si eliges fotos nuevas, reemplazan las actuales' : ''}`}><input name="foto" type="file" accept="image/*" multiple /></Campo>
          {error && <p role="alert" className="error">{error}</p>}
          <button className="btn" disabled={ocupado}>{editando ? 'Guardar cambios' : 'Publicar'}</button>
          {editando && <button type="button" className="enlace" onClick={() => setEditando(null)}>Cancelar edición</button>}
        </form>
      )}
      {aprobado && (
        <>
          <h2 className="t-head panel__sub">Tus productos</h2>
          {fallo && <p role="alert" className="error">{fallo}</p>}
          {!mios.length && !fallo && <p className="nota">Todavía no has publicado nada.</p>}
          <ul className="mios">
            {mios.map((p) => (
              <li key={p.id}>
                <span>{p.nombre} <span className="t-small nota">· {p.tipo}{p.agotado && ' · Agotado'}</span></span>
                <span className="mios__acciones">
                  <button className="enlace" onClick={() => { setEditando(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Editar</button>
                  <button className="enlace" onClick={() => alternar(p)}>{p.agotado ? 'Hay existencias' : 'Marcar agotado'}</button>
                  <button className="enlace" onClick={() => borrar(p)}>Borrar</button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <button className="enlace" onClick={async () => { await datos.salir(); alSalir(); }}>Cerrar sesión</button>
    </>
  );
}

export default function Vendedor({ params }) {
  const [usuario, setUsuario] = useState(undefined);
  const refrescar = () => datos.usuario().then(setUsuario).catch(() => setUsuario(null));
  useEffect(() => { refrescar(); }, []);
  const recuperando = params?.get('recuperar') && usuario;
  return (
    <section className="seccion envoltura panel">
      <Titulo as="h1" lineas={['Zona de vendedores']} />
      {demo && <p className="aviso t-small">Modo demo: los datos se guardan solo en este navegador. Prueba con demo@segheria.test / demo1234.</p>}
      {usuario === undefined ? <p className="nota">Cargando…</p>
        : recuperando ? <NuevaPass alTerminar={refrescar} />
        : usuario ? <Panel usuario={usuario} alSalir={refrescar} /> : <Acceso alEntrar={refrescar} />}
    </section>
  );
}
