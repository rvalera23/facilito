// ==========================================
// ARCHIVO: app/constants/nicheData.ts
// VERSIÓN REESTRUCTURADA - JERARQUÍA COMPLETA
// ==========================================

// ==========================================
// MONEDAS DISPONIBLES
// ==========================================
export const CURRENCIES = [
  { label: 'Bs (VES)', value: 'VES' },
  { label: '$ (USD)', value: 'USD' },
  { label: '€ (EUR)', value: 'EUR' },
  { label: 'USDT (CRYPTO)', value: 'CRYPTO' },
];

// ==========================================
// CATEGORÍAS GENERALES (SIEMPRE DISPONIBLES)
// ==========================================
const GENERAL_CATEGORIES = [
  'General',
  'Destacados',
  'Ofertas',
  'Novedades',
  'Otros',
];

// ==========================================
// JERARQUÍA COMPLETA DE CATEGORÍAS
// ==========================================

// === 1. TECNOLOGÍA Y ELECTRÓNICA ===
// Cubre: Computadoras, teléfonos, redes, audio, video, gaming, impresión, almacenamiento
const TECH_HIERARCHY = {
  general: [
    'Electrónica y Tecnología',
    'Accesorios Tecnológicos',
  ],
categorias: {
    'Computación': [
      'Computadoras',
      'Laptops',
      'Tablets',
      'E-readers',
      'Monitores',
      'Pantallas',
      'Almacenamiento',
      'Discos Duros',
      'Discos SSD',
      'Memorias USB',
      'Tarjetas SD',
      'Impresoras',
      'Escáneres',
      'Cables',
      'Adaptadores',
      'Baterías',
      'Cargadores',
      'Routers',
      'Modems',
      'Tarjetas de Red',
      'Tarjetas Wi-Fi',
      'Servidores',
      'NAS',
      'Componentes de PC',
      'Mouse',
      'Teclados',
      'Webcams',
      'Micrófonos',
    ],

    'Telefonía': [
      'Teléfonos Inteligentes',
      'Teléfonos Básicos',
      'Teléfonos Refabricados',
      'Fundas y Carcasas',
      'Protectores de Pantalla',
      'Cargadores y Adaptadores',
      'Cables USB y Datos',
      'Audífonos y Manos Libres',
      'Baterías Externas',
      'Soportes y Monturas',
      'Accesorios para Selfies',
      'Lentes y Accesorios de Cámara',
      'Repuestos para Celulares',
      'Herramientas de Reparación',
    ],
'Audio y Video': [
      'Audífonos',
      'Auriculares',
      'Parlantes',
      'Altavoces',
      'Micrófonos',
      'Cámaras',
      'Videocámaras',
      'Proyectores',
      'Televisores',
      'SmartTV',
      'Sistemas de Sonido',
      'DJ',
      'Equipos de Audio',
    ],
    'Gaming': [
      'Consolas de Videojuegos',
      'Videojuegos',
      'Accesorios para Gaming',
      'Playstation',
     'Xbox', 
     'Nintendo',
     'Steam',
     'PC',
      'Sillas Gamer',
      'Computadoras Gamer',
      'Monitores Gamer',
    ],
  }
};

// === 2. MODA Y ESTILO ===
// Cubre: Ropa hombre, mujer, niños, calzado, accesorios, joyería, relojería
const FASHION_HIERARCHY = {
general: [
    'Ropa y Calzado',
    'Accesorios de Moda',
  ],
  categorias: {
    'Ropa Caballero': [
      'Camisas (Caballero)',
      'Pantalones (Caballero)',
      'Jeans (Caballero)',
      'Trajes (Caballero)',
      'Blazers (Caballero)',
      'Chaquetas (Caballero)',
      'Ropa Interior (Caballero)',
      'Pijamas (Caballero)',
      'Ropa Deportiva (Caballero)',
      'Ropa de Baño (Caballero)',
    ],
    'Ropa Dama': [
      'Blusas (Dama)',
      'Pantalones (Dama)',
      'Jeans (Dama)',
      'Vestidos (Dama)',
      'Enterizos (Dama)',
      'Faldas (Dama)',
      'Shorts (Dama)',
      'Chaquetas (Dama)',
      'Abrigos (Dama)',
      'Ropa Interior (Dama)',
      'Pijamas (Dama)',
      'Ropa Deportiva (Dama)',
      'Ropa de Baño (Dama)',
      'Ropa de Fiesta (Dama)',
    ],
    'Ropa Infantil y Juvenil': [
      'Ropa de Bebé',
      'Ropa Infantil',
      'Ropa Juvenil',
      'Ropa Adolescente',
      'Zapatos Infantiles',
    ],
    'Calzado': [
      'Zapatos (Caballero)',
      'Zapatos (Dama)',
      'Zapatos Deportivos (Caballero)',
      'Zapatos Deportivos (Dama)',
      'Botas (Caballero)',
      'Botas (Dama)',
      'Calzado Especializado',
      'Zapatos de Seguridad',
      'Zapatos de Vestir',
      'Sandalias',
      'Chanclas',
    ],
    'Accesorios de Moda': [
      'Bolsos',
      'Carteras',
      'Billeteras',
      'Cinturones',
      'Corbatas',
      'Pajaritas',
      'Bufandas',
      'Pañuelos',
      'Guantes',
      'Gorras',
      'Gorros',
      'Sombreros',
      'Joyas',
      'Bisutería',
      'Relojes',
      'Lentes de Sol',
      'Paraguas',
    ],
    'Ropa Especial': [
      'Ropa de Trabajo',
      'Ropa de Seguridad',
      'Ropa de Protección',
      'Ropa de Oficina',
      'Uniformes',
      'Ropa Tradicional',
    ],
  }
};

// === 3. HOGAR Y DECORACIÓN ===
// Cubre: Muebles, decoración, iluminación, textiles, organización, exteriores
const HOME_HIERARCHY = {
  general: [
    'Hogar y Decoración',
    'Artículos para el Hogar',
  ],
  categorias: {
    'Muebles': [
      'Muebles de Sala',
      'Muebles de Comedor',
      'Muebles de Dormitorio',
      'Muebles de Cocina',
      'Muebles de Baño',
      'Muebles para Exteriores',
      'Muebles de Oficina',
      'Muebles Infantiles',
      'Muebles Modulares',
      'Muebles Antiguos',
    ],
    'Decoración': [
      'Decoración de Pared',
      'Lámparas',
      'Iluminación',
      'Alfombras',
      'Tapices',
      'Cortinas',
      'Persianas',
      'Espejos',
      'Marcos',
      'Relojes de Pared',
      'Cojines',
      'Almohadas',
      'Organizadores',
      'Estanterías',
      'Arte',
      'Cuadros',
      'Plantas',
      'Macetas',
      'Velas',
      'Aromatizadores',
      'Centros de Mesa',
      'Figuras Decorativas',
    ],
    'Textiles': [
      'Ropa de Cama',
      'Mantas',
      'Cobijas',
      'Toallas',
      'Manteles',
      'Servilletas',
      'Cortinas',
      'Tapicería',
    ],
    'Almacenamiento y Organización': [
      'Cajas',
      'Canastas',
      'Estanterías',
      'Repisas',
      'Organizadores de Armario',
      'Percheros',
      'Bastidores',
    ],
  }
};

// === 4. COCINA Y GASTRONOMÍA ===
// Cubre: Utensilios, electrodomésticos, vajilla, almacenamiento, menaje
const KITCHEN_HIERARCHY = {
  general: [
    'Cocina y Utensilios',
    'Utensilios de Cocina',
  ],
  categorias: {
    'Utensilios de Cocina': [
      'Ollas',
      'Sartenes',
      'Cubiertos',
      'Vajilla',
      'Vasos',
      'Copas',
      'Utensilios de Repostería',
      'Cuchillos',
      'Accesorios de Cuchillos',
      'Tablas de Cortar',
      'Ralladores',
      'Peladores',
      'Coladores',
      'Tamices',
      'Boles',
      'Fuentes',
      'Moldes',
      'Cortadores',
      'Termómetros',
      'Balanzas',
    ],
    'Electrodomésticos de Cocina': [
      'Hornos',
      'Microondas',
      'Refrigeradores',
      'Congeladores',
      'Licuadoras',
      'Procesadores de Alimentos',
      'Batidoras',
      'Mezcladoras',
      'Cafeteras',
      'Teteras',
      'Tostadoras',
      'Sandwicheras',
      'Freidoras',
      'Parrillas',
      'Extractores de Jugo',
      'Máquinas de Helado',
      'Robot de Cocina',
    ],
    'Almacenamiento': [
      'Tuppers',
      'Envases',
      'Frascos',
      'Tarros',
      'Bolsas Herméticas',
      'Organizadores de Despensa',
      'Etiquetas',
      'Marcadores',
    ],
    'Menaje y Vajilla': [
      'Platos',
      'Fuentes',
      'Tazas',
      'Tazones',
      'Copas',
      'Vasos',
      'Juegos de Café',
      'Juegos de Té',
      'Bandejas',
      'Jarras',
      'Pitchers',
    ],
  }
};

