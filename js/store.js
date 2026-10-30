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
  };

  const DEFAULT_SETTINGS = {
    storeName: "ZENTRO",
    tagline: "Tienda Deportiva · Tenis de Baloncesto, Gorras y Ropa Original",
    mainWhatsApp: "18090000000",
    currency: "$",
    currencyCode: "USD",
    bankDetails: "Banco Popular / BHD / Banreservas\nCuenta: 123-456789-0\nA nombre de: Zentro Store",
    pickupAddress: "Santo Domingo, República Dominicana",
    welcomeMsg: "¡Hola! Quiero hacer el siguiente pedido en ZENTRO:",
  };

  const DEFAULT_SELLERS = [
    {
      id: "v1",
      name: "Zentro Principal",
      phone: "18090000000",
      notes: "Vendedor principal / Dueño de la tienda",
      active: true,
      createdAt: "2024-01-01",
    },
    {
      id: "v2",
      name: "Vendedor Baloncesto",
      phone: "18291112222",
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
    if (!localStorage.getItem(KEYS.sellers)) {
      write(KEYS.sellers, DEFAULT_SELLERS);
    }
    const stored = read(KEYS.products, null);
    if (!stored || !Array.isArray(stored) || !stored.length) {
      const seeded = PRODUCTS.map((p, idx) => ({
        ...p,
        sellerId: idx % 2 === 0 ? "v1" : "v2",
        costPrice: Number(p.costPrice || (p.price * 0.65).toFixed(2)),
      }));
      write(KEYS.products, seeded);
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
          snapshot.forEach((doc) => cloudSellers.push(doc.data()));
          write(KEYS.sellers, cloudSellers);
          emit();
        } else {
          // Si la nube está vacía la primera vez, subir los vendedores locales iniciales
          const localSellers = read(KEYS.sellers, DEFAULT_SELLERS);
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
          snapshot.forEach((doc) => cloudProducts.push(doc.data()));
          write(KEYS.products, cloudProducts);
          emit();
        } else {
          // Si la nube está vacía la primera vez, subir el catálogo inicial
          const localProducts = read(KEYS.products, PRODUCTS);
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

    return { products: prods.length, sellers: slls.length, orders: ords.length };
  };

  /* ---------------- VENDEDORES ---------------- */
  const getSellers = () => read(KEYS.sellers, DEFAULT_SELLERS);

  const getSeller = (id) => getSellers().find((s) => s.id === id) || getSellers()[0];

  const saveSeller = (seller) => {
    const sellers = getSellers();
    const cleanPhone = (seller.phone || "").replace(/[^0-9]/g, "");
    const toSave = {
      ...seller,
      phone: cleanPhone,
      id: seller.id || "v" + Date.now(),
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
  const getProducts = () => read(KEYS.products, PRODUCTS);

  // Catálogo que ven los clientes: SOLO tenis con stock mayor a 0
  const getPublicProducts = () => {
    return getProducts().filter((p) => Number(p.stock) > 0);
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

  /* ---------------- COPIA DE SEGURIDAD ---------------- */
  const exportDataJSON = () => {
    const data = {
      version: "2.0-zentro-cloud",
      exportDate: new Date().toISOString(),
      settings: getSettings(),
      sellers: getSellers(),
      products: getProducts(),
      orders: getOrders(),
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
    getProducts,
    getPublicProducts,
    getProduct,
    saveProduct,
    deleteProduct,
    resetProductsToDefault,
    getOrders,
    saveOrder,
    updateOrderStatus,
    deleteOrder,
    getFinances,
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
    exportDataJSON,
    importDataJSON,
    syncAllToFirebase,
    subscribe,
  };
})();
