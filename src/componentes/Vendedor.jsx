import { useEffect, useState } from 'react';
import { tipos } from '../contenido.js';
import { datos, demo, MAX_FOTOS, MAX_NEGOCIOS } from '../lib/datos.js';
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
        const { email, pass, nombre_negocio, tipo, whatsapp } = f;
        const r = await datos.registrar({ email, pass, perfil: { nombre_negocio, tipo, whatsapp } });
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
          <Campo etiqueta="Tu número de WhatsApp (8 dígitos)"><input name="whatsapp" required pattern="[0-9]{8}" inputMode="numeric" placeholder="55551234" /></Campo>
          <p className="t-small nota">Solo se crean cuentas con números aprobados por la administración.</p>
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

function Panel({ usuario, alSalir, refrescar }) {
  const [mios, setMios] = useState([]);
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState(''); // errores de la lista (cargar, agotado, borrar); los del formulario van en "error"
  const cargar = () => datos.listar().then((l) => { setMios(l.filter((p) => p.dueno === usuario.id)); setFallo(''); })
    .catch(() => setFallo('No se pudieron cargar tus productos. Revisa tu conexión y recarga la página.'));
  useEffect(() => { cargar(); }, []);
  const aprobado = usuario.perfil?.aprobado;

  async function publicar(e) {
    e.preventDefault(); setError(''); setOcupado(true);
    const form = e.currentTarget; const f = formAObj(e);
    const fotos = [...form.elements.foto.files].slice(0, MAX_FOTOS);
    const cambios = { nombre: f.nombre, tipo: f.tipo, descripcion: f.descripcion || null, precio: f.precio === '' ? null : Number(f.precio) };
    try {
      if (editando) await datos.actualizarProducto(editando.id, cambios, fotos); else await datos.crearProducto({ ...cambios, negocio: f.negocio }, fotos);
      form.reset(); setEditando(null); await cargar();
    } catch (err) {
      console.error(err); // el detalle queda en la consola para revisarlo
      setError(/límite/.test(err.message) ? err.message
        : /^foto/.test(err.message) ? 'No se pudo subir la foto. Prueba con otra foto, o publica sin foto y agrégala después.'
        : 'No se pudo guardar. Revisa los datos e intenta otra vez.');
    } finally { setOcupado(false); }
  }
  const intentar = async (accion) => {
    setFallo('');
    try { await accion(); await cargar(); } catch { setFallo('No se pudo guardar el cambio. Revisa tu conexión o vuelve a entrar.'); }
  };
  const [negEditando, setNegEditando] = useState(null);
  const negocios = usuario.negocios || [];
  async function guardarNegocio(e) {
    e.preventDefault(); setFallo(''); const form = e.currentTarget; const f = formAObj(e);
    try {
      if (negEditando) await datos.actualizarNegocio(negEditando.id, { nombre: f.nombre, tipo: f.tipo }); else await datos.crearNegocio({ nombre: f.nombre, tipo: f.tipo });
      form.reset(); setNegEditando(null); await refrescar(); await cargar();
    } catch (err) { setFallo(/límite/.test(err.message) ? err.message : 'No se pudo guardar el negocio. Revisa los datos e intenta otra vez.'); }
  }
  const borrarNegocio = async (n) => {
    if (!confirm(`¿Borrar el negocio "${n.nombre}" y todos sus productos? No se puede deshacer.`)) return;
    setFallo('');
    try { await datos.borrarNegocio(n.id); setNegEditando(null); setEditando(null); await refrescar(); await cargar(); }
    catch { setFallo('No se pudo borrar el negocio. Revisa tu conexión o vuelve a entrar.'); }
  };
  const alternar = (p) => intentar(() => datos.actualizarProducto(p.id, { agotado: !p.agotado }));
  const borrar = (p) => {
    if (confirm(`¿Borrar "${p.nombre}"? No se puede deshacer.`)) intentar(async () => { await datos.borrarProducto(p.id); if (editando?.id === p.id) setEditando(null); });
  };

  return (
    <>
      <p className="t-lead">{negocios.map((n) => n.nombre).join(' · ')}</p>
      {!aprobado && <p className="aviso">Tu cuenta está en revisión. Cuando la aprobemos podrás publicar productos.</p>}
      {aprobado && (
        <form className="formulario hoja" onSubmit={publicar} key={editando?.id || 'nuevo'}>
          <h2 className="t-head">{editando ? 'Editar producto' : 'Nuevo producto'}</h2>
          {!editando && (
            <Campo etiqueta="Negocio">
              <select name="negocio" required>{negocios.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}</select>
            </Campo>
          )}
          <Campo etiqueta="Nombre"><input name="nombre" required minLength={2} maxLength={80} defaultValue={editando?.nombre} /></Campo>
          <Campo etiqueta="Tipo de producto">
            <select name="tipo" required defaultValue={editando?.tipo || negocios[0]?.tipo}>{tipos.map((t) => <option key={t}>{t}</option>)}</select>
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
          <h2 className="t-head panel__sub">Tus negocios</h2>
          <ul className="mios">
            {negocios.map((n) => (
              <li key={n.id}>
                <span>{n.nombre} <span className="t-small nota">· {n.tipo}</span></span>
                <span className="mios__acciones">
                  <button className="enlace" onClick={() => setNegEditando(n)}>Editar</button>
                  {negocios.length > 1 && <button className="enlace" onClick={() => borrarNegocio(n)}>Borrar</button>}
                </span>
              </li>
            ))}
          </ul>
          {(negEditando || negocios.length < MAX_NEGOCIOS) && (
            <form className="formulario hoja" onSubmit={guardarNegocio} key={negEditando?.id || 'nuevo-negocio'}>
              <h2 className="t-head">{negEditando ? 'Editar negocio' : 'Agregar otro negocio'}</h2>
              <Campo etiqueta="Nombre del negocio"><input name="nombre" required minLength={2} maxLength={60} defaultValue={negEditando?.nombre} /></Campo>
              <Campo etiqueta="Tipo principal"><select name="tipo" required defaultValue={negEditando?.tipo}>{tipos.map((t) => <option key={t}>{t}</option>)}</select></Campo>
              <button className="btn">{negEditando ? 'Guardar negocio' : 'Agregar negocio'}</button>
              {negEditando && <button type="button" className="enlace" onClick={() => setNegEditando(null)}>Cancelar edición</button>}
            </form>
          )}
          <h2 className="t-head panel__sub">Tus productos</h2>
          {fallo && <p role="alert" className="error">{fallo}</p>}
          {!mios.length && !fallo && <p className="nota">Todavía no has publicado nada.</p>}
          <ul className="mios">
            {mios.map((p) => (
              <li key={p.id}>
                <span>{p.nombre} <span className="t-small nota">· {p.vendedor.nombre_negocio} · {p.tipo}{p.agotado && ' · Agotado'}</span></span>
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
        : usuario ? <Panel usuario={usuario} alSalir={refrescar} refrescar={refrescar} /> : <Acceso alEntrar={refrescar} />}
    </section>
  );
}
