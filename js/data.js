/* ============================================================
   Datos de la tienda (Catálogo inicial ZENTRO)
   ------------------------------------------------------------
   Especialidad: Tenis de Baloncesto, Calzado Deportivo,
   Ropa Deportiva, Gorras y Accesorios.
   Incluye:
   - sellerId (vendedor asignado)
   - costPrice (precio de compra)
   - price (precio de venta)
   - stock (control de existencias)
   ============================================================ */

// Categorías del catálogo
const CATEGORIES = [
  "Todos",
  "Baloncesto",
  "Tenis Deportivo",
  "Ropa Deportiva",
  "Gorras",
  "Accesorios",
];

// Menú lateral
const SIDE_MENU = [
  { label: "Baloncesto", type: "category" },
  { label: "Tenis Deportivo", type: "category" },
  { label: "Ropa Deportiva", type: "category" },
  { label: "Gorras", type: "category" },
  { label: "Accesorios", type: "category" },
  { label: "Marcas", type: "brands" },
  { label: "Contacto", type: "page" },
  { label: "Sobre nosotros", type: "page" },
  { label: "Políticas de envío", type: "page" },
  { label: "Términos y condiciones", type: "page" },
];

/* Catálogo de productos inicial */
const PRODUCTS = [
  {
    id: "p1",
    brand: "Nike",
    model: "Kobe 6 Protro 'Reverse Grinch'",
    category: "Baloncesto",
    sport: "Baloncesto",
    sellerId: "v1",
    costPrice: 140.00,
    price: 219.99,
    sizes: ["8", "8.5", "9", "9.5", "10", "10.5", "11", "12"],
    condition: "Nuevo",
    color: "Rojo / Verde Neón",
    gender: "Unisex",
    stock: 5,
    popularity: 99,
    createdAt: "2024-06-15",
    accent: "#b91c1c",
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80"
    ],
    views: ["Frente", "Lateral"],
    description:
      "Una de las siluetas más codiciadas en la historia del baloncesto. Las Kobe 6 Protro combinan una amortiguación Zoom Turbo ultrarreactiva con un perfil bajo y patrón de tracción en escamas de serpiente tipo Mamba para cambios de dirección letales.",
    features: [
      "Amortiguación Zoom Air Turbo",
      "Upper texturizado de microescamas Mamba",
      "Tracción multidireccional de élite",
      "Soporte de talón moldeado en fibra de carbono"
    ],
  },
  {
    id: "p2",
    brand: "Jordan",
    model: "Air Jordan 4 Retro 'Bred Reimagined'",
    category: "Baloncesto",
    sport: "Baloncesto",
    sellerId: "v2",
    costPrice: 165.00,
    price: 249.99,
    sizes: ["8", "8.5", "9", "10", "10.5", "11", "12"],
    condition: "Nuevo",
    color: "Negro / Rojo Fuego",
    gender: "Hombre",
    stock: 4,
    popularity: 98,
    createdAt: "2024-06-14",
    accent: "#171717",
    images: [
      "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80"
    ],
    views: ["Lateral", "Frente"],
    description:
      "La icónica combinación Black Cement de 1989 reinventada con piel prémium suave y acabados originales Nike Air en el talón. Calidad excepcional para lucir tanto dentro de la duela como en la calle.",
    features: [
      "Piel genuina premium tratada",
      "Cápsula Air-Sole visible en el talón",
      "Malla lateral transpirable clásica",
      "Logotipo 'Nike Air' fiel al molde original"
    ],
  },
  {
    id: "p3",
    brand: "Nike",
    model: "LeBron 21 'Akoya'",
    category: "Baloncesto",
    sport: "Baloncesto",
    sellerId: "v2",
    costPrice: 130.00,
    price: 199.99,
    sizes: ["8.5", "9", "10", "10.5", "11", "11.5", "12"],
    condition: "Nuevo",
    color: "Blanco Perla / Naranja",
    gender: "Hombre",
    stock: 7,
    popularity: 94,
    createdAt: "2024-06-10",
    accent: "#f5f5f4",
    images: [
      "https://images.unsplash.com/photo-1607522370275-f14206abe5d3?auto=format&fit=crop&w=800&q=80"
    ],
    views: ["Frente"],
    description:
      "Inspiradas en la estructura protectora de las ostras, las LeBron 21 ofrecen un sistema de cables zonales 360 grados y doble unidad Zoom Air para absorber los impactos de jugadores potentes.",
    features: [
      "Unidad Zoom Air en talón y antepié",
      "Sistema de sujeción por cable reforzado",
      "Placa de estabilidad en mediopié",
      "Material exterior ultraligero y resistente"
    ],
  },
  {
    id: "p4",
    brand: "Jordan",
    model: "Air Jordan 1 High OG 'Lost & Found'",
    category: "Baloncesto",
    sport: "Baloncesto",
    sellerId: "v1",
    costPrice: 150.00,
    price: 229.99,
    sizes: ["7.5", "8", "8.5", "9", "9.5", "10", "11"],
    condition: "Nuevo",
    color: "Chicago Rojo / Blanco / Negro",
    gender: "Unisex",
    stock: 3,
    popularity: 97,
    createdAt: "2024-06-08",
    accent: "#991b1b",
    images: [
      "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&w=800&q=80"
    ],
    views: ["Frente", "Lateral"],
    description:
      "El legendario diseño con el que Michael Jordan cambió el juego para siempre. Estilo retro vintage de los años 80 con cuero agrietado prémium y cuello acolchado.",
    features: [
      "Cuero natural de alta densidad",
      "Amortiguación Air encapsulada",
      "Suela de caucho macizo de alto agarre",
      "Caja y recibo retro coleccionable"
    ],
  },
  {
    id: "p5",
    brand: "Puma",
    model: "MB.03 LaMelo Ball 'Toxic'",
    category: "Baloncesto",
    sport: "Baloncesto",
    sellerId: "v2",
    costPrice: 90.00,
    price: 139.99,
    sizes: ["8", "8.5", "9", "10", "11"],
    condition: "Nuevo",
    color: "Verde Neón / Rosa",
    gender: "Hombre",
    stock: 6,
    popularity: 91,
    createdAt: "2024-06-02",
    accent: "#15803d",
    images: [
      "https://images.unsplash.com/photo-1579338559194-a162d19bf842?auto=format&fit=crop&w=800&q=80"
    ],
    views: ["Frente"],
    description:
      "El calzado insignia de LaMelo Ball. Diseño de otro planeta con cortes de garras alienígenas e inyección de espuma NITRO para saltos explosivos y aterrizajes suaves.",
    features: [
      "Espuma NITRO infundida de nitrógeno",
      "Tracción agresiva envolvente en laterales",
      "Parte superior de malla multicapa transpirable"
    ],
  },
  {
    id: "p6",
    brand: "Nike",
    model: "Air Zoom Pegasus 40",
    category: "Tenis Deportivo",
    sport: "Running",
    sellerId: "v1",
    costPrice: 85.00,
    price: 129.99,
    sizes: ["7", "8", "8.5", "9", "9.5", "10", "11", "12"],
    condition: "Nuevo",
    color: "Negro / Blanco",
    gender: "Unisex",
    stock: 14,
    popularity: 88,
    createdAt: "2024-05-28",
    accent: "#262626",
    images: [
      "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80"
    ],
    views: ["Lateral"],
    description:
      "El caballo de batalla con alas. Amortiguación elástica con espuma Nike React combinada con dos unidades Zoom Air para un despegue enérgico en entrenamientos y carreras.",
    features: [
      "Tecnología Nike React ultra elástica",
      "Unidad Zoom Air en antepié y talón",
      "Malla de ingeniería transpirable optimizada"
    ],
  },
  {
    id: "p7",
    brand: "Adidas",
    model: "Ultraboost Light Sport",
    category: "Tenis Deportivo",
    sport: "Running",
    sellerId: "v1",
    costPrice: 110.00,
    price: 174.99,
    sizes: ["7.5", "8", "8.5", "9", "10", "10.5", "11"],
    condition: "Nuevo",
    color: "Gris / Coral",
    gender: "Unisex",
    stock: 8,
    popularity: 86,
    createdAt: "2024-05-20",
    accent: "#404040",
    images: [
      "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?auto=format&fit=crop&w=800&q=80"
    ],
    views: ["Frente"],
    description:
      "La amortiguación BOOST más ligera creada por Adidas. Retorno continuo de energía en cada kilómetro con tejido Primeknit que se adapta como un guante a tu pie.",
    features: [
      "Suela BOOST Light 30% más ligera",
      "Tejido Primeknit+ reciclado de alto rendimiento",
      "Suela Continental Rubber con agarre sobre asfalto mojado"
    ],
  },
  {
    id: "p8",
    brand: "New Era",
    model: "Gorra 59FIFTY Chicago Bulls NBA",
    category: "Gorras",
    sport: "Baloncesto",
    sellerId: "v2",
    costPrice: 22.00,
    price: 38.99,
    sizes: ["7 1/8", "7 1/4", "7 3/8", "7 1/2", "7 5/8"],
    condition: "Nuevo",
    color: "Negro / Rojo",
    gender: "Unisex",
    stock: 18,
    popularity: 95,
    createdAt: "2024-06-05",
    accent: "#171717",
    images: [
      "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=800&q=80"
    ],
    views: ["Frente"],
    description:
      "La gorra ajustada por excelencia de las grandes ligas. Logotipo de los Chicago Bulls bordado en 3D en la corona frontal y pin oficial NBA en la parte trasera.",
    features: [
      "Bordado frontal en alto relieve 3D",
      "Visera plana estructurada",
      "Licencia oficial NBA & New Era"
    ],
  },
  {
    id: "p9",
    brand: "Jordan",
    model: "Gorra Jordan Pro Jumpman Snapback",
    category: "Gorras",
    sport: "Baloncesto",
    sellerId: "v1",
    costPrice: 18.00,
    price: 32.99,
    sizes: ["Ajustable"],
    condition: "Nuevo",
    color: "Rojo / Negro",
    gender: "Unisex",
    stock: 22,
    popularity: 92,
    createdAt: "2024-06-04",
    accent: "#b91c1c",
    images: [
      "https://images.unsplash.com/photo-1575428652377-a2d80e2277fc?auto=format&fit=crop&w=800&q=80"
    ],
    views: ["Frente"],
    description:
      "Gorra snapback clásica con el icónico logo Jumpman bordado en el panel frontal. Cierre a presión trasero que garantiza un ajuste perfecto en cualquier ocasión.",
    features: [
      "Cierre tipo snapback ajustable",
      "Corona estructurada de 6 paneles",
      "Banda interior suave que absorbe el sudor"
    ],
  },
  {
    id: "p10",
    brand: "Nike",
    model: "Camiseta Dri-FIT Basketball Elite",
    category: "Ropa Deportiva",
    sport: "Baloncesto",
    sellerId: "v1",
    costPrice: 19.00,
    price: 34.99,
    sizes: ["S", "M", "L", "XL", "2XL"],
    condition: "Nuevo",
    color: "Negro / Oro",
    gender: "Hombre",
    stock: 25,
    popularity: 82,
    createdAt: "2024-05-15",
    accent: "#18181b",
    images: [
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80"
    ],
    views: ["Frente"],
    description:
      "Camiseta técnica de calentamiento y juego con tecnología Dri-FIT para mantenerte fresco y seco cuando sube la intensidad del partido.",
    features: [
      "Tecnología Nike Dri-FIT antitranspirante",
      "Tejido suave de secado rápido"
    ],
  },
  {
    id: "p11",
    brand: "Nike",
    model: "Medias Nike Elite Basketball Crew (Pack 3)",
    category: "Accesorios",
    sport: "Baloncesto",
    sellerId: "v2",
    costPrice: 12.00,
    price: 24.99,
    sizes: ["M (6-8 US)", "L (8-12 US)", "XL (12-15 US)"],
    condition: "Nuevo",
    color: "Blanco / Negro",
    gender: "Unisex",
    stock: 40,
    popularity: 96,
    createdAt: "2024-06-01",
    accent: "#e5e5e5",
    images: [
      "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?auto=format&fit=crop&w=800&q=80"
    ],
    views: ["Frente"],
    description:
      "Las medias de baloncesto más utilizadas por jugadores profesionales. Acolchado específico en las zonas de mayor impacto (talón y metatarso) y sujeción en el arco.",
    features: [
      "Amortiguación zonal de alta densidad",
      "Compresión anatómica izquierda/derecha",
      "Tejido Dri-FIT que mantiene los pies frescos"
    ],
  }
];