// === 5. CONSTRUCCIÓN Y HERRAMIENTAS ===
// Cubre: Ferretería, construcción, jardinería, pintura, electricidad, plomería
const CONSTRUCTION_HIERARCHY = {
  general: [
    'Ferretería y Construcción',
    'Materiales de Construcción',
  ],
  categorias: {
    'Herramientas': [
      'Herramientas Manuales',
      'Herramientas Eléctricas',
      'Herramientas de Jardinería',
      'Herramientas de Medición',
      'Máquinas',
      'Equipos',
      'Andamios',
      'Escaleras',
      'Carretillas',
      'Contenedores',
    ],
    'Materiales de Construcción': [
      'Madera',
      'Tableros',
      'Cemento',
      'Mortero',
      'Bloques',
      'Ladrillos',
      'Piedras',
      'Grava',
      'Yeso',
      'Panel de Yeso',
      'Aislamiento Térmico',
      'Techos',
      'Tejas',
      'Pisos',
      'Baldosas',
      'Ventanas',
      'Puertas',
    ],
    'Pinturas y Acabados': [
      'Pinturas',
      'Barnices',
      'Imprimaciones',
      'Pinceles',
      'Rodillos',
      'Papel Tapiz',
      'Adhesivos',
      'Pegamentos',
      'Masillas',
      'Selladores',
    ],
    'Electricidad': [
      'Cables',
      'Cableado',
      'Interruptores',
      'Enchufes',
      'Cajas Eléctricas',
      'Fusibles',
      'Breakers',
      'Lámparas',
      'Focos',
      'Canaletas',
      'Conductos',
      'Paneles Solares',
    ],
    'Fontanería': [
      'Tuberías',
      'Accesorios de Tuberías',
      'Grifos',
      'Llaves',
      'Válvulas',
      'Bombas de Agua',
      'Calentadores',
      'Desagües',
      'Sifones',
    ],
    'Ferretería': [
      'Cerrajería',
      'Candados',
      'Fijaciones',
      'Tornillos',
      'Bisagras',
      'Tiradores',
      'Clavos',
      'Grapas',
      'Pestillos',
      'Cerraduras',
    ],
  }
};

// === 6. SALUD Y BELLEZA ===
// Cubre: Cuidado personal, cosméticos, salud, bienestar, farmacia
const HEALTH_BEAUTY_HIERARCHY = {
  general: [
    'Salud y Bienestar',
    'Belleza y Cuidado Personal',
  ],
  categorias: {
    'Cuidado de la Piel': [
      'Limpiadores y Tónicos',
      'Hidratantes y Crema',
      'Serums y Tratamientos',
      'Protectores Solares',
      'Mascarillas Faciales',
      'Tratamientos Antiedad',
      'Productos Naturales',
    ],
    'Maquillaje': [
      'Maquillaje de Rostro',
      'Maquillaje de Ojos',
      'Maquillaje de Labios',
      'Paletas de Sombras',
      'Bases y Polvos',
      'Labiales y Gloss',
    ],
    'Cuidado del Cabello': [
      'Champús y Acondicionadores',
      'Tratamientos Capilares',
      'Tintes y Coloración',
      'Peines y Cepillos',
      'Secadores y Planchas',
      'Accesorios para Cabello',
    ],
    'Perfumería': [
      'Perfumes y Fragancias',
      'Desodorantes',
      'Aceites Esenciales',
      'Agua de Colonias',
    ],
    'Cuidado Personal': [
      'Uñas y Manicura',
      'Cuidado Bucal',
      'Jabones y Geles',
      'Afeitado y Depilación',
      'Productos de Ducha',
    ],
    'Salud y Farmacia': [
      'Vitaminas y Suplementos',
      'Medicamentos de Farmacia',
      'Equipamiento Médico',
      'Primeros Auxilios',
      'Productos Naturales',
      'Dietética y Nutrición',
      'Productos de Ortopedia',
      'Termómetros y Tensiómetros',
      'Inhaladores y Nebulizadores',
    ],
    'Servicios de Estética': [
      'Peluquería y Cortes de Pelo',
      'Manicura y Pedicura',
      'Maquillaje Profesional',
      'Tratamientos Faciales',
      'Depilación Láser',
      'Masajes Terapéuticos',
      'Spa y Terapias de Relajación',
    ],
  }
};

// === 7. DEPORTE Y OCIO ===
// Cubre: Deportes, fitness, camping, juguetes, juegos, hobbies
const SPORT_LEISURE_HIERARCHY = {
  general: [
    'Deportes y Fitness',
    'Juguetes y Juegos',
  ],
  categorias: {
    'Fitness y Gimnasio': [
      'Ropa Deportiva',
      'Calzado Deportivo',
      'Equipamiento de Gimnasio',
      'Pesas',
      'Kettlebells',
      'Barras',
      'Mancuernas',
      'Bancos',
      'Soporte',
      'Colchonetas',
      'Mats',
      'Accesorios de Entrenamiento',
      'Bicicletas Estáticas',
      'Cintas de Correr',
    ],
    'Deportes Específicos': [
      'Pelotas',
      'Balones',
      'Deportes Acuáticos',
      'Ciclismo',
      'Bicicletas',
      'Equipamiento para Yoga',
      'Deportes de Raqueta',
      'Artes Marciales',
      'Tiro con Arco',
      'Atletismo',
      'Equitación',
    ],
    'Camping y Aire Libre': [
      'Carpas',
      'Tiendas',
      'Mochilas',
      'Bolsas',
      'Botellas',
      'Cantimploras',
      'Linternas',
      'Faroles',
      'Brujulas',
      'GPS',
      'Equipo de Supervivencia',
      'Muebles de Camping',
      'Hornos Portátiles',
      'Cocinas Portátiles',
    ],
    'Juguetes': [
      'Juguetes Educativos',
      'Juguetes Sensoriales',
      'Juguetes de Construcción',
      'Muñecas',
      'Figuras',
      'Peluches',
      'Animales de Peluche',
      'Juguetes al Aire Libre',
      'Juguetes para Bebés',
      'Juguetes de Madera',
      'Vehículos',
      'Carritos',
      'Robots',
      'Drones',
    ],
    'Juegos': [
      'Juegos de Mesa',
      'Rompecabezas',
      'Puzzles',
      'Juegos de Cartas',
      'Juegos de Estrategia',
      'Juegos de Rol',
      'Juegos Tradicionales',
    ],
    'Hobbies y Manualidades': [
      'Materiales de Arte',
      'Pintura',
      'Dibujo',
      'Costura',
      'Tejido',
      'Modelismo',
      'Jardinería',
      'Fotografía',
      'Música',
      'Instrumentos',
      'Coleccionismo',
    ],
  }
};

// === 8. AUTOMOTRIZ ===
// Cubre: Vehículos, repuestos, mantenimiento, accesorios
const AUTOMOTIVE_HIERARCHY = {
  general: [
    'Autopartes y Accesorios',
  ],
  categorias: {
    'Repuestos y Partes': [
      'Llantas y Neumáticos',
      'Baterías y Sistemas Eléctricos',
      'Frenos y Suspensión',
      'Filtros y Fluidoss',
      'Motores y Componentes',
      'Transmisión y Embrague',
      'Sistema de Escape',
      'Sistema de Refrigeración',
      'Dirección y Suspensión',
    ],
    'Accesorios': [
      'Accesorios para Autos',
      'Decoración Interior',
      'Accesorios Exteriores',
      'Sistemas de Sonido',
      'GPS y Navegación',
      'Cámaras y Sensores',
      'Accesorios de Seguridad',
      'Porta-objetos',
      'Alerones y Spoilers',
    ],
    'Mantenimiento': [
      'Aceites y Lubricantes',
      'Aditivos y Limpiadores',
      'Herramientas Automotrices',
      'Equipo de Diagnóstico',
      'Kit de Emergencia',
    ],
    'Iluminación': [
      'Luces y Faros',
      'Luces LED',
      'Bombillas y Reflectores',
    ],
  }
};

// Cubre: Alimentos, bebidas, abastos, comestibles, delicatessen
const FOOD_HIERARCHY = {
  general: [
    'Alimentos y Bebidas',
    'Abastos y Viveres',
  ],
  categorias: {
    'Granos y Básicos': [
      'Arroz',
      'Granos',
      'Fideos',
      'Pastas',
      'Harinas',
      'Mezclas para Preparar',
      'Cereales',
      'Granolas',
      'Legumbres',
      'Semillas',
      'Frutos Secos',
      'Quinoa',
      'Avena',
      'Maíz',
    ],
    'Lácteos y Derivados': [
      'Leche',
      'Cremas de Leche',
      'Quesos',
      'Mantequilla',
      'Margarina',
      'Yogures',
      'Kéfir',
      'Huevos',
      'Requesón',
      'Crema Agria',
    ],
    'Carnes y Proteínas': [
      'Carnes Enlatadas',
      'Embutidos',
      'Jamón',
      'Salchichas',
      'Pescados',
      'Pollo',
      'Mariscos',
      'Atún',
      'Sardinas',
      'Proteínas Vegetales',
      'Tofu',
      'Seitán',
      'Carne de Soya',
    ],
    'Aceites y Condimentos': [
      'Aceite de Oliva',
      'Aceite Vegetal',
      'Aceite de Coco',
      'Grasas',
      'Aderezos',
      'Salsas',
      'Salsa de Soja',
      'Salsa Inglesa',
      'Especias',
      'Condimentos',
      'Vinagres',
      'Vinagre de Manzana',
      'Vinagre Balsámico',
      'Miel',
      'Jarabes',
      'Mermeladas',
    ],
    'Panadería y Repostería': [
      'Pan',
      'Panecillos',
      'Galletas',
      'Dulces',
      'Pasteles',
      'Tortas',
      'Chocolate',
      'Cacao',
      'Azúcar',
      'Edulcorantes',
      'Polvo de Hornear',
      'Levadura',
      'Vainilla',
      'Esencia de Vainilla',
    ],
    'Bebidas': [
      'Café',
      'Té',
      'Bebidas Refrescantes',
      'Jugos',
      'Néctares',
      'Aguas Saborizadas',
      'Vinos',
      'Licores',
      'Cervezas',
      'Bebidas Energéticas',
      'Refrescos',
      'Gaseosas',
      'Agua Mineral',
      'Agua con Gas',
    ],
    'Alimentos Preparados': [
      'Sopas',
      'Caldos',
      'Comidas Listas',
      'Conservas',
      'Enlatados',
      'Alimentos Congelados',
      'Comidas Orgánicas',
    ],
  }
};

