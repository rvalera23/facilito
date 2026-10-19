// ==========================================
// ARCHIVO: app/constants/itemCategories.ts
// ==========================================

// 🔥 IMPORTAR DESDE nicheData PARA MANTENER CONSISTENCIA
import {
  PRESET_COLORS as NICHE_COLORS,
  PRESET_BRANDS as NICHE_BRANDS,
  TAG_CATEGORIES as NICHE_TAGS,
} from './nicheData';

// ==========================================
// 1. RE-EXPORTAR PARA COMPATIBILIDAD
// ==========================================
export const PRESET_COLORS = NICHE_COLORS;
export const PRESET_BRANDS = NICHE_BRANDS;

// ==========================================
// 2. CATEGORÍAS PRINCIPALES PARA PRODUCTOS
// ==========================================
export const CATEGORIAS_PRINCIPALES = [
  // === ROPA Y MODA ===
  'Ropa y Accesorios',
  'Calzado',
  'Ropa Deportiva',
  'Ropa de Bebé y Niños',
  'Ropa de Trabajo y Seguridad',
  'Accesorios de Moda',
  'Bolsos y Carteras',
  'Gorras y Sombreros',
  'Joyas y Relojes',
  'Trajes y Ropa Formal',
  'Ropa Interior y Pijamas',
  'Trajes de Baño',

  // === TECNOLOGÍA Y ELECTRÓNICA ===
  'Electrónica',
  'Teléfonos y Celulares',
  'Accesorios para Celulares',
  'Computadoras y Laptops',
  'Tablets y E-readers',
  'Monitores y Pantallas',
  'Almacenamiento y Discos',
  'Impresoras y Escáneres',
  'Audífonos y Altavoces',
  'Cámaras y Fotografía',
  'Videojuegos y Consolas',
  'Cables y Adaptadores',
  'Baterías y Cargadores',
  'Domótica y Smart Home',

  // === HOGAR Y DECORACIÓN ===
  'Hogar y Decoración',
  'Muebles',
  'Muebles de Sala',
  'Muebles de Comedor',
  'Muebles de Dormitorio',
  'Muebles de Cocina',
  'Muebles de Baño',
  'Muebles para Exteriores',
  'Decoración de Pared',
  'Lámparas e Iluminación',
  'Alfombras y Tapices',
  'Cortinas y Persianas',
  'Espejos y Marcos',
  'Cojines y Almohadas',
  'Organizadores y Estanterías',
  'Arte y Cuadros',
  'Plantas y Macetas',
  'Velas y Aromatizadores',
  'Textiles y Ropa de Cama',
  'Mantas y Cobijas',

  // === COCINA Y UTENSILIOS ===
  'Cocina y Utensilios',
  'Ollas y Sartenes',
  'Utensilios de Cocina',
  'Cubiertos y Vajilla',
  'Vasos y Copas',
  'Tuppers y Almacenamiento',
  'Electrodomésticos de Cocina',
  'Hornos y Microondas',
  'Refrigeradores y Congeladores',
  'Licuadoras y Procesadores',

  // === DEPORTES Y FITNESS ===
  'Deportes y Fitness',
  'Equipamiento de Gimnasio',
  'Pesas y Kettlebells',
  'Barras y Mancuernas',
  'Ropa Deportiva',
  'Calzado Deportivo',
  'Pelotas y Balones',
  'Deportes Acuáticos',
  'Ciclismo y Bicicletas',
  'Camping y Senderismo',
  'Equipamiento para Yoga',
  'Equipamiento para Pilates',
  'Deportes de Raqueta',

  // === JUGUETES Y JUEGOS ===
  'Juguetes y Juegos',
  'Juguetes Educativos',
  'Juguetes Sensoriales',
  'Juguetes de Construcción',
  'Muñecas y Figuras',
  'Peluches y Animales de Peluche',
  'Juguetes al Aire Libre',
  'Juegos de Mesa',
  'Rompecabezas y Puzzles',
  'Juguetes para Bebés',
  'Juguetes de Madera',
  'Videojuegos y Consolas',

  // === BELLEZA Y CUIDADO PERSONAL ===
  'Belleza y Cuidado Personal',
  'Maquillaje de Rostro',
  'Maquillaje de Ojos',
  'Maquillaje de Labios',
  'Cuidado de la Piel',
  'Cuidado del Cabello',
  'Uñas y Manicura',
  'Perfumes y Fragancias',
  'Cuidado Bucal',
  'Desodorantes',
  'Jabones y Geles',
  'Afeitado y Depilación',
  'Tratamientos Faciales',

  // === SALUD Y BIENESTAR ===
  'Salud y Bienestar',
  'Vitaminas y Suplementos',
  'Medicamentos de Farmacia',
  'Equipamiento Médico',
  'Primeros Auxilios',
  'Cuidado de la Salud',
  'Productos Naturales',
  'Dietética y Nutrición',
  'Productos de Ortopedia',
  'Apoyo y Movilidad',

  // === HERRAMIENTAS Y CONSTRUCCIÓN ===
  'Herramientas y Bricolaje',
  'Herramientas Manuales',
  'Herramientas Eléctricas',
  'Herramientas de Jardinería',
  'Pinturas y Barnices',
  'Materiales de Construcción',
  'Tuberías y Accesorios',
  'Cerrajería y Candados',
  'Electricidad y Cableado',
  'Fontanería y Plomería',
  'Adhesivos y Pegamentos',
  'Fijaciones y Tornillos',

  // === JARDINERÍA ===
  'Jardinería',
  'Plantas y Flores',
  'Semillas y Bulbos',
  'Herramientas de Jardinería',
  'Macetas y Jardineras',
  'Tierra y Abono',
  'Sistemas de Riego',
  'Decoración de Jardín',
  'Muebles de Jardín',
  'Piscinas y Accesorios',

  // === AUTOMOTRIZ ===
  'Automotriz',
  'Autopartes y Accesorios',
  'Llantas y Neumáticos',
  'Baterías y Sistemas Eléctricos',
  'Frenos y Suspensión',
  'Accesorios para Autos',
  'Aceites y Lubricantes',
  'Luces y Faros',
  'Decoración Interior',
  'Herramientas Automotrices',

  // === MASCOTAS ===
  'Mascotas',
  'Alimentos para Perros',
  'Alimentos para Gatos',
  'Alimentos para Aves',
  'Alimentos para Peces',
  'Juguetes para Mascotas',
  'Accesorios para Mascotas',
  'Cuidado e Higiene Animal',
  'Transporte y Jaulas',
  'Camas y Casas para Mascotas',

  // === ALIMENTOS Y BEBIDAS ===
  'Alimentos y Bebidas',
  'Aceites y Grasas',
  'Aderezos y Salsas',
  'Arroz y Granos',
  'Azúcares y Edulcorantes',
  'Café y Té',
  'Carnes Enlatadas',
  'Cereales y Granolas',
  'Chocolate y Cacao',
  'Conservas y Enlatados',
  'Especias y Condimentos',
  'Fideos y Pastas',
  'Galletas y Dulces',
  'Harinas y Mezclas',
  'Panadería y Repostería',
  'Sopas y Caldos',
  'Bebidas (Refrescos, Jugos, Aguas)',
  'Vinos y Licores',
  'Bebidas Energéticas',

  // === SERVICIOS ===
  'Servicios',
  'Servicios Profesionales',
  'Consultoría y Asesoría',
  'Servicios Legales',
  'Servicios Contables',
  'Servicios de Marketing',
  'Servicios de Diseño',
  'Servicios de Fotografía',
  'Servicios de Eventos',
  'Servicios de Limpieza',
  'Servicios de Mantenimiento',
  'Servicios de Reparación',
  'Servicios de Estética y Belleza',
  'Servicios de Salud',
  'Servicios de Educación',
  'Servicios de Transporte',
  'Servicios de Mensajería',

  // === DIGITAL Y TECNOLOGÍA ===
  'Digital',
  'Software y Aplicaciones',
  'Cursos Online',
  'E-books y Publicaciones Digitales',
  'Música y Audio Digital',
  'Fotografía y Video Digital',
  'Diseño Web y Desarrollo',
  'Marketing Digital',
  'Ciberseguridad',
  'Hosting y Dominios',

  // === ARTE Y COLECCIONABLES ===
  'Arte y Coleccionables',
  'Pinturas y Esculturas',
  'Arte Digital',
  'Fotografía Artística',
  'Arte en Papel',
  'Coleccionables',
  'Figuras de Acción',
  'Comics y Novelas Gráficas',
  'Arte Textil',
  'Grabados y Litografías',

  // === BEBÉS Y NIÑOS ===
  'Bebés y Niños',
  'Ropa de Bebé',
  'Ropa Infantil',
  'Juguetes Educativos',
  'Cunas y Mobiliario Infantil',
  'Cochecitos y Sillas de Paseo',
  'Biberones y Accesorios',
  'Pañales y Cuidado del Bebé',
  'Libros Infantiles',
  'Útiles Escolares',

  // === OTROS ===
  'Otros',
  'Regalos y Souvenirs',
  'Artesanías y Manualidades',
  'Papelería y Oficina',
  'Productos Ecológicos',
  'Segunda Mano y Vintage',
  'Librería y Libros',
  'Música e Instrumentos',
  'Cine y Entretenimiento',
];

