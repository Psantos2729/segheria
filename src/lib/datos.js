import { createClient } from '@supabase/supabase-js';

/* Un solo punto de acceso a los datos. Con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY usa Supabase (ver supabase.sql);
   sin ellas funciona en "modo demo" guardando todo en este navegador, para probar el flujo. */
const URL = import.meta.env.VITE_SUPABASE_URL, KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const demo = !(URL && KEY);
// PKCE: el enlace de recuperar contraseña trae ?code= en vez de tokens en el hash, que choca con el router por hash.
const sb = demo ? null : createClient(URL, KEY, { auth: { flowType: 'pkce' } });

export const MAX_FOTOS = 4;
export const MAX_PRODUCTOS = 20; // por negocio; el mismo límite está en supabase.sql
export const MAX_NEGOCIOS = 5;
/* Oferta temporal: vale si hay precio de oferta, menor al normal, y la fecha de fin (si hay) no ha pasado. */
export const enOferta = (p) => p.oferta_precio != null && p.precio != null && Number(p.oferta_precio) < Number(p.precio)
  && (!p.oferta_hasta || new Date(p.oferta_hasta) > new Date());
export const precioActual = (p) => (enOferta(p) ? p.oferta_precio : p.precio);
const SIN_DEMO = 'Esto no está disponible en modo demo.';

/* Reduce la foto a 900px en webp antes de subirla (barata para el vendedor y para el catálogo).
   Safari (iPhone) no sabe crear webp: devuelve un PNG pesado que pasa del límite de 2 MB. Ahí se usa JPEG. */
async function reducir(archivo, max = 900) {
  const bmp = await createImageBitmap(archivo);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const webp = await new Promise((ok) => c.toBlob(ok, 'image/webp', 0.82));
  return webp?.type === 'image/webp' ? webp : new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.82));
}
const aDataUrl = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });

/* ---------- Modo demo (localStorage). shortcut: contraseñas en claro, solo para probar; se acaba al configurar Supabase ---------- */
const LS = 'segheria-demo-2'; // el 2 es la forma con negocios; los datos demo de antes se ignoran
const vacio = () => ({ usuarios: [], productos: [], sesion: null });
const leer = () => { try { return JSON.parse(localStorage.getItem(LS)) || vacio(); } catch { return vacio(); } };
const guardar = (d) => localStorage.setItem(LS, JSON.stringify(d));
const uid = () => Math.random().toString(36).slice(2, 10);
const fotosLocal = (archivos) => Promise.all(archivos.map(async (a) => aDataUrl(await reducir(a, 700))));

const local = {
  async listar() {
    const d = leer();
    const negocios = new Map(d.usuarios.flatMap((u) => u.negocios.map((n) => [n.id, { ...n, whatsapp: u.perfil.whatsapp }])));
    return d.productos.map((p) => {
      const n = negocios.get(p.negocio);
      return n && { ...p, imagenes: p.imagenes || [], dueno: p.vendedor, vendedor_id: n.id, tipo: p.tipo || n.tipo,
        vendedor: { nombre_negocio: n.nombre, tipo: n.tipo, whatsapp: n.whatsapp } };
    }).filter(Boolean);
  },
  async esMiembro() { return true; }, // el modo demo no pide código
  async entrarConCodigo() { return true; },
  async usuario() { const d = leer(); return d.usuarios.find((u) => u.id === d.sesion) || null; },
  async registrar({ email, pass, perfil: { nombre_negocio, tipo, whatsapp } }) {
    const d = leer();
    if (d.usuarios.some((u) => u.email === email)) throw new Error('Ese correo ya tiene cuenta.');
    const u = { id: uid(), email, pass, perfil: { whatsapp, aprobado: true }, negocios: [{ id: uid(), nombre: nombre_negocio, tipo }] };
    d.usuarios.push(u); d.sesion = u.id; guardar(d);
    return { aviso: '' };
  },
  async entrar(email, pass) {
    const d = leer(); const u = d.usuarios.find((x) => x.email === email && x.pass === pass);
    if (!u) throw new Error('Correo o contraseña incorrectos.');
    d.sesion = u.id; guardar(d);
  },
  async salir() { const d = leer(); d.sesion = null; guardar(d); },
  async crearProducto(p, archivos = []) {
    const d = leer();
    if (d.productos.filter((x) => x.negocio === p.negocio).length >= MAX_PRODUCTOS) throw new Error(`Llegaste al límite de ${MAX_PRODUCTOS} productos.`);
    d.productos.unshift({ id: uid(), vendedor: d.sesion, agotado: false, ...p, imagenes: await fotosLocal(archivos) }); guardar(d);
  },
  async actualizarProducto(id, cambios, archivos = []) {
    const nuevas = archivos.length ? { imagenes: await fotosLocal(archivos) } : {};
    const d = leer(); d.productos = d.productos.map((p) => (p.id === id ? { ...p, ...cambios, ...nuevas } : p)); guardar(d);
  },
  async borrarProducto(id) { const d = leer(); d.productos = d.productos.filter((p) => p.id !== id); guardar(d); },
  async crearNegocio(n) {
    const d = leer(); const u = d.usuarios.find((x) => x.id === d.sesion);
    if (u.negocios.length >= MAX_NEGOCIOS) throw new Error(`Llegaste al límite de ${MAX_NEGOCIOS} negocios.`);
    u.negocios.push({ id: uid(), ...n }); guardar(d);
  },
  async actualizarNegocio(id, cambios) {
    const d = leer(); d.usuarios.forEach((u) => { u.negocios = u.negocios.map((n) => (n.id === id ? { ...n, ...cambios } : n)); }); guardar(d);
  },
  async borrarNegocio(id) {
    const d = leer(); d.usuarios.forEach((u) => { u.negocios = u.negocios.filter((n) => n.id !== id); });
    d.productos = d.productos.filter((p) => p.negocio !== id); guardar(d);
  },
  async reportar() { /* shortcut: en demo no hay a quién reportar */ },
  async recuperar() { throw new Error(SIN_DEMO); },
  async cambiarPass() { throw new Error(SIN_DEMO); },
  alRecuperar() { return () => {}; },
  async esAdmin() { return false; }, // el modo demo no tiene administrador
  async adminPerfiles() { return []; }, async adminAprobar() {}, async adminReportes() { return []; }, async adminResolver() {},
  async adminNumeros() { return []; }, async adminAgregarNumeros() {}, async adminQuitarNumero() {}
};

