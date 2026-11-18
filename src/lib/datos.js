import { createClient } from '@supabase/supabase-js';

/* Un solo punto de acceso a los datos. Con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY usa Supabase (ver supabase.sql);
   sin ellas funciona en "modo demo" guardando todo en este navegador, para probar el flujo. */
const URL = import.meta.env.VITE_SUPABASE_URL, KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const demo = !(URL && KEY);
const sb = demo ? null : createClient(URL, KEY);

/* Reduce la foto a 900px en webp antes de subirla (barata para el vendedor y para el catálogo). */
async function reducir(archivo, max = 900) {
  const bmp = await createImageBitmap(archivo);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((ok) => c.toBlob(ok, 'image/webp', 0.82));
}
const aDataUrl = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });

/* ---------- Modo demo (localStorage). shortcut: contraseñas en claro, solo para probar; se acaba al configurar Supabase ---------- */
const LS = 'segheria-demo';
const leer = () => { try { return JSON.parse(localStorage.getItem(LS)) || { usuarios: [], productos: [], sesion: null }; } catch { return { usuarios: [], productos: [], sesion: null }; } };
const guardar = (d) => localStorage.setItem(LS, JSON.stringify(d));
const uid = () => Math.random().toString(36).slice(2, 10);

const local = {
  async listar() {
    const d = leer();
    return d.productos.map((p) => ({ ...p, vendedor_id: p.vendedor, vendedor:d.usuarios.find((u) => u.id === p.vendedor)?.perfil })).filter((p) => p.vendedor);
  },
  async usuario() { const d = leer(); return d.usuarios.find((u) => u.id === d.sesion) || null; },
  async registrar({ email, pass, perfil }) {
    const d = leer();
    if (d.usuarios.some((u) => u.email === email)) throw new Error('Ese correo ya tiene cuenta.');
    const u = { id: uid(), email, pass, perfil: { ...perfil, aprobado: true } };
    d.usuarios.push(u); d.sesion = u.id; guardar(d);
    return { aviso: '' };
  },
  async entrar(email, pass) {
    const d = leer(); const u = d.usuarios.find((x) => x.email === email && x.pass === pass);
    if (!u) throw new Error('Correo o contraseña incorrectos.');
    d.sesion = u.id; guardar(d);
  },
  async salir() { const d = leer(); d.sesion = null; guardar(d); },
  async crearProducto(p, archivo) {
    const d = leer(); const imagen = archivo ? await aDataUrl(await reducir(archivo, 700)) : null;
    d.productos.unshift({ id: uid(), vendedor: d.sesion, ...p, imagen }); guardar(d);
  },
  async borrarProducto(id) { const d = leer(); d.productos = d.productos.filter((p) => p.id !== id); guardar(d); },
  async esAdmin() { return false; } // el modo demo no tiene administrador
};

/* ---------- Supabase ---------- */
const COLS = 'id,nombre,descripcion,precio,imagen,vendedor,perfil:profiles(nombre_negocio,tipo,torre,whatsapp)';
const remoto = {
  async listar() {
    const { data, error } = await sb.from('productos').select(COLS).order('creado', { ascending: false });
    if (error) throw error;
    return data.map(({ perfil, ...p }) => ({ ...p, vendedor_id: p.vendedor, vendedor: perfil }));
  },
  async usuario() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return null;
    const { data } = await sb.from('profiles').select('nombre_negocio,tipo,torre,whatsapp,aprobado').eq('id', session.user.id).maybeSingle();
    return { id: session.user.id, email: session.user.email, perfil: data };
  },
  async registrar({ email, pass, perfil }) {
    const { data, error } = await sb.auth.signUp({ email, password: pass, options: { data: perfil } });
    if (error) throw error;
    return { aviso: data.session ? '' : 'Te enviamos un correo para confirmar tu cuenta.' };
  },
  async entrar(email, pass) { const { error } = await sb.auth.signInWithPassword({ email, password: pass }); if (error) throw new Error('Correo o contraseña incorrectos.'); },
  async salir() { await sb.auth.signOut(); },
  async crearProducto(p, archivo) {
    let imagen = null;
    if (archivo) {
      const { data: { user } } = await sb.auth.getUser();
      const ruta = `${user.id}/${uid()}.webp`;
      const { error: e1 } = await sb.storage.from('productos').upload(ruta, await reducir(archivo), { contentType: 'image/webp' });
      if (e1) throw e1;
      imagen = sb.storage.from('productos').getPublicUrl(ruta).data.publicUrl;
    }
    const { error } = await sb.from('productos').insert({ ...p, imagen });
    if (error) throw error;
  },
  async borrarProducto(id) { const { error } = await sb.from('productos').delete().eq('id', id); if (error) throw error; },
  /* Administración: las funciones SQL revisan en el servidor que seas admin (ver supabase.sql). */
  async esAdmin() { const { data } = await sb.rpc('es_admin'); return data === true; },
  async adminPerfiles() { const { data, error } = await sb.rpc('admin_perfiles'); if (error) throw error; return data; },
  async adminAprobar(id, valor) { const { error } = await sb.rpc('admin_aprobar', { uid: id, valor }); if (error) throw error; }
};

export const datos = demo ? local : remoto;

/* Productos de ejemplo del modo demo, para ver los filtros. Se cargan una vez. */
if (demo && !leer().usuarios.length) {
  const id = 'demo1';
  guardar({ sesion: null, usuarios: [{ id, email: 'demo@segheria.test', pass: 'demo1234', perfil: { nombre_negocio: 'Cocina de la Torre 3 (ejemplo)', tipo: 'Comida y postres', torre: 3, apto: '304', whatsapp: '50000000', aprobado: true } }],
    productos: [
      { id: 'e1', vendedor: id, nombre: 'Pastel de zanahoria (ejemplo)', descripcion: 'Producto de ejemplo del modo demo.', precio: 120, imagen: null },
      { id: 'e2', vendedor: id, nombre: 'Caja de galletas (ejemplo)', descripcion: 'Producto de ejemplo del modo demo.', precio: null, imagen: null }
    ] });
}