// ==========================================
// 3. PRODUCT_TAG_CATEGORIES - CATEGORÍAS COMPLETAS
// ==========================================
export const PRODUCT_TAG_CATEGORIES = {
  // 🔥 CONDICIÓN - Estado del producto
  condicion: {
    label: 'Condición del Producto',
    multi: false,
    tags: NICHE_TAGS.estado?.tags || [
      'Nuevo',
      'Usado',
      'Reacondicionado',
      'Open Box',
      'Vintage',
      'Coleccionable',
      'Liquidación',
      
    ]
  },



  // 🔥 MATERIAL - Materiales principales
  material: {
    label: 'Material',
    multi: true,
    tags: NICHE_TAGS.material?.tags || [
      // Naturales
      'Algodón', 'Lino', 'Seda', 'Lana', 'Cuero', 'Piel',
      'Cáñamo', 'Yute', 'Bambú', 'Coco', 'Corcho',
      // Sintéticos
      'Poliéster', 'Nailon', 'Elastano', 'Goma', 'Silicona',
      'Acrílico', 'PVC', 'Poliuretano', 'Microfibra',
      // Metales
      'Acero', 'Aluminio', 'Cobre', 'Bronce', 'Oro', 'Plata',
      'Titanio', 'Hierro', 'Estaño', 'Platino',
      // Otros
      'Plástico', 'Metal', 'Madera', 'Vidrio', 'Cerámica',
      'Mármol', 'Granito', 'Caucho', 'Carbono', 'Fibra de Vidrio'
    ]
  },

  // 🔥 TIPO DE PRODUCTO - Categorización general
  tipo: {
    label: 'Tipo de Producto',
    multi: false,
    tags: [
      'Físico',
      'Digital',
      'Virtual',
      'Descargable',
      'Físico + Digital',
      'Servicio',
      'Suscripción',
      'Membresía',
      'Curso',
      'E-book',
      'Software',
      'Plantilla',
      'Música',
      'Video',
      'Arte'
    ]
  },

  // 🔥 TALLA - Ropa y calzado
  talla: {
    label: 'Talla / Tamaño',
    multi: true,
    tags: NICHE_TAGS.talla?.tags || [
      'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL',
      '34', '36', '38', '40', '42', '44', '46', '48', '50',
      'Talla Única',
      'A Medida',
      'Personalizado'
    ]
  },

  // 🔥 GÉNERO - Audiencia objetivo
  genero: {
    label: 'Género / Audiencia',
    multi: true,
    tags: [
      'Masculino',
      'Femenino',
      'Unisex',
      'Niños',
      'Niñas',
      'Bebés',
      'Adolescentes',
      'Adultos',
      'Tercera Edad',
      'Mascotas'
    ]
  },

  // 🔥 TEMPORADA - Época del año
  temporada: {
    label: 'Temporada / Colección',
    multi: true,
    tags: [
      'Primavera-Verano',
      'Otoño-Invierno',
      'Navidad',
      'Halloween',
      'Día de los Muertos',
      'San Valentín',
      'Día del Niño',
      'Día de la Madre',
      'Día del Padre',
      'Regreso a Clases',
      'Black Friday',
      'Cyber Monday',
      'Liquidación',
      'Edición Limitada',
      'Pre-venta',
      'Lanzamiento'
    ]
  },

  // 🔥 OCASIÓN - Uso o evento
  ocasion: {
    label: 'Ocasión / Evento',
    multi: true,
    tags: NICHE_TAGS.occasion?.tags || [
      'Casual',
      'Formal',
      'Deportivo',
      'Fiesta',
      'Boda',
      'Cóctel',
      'Oficina',
      'Viaje',
      'Playa',
      'Piscina',
      'Gimnasio',
      'Hogar',
      'Jardín',
      'Cocina',
      'Fotografía',
      'Estudio',
      'Trabajo',
      'Día a Día'
    ]
  },



  // 🔥 CARACTERÍSTICAS ESPECIALES
  especiales: {
    label: 'Características Especiales',
    multi: true,
    tags: [
      'Ecológico',
      'Biodegradable',
      'Reciclado',
      'Orgánico',
      'Vegano',
      'Cruelty Free',
      'Sin Gluten',
      'Sin Lactosa',
      'Sin Azúcar',
      'Hipoalergénico',
      'Antibacterial',
      'Impermeable',
      'Resistente al Agua',
      'Anti-rayaduras',
      'A prueba de golpes',
      'Lavable',
      'Planchable',
      'Apto para Microondas',
      'Apto para Lavavajillas',
      'Apto para Freezer'
    ]
  },

  // 🔥 GAMA DE PRECIO
  gama: {
    label: 'Gama de Precio',
    multi: false,
    tags: [
      'Económico',
      'Asequible',
      'Calidad-Precio',
      'Premium',
      'De Lujo',
      'Exclusivo',
      'Edición Limitada',
      'Colección'
    ]
  },

  // 🔥 DISPONIBILIDAD
  disponibilidad: {
    label: 'Disponibilidad',
    multi: false,
    tags: [
      'En Stock',
      'Bajo Stock',
      'Agotado',
      'Pre-venta',
      'Fabricación Bajo Pedido',
      'Importación',
      'Próximo Lanzamiento'
    ]
  },

  // 🔥 PÚBLICO OBJETIVO
  publico: {
    label: 'Público Objetivo',
    multi: true,
    tags: [
      'Profesionales',
      'Estudiantes',
      'Emprendedores',
      'Deportistas',
      'Artistas',
      'Músicos',
      'Diseñadores',
      'Programadores',
      'Gamers',
      'Viajeros',
      'Amantes de la Naturaleza',
      'Foodies',
      'Fashionistas',
      'Minimalistas'
    ]
  },

  // 🔥 USO / APLICACIÓN
  uso: {
    label: 'Uso / Aplicación',
    multi: true,
    tags: [
      'Interior',
      'Exterior',
      'Profesional',
      'Doméstico',
      'Industrial',
      'Comercial',
      'Educativo',
      'Recreativo',
      'Terapéutico',
      'Gourmet',
      'DIY (Hazlo Tú Mismo)',
      'Regalo',
      'Autoconsumo',
      'Revender'
    ]
  },

  // 🔥 DURABILIDAD
  durabilidad: {
    label: 'Durabilidad / Vida Útil',
    multi: false,
    tags: [
      'Desechable',
      'Corta Duración',
      'Media Duración',
      'Larga Duración',
      'Indefinida',
      'Reutilizable',
      'Recargable',
      'Reparable'
    ]
  },

  // 🔥 PAÍS DE ORIGEN
  origen: {
    label: 'País de Origen',
    multi: true,
    tags: [
      'Venezuela',
      'Colombia',
      'Brasil',
      'Argentina',
      'México',
      'Chile',
      'Perú',
      'Ecuador',
      'Bolivia',
      'Paraguay',
      'Uruguay',
      'Costa Rica',
      'Panamá',
      'Estados Unidos',
      'Canadá',
      'Reino Unido',
      'Francia',
      'Italia',
      'España',
      'Alemania',
      'Japón',
      'China',
      'Corea del Sur',
      'India',
      'Turquía'
    ]
  },

  // 🔥 ATRIBUTOS ADICIONALES
  adicionales: {
    label: 'Atributos Adicionales',
    multi: true,
    tags: [
      'Con Batería',
      'Con Cable',
      'Inalámbrico',
      'Bluetooth',
      'WiFi',
      'USB',
      'Smart',
      'Digital',
      'Analógico',
      'Automático',
      'Manual',
      'Plegable',
      'Portátil',
      'Ligero',
      'Robusto',
      'Ergonómico',
      'Eco-friendly',
      'Reciclable'
    ]
  }
};

