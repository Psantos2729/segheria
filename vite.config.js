import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { negocio as n } from './src/contenido.js';

// Rellena título y descripción del <head> desde src/contenido.js
const seo = () => ({
  name: 'seo-desde-contenido',
  transformIndexHtml: (html) => html.replaceAll('__TITULO__', `${n.nombre} | ${n.tipo} en ${n.zona}, ${n.ciudad}`).replaceAll('__DESCRIPCION__', n.descripcion)
});

// base './' = funciona en GitHub Pages (subcarpeta) y en cualquier hosting
export default defineConfig({ base: './', plugins: [react(), seo()] });
