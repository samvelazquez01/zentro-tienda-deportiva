/* ============================================================
   App - Lógica de la tienda ZENTRO (Tienda Deportiva)
   ------------------------------------------------------------
   Orquesta:
   1. Catálogo público (SOLO muestra productos con stock > 0)
   2. Asignación de Vendedor dinámico por cada tenis (WhatsApp directo)
   3. Carrito y Checkout multi-vendedor
   4. Búsqueda y Filtros deportivos
   ============================================================ */

(() => {
  "use strict";

  /* ---------- Estado de la interfaz ---------- */
  const state = {
    category: "Todos",
    query: "",
    view: "home",
    filters: {
      brand: "",
      condition: "",
      color: "",
      gender: "",
      sport: "",
      size: "",
      province: "",
      sellerId: "",
      min: "",
      max: "",
      sort: "recientes",
    },
    checkout: {
      delivery: "Envío a domicilio",
      payment: "Transferencia / Depósito bancario",
      directProduct: null,
      targetSeller: null,
    },
  };

  /* ---------- Helpers de DOM ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const getCurrencySymbol = () => Store.getSettings().currency || "$";
  const money = (n) => getCurrencySymbol() + Number(n).toFixed(2);

  /* ---------- Imagen de Producto (Soporte URLs reales + SVG fallback) ---------- */
  const productImage = (p, i = 0) => {
    if (p.images && p.images.length > 0) {
      return p.images[i] || p.images[0];
    }
    const label = (p.views && p.views[i]) || (p.views && p.views[0]) || p.model || "";
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
        <rect width="600" height="600" fill="${p.accent || "#161616"}"/>
        <g fill="none" stroke="rgba(255,85,0,.25)" stroke-width="2">
          <circle cx="300" cy="270" r="150"/>
          <circle cx="300" cy="270" r="100"/>
        </g>
        <text x="300" y="255" text-anchor="middle" fill="#ffffff" font-family="Inter,sans-serif" font-size="30" font-weight="900" font-style="italic" letter-spacing="3">${(p.brand || "ZENTRO").toUpperCase()}</text>
        <text x="300" y="300" text-anchor="middle" fill="#ffffff" font-family="Inter,sans-serif" font-size="20" font-weight="600" opacity=".72">${p.model || ""}</text>
        <text x="300" y="500" text-anchor="middle" fill="#ff5500" font-family="Inter,sans-serif" font-size="15" font-weight="800" letter-spacing="3">${String(label).toUpperCase()}</text>
      </svg>`;
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg.trim());
  };

  /* ---------- Iconos SVG reutilizables ---------- */
  const ICON = {
    heart:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.5 4.04 3 5.5l7 7Z"/></svg>',
    share:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>',
    check:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    empty:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>',
    wa:
      '<svg viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.05 7.42C8.86 7.42 8.56 7.49 8.31 7.76C8.06 8.04 7.34 8.71 7.34 10.07C7.34 11.43 8.33 12.75 8.47 12.94C8.61 13.12 10.42 15.92 13.18 17.11C13.84 17.4 14.35 17.57 14.75 17.7C15.41 17.91 16.02 17.88 16.5 17.81C17.03 17.73 18.14 17.14 18.37 16.49C18.6 15.84 18.6 15.29 18.53 15.17C18.46 15.05 18.27 14.99 17.99 14.85C17.71 14.71 16.34 14.04 16.09 13.95C15.84 13.86 15.65 13.81 15.46 14.09C15.27 14.37 14.74 14.99 14.58 15.17C14.42 15.36 14.26 15.38 13.98 15.24C13.7 15.1 12.8 14.81 11.74 13.86C10.91 13.12 10.35 12.21 10.21 11.93C10.07 11.65 10.2 11.5 10.34 11.36C10.46 11.24 10.61 11.04 10.75 10.88C10.89 10.72 10.94 10.6 11.03 10.42C11.12 10.24 11.07 10.07 11.01 9.93C10.94 9.79 10.39 8.44 10.15 7.89C9.93 7.35 9.7 7.42 9.53 7.41C9.37 7.41 9.21 7.42 9.05 7.42Z"/></svg>',
  };

  /* ============================================================
     RENDER: categorías y menú lateral
     ============================================================ */
  const renderCategories = () => {
    $("#categories").innerHTML = CATEGORIES.map(
      (c) =>
        `<button class="chip ${c === state.category ? "active" : ""}" data-cat="${c}">${c}</button>`
    ).join("");
  };

  const PAGE_TEXTS = {
    Contacto:
      "Atención directa por WhatsApp con nuestros vendedores autorizados. Consulta disponibilidad de tallas, reservas y entregas inmediatas.",
    "Sobre nosotros":
      "ZENTRO es tu tienda especializada en tenis de baloncesto de élite, zapatillas deportivas de alto rendimiento, gorras originales y prendas atléticas.",
    "Políticas de envío":
      "Coordinación personalizada por WhatsApp. Despachos rápidos y seguros a todo el país previa transferencia o acuerdo de entrega.",
    "Términos y condiciones":
      "Todos los artículos son 100% originales. La garantía cubre autenticidad y cambios por talla sujetos a existencias.",
  };

  const renderSideMenu = () => {
    $("#side-menu-list").innerHTML = SIDE_MENU.map((item) => {
      return `<li><a href="#" data-menu-type="${item.type}" data-menu-label="${item.label}">${item.label}</a></li>`;
    }).join("");
  };

  /* ============================================================
     FILTRADO + BÚSQUEDA (Solo muestra productos con stock > 0)
     ============================================================ */
  const matchesSearch = (p, q) => {
    if (!q) return true;
    const haystack = [
      p.brand,
      p.model,
      p.category,
      p.sport,
      p.color,
      p.condition,
      p.gender,
      ...(p.sizes || []),
      String(p.price),
    ]
      .join(" ")
      .toLowerCase();
    return q
      .toLowerCase()
      .split(/\s+/)
      .every((term) => haystack.includes(term));
  };

  const getFiltered = () => {
    const f = state.filters;
    // REGLA CLAVE: Solo productos válidos en existencia (stock > 0, de vendedores activos no suspendidos)
    let list = Store.getPublicProducts().filter((p) => {
      const seller = Store.getSeller(p.sellerId);
      if (state.category !== "Todos" && p.category !== state.category) return false;
      if (!matchesSearch(p, state.query)) return false;
      if (f.brand && p.brand !== f.brand) return false;
      if (f.condition && p.condition !== f.condition) return false;
      if (f.color && p.color !== f.color) return false;
      if (f.gender && p.gender !== f.gender) return false;
      if (f.sport && p.sport !== f.sport) return false;
      if (f.size && (!p.sizes || !p.sizes.includes(f.size))) return false;
      if (f.province && seller && seller.province !== f.province) return false;
      if (f.sellerId && p.sellerId !== f.sellerId) return false;
      if (f.min !== "" && p.price < Number(f.min)) return false;
      if (f.max !== "" && p.price > Number(f.max)) return false;
      return true;
    });

    switch (f.sort) {
      case "precio-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "precio-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "populares":
        list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        break;
      default:
        // Mantener destacados primero
        list.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
    }
    return list;
  };

  /* ============================================================
     RENDER: Tarjeta de Producto y Catálogo
     ============================================================ */
  const cardHTML = (p) => {
    const fav = Store.isFavorite(p.id);
    const seller = Store.getSeller(p.sellerId);
    const imagesList = p.images && p.images.length > 0 ? p.images : (p.views || ["Frente"]);
    const imgs = imagesList
      .map((_, i) => `<img src="${productImage(p, i)}" alt="${p.brand} ${p.model}" loading="lazy" />`)
      .join("");
    const dots =
      imagesList.length > 1
        ? `<div class="card__dots">${imagesList.map(() => "<i></i>").join("")}</div>`
        : "";
    const sizeDisplay = (p.sizes && p.sizes.length > 0)
      ? `Talla ${p.sizes[0]}${p.sizes.length > 1 ? "+" : ""}`
      : "Disponible";

    const conditionBadge = `<span class="card__tag ${p.condition === "Usado" ? "used" : ""}">${p.condition || "Nuevo"}</span>`;

    return `
      <article class="card">
        <div class="card__media">
          ${conditionBadge}
          <span class="card__badge-sport">${p.category || "Baloncesto"}</span>
          <button class="card__fav ${fav ? "active" : ""}" data-fav="${p.id}" aria-label="Favorito">${ICON.heart}</button>
          <div class="card__track hide-scroll" data-detail="${p.id}">${imgs}</div>
          ${dots}
        </div>
        <div class="card__body">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
            <span class="card__brand">${p.brand}</span>
            <button class="seller-tag" data-view-seller="${seller?.id || "v1"}" style="font-size:10px;cursor:pointer;background:none;border:none;padding:2px 6px">
              📍 ${seller?.province || "RD"} · <b>${seller ? seller.name : "ZENTRO"}</b>
            </button>
          </div>
          <div class="card__model" data-detail="${p.id}">${p.model}</div>
          <div class="card__meta">
            <small>${p.color || ""}</small>
            <small>${sizeDisplay}</small>
            <small style="color:#22c55e">${p.stock} disponibles</small>
          </div>
          <div class="card__foot">
            <span class="card__price">${money(p.price)}</span>
            <div class="card__actions">
              <button class="icon-btn" data-share="${p.id}" aria-label="Compartir">${ICON.share}</button>
              <button class="card__buy" data-add="${p.id}">+ Carrito</button>
            </div>
          </div>
        </div>
      </article>`;
  };

  const renderGrid = () => {
    const list = getFiltered();
    const grid = $("#product-grid");
    $("#grid-title").textContent =
      state.category === "Todos" ? "Todos los productos" : state.category;
    $("#grid-count").textContent = `${list.length} en existencia`;
    grid.innerHTML = list.length
      ? list.map(cardHTML).join("")
      : `<div class="empty" style="grid-column:1/-1">${ICON.empty}<p>No hay artículos disponibles con esos criterios.</p></div>`;
  };

  const renderFavorites = () => {
    const favs = Store.getFavorites().map(Store.getProduct).filter((p) => p && Number(p.stock) > 0);
    $("#favorites-grid").innerHTML = favs.length
      ? favs.map(cardHTML).join("")
      : `<div class="empty" style="grid-column:1/-1">${ICON.heart}<p>Aún no tienes artículos en favoritos.</p></div>`;
  };

  /* ============================================================
     RENDER: Filtros
     ============================================================ */
  const uniqueValues = (key) => [...new Set(Store.getPublicProducts().map((p) => p[key]).filter(Boolean))];
  const allSizes = () => [
    ...new Set(Store.getPublicProducts().flatMap((p) => p.sizes || []).filter(Boolean)),
  ];

  const pillGroup = (label, field, values) => {
    if (!values || !values.length) return "";
    return `
    <div class="filter-group">
      <label>${label}</label>
      <div class="filter-options">
        ${values
          .map(
            (v) =>
              `<button class="filter-pill ${
                state.filters[field] === v ? "active" : ""
              }" data-filter="${field}" data-value="${v}">${v}</button>`
          )
          .join("")}
      </div>
    </div>`;
  };

  const renderFilters = () => {
    const f = state.filters;
    const activeSellers = Store.getSellers().filter((s) => s.status !== "suspended");
    const provinces = [...new Set(activeSellers.map((s) => s.province).filter(Boolean))];

    $("#filters-body").innerHTML = `
      <div class="filter-group">
        <label>Ordenar por</label>
        <select class="filter-select" data-sort>
          <option value="recientes" ${f.sort === "recientes" ? "selected" : ""}>Más recientes</option>
          <option value="precio-asc" ${f.sort === "precio-asc" ? "selected" : ""}>Precio: menor a mayor</option>
          <option value="precio-desc" ${f.sort === "precio-desc" ? "selected" : ""}>Precio: mayor a menor</option>
          <option value="populares" ${f.sort === "populares" ? "selected" : ""}>Más populares</option>
        </select>
      </div>
      <!-- Filtro por Ubicación / Provincia de Vendedores -->
      ${pillGroup("📍 Ubicación / Provincia del Vendedor", "province", provinces)}
      ${pillGroup("Marca", "brand", uniqueValues("brand"))}
      ${pillGroup("Categoría", "category", CATEGORIES.filter((c) => c !== "Todos"))}
      ${pillGroup("Talla", "size", allSizes())}
      ${pillGroup("Estado", "condition", ["Nuevo", "Usado"])}
      ${pillGroup("Color", "color", uniqueValues("color"))}
      ${pillGroup("Deporte", "sport", uniqueValues("sport"))}
      ${pillGroup("Sexo", "gender", ["Unisex", "Hombre", "Mujer"])}
      <div class="filter-group">
        <label>Precio</label>
        <div class="price-row">
          <input type="number" inputmode="numeric" placeholder="Mín" data-price="min" value="${f.min}" />
          <span style="color:var(--text-muted)">—</span>
          <input type="number" inputmode="numeric" placeholder="Máx" data-price="max" value="${f.max}" />
        </div>
      </div>`;
  };

  const activeFilterCount = () => {
    const f = state.filters;
    let n = 0;
    ["brand", "condition", "color", "gender", "sport", "size", "category", "province", "sellerId"].forEach((k) => {
      if (f[k]) n++;
    });
    if (f.min !== "" || f.max !== "") n++;
    return n;
  };

  const updateFilterBadge = () => {
    const n = activeFilterCount();
    $$("[data-filter-badge]").forEach((b) => {
      b.hidden = n === 0;
      b.textContent = n;
    });
  };

  /* ============================================================
     RENDER: Carrito
     ============================================================ */
  const renderCart = () => {
    const cart = Store.getCart();
    const body = $("#cart-body");
    const foot = $("#cart-foot");
    if (!cart.length) {
      body.innerHTML = `<div class="empty">${ICON.empty}<p>Tu carrito está vacío.</p></div>`;
      foot.hidden = true;
      return;
    }
    foot.hidden = false;
    body.innerHTML = cart
      .map((line, i) => {
        const p = Store.getProduct(line.id);
        if (!p) return "";
        const seller = Store.getSeller(p.sellerId);
        return `
          <div class="cart-line">
            <div class="cart-line__img"><img src="${productImage(p)}" alt="${p.model}" /></div>
            <div class="cart-line__info">
              <b>${p.brand} ${p.model}</b>
              <small>${line.size ? "Talla " + line.size : ""} · Vendedor: ${seller.name}</small>
              <div class="qty">
                <button data-qty="${i}" data-delta="-1" aria-label="Menos">−</button>
                <span>${line.qty}</span>
                <button data-qty="${i}" data-delta="1" aria-label="Más">+</button>
              </div>
            </div>
            <div>
              <div class="cart-line__price">${money(p.price * line.qty)}</div>
              <button class="cart-line__remove" data-remove="${i}">Quitar</button>
            </div>
          </div>`;
      })
      .join("");
    $("#cart-total").textContent = money(Store.cartTotal());
  };

  const updateCartBadge = () => {
    const n = Store.cartCount();
    $$("[data-cart-badge]").forEach((b) => {
      b.hidden = n === 0;
      b.textContent = n;
    });
  };

  /* ============================================================
     RENDER: Detalle del Tenis (Con vendedor asignado y reseñas)
     ============================================================ */
  let detailSelectedSize = null;

  const renderDetail = (id) => {
    const p = Store.getProduct(id);
    if (!p) return;
    const seller = Store.getSeller(p.sellerId);
    const sizes = p.sizes && p.sizes.length ? p.sizes : ["Única"];
    detailSelectedSize = sizes[0] || null;
    const imagesList = p.images && p.images.length > 0 ? p.images : (p.views || ["Frente"]);
    const imgs = imagesList
      .map((_, i) => `<img src="${productImage(p, i)}" alt="${p.model}" />`)
      .join("");

    $("#product-detail").innerHTML = `
      <div class="pd-gallery">
        <div class="pd-track hide-scroll">${imgs}</div>
        <button class="card__fav ${Store.isFavorite(p.id) ? "active" : ""}" data-fav="${p.id}" style="top:14px;right:14px" aria-label="Favorito">${ICON.heart}</button>
      </div>
      <div class="pd-info">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <div class="pd-brand">${p.brand}</div>
          <div style="display:flex;align-items:center;gap:6px">
            <span class="badge-whatsapp">${ICON.wa} Vendedor: <b>${seller.name}</b></span>
            <span style="color:#facc15;font-weight:800;font-size:12px">★ ${seller.rating || "5.0"}</span>
          </div>
        </div>
        <h1>${p.model}</h1>
        <div class="card__meta">
          <small>${p.condition || "Nuevo"}</small>
          <small>${p.color || ""}</small>
          <small>${p.category || ""}</small>
          <small style="color:#22c55e">${p.stock > 0 ? p.stock + " en stock" : "Agotado"}</small>
        </div>
        <div class="pd-price">${money(p.price)}</div>

        <!-- Tarjeta de Perfil del Vendedor -->
        <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin:16px 0;display:flex;align-items:center;justify-content:space-between;gap:10px">
          <div>
            <div style="font-size:12px;color:var(--text-muted)">Artículo despachado por:</div>
            <b style="font-size:14px">${seller.name}</b>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">
              📍 <b>${seller.province || "Santo Domingo"}</b> · <span style="color:#facc15;font-weight:700">★ ${seller.rating || "5.0"}</span> (${seller.ratingCount || 0} opiniones verificadas)
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <button class="btn-ghost" data-view-seller="${seller.id}" style="font-size:11px;padding:6px 10px;white-space:nowrap">
              Ver su tienda ↗
            </button>
            <button class="btn-ghost" data-open-rate="${seller.id}" style="font-size:11px;padding:4px 8px;white-space:nowrap;color:#facc15">
              ★ Calificar
            </button>
          </div>
        </div>

        <div class="pd-section-title">Selecciona tu talla</div>
        <div class="pd-sizes" id="pd-sizes">
          ${sizes
            .map(
              (s, i) =>
                `<button class="pd-size ${i === 0 ? "active" : ""}" data-size="${s}">${s}</button>`
            )
            .join("")}
        </div>

        <div class="pd-actions" style="flex-direction:column;gap:10px;margin-top:16px">
          <div style="display:flex;gap:10px;width:100%">
            <button class="btn-accent" style="flex:1" data-add-detail="${p.id}">Añadir al Carrito</button>
            <button class="icon-btn" data-share="${p.id}" style="width:52px;height:52px" aria-label="Compartir">${ICON.share}</button>
          </div>
          <button class="btn-whatsapp" style="width:100%" data-buy-direct-wa="${p.id}">
            ${ICON.wa} Comprar Ahora por WhatsApp (con ${seller.name})
          </button>
        </div>

        <div class="pd-section-title">Descripción</div>
        <p style="color:var(--text-muted);line-height:1.6">${p.description || "Sin descripción."}</p>

        ${
          p.features && p.features.length
            ? `<div class="pd-section-title">Características</div>
               <ul class="pd-features">
                 ${p.features.map((ft) => `<li>${ICON.check}${ft}</li>`).join("")}
               </ul>`
            : ""
        }
      </div>`;
    openPanel("sheet-product");
  };

  /* ============================================================
     RENDER: Perfil y Tienda Completa de un Vendedor
     ============================================================ */
  const renderSellerStore = (sellerId) => {
    const seller = Store.getSeller(sellerId);
    if (!seller) return;

    const allPublic = Store.getPublicProducts();
    const sellerProducts = allPublic.filter((p) => p.sellerId === sellerId);
    const ratings = Store.getRatings(sellerId);

    $("#seller-store-title").textContent = `Tienda: ${seller.name}`;

    $("#seller-store-body").innerHTML = `
      <div style="padding:20px">
        <!-- Encabezado de la tienda -->
        <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:16px;padding:20px;margin-bottom:20px">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
            <div>
              <div style="font-size:11px;font-weight:800;color:var(--accent);text-transform:uppercase;letter-spacing:0.05em">
                VENDEDOR VERIFICADO
              </div>
              <h2 style="font-size:20px;font-weight:900;margin:4px 0 2px">${seller.name}</h2>
              <div style="font-size:13px;color:var(--text-muted)">
                📍 Ubicación: <b>${seller.province || "República Dominicana"}</b> · 💬 WhatsApp: <b>+${seller.phone}</b>
              </div>
            </div>
            <div style="text-align:right">
              <span style="background:rgba(250,204,21,0.15);color:#facc15;border:1px solid rgba(250,204,21,0.3);padding:6px 12px;border-radius:999px;font-size:14px;font-weight:800">
                ★ ${seller.rating || "5.0"} (${ratings.length} opiniones)
              </span>
              <div style="margin-top:8px">
                <button class="btn-ghost" data-open-rate="${seller.id}" style="font-size:11px;padding:4px 8px;color:#facc15">
                  ★ Dejar mi Calificación
                </button>
              </div>
            </div>
          </div>
          ${seller.notes ? `<p style="font-size:13px;color:var(--text-muted);margin-top:12px;line-height:1.5">${seller.notes}</p>` : ""}
        </div>

        <!-- Catálogo del vendedor -->
        <div class="section-head" style="margin-bottom:12px">
          <h3>Tenis disponibles de este vendedor (${sellerProducts.length})</h3>
        </div>
        <div class="grid" id="seller-products-grid">
          ${sellerProducts.length ? sellerProducts.map(cardHTML).join("") : `<div class="empty" style="grid-column:1/-1">${ICON.empty}<p>Este vendedor no tiene artículos disponibles en este momento.</p></div>`}
        </div>

        <!-- Opiniones verificadas -->
        <div class="section-head" style="margin:28px 0 12px">
          <h3>Opiniones Verificadas de Clientes (${ratings.length})</h3>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${ratings.length ? ratings.map((r) => `
            <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:14px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <b>${r.customerName}</b>
                <span style="color:#facc15;font-weight:800;font-size:12px">${"★".repeat(r.stars)}</span>
              </div>
              <p style="margin:4px 0 0;font-size:13px;color:var(--text);line-height:1.5">${r.comment || "Excelente compra."}</p>
              <small style="color:var(--text-muted);font-size:11px;display:block;margin-top:4px">${r.date} · ✓ Pedido verificado #${r.orderId}</small>
            </div>
          `).join("") : `<p style="color:var(--text-muted);font-size:13px">Aún no hay calificaciones para este vendedor.</p>`}
        </div>
      </div>`;

    openPanel("sheet-seller-store");
  };

  /* ============================================================
     CHECKOUT WHATSAPP (Ruteo al WhatsApp del Vendedor)
     ============================================================ */
  const prepareCheckoutSheet = (directItem = null) => {
    state.checkout.directProduct = directItem;
    let itemsToBuy = [];
    let targetSeller = null;

    if (directItem) {
      const prod = Store.getProduct(directItem.id);
      targetSeller = Store.getSeller(prod ? prod.sellerId : "v1");
      itemsToBuy = [
        {
          id: directItem.id,
          brand: directItem.brand,
          model: directItem.model,
          price: directItem.price,
          costPrice: prod ? prod.costPrice : 0,
          size: directItem.size,
          color: directItem.color,
          sellerId: prod ? prod.sellerId : "v1",
          qty: 1,
        },
      ];
    } else {
      const cart = Store.getCart();
      if (!cart.length) {
        toast("Tu carrito está vacío");
        return;
      }
      itemsToBuy = cart.map((line) => {
        const p = Store.getProduct(line.id);
        return {
          id: line.id,
          brand: p ? p.brand : "",
          model: p ? p.model : "Artículo",
          price: p ? p.price : 0,
          costPrice: p ? p.costPrice : 0,
          size: line.size,
          color: p ? p.color : "",
          sellerId: p ? p.sellerId : "v1",
          qty: line.qty,
        };
      });

      // Si todos los productos en el carrito son del mismo vendedor:
      const firstSellerId = itemsToBuy[0]?.sellerId;
      const allSame = itemsToBuy.every((it) => it.sellerId === firstSellerId);
      targetSeller = allSame ? Store.getSeller(firstSellerId) : Store.getSellers()[0];
    }

    state.checkout.targetSeller = targetSeller;
    const total = itemsToBuy.reduce((sum, item) => sum + item.price * item.qty, 0);

    const summaryHTML = `
      <div style="font-weight:700;margin-bottom:8px;font-size:14px;color:var(--text);display:flex;justify-content:space-between">
        <span>Resumen (${itemsToBuy.length} artículos):</span>
        <span class="seller-tag">${targetSeller ? `Vendedor: ${targetSeller.name}` : ""}</span>
      </div>
      ${itemsToBuy
        .map(
          (it) => `
        <div class="checkout-summary-line">
          <span>${it.qty}x ${it.brand} ${it.model} ${it.size ? `(Talla: ${it.size})` : ""}</span>
          <b>${money(it.price * it.qty)}</b>
        </div>`
        )
        .join("")}
      <div class="checkout-summary-line total">
        <span>Total a Pagar</span>
        <span>${money(total)}</span>
      </div>`;

    $("#checkout-summary-box").innerHTML = summaryHTML;
    openPanel("sheet-checkout");
  };

  const executeWhatsAppOrder = (skipForm = false) => {
    let itemsToBuy = [];
    let targetSeller = state.checkout.targetSeller || Store.getSellers()[0];

    if (state.checkout.directProduct) {
      const p = state.checkout.directProduct;
      const prod = Store.getProduct(p.id);
      targetSeller = Store.getSeller(prod ? prod.sellerId : "v1");
      itemsToBuy = [
        {
          id: p.id,
          brand: p.brand,
          model: p.model,
          price: p.price,
          costPrice: prod ? prod.costPrice : 0,
          size: p.size,
          color: p.color,
          sellerId: prod ? prod.sellerId : "v1",
          qty: 1,
        },
      ];
    } else {
      const cart = Store.getCart();
      if (!cart.length) return;
      itemsToBuy = cart.map((line) => {
        const p = Store.getProduct(line.id);
        return {
          id: line.id,
          brand: p ? p.brand : "",
          model: p ? p.model : "Artículo",
          price: p ? p.price : 0,
          costPrice: p ? p.costPrice : 0,
          size: line.size,
          color: p ? p.color : "",
          sellerId: p ? p.sellerId : "v1",
          qty: line.qty,
        };
      });
    }

    const phone = (targetSeller ? targetSeller.phone : Store.getSettings().mainWhatsApp).replace(/[^0-9]/g, "");

    const total = itemsToBuy.reduce((sum, it) => sum + it.price * it.qty, 0);
    const customerName = skipForm ? "" : ($("#checkout-customer-name")?.value || "").trim();
    const delivery = state.checkout.delivery;
    const address = skipForm ? "" : ($("#checkout-customer-address")?.value || "").trim();
    const payment = state.checkout.payment;
    const notes = skipForm ? "" : ($("#checkout-customer-notes")?.value || "").trim();

    // Guardar pedido en el sistema para control del Admin
    const savedOrder = Store.saveOrder({
      customer: customerName || "Cliente WhatsApp",
      sellerId: targetSeller ? targetSeller.id : "v1",
      sellerName: targetSeller ? targetSeller.name : "ZENTRO",
      deliveryType: delivery,
      deliveryAddress: address,
      paymentMethod: payment,
      notes: notes,
      items: itemsToBuy,
      total: total,
    });

    // Registrar analítica de clic en WhatsApp
    Store.recordWhatsAppClick(targetSeller ? targetSeller.id : "v1", itemsToBuy[0]?.id || null);

    // Formatear mensaje para WhatsApp
    let msg = `🔥 *NUEVO PEDIDO - ZENTRO TIENDA DEPORTIVA* 🔥\n`;
    msg += `🔖 Pedido: #${savedOrder.id}\n`;
    msg += `👤 Vendedor asignado: *${targetSeller ? targetSeller.name : "ZENTRO"}*\n\n`;

    if (customerName) msg += `👤 *Cliente:* ${customerName}\n`;
    if (!skipForm) {
      msg += `📍 *Entrega:* ${delivery}${address ? ` - ${address}` : ""}\n`;
      msg += `💳 *Pago:* ${payment}\n`;
    }
    if (notes) msg += `💬 *Notas:* ${notes}\n`;

    msg += `\n📦 *PRODUCTOS SOLICITADOS:* \n`;
    msg += `--------------------------------\n`;

    const storeUrl = window.location.origin + window.location.pathname;

    itemsToBuy.forEach((it, idx) => {
      msg += `${idx + 1}. *${it.brand} ${it.model}*\n`;
      if (it.size) msg += `   ▫ *Talla:* ${it.size}\n`;
      if (it.color) msg += `   ▫ *Color:* ${it.color}\n`;
      msg += `   ▫ *Cantidad:* ${it.qty}\n`;
      msg += `   ▫ *Precio:* ${money(it.price)}\n`;
      msg += `   ▫ *Subtotal:* ${money(it.price * it.qty)}\n`;
      msg += `   🔗 *Ver:* ${storeUrl}#${it.id}\n\n`;
    });

    msg += `--------------------------------\n`;
    msg += `💰 *TOTAL A PAGAR: ${money(total)}*\n`;
    msg += `--------------------------------\n\n`;
    msg += `¡Hola ${targetSeller ? targetSeller.name : ""}! Quiero confirmar este pedido #${savedOrder.id}. Por favor me confirmas disponibilidad y tu número de cuenta para realizarte el pago. ¡Gracias!`;

    if (!state.checkout.directProduct) {
      Store.clearCart();
    }

    closeAll();
    toast(`Abriendo WhatsApp con tu pedido #${savedOrder.id}... (Guarda este código para calificar tu compra)`);

    const encoded = encodeURIComponent(msg);
    const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`;
    window.open(waUrl, "_blank");
  };

  /* ============================================================
     PANELES
     ============================================================ */
  const overlay = $("[data-overlay]");
  const closeAll = () => {
    $$(".drawer, .sheet").forEach((el) => el.classList.remove("open"));
    overlay?.classList.remove("open");
    document.body.style.overflow = "";
  };
  const openPanel = (id) => {
    closeAll();
    const panel = $("#" + id);
    if (!panel) return;
    panel.classList.add("open");
    overlay?.classList.add("open");
    document.body.style.overflow = "hidden";
  };

  const OPEN_MAP = {
    menu: "drawer-menu",
    cart: "drawer-cart",
    filters: "sheet-filters",
    rate: "sheet-rate-seller",
    favorites: () => switchView("favorites"),
  };

  const switchView = (view) => {
    state.view = view;
    $$(".view").forEach((v) => v.classList.remove("active"));
    $("#view-" + view)?.classList.add("active");
    $$(".bottom-nav button").forEach((b) =>
      b.classList.toggle("active", b.dataset.nav === view)
    );
    if (view === "favorites") renderFavorites();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showInfoPage = (label) => {
    $("#page-content").innerHTML = `<h2>${label}</h2><p>${
      PAGE_TEXTS[label] || "Contenido disponible próximamente."
    }</p>`;
    $$(".view").forEach((v) => v.classList.remove("active"));
    $("#view-page")?.classList.add("active");
    state.view = "page";
    $$(".bottom-nav button").forEach((b) => b.classList.remove("active"));
  };

  let toastTimer;
  const toast = (msg) => {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  };

  const share = async (id) => {
    const p = Store.getProduct(id);
    if (!p) return;
    const data = {
      title: `${p.brand} ${p.model} - ZENTRO`,
      text: `Mira este ${p.brand} ${p.model} en ZENTRO Tienda Deportiva:`,
      url: window.location.href.split("#")[0] + "#" + id,
    };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(`${data.text} ${data.url}`);
        toast("Enlace copiado al portapapeles");
      }
    } catch {}
  };

  /* ============================================================
     EVENTOS
     ============================================================ */
  const bindEvents = () => {
    $("#search-input")?.addEventListener("input", (e) => {
      state.query = e.target.value.trim();
      if (state.view !== "home") switchView("home");
      renderGrid();
    });

    $("#categories")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cat]");
      if (!btn) return;
      state.category = btn.dataset.cat;
      renderCategories();
      if (state.view !== "home") switchView("home");
      renderGrid();
    });

    document.addEventListener("click", (e) => {
      const opener = e.target.closest("[data-open]");
      if (opener) {
        const target = OPEN_MAP[opener.dataset.open];
        if (typeof target === "function") target();
        else openPanel(target);
      }
      if (e.target.closest("[data-close]")) closeAll();
      if (e.target === overlay) closeAll();
    });

    $$(".bottom-nav button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const nav = btn.dataset.nav;
        if (nav === "cart") return openPanel("drawer-cart");
        if (nav === "menu") return openPanel("drawer-menu");
        switchView(nav);
      });
    });

    $("#side-menu-list")?.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      e.preventDefault();
      const { menuType, menuLabel } = a.dataset;
      closeAll();
      if (menuType === "category") {
        state.category = menuLabel;
        renderCategories();
        switchView("home");
        renderGrid();
      } else if (menuType === "seller_portal") {
        window.location.href = "vendedor.html";
      } else if (menuType === "rate") {
        openPanel("sheet-rate-seller");
      } else {
        showInfoPage(menuLabel);
      }
    });

    document.addEventListener("click", (e) => {
      const add = e.target.closest("[data-add]");
      const addDetail = e.target.closest("[data-add-detail]");
      const buyDirectWa = e.target.closest("[data-buy-direct-wa]");
      const fav = e.target.closest("[data-fav]");
      const shareBtn = e.target.closest("[data-share]");
      const detail = e.target.closest("[data-detail]");
      const viewSeller = e.target.closest("[data-view-seller]");
      const openRate = e.target.closest("[data-open-rate]");

      if (viewSeller) {
        renderSellerStore(viewSeller.dataset.viewSeller);
        return;
      }

      if (openRate) {
        openPanel("sheet-rate-seller");
        const orderInput = $("#rate-order-id");
        if (orderInput) orderInput.focus();
        return;
      }

      if (add) {
        const prod = Store.getProduct(add.dataset.add);
        const defaultSize = prod && prod.sizes && prod.sizes.length ? prod.sizes[0] : null;
        Store.addToCart(add.dataset.add, defaultSize);
        toast("Añadido al carrito");
      } else if (addDetail) {
        Store.addToCart(addDetail.dataset.addDetail, detailSelectedSize);
        toast("Añadido al carrito");
        closeAll();
      } else if (buyDirectWa) {
        const p = Store.getProduct(buyDirectWa.dataset.buyDirectWa);
        if (p) {
          prepareCheckoutSheet({
            id: p.id,
            brand: p.brand,
            model: p.model,
            price: p.price,
            size: detailSelectedSize || (p.sizes ? p.sizes[0] : "Única"),
            color: p.color,
          });
        }
      } else if (fav) {
        const active = Store.toggleFavorite(fav.dataset.fav);
        Store.recordFavoriteClick(fav.dataset.fav, active);
        toast(active ? "Añadido a favoritos" : "Quitado de favoritos");
      } else if (shareBtn) {
        share(shareBtn.dataset.share);
      } else if (detail) {
        renderDetail(detail.dataset.detail);
      }
    });

    $("#product-detail")?.addEventListener("click", (e) => {
      const size = e.target.closest("[data-size]");
      if (!size) return;
      detailSelectedSize = size.dataset.size;
      $$("#pd-sizes .pd-size").forEach((b) => b.classList.remove("active"));
      size.classList.add("active");
    });

    $("#cart-body")?.addEventListener("click", (e) => {
      const qty = e.target.closest("[data-qty]");
      const remove = e.target.closest("[data-remove]");
      if (qty) {
        const i = Number(qty.dataset.qty);
        const delta = Number(qty.dataset.delta);
        const line = Store.getCart()[i];
        if (line) Store.updateCartQty(i, line.qty + delta);
      } else if (remove) {
        Store.removeFromCart(Number(remove.dataset.remove));
      }
    });

    $("#checkout-btn")?.addEventListener("click", () => {
      prepareCheckoutSheet(null);
    });

    $("#sheet-checkout")?.addEventListener("click", (e) => {
      const deliveryCard = e.target.closest("[data-delivery]");
      const paymentCard = e.target.closest("[data-payment]");

      if (deliveryCard) {
        $$("[data-delivery]").forEach((c) => c.classList.remove("active"));
        deliveryCard.classList.add("active");
        state.checkout.delivery = deliveryCard.dataset.delivery;
        const addrSec = $("#checkout-address-section");
        if (addrSec) {
          addrSec.style.display = state.checkout.delivery.includes("Envío") ? "block" : "none";
        }
      } else if (paymentCard) {
        $$("[data-payment]").forEach((c) => c.classList.remove("active"));
        paymentCard.classList.add("active");
        state.checkout.payment = paymentCard.dataset.payment;
      }
    });

    $("#confirm-whatsapp-order-btn")?.addEventListener("click", () => {
      executeWhatsAppOrder(false);
    });

    $("#quick-whatsapp-order-btn")?.addEventListener("click", () => {
      executeWhatsAppOrder(true);
    });

    const openGeneralWA = (e) => {
      e.preventDefault();
      const mainSeller = Store.getSellers()[0];
      const phone = (mainSeller ? mainSeller.phone : "18090000000").replace(/[^0-9]/g, "");
      const text = encodeURIComponent("¡Hola ZENTRO! Me gustaría hacer una consulta sobre tenis deportivos disponibles.");
      window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${text}`, "_blank");
    };

    $("#global-wa-float")?.addEventListener("click", openGeneralWA);
    $("#profile-direct-wa")?.addEventListener("click", openGeneralWA);

    $("#filters-body")?.addEventListener("click", (e) => {
      const pill = e.target.closest("[data-filter]");
      if (pill) {
        const { filter, value } = pill.dataset;
        state.filters[filter] = state.filters[filter] === value ? "" : value;
        renderFilters();
      }
    });
    $("#filters-body")?.addEventListener("change", (e) => {
      if (e.target.matches("[data-sort]")) state.filters.sort = e.target.value;
    });
    $("#filters-body")?.addEventListener("input", (e) => {
      const price = e.target.closest("[data-price]");
      if (price) state.filters[price.dataset.price] = e.target.value;
    });

    $("#apply-filters")?.addEventListener("click", () => {
      updateFilterBadge();
      switchView("home");
      renderGrid();
      closeAll();
    });
    $("#clear-filters")?.addEventListener("click", () => {
      state.filters = {
        brand: "",
        condition: "",
        color: "",
        gender: "",
        sport: "",
        size: "",
        min: "",
        max: "",
        sort: "recientes",
      };
      renderFilters();
      updateFilterBadge();
      renderGrid();
    });

    // Formulario de Calificación Verificada por Pedido
    $("#rating-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const orderId = $("#rate-order-id")?.value;
      const name = $("#rate-customer-name")?.value;
      const stars = $("#rate-stars")?.value;
      const comment = $("#rate-comment")?.value;

      const res = Store.submitVerifiedRating({
        orderId,
        customerName: name,
        stars,
        comment,
      });

      if (res.success) {
        toast("✅ ¡Calificación verificada registrada!");
        $("#rating-form")?.reset();
        closeAll();
        renderGrid();
      } else {
        alert(res.message);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAll();
    });

    if (window.location.hash) {
      const id = window.location.hash.replace("#", "");
      if (Store.getProduct(id)) {
        setTimeout(() => renderDetail(id), 250);
      }
    }
  };

  /* ============================================================
     SUSCRIPCIÓN
     ============================================================ */
  Store.subscribe(() => {
    updateCartBadge();
    updateFilterBadge();
    renderCart();
    renderGrid();
    if (state.view === "favorites") renderFavorites();
  });

  /* ============================================================
     INIT
     ============================================================ */
  const init = () => {
    Store.recordPageView(); // Registrar visita a la web para el panel de estadísticas
    renderCategories();
    renderSideMenu();
    renderFilters();
    renderGrid();
    renderCart();
    updateCartBadge();
    updateFilterBadge();
    bindEvents();

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () =>
        navigator.serviceWorker.register("sw.js").catch(() => {})
      );
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