// ==========================================
// 4. TALLAS Y MEDIDAS (para AdvancedAttributesSection)
// ==========================================
export const TALLAS_Y_MEDIDAS = {
  ropa: {
    label: 'Tallas de Ropa',
    tags: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL', '5XL']
  },
  calzado: {
    label: 'Tallas de Calzado',
    tags: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46']
  },
  niños: {
    label: 'Tallas Infantiles',
    tags: ['0-3 meses', '3-6 meses', '6-9 meses', '9-12 meses', '12-18 meses', '18-24 meses', '2T', '3T', '4T', '5T']
  },
  medidas: {
    label: 'Medidas Generales',
    tags: ['Única', 'Ajustable', 'Personalizado', 'Estándar', 'Grande', 'Mediano', 'Pequeño']
  }
};

// ==========================================
// 5. UNIDADES DE PESO
// ==========================================
export const WEIGHT_UNITS = ['kg', 'g', 'lb', 'oz', 'L', 'ml'];

// ==========================================
// 6. NICHE CATEGORIES MAP (combinado)
// ==========================================
export const NICHE_CATEGORIES_MAP: Record<string, string[]> = {
  // Ropa
  'ropa': ['Ropa y Accesorios', 'Calzado', 'Bebés y Niños'],
  'clothing': ['Ropa y Accesorios', 'Calzado', 'Bebés y Niños'],
  'fashion': ['Ropa y Accesorios', 'Calzado', 'Joyas y Relojes'],
  'moda': ['Ropa y Accesorios', 'Calzado', 'Joyas y Relojes'],
  
  // Electrónica
  'electronica': ['Electrónica', 'Herramientas y Bricolaje', 'Digital'],
  'electronics': ['Electrónica', 'Herramientas y Bricolaje', 'Digital'],
  'tech': ['Electrónica', 'Digital', 'Herramientas y Bricolaje'],
  'tecnologia': ['Electrónica', 'Digital', 'Herramientas y Bricolaje'],
  
  // Hogar
  'hogar': ['Hogar y Decoración', 'Muebles', 'Jardinería'],
  'home': ['Hogar y Decoración', 'Muebles', 'Jardinería'],
  'decoracion': ['Hogar y Decoración', 'Muebles', 'Arte y Coleccionables'],
  
  // Deportes
  'deportes': ['Deportes y Fitness', 'Ropa y Accesorios', 'Calzado'],
  'sports': ['Deportes y Fitness', 'Ropa y Accesorios', 'Calzado'],
  'fitness': ['Deportes y Fitness', 'Salud y Bienestar'],
  
  // Belleza
  'belleza': ['Belleza y Cuidado Personal', 'Salud y Bienestar'],
  'beauty': ['Belleza y Cuidado Personal', 'Salud y Bienestar'],
  'cosmeticos': ['Belleza y Cuidado Personal', 'Salud y Bienestar'],
  
  // Automotriz
  'auto': ['Automotriz', 'Herramientas y Bricolaje'],
  'automotriz': ['Automotriz', 'Herramientas y Bricolaje'],
  'vehiculos': ['Automotriz', 'Herramientas y Bricolaje'],
  
  // Alimentos
  'comida': ['Alimentos y Bebidas', 'Salud y Bienestar'],
  'food': ['Alimentos y Bebidas', 'Salud y Bienestar'],
  'gourmet': ['Alimentos y Bebidas', 'Otros'],
  'dulces': ['Postres y Dulces', 'Otros'],
  
  // Mascotas
  'mascotas': ['Mascotas', 'Hogar y Decoración'],
  'pets': ['Mascotas', 'Hogar y Decoración'],
  'animales': ['Mascotas', 'Hogar y Decoración'],
  
  // General
  'general': CATEGORIAS_PRINCIPALES,
  'default': CATEGORIAS_PRINCIPALES
};

