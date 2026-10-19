// ==========================================
// ARCHIVO: apps/backend/src/modules/geo/data/ve-cities.ts
// Diccionario de ciudades venezolanas con centroides + metro.
//
// - `name`: nombre geográfico exacto (municipio, parroquia, etc.).
// - `state`: estado o entidad federal.
// - `metro`: agrupación de "área metropolitana" para mostrar al usuario.
//           Ej: Baruta, Chacao, Petare, Sucre, El Hatillo → metro "Caracas".
//
// findZones() agrupa por `metro`, no por `name`.
// ==========================================

export interface VeCity {
  name: string;
  state: string;
  metro: string;
  latitude: number;
  longitude: number;
}

export const VE_CITIES: VeCity[] = [
  // ============================================================
  // GRAN CARACAS (Distrito Capital + Miranda metropolitano)
  // ============================================================
  { name: 'Caracas',                  state: 'Distrito Capital', metro: 'Caracas', latitude: 10.4806, longitude: -66.9036 },
  { name: 'Baruta',                   state: 'Miranda',          metro: 'Caracas', latitude: 10.4322, longitude: -66.8755 },
  { name: 'Chacao',                   state: 'Miranda',          metro: 'Caracas', latitude: 10.4957, longitude: -66.8534 },
  { name: 'El Hatillo',               state: 'Miranda',          metro: 'Caracas', latitude: 10.4242, longitude: -66.8255 },
  { name: 'Petare',                   state: 'Miranda',          metro: 'Caracas', latitude: 10.4773, longitude: -66.8078 },
  { name: 'Sucre',                    state: 'Miranda',          metro: 'Caracas', latitude: 10.4932, longitude: -66.8355 },
  { name: 'Libertador',               state: 'Distrito Capital', metro: 'Caracas', latitude: 10.5042, longitude: -66.9280 },

  // ============================================================
  // MIRANDA (fuera del Gran Caracas)
  // ============================================================
  { name: 'Guarenas',                 state: 'Miranda', metro: 'Guarenas', latitude: 10.4704, longitude: -66.5421 },
  { name: 'Guatire',                  state: 'Miranda', metro: 'Guatire',  latitude: 10.4776, longitude: -66.5342 },
  { name: 'Araira',                   state: 'Miranda', metro: 'Araira',   latitude: 10.4548, longitude: -66.4632 },
  { name: 'Los Teques',               state: 'Miranda', metro: 'Los Teques', latitude: 10.3444, longitude: -67.0426 },
  { name: 'San Antonio de los Altos', state: 'Miranda', metro: 'Los Teques', latitude: 10.3811, longitude: -66.9633 },
  { name: 'Santa Teresa del Tuy',     state: 'Miranda', metro: 'Valles del Tuy', latitude: 10.2292, longitude: -66.6639 },
  { name: 'Charallave',               state: 'Miranda', metro: 'Valles del Tuy', latitude: 10.2431, longitude: -66.8586 },
  { name: 'Cúa',                      state: 'Miranda', metro: 'Valles del Tuy', latitude: 10.1622, longitude: -66.8836 },
  { name: 'Ocumare del Tuy',          state: 'Miranda', metro: 'Valles del Tuy', latitude: 10.1161, longitude: -66.7756 },
  { name: 'Higuerote',                state: 'Miranda', metro: 'Barlovento', latitude: 10.4833, longitude: -66.1000 },
  { name: 'Río Chico',                state: 'Miranda', metro: 'Barlovento', latitude: 10.3167, longitude: -65.9833 },

  // ============================================================
  // LA GUAIRA
  // ============================================================
  { name: 'La Guaira',                state: 'La Guaira', metro: 'La Guaira', latitude: 10.6000, longitude: -66.9333 },
  { name: 'Maiquetía',                state: 'La Guaira', metro: 'La Guaira', latitude: 10.5956, longitude: -66.9806 },
  { name: 'Catia La Mar',             state: 'La Guaira', metro: 'La Guaira', latitude: 10.6011, longitude: -67.0294 },

  // ============================================================
  // ARAGUA
  // ============================================================
  { name: 'Maracay',                  state: 'Aragua', metro: 'Maracay', latitude: 10.2442, longitude: -67.6068 },
  { name: 'Turmero',                  state: 'Aragua', metro: 'Maracay', latitude: 10.2286, longitude: -67.4753 },
  { name: 'Cagua',                    state: 'Aragua', metro: 'Maracay', latitude: 10.1864, longitude: -67.4583 },
  { name: 'El Limón',                 state: 'Aragua', metro: 'Maracay', latitude: 10.3053, longitude: -67.6319 },
  { name: 'Palo Negro',               state: 'Aragua', metro: 'Maracay', latitude: 10.1742, longitude: -67.5419 },
  { name: 'La Victoria',              state: 'Aragua', metro: 'La Victoria', latitude: 10.2277, longitude: -67.3311 },
  { name: 'Villa de Cura',            state: 'Aragua', metro: 'Villa de Cura', latitude: 10.0386, longitude: -67.4892 },

  // ============================================================
  // CARABOBO
  // ============================================================
  { name: 'Valencia',                 state: 'Carabobo', metro: 'Valencia', latitude: 10.1620, longitude: -68.0077 },
  { name: 'Naguanagua',               state: 'Carabobo', metro: 'Valencia', latitude: 10.2472, longitude: -68.0117 },
  { name: 'San Diego',                state: 'Carabobo', metro: 'Valencia', latitude: 10.2553, longitude: -67.9533 },
  { name: 'Guacara',                  state: 'Carabobo', metro: 'Valencia', latitude: 10.2278, longitude: -67.8778 },
  { name: 'Mariara',                  state: 'Carabobo', metro: 'Valencia', latitude: 10.2931, longitude: -67.7161 },
  { name: 'Puerto Cabello',           state: 'Carabobo', metro: 'Puerto Cabello', latitude: 10.4731, longitude: -68.0125 },
  { name: 'Guigue',                   state: 'Carabobo', metro: 'Guigue', latitude: 10.0833, longitude: -67.7833 },

  // ============================================================
  // ZULIA
  // ============================================================
  { name: 'Maracaibo',                state: 'Zulia', metro: 'Maracaibo', latitude: 10.6544, longitude: -71.6405 },
  { name: 'San Francisco',            state: 'Zulia', metro: 'Maracaibo', latitude: 10.5500, longitude: -71.6500 },
  { name: 'Cabimas',                  state: 'Zulia', metro: 'Costa Oriental', latitude: 10.3990, longitude: -71.4500 },
  { name: 'Ciudad Ojeda',             state: 'Zulia', metro: 'Costa Oriental', latitude: 10.2006, longitude: -71.3167 },
  { name: 'Machiques',                state: 'Zulia', metro: 'Machiques', latitude: 10.0667, longitude: -72.5500 },
  { name: 'Santa Bárbara del Zulia',  state: 'Zulia', metro: 'Sur del Lago', latitude: 8.9981,  longitude: -71.7933 },
  { name: 'Villa del Rosario',        state: 'Zulia', metro: 'Perijá', latitude: 10.3256, longitude: -72.3147 },

  // ============================================================
  // LARA
  // ============================================================
  { name: 'Barquisimeto',             state: 'Lara', metro: 'Barquisimeto', latitude: 10.0678, longitude: -69.3471 },
  { name: 'Cabudare',                 state: 'Lara', metro: 'Barquisimeto', latitude: 10.0281, longitude: -69.2631 },
  { name: 'El Tocuyo',                state: 'Lara', metro: 'El Tocuyo', latitude: 9.7931,  longitude: -69.7903 },
  { name: 'Quíbor',                   state: 'Lara', metro: 'Quíbor', latitude: 9.9214,  longitude: -69.6189 },
  { name: 'Carora',                   state: 'Lara', metro: 'Carora', latitude: 10.1731, longitude: -70.0828 },

  // ============================================================
  // YARACUY
  // ============================================================
  { name: 'San Felipe',               state: 'Yaracuy', metro: 'San Felipe', latitude: 10.3399, longitude: -68.7400 },
  { name: 'Yaritagua',                state: 'Yaracuy', metro: 'Yaritagua', latitude: 10.0789, longitude: -69.1264 },
  { name: 'Chivacoa',                 state: 'Yaracuy', metro: 'Chivacoa', latitude: 10.1633, longitude: -68.8928 },
  { name: 'Nirgua',                   state: 'Yaracuy', metro: 'Nirgua', latitude: 10.1489, longitude: -68.5664 },

  // ============================================================
  // FALCÓN
  // ============================================================
  { name: 'Coro',                     state: 'Falcón', metro: 'Coro', latitude: 11.4045, longitude: -69.6735 },
  { name: 'Punto Fijo',               state: 'Falcón', metro: 'Punto Fijo', latitude: 11.6936, longitude: -70.1972 },
  { name: 'Puerto Cabello de Falcón', state: 'Falcón', metro: 'Puerto Cabello de Falcón', latitude: 11.4833, longitude: -69.2167 },
  { name: 'Tucacas',                  state: 'Falcón', metro: 'Tucacas', latitude: 10.7928, longitude: -68.3247 },
  { name: 'Dabajuro',                 state: 'Falcón', metro: 'Dabajuro', latitude: 11.0194, longitude: -70.6803 },

  // ============================================================
  // PORTUGUESA
  // ============================================================
  { name: 'Guanare',                  state: 'Portuguesa', metro: 'Guanare', latitude: 9.0431, longitude: -69.7483 },
  { name: 'Acarigua',                 state: 'Portuguesa', metro: 'Acarigua', latitude: 9.5539, longitude: -69.2019 },
  { name: 'Araure',                   state: 'Portuguesa', metro: 'Acarigua', latitude: 9.5811, longitude: -69.2264 },
  { name: 'Píritu',                   state: 'Portuguesa', metro: 'Píritu', latitude: 9.3667, longitude: -69.2000 },

  // ============================================================
  // COJEDES
  // ============================================================
  { name: 'San Carlos',               state: 'Cojedes', metro: 'San Carlos', latitude: 9.6611, longitude: -68.5850 },
  { name: 'Tinaquillo',               state: 'Cojedes', metro: 'Tinaquillo', latitude: 9.9181, longitude: -68.3047 },

  // ============================================================
  // GUÁRICO
  // ============================================================
  { name: 'San Juan de los Morros',   state: 'Guárico', metro: 'San Juan de los Morros', latitude: 9.9114, longitude: -67.3581 },
  { name: 'Calabozo',                 state: 'Guárico', metro: 'Calabozo', latitude: 8.9242, longitude: -67.4278 },
  { name: 'Valle de la Pascua',       state: 'Guárico', metro: 'Valle de la Pascua', latitude: 9.2156, longitude: -66.0072 },
  { name: 'Zaraza',                   state: 'Guárico', metro: 'Zaraza', latitude: 9.3508, longitude: -65.3256 },

  // ============================================================
  // BARINAS
  // ============================================================
  { name: 'Barinas',                  state: 'Barinas', metro: 'Barinas', latitude: 8.6226, longitude: -70.2075 },
  { name: 'Sabaneta',                 state: 'Barinas', metro: 'Sabaneta', latitude: 8.7500, longitude: -69.9167 },
  { name: 'Santa Bárbara de Barinas', state: 'Barinas', metro: 'Sur de Barinas', latitude: 7.8167, longitude: -71.1833 },

  // ============================================================
  // APURE
  // ============================================================
  { name: 'San Fernando de Apure',    state: 'Apure', metro: 'San Fernando de Apure', latitude: 7.8872, longitude: -67.4722 },
  { name: 'Guasdualito',              state: 'Apure', metro: 'Guasdualito', latitude: 7.2458, longitude: -70.7325 },
  { name: 'Puerto Páez',              state: 'Apure', metro: 'Puerto Páez', latitude: 6.2167, longitude: -67.4667 },

  // ============================================================
  // TÁCHIRA
  // ============================================================
  { name: 'San Cristóbal',            state: 'Táchira', metro: 'San Cristóbal', latitude: 7.7669, longitude: -72.2250 },
  { name: 'Táriba',                   state: 'Táchira', metro: 'San Cristóbal', latitude: 7.8256, longitude: -72.2344 },
  { name: 'La Grita',                 state: 'Táchira', metro: 'La Grita', latitude: 8.1372, longitude: -71.9844 },
  { name: 'Rubio',                    state: 'Táchira', metro: 'Rubio', latitude: 7.7000, longitude: -72.3500 },

  // ============================================================
  // MÉRIDA
  // ============================================================
  { name: 'Mérida',                   state: 'Mérida', metro: 'Mérida', latitude: 8.5897, longitude: -71.1561 },
  { name: 'Ejido',                    state: 'Mérida', metro: 'Mérida', latitude: 8.5483, longitude: -71.2406 },
  { name: 'El Vigía',                 state: 'Mérida', metro: 'El Vigía', latitude: 8.6128, longitude: -71.6500 },
  { name: 'Tovar',                    state: 'Mérida', metro: 'Tovar', latitude: 8.3333, longitude: -71.7500 },

  // ============================================================
  // TRUJILLO
  // ============================================================
  { name: 'Trujillo',                 state: 'Trujillo', metro: 'Trujillo', latitude: 9.3658, longitude: -70.4364 },
  { name: 'Valera',                   state: 'Trujillo', metro: 'Valera', latitude: 9.3186, longitude: -70.6067 },
  { name: 'Boconó',                   state: 'Trujillo', metro: 'Boconó', latitude: 9.2436, longitude: -70.2622 },

  // ============================================================
  // ANZOÁTEGUI
  // ============================================================
  { name: 'Barcelona',                state: 'Anzoátegui', metro: 'Puerto La Cruz', latitude: 10.1333, longitude: -64.6833 },
  { name: 'Puerto La Cruz',           state: 'Anzoátegui', metro: 'Puerto La Cruz', latitude: 10.2138, longitude: -64.6333 },
  { name: 'Lechería',                 state: 'Anzoátegui', metro: 'Puerto La Cruz', latitude: 10.1953, longitude: -64.6864 },
  { name: 'El Tigre',                 state: 'Anzoátegui', metro: 'El Tigre', latitude: 8.8886,  longitude: -64.2497 },
  { name: 'Anaco',                    state: 'Anzoátegui', metro: 'Anaco', latitude: 9.4294,  longitude: -64.4728 },

  // ============================================================
  // SUCRE
  // ============================================================
  { name: 'Cumaná',                   state: 'Sucre', metro: 'Cumaná', latitude: 10.4538, longitude: -64.1781 },
  { name: 'Carúpano',                 state: 'Sucre', metro: 'Carúpano', latitude: 10.6678, longitude: -63.2411 },
  { name: 'Güiria',                   state: 'Sucre', metro: 'Güiria', latitude: 10.5786, longitude: -62.2972 },

  // ============================================================
  // NUEVA ESPARTA
  // ============================================================
  { name: 'La Asunción',              state: 'Nueva Esparta', metro: 'Margarita', latitude: 11.0333, longitude: -63.8667 },
  { name: 'Porlamar',                 state: 'Nueva Esparta', metro: 'Margarita', latitude: 10.9572, longitude: -63.8497 },
  { name: 'Pampatar',                 state: 'Nueva Esparta', metro: 'Margarita', latitude: 11.0014, longitude: -63.7931 },

  // ============================================================
  // MONAGAS
  // ============================================================
  { name: 'Maturín',                  state: 'Monagas', metro: 'Maturín', latitude: 9.7457, longitude: -63.1832 },
  { name: 'Punta de Mata',            state: 'Monagas', metro: 'Punta de Mata', latitude: 9.6833, longitude: -63.6167 },

  // ============================================================
  // DELTA AMACURO
  // ============================================================
  { name: 'Tucupita',                 state: 'Delta Amacuro', metro: 'Tucupita', latitude: 9.0586, longitude: -62.0503 },

  // ============================================================
  // BOLÍVAR
  // ============================================================
  { name: 'Ciudad Bolívar',           state: 'Bolívar', metro: 'Ciudad Bolívar', latitude: 8.1222,  longitude: -63.5497 },
  { name: 'Ciudad Guayana',           state: 'Bolívar', metro: 'Ciudad Guayana', latitude: 8.3533,  longitude: -62.6528 },
  { name: 'Puerto Ordaz',             state: 'Bolívar', metro: 'Ciudad Guayana', latitude: 8.2914,  longitude: -62.7306 },
  { name: 'San Félix',                state: 'Bolívar', metro: 'Ciudad Guayana', latitude: 8.3500,  longitude: -62.6500 },
  { name: 'Upata',                    state: 'Bolívar', metro: 'Upata', latitude: 8.0158,  longitude: -62.3989 },

  // ============================================================
  // AMAZONAS
  // ============================================================
  { name: 'Puerto Ayacucho',          state: 'Amazonas', metro: 'Puerto Ayacucho', latitude: 5.6631, longitude: -67.6236 },
  { name: 'San Fernando de Atabapo',  state: 'Amazonas', metro: 'San Fernando de Atabapo', latitude: 4.0472, longitude: -67.6992 },

  // ============================================================
  // DEPENDENCIAS FEDERALES
  // ============================================================
  { name: 'Los Roques',               state: 'Dependencias Federales', metro: 'Los Roques', latitude: 11.8500, longitude: -66.7500 },
];

export const DEFAULT_MAX_DISTANCE_KM = 25;