/* ---------- Supabase ---------- */
// El WhatsApp ya no se lee de aquí: solo sale de contactos() si pusiste el código (ver supabase.sql, versiones 7 y 9).
const COLS = 'id,nombre,descripcion,precio,oferta_precio,oferta_hasta,imagenes,agotado,tipo,vendedor,negocio:negocios(id,nombre,tipo)'; // vendedor = la cuenta dueña
const haySesion = async () => !!(await sb.auth.getSession()).data.session;
async function subir(archivos) {
  if (!archivos.length) return [];
  const { data: { user } } = await sb.auth.getUser();
  return Promise.all(archivos.map(async (a) => {
    const foto = await reducir(a);
    const ruta = `${user.id}/${uid()}.${foto.type === 'image/webp' ? 'webp' : 'jpg'}`;
    const { error } = await sb.storage.from('productos').upload(ruta, foto, { contentType: foto.type });
    if (error) throw new Error(`foto: ${error.message}`);
    return sb.storage.from('productos').getPublicUrl(ruta).data.publicUrl;
  }));
}
const ok = ({ data, error }) => { if (error) throw error; return data; };
/* Fotos viejas: se leen antes del cambio y se borran después de que el cambio se guardó. */
const fotosDe = async (id) => ok(await sb.from('productos').select('imagenes').eq('id', id).maybeSingle())?.imagenes || [];
async function quitar(urls) {
  const rutas = urls.map((u) => decodeURIComponent(u.split('/object/public/productos/')[1] || '')).filter(Boolean);
  // Si falla, solo queda un archivo de más en Storage: no se interrumpe al vendedor por eso.
  if (rutas.length) await sb.storage.from('productos').remove(rutas).catch(() => {});
}

