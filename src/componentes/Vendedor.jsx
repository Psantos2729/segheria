import { useEffect, useState } from 'react';
import { tipos, torres } from '../contenido.js';
import { datos, demo } from '../lib/datos.js';
import Titulo from './Titulo.jsx';

const Campo = ({ etiqueta, children }) => <label className="campo"><span>{etiqueta}</span>{children}</label>;
const formAObj = (e) => Object.fromEntries(new FormData(e.currentTarget));

function Acceso({ alEntrar }) {
  const [nuevo, setNuevo] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e) {
    e.preventDefault(); setError(''); setOcupado(true);
    const f = formAObj(e);
    try {
      if (nuevo) {
        const { email, pass, nombre_negocio, tipo, torre, apto, whatsapp } = f;
        const r = await datos.registrar({ email, pass, perfil: { nombre_negocio, tipo, torre: Number(torre), apto: apto.trim(), whatsapp } });
        if (r.aviso) { setAviso(r.aviso); return; }
      } else await datos.entrar(f.email, f.pass);
      alEntrar();
    } catch (err) { setError(err.message || 'Algo salió mal. Revisa los datos.'); } finally { setOcupado(false); }
  }

  return (
    <form className="formulario hoja" onSubmit={enviar}>
      <h2 className="t-head">{nuevo ? 'Crea tu cuenta de vendedor' : 'Entra a tu cuenta'}</h2>
      <Campo etiqueta="Correo"><input name="email" type="email" required autoComplete="email" /></Campo>
      <Campo etiqueta="Contraseña (mínimo 8 caracteres)"><input name="pass" type="password" required minLength={8} autoComplete={nuevo ? 'new-password' : 'current-password'} /></Campo>
      {nuevo && (
        <>
          <Campo etiqueta="Nombre de tu negocio"><input name="nombre_negocio" required minLength={2} maxLength={60} /></Campo>
          <Campo etiqueta="Tipo de negocio"><select name="tipo" required>{tipos.map((t) => <option key={t}>{t}</option>)}</select></Campo>
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
      <button className="btn" disabled={ocupado}>{nuevo ? 'Crear cuenta' : 'Entrar'}</button>
      <button type="button" className="enlace" onClick={() => { setNuevo(!nuevo); setError(''); setAviso(''); }}>
        {nuevo ? 'Ya tengo cuenta' : 'Soy nuevo: crear cuenta'}
      </button>
    </form>
  );
}

function Panel({ usuario, alSalir }) {
  const [mios, setMios] = useState([]);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const cargar = () => datos.listar().then((l) => setMios(l.filter((p) => p.vendedor_id === usuario.id))).catch(() => {});
  useEffect(() => { cargar(); }, []);
  const aprobado = usuario.perfil?.aprobado;

  async function publicar(e) {
    e.preventDefault(); setError(''); setOcupado(true);
    const form = e.currentTarget; const f = formAObj(e);
    try {
      await datos.crearProducto({ nombre: f.nombre, descripcion: f.descripcion || null, precio: f.precio === '' ? null : Number(f.precio) }, f.foto?.size ? f.foto : null);
      form.reset(); await cargar();
    } catch (err) { setError('No se pudo publicar. Revisa los datos e intenta otra vez.'); } finally { setOcupado(false); }
  }

  return (
    <>
      <p className="t-lead">{usuario.perfil?.nombre_negocio} · Torre {usuario.perfil?.torre} · {usuario.perfil?.tipo}</p>
      {!aprobado && <p className="aviso">Tu cuenta está en revisión. Cuando la aprobemos podrás publicar productos.</p>}
      {aprobado && (
        <form className="formulario hoja" onSubmit={publicar}>
          <h2 className="t-head">Nuevo producto</h2>
          <Campo etiqueta="Nombre"><input name="nombre" required minLength={2} maxLength={80} /></Campo>
          <Campo etiqueta="Descripción (opcional)"><textarea name="descripcion" rows={3} maxLength={500} /></Campo>
          <Campo etiqueta="Precio en quetzales (vacío = “Precio por cotizar”)"><input name="precio" type="number" min="0" step="0.01" inputMode="decimal" /></Campo>
          <Campo etiqueta="Foto (opcional)"><input name="foto" type="file" accept="image/*" /></Campo>
          {error && <p role="alert" className="error">{error}</p>}
          <button className="btn" disabled={ocupado}>Publicar</button>
        </form>
      )}
      {aprobado && (
        <>
          <h2 className="t-head panel__sub">Tus productos</h2>
          {!mios.length && <p className="nota">Todavía no has publicado nada.</p>}
          <ul className="mios">
            {mios.map((p) => (
              <li key={p.id}><span>{p.nombre}</span>
                <button className="enlace" onClick={async () => { await datos.borrarProducto(p.id); cargar(); }}>Borrar</button></li>
            ))}
          </ul>
        </>
      )}
      <button className="enlace" onClick={async () => { await datos.salir(); alSalir(); }}>Cerrar sesión</button>
    </>
  );
}

export default function Vendedor() {
  const [usuario, setUsuario] = useState(undefined);
  const refrescar = () => datos.usuario().then(setUsuario).catch(() => setUsuario(null));
  useEffect(() => { refrescar(); }, []);
  return (
    <section className="seccion envoltura panel">
      <Titulo as="h1" lineas={['Zona de vendedores']} />
      {demo && <p className="aviso t-small">Modo demo: los datos se guardan solo en este navegador. Prueba con demo@segheria.test / demo1234.</p>}
      {usuario === undefined ? <p className="nota">Cargando…</p> : usuario ? <Panel usuario={usuario} alSalir={refrescar} /> : <Acceso alEntrar={refrescar} />}
    </section>
  );
}
