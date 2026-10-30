/* ============================================================
   ZENTRO Admin - Lógica del Panel de Administración
   ------------------------------------------------------------
   Incluye:
   1. Multi-vendedor (cada producto tiene su vendedor y WhatsApp)
   2. Finanzas y Ganancias automáticas (Venta - Compra)
   3. Control de Pedidos con botón 'Pendiente Pago'
   4. Descuento automático de inventario al entregar/pagar
   5. Ocultación de tenis agotados en la vista del cliente
   6. Compresión local de fotos para máxima velocidad
   ============================================================ */

(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const getCurrency = () => Store.getSettings().currency || "$";
  const money = (n) => getCurrency() + Number(n || 0).toFixed(2);

  const TITLES = {
    dashboard: "Dashboard General",
    products: "Inventario de Productos",
    add: "Agregar / Editar Producto",
    sellers: "Gestión de Vendedores",
    finances: "Finanzas & Reporte de Ganancias",
    orders: "Pedidos de WhatsApp",
    inventory: "Existencias por Vendedor",
    database: "Copias de Seguridad",
  };

  const thumb = (p) => {
    if (p.images && p.images.length > 0) return p.images[0];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88"><rect width="88" height="88" fill="${p.accent || "#1a1a1a"}"/><text x="44" y="50" text-anchor="middle" fill="#fff" font-family="Inter" font-size="12" font-weight="800" opacity=".8">${p.brand || "ZENTRO"}</text></svg>`;
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  };

  const stockPill = (s) => {
    if (s <= 0) return '<span class="pill out">Agotado (Oculto)</span>';
    if (s <= 3) return `<span class="pill low">Bajo · ${s}</span>`;
    return `<span class="pill ok">${s} uds</span>`;
  };

  const ICON = {
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>',
    del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
    wa: '<svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.05 7.42C8.86 7.42 8.56 7.49 8.31 7.76C8.06 8.04 7.34 8.71 7.34 10.07C7.34 11.43 8.33 12.75 8.47 12.94C8.61 13.12 10.42 15.92 13.18 17.11C13.84 17.4 14.35 17.57 14.75 17.7C15.41 17.91 16.02 17.88 16.5 17.81C17.03 17.73 18.14 17.14 18.37 16.49C18.6 15.84 18.6 15.29 18.53 15.17C18.46 15.05 18.27 14.99 17.99 14.85C17.71 14.71 16.34 14.04 16.09 13.95C15.84 13.86 15.65 13.81 15.46 14.09C15.27 14.37 14.74 14.99 14.58 15.17C14.42 15.36 14.26 15.38 13.98 15.24C13.7 15.1 12.8 14.81 11.74 13.86C10.91 13.12 10.35 12.21 10.21 11.93C10.07 11.65 10.2 11.5 10.34 11.36C10.46 11.24 10.61 11.04 10.75 10.88C10.89 10.72 10.94 10.6 11.03 10.42C11.12 10.24 11.07 10.07 11.01 9.93C10.94 9.79 10.39 8.44 10.15 7.89C9.93 7.35 9.7 7.42 9.53 7.41C9.37 7.41 9.21 7.42 9.05 7.42Z"/></svg>',
  };

  const statCard = (label, value, trend) =>
    `<div class="stat"><small>${label}</small><b>${value}</b>${
      trend ? `<span class="trend">${trend}</span>` : ""
    }</div>`;

  /* ============================================================
     1. DASHBOARD
     ============================================================ */
  const renderDashboard = () => {
    const products = Store.getProducts();
    const finances = Store.getFinances();
    const sellers = Store.getSellers();
    const totalStock = products.reduce((n, p) => n + (Number(p.stock) || 0), 0);

    $("#dashboard-stats").innerHTML = [
      statCard("Total Productos", products.length, "En almacén"),
      statCard("Ganancia Neta Total", money(finances.netProfit), `Margen: ${finances.marginPercent.toFixed(1)}%`),
      statCard("Ventas Realizadas", money(finances.totalRevenue), `${finances.completedOrdersCount} pedidos`),
      statCard("Existencias Totales", totalStock, "Unidades"),
    ].join("");

    $("#dash-sellers-summary").innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
        ${sellers
          .map(
            (s) => `
          <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:10px">
            <span class="badge-whatsapp">${ICON.wa} +${s.phone}</span>
            <div>
              <b>${s.name}</b>
              <div style="font-size:11px;color:var(--text-muted)">${products.filter((p) => p.sellerId === s.id).length} tenis asignados</div>
            </div>
          </div>`
          )
          .join("")}
      </div>`;

    const low = [...products].sort((a, b) => a.stock - b.stock).slice(0, 6);
    $("#low-stock-table").innerHTML = `
      <thead><tr><th>Producto</th><th>Vendedor</th><th>Precio Venta</th><th>Stock</th><th>Estado Tienda</th></tr></thead>
      <tbody>${low
        .map((p) => {
          const seller = Store.getSeller(p.sellerId);
          return `<tr>
            <td><b>${p.brand}</b> ${p.model}</td>
            <td><span class="seller-tag">${seller.name}</span></td>
            <td>${money(p.price)}</td>
            <td>${stockPill(p.stock)}</td>
            <td>${p.stock > 0 ? '<span style="color:#22c55e;font-size:12px">● Visible</span>' : '<span style="color:var(--danger);font-size:12px">● Oculto al cliente</span>'}</td>
          </tr>`;
        })
        .join("")}</tbody>`;
  };

  /* ============================================================
     2. GESTIÓN DE VENDEDORES
     ============================================================ */
  const renderSellers = () => {
    const sellers = Store.getSellers();
    const products = Store.getProducts();
    const container = $("#sellers-cards-container");

    container.innerHTML = sellers
      .map((s) => {
        const prodCount = products.filter((p) => p.sellerId === s.id).length;
        return `
        <div class="seller-card">
          <div>
            <div class="seller-card-head">
              <div>
                <b>${s.name}</b>
                <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${s.notes || "Sin descripción"}</div>
              </div>
              <span class="badge-whatsapp">${ICON.wa} WhatsApp</span>
            </div>
            <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:12px">
              +${s.phone}
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">
              <b>${prodCount}</b> tenis asignados a este vendedor
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn-whatsapp btn-whatsapp-sm" data-test-seller-wa="${s.phone}" style="flex:1">Probar WhatsApp</button>
            <button class="icon-btn" data-edit-seller="${s.id}" title="Editar vendedor">${ICON.edit}</button>
            <button class="icon-btn del" data-del-seller="${s.id}" title="Eliminar vendedor">${ICON.del}</button>
          </div>
        </div>`;
      })
      .join("");

    updateSellerSelectOptions();
  };

  const updateSellerSelectOptions = () => {
    const sellers = Store.getSellers();
    const sel = $("#form-seller-select");
    if (!sel) return;
    sel.innerHTML = sellers
      .map((s) => `<option value="${s.id}">${s.name} (+${s.phone})</option>`)
      .join("");
  };

  /* ============================================================
     3. PRODUCTOS
     ============================================================ */
  const renderProducts = () => {
    const products = Store.getProducts();
    $("#products-count").textContent = `(${products.length} artículos en almacén)`;

    $("#products-table").innerHTML = `
      <thead><tr><th></th><th>Producto</th><th>Vendedor</th><th>Costo Compra</th><th>Precio Venta</th><th>Ganancia/Ud</th><th>Stock</th><th>Acciones</th></tr></thead>
      <tbody>${
        products.length
          ? products
              .map((p) => {
                const seller = Store.getSeller(p.sellerId);
                const cost = Number(p.costPrice) || 0;
                const sell = Number(p.price) || 0;
                const profit = sell - cost;
                return `
            <tr>
              <td><div class="thumb"><img src="${thumb(p)}" alt="${p.model}" /></div></td>
              <td><b>${p.brand}</b> ${p.model}<br /><small style="color:var(--text-muted)">${p.category || "Baloncesto"}</small></td>
              <td><span class="seller-tag">${seller.name}</span></td>
              <td style="color:var(--text-muted)">${money(cost)}</td>
              <td><b>${money(sell)}</b></td>
              <td><span class="pill pill-profit">+${money(profit)}</span></td>
              <td>${stockPill(p.stock)}</td>
              <td><div class="row-actions">
                <button data-edit="${p.id}" title="Editar">${ICON.edit}</button>
                <button class="del" data-del="${p.id}" title="Eliminar">${ICON.del}</button>
              </div></td>
            </tr>`;
              })
              .join("")
          : `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted)">No hay tenis registrados.</td></tr>`
      }</tbody>`;
  };

  /* ============================================================
     4. FINANZAS Y GANANCIAS POR VENDEDOR
     ============================================================ */
  const renderFinances = () => {
    const f = Store.getFinances();

    $("#finances-metrics-grid").innerHTML = `
      <div class="finance-card profit">
        <small>Ganancia Neta Total</small>
        <b style="color:#22c55e">${money(f.netProfit)}</b>
        <div class="sub">Margen promedio de ganancia: <b>${f.marginPercent.toFixed(1)}%</b></div>
      </div>
      <div class="finance-card revenue">
        <small>Ingresos Totales por Ventas</small>
        <b>${money(f.totalRevenue)}</b>
        <div class="sub">De <b>${f.completedOrdersCount}</b> pedidos completados</div>
      </div>
      <div class="finance-card cost">
        <small>Costo de Mercancía Vendida</small>
        <b style="color:#f59e0b">${money(f.totalCost)}</b>
        <div class="sub">Inversión original recuperada</div>
      </div>
      <div class="finance-card">
        <small>Unidades Vendidas</small>
        <b>${f.totalUnitsSold} uds</b>
        <div class="sub">Pares de tenis y artículos</div>
      </div>`;

    $("#seller-finances-table").innerHTML = `
      <thead><tr><th>Vendedor</th><th>Tenis Vendidos</th><th>Ventas Totales</th><th>Costo Mercancía</th><th>Ganancia Neta</th><th>Margen %</th><th>Valor en Stock</th></tr></thead>
      <tbody>${
        f.sellersSummary.length
          ? f.sellersSummary
              .map((s) => {
                const margin = s.revenue > 0 ? (s.profit / s.revenue) * 100 : 0;
                return `
            <tr>
              <td><b>${s.sellerName}</b><br /><small class="badge-whatsapp">${ICON.wa} +${s.phone}</small></td>
              <td><b>${s.unitsSold}</b> uds</td>
              <td>${money(s.revenue)}</td>
              <td style="color:var(--text-muted)">${money(s.cost)}</td>
              <td><b style="color:#22c55e;font-size:15px">+${money(s.profit)}</b></td>
              <td><span class="pill pill-profit">${margin.toFixed(1)}%</span></td>
              <td>${money(s.activeStockValue)} <small>(${s.activeStockUnits} uds)</small></td>
            </tr>`;
              })
              .join("")
          : `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted)">Sin datos financieros registrados aún.</td></tr>`
      }</tbody>`;
  };

  /* ============================================================
     5. PEDIDOS WHATSAPP & BOTÓN PENDIENTE DE PAGO
     ============================================================ */
  const renderOrders = () => {
    const orders = Store.getOrders();

    $("#orders-table").innerHTML = `
      <thead><tr><th>ID</th><th>Cliente</th><th>Productos</th><th>Total</th><th>Estado</th><th>Acción de Cobro</th><th>Fecha</th><th></th></tr></thead>
      <tbody>${
        orders.length
          ? orders
              .map((o) => {
                const itemsStr = (o.items || [])
                  .map((it) => `${it.qty}x ${it.brand || ""} ${it.model || ""}`)
                  .join(", ");

                // Si está entregado pero no pagado, mostrar botón especial 'Pendiente Pago'
                const isDeliveredNotPaid = o.status === "Entregado";
                const isPaid = o.status === "Pagado";

                const paymentAction = isDeliveredNotPaid
                  ? `<button class="btn-pending-pay" data-mark-paid="${o.id}">⚠️ Pendiente Pago (Marcar Pagado)</button>`
                  : isPaid
                  ? `<span style="color:#22c55e;font-weight:700;font-size:12px">✓ Cobrado y Entregado</span>`
                  : `<span style="color:var(--text-muted);font-size:12px">Por entregar</span>`;

                return `<tr>
                  <td><b>${o.id}</b></td>
                  <td>${o.customer || "Cliente WhatsApp"}<br /><small style="color:var(--text-muted)">${o.deliveryType || ""}</small></td>
                  <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis" title="${itemsStr}">${itemsStr || "1x Tenis"}</td>
                  <td><b style="color:#22c55e">${money(o.total)}</b></td>
                  <td>
                    <select class="order-status-select" data-order-status="${o.id}" style="background:var(--surface-2);border:1px solid var(--border);border-radius:6px;padding:4px 6px;color:var(--text);font-size:12px">
                      <option value="Pendiente" ${o.status === "Pendiente" ? "selected" : ""}>Pendiente</option>
                      <option value="Entregado" ${o.status === "Entregado" ? "selected" : ""}>Entregado</option>
                      <option value="Pagado" ${o.status === "Pagado" ? "selected" : ""}>Pagado</option>
                      <option value="Cancelado" ${o.status === "Cancelado" ? "selected" : ""}>Cancelado</option>
                    </select>
                  </td>
                  <td>${paymentAction}</td>
                  <td><small>${o.dateFormatted || o.createdAt?.slice(0, 10) || ""}</small></td>
                  <td><button class="icon-btn del" data-del-order="${o.id}" title="Eliminar">${ICON.del}</button></td>
                </tr>`;
              })
              .join("")
          : `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted)">Aún no hay pedidos registrados.</td></tr>`
      }</tbody>`;
  };

  /* ============================================================
     6. INVENTARIO
     ============================================================ */
  const renderInventory = () => {
    const products = Store.getProducts();
    $("#inventory-table").innerHTML = `
      <thead><tr><th>Producto</th><th>Vendedor</th><th>Tallas</th><th>Stock Actual</th><th>Estado</th></tr></thead>
      <tbody>${products
        .map((p) => {
          const seller = Store.getSeller(p.sellerId);
          return `<tr>
            <td><b>${p.brand}</b> ${p.model}</td>
            <td><span class="seller-tag">${seller.name}</span></td>
            <td>${(p.sizes || []).join(", ")}</td>
            <td><b>${p.stock}</b> uds</td>
            <td>${stockPill(p.stock)}</td>
          </tr>`;
        })
        .join("")}</tbody>`;
  };

  const RENDERERS = {
    dashboard: renderDashboard,
    products: renderProducts,
    add: () => updateSellerSelectOptions(),
    sellers: renderSellers,
    finances: renderFinances,
    orders: renderOrders,
    inventory: renderInventory,
    database: () => {},
  };

  /* ============================================================
     NAVEGACIÓN
     ============================================================ */
  const goto = (section) => {
    $$(".admin-section").forEach((s) => s.classList.remove("active"));
    const secEl = $("#sec-" + section);
    if (secEl) secEl.classList.add("active");
    $$(".admin-side a[data-section]").forEach((a) =>
      a.classList.toggle("active", a.dataset.section === section)
    );
    $("#admin-title").textContent = TITLES[section] || section;
    (RENDERERS[section] || (() => {}))();
    closeSide();
    window.scrollTo({ top: 0 });
  };

  /* ============================================================
     FORMULARIO PRODUCTO (Precios, Ganancia y Fotos)
     ============================================================ */
  const form = $("#product-form");
  let currentImages = [];

  const updateProfitPreview = () => {
    const cost = parseFloat($("#form-cost-price")?.value) || 0;
    const sell = parseFloat($("#form-sell-price")?.value) || 0;
    const profit = sell - cost;
    const margin = sell > 0 ? (profit / sell) * 100 : 0;
    const previewEl = $("#form-profit-preview");
    if (previewEl) {
      previewEl.textContent = `Ganancia estimada por par: ${money(profit)} (${margin.toFixed(1)}% margen)`;
      previewEl.style.color = profit >= 0 ? "#22c55e" : "#ef4444";
    }
  };

  $("#form-cost-price")?.addEventListener("input", updateProfitPreview);
  $("#form-sell-price")?.addEventListener("input", updateProfitPreview);

  const renderImgPreviews = () => {
    const box = $("#img-previews");
    box.innerHTML = currentImages
      .map(
        (url, i) => `
        <div class="img-preview-item">
          <img src="${url}" alt="Foto ${i + 1}" />
          <button type="button" class="img-preview-remove" data-remove-img="${i}" title="Eliminar">×</button>
        </div>`
      )
      .join("");
  };

  const compressImage = (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const fillForm = (p) => {
    form.id.value = p.id;
    form.brand.value = p.brand;
    form.model.value = p.model;
    form.category.value = p.category || "Baloncesto";
    form.sellerId.value = p.sellerId || "v1";
    form.costPrice.value = p.costPrice || "";
    form.price.value = p.price;
    form.stock.value = p.stock;
    form.condition.value = p.condition || "Nuevo";
    form.color.value = p.color || "";
    form.gender.value = p.gender || "Unisex";
    form.sizes.value = (p.sizes || []).join(", ");
    form.description.value = p.description || "";
    form.features.value = (p.features || []).join(", ");
    currentImages = [...(p.images || [])];
    renderImgPreviews();
    updateProfitPreview();
    $("#form-title").textContent = `Editar: ${p.brand} ${p.model}`;
  };

  const resetForm = () => {
    form.reset();
    form.id.value = "";
    currentImages = [];
    renderImgPreviews();
    updateProfitPreview();
    $("#form-title").textContent = "Agregar Nuevo Calzado o Artículo";
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const sizes = data.sizes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const product = {
      id: data.id || "p" + Date.now(),
      brand: data.brand.trim(),
      model: data.model.trim(),
      category: data.category,
      sellerId: data.sellerId,
      costPrice: parseFloat(data.costPrice) || 0,
      price: parseFloat(data.price) || 0,
      stock: parseInt(data.stock, 10) || 0,
      condition: data.condition,
      color: data.color.trim() || "Negro",
      gender: data.gender,
      sizes: sizes.length ? sizes : ["8", "9", "10", "11"],
      description: data.description.trim() || "",
      features: data.features
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      images: [...currentImages],
      popularity: data.id ? Store.getProduct(data.id)?.popularity || 85 : 85,
      createdAt: data.id ? Store.getProduct(data.id)?.createdAt || new Date().toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      accent: "#ff5500",
      views: ["Frente", "Lateral"],
    };

    Store.saveProduct(product);
    toast(data.id ? "Producto actualizado" : "¡Producto guardado exitosamente!");
    resetForm();
    goto("products");
  });

  $("#cancel-form")?.addEventListener("click", () => {
    resetForm();
    goto("products");
  });

  $("#img-input")?.addEventListener("change", async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    toast("Comprimiendo fotos...");
    for (const file of files) {
      const dataUrl = await compressImage(file);
      currentImages.push(dataUrl);
    }
    renderImgPreviews();
    e.target.value = "";
  });

  $("#add-img-url-btn")?.addEventListener("click", () => {
    const input = $("#img-url-input");
    const url = (input.value || "").trim();
    if (!url) return;
    currentImages.push(url);
    input.value = "";
    renderImgPreviews();
  });

  $("#img-previews")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-img]");
    if (!btn) return;
    const idx = Number(btn.dataset.removeImg);
    currentImages.splice(idx, 1);
    renderImgPreviews();
  });

  /* ============================================================
     VENDEDORES - CREAR / EDITAR / ELIMINAR
     ============================================================ */
  const sellerForm = $("#seller-form");
  $("#toggle-add-seller-btn")?.addEventListener("click", () => {
    sellerForm.reset();
    sellerForm.id.value = "";
    sellerForm.style.display = sellerForm.style.display === "none" ? "grid" : "none";
  });
  $("#cancel-seller-form")?.addEventListener("click", () => {
    sellerForm.style.display = "none";
  });

  sellerForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(sellerForm).entries());
    Store.saveSeller(data);
    toast("Vendedor guardado exitosamente");
    sellerForm.reset();
    sellerForm.style.display = "none";
    renderSellers();
  });

  /* ============================================================
     ACCIONES GLOBALES (Delegación)
     ============================================================ */
  document.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-section]");
    const go = e.target.closest("[data-goto]");
    const edit = e.target.closest("[data-edit]");
    const del = e.target.closest("[data-del]");
    const markPaid = e.target.closest("[data-mark-paid]");
    const delOrder = e.target.closest("[data-del-order]");
    const testSellerWa = e.target.closest("[data-test-seller-wa]");
    const editSeller = e.target.closest("[data-edit-seller]");
    const delSeller = e.target.closest("[data-del-seller]");
    const preset = e.target.closest("[data-preset]");

    if (nav) goto(nav.dataset.section);
    if (go) goto(go.dataset.goto);

    // Editar producto
    if (edit) {
      resetForm();
      const p = Store.getProduct(edit.dataset.edit);
      if (p) {
        fillForm(p);
        goto("add");
      }
    }

    // Eliminar producto
    if (del) {
      if (confirm("¿Eliminar este producto del catálogo?")) {
        Store.deleteProduct(del.dataset.del);
        toast("Producto eliminado");
        renderProducts();
      }
    }

    // Botón directo "Marcar Pagado" en pedidos entregados
    if (markPaid) {
      Store.updateOrderStatus(markPaid.dataset.markPaid, "Pagado");
      toast("¡Pedido marcado como PAGADO!");
      renderOrders();
      renderDashboard();
    }

    // Eliminar pedido
    if (delOrder) {
      if (confirm("¿Eliminar este pedido del historial?")) {
        Store.deleteOrder(delOrder.dataset.delOrder);
        toast("Pedido eliminado");
        renderOrders();
      }
    }

    // Probar WhatsApp de un vendedor específico
    if (testSellerWa) {
      const phone = (testSellerWa.dataset.testSellerWa || "").replace(/[^0-9]/g, "");
      const msg = encodeURIComponent("Hola, prueba de conexión de WhatsApp desde ZENTRO.");
      window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${msg}`, "_blank");
    }

    // Editar vendedor
    if (editSeller) {
      const s = Store.getSeller(editSeller.dataset.editSeller);
      if (s) {
        sellerForm.id.value = s.id;
        sellerForm.name.value = s.name;
        sellerForm.phone.value = s.phone;
        sellerForm.notes.value = s.notes || "";
        sellerForm.style.display = "grid";
        window.scrollTo({ top: sellerForm.offsetTop - 40, behavior: "smooth" });
      }
    }

    // Eliminar vendedor
    if (delSeller) {
      if (confirm("¿Eliminar este vendedor?")) {
        if (Store.deleteSeller(delSeller.dataset.delSeller)) {
          toast("Vendedor eliminado");
          renderSellers();
        }
      }
    }

    // Presets de tallas
    if (preset) {
      const input = $("#form-sizes-input");
      if (!input) return;
      if (preset.dataset.preset === "sneakers") {
        input.value = "8, 8.5, 9, 9.5, 10, 10.5, 11, 12";
      } else if (preset.dataset.preset === "clothing") {
        input.value = "S, M, L, XL, 2XL";
      } else if (preset.dataset.preset === "one") {
        input.value = "Ajustable";
      }
    }
  });

  // Cambio de estado en el selector de pedidos
  document.addEventListener("change", (e) => {
    const sel = e.target.closest("[data-order-status]");
    if (sel) {
      Store.updateOrderStatus(sel.dataset.orderStatus, sel.value);
      toast("Estado actualizado (Inventario ajustado)");
      renderOrders();
      renderDashboard();
    }
  });

  /* Respaldos JSON */
  $("#export-backup-btn")?.addEventListener("click", () => {
    const jsonStr = Store.exportDataJSON();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zentro-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Copia de seguridad descargada");
  });

  $("#import-backup-file")?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (Store.importDataJSON(event.target.result)) {
        toast("Datos importados con éxito");
        goto("dashboard");
      } else {
        alert("Archivo JSON no válido.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  $("#reset-default-btn")?.addEventListener("click", () => {
    if (confirm("¿Restablecer el catálogo inicial de ZENTRO?")) {
      Store.resetProductsToDefault();
      toast("Catálogo restablecido");
      goto("products");
    }
  });

  /* Sidebar móvil */
  const side = $("#admin-side");
  const sideOverlay = $("#admin-overlay");
  const closeSide = () => {
    side?.classList.remove("open");
    sideOverlay?.classList.remove("open");
  };
  $("#admin-toggle")?.addEventListener("click", () => {
    side?.classList.add("open");
    sideOverlay?.classList.add("open");
  });
  sideOverlay?.addEventListener("click", closeSide);

  /* Toast */
  let toastTimer;
  const toast = (msg) => {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  };

  /* ============================================================
     CONTROL DE ACCESO POR PIN (Lock Screen)
     ============================================================ */
  const PIN_KEY = "zentro_master_pin";
  const UNLOCKED_KEY = "zentro_admin_unlocked";
  const getMasterPin = () => localStorage.getItem(PIN_KEY) || "1234";

  const lockScreen = $("#admin-lock-screen");
  const adminApp = $("#admin-app");
  const lockForm = $("#lock-screen-form");
  const pinInput = $("#lock-pin-input");

  const unlockAdmin = () => {
    sessionStorage.setItem(UNLOCKED_KEY, "true");
    if (lockScreen) lockScreen.style.display = "none";
    if (adminApp) {
      adminApp.style.filter = "none";
      adminApp.style.pointerEvents = "auto";
    }
  };

  const lockAdmin = () => {
    sessionStorage.removeItem(UNLOCKED_KEY);
    if (lockScreen) {
      lockScreen.style.display = "flex";
      if (pinInput) {
        pinInput.value = "";
        pinInput.focus();
      }
    }
    if (adminApp) {
      adminApp.style.filter = "blur(10px)";
      adminApp.style.pointerEvents = "none";
    }
  };

  lockForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const entered = (pinInput?.value || "").trim();
    if (entered === getMasterPin()) {
      unlockAdmin();
      toast("¡Bienvenido a ZENTRO Admin!");
    } else {
      toast("❌ PIN incorrecto");
      if (pinInput) {
        pinInput.value = "";
        pinInput.focus();
      }
    }
  });

  $("#lock-admin-btn")?.addEventListener("click", () => {
    lockAdmin();
    toast("Panel bloqueado");
  });

  $("#change-pin-btn")?.addEventListener("click", () => {
    const current = prompt("Introduce tu PIN actual:");
    if (current !== getMasterPin()) {
      alert("PIN actual incorrecto.");
      return;
    }
    const newPin = prompt("Introduce tu nuevo PIN (mínimo 4 números o letras):");
    if (newPin && newPin.trim().length >= 4) {
      localStorage.setItem(PIN_KEY, newPin.trim());
      toast("✅ ¡PIN actualizado exitosamente!");
    } else if (newPin !== null) {
      alert("El PIN debe tener al menos 4 caracteres.");
    }
  });

  // Verificar si ya estaba desbloqueado en la sesión
  if (sessionStorage.getItem(UNLOCKED_KEY) === "true") {
    unlockAdmin();
  } else {
    lockAdmin();
  }

  /* ============================================================
     BOTÓN: SUBIR Y SINCRONIZAR TODO A FIREBASE
     ============================================================ */
  $("#manual-sync-firebase-btn")?.addEventListener("click", async () => {
    toast("Subiendo catálogo a Firebase en la nube...");
    try {
      const res = await Store.syncAllToFirebase();
      toast(`✅ ¡Éxito! ${res.products} productos y ${res.sellers} vendedores subidos a Firebase.`);
    } catch (err) {
      alert("Aviso Firebase: " + err.message + "\n\nRecuerda publicar las reglas 'if true' en tu consola de Firestore.");
    }
  });

  /* Init */
  goto("dashboard");
})();