// === 10. MASCOTAS ===
// Cubre: Alimentos, accesorios, cuidado, salud animal
const PET_HIERARCHY = {
  general: [
    'Mascotas y Animales',
  ],
  categorias: {
    'Alimentos': [
      'Alimentos para Perros',
      'Alimentos para Gatos',
      'Alimentos para Aves',
      'Alimentos para Peces',
      'Alimentos para Roedores',
      'Alimentos para Reptiles',
      'Snacks',
      'Comida Húmeda',
    ],
    'Accesorios': [
      'Juguetes para Mascotas',
      'Accesorios para Mascotas',
      'Transporte y Jaulas',
      'Camas y Cojines',
      'Collares y Correas',
      'Comederos y Bebederos',
      'Ropa para Mascotas',
      'Higiene y Baño',
    ],
    'Cuidado y Salud': [
      'Cuidado e Higiene Animal',
      'Medicamentos y Vitaminas',
      'Shampoo y Aseo',
      'Cepillos y Peines',
      'Cuidado Dental',
      'Productos Anti-pulgas',
    ],
  }
};

// === 11. SERVICIOS PROFESIONALES ===
// Cubre: Todos los servicios profesionales, consultoría, educación, reparaciones
const SERVICES_HIERARCHY = {
  general: [
    'Servicios Profesionales',
    'Consultoría y Asesoría',
  ],
  categorias: {
    'Consultoría y Asesoría': [
      'Consultoría Empresarial',
      'Consultoría Financiera',
      'Consultoría de Marketing',
      'Consultoría de Recursos Humanos',
      'Consultoría de Tecnología',
      'Consultoría de Operaciones',
      'Consultoría Estratégica',
    ],
    'Servicios Legales': [
      'Asesoría Legal',
      'Abogados y Notarios',
      'Derecho Corporativo',
      'Derecho Laboral',
      'Derecho Civil',
      'Propiedad Intelectual',
      'Legalización de Documentos',
    ],
    'Servicios Financieros': [
      'Servicios Contables',
      'Auditoría',
      'Asesoría Fiscal',
      'Planificación Financiera',
      'Gestión de Inversiones',
    ],
    'Servicios de Marketing y Diseño': [
      'Servicios de Marketing',
      'Servicios de Diseño',
      'Diseño Gráfico',
      'Diseño Web',
      'Diseño de Productos',
      'Marketing Digital',
      'Redes Sociales',
      'SEO y SEM',
      'Publicidad',
    ],
    'Servicios Creativos': [
      'Servicios de Fotografía',
      'Servicios de Video',
      'Producción Audiovisual',
      'Animación y 3D',
      'Edición y Postproducción',
      'Eventos y Bodas',
    ],
    'Educación y Capacitación': [
      'Educación y Capacitación',
      'Clases Particulares',
      'Tutorías Online',
      'Cursos de Idiomas',
      'Cursos de Programación',
      'Cursos de Diseño',
      'Cursos de Música',
      'Capacitación Empresarial',
      'Certificaciones Profesionales',
      'Educación Superior',
      'Formación Online',
    ],
    'Servicios Técnicos': [
      'Servicios de Reparación y Mantenimiento',
      'Reparación de Electrodomésticos',
      'Reparación de Celulares',
      'Reparación de Computadoras',
      'Mantenimiento de Vehículos',
      'Mecánica Automotriz',
      'Plomería y Fontanería',
      'Electricidad y Electricistas',
      'Carpintería y Ebanistería',
      'Servicios de Construcción',
    ],
    'Servicios de Salud y Bienestar': [
      'Servicios de Estética y Belleza',
      'Peluquería y Cortes de Pelo',
      'Manicura y Pedicura',
      'Maquillaje Profesional',
      'Tratamientos Faciales',
      'Depilación Láser',
      'Masajes Terapéuticos',
      'Spa y Terapias de Relajación',
      'Yoga y Meditación',
      'Servicios de Psicología',
      'Nutrición y Dietética',
      'Terapia Física',
    ],
    'Servicios Domésticos': [
      'Limpieza y Aseo',
      'Jardinería y Paisajismo',
      'Pintura y Decoración',
      'Mantenimiento del Hogar',
      'Organización del Hogar',
    ],
    'Servicios de Eventos': [
      'Organización de Eventos',
      'Catering y Alimentos',
      'Fotografía de Eventos',
      'Música y Entretenimiento',
      'Decoración de Eventos',
      'Alquiler de Equipos',
    ],
  }
};

// ==========================================
// MAPA DE NICHOS → CATEGORÍAS (JERARQUÍA COMPLETA)
// ==========================================
export const NICHE_CATEGORIES_MAP: Record<string, string[]> = {
  // === 1. TECNOLOGÍA Y ELECTRÓNICA ===
  'electronica_tecnologia': [
    ...TECH_HIERARCHY.general,
    ...Object.values(TECH_HIERARCHY.categorias).flat()
  ],
  'tecnologia': [
    ...TECH_HIERARCHY.general,
    ...Object.values(TECH_HIERARCHY.categorias).flat()
  ],
  'electronica': [
    ...TECH_HIERARCHY.general,
    ...Object.values(TECH_HIERARCHY.categorias).flat()
  ],
  
  // === 2. TELEFONÍA (MANTENEMOS IDS ORIGINALES) ===
  'telefonia_celular': [
    ...TECH_HIERARCHY.general,
    ...TECH_HIERARCHY.categorias['Telefonía'],
    'Audífonos y Auriculares',
    'Parlantes y Altavoces',
    'Baterías Externas',
  ],
  'celulares_accesorios': [
    ...TECH_HIERARCHY.general,
    ...TECH_HIERARCHY.categorias['Telefonía'],
  ],
  'celulares': [
    ...TECH_HIERARCHY.general,
    ...TECH_HIERARCHY.categorias['Telefonía'],
  ],
  
  // === 3. MODA Y ROPA ===
  'ropa_calzado': [
    ...FASHION_HIERARCHY.general,
    ...Object.values(FASHION_HIERARCHY.categorias).flat()
  ],
  'ropa': [
    ...FASHION_HIERARCHY.general,
    ...Object.values(FASHION_HIERARCHY.categorias).flat()
  ],
  'moda': [
    ...FASHION_HIERARCHY.general,
    ...Object.values(FASHION_HIERARCHY.categorias).flat()
  ],
  'moda_ropa': [
    ...FASHION_HIERARCHY.general,
    ...Object.values(FASHION_HIERARCHY.categorias).flat()
  ],
  
  // === 4. HOGAR Y DECORACIÓN ===
  'hogar_decoracion': [
    ...HOME_HIERARCHY.general,
    ...Object.values(HOME_HIERARCHY.categorias).flat()
  ],
  'hogar': [
    ...HOME_HIERARCHY.general,
    ...Object.values(HOME_HIERARCHY.categorias).flat()
  ],
  'decoracion': [
    ...HOME_HIERARCHY.general,
    ...Object.values(HOME_HIERARCHY.categorias).flat()
  ],
  
  // === 5. COCINA ===
  'cocina_utensilios': [
    ...KITCHEN_HIERARCHY.general,
    ...Object.values(KITCHEN_HIERARCHY.categorias).flat()
  ],
  'cocina': [
    ...KITCHEN_HIERARCHY.general,
    ...Object.values(KITCHEN_HIERARCHY.categorias).flat()
  ],
  
  // === 6. FERRETERÍA Y CONSTRUCCIÓN ===
  'ferreteria_construccion': [
    ...CONSTRUCTION_HIERARCHY.general,
    ...Object.values(CONSTRUCTION_HIERARCHY.categorias).flat()
  ],
  'ferreteria': [
    ...CONSTRUCTION_HIERARCHY.general,
    ...Object.values(CONSTRUCTION_HIERARCHY.categorias).flat()
  ],
  'construccion': [
    ...CONSTRUCTION_HIERARCHY.general,
    ...Object.values(CONSTRUCTION_HIERARCHY.categorias).flat()
  ],
  
  // === 7. BELLEZA Y SALUD ===
  'belleza_cuidado': [
    ...HEALTH_BEAUTY_HIERARCHY.general,
    ...Object.values(HEALTH_BEAUTY_HIERARCHY.categorias).flat()
  ],
  'belleza': [
    ...HEALTH_BEAUTY_HIERARCHY.general,
    ...Object.values(HEALTH_BEAUTY_HIERARCHY.categorias).flat()
  ],
  
  // === 8. SALUD ===
  'salud_bienestar': [
    ...HEALTH_BEAUTY_HIERARCHY.general,
    ...Object.values(HEALTH_BEAUTY_HIERARCHY.categorias).flat()
  ],
  'salud': [
    ...HEALTH_BEAUTY_HIERARCHY.general,
    ...Object.values(HEALTH_BEAUTY_HIERARCHY.categorias).flat()
  ],
  
  // === 9. DEPORTES Y FITNESS ===
  'deportes_fitness': [
    ...SPORT_LEISURE_HIERARCHY.general,
    ...Object.values(SPORT_LEISURE_HIERARCHY.categorias).flat()
  ],
  'deportes': [
    ...SPORT_LEISURE_HIERARCHY.general,
    ...Object.values(SPORT_LEISURE_HIERARCHY.categorias).flat()
  ],
  'fitness': [
    ...SPORT_LEISURE_HIERARCHY.general,
    ...Object.values(SPORT_LEISURE_HIERARCHY.categorias).flat()
  ],
  
  // === 10. JUGUETES ===
  'juguetes_juegos': [
    ...SPORT_LEISURE_HIERARCHY.general,
    ...SPORT_LEISURE_HIERARCHY.categorias['Juguetes'],
    ...SPORT_LEISURE_HIERARCHY.categorias['Juegos'],
  ],
  'juguetes': [
    ...SPORT_LEISURE_HIERARCHY.general,
    ...SPORT_LEISURE_HIERARCHY.categorias['Juguetes'],
    ...SPORT_LEISURE_HIERARCHY.categorias['Juegos'],
  ],
  
  // === 11. MASCOTAS ===
  'mascotas_animales': [
    ...PET_HIERARCHY.general,
    ...Object.values(PET_HIERARCHY.categorias).flat()
  ],
  'mascotas': [
    ...PET_HIERARCHY.general,
    ...Object.values(PET_HIERARCHY.categorias).flat()
  ],
  
  // === 12. AUTOPARTES ===
  'autopartes_accesorios': [
    ...AUTOMOTIVE_HIERARCHY.general,
    ...Object.values(AUTOMOTIVE_HIERARCHY.categorias).flat()
  ],
  'autopartes': [
    ...AUTOMOTIVE_HIERARCHY.general,
    ...Object.values(AUTOMOTIVE_HIERARCHY.categorias).flat()
  ],
  
  // === 13. SERVICIOS PROFESIONALES ===
  'servicios_profesionales': [
    ...SERVICES_HIERARCHY.general,
    ...Object.values(SERVICES_HIERARCHY.categorias).flat()
  ],
  'consultoria_asesoria': [
    ...SERVICES_HIERARCHY.general,
    ...SERVICES_HIERARCHY.categorias['Consultoría y Asesoría'],
    ...SERVICES_HIERARCHY.categorias['Servicios Legales'],
    ...SERVICES_HIERARCHY.categorias['Servicios Financieros'],
  ],
  
  // === 14. EDUCACIÓN ===
  'educacion_capacitacion': [
    ...SERVICES_HIERARCHY.general,
    ...SERVICES_HIERARCHY.categorias['Educación y Capacitación'],
  ],
  'educacion': [
    ...SERVICES_HIERARCHY.general,
    ...SERVICES_HIERARCHY.categorias['Educación y Capacitación'],
  ],
  
  // === 15. ALIMENTOS ===
  'alimentos_bebidas': [
    ...FOOD_HIERARCHY.general,
    ...Object.values(FOOD_HIERARCHY.categorias).flat()
  ],
  'abarrotes_viveres': [
    ...FOOD_HIERARCHY.general,
    ...Object.values(FOOD_HIERARCHY.categorias).flat()
  ],
  'comida': [
    ...FOOD_HIERARCHY.general,
    ...Object.values(FOOD_HIERARCHY.categorias).flat()
  ],
  
  // === 16. ESTÉTICA ===
  'estetica_bienestar': [
    ...SERVICES_HIERARCHY.general,
    ...SERVICES_HIERARCHY.categorias['Servicios de Salud y Bienestar'],
  ],
  'estetica': [
    ...SERVICES_HIERARCHY.general,
    ...SERVICES_HIERARCHY.categorias['Servicios de Salud y Bienestar'],
  ],
  
  // === 17. REPARACIÓN ===
  'reparacion_mantenimiento': [
    ...SERVICES_HIERARCHY.general,
    ...SERVICES_HIERARCHY.categorias['Servicios Técnicos'],
  ],
  'reparacion': [
    ...SERVICES_HIERARCHY.general,
    ...SERVICES_HIERARCHY.categorias['Servicios Técnicos'],
  ],
  
  // === 18. GENERAL (FALLBACK) ===
  'general': [
    'General',
    'Destacados',
    'Ofertas',
    'Novedades',
    'Otros',
    'Productos Varios',
    'Servicios Varios',
  ],
};