// ==========================================
// 7. PRESET CATEGORIES
// ==========================================
export const PRESET_CATEGORIES = CATEGORIAS_PRINCIPALES;

// ==========================================
// 8. EXPORTAR TAMBIÉN PARA COMPATIBILIDAD
// ==========================================
export const TAG_CATEGORIES = NICHE_TAGS;

// ==========================================
// SERVICE TAG CATEGORIES (para servicios)
// ==========================================
// ==========================================
// SERVICE TAG CATEGORIES - Tags que COMPLEMENTAN el servicio
// (NO duplican campos que ya existen: duración, modalidad, precio, etc.)
// ==========================================
export const SERVICE_TAG_CATEGORIES = {
  enfoque: {
    label: 'Enfoque del Servicio',
    multi: false,
    tags: [
      'Preventivo',
      'Correctivo',
      'Educativo',
      'Terapéutico',
      'Creativo',
      'Técnico',
      'Estratégico',
      'Operativo',
      'Diagnóstico',
      'Transformacional'
    ]
  },
  audiencia: {
    label: 'Audiencia / Perfil',
    multi: true,
    tags: [
      'Particulares',
      'Empresas',
      'PYMEs',
      'Startups',
      'Emprendedores',
      'Profesionales',
      'Estudiantes',
      'Adultos',
      'Jóvenes',
      'Niños',
      'Tercera Edad',
      'Público General'
    ]
  },
  formato: {
    label: 'Formato de Entrega',
    multi: true,
    tags: [
      'Individual',
      'Grupal',
      'Empresarial',
      'Personalizado',
      'Estandarizado',
      'Intensivo',
      'Progresivo',
      'Modular',
      'Certificable'
    ]
  },
  valor: {
    label: 'Valor Agregado',
    multi: true,
    tags: [
      'Garantía de Satisfacción',
      'Seguimiento Post-Servicio',
      'Material Incluido',
      'Certificado de Asistencia',
      'Evaluación de Resultados',
      'Asesoría Continua',
      'Primera Sesión Gratuita',
      'Descuento por Paquete',
      'Flexibilidad de Horarios'
    ]
  }
};