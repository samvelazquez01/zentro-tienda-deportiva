/* ============================================================
   Store - Capa de datos y estado (ZENTRO - Tienda Deportiva)
   ------------------------------------------------------------
   Sincronización Dual Inteligente:
   1. LocalStorage para carga instantánea a 0ms
   2. Firebase Firestore en tiempo real para compartir productos,
      vendedores, WhatsApp y pedidos entre todos los dispositivos
      (computadora, celular del dueño y clientes).
   ============================================================ */

const Store = (() => {
  const KEYS = {
    products: "zentro_products",
    sellers: "zentro_sellers",
    orders: "zentro_orders",
    cart: "zentro_cart",
    favorites: "zentro_favorites",
    settings: "zentro_settings",
    analytics: "zentro_analytics",
    ratings: "zentro_ratings",
    sellerSession: "zentro_seller_session",
    subscriptionPayments: "zentro_subscription_payments",
  };

  const DEFAULT_SETTINGS = {
    storeName: "ZENTRO",
    tagline: "Tienda Deportiva · Calzado Deportivo, Gorras, Ropa y Accesorios Originales",
    mainWhatsApp: "18090000000",
    currency: "$",
    currencyCode: "USD",
    bankDetails: "Banco Popular: Cta. Corriente 798-123456-1\nBanreservas: Cta. Ahorros 240-987654-2\nBHD: Cta. Ahorros 001-234567-8\nA nombre de: ZENTRO S.R.L. (RNC: 132-45678-9)",
    pickupAddress: "Santo Domingo, República Dominicana",
    welcomeMsg: "¡Hola! Quiero hacer el siguiente pedido en ZENTRO:",
    reminderTemplate: "¡Hola [NOMBRE]! Te recordamos desde ZENTRO que el pago de suscripción de tu tienda vence el [FECHA].\n\nTu plan contratado: [PLAN] ([PRECIO]).\n\nPara renovar tu servicio y mantener visibles tus artículos en el catálogo público, realiza tu pago a nuestras cuentas bancarias:\n\n[CUENTAS]\n\nFavor enviar comprobante por este chat. ¡Muchas gracias!",
  };

  const DEFAULT_SELLERS = [
    {
      id: "v1",
      name: "Zentro Principal",
      username: "zentro",
      password: "123",
      phone: "18090000000",
      province: "Santo Domingo",
      productLimit: 15,
      planName: "Plan Premium (15 productos)",
      monthlyFee: 2000,
      planRenewalDate: "2026-12-31",
      status: "active",
      rating: 4.9,
      ratingCount: 15,
      notes: "Vendedor principal / Dueño de la tienda",
      active: true,
      createdAt: "2024-01-01",
    },
    {
      id: "v2",
      name: "Carlos Sneakers Santiago",
      username: "carlos",
      password: "123",
      phone: "18291112222",
      province: "Santiago",
      productLimit: 10,
      planName: "Plan Estándar (10 productos)",
      monthlyFee: 1500,
      planRenewalDate: "2026-11-20",
      status: "active",
      rating: 4.8,
      ratingCount: 8,
      notes: "Especialista en tenis Kobe, Jordan y LeBron",
      active: true,
      createdAt: "2024-02-01",
    },
  ];

  // Persistencia local
  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn("Error leyendo de localStorage", key, e);
      return fallback;
    }
  };

  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("Error guardando en localStorage", key, e);
    }
  };

  // Inicialización local de arranque
  const seed = () => {
    if (!localStorage.getItem(KEYS.settings)) {
      write(KEYS.settings, DEFAULT_SETTINGS);
    }
    const currentSellers = read(KEYS.sellers, null);
    if (!currentSellers || !Array.isArray(currentSellers) || !currentSellers.length) {
      write(KEYS.sellers, DEFAULT_SELLERS);
    } else {
      // Normalizar vendedores existentes para asegurar todos los nuevos campos requeridos
      const normalizedSellers = currentSellers.map((s, idx) => ({
        id: s.id || `v${idx + 1}`,
        name: s.name || `Vendedor ${idx + 1}`,
        username: s.username || (s.id ? `vendedor_${s.id}` : `vendedor_${idx + 1}`),
        password: s.password || "123",
        phone: (s.phone || "18090000000").replace(/[^0-9]/g, ""),
        province: s.province || (idx % 2 === 0 ? "Santo Domingo" : "Santiago"),
        productLimit: Number(s.productLimit) || 10,
        planName: s.planName || "Plan Estándar (10 productos)",
        monthlyFee: Number(s.monthlyFee) || 1500,
        planRenewalDate: s.planRenewalDate || "2026-12-31",
        status: s.status || "active",
        rating: Number(s.rating) || 4.9,
        ratingCount: Number(s.ratingCount) || 5,
        notes: s.notes || "",
        active: s.status !== "suspended",
        createdAt: s.createdAt || "2024-01-01",
      }));
      write(KEYS.sellers, normalizedSellers);
    }

    const stored = read(KEYS.products, null);
    if (!stored || !Array.isArray(stored) || !stored.length) {
      const seeded = PRODUCTS.map((p, idx) => ({
        ...p,
        sellerId: idx % 2 === 0 ? "v1" : "v2",
        costPrice: Number(p.costPrice || (p.price * 0.65).toFixed(2)),
        isFeatured: idx === 0, // Primer producto destacado por defecto
        reported: false,
        status: "active",
      }));
      write(KEYS.products, seeded);
    }

    // Inicializar analíticas reales en CERO (sin datos simulados)
    const currentAnalytics = read(KEYS.analytics, null);
    if (!currentAnalytics || currentAnalytics.pageViews >= 500) {
      write(KEYS.analytics, {
        pageViews: 0,
        uniqueVisitors: 0,
        whatsappClicksTotal: 0,
        whatsappClicksBySeller: {},
        whatsappClicksByProduct: {},
        favoritesTotal: 0,
        productFavorites: {},
        dailyViews: {},
      });
    }

    // Inicializar calificaciones si no existen
    if (!localStorage.getItem(KEYS.ratings)) {
      write(KEYS.ratings, [
        {
          id: "rat-1",
          orderId: "ORD-1001",
          sellerId: "v1",
          customerName: "Juan Pérez",
          stars: 5,
          comment: "Excelente servicio, el tenis Kobe llegó original y rápido a Santo Domingo.",
          date: "2024-06-10",
        },
        {
          id: "rat-2",
          orderId: "ORD-1002",
          sellerId: "v2",
          customerName: "Marcos Díaz",
          stars: 5,
          comment: "100% confiable, entrega en persona en Santiago. Muy atento por WhatsApp.",
          date: "2024-06-12",
        },
      ]);
    }
  };

  /* ---------------- EVENTOS ---------------- */
  const listeners = new Set();
  const subscribe = (fn) => listeners.add(fn);
  const emit = () => listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error("Error en suscriptor de Store", e);
    }
  });

  /* ---------------- FIRESTORE SYNC EN TIEMPO REAL ---------------- */
  let cloudConnected = false;

  const initFirestoreSync = () => {
    if (typeof window.FIREBASE === "undefined" || !window.FIREBASE.db) {
      // Reintentar en breve si el SDK aún se está cargando
      setTimeout(initFirestoreSync, 600);
      return;
    }

    const db = window.FIREBASE.db;
    cloudConnected = true;
    console.log("🔥 ZENTRO: Conectado a Firebase Firestore en tiempo real");

    // 1. Escuchar Vendedores en la nube
    db.collection("sellers").onSnapshot(
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudSellers = [];
          snapshot.forEach((doc) => {
            const s = doc.data();
            if (s && (s.name || s.id)) cloudSellers.push(s);
          });
          if (cloudSellers.length > 0) {
            write(KEYS.sellers, cloudSellers);
            emit();
          }
        } else {
          // Si la nube está vacía la primera vez, subir los vendedores locales iniciales
          const localSellers = getSellers();
          localSellers.forEach((s) => db.collection("sellers").doc(s.id).set(s).catch(() => {}));
        }
      },
      (err) => console.warn("Firestore sellers aviso (revisa las reglas de seguridad):", err.message)
    );

    // 2. Escuchar Productos en la nube
    db.collection("products").onSnapshot(
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudProducts = [];
          snapshot.forEach((doc) => {
            const p = doc.data();
            if (p && (p.brand || p.model || p.id)) cloudProducts.push(p);
          });
          if (cloudProducts.length > 0) {
            write(KEYS.products, cloudProducts);
            emit();
          }
        } else {
          // Si la nube está vacía la primera vez, subir el catálogo inicial
          const localProducts = getProducts();
          localProducts.forEach((p) => db.collection("products").doc(p.id).set(p).catch(() => {}));
        }
      },
      (err) => console.warn("Firestore products aviso:", err.message)
    );

    // 3. Escuchar Pedidos en la nube
    db.collection("orders").onSnapshot(
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudOrders = [];
          snapshot.forEach((doc) => cloudOrders.push(doc.data()));
          // Ordenar por fecha más reciente
          cloudOrders.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
          write(KEYS.orders, cloudOrders);
          emit();
        }
      },
      (err) => console.warn("Firestore orders aviso:", err.message)
    );

    // 4. Escuchar Seguridad y PIN Maestro en la nube (Sincronizado entre todos los dispositivos)
    db.collection("settings").doc("security").onSnapshot(
      (doc) => {
        if (doc.exists) {
          const sec = doc.data();
          if (sec && sec.masterPin) {
            localStorage.setItem("zentro_master_pin", String(sec.masterPin).trim());
            if (sec.isCustomized) {
              localStorage.setItem("zentro_master_pin_customized", "true");
            }
            emit();
          }
        } else {
          // Crear documento inicial en Firebase con 2601
          db.collection("settings").doc("security").set({
            masterPin: "2601",
            isCustomized: false,
            updatedAt: new Date().toISOString()
          }).catch(() => {});
        }
      },
      (err) => console.warn("Firestore security aviso:", err.message)
    );

    // 5. Escuchar Pagos de Membresías en la nube
    db.collection("subscription_payments").onSnapshot(
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudPayments = [];
          snapshot.forEach((doc) => cloudPayments.push(doc.data()));
          cloudPayments.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
          write(KEYS.subscriptionPayments, cloudPayments);
          emit();
        }
      },
      (err) => console.warn("Firestore subscription_payments aviso:", err.message)
    );
  };

  /* Función para forzar subida y sincronización de todo a Firebase */
  const syncAllToFirebase = async () => {
    if (!window.FIREBASE || !window.FIREBASE.db) {
      throw new Error("Firebase aún no está listo. Asegúrate de tener conexión a internet y las reglas en 'if true'.");
    }
    const db = window.FIREBASE.db;
    const prods = getProducts();
    const slls = getSellers();
    const ords = getOrders();
    const stt = getSettings();

    for (const p of prods) {
      await db.collection("products").doc(p.id).set(p);
    }
    for (const s of slls) {
      await db.collection("sellers").doc(s.id).set(s);
    }
    for (const o of ords) {
      await db.collection("orders").doc(o.id).set(o);
    }
    await db.collection("settings").doc("main").set(stt);
    await db.collection("settings").doc("security").set({
      masterPin: getMasterPin(),
      isCustomized: isMasterPinCustomized(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return { products: prods.length, sellers: slls.length, orders: ords.length };
  };

  /* ---------------- VENDEDORES ---------------- */
  const getSellers = () => {
    const list = read(KEYS.sellers, null);
    if (!list || !Array.isArray(list) || list.length === 0) {
      write(KEYS.sellers, DEFAULT_SELLERS);
      return DEFAULT_SELLERS;
    }
    return list;
  };

  const getSeller = (id) => {
    const sellers = getSellers();
    const found = sellers.find((s) => s.id === id);
    if (found) return found;
    if (sellers.length > 0) return sellers[0];
    return DEFAULT_SELLERS[0] || {
      id: "v1",
      name: "Zentro Principal",
      username: "zentro",
      phone: "18090000000",
      province: "Santo Domingo",
      productLimit: 15,
      planName: "Plan 15 Artículos",
      monthlyFee: 2000,
      status: "active",
    };
  };

  const saveSeller = (seller) => {
    const sellers = getSellers();
    const cleanPhone = (seller.phone || "").replace(/[^0-9]/g, "");
    const toSave = {
      ...seller,
      phone: cleanPhone,
      id: seller.id || "v" + Date.now(),
      username: (seller.username || "").trim().toLowerCase() || `vendedor_${Date.now()}`,
      password: seller.password || "123",
      province: (seller.province || "Santo Domingo").trim(),
      productLimit: Number(seller.productLimit) || 10,
      planName: seller.planName || `Plan ${Number(seller.productLimit) || 10} Productos`,
      monthlyFee: Number(seller.monthlyFee) || 1500,
      planRenewalDate: seller.planRenewalDate || "2026-12-31",
      status: seller.status || "active",
      rating: Number(seller.rating) || 5.0,
      ratingCount: Number(seller.ratingCount) || 0,
      notes: seller.notes || "",
      active: seller.status !== "suspended",
      createdAt: seller.createdAt || new Date().toISOString().slice(0, 10),
    };

    const idx = sellers.findIndex((s) => s.id === toSave.id);
    if (idx >= 0) sellers[idx] = toSave;
    else sellers.push(toSave);

    write(KEYS.sellers, sellers);
    emit();

    // Sincronizar a la nube de Firestore
    if (window.FIREBASE && window.FIREBASE.db) {
      window.FIREBASE.db.collection("sellers").doc(toSave.id).set(toSave).catch((e) => console.warn("Error nube seller:", e));
    }

    return toSave;
  };

  const deleteSeller = (id) => {
    const sellers = getSellers();
    if (sellers.length <= 1) {
      alert("Debe existir al menos un vendedor activo en la tienda.");
      return false;
    }
    const filtered = sellers.filter((s) => s.id !== id);
    write(KEYS.sellers, filtered);
    emit();

    // Eliminar de la nube de Firestore
    if (window.FIREBASE && window.FIREBASE.db) {
      window.FIREBASE.db.collection("sellers").doc(id).delete().catch((e) => console.warn("Error borrar nube seller:", e));
    }

    return true;
  };

  // Autenticación de vendedores (Local + Nube Firestore)
  const authenticateSeller = (username, password) => {
    const sellers = getSellers();
    const u = (username || "").trim().toLowerCase();
    const p = String(password || "").trim();
    const seller = sellers.find(
      (s) =>
        ((s.username && s.username.toLowerCase() === u) || s.phone === u) &&
        String(s.password || "123") === p
    );
    return seller || null;
  };

  const authenticateSellerAsync = async (username, password) => {
    // 1. Probar en memoria/local primero
    const local = authenticateSeller(username, password);
    if (local) return local;

    // 2. Si no coincide, consultar Firestore en la nube directamente para verificar credenciales desde cualquier dispositivo
    if (window.FIREBASE && window.FIREBASE.db) {
      try {
        const u = (username || "").trim().toLowerCase();
        const p = String(password || "").trim();
        const snapshot = await window.FIREBASE.db.collection("sellers").get();
        if (!snapshot.empty) {
          const cloudSellers = [];
          let matched = null;
          snapshot.forEach((doc) => {
            const s = doc.data();
            cloudSellers.push(s);
            if (
              ((s.username && s.username.toLowerCase() === u) || s.phone === u) &&
              String(s.password || "123") === p
            ) {
              matched = s;
            }
          });
          write(KEYS.sellers, cloudSellers);
          emit();
          return matched;
        }
      } catch (err) {
        console.warn("Error autenticando vendedor en Firestore:", err);
      }
    }
    return null;
  };

  /* ---------------- SEGURIDAD Y PIN MAESTRO DEL DUEÑO (EN FIREBASE) ---------------- */
  const getMasterPin = () => {
    return localStorage.getItem("zentro_master_pin") || "2601";
  };

  const isMasterPinCustomized = () => {
    return localStorage.getItem("zentro_master_pin_customized") === "true";
  };

  const setMasterPin = async (newPin) => {
    const clean = String(newPin || "2601").trim();
    localStorage.setItem("zentro_master_pin", clean);
    localStorage.setItem("zentro_master_pin_customized", "true");
    emit();

    // Guardar en Firebase Firestore en la nube para sincronizar con todos los dispositivos
    if (window.FIREBASE && window.FIREBASE.db) {
      try {
        await window.FIREBASE.db.collection("settings").doc("security").set({
          masterPin: clean,
          isCustomized: true,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (err) {
        console.warn("Aviso al guardar PIN maestro en Firebase:", err);
      }
    }
    return clean;
  };

  const validateMasterPin = (enteredPin) => {
    const entered = String(enteredPin || "").trim();
    if (!entered) return false;
    const current = getMasterPin();
    // 2601 y 1234 son contraseñas maestras garantizadas para que nunca se bloquee el admin
    if (entered === "2601" || entered === "1234" || entered === current) return true;
    return false;
  };

  const validateMasterPinAsync = async (enteredPin) => {
    const entered = String(enteredPin || "").trim();
    if (!entered) return false;

    // Validación rápida local
    if (validateMasterPin(entered)) return true;

    // Verificar en tiempo real contra Firebase Firestore en la nube
    if (window.FIREBASE && window.FIREBASE.db) {
      try {
        const doc = await window.FIREBASE.db.collection("settings").doc("security").get();
        if (doc.exists) {
          const data = doc.data();
          const cloudPin = data?.masterPin;
          if (data?.isCustomized) {
            localStorage.setItem("zentro_master_pin_customized", "true");
          }
          if (cloudPin && entered === String(cloudPin).trim()) {
            localStorage.setItem("zentro_master_pin", String(cloudPin).trim());
            return true;
          }
        }
      } catch (err) {
        console.warn("Aviso al verificar PIN en Firebase:", err);
      }
    }
    return false;
  };

  const getCurrentSeller = () => {
    return read(KEYS.sellerSession, null);
  };

  const setCurrentSeller = (seller) => {
    if (seller) {
      write(KEYS.sellerSession, {
        id: seller.id,
        name: seller.name,
        username: seller.username,
        province: seller.province,
        phone: seller.phone,
      });
    } else {
      localStorage.removeItem(KEYS.sellerSession);
    }
    emit();
  };

  const logoutSeller = () => {
    localStorage.removeItem(KEYS.sellerSession);
    emit();
  };

  // Cuota y límite de productos por vendedor
  const getSellerProductQuota = (sellerId) => {
    const seller = getSeller(sellerId);
    const limit = Number(seller?.productLimit) || 10;
    // Solo cuentan productos activos (los vendidos liberan cupo para otro artículo del mes)
    const activeProducts = getProducts().filter(
      (p) => p.sellerId === sellerId && p.status !== "sold"
    );
    const count = activeProducts.length;
    const remaining = Math.max(0, limit - count);
    const canAdd = count < limit;

    return {
      limit,
      count,
      remaining,
      canAdd,
      activeProducts,
      planName: seller?.planName || `Plan ${limit} Tenis`,
    };
  };

  /* ---------------- CONFIGURACIÓN GENERAL ---------------- */
  const getSettings = () => {
    const saved = read(KEYS.settings, DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...saved };
  };

  const saveSettings = (newSettings) => {
    const updated = { ...getSettings(), ...newSettings };
    write(KEYS.settings, updated);
    emit();
    return updated;
  };

  /* ---------------- PRODUCTOS ---------------- */
  const getProducts = () => {
    let prods = read(KEYS.products, null);
    if (!prods || !Array.isArray(prods) || prods.length === 0) {
      if (typeof PRODUCTS !== "undefined" && Array.isArray(PRODUCTS) && PRODUCTS.length > 0) {
        prods = PRODUCTS.map((p, idx) => ({
          ...p,
          sellerId: p.sellerId || (idx % 2 === 0 ? "v1" : "v2"),
          costPrice: Number(p.costPrice || (p.price * 0.65).toFixed(2)),
          isFeatured: idx === 0,
          reported: false,
          status: "active",
        }));
        write(KEYS.products, prods);
      } else {
        prods = [];
      }
    }
    return prods;
  };

  // Catálogo que ven los clientes:
  // 1. Oculta tenis de vendedores suspendidos / dados de baja
  // 2. Oculta tenis con reporte de infracción de política
  // 3. Oculta tenis agotados (stock <= 0) o marcados como vendidos
  // 4. Prioriza tenis 'isFeatured' (destacados pagados)
  // 5. Exposición equilibrada (round-robin) para los demás productos
  const getPublicProducts = () => {
    const all = getProducts();
    const sellers = getSellers();
    const suspendedSellerIds = new Set(
      sellers.filter((s) => s.status === "suspended" || s.active === false).map((s) => s.id)
    );

    // Filtrar válidos
    const eligible = all.filter((p) => {
      // Ocultar solo si el vendedor asignado está explícitamente suspendido
      if (p.sellerId && suspendedSellerIds.has(p.sellerId)) return false;
      if (p.reported) return false;
      if (p.status === "sold") return false;
      if (Number(p.stock) <= 0) return false;
      return true;
    });

    // Separar destacados y no destacados
    const featured = eligible.filter((p) => p.isFeatured);
    const regular = eligible.filter((p) => !p.isFeatured);

    // Exposición equilibrada: Agrupar regulares por vendedor e intercalar equitativamente
    const bySeller = {};
    regular.forEach((p) => {
      const sid = p.sellerId || "default";
      if (!bySeller[sid]) bySeller[sid] = [];
      bySeller[sid].push(p);
    });

    const balancedRegular = [];
    let hasMore = true;
    let round = 0;
    const sellerKeys = Object.keys(bySeller);

    while (hasMore) {
      hasMore = false;
      sellerKeys.forEach((sid) => {
        if (round < bySeller[sid].length) {
          balancedRegular.push(bySeller[sid][round]);
          hasMore = true;
        }
      });
      round++;
    }

    return [...featured, ...balancedRegular];
  };

  const getProduct = (id) => getProducts().find((p) => p.id === id);

  const saveProduct = (product) => {
    const products = getProducts();
    const clean = {
      ...product,
      price: Number(product.price) || 0,
      costPrice: Number(product.costPrice) || 0,
      stock: Number(product.stock) || 0,
      sellerId: product.sellerId || "v1",
      isFeatured: Boolean(product.isFeatured),
      reported: Boolean(product.reported),
      status: product.status || "active",
      // Máximo 3 imágenes por tenis
      images: Array.isArray(product.images) ? product.images.slice(0, 3) : [],
    };
    const idx = products.findIndex((p) => p.id === clean.id);
    if (idx >= 0) {
      products[idx] = { ...products[idx], ...clean };
    } else {
      products.unshift(clean);
    }
    write(KEYS.products, products);
    emit();

    // Sincronizar producto a Firestore en la nube
    if (window.FIREBASE && window.FIREBASE.db) {
      window.FIREBASE.db.collection("products").doc(clean.id).set(clean).catch((e) => console.warn("Error nube producto:", e));
    }

    return clean;
  };

  const deleteProduct = (id) => {
    const filtered = getProducts().filter((p) => p.id !== id);
    write(KEYS.products, filtered);
    emit();

    // Eliminar de Firestore
    if (window.FIREBASE && window.FIREBASE.db) {
      window.FIREBASE.db.collection("products").doc(id).delete().catch((e) => console.warn("Error nube borrar producto:", e));
    }
  };

  // Marcar producto como Vendido (libera cupo del plan para subir otro este mes)
  const markProductAsSold = (id) => {
    const products = getProducts();
    const p = products.find((prod) => prod.id === id);
    if (!p) return false;

    p.status = "sold";
    p.stock = 0;
    p.soldAt = new Date().toISOString();

    write(KEYS.products, products);
    emit();

    if (window.FIREBASE && window.FIREBASE.db) {
      window.FIREBASE.db.collection("products").doc(id).update({
        status: "sold",
        stock: 0,
        soldAt: p.soldAt,
      }).catch(() => {});
    }

    return true;
  };

  // Reportar producto que no cumple con las políticas de la empresa (lo oculta de la tienda)
  const reportProduct = (id, reason) => {
    const products = getProducts();
    const p = products.find((prod) => prod.id === id);
    if (!p) return false;

    p.reported = true;
    p.reportReason = reason || "Infracción de políticas de calidad ZENTRO";
    p.reportedAt = new Date().toISOString();

    write(KEYS.products, products);
    emit();

    if (window.FIREBASE && window.FIREBASE.db) {
      window.FIREBASE.db.collection("products").doc(id).update({
        reported: true,
        reportReason: p.reportReason,
        reportedAt: p.reportedAt,
      }).catch(() => {});
    }

    return true;
  };

  // Quitar reporte de producto
  const unreportProduct = (id) => {
    const products = getProducts();
    const p = products.find((prod) => prod.id === id);
    if (!p) return false;

    p.reported = false;
    delete p.reportReason;

    write(KEYS.products, products);
    emit();

    if (window.FIREBASE && window.FIREBASE.db) {
      window.FIREBASE.db.collection("products").doc(id).update({
        reported: false,
        reportReason: firebase.firestore.FieldValue.delete(),
      }).catch(() => {});
    }

    return true;
  };

  // Alternar producto destacado (VIP)
  const toggleProductFeatured = (id) => {
    const products = getProducts();
    const p = products.find((prod) => prod.id === id);
    if (!p) return false;

    p.isFeatured = !p.isFeatured;
    write(KEYS.products, products);
    emit();

    if (window.FIREBASE && window.FIREBASE.db) {
      window.FIREBASE.db.collection("products").doc(id).update({
        isFeatured: p.isFeatured,
      }).catch(() => {});
    }

    return p.isFeatured;
  };

  const resetProductsToDefault = () => {
    const seeded = PRODUCTS.map((p, idx) => ({
      ...p,
      sellerId: idx % 2 === 0 ? "v1" : "v2",
      costPrice: Number(p.costPrice || (p.price * 0.65).toFixed(2)),
    }));
    write(KEYS.products, seeded);
    emit();

    if (window.FIREBASE && window.FIREBASE.db) {
      seeded.forEach((p) => window.FIREBASE.db.collection("products").doc(p.id).set(p).catch(() => {}));
    }
  };

  /* ---------------- PEDIDOS & INVENTARIO AUTOMÁTICO ---------------- */
  const getOrders = () => read(KEYS.orders, []);

  const saveOrder = (order) => {
    const orders = getOrders();
    const newOrder = {
      id: order.id || "ORD-" + Math.floor(1000 + Math.random() * 9000),
      createdAt: new Date().toISOString(),
      dateFormatted: new Date().toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "Pendiente",
      stockDeducted: false,
      ...order,
    };
    orders.unshift(newOrder);
    write(KEYS.orders, orders);
    emit();

    // Guardar pedido en Firestore
    if (window.FIREBASE && window.FIREBASE.db) {
      window.FIREBASE.db.collection("orders").doc(newOrder.id).set(newOrder).catch((e) => console.warn("Error nube pedido:", e));
    }

    return newOrder;
  };

  const applyStockDeduction = (order, deduct = true) => {
    if (!order.items || !Array.isArray(order.items)) return;
    const products = getProducts();

    order.items.forEach((item) => {
      const p = products.find((prod) => prod.id === item.id);
      if (p) {
        const qty = Number(item.qty) || 1;
        if (deduct) {
          p.stock = Math.max(0, Number(p.stock) - qty);
        } else {
          p.stock = Number(p.stock) + qty;
        }

        // Actualizar stock en la nube
        if (window.FIREBASE && window.FIREBASE.db) {
          window.FIREBASE.db.collection("products").doc(p.id).update({ stock: p.stock }).catch(() => {});
        }
      }
    });

    write(KEYS.products, products);
  };

  const updateOrderStatus = (orderId, newStatus) => {
    const orders = getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    order.status = newStatus;

    if ((newStatus === "Entregado" || newStatus === "Pagado") && !order.stockDeducted) {
      applyStockDeduction(order, true);
      order.stockDeducted = true;
    } else if (newStatus === "Cancelado" && order.stockDeducted) {
      applyStockDeduction(order, false);
      order.stockDeducted = false;
    }

    write(KEYS.orders, orders);
    emit();

    // Actualizar estado en Firestore
    if (window.FIREBASE && window.FIREBASE.db) {
      window.FIREBASE.db.collection("orders").doc(orderId).update({
        status: newStatus,
        stockDeducted: order.stockDeducted,
      }).catch((e) => console.warn("Error actualizar estado nube:", e));
    }
  };

  const deleteOrder = (orderId) => {
    const orders = getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (order && order.stockDeducted) {
      applyStockDeduction(order, false);
    }
    const filtered = orders.filter((o) => o.id !== orderId);
    write(KEYS.orders, filtered);
    emit();

    if (window.FIREBASE && window.FIREBASE.db) {
      window.FIREBASE.db.collection("orders").doc(orderId).delete().catch(() => {});
    }
  };

  /* ---------------- FINANZAS Y GANANCIAS ---------------- */
  const getFinances = () => {
    const orders = getOrders();
    const products = getProducts();
    const sellers = getSellers();

    const completedOrders = orders.filter(
      (o) => o.status === "Pagado" || o.status === "Entregado"
    );

    let totalRevenue = 0;
    let totalCost = 0;
    let totalUnitsSold = 0;

    const sellerStats = {};
    sellers.forEach((s) => {
      sellerStats[s.id] = {
        sellerId: s.id,
        sellerName: s.name,
        phone: s.phone,
        unitsSold: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        activeStockUnits: 0,
        activeStockValue: 0,
      };
    });

    products.forEach((p) => {
      const sid = p.sellerId || "v1";
      if (!sellerStats[sid]) {
        sellerStats[sid] = {
          sellerId: sid,
          sellerName: "Vendedor " + sid,
          phone: "",
          unitsSold: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          activeStockUnits: 0,
          activeStockValue: 0,
        };
      }
      const stock = Number(p.stock) || 0;
      sellerStats[sid].activeStockUnits += stock;
      sellerStats[sid].activeStockValue += stock * (Number(p.price) || 0);
    });

    completedOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const prod = products.find((p) => p.id === item.id) || {};
        const costPrice = Number(item.costPrice !== undefined ? item.costPrice : prod.costPrice || 0);
        const sellPrice = Number(item.price || prod.price || 0);
        const qty = Number(item.qty) || 1;

        const lineRevenue = sellPrice * qty;
        const lineCost = costPrice * qty;
        const sid = item.sellerId || prod.sellerId || "v1";

        totalRevenue += lineRevenue;
        totalCost += lineCost;
        totalUnitsSold += qty;

        if (sellerStats[sid]) {
          sellerStats[sid].unitsSold += qty;
          sellerStats[sid].revenue += lineRevenue;
          sellerStats[sid].cost += lineCost;
          sellerStats[sid].profit += (lineRevenue - lineCost);
        }
      });
    });

    const netProfit = totalRevenue - totalCost;
    const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      netProfit,
      marginPercent,
      totalUnitsSold,
      completedOrdersCount: completedOrders.length,
      sellersSummary: Object.values(sellerStats),
    };
  };

  /* ---------------- FINANZAS DEL ADMINISTRADOR (MEMBRESÍAS DE VENDEDORES) ---------------- */
  const getSubscriptionPayments = () => read(KEYS.subscriptionPayments, []);

  const recordSellerPlanPayment = (sellerId, customAmount = null) => {
    const seller = getSeller(sellerId);
    if (!seller) return null;

    const amount = customAmount !== null ? Number(customAmount) : (Number(seller.monthlyFee) || 1500);

    // Calcular nueva fecha de vencimiento (+30 días)
    const currentRenewal = seller.planRenewalDate ? new Date(seller.planRenewalDate) : new Date();
    const now = new Date();
    const baseDate = (!isNaN(currentRenewal.getTime()) && currentRenewal > now) ? currentRenewal : now;
    baseDate.setDate(baseDate.getDate() + 30);
    const newRenewalDate = baseDate.toISOString().slice(0, 10);

    // Reactivar tienda si estaba suspendida
    seller.planRenewalDate = newRenewalDate;
    seller.status = "active";
    seller.active = true;
    saveSeller(seller);

    // Guardar pago en historial
    const payments = getSubscriptionPayments();
    const payment = {
      id: "sub_pay_" + Date.now(),
      sellerId: seller.id,
      sellerName: seller.name,
      planName: seller.planName || `Plan ${seller.productLimit || 10} Artículos`,
      amount: amount,
      date: new Date().toISOString().slice(0, 10),
      timestamp: new Date().toISOString(),
      renewalDate: newRenewalDate,
    };
    payments.unshift(payment);
    write(KEYS.subscriptionPayments, payments);
    emit();

    if (window.FIREBASE && window.FIREBASE.db) {
      window.FIREBASE.db.collection("subscription_payments").doc(payment.id).set(payment).catch(() => {});
    }

    return { seller, payment };
  };

  const getAdminFinances = () => {
    const payments = getSubscriptionPayments();
    const sellers = getSellers();
    const products = getProducts();

    const totalCollected = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const activeSellers = sellers.filter((s) => s.status !== "suspended");
    const projectedMonthly = sellers.reduce((sum, s) => sum + (Number(s.monthlyFee) || 1500), 0);

    return {
      totalCollected,
      activeSellersCount: activeSellers.length,
      totalSellersCount: sellers.length,
      projectedMonthly,
      totalProductsCount: products.length,
      paymentsHistory: payments,
    };
  };

  /* ---------------- FINANZAS DEL VENDEDOR (SUS ARTÍCULOS) ---------------- */
  const getSellerFinances = (sellerId) => {
    const products = getProducts().filter((p) => p.sellerId === sellerId);
    const soldProducts = products.filter((p) => p.status === "sold");

    let totalSales = 0;
    let totalCost = 0;
    let soldUnits = 0;

    soldProducts.forEach((p) => {
      const sell = Number(p.price) || 0;
      const cost = Number(p.costPrice) || 0;
      totalSales += sell;
      totalCost += cost;
      soldUnits += 1;
    });

    // Añadir pedidos WhatsApp entregados o pagados
    const orders = getOrders().filter((o) => o.sellerId === sellerId && (o.status === "Pagado" || o.status === "Entregado"));
    orders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const sell = Number(it.price) || 0;
        const cost = Number(it.costPrice) || (sell * 0.65);
        const qty = Number(it.qty) || 1;
        totalSales += sell * qty;
        totalCost += cost * qty;
        soldUnits += qty;
      });
    });

    const netProfit = totalSales - totalCost;
    const marginPercent = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    return {
      sellerId,
      totalSales,
      totalCost,
      netProfit,
      marginPercent,
      soldUnits,
      soldProducts,
    };
  };

  /* ---------------- REINICIAR ANALÍTICAS A CERO ---------------- */
  const resetAnalytics = () => {
    const clean = {
      pageViews: 0,
      uniqueVisitors: 0,
      whatsappClicksTotal: 0,
      whatsappClicksBySeller: {},
      whatsappClicksByProduct: {},
      favoritesTotal: 0,
      productFavorites: {},
      dailyViews: {},
    };
    write(KEYS.analytics, clean);
    if (window.FIREBASE && window.FIREBASE.db) {
      window.FIREBASE.db.collection("analytics").doc("overview").set(clean).catch(() => {});
    }
    emit();
    return clean;
  };

  /* ---------------- CARRITO ---------------- */
  const getCart = () => read(KEYS.cart, []);

  const addToCart = (id, size, qty = 1) => {
    const cart = getCart();
    const line = cart.find((c) => c.id === id && c.size === size);
    if (line) {
      line.qty += qty;
    } else {
      cart.push({ id, size: size || null, qty: Math.max(1, qty) });
    }
    write(KEYS.cart, cart);
    emit();
  };

  const updateCartQty = (index, qty) => {
    const cart = getCart();
    if (!cart[index]) return;
    if (qty <= 0) {
      cart.splice(index, 1);
    } else {
      cart[index].qty = qty;
    }
    write(KEYS.cart, cart);
    emit();
  };

  const removeFromCart = (index) => {
    const cart = getCart();
    cart.splice(index, 1);
    write(KEYS.cart, cart);
    emit();
  };

  const clearCart = () => {
    write(KEYS.cart, []);
    emit();
  };

  const cartCount = () => getCart().reduce((n, c) => n + c.qty, 0);

  const cartTotal = () =>
    getCart().reduce((sum, c) => {
      const p = getProduct(c.id);
      return sum + (p ? p.price * c.qty : 0);
    }, 0);

  /* ---------------- FAVORITOS ---------------- */
  const getFavorites = () => read(KEYS.favorites, []);

  const isFavorite = (id) => getFavorites().includes(id);

  const toggleFavorite = (id) => {
    const favs = getFavorites();
    const i = favs.indexOf(id);
    if (i >= 0) favs.splice(i, 1);
    else favs.push(id);
    write(KEYS.favorites, favs);
    emit();
    return favs.includes(id);
  };

  /* ---------------- ANALÍTICAS Y FLUJO DE TIENDA ---------------- */
  const getAnalytics = () => {
    return read(KEYS.analytics, {
      pageViews: 0,
      uniqueVisitors: 0,
      whatsappClicksTotal: 0,
      whatsappClicksBySeller: {},
      whatsappClicksByProduct: {},
      favoritesTotal: 0,
      productFavorites: {},
      dailyViews: {},
    });
  };

  const recordPageView = () => {
    const data = getAnalytics();
    data.pageViews = (data.pageViews || 0) + 1;

    // Conteo diario
    const today = new Date().toISOString().slice(0, 10);
    data.dailyViews = data.dailyViews || {};
    data.dailyViews[today] = (data.dailyViews[today] || 0) + 1;

    // Visitante único por sesión
    if (!sessionStorage.getItem("zentro_visit_counted")) {
      data.uniqueVisitors = (data.uniqueVisitors || 0) + 1;
      sessionStorage.setItem("zentro_visit_counted", "1");
    }

    write(KEYS.analytics, data);

    // Google Analytics Event (si gtag existe)
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_title: document.title,
        page_location: window.location.href,
      });
    }

    // Sincronizar analítica a Firestore en la nube
    if (window.FIREBASE && window.FIREBASE.db) {
      window.FIREBASE.db.collection("analytics").doc("overview").set(data, { merge: true }).catch(() => {});
    }
  };

  const recordWhatsAppClick = (sellerId, productId = null) => {
    const data = getAnalytics();
    data.whatsappClicksTotal = (data.whatsappClicksTotal || 0) + 1;

    if (sellerId) {
      data.whatsappClicksBySeller = data.whatsappClicksBySeller || {};
      data.whatsappClicksBySeller[sellerId] = (data.whatsappClicksBySeller[sellerId] || 0) + 1;
    }

    if (productId) {
      data.whatsappClicksByProduct = data.whatsappClicksByProduct || {};
      data.whatsappClicksByProduct[productId] = (data.whatsappClicksByProduct[productId] || 0) + 1;
    }

    write(KEYS.analytics, data);

    // Google Analytics Event
    if (typeof window.gtag === "function") {
      window.gtag("event", "whatsapp_contact", {
        seller_id: sellerId,
        product_id: productId,
      });
    }

    if (window.FIREBASE && window.FIREBASE.db) {
      window.FIREBASE.db.collection("analytics").doc("overview").set(data, { merge: true }).catch(() => {});
    }
  };

  const recordFavoriteClick = (productId, isFav) => {
    const data = getAnalytics();
    if (isFav) {
      data.favoritesTotal = (data.favoritesTotal || 0) + 1;
      if (productId) {
        data.productFavorites = data.productFavorites || {};
        data.productFavorites[productId] = (data.productFavorites[productId] || 0) + 1;
      }
    }
    write(KEYS.analytics, data);

    if (typeof window.gtag === "function" && isFav) {
      window.gtag("event", "add_to_wishlist", {
        product_id: productId,
      });
    }
  };

  /* ---------------- CALIFICACIONES VERIFICADAS DE VENDEDOR ---------------- */
  const getRatings = (sellerId = null) => {
    const all = read(KEYS.ratings, []);
    if (!sellerId) return all;
    return all.filter((r) => r.sellerId === sellerId);
  };

  const submitVerifiedRating = ({ orderId, sellerId, customerName, stars, comment }) => {
    const orders = getOrders();
    const cleanOrderId = (orderId || "").trim().toUpperCase();

    // Verificación estricta anti-sesgo / anti-competencia:
    // Debe existir un pedido con ese código en el sistema
    const validOrder = orders.find((o) => o.id.toUpperCase() === cleanOrderId);
    if (!validOrder) {
      return {
        success: false,
        message: `El código de pedido '${cleanOrderId}' no existe. Para calificar debes haber realizado un pedido por WhatsApp en la tienda.`,
      };
    }

    // Evitar calificaciones duplicadas para el mismo pedido
    const ratings = getRatings();
    const alreadyRated = ratings.find((r) => r.orderId.toUpperCase() === cleanOrderId);
    if (alreadyRated) {
      return {
        success: false,
        message: "Este pedido ya ha sido calificado anteriormente. ¡Gracias por tu opinión!",
      };
    }

    const newRating = {
      id: "rat-" + Date.now(),
      orderId: cleanOrderId,
      sellerId: sellerId || validOrder.sellerId || "v1",
      customerName: customerName || validOrder.customer || "Cliente Verificado",
      stars: Math.max(1, Math.min(5, Number(stars) || 5)),
      comment: (comment || "").trim(),
      date: new Date().toISOString().slice(0, 10),
      verified: true,
    };

    ratings.unshift(newRating);
    write(KEYS.ratings, ratings);

    // Recalcular promedio de estrellas del vendedor
    const sellerRatings = ratings.filter((r) => r.sellerId === newRating.sellerId);
    const avg =
      sellerRatings.reduce((sum, r) => sum + r.stars, 0) / sellerRatings.length;

    const sellers = getSellers();
    const seller = sellers.find((s) => s.id === newRating.sellerId);
    if (seller) {
      seller.rating = Number(avg.toFixed(1));
      seller.ratingCount = sellerRatings.length;
      saveSeller(seller);
    }

    emit();

    // Sincronizar calificación a Firestore
    if (window.FIREBASE && window.FIREBASE.db) {
      window.FIREBASE.db.collection("ratings").doc(newRating.id).set(newRating).catch(() => {});
    }

    return {
      success: true,
      rating: newRating,
      average: avg.toFixed(1),
      message: "¡Calificación verificada registrada exitosamente!",
    };
  };

  /* ---------------- COPIA DE SEGURIDAD ---------------- */
  const exportDataJSON = () => {
    const data = {
      version: "2.1-zentro-multivendor",
      exportDate: new Date().toISOString(),
      settings: getSettings(),
      sellers: getSellers(),
      products: getProducts(),
      orders: getOrders(),
      analytics: getAnalytics(),
      ratings: getRatings(),
    };
    return JSON.stringify(data, null, 2);
  };

  const importDataJSON = (jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      if (data.products && Array.isArray(data.products)) {
        write(KEYS.products, data.products);
        if (window.FIREBASE && window.FIREBASE.db) {
          data.products.forEach((p) => window.FIREBASE.db.collection("products").doc(p.id).set(p).catch(() => {}));
        }
      }
      if (data.sellers && Array.isArray(data.sellers)) {
        write(KEYS.sellers, data.sellers);
        if (window.FIREBASE && window.FIREBASE.db) {
          data.sellers.forEach((s) => window.FIREBASE.db.collection("sellers").doc(s.id).set(s).catch(() => {}));
        }
      }
      if (data.settings && typeof data.settings === "object") {
        write(KEYS.settings, data.settings);
      }
      if (data.orders && Array.isArray(data.orders)) {
        write(KEYS.orders, data.orders);
      }
      if (data.analytics && typeof data.analytics === "object") {
        write(KEYS.analytics, data.analytics);
      }
      if (data.ratings && Array.isArray(data.ratings)) {
        write(KEYS.ratings, data.ratings);
      }
      emit();
      return true;
    } catch (e) {
      console.error("Error importando datos:", e);
      return false;
    }
  };

  // Inicializar local
  seed();

  // Iniciar sincronización con Firestore en segundo plano
  setTimeout(initFirestoreSync, 300);

  return {
    getSettings,
    saveSettings,
    getSellers,
    getSeller,
    saveSeller,
    deleteSeller,
    authenticateSeller,
    authenticateSellerAsync,
    getMasterPin,
    isMasterPinCustomized,
    setMasterPin,
    validateMasterPin,
    validateMasterPinAsync,
    getCurrentSeller,
    setCurrentSeller,
    logoutSeller,
    getSellerProductQuota,
    getProducts,
    getPublicProducts,
    getProduct,
    saveProduct,
    deleteProduct,
    markProductAsSold,
    reportProduct,
    unreportProduct,
    toggleProductFeatured,
    resetProductsToDefault,
    getOrders,
    saveOrder,
    updateOrderStatus,
    deleteOrder,
    getFinances,
    getAdminFinances,
    getSellerFinances,
    recordSellerPlanPayment,
    getSubscriptionPayments,
    getCart,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    cartCount,
    cartTotal,
    getFavorites,
    isFavorite,
    toggleFavorite,
    getAnalytics,
    resetAnalytics,
    recordPageView,
    recordWhatsAppClick,
    recordFavoriteClick,
    getRatings,
    submitVerifiedRating,
    exportDataJSON,
    importDataJSON,
    syncAllToFirebase,
    subscribe,
  };
})();

if (typeof window !== "undefined") {
  window.Store = Store;
}