// ==========================================
// CATEGORÍAS PRESET (BACKWARD COMPATIBILITY)
// ==========================================
export const PRESET_CATEGORIES = [
  ...GENERAL_CATEGORIES,
  'Productos Varios',
  'Servicios Varios',
  'Accesorios',
  'Electrónicos',
  'Ropa',
  'Calzado',
  'Hogar',
  'Cocina',
  'Belleza',
  'Salud',
  'Deportes',
  'Juguetes',
  'Mascotas',
  'Autopartes',
  'Educación',
  'Alimentos',
  'Bebidas',
  'Reparaciones',
  'Consultoría',
  'Servicios',
];

// ==========================================
// NICHOS PREDEFINIDOS (UNIFICADO - PRODUCTOS + SERVICIOS)
// ==========================================
export const PRODUCT_NICHES = [
  // Tecnología y Electrónica
  { label: 'Electrónica y Tecnología', value: 'electronica_tecnologia' },
  { label: 'Telefonía Celular', value: 'telefonia_celular' },
  { label: 'Celulares y Accesorios', value: 'celulares_accesorios' },
  
  // Moda
  { label: 'Ropa y Calzado', value: 'ropa_calzado' },
  { label: 'Moda y Ropa', value: 'moda_ropa' },
  
  // Hogar
  { label: 'Hogar y Decoración', value: 'hogar_decoracion' },
  { label: 'Cocina y Utensilios', value: 'cocina_utensilios' },
  
  // Construcción
  { label: 'Ferretería y Construcción', value: 'ferreteria_construccion' },
  
  // Salud y Belleza
  { label: 'Belleza y Cuidado Personal', value: 'belleza_cuidado' },
  { label: 'Salud y Bienestar', value: 'salud_bienestar' },
  
  // Deporte y Ocio
  { label: 'Deportes y Fitness', value: 'deportes_fitness' },
  { label: 'Juguetes y Juegos', value: 'juguetes_juegos' },
  { label: 'Videojuegos & Consolas', value: 'juegos_consolas' },
  
  // Mascotas
  { label: 'Mascotas y Animales', value: 'mascotas_animales' },
  
  // Automotriz
  { label: 'Autopartes y Accesorios', value: 'autopartes_accesorios' },
  
  // Alimentos
  { label: 'Alimentos y Bebidas', value: 'alimentos_bebidas' },
  { label: 'Abastos y Víveres', value: 'abarrotes_viveres' },
  
  // Servicios
{ label: 'Servicios Profesionales', value: 'servicios_profesionales' },
{ label: 'Consultoría y Asesoría', value: 'consultoria_asesoria' },
{ label: 'Educación y Capacitación', value: 'educacion_capacitacion' },
{ label: 'Estética y Bienestar', value: 'estetica_bienestar' },
{ label: 'Reparación y Mantenimiento', value: 'reparacion_mantenimiento' },
{ label: 'Salud y Medicina', value: 'salud_medicina' },
{ label: 'Tecnología y Desarrollo', value: 'tecnologia_desarrollo' },
{ label: 'Marketing y Publicidad', value: 'marketing_publicidad' },
{ label: 'Diseño y Creatividad', value: 'diseno_creatividad' },
{ label: 'Legal y Notarial', value: 'legal_notarial' },
{ label: 'Finanzas y Contabilidad', value: 'finanzas_contabilidad' },
{ label: 'Inmobiliario y Bienes Raíces', value: 'inmobiliario_bienes_raices' },
{ label: 'Construcción y Reformas', value: 'construccion_reformas' },
{ label: 'Hogar y Limpieza', value: 'hogar_limpieza' },
{ label: 'Automotriz y Mecánica', value: 'automotriz_mecanica' },
{ label: 'Eventos y Entretenimiento', value: 'eventos_entretenimiento' },
{ label: 'Gastronomía y Catering', value: 'gastronomia_catering' },
{ label: 'Turismo y Hotelería', value: 'turismo_hoteleria' },
{ label: 'Fitness y Deporte', value: 'fitness_deporte' },
{ label: 'Mascotas y Veterinaria', value: 'mascotas_veterinaria' },
{ label: 'Seguridad y Vigilancia', value: 'seguridad_vigilancia' },
{ label: 'Logística y Transporte', value: 'logistica_transporte' },
{ label: 'Traducción y Redacción', value: 'traduccion_redaccion' },
{ label: 'Recursos Humanos y Reclutamiento', value: 'recursos_humanos_reclutamiento' },
{ label: 'Moda y Confección', value: 'moda_confeccion' },
{ label: 'Fotografía y Video', value: 'fotografia_video' },
{ label: 'Agricultura y Jardinería', value: 'agricultura_jardineria' },
{ label: 'Cultura y Arte', value: 'cultura_arte' },
{ label: 'Servicios Funerarios', value: 'servicios_funerarios' },


  
  // General
  { label: 'General', value: 'general' },
];

