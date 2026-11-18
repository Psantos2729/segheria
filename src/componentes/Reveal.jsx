import { useEffect, useRef, useState } from 'react';

/* Aparece una vez al entrar en pantalla. i = orden para escalonar. */
export default function Reveal({ as: Tag = 'div', i = 0, className = '', children, ...resto }) {
  const ref = useRef(null);
  const [dentro, setDentro] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { setDentro(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setDentro(true); io.disconnect(); } },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={`reveal ${dentro ? 'is-in' : ''} ${className}`} style={{ '--i': i }} {...resto}>{children}</Tag>;
}
