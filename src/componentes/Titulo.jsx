/* Titular en dos líneas como máximo: recibe un arreglo de líneas. */
export default function Titulo({ lineas, as: Tag = 'h2', id, className = 't-display' }) {
  const l = Array.isArray(lineas) ? lineas : [lineas];
  return <Tag id={id} className={className}>{l.map((x, i) => <span key={i}>{x}{i < l.length - 1 && <br />}</span>)}</Tag>;
}