// ==========================================
// NICHOS PREDEFINIDOS PARA SERVICIOS (BACKWARD COMPATIBILITY)
// ==========================================
export const SERVICE_NICHES = [
{ label: 'Servicios Profesionales', value: 'servicios_profesionales' },
{ label: 'Consultoría y Asesoría', value: 'consultoria_asesoria' },
{ label: 'Educación y Capacitación', value: 'educacion_capacitacion' },
{ label: 'Estética y Bienestar', value: 'estetica_bienestar' },
{ label: 'Reparación y Mantenimiento', value: 'reparacion_mantenimiento' },
{ label: 'Salud y Medicina', value: 'salud_medicina' },
{ label: 'Tecnología y Desarrollo', value: 'tecnologia_desarrollo' },
{ label: 'Marketing y Publicidad', value: 'marketing_publicidad' },
{ label: 'Diseño y Creatividad', value: 'diseno_creatividad' },
{ label: 'Legal y Notarial', value: 'legal_notarial' },
{ label: 'Finanzas y Contabilidad', value: 'finanzas_contabilidad' },
{ label: 'Inmobiliario y Bienes Raíces', value: 'inmobiliario_bienes_raices' },
{ label: 'Construcción y Reformas', value: 'construccion_reformas' },
{ label: 'Hogar y Limpieza', value: 'hogar_limpieza' },
{ label: 'Automotriz y Mecánica', value: 'automotriz_mecanica' },
{ label: 'Eventos y Entretenimiento', value: 'eventos_entretenimiento' },
{ label: 'Gastronomía y Catering', value: 'gastronomia_catering' },
{ label: 'Turismo y Hotelería', value: 'turismo_hoteleria' },
{ label: 'Fitness y Deporte', value: 'fitness_deporte' },
{ label: 'Mascotas y Veterinaria', value: 'mascotas_veterinaria' },
{ label: 'Seguridad y Vigilancia', value: 'seguridad_vigilancia' },
{ label: 'Logística y Transporte', value: 'logistica_transporte' },
{ label: 'Traducción y Redacción', value: 'traduccion_redaccion' },
{ label: 'Recursos Humanos y Reclutamiento', value: 'recursos_humanos_reclutamiento' },
{ label: 'Moda y Confección', value: 'moda_confeccion' },
{ label: 'Fotografía y Video', value: 'fotografia_video' },
{ label: 'Agricultura y Jardinería', value: 'agricultura_jardineria' },
{ label: 'Cultura y Arte', value: 'cultura_arte' },
{ label: 'Servicios Funerarios', value: 'servicios_funerarios' },
{ label: 'General', value: 'general' },
];

// ==========================================
// CATEGORÍAS EXTREMADAMENTE DETALLADAS PARA SERVICIOS (BACKWARD COMPATIBILITY)
// ==========================================
export const SERVICE_PRESET_CATEGORIES = [
  ...GENERAL_CATEGORIES,
  'Consultoría y Asesoría',
  'Servicios Legales',
  'Servicios Contables',
  'Servicios de Marketing',
  'Servicios de Diseño',
  'Servicios de Fotografía',
  'Servicios de Eventos',
  'Educación y Capacitación',
  'Clases Particulares',
  'Cursos de Idiomas',
  'Cursos de Programación',
  'Cursos de Diseño',
  'Cursos de Música',
  'Capacitación Empresarial',
  'Certificaciones Profesionales',
  'Servicios de Estética y Belleza',
  'Peluquería y Cortes de Pelo',
  'Manicura y Pedicura',
  'Maquillaje Profesional',
  'Tratamientos Faciales',
  'Depilación Láser',
  'Masajes Terapéuticos',
  'Spa y Terapias de Relajación',
  'Yoga y Meditación',
  'Servicios de Reparación y Mantenimiento',
  'Reparación de Electrodomésticos',
  'Reparación de Celulares',
  'Reparación de Computadoras',
  'Mantenimiento de Vehículos',
  'Mecánica Automotriz',
  'Plomería y Fontanería',
  'Electricidad y Electricistas',
  'Carpintería y Ebanistería',
  'Servicios de Limpieza',
  'Servicios de Jardinería',
  'Servicios de Mensajería',
  'Servicios de Transporte',
  'Servicios de Catering',
  'Servicios de Seguridad',
  'Servicios de Tecnología',
  'Servicios de Salud',
  'Otros',
];

