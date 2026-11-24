/* Única fuente de textos del sitio. */
export const negocio = {
  nombre: 'Catálogo Segheria',
  tipo: 'Catálogo de vecinos',
  zona: 'zona 14',
  ciudad: 'Ciudad de Guatemala',
  url: 'https://psantos2729.github.io/segheria',
  descripcion: 'Catálogo de productos y servicios de vecinos de Segheria. Filtra por tipo de negocio y cotiza por WhatsApp.'
};

export const tipos = ['Comida y postres', 'Belleza y cuidado', 'Mascotas', 'Hogar y decoración', 'Ropa y accesorios', 'Servicios', 'Otros'];

export const pasos = [
  ['Elige un tipo de negocio', 'Filtra el catálogo por categoría y mira lo que ofrece cada vecino.'],
  ['Abre el producto', 'Cada producto trae su precio y quién lo vende.'],
  ['Cotiza por WhatsApp', 'Un botón te abre el chat con el vendedor y el producto ya escrito.']
];

export const vendedores = [
  ['Crea tu cuenta', 'Con tu correo y tu número de WhatsApp, que debe estar en la lista de vendedores aprobados.'],
  ['Sube tus productos', 'Nombre, descripción, precio y una foto si la tienes.'],
  ['Recibe cotizaciones', 'Los vecinos te escriben directo a tu WhatsApp.']
];

/* Fotos del conjunto (public/fotos). La primera también va en el inicio. */
export const galeria = {
  titulo: ['El lugar donde', 'vivimos y vendemos'],
  fotos: [
    { src: 'fotos/atardecer-fuentes.webp', alt: 'La piscina y las fuentes al atardecer', titulo: 'Atardecer' },
    { src: 'fotos/piscina-aerea.webp', alt: 'Vista aérea de la piscina y los jardines', titulo: 'Piscina' },
    { src: 'fotos/torres-piscina.webp', alt: 'Las torres frente a la piscina', titulo: 'Torres' },
    { src: 'fotos/jardines.webp', alt: 'Áreas verdes con la casa club al fondo', titulo: 'Áreas verdes' },
    { src: 'fotos/piscina-torres.webp', alt: 'Piscina frente a las torres', titulo: 'Vecindario' }
  ]
};

/* Un color por tipo de negocio (de la paleta del sitio) para las tarjetas sin foto. */
export const colorTipo = {
  'Comida y postres': '#E0705F', 'Belleza y cuidado': '#C98BA0', 'Mascotas': '#8FB996',
  'Hogar y decoración': '#D9B38C', 'Ropa y accesorios': '#9BB4C9', 'Servicios': '#B7A5D6', 'Otros': '#C9C1B8'
};
