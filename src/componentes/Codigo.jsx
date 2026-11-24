import { useEffect, useRef, useState } from 'react';
import { datos } from '../lib/datos.js';

const OMITIDO = 'segheria-codigo-omitido';
const guardar = () => { try { sessionStorage.setItem(OMITIDO, '1'); } catch { /* sin almacenamiento: se vuelve a preguntar */ } };
const omitido = () => { try { return !!sessionStorage.getItem(OMITIDO); } catch { return false; } };

/* Pide el código de los condóminos una sola vez: se abre al entrar si aún no lo pusiste, o desde un botón con el evento "pedir-codigo".
   Sin código el catálogo se ve, pero sin WhatsApp (eso lo decide la base de datos, no esta pantalla). */
export default function Codigo() {
  const ref = useRef(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    const abrir = () => { if (ref.current && !ref.current.open) ref.current.showModal(); };
    window.addEventListener('pedir-codigo', abrir);
    if (!omitido()) datos.esMiembro().then((m) => { if (!m) abrir(); }).catch(() => {});
    return () => window.removeEventListener('pedir-codigo', abrir);
  }, []);

  async function enviar(e) {
    e.preventDefault(); setError(''); setOcupado(true);
    try {
      if (await datos.entrarConCodigo(new FormData(e.currentTarget).get('codigo'))) { location.reload(); return; } // recarga: el catálogo vuelve a pedirse con los contactos
      setError('Ese código no es correcto.');
    } catch (err) { setError(err.message || 'No se pudo comprobar el código. Intenta de nuevo.'); }
    setOcupado(false);
  }

  return (
    <dialog ref={ref} className="codigo hoja" aria-labelledby="codigo-t" onClose={guardar}>
      <form className="formulario" onSubmit={enviar}>
        <h2 id="codigo-t" className="t-head">Código de entrada</h2>
        <p className="nota">Escribe el código de la comunidad. Solo se pide una vez en este dispositivo; con él puedes cotizar por WhatsApp.</p>
        <label className="campo"><span>Código</span>
          <input name="codigo" required autoFocus autoComplete="off" autoCapitalize="none" spellCheck="false" maxLength={60} /></label>
        {error && <p role="alert" className="error t-small">{error}</p>}
        <button className="btn btn--barra" disabled={ocupado}>{ocupado ? 'Comprobando…' : 'Entrar'}</button>
        <button type="button" className="enlace" onClick={() => ref.current.close()}>Ahora no</button>
      </form>
    </dialog>
  );
}