// ==========================================
// MAPA DE CATEGORÍAS POR NICHO - SERVICIOS (BACKWARD COMPATIBILITY)
// ==========================================
export const SERVICE_NICHE_CATEGORIES_MAP: Record<string, string[]> = {  // ============================================================
  // SERVICIOS PROFESIONALES (genérico)
  // ============================================================
  'servicios_profesionales': [
    ...GENERAL_CATEGORIES,
    'Consultoría y Asesoría',
    'Servicios Legales',
    'Servicios Contables',
    'Servicios de Marketing',
    'Servicios de Diseño',
    'Servicios de Fotografía',
    'Servicios de Eventos',
    'Consultoría Empresarial',
    'Consultoría Financiera',
    'Asesoría Fiscal',
    'Asesoría Legal',
    'Auditoría',
    'Tecnología y Sistemas',
    'Recursos Humanos',
    'Traducción y Redacción',
  ],

  // ============================================================
  // CONSULTORÍA Y ASESORÍA
  // ============================================================
  'consultoria_asesoria': [
    ...GENERAL_CATEGORIES,
    'Consultoría Empresarial',
    'Consultoría Financiera',
    'Consultoría de Marketing',
    'Consultoría de Recursos Humanos',
    'Consultoría de Tecnología',
    'Consultoría de Operaciones',
    'Consultoría Estratégica',
    'Asesoría Legal',
    'Asesoría Fiscal',
    'Servicios Contables',
    'Auditoría',
    'Planificación Financiera',
    'Gestión de Inversiones',
    'Gestión de Proyectos',
    'Coaching Ejecutivo',
  ],

  // ============================================================
  // EDUCACIÓN Y CAPACITACIÓN
  // ============================================================
  'educacion_capacitacion': [
    ...GENERAL_CATEGORIES,
    'Clases Particulares',
    'Tutorías Online',
    'Tutorías Presenciales',
    'Refuerzo Escolar',
    'Preparación de Exámenes',
    'Cursos de Idiomas',
    'Cursos de Programación',
    'Cursos de Diseño',
    'Cursos de Música',
    'Cursos de Arte',
    'Cursos de Cocina',
    'Cursos de Negocios',
    'Cursos de Marketing',
    'Cursos de Fotografía',
    'Capacitación Empresarial',
    'Certificaciones Profesionales',
    'Educación Superior',
    'Formación Online',
    'Cursos Técnicos',
    'Talleres y Seminarios',
    'Educación Infantil',
    'Educación Especial',
    'Deportes y Recreación',
  ],

  // ============================================================
  // ESTÉTICA Y BIENESTAR
  // ============================================================
  'estetica_bienestar': [
    ...GENERAL_CATEGORIES,
    'Peluquería y Cortes de Pelo',
    'Barbería',
    'Manicura y Pedicura',
    'Uñas Acrílicas',
    'Maquillaje Profesional',
    'Maquillaje de Novia',
    'Tratamientos Faciales',
    'Limpieza Facial',
    'Depilación con Cera',
    'Depilación Láser',
    'Masajes Terapéuticos',
    'Masajes Relajantes',
    'Spa y Terapias de Relajación',
    'Yoga y Meditación',
    'Pilates',
    'Pestañas y Cejas',
    'Microblading',
    'Extensiones de Cabello',
    'Alisados y Tratamientos Capilares',
    'Coloración y Mechas',
    'Servicios de Psicología',
    'Nutrición y Dietética',
    'Terapia Física',
    'Estética Corporal',
    'Bronceado',
  ],

  // ============================================================
  // REPARACIÓN Y MANTENIMIENTO
  // ============================================================
  'reparacion_mantenimiento': [
    ...GENERAL_CATEGORIES,
    'Reparación de Electrodomésticos',
    'Reparación de Refrigeradores',
    'Reparación de Lavadoras',
    'Reparación de Aire Acondicionado',
    'Reparación de Celulares',
    'Reparación de Computadoras',
    'Reparación de Laptops',
    'Reparación de Tablets',
    'Reparación de Consolas',
    'Reparación de Televisores',
    'Mantenimiento de Vehículos',
    'Mecánica Automotriz',
    'Plomería y Fontanería',
    'Electricidad y Electricistas',
    'Carpintería y Ebanistería',
    'Cerrajería',
    'Servicios de Construcción',
    'Mantenimiento del Hogar',
    'Mantenimiento de Oficinas',
    'Instalaciones Eléctricas',
    'Instalación de Equipos',
  ],

  // ============================================================
  // SALUD Y MEDICINA
  // ============================================================
  'salud_medicina': [
    ...GENERAL_CATEGORIES,
    'Medicina General',
    'Medicina Especializada',
    'Pediatría',
    'Ginecología',
    'Cardiología',
    'Dermatología',
    'Traumatología',
    'Oftalmología',
    'Odontología',
    'Ortodoncia',
    'Endodoncia',
    'Implantes Dentales',
    'Psicología',
    'Psiquiatría',
    'Nutrición y Dietética',
    'Fisioterapia',
    'Terapia Ocupacional',
    'Terapia del Lenguaje',
    'Enfermería a Domicilio',
    'Consultas Médicas Online',
    'Laboratorio Clínico',
    'Radiología y Estudios',
    'Farmacia',
    'Vacunación',
    'Medicina Alternativa',
    'Acupuntura',
    'Quiropráctica',
  ],

  // ============================================================
  // TECNOLOGÍA Y DESARROLLO
  // ============================================================
  'tecnologia_desarrollo': [
    ...GENERAL_CATEGORIES,
    'Desarrollo Web',
    'Desarrollo de Apps Móviles',
    'Desarrollo de Software',
    'Desarrollo de E-commerce',
    'Diseño UI/UX',
    'Diseño de Productos Digitales',
    'Mantenimiento de Sistemas',
    'Soporte Técnico IT',
    'Administración de Servidores',
    'Administración de Redes',
    'Ciberseguridad',
    'Cloud Computing',
    'DevOps',
    'Bases de Datos',
    'Integraciones y APIs',
    'Automatizaciones',
    'Chatbots y IA',
    'Consultoría Tecnológica',
    'Auditoría de Sistemas',
    'Instalación de Redes',
    'Configuración de Equipos',
  ],

  // ============================================================
  // MARKETING Y PUBLICIDAD
  // ============================================================
  'marketing_publicidad': [
    ...GENERAL_CATEGORIES,
    'Marketing Digital',
    'Redes Sociales',
    'Community Management',
    'Gestión de Contenido',
    'SEO y SEM',
    'Google Ads',
    'Meta Ads',
    'Publicidad Tradicional',
    'Publicidad Impresa',
    'Marketing de Influencers',
    'Email Marketing',
    'Branding',
    'Posicionamiento de Marca',
    'Estrategia de Marketing',
    'Copywriting',
    'Relaciones Públicas',
    'Eventos de Marca',
    'Estudios de Mercado',
    'Análisis de Datos',
    'Consultoría de Marketing',
  ],

  // ============================================================
  // DISEÑO Y CREATIVIDAD
  // ============================================================
  'diseno_creatividad': [
    ...GENERAL_CATEGORIES,
    'Diseño Gráfico',
    'Diseño de Logos',
    'Identidad Visual',
    'Diseño Web',
    'Diseño de Apps',
    'Diseño Editorial',
    'Diseño de Empaques',
    'Diseño de Productos',
    'Diseño Industrial',
    'Diseño de Interiores',
    'Diseño de Moda',
    'Ilustración',
    'Ilustración Digital',
    'Animación 2D',
    'Animación 3D',
    'Motion Graphics',
    'Storyboards',
    'Concept Art',
    'Dirección de Arte',
    'Fotografía de Producto',
    'Fotografía Publicitaria',
  ],

  // ============================================================
  // LEGAL Y NOTARIAL
  // ============================================================
  'legal_notarial': [
    ...GENERAL_CATEGORIES,
    'Abogados y Notarios',
    'Asesoría Legal',
    'Derecho Civil',
    'Derecho Penal',
    'Derecho Laboral',
    'Derecho Corporativo',
    'Derecho Familiar',
    'Derecho Inmobiliario',
    'Derecho Mercantil',
    'Propiedad Intelectual',
    'Marcas y Patentes',
    'Contratos y Convenios',
    'Litigios y Demandas',
    'Mediación y Arbitraje',
    'Legalización de Documentos',
    'Notarías',
    'Registros Públicos',
    'Consultoría Legal',
  ],

  // ============================================================
  // FINANZAS Y CONTABILIDAD
  // ============================================================
  'finanzas_contabilidad': [
    ...GENERAL_CATEGORIES,
    'Servicios Contables',
    'Contabilidad General',
    'Contabilidad Fiscal',
    'Auditoría',
    'Auditoría Interna',
    'Auditoría Externa',
    'Asesoría Fiscal',
    'Declaración de Impuestos',
    'Planificación Financiera',
    'Análisis Financiero',
    'Gestión de Inversiones',
    'Gestión de Riesgos',
    'Nómina y Recibos',
    'Facturación Electrónica',
    'Presupuestos y Proyecciones',
    'Consultoría Financiera',
    'Trámites Bancarios',
    'Seguros y Financiamientos',
  ],

  // ============================================================
  // INMOBILIARIO Y BIENES RAÍCES
  // ============================================================
  'inmobiliario_bienes_raices': [
    ...GENERAL_CATEGORIES,
    'Venta de Casas',
    'Venta de Apartamentos',
    'Venta de Terrenos',
    'Venta de Locales',
    'Venta de Oficinas',
    'Venta de Galpones',
    'Alquiler de Casas',
    'Alquiler de Apartamentos',
    'Alquiler de Habitaciones',
    'Alquiler de Locales',
    'Alquiler de Oficinas',
    'Alquiler de Galpones',
    'Alquiler Vacacional',
    'Airbnb y Estadías',
    'Administración de Propiedades',
    'Tasaciones y Avalúos',
    'Consultoría Inmobiliaria',
    'Créditos Hipotecarios',
    'Documentación de Propiedades',
    'Búsqueda de Inmuebles',
    'Asesoría Legal Inmobiliaria',
  ],

  // ============================================================
  // CONSTRUCCIÓN Y REFORMAS
  // ============================================================
  'construccion_reformas': [
    ...GENERAL_CATEGORIES,
    'Construcción de Casas',
    'Construcción de Edificios',
    'Construcción Comercial',
    'Remodelaciones',
    'Reformas de Cocina',
    'Reformas de Baño',
    'Reformas de Sala',
    'Ampliaciones',
    'Techos y Cubiertas',
    'Pisos y Revestimientos',
    'Pintura y Acabados',
    'Albañilería',
    'Plomería',
    'Electricidad',
    'Carpintería',
    'Herrería',
    'Yeso y Drywall',
    'Impermeabilización',
    'Demoliciones',
    'Movimiento de Tierra',
    'Paisajismo y Jardinería',
    'Piscinas',
    'Fachadas',
    'Dirección de Obra',
    'Planos y Proyectos',
  ],

  // ============================================================
  // HOGAR Y LIMPIEZA
  // ============================================================
  'hogar_limpieza': [
    ...GENERAL_CATEGORIES,
    'Limpieza de Casas',
    'Limpieza de Apartamentos',
    'Limpieza de Oficinas',
    'Limpieza de Locales',
    'Limpieza Profunda',
    'Limpieza Post-Obra',
    'Limpieza de Alfombras',
    'Limpieza de Tapicería',
    'Limpieza de Ventanas',
    'Limpieza de Fachadas',
    'Lavandería y Planchado',
    'Lavado de Ropa a Domicilio',
    'Tintorería',
    'Jardinería y Paisajismo',
    'Poda de Árboles',
    'Fumigación y Control de Plagas',
    'Desinfección',
    'Cuidado de Adultos Mayores',
    'Cuidado de Niños (Niñera)',
    'Cuidado de Mascotas',
    'Cocina a Domicilio',
    'Conserjería',
    'Mantenimiento de Piscinas',
    'Organización del Hogar',
  ],

  // ============================================================
  // AUTOMOTRIZ Y MECÁNICA
  // ============================================================
  'automotriz_mecanica': [
    ...GENERAL_CATEGORIES,
    'Mecánica General',
    'Mecánica Automotriz',
    'Mecánica de Motos',
    'Electricidad Automotriz',
    'Cambio de Aceite',
    'Mantenimiento Preventivo',
    'Mantenimiento Correctivo',
    'Frenos y Suspensión',
    'Alineación y Balanceo',
    'Cambio de Llantas',
    'Servicio de Llantas',
    'Reparación de Motores',
    'Transmisión y Embrague',
    'Sistema de Escape',
    'Aire Acondicionado Automotriz',
    'Diagnóstico Computarizado',
    'Latonería y Pintura',
    'Polarizado y Vidrios',
    'Lavado y Detallado',
    'Grúa y Remolque',
    'Revisiones Vehiculares',
    'Trámites Vehiculares',
    'Chatarrería y Reciclaje',
  ],

  // ============================================================
  // EVENTOS Y ENTRETENIMIENTO
  // ============================================================
  'eventos_entretenimiento': [
    ...GENERAL_CATEGORIES,
    'Organización de Eventos',
    'Bodas',
    'Quinceañeras',
    'Cumpleaños',
    'Bautizos',
    'Graduaciones',
    'Eventos Corporativos',
    'Conferencias y Seminarios',
    'Fiestas Infantiles',
    'Despedidas',
    'Aniversarios',
    'Catering y Alimentos',
    'Repostería y Pastelería',
    'Bartenders y Coctelería',
    'Fotografía de Eventos',
    'Video de Eventos',
    'DJ y Música',
    'Bandas y Músicos',
    'Animadores y Payasos',
    'Decoración de Eventos',
    'Alquiler de Mobiliario',
    'Alquiler de Carpas',
    'Alquiler de Equipos de Sonido',
    'Alquiler de Iluminación',
    'Invitaciones y Papelería',
    'Wedding Planner',
    'Maestro de Ceremonias',
  ],

  // ============================================================
  // GASTRONOMÍA Y CATERING
  // ============================================================
  'gastronomia_catering': [
    ...GENERAL_CATEGORIES,
    'Catering para Eventos',
    'Catering Empresarial',
    'Catering de Bodas',
    'Catering Infantil',
    'Servicio de Mesoneros',
    'Servicio de Bartenders',
    'Cocina a Domicilio',
    'Chef a Domicilio',
    'Comida Preparada',
    'Almuerzos Ejecutivos',
    'Comida Saludable',
    'Comida Vegana y Vegetariana',
    'Comida Sin Gluten',
    'Repostería y Pastelería',
    'Tortas Personalizadas',
    'Cupcakes y Postres',
    'Panadería Artesanal',
    'Chocolatería',
    'Cafetería y Barismo',
    'Food Trucks',
    'Delicatessen',
    'Encurtidos y Conservas',
    'Salsas y Aderezos',
  ],

  // ============================================================
  // TURISMO Y HOTELERÍA
  // ============================================================
  'turismo_hoteleria': [
    ...GENERAL_CATEGORIES,
    'Hoteles',
    'Posadas',
    'Hostales',
    'Airbnb',
    'Alquiler Vacacional',
    'Resorts',
    'Cabañas',
    'Camping y Glamping',
    'Paquetes Turísticos',
    'Tours Guiados',
    'Excursiones',
    'Turismo de Aventura',
    'Turismo Cultural',
    'Turismo Gastronómico',
    'Ecoturismo',
    'Turismo Religioso',
    'Cruceros',
    'Transporte Turístico',
    'Traslados Aeropuerto',
    'Alquiler de Vehículos',
    'Agencias de Viaje',
    'Tickets Aéreos',
    'Seguros de Viaje',
    'Visas y Trámites',
    'Eventos y Convenciones',
  ],

  // ============================================================
  // FITNESS Y DEPORTE
  // ============================================================
  'fitness_deporte': [
    ...GENERAL_CATEGORIES,
    'Gimnasios',
    'CrossFit',
    'Entrenamiento Funcional',
    'Entrenamiento Personal',
    'Entrenamiento Online',
    'Clases Grupales',
    'Zumba',
    'Spinning',
    'Yoga',
    'Pilates',
    'Artes Marciales',
    'Boxeo',
    'Kickboxing',
    'Muay Thai',
    'Jiu Jitsu',
    'Karate',
    'Taekwondo',
    'Danza',
    'Ballet',
    'Danza Contemporánea',
    'Salsa y Bachata',
    'Natación',
    'Clases de Natación',
    'Tenis',
    'Pádel',
    'Fútbol',
    'Básquetbol',
    'Voleibol',
    'Béisbol',
    'Atletismo',
    'Ciclismo',
    'Escalada',
    'Nutrición Deportiva',
    'Fisioterapia Deportiva',
    'Rehabilitación',
  ],

  // ============================================================
  // MASCOTAS Y VETERINARIA
  // ============================================================
  'mascotas_veterinaria': [
    ...GENERAL_CATEGORIES,
    'Consultas Veterinarias',
    'Vacunación',
    'Desparasitación',
    'Cirugías Veterinarias',
    'Esterilización',
    'Odontología Veterinaria',
    'Emergencias Veterinarias',
    'Hospitalización',
    'Laboratorio Veterinario',
    'Radiología Veterinaria',
    'Peluquería Canina',
    'Peluquería Felina',
    'Baño y Estética',
    'Corte de Uñas',
    'Limpieza Dental',
    'Adiestramiento Canino',
    'Adiestramiento de Obediencia',
    'Guardería para Mascotas',
    'Paseo de Perros',
    'Hospedaje de Mascotas',
    'Cuidado a Domicilio',
    'Transporte de Mascotas',
    'Fotografía de Mascotas',
    'Funeraria de Mascotas',
  ],

  // ============================================================
  // SEGURIDAD Y VIGILANCIA
  // ============================================================
  'seguridad_vigilancia': [
    ...GENERAL_CATEGORIES,
    'Vigilancia Privada',
    'Seguridad Residencial',
    'Seguridad Comercial',
    'Seguridad Industrial',
    'Guardias de Seguridad',
    'Escoltas',
    'Monitoreo y Alarmas',
    'Instalación de Cámaras',
    'CCTV y Videovigilancia',
    'Control de Acceso',
    'Cerraduras Inteligentes',
    'Cercas Eléctricas',
    'Sistemas Contra Incendios',
    'Auditoría de Seguridad',
    'Consultoría en Seguridad',
    'Investigación Privada',
    'Custodia de Valores',
    'Transporte de Valores',
    'Seguridad para Eventos',
  ],

  // ============================================================
  // LOGÍSTICA Y TRANSPORTE
  // ============================================================
  'logistica_transporte': [
    ...GENERAL_CATEGORIES,
    'Mudanzas',
    'Mudanzas Residenciales',
    'Mudanzas Comerciales',
    'Transporte de Carga',
    'Transporte de Mercancía',
    'Mensajería y Delivery',
    'Delivery de Comida',
    'Courier Nacional',
    'Courier Internacional',
    'Encomiendas',
    'Paquetería',
    'Transporte de Personal',
    'Transporte Escolar',
    'Transporte Ejecutivo',
    'Taxis y Remises',
    'Servicios de Chofer',
    'Alquiler de Vehículos con Chofer',
    'Grúas y Remolques',
    'Almacenaje y Bodegaje',
    'Distribución y Logística',
    'Aduanas y Comercio Exterior',
    'Embalaje y Empaque',
  ],

  // ============================================================
  // TRADUCCIÓN Y REDACCIÓN
  // ============================================================
  'traduccion_redaccion': [
    ...GENERAL_CATEGORIES,
    'Traducción de Documentos',
    'Traducción Jurada',
    'Traducción Técnica',
    'Traducción Literaria',
    'Traducción de Páginas Web',
    'Interpretación Simultánea',
    'Interpretación Consecutiva',
    'Subtitulado',
    'Doblaje',
    'Transcripción de Audio',
    'Transcripción de Video',
    'Corrección de Estilo',
    'Corrección Ortográfica',
    'Redacción de Contenidos',
    'Redacción Publicitaria',
    'Redacción SEO',
    'Redacción Académica',
    'Ghostwriting',
    'Edición de Libros',
    'Guiones y Storytelling',
    'Textos para Web',
    'Newsletters',
    'Copywriting',
  ],

  // ============================================================
  // RECURSOS HUMANOS Y RECLUTAMIENTO
  // ============================================================
  'recursos_humanos_reclutamiento': [
    ...GENERAL_CATEGORIES,
    'Reclutamiento y Selección',
    'Búsqueda de Talento',
    'Headhunting',
    'Evaluación Psicolaboral',
    'Pruebas Psicométricas',
    'Entrevistas por Competencias',
    'Consultoría en RRHH',
    'Gestión de Nómina',
    'Administración de Personal',
    'Capacitación Empresarial',
    'Coaching Ejecutivo',
    'Team Building',
    'Clima Laboral',
    'Outplacement',
    'Asesoría Laboral',
    'Cálculo de Prestaciones',
    'Liquidaciones Laborales',
    'Auditoría de RRHH',
    'Diseño de Cargos',
    'Manuales de Funciones',
  ],

  // ============================================================
  // MODA Y CONFECCIÓN
  // ============================================================
  'moda_confeccion': [
    ...GENERAL_CATEGORIES,
    'Confección de Ropa',
    'Diseño de Moda',
    'Patronaje',
    'Corte y Confección',
    'Arreglos y Ajustes',
    'Sastrería',
    'Alta Costura',
    'Vestidos de Novia',
    'Vestidos de Fiesta',
    'Trajes a Medida',
    'Uniformes',
    'Ropa Corporativa',
    'Ropa Deportiva',
    'Ropa Infantil',
    'Ropa de Bebé',
    'Bordados',
    'Estampados',
    'Serigrafía',
    'Sublimación',
    'Vinilos Textiles',
    'Tejidos y Telas',
    'Coctelería de Moda',
    'Asesoría de Imagen',
    'Personal Shopper',
  ],

  // ============================================================
  // FOTOGRAFÍA Y VIDEO
  // ============================================================
  'fotografia_video': [
    ...GENERAL_CATEGORIES,
    'Fotografía de Retrato',
    'Fotografía de Familia',
    'Fotografía de Bebés',
    'Fotografía de Embarazo',
    'Fotografía de Bodas',
    'Fotografía de Quinceañeras',
    'Fotografía de Eventos',
    'Fotografía Corporativa',
    'Fotografía de Producto',
    'Fotografía Gastronómica',
    'Fotografía de Moda',
    'Fotografía de Inmuebles',
    'Fotografía Aérea con Drone',
    'Fotografía de Mascotas',
    'Fotografía Artística',
    'Sesiones en Estudio',
    'Sesiones en Exterior',
    'Edición y Retoque',
    'Restauración de Fotos',
    'Video de Bodas',
    'Video Corporativo',
    'Video Publicitario',
    'Videoclips Musicales',
    'Documentales',
    'Cortometrajes',
    'Producción Audiovisual',
    'Motion Graphics',
    'Animación 2D y 3D',
    'Edición y Postproducción',
    'Streaming y Transmisiones',
  ],

  // ============================================================
  // AGRICULTURA Y JARDINERÍA
  // ============================================================
  'agricultura_jardineria': [
    ...GENERAL_CATEGORIES,
    'Jardinería Residencial',
    'Jardinería Comercial',
    'Diseño de Jardines',
    'Paisajismo',
    'Mantenimiento de Jardines',
    'Corte de Césped',
    'Poda de Árboles',
    'Poda de Arbustos',
    'Siembra y Trasplante',
    'Fertilización',
    'Control de Plagas',
    'Fumigación de Jardines',
    'Riego Automatizado',
    'Instalación de Sistemas de Riego',
    'Huertos Urbanos',
    'Huertos Orgánicos',
    'Viveros',
    'Venta de Plantas',
    'Venta de Semillas',
    'Venta de Abonos',
    'Asesoría Agrícola',
    'Producción Agrícola',
    'Cultivos Hidropónicos',
    'Invernaderos',
    'Ganadería y Cuidado de Animales',
  ],

  // ============================================================
  // CULTURA Y ARTE
  // ============================================================
  'cultura_arte': [
    ...GENERAL_CATEGORIES,
    'Clases de Arte',
    'Clases de Pintura',
    'Clases de Dibujo',
    'Clases de Escultura',
    'Clases de Cerámica',
    'Clases de Teatro',
    'Clases de Danza',
    'Clases de Música',
    'Clases de Canto',
    'Clases de Instrumentos',
    'Clases de Fotografía',
    'Clases de Escritura',
    'Talleres Literarios',
    'Talleres de Arte',
    'Producción de Obras',
    'Dirección Teatral',
    'Actuación',
    'Performance',
    'Curaduría de Arte',
    'Galerías',
    'Venta de Obras',
    'Retratos por Encargo',
    'Murales',
    'Restauración de Obras',
    'Museografía',
    'Eventos Culturales',
    'Conciertos',
    'Exposiciones',
  ],

  // ============================================================
  // SERVICIOS FUNERARIOS
  // ============================================================
  'servicios_funerarios': [
    ...GENERAL_CATEGORIES,
    'Servicios Funerarios Completos',
    'Velorios',
    'Cremaciones',
    'Sepelios',
    'Traslados Funerarios',
    'Preparación de Cuerpos',
    'Tanatopraxia',
    'Tanatoestética',
    'Salas de Velación',
    'Cementerios',
    'Nichos y Bóvedas',
    'Floristería Funeraria',
    'Coronas y Arreglos',
    'Esquelas y Avisos',
    'Trámites Funerarios',
    'Seguros de Vida',
    'Planes de Previsión',
    'Urnas y Ataúdes',
    'Lápidas y Placas',
    'Asesoría en Duelo',
    'Acompañamiento Psicológico',
  ],

  // ============================================================
  // GENERAL (FALLBACK)
  // ============================================================
  'general': [
    ...GENERAL_CATEGORIES,
    'Servicios Varios',
    'Consultoría',
    'Asesoría',
    'Reparaciones',
    'Mantenimiento',
    'Educación',
    'Capacitación',
    'Estética',
    'Bienestar',
    'Servicios Profesionales',
    'Servicios Domésticos',
    'Servicios de Eventos',
    'Servicios de Transporte',
    'Servicios de Seguridad',
    'Servicios de Tecnología',
    'Salud',
    'Legal',
    'Finanzas',
    'Marketing',
    'Diseño',
    'Traducción',
    'Fotografía',
    'Jardinería',
    'Limpieza',
  ],
};
// ==========================================
// TAGS PARA PRODUCTOS
// ==========================================
export const PRODUCT_TAG_CATEGORIES = {
  estado: {
    label: 'Estado del Producto',
    multi: false,
    tags: ['Nuevo', 'Usado', 'Reacondicionado', 'Open Box', 'Vintage'],
  },
  material: {
    label: 'Material',
    multi: true,
    tags: [
      'Algodón', 'Lino', 'Seda', 'Lana', 'Cuero', 'Piel',
      'Plástico', 'Metal', 'Madera', 'Vidrio', 'Cerámica',
      'Poliéster', 'Nailon', 'Elastano', 'Goma', 'Silicona',
      'Acero Inoxidable', 'Aluminio', 'Bronce', 'Oro', 'Plata',
      'Mármol', 'Granito', 'Cartón', 'Papel', 'Tela',
    ],
  },
  occasion: {
    label: 'Ocasión de Uso',
    multi: true,
    tags: [
      'Diario', 'Formal', 'Casual', 'Deportivo', 'Noche',
      'Playa', 'Fiesta', 'Trabajo', 'Viaje', 'Hogar',
      'Oficina', 'Exterior', 'Interior',
    ],
  },
  talla: {
    label: 'Talla (Opcional)',
    multi: true,
    tags: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Única', 'Talla única'],
  },
};

