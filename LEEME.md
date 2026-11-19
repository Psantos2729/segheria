# Catálogo Segheria

`npm install`, `npm run dev`, `npm run build`.
Sin variables de entorno funciona en modo demo (datos en el navegador).
Para producción: crea un proyecto en supabase.com, pega `supabase.sql` en el SQL Editor y crea `.env` con
`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Aprueba vendedores en Table Editor > profiles > aprobado.
Después de cada cambio al SQL, corre `pruebas.sql` en el SQL Editor: debe terminar en "PRUEBAS OK".