const remoto = {
  async listar() {
    const data = ok(await sb.from('productos').select(COLS).order('creado', { ascending: false }));
    const c = new Map((await haySesion() ? ok(await sb.rpc('contactos')) : []).map((x) => [x.id, x])); // vacío si no pusiste el código
    // vendedor_id = id del negocio (lo que filtra el catálogo); dueno = la cuenta, para saber cuáles productos son míos.
    return data.map(({ negocio, vendedor, ...p }) => ({ ...p, tipo: p.tipo || negocio.tipo, imagenes: p.imagenes || [], dueno: vendedor, vendedor_id: negocio.id,
      vendedor: { nombre_negocio: negocio.nombre, tipo: negocio.tipo, whatsapp: c.get(vendedor)?.whatsapp } }));
  },
  async esMiembro() { return (await haySesion()) && ok(await sb.rpc('es_condomino')) === true; },
  async entrarConCodigo(codigo) {
    if (!(await haySesion())) ok(await sb.auth.signInAnonymously()); // sesión sin correo: solo recuerda que ya pusiste el código
    return ok(await sb.rpc('entrar_con_codigo', { codigo })) === true;
  },
  async usuario() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session || session.user.is_anonymous) return null; // la sesión del código no es una cuenta de vendedor
    const { data } = await sb.from('profiles').select('aprobado').eq('id', session.user.id).maybeSingle();
    const mio = ok(await sb.rpc('contactos')).find((x) => x.id === session.user.id);
    const negocios = data ? ok(await sb.from('negocios').select('id,nombre,tipo').eq('dueno', session.user.id).order('nombre')) : [];
    return { id: session.user.id, email: session.user.email, perfil: data && { ...data, ...mio }, negocios };
  },
  async registrar({ email, pass, perfil }) {
    const { data, error } = await sb.auth.signUp({ email, password: pass, options: { data: perfil } });
    // Si el número no está en la lista (o ya tiene cuenta), el trigger de la base falla y Supabase solo dice "Database error".
    if (error) throw /database error/i.test(error.message) ? new Error('Ese número no está aprobado, o ya tiene una cuenta. Pide a la administración que lo apruebe.') : error;
    return { aviso: data.session ? '' : 'Te enviamos un correo para confirmar tu cuenta.' };
  },
  async entrar(email, pass) { const { error } = await sb.auth.signInWithPassword({ email, password: pass }); if (error) throw new Error('Correo o contraseña incorrectos.'); },
  async salir() { await sb.auth.signOut(); },
  async crearProducto(p, archivos = []) { ok(await sb.from('productos').insert({ ...p, imagenes: await subir(archivos) })); },
  async actualizarProducto(id, cambios, archivos = []) {
    const viejas = archivos.length ? await fotosDe(id) : [];
    const nuevas = archivos.length ? { imagenes: await subir(archivos) } : {};
    ok(await sb.from('productos').update({ ...cambios, ...nuevas }).eq('id', id));
    await quitar(viejas);
  },
  async borrarProducto(id) {
    const viejas = await fotosDe(id);
    ok(await sb.from('productos').delete().eq('id', id));
    await quitar(viejas);
  },
  async crearNegocio(n) { ok(await sb.from('negocios').insert(n)); },
  async actualizarNegocio(id, cambios) { ok(await sb.from('negocios').update(cambios).eq('id', id)); },
  async borrarNegocio(id) {
    const viejas = ok(await sb.from('productos').select('imagenes').eq('negocio', id)).flatMap((p) => p.imagenes || []);
    ok(await sb.from('negocios').delete().eq('id', id)); // los productos se van con él
    await quitar(viejas);
  },
  async reportar(producto, motivo) { ok(await sb.from('reportes').insert({ producto, motivo })); },
  async recuperar(email) { ok(await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname })); },
  async cambiarPass(pass) { ok(await sb.auth.updateUser({ password: pass })); },
  alRecuperar(cb) { const { data } = sb.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY') cb(); }); return () => data.subscription.unsubscribe(); },
  /* Administración: las funciones SQL revisan en el servidor que seas admin (ver supabase.sql). */
  async esAdmin() {
    if (!(await sb.auth.getSession()).data.session) return false; // sin sesión no hay nada que preguntar
    const { data } = await sb.rpc('es_admin'); return data === true;
  },
  async adminPerfiles() { return ok(await sb.rpc('admin_perfiles')); },
  async adminAprobar(id, valor) { ok(await sb.rpc('admin_aprobar', { uid: id, valor })); },
  async adminReportes() { return ok(await sb.rpc('admin_reportes')); },
  async adminResolver(id, borrar) { ok(await sb.rpc('admin_resolver', { rid: id, borrar })); },
  async adminNumeros() { return ok(await sb.rpc('admin_numeros')); },
  async adminAgregarNumeros(numeros) { ok(await sb.rpc('admin_agregar_numeros', { numeros })); },
  async adminQuitarNumero(numero) { ok(await sb.rpc('admin_quitar_numero', { numero })); }
};

export const datos = demo ? local : remoto;

/* Última lista cargada. Con ella la página de un producto se pinta al instante, sin "Cargando…",
   y la transición de acercamiento encuentra la foto en las dos vistas. */
export const recientes = { productos: null };
const listar = datos.listar;
datos.listar = async () => (recientes.productos = await listar());

/* Productos de ejemplo del modo demo, para ver los filtros. Se cargan una vez. */
if (demo && !leer().usuarios.length) {
  const id = 'demo1', neg = 'demoneg1';
  guardar({ sesion: null, usuarios: [{ id, email: 'demo@segheria.test', pass: 'demo1234', perfil: { whatsapp: '50000000', aprobado: true }, negocios: [{ id: neg, nombre: 'Cocina de ejemplo', tipo: 'Comida y postres' }] }],
    productos: [
      { id: 'e1', vendedor: id, negocio: neg, nombre: 'Pastel de zanahoria (ejemplo)', descripcion: 'Producto de ejemplo del modo demo.', precio: 120, imagenes: [], agotado: false },
      { id: 'e2', vendedor: id, negocio: neg, nombre: 'Caja de galletas (ejemplo)', descripcion: 'Producto de ejemplo del modo demo.', precio: null, imagenes: [], agotado: true }
    ] });
}