// ==========================================
// PRESET COLORS
// ==========================================
export const PRESET_COLORS = [
  { label: 'Único / Fábrica', value: 'Único de Fábrica', hex: 'linear-gradient(135deg, #cbd5e1 0%, #475569 100%)' },
  { label: 'Negro', value: 'Negro', hex: '#18181b' },
  { label: 'Blanco', value: 'Blanco', hex: '#f8fafc' },
  { label: 'Gris / Plata', value: 'Gris / Plata', hex: '#94a3b8' },
  { label: 'Rojo', value: 'Rojo', hex: '#ef4444' },
  { label: 'Azul', value: 'Azul', hex: '#3b82f6' },
  { label: 'Azul Marino', value: 'Azul Marino', hex: '#1e3a5f' },
  { label: 'Celeste', value: 'Celeste', hex: '#7dd3fc' },
  { label: 'Verde', value: 'Verde', hex: '#10b981' },
  { label: 'Verde Oliva', value: 'Verde Oliva', hex: '#4b7a3f' },
  { label: 'Amarillo', value: 'Amarillo', hex: '#f59e0b' },
  { label: 'Naranja', value: 'Naranja', hex: '#f97316' },
  { label: 'Rosa', value: 'Rosa', hex: '#ec4899' },
  { label: 'Morado', value: 'Morado', hex: '#8b5cf6' },
  { label: 'Marrón', value: 'Marrón', hex: '#92400e' },
  { label: 'Café', value: 'Café', hex: '#78350f' },
  { label: 'Beige', value: 'Beige', hex: '#d6d3d1' },
  { label: 'Crema', value: 'Crema', hex: '#fef3c7' },
  { label: 'Dorado', value: 'Dorado', hex: '#d4af37' },
  { label: 'Plateado', value: 'Plateado', hex: '#c0c0c0' },
  { label: 'Bronce', value: 'Bronce', hex: '#cd7f32' },
  { label: 'Mostaza', value: 'Mostaza', hex: '#eab308' },
  { label: 'Lavanda', value: 'Lavanda', hex: '#e9d5ff' },
  { label: 'Menta', value: 'Menta', hex: '#a7f3d0' },
  { label: 'Turquesa', value: 'Turquesa', hex: '#0d9488' },
  { label: 'Coral', value: 'Coral', hex: '#f87171' },
  { label: 'Melocotón', value: 'Melocotón', hex: '#fed7aa' },
  { label: 'Lila', value: 'Lila', hex: '#d8b4fe' },
  { label: 'Fucsia', value: 'Fucsia', hex: '#d946ef' },
  { label: 'Índigo', value: 'Índigo', hex: '#4338ca' },
  { label: 'Esmeralda', value: 'Esmeralda', hex: '#047857' },
  { label: 'Rubí', value: 'Rubí', hex: '#9f1239' },
  { label: 'Zafiro', value: 'Zafiro', hex: '#1e3a8a' },
];

// ==========================================
// PRESET BRANDS
// ==========================================
export const PRESET_BRANDS = [
  // Electrónica y Tecnología
  'Apple', 'Samsung', 'Xiaomi', 'Huawei', 'Google', 'Microsoft',
  'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Sony', 'LG', 'Philips',
  'Panasonic', 'Toshiba', 'Canon', 'Nikon', 'GoPro', 'Bose', 'JBL',
  'Sennheiser', 'Beats', 'Sonos', 'Razer', 'Logitech', 'Kingston',
  'Seagate', 'Western Digital',
  // Moda y Ropa
  'Nike', 'Adidas', 'Puma', 'Reebok', 'Under Armour', 'Zara', 'H&M',
  'Mango', 'Pull & Bear', 'Stradivarius', 'Bershka', "Levi's",
  'Calvin Klein', 'Tommy Hilfiger', 'Ralph Lauren', 'Hugo Boss',
  'Armani', 'Versace', 'Dolce & Gabbana', 'Gucci', 'Prada',
  'Louis Vuitton', 'Chanel', 'Dior', 'Burberry', 'Diesel', 'Lacoste',
  'The North Face', 'Columbia', 'Patagonia', 'Timberland', 'Vans',
  'Converse', 'Dr. Martens', 'New Balance', 'Skechers', 'Crocs',
  // Belleza y Cuidado Personal
  "L'Oréal", 'Maybelline', 'NARS', 'MAC', 'Estée Lauder', 'Clinique',
  'Lancôme', 'Dior Beauty', 'Chanel Beauty', 'YSL Beauty', 'Revlon',
  'Nivea', 'Dove', 'P&G', 'Unilever', 'Johnson & Johnson', 'Colgate',
  'Oral-B', 'Gillette',
  // Electrodomésticos
  'Whirlpool', 'Bosch', 'Siemens', 'Electrolux', 'Miele', 'Frigidaire',
  'Maytag', 'GE Appliances',
  // Automotriz
  'Toyota', 'Honda', 'Ford', 'Chevrolet', 'Volkswagen', 'BMW',
  'Mercedes-Benz', 'Audi', 'Porsche', 'Tesla', 'Hyundai', 'Kia',
  'Mazda', 'Nissan', 'Ferrari', 'Lamborghini',
  // Deportes
  'Wilson', 'Head', 'Babolat', 'Yonex', 'Slazenger', 'Puma Golf',
  'Callaway', 'Titleist', 'TaylorMade', 'Mizuno',
  // Juguetes
  'LEGO', 'Mattel', 'Hasbro', 'Barbie', 'Hot Wheels', 'Fisher-Price',
  'VTech', 'Nerf', 'Playmobil',
  // General
  'Genérica', 'Sin Marca', 'Marca Blanca', 'Único / Fábrica',
];

// ==========================================
// BACKWARD COMPATIBILITY
// ==========================================
export const TAG_CATEGORIES = PRODUCT_TAG_CATEGORIES;

// ==========================================
// UTILIDADES PARA OBTENER CATEGORÍAS POR TIPO
// ==========================================

/**
 * Obtiene todas las categorías de un nicho
 * Útil para el selector de categorías en el formulario
 */
export const getCategoriesForNiche = (nicheKey: string): string[] => {
  return NICHE_CATEGORIES_MAP[nicheKey] || NICHE_CATEGORIES_MAP['general'];
};

/**
 * Obtiene todas las subcategorías de un nicho
 * Útil para mostrar subcategorías específicas
 */
export const getSubCategoriesForNiche = (nicheKey: string): string[] => {
  // Si el nicho tiene subcategorías definidas, las devolvemos
  // Si no, devolvemos las categorías generales
  const allCategories = getCategoriesForNiche(nicheKey);
  const generalSet = new Set(GENERAL_CATEGORIES);
  return allCategories.filter(cat => !generalSet.has(cat));
};

/**
 * Verifica si una categoría es general o específica
 */
export const isGeneralCategory = (category: string): boolean => {
  return GENERAL_CATEGORIES.includes(category);
};