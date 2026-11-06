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

  /* Toast helper disponible globalmente en el scope */
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
     CONTROL DE ACCESO POR PIN (Sincronizado con Firebase Firestore)
     Registrado al inicio para máxima prioridad y rapidez
     ============================================================ */
  const UNLOCKED_KEY = "zentro_admin_unlocked";

  const lockScreen = $("#admin-lock-screen");
  const adminApp = $("#admin-app");
  const lockForm = $("#lock-screen-form");
  const pinInput = $("#lock-pin-input");

  function unlockAdmin() {
    sessionStorage.setItem(UNLOCKED_KEY, "true");
    localStorage.setItem(UNLOCKED_KEY, "true");
    const ls = $("#admin-lock-screen") || document.getElementById("admin-lock-screen");
    if (ls) {
      ls.style.setProperty("display", "none", "important");
    }
    const app = $("#admin-app") || document.getElementById("admin-app");
    if (app) {
      app.style.setProperty("display", "flex", "important");
    }
    // Renderizado completo e inmediato al desbloquear
    try {
      renderDashboard();
      renderProducts();
      renderSellers();
      renderFinances();
      goto("dashboard");
    } catch (err) {
      console.warn("Aviso al desbloquear admin:", err);
    }
  }

  function lockAdmin() {
    sessionStorage.removeItem(UNLOCKED_KEY);
    localStorage.removeItem(UNLOCKED_KEY);
    const ls = $("#admin-lock-screen") || document.getElementById("admin-lock-screen");
    if (ls) {
      ls.style.setProperty("display", "flex", "important");
      if (pinInput) {
        pinInput.value = "";
        setTimeout(() => pinInput.focus(), 50);
      }
    }
  }

  window.adminUnlock = unlockAdmin;
  window.adminLock = lockAdmin;

  // Botones de acceso rápido en pantalla de bloqueo
  $("#quick-pin-2601")?.addEventListener("click", () => {
    if (pinInput) pinInput.value = "2601";
    unlockAdmin();
    toast("¡Bienvenido a ZENTRO Admin!");
  });

  $("#quick-pin-1234")?.addEventListener("click", () => {
    if (pinInput) pinInput.value = "1234";
    unlockAdmin();
    toast("¡Bienvenido a ZENTRO Admin!");
  });

  // Manejar el submit del PIN con desbloqueo instantáneo
  lockForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const entered = (pinInput?.value || "").trim();
    if (!entered) return;

    // 1. PINs maestros garantizados de acceso inmediato (2601, 1234 o pin personalizado guardado)
    const localPin = (window.Store && typeof Store.getMasterPin === "function") ? Store.getMasterPin() : "2601";
    if (entered === "2601" || entered === "1234" || entered === localPin) {
      unlockAdmin();
      toast("¡Bienvenido a ZENTRO Admin!");
      return;
    }

    // 2. Si no coincide en local, verificar contra Firebase Firestore en la nube
    toast("Verificando contraseña en Firebase...");
    let isValid = false;
    if (window.Store && typeof Store.validateMasterPinAsync === "function") {
      isValid = await Store.validateMasterPinAsync(entered);
    }
    if (isValid) {
      unlockAdmin();
      toast("¡Bienvenido a ZENTRO Admin!");
    } else {
      toast("❌ Contraseña incorrecta (Usa 2601 o 1234)");
      if (pinInput) {
        pinInput.value = "";
        pinInput.focus();
      }
    }
  });

  // Verificar estado de desbloqueo de la sesión actual
  if (sessionStorage.getItem(UNLOCKED_KEY) === "true" || localStorage.getItem(UNLOCKED_KEY) === "true") {
    unlockAdmin();
  } else {
    lockAdmin();
  }

  const TITLES = {
    dashboard: "Dashboard General",
    analytics: "Estadísticas & Flujo de Tienda",
    products: "Inventario de Artículos",
    add: "Agregar / Editar Artículo",
    sellers: "Gestión de Vendedores, Planes & Pagos",
    finances: "Finanzas & Membresías",
    orders: "Pedidos de WhatsApp",
    inventory: "Existencias por Vendedor",
    database: "Ajustes, Contraseña & Cuentas",
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
    star: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3"/></svg>',
  };

  const statCard = (label, value, trend) =>
    `<div class="stat"><small>${label}</small><b>${value}</b>${
      trend ? `<span class="trend">${trend}</span>` : ""
    }</div>`;

  /* Helper para enviar recordatorio de pago a WhatsApp */
  const sendPaymentReminderWhatsApp = (seller) => {
    const settings = Store.getSettings();
    const accounts = settings.bankDetails || "Banco Popular: Cta. 798-123456-1\nA nombre de: ZENTRO S.R.L.";
    let template = settings.reminderTemplate || "¡Hola [NOMBRE]! Te recordamos desde ZENTRO que el pago de suscripción de tu tienda vence el [FECHA]. Para renovar tu plan de [PLAN] ([PRECIO]), realiza tu pago a nuestras cuentas:\n\n[CUENTAS]\n\nFavor enviar comprobante por este chat. ¡Muchas gracias!";

    const msg = template
      .replace(/\[NOMBRE\]/g, seller.name)
      .replace(/\[FECHA\]/g, seller.planRenewalDate || "pronto")
      .replace(/\[PLAN\]/g, seller.planName || `Plan ${seller.productLimit || 10} Tenis`)
      .replace(/\[PRECIO\]/g, money(seller.monthlyFee || 1500))
      .replace(/\[CUENTAS\]/g, accounts);

    const phone = (seller.phone || "").replace(/[^0-9]/g, "");
    const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  /* ============================================================
     1. DASHBOARD
     ============================================================ */
  function renderDashboard() {
    const products = Store.getProducts();
    const adminF = Store.getAdminFinances();
    const sellers = Store.getSellers();
    const totalStock = products.reduce((n, p) => n + (Number(p.stock) || 0), 0);

    const statsEl = $("#dashboard-stats");
    if (statsEl) {
      statsEl.innerHTML = [
        statCard("Ganancias por Membresías", money(adminF.totalCollected), "Total cobrado a vendedores"),
        statCard("Tiendas Activas Pagando", `${adminF.activeSellersCount} de ${adminF.totalSellersCount}`, "Recaudación recurrente"),
        statCard("Mensualidades Estimadas", money(adminF.projectedMonthly), "Ingreso mensual proyectado"),
        statCard("Artículos en Almacén", products.length, `${totalStock} unidades en stock`),
      ].join("");
    }

    // Renderizar Alertas de Suscripciones & Pagos
    renderSubscriptionAlerts();

    const sellersSummaryEl = $("#dash-sellers-summary");
    if (sellersSummaryEl) {
      sellersSummaryEl.innerHTML = `
        <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
          ${sellers
            .map((s) => {
              const prodCount = products.filter((p) => p.sellerId === s.id && p.status !== "sold").length;
              const limit = s.productLimit || 10;
              const isSuspended = s.status === "suspended";
              return `
            <div style="background:var(--surface-2);border:1px solid ${isSuspended ? "rgba(239,68,68,0.5)" : "var(--border)"};border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:12px">
              <span class="badge-whatsapp">${ICON.wa} +${s.phone}</span>
              <div>
                <div style="display:flex;align-items:center;gap:6px">
                  <b>${s.name}</b>
                  ${isSuspended ? '<span style="color:#ef4444;font-size:10px;font-weight:800">⛔ SUSPENDIDO</span>' : '<span style="color:#22c55e;font-size:10px;font-weight:800">● ACTIVO</span>'}
                </div>
                <div style="font-size:11px;color:var(--text-muted)">
                  Cupo: <b>${prodCount}/${limit}</b> artículos · 📍 ${s.province || "RD"}
                </div>
              </div>
            </div>`;
            })
            .join("")}
        </div>`;
    }

    const lowStockTable = $("#low-stock-table");
    if (lowStockTable) {
      const low = [...products].sort((a, b) => a.stock - b.stock).slice(0, 6);
      lowStockTable.innerHTML = `
        <thead><tr><th>Artículo</th><th>Vendedor</th><th>Precio Venta</th><th>Stock</th><th>Estado Tienda</th></tr></thead>
        <tbody>${low
          .map((p) => {
            const seller = Store.getSeller(p.sellerId);
            const sName = seller?.name || "ZENTRO Principal";
            return `<tr>
              <td><b>${p.brand || "Marca"}</b> ${p.model || ""}</td>
              <td><span class="seller-tag">${sName}</span></td>
              <td>${money(p.price)}</td>
              <td>${stockPill(p.stock)}</td>
              <td>${p.stock > 0 ? '<span style="color:#22c55e;font-size:12px">● Visible</span>' : '<span style="color:var(--danger);font-size:12px">● Oculto al cliente</span>'}</td>
            </tr>`;
          })
          .join("")}</tbody>`;
    }
  };

  /* Renderizar Alertas de Suscripción en Dashboard */
  function renderSubscriptionAlerts() {
    const container = $("#dash-subscription-alerts");
    if (!container) return;

    const sellers = Store.getSellers();
    const today = new Date().toISOString().slice(0, 10);

    // Calcular días restantes
    const alerts = sellers.map((s) => {
      const renewal = s.planRenewalDate || "2026-12-31";
      const diffTime = new Date(renewal) - new Date(today);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { seller: s, diffDays, renewal };
    });

    // Ordenar: suspendidos y vencidos primero
    alerts.sort((a, b) => a.diffDays - b.diffDays);

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px">
        ${alerts
          .map(({ seller: s, diffDays, renewal }) => {
            const isSuspended = s.status === "suspended";
            const isExpired = diffDays <= 0;
            const isSoon = diffDays > 0 && diffDays <= 5;

            let badge = `<span style="color:#22c55e;font-size:12px;font-weight:700">● Al día (Vence en ${diffDays} días · ${renewal})</span>`;
            if (isSuspended) {
              badge = `<span style="color:#ef4444;font-size:12px;font-weight:800;background:rgba(239,68,68,0.15);padding:2px 8px;border-radius:6px">⛔ TIENDA SUSPENDIDA (Artículos ocultos)</span>`;
            } else if (isExpired) {
              badge = `<span style="color:#ef4444;font-size:12px;font-weight:800;background:rgba(239,68,68,0.15);padding:2px 8px;border-radius:6px">⚠️ VENCIDO (Venció el ${renewal})</span>`;
            } else if (isSoon) {
              badge = `<span style="color:#f59e0b;font-size:12px;font-weight:800;background:rgba(245,158,11,0.15);padding:2px 8px;border-radius:6px">🔔 VENCE PRONTO (En ${diffDays} días · ${renewal})</span>`;
            }

            return `
            <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">
              <div>
                <div style="display:flex;align-items:center;gap:10px">
                  <b>${s.name}</b>
                  <span class="seller-tag">${s.planName || "Plan"} · ${money(s.monthlyFee || 1500)}/mes</span>
                </div>
                <div style="margin-top:4px">
                  ${badge} · <b>+${s.phone}</b> · 📍 ${s.province || "RD"}
                </div>
              </div>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <button class="btn-accent" style="font-size:11px;padding:6px 12px;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700" data-renew-plan="${s.id}">
                  💳 Cobrar y Renovar (+30 días)
                </button>
                <button class="btn-whatsapp btn-whatsapp-sm" data-remind-wa="${s.id}">
                  ${ICON.wa} WhatsApp
                </button>
                <button class="btn-ghost" style="font-size:11px;padding:6px 10px;color:${isSuspended ? "#22c55e" : "#ef4444"}" data-toggle-suspend="${s.id}">
                  ${isSuspended ? "✓ Reactivar" : "⛔ Suspender"}
                </button>
              </div>
            </div>`;
          })
          .join("")}
      </div>`;
  }

  /* ============================================================
     NUEVA SECCIÓN: ESTADÍSTICAS & FLUJO (ANALYTICS)
     ============================================================ */
  function renderAnalytics() {
    const analytics = Store.getAnalytics();
    const products = Store.getProducts();
    const sellers = Store.getSellers();

    // 1. Tarjetas Superiores
    const statsEl = $("#analytics-overview-stats");
    if (statsEl) {
      statsEl.innerHTML = [
        statCard("Tráfico Web Total", analytics.pageViews || 0, "Visitas acumuladas"),
        statCard("Visitantes Únicos", analytics.uniqueVisitors || 0, "Dispositivos distintos"),
        statCard("Clics en WhatsApp", analytics.whatsappClicksTotal || 0, "Contactos a vendedores"),
        statCard("Artículos Favoritos", analytics.favoritesTotal || 0, "Deseados por clientes"),
      ].join("");
    }

    // 2. Ranking de Vendedores por Clics a WhatsApp
    const sellerClicks = analytics.whatsappClicksBySeller || {};
    const rankedSellers = [...sellers].map((s) => ({
      ...s,
      clicks: sellerClicks[s.id] || 0,
    }));
    rankedSellers.sort((a, b) => b.clicks - a.clicks);

    const sellersTable = $("#analytics-sellers-table");
    if (sellersTable) {
      sellersTable.innerHTML = `
        <thead>
          <tr><th>Vendedor</th><th>Provincia</th><th>Clics WhatsApp</th><th>Calificación</th></tr>
        </thead>
        <tbody>
          ${rankedSellers
            .map(
              (s, idx) => `
            <tr>
              <td><b>${idx === 0 ? "🥇 " : idx === 1 ? "🥈 " : idx === 2 ? "🥉 " : ""}${s.name}</b></td>
              <td>📍 ${s.province || "RD"}</td>
              <td><b style="color:#22c55e">${s.clicks} clics</b></td>
              <td><span style="color:#facc15;font-weight:700">★ ${s.rating || "5.0"}</span> (${s.ratingCount || 0})</td>
            </tr>`
            )
            .join("")}
        </tbody>`;
    }

    // 3. Ranking de Productos por Clics a WhatsApp
    const productClicks = analytics.whatsappClicksByProduct || {};
    const rankedProds = [...products].map((p) => ({
      ...p,
      clicks: productClicks[p.id] || 0,
    }));
    rankedProds.sort((a, b) => b.clicks - a.clicks);

    const prodsTable = $("#analytics-products-table");
    if (prodsTable) {
      prodsTable.innerHTML = `
        <thead>
          <tr><th>Artículo</th><th>Vendedor</th><th>Precio</th><th>Interés</th></tr>
        </thead>
        <tbody>
          ${rankedProds
            .slice(0, 7)
            .map(
              (p) => `
            <tr>
              <td><b>${p.brand}</b> ${p.model}</td>
              <td><span class="seller-tag">${Store.getSeller(p.sellerId)?.name || "ZENTRO"}</span></td>
              <td>${money(p.price)}</td>
              <td><b style="color:var(--accent)">${p.clicks} clics</b></td>
            </tr>`
            )
            .join("")}
        </tbody>`;
    }

    // 4. Artículos más guardados en favoritos
    const favCounts = analytics.productFavorites || {};
    const favProds = [...products].map((p) => ({
      ...p,
      favs: favCounts[p.id] || 0,
    }));
    favProds.sort((a, b) => b.favs - a.favs);

    const favTable = $("#analytics-favorites-table");
    if (favTable) {
      favTable.innerHTML = `
        <thead>
          <tr><th>Artículo</th><th>Categoría</th><th>Vendedor</th><th>Precio</th><th>Guardados en Favoritos</th></tr>
        </thead>
        <tbody>
          ${favProds
            .slice(0, 6)
            .map(
              (p) => `
            <tr>
              <td><b>${p.brand}</b> ${p.model}</td>
              <td>${p.category || "Baloncesto"}</td>
              <td><span class="seller-tag">${Store.getSeller(p.sellerId)?.name || "ZENTRO"}</span></td>
              <td>${money(p.price)}</td>
              <td><b style="color:#f43f5e">❤️ ${p.favs} veces guardado</b></td>
            </tr>`
            )
            .join("")}
        </tbody>`;
    }
  };

  /* ============================================================
     2. GESTIÓN DE VENDEDORES
     ============================================================ */
  function renderSellers() {
    const sellers = Store.getSellers();
    const products = Store.getProducts();
    const container = $("#sellers-cards-container");
    if (!container) return;

    container.innerHTML = sellers
      .map((s) => {
        const prodCount = products.filter((p) => p.sellerId === s.id && p.status !== "sold").length;
        const limit = Number(s.productLimit) || 10;
        const isSuspended = s.status === "suspended";
        const percent = Math.min(100, Math.round((prodCount / limit) * 100));

        return `
        <div class="seller-card" style="${isSuspended ? "border:1px solid rgba(239,68,68,0.5);background:rgba(239,68,68,0.03)" : ""}">
          <div>
            <div class="seller-card-head">
              <div>
                <div style="display:flex;align-items:center;gap:8px">
                  <b style="font-size:16px">${s.name}</b>
                  ${isSuspended ? '<span style="color:#ef4444;font-size:10px;font-weight:800;background:rgba(239,68,68,0.15);padding:2px 6px;border-radius:4px">SUSPENDIDO</span>' : '<span style="color:#22c55e;font-size:10px;font-weight:800;background:rgba(34,197,94,0.15);padding:2px 6px;border-radius:4px">ACTIVO</span>'}
                </div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:2px">
                  📍 <b>${s.province || "Santo Domingo"}</b> · ${s.notes || "Sin descripción"}
                </div>
              </div>
              <span class="badge-whatsapp">${ICON.wa} WhatsApp</span>
            </div>

            <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:10px">
              +${s.phone}
            </div>

            <!-- Datos de plan y cupo -->
            <div style="background:var(--surface-3);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12px">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span>Cupo de Artículos del Plan:</span>
                <b>${prodCount} / ${limit} artículos (${percent}%)</b>
              </div>
              <div style="height:6px;background:rgba(255,255,255,0.1);border-radius:999px;overflow:hidden;margin-bottom:8px">
                <div style="height:100%;background:${percent >= 100 ? "#ef4444" : "var(--accent)"};width:${percent}%"></div>
              </div>
              <div style="display:flex;justify-content:space-between;color:var(--text-muted);font-size:11px">
                <span>Vencimiento: <b>${s.planRenewalDate || "2026-12-31"}</b></span>
                <span>Mensualidad: <b>${money(s.monthlyFee || 1500)}</b></span>
              </div>
            </div>

            <!-- Credenciales de acceso al portal -->
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:14px;background:rgba(255,85,0,0.06);border:1px solid rgba(255,85,0,0.2);padding:8px 12px;border-radius:8px">
              🔑 Acceso Vendedor: Usuario: <b style="color:#fff">${s.username || "vendedor"}</b> | Clave: <b style="color:#fff">${s.password || "123"}</b>
            </div>
          </div>

          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn-accent" data-renew-plan="${s.id}" style="font-size:11px;padding:6px 10px;cursor:pointer" title="Cobrar cuota mensual y renovar 30 días">
              💳 Cobrar (+30d)
            </button>
            <button class="btn-whatsapp btn-whatsapp-sm" data-remind-wa="${s.id}" style="flex:1" title="Enviar recordatorio de pago con cuentas bancarias">
              ${ICON.wa} WhatsApp
            </button>
            <button class="btn-ghost" data-toggle-suspend="${s.id}" style="font-size:11px;padding:6px 10px;color:${isSuspended ? "#22c55e" : "#ef4444"}" title="Suspende la tienda y oculta sus artículos">
              ${isSuspended ? "✓ Reactivar" : "⛔ Suspender"}
            </button>
            <button class="icon-btn" data-edit-seller="${s.id}" title="Editar vendedor">${ICON.edit}</button>
            <button class="icon-btn del" data-del-seller="${s.id}" title="Eliminar vendedor">${ICON.del}</button>
          </div>
        </div>`;
      })
      .join("");

    updateSellerSelectOptions();
  }

  function updateSellerSelectOptions() {
    const sellers = Store.getSellers();
    const sel = $("#form-seller-select");
    if (!sel) return;
    sel.innerHTML = sellers
      .map((s) => `<option value="${s.id}">${s.name} (+${s.phone}) - Plan ${s.productLimit || 10} Artículos</option>`)
      .join("");
  };

  /* ============================================================
     3. PRODUCTOS
     ============================================================ */
  function renderProducts() {
    const products = Store.getProducts();
    const countEl = $("#products-count");
    if (countEl) countEl.textContent = `(${products.length} artículos en almacén)`;

    const tableEl = $("#products-table");
    if (!tableEl) return;

    tableEl.innerHTML = `
      <thead>
        <tr>
          <th></th>
          <th>Producto</th>
          <th>Vendedor</th>
          <th>Costo Compra</th>
          <th>Precio Venta</th>
          <th>Ganancia/Ud</th>
          <th>Stock</th>
          <th>Destacado / Reporte</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>${
        products.length
          ? products
              .map((p) => {
                const seller = Store.getSeller(p.sellerId);
                const sellerName = seller?.name || "ZENTRO Principal";
                const cost = Number(p.costPrice) || 0;
                const sell = Number(p.price) || 0;
                const profit = sell - cost;
                const isFeatured = Boolean(p.isFeatured);
                const isReported = Boolean(p.reported);

                return `
            <tr style="${isReported ? "background:rgba(239,68,68,0.06)" : ""}">
              <td><div class="thumb"><img src="${thumb(p)}" alt="${p.model || "Artículo"}" /></div></td>
              <td>
                <b>${p.brand || "Marca"}</b> ${p.model || ""}
                <div style="font-size:11px;color:var(--text-muted)">${p.category || "Baloncesto"} · ${p.sizes ? p.sizes.join(", ") : "Única"}</div>
                ${isFeatured ? '<span style="color:#facc15;font-size:10px;font-weight:800;background:rgba(250,204,21,0.15);padding:1px 6px;border-radius:4px">★ DESTACADO VIP</span>' : ""}
                ${isReported ? `<span style="color:#ef4444;font-size:10px;font-weight:800;background:rgba(239,68,68,0.2);padding:1px 6px;border-radius:4px;display:inline-block;margin-top:2px">⚠️ OCULTO: ${p.reportReason || "Infracción de política"}</span>` : ""}
              </td>
              <td><span class="seller-tag">${sellerName}</span></td>
              <td style="color:var(--text-muted)">${money(cost)}</td>
              <td><b>${money(sell)}</b></td>
              <td><span class="pill pill-profit">+${money(profit)}</span></td>
              <td>${stockPill(p.stock)}</td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn-ghost" data-toggle-featured="${p.id}" style="font-size:11px;padding:4px 8px;color:${isFeatured ? "#facc15" : "var(--text-muted)"}" title="${isFeatured ? "Quitar de destacados" : "Hacer destacado (aparece arriba)"}">
                    ★ ${isFeatured ? "Destacado" : "Destacar"}
                  </button>
                  <button class="btn-ghost" data-toggle-report="${p.id}" style="font-size:11px;padding:4px 8px;color:${isReported ? "#22c55e" : "#ef4444"}" title="${isReported ? "Reactivar producto" : "Ocultar por incumplimiento de requisitos"}">
                    ${isReported ? "✓ Reactivar" : "⚠️ Reportar"}
                  </button>
                </div>
              </td>
              <td>
                <div class="row-actions">
                  <button data-edit="${p.id}" title="Editar">${ICON.edit}</button>
                  <button class="del" data-del="${p.id}" title="Eliminar">${ICON.del}</button>
                </div>
              </td>
            </tr>`;
              })
              .join("")
          : `<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--text-muted)">No hay tenis registrados.</td></tr>`
      }</tbody>`;
  }

  /* ============================================================
     4. FINANZAS Y GANANCIAS POR MEMBRESÍAS (ADMINISTRADOR)
     ============================================================ */
  function renderFinances() {
    const adminF = Store.getAdminFinances();
    const sellers = Store.getSellers();

    const gridEl = $("#finances-metrics-grid");
    if (gridEl) {
      gridEl.innerHTML = `
        <div class="finance-card profit">
          <small>Total Cobrado por Membresías</small>
          <b style="color:#22c55e">${money(adminF.totalCollected)}</b>
          <div class="sub">Tus ganancias por cobros a vendedores</div>
        </div>
        <div class="finance-card revenue">
          <small>Mensualidades Proyectadas / Mes</small>
          <b>${money(adminF.projectedMonthly)}</b>
          <div class="sub">Con <b>${adminF.activeSellersCount}</b> tiendas activas</div>
        </div>
        <div class="finance-card cost">
          <small>Tiendas Pagando</small>
          <b style="color:#f59e0b">${adminF.activeSellersCount} de ${adminF.totalSellersCount}</b>
          <div class="sub">Vendedores al día</div>
        </div>
        <div class="finance-card">
          <small>Artículos en Plataforma</small>
          <b>${adminF.totalProductsCount} artículos</b>
          <div class="sub">Inventario total de vendedores</div>
        </div>`;
    }

    const payTableEl = $("#admin-subscription-payments-table");
    if (payTableEl) {
      payTableEl.innerHTML = `
        <thead><tr><th>Recibo ID</th><th>Vendedor</th><th>Plan</th><th>Monto Cobrado</th><th>Nueva Fecha Vencimiento</th><th>Fecha de Cobro</th></tr></thead>
        <tbody>${
          adminF.paymentsHistory.length
            ? adminF.paymentsHistory
                .map((p) => `
              <tr>
                <td><b>${p.id}</b></td>
                <td><b>${p.sellerName}</b></td>
                <td><span class="seller-tag">${p.planName}</span></td>
                <td><b style="color:#22c55e;font-size:14px">+${money(p.amount)}</b></td>
                <td><span style="color:#22c55e;font-weight:700">✓ Vence: ${p.renewalDate}</span></td>
                <td><small style="color:var(--text-muted)">${p.date || p.timestamp?.slice(0, 10)}</small></td>
              </tr>`)
                .join("")
            : `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">Aún no hay cobros registrados. Haz clic en "💳 Cobrar y Renovar" para registrar el pago de un vendedor y sumarlo a tus ganancias.</td></tr>`
        }</tbody>`;
    }

    const sellerTableEl = $("#seller-finances-table");
    if (sellerTableEl) {
      sellerTableEl.innerHTML = `
        <thead><tr><th>Vendedor</th><th>Plan & Cupo</th><th>Mensualidad</th><th>Vencimiento</th><th>Estado</th><th>Acciones de Cobro</th></tr></thead>
        <tbody>${
          sellers.length
            ? sellers
                .map((s) => {
                  const isSuspended = s.status === "suspended";
                  return `
              <tr>
                <td><b>${s.name}</b><br /><small class="badge-whatsapp">${ICON.wa} +${s.phone}</small></td>
                <td>${s.planName || "Plan"} · <b>${s.productLimit || 10} artículos</b></td>
                <td><b>${money(s.monthlyFee || 1500)}</b> / mes</td>
                <td>${s.planRenewalDate || "2026-12-31"}</td>
                <td>${isSuspended ? '<span style="color:#ef4444;font-weight:800;font-size:11px">⛔ Suspendido</span>' : '<span style="color:#22c55e;font-weight:800;font-size:11px">● Al día</span>'}</td>
                <td>
                  <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                    <button class="btn-accent" style="font-size:11px;padding:6px 10px;cursor:pointer" data-renew-plan="${s.id}">
                      💳 Cobrar y Renovar (+30 días)
                    </button>
                    <button class="btn-whatsapp btn-whatsapp-sm" data-remind-wa="${s.id}" title="Enviar recordatorio WhatsApp">
                      ${ICON.wa}
                    </button>
                  </div>
                </td>
              </tr>`;
                })
                .join("")
            : `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted)">No hay vendedores registrados.</td></tr>`
        }</tbody>`;
    }
  }

  /* ============================================================
     5. PEDIDOS WHATSAPP & BOTÓN PENDIENTE DE PAGO
     ============================================================ */
  function renderOrders() {
    const orders = Store.getOrders();
    const tableEl = $("#orders-table");
    if (!tableEl) return;

    tableEl.innerHTML = `
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
  }

  /* ============================================================
     6. INVENTARIO
     ============================================================ */
  function renderInventory() {
    const products = Store.getProducts();
    const tableEl = $("#inventory-table");
    if (!tableEl) return;

    tableEl.innerHTML = `
      <thead><tr><th>Producto</th><th>Vendedor</th><th>Tallas</th><th>Stock Actual</th><th>Estado</th></tr></thead>
      <tbody>${products
        .map((p) => {
          const seller = Store.getSeller(p.sellerId);
          const sName = seller?.name || "ZENTRO Principal";
          return `<tr>
            <td><b>${p.brand || "Marca"}</b> ${p.model || ""}</td>
            <td><span class="seller-tag">${sName}</span></td>
            <td>${(p.sizes || []).join(", ")}</td>
            <td><b>${p.stock}</b> uds</td>
            <td>${stockPill(p.stock)}</td>
          </tr>`;
        })
        .join("")}</tbody>`;
  }

  const RENDERERS = {
    dashboard: renderDashboard,
    analytics: renderAnalytics,
    products: renderProducts,
    add: () => updateSellerSelectOptions(),
    sellers: renderSellers,
    finances: renderFinances,
    orders: renderOrders,
    inventory: renderInventory,
    database: () => {
      const st = Store.getSettings();
      if ($("#setting-bank-details")) $("#setting-bank-details").value = st.bankDetails || "";
      if ($("#setting-reminder-template")) $("#setting-reminder-template").value = st.reminderTemplate || "";
    },
  };

  /* ============================================================
     NAVEGACIÓN & SIDEBAR MÓVIL
     ============================================================ */
  function closeSide() {
    const side = $("#admin-side");
    const sideOverlay = $("#admin-overlay");
    side?.classList.remove("open");
    sideOverlay?.classList.remove("open");
  }

  function goto(section) {
    $$(".admin-section").forEach((s) => s.classList.remove("active"));
    const secEl = $("#sec-" + section);
    if (secEl) secEl.classList.add("active");
    $$(".admin-side a[data-section]").forEach((a) =>
      a.classList.toggle("active", a.dataset.section === section)
    );
    const titleEl = $("#admin-title");
    if (titleEl) titleEl.textContent = TITLES[section] || section;
    if (typeof RENDERERS[section] === "function") {
      try {
        RENDERERS[section]();
      } catch (err) {
        console.warn("Aviso al renderizar sección " + section, err);
      }
    }
    closeSide();
    window.scrollTo({ top: 0 });
  }

  window.adminGoto = goto;

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
    if (!box) return;
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
    if (!form) return;
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
    if ($("#form-is-featured")) $("#form-is-featured").checked = Boolean(p.isFeatured);
    currentImages = [...(p.images || []).slice(0, 3)];
    renderImgPreviews();
    updateProfitPreview();
    const titleEl = $("#form-title");
    if (titleEl) titleEl.textContent = `Editar: ${p.brand} ${p.model}`;
  };

  const resetForm = () => {
    if (!form) return;
    form.reset();
    form.id.value = "";
    if ($("#form-is-featured")) $("#form-is-featured").checked = false;
    currentImages = [];
    renderImgPreviews();
    updateProfitPreview();
    const titleEl = $("#form-title");
    if (titleEl) titleEl.textContent = "Agregar Nuevo Calzado o Artículo";
  };

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const sizes = (data.sizes || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const product = {
      id: data.id || "p" + Date.now(),
      brand: (data.brand || "").trim(),
      model: (data.model || "").trim(),
      category: data.category,
      sellerId: data.sellerId,
      costPrice: parseFloat(data.costPrice) || 0,
      price: parseFloat(data.price) || 0,
      stock: parseInt(data.stock, 10) || 0,
      condition: data.condition,
      color: (data.color || "Negro").trim(),
      gender: data.gender,
      sizes: sizes.length ? sizes : ["8", "9", "10", "11"],
      description: (data.description || "").trim(),
      features: (data.features || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      images: [...currentImages].slice(0, 3), // Máximo 3 fotos
      isFeatured: $("#form-is-featured") ? $("#form-is-featured").checked : false,
      reported: false,
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
    const remaining = 3 - currentImages.length;
    if (remaining <= 0) {
      toast("Máximo 3 fotos permitidas");
      e.target.value = "";
      return;
    }
    toast("Comprimiendo fotos...");
    for (const file of files.slice(0, remaining)) {
      const dataUrl = await compressImage(file);
      currentImages.push(dataUrl);
    }
    renderImgPreviews();
    e.target.value = "";
  });

  $("#add-img-url-btn")?.addEventListener("click", () => {
    if (currentImages.length >= 3) {
      toast("Máximo 3 fotos permitidas");
      return;
    }
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
    if (!sellerForm) return;
    sellerForm.reset();
    if (sellerForm.id) sellerForm.id.value = "";
    if (sellerForm.productLimit) sellerForm.productLimit.value = "10";
    if (sellerForm.monthlyFee) sellerForm.monthlyFee.value = "1500";
    if (sellerForm.planRenewalDate) sellerForm.planRenewalDate.value = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (sellerForm.status) sellerForm.status.value = "active";
    sellerForm.style.display = sellerForm.style.display === "none" ? "grid" : "none";
  });

  $("#cancel-seller-form")?.addEventListener("click", () => {
    if (sellerForm) sellerForm.style.display = "none";
  });

  sellerForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(sellerForm).entries());

    const limit = Number(data.productLimit) || 10;
    const sellerToSave = {
      ...data,
      productLimit: limit,
      monthlyFee: Number(data.monthlyFee) || 1500,
      planName: `Plan ${limit} Artículos`,
      province: data.province || "Santo Domingo",
      username: (data.username || "").trim().toLowerCase(),
      password: data.password || "123",
      status: data.status || "active",
      planRenewalDate: data.planRenewalDate || "2026-12-31",
    };

    Store.saveSeller(sellerToSave);
    toast("✅ ¡Vendedor y plan guardados exitosamente!");
    sellerForm.reset();
    sellerForm.style.display = "none";
    renderSellers();
    renderDashboard();
  });

  /* Configuración Bancaria y Mensaje de Cobro */
  $("#admin-banking-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const accounts = $("#setting-bank-details")?.value.trim() || "";
    const template = $("#setting-reminder-template")?.value.trim() || "";

    Store.saveSettings({
      bankDetails: accounts,
      reminderTemplate: template,
    });
    toast("✅ Cuentas bancarias y plantilla de cobro guardadas.");
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
    const remindWa = e.target.closest("[data-remind-wa]");
    const renewPlan = e.target.closest("[data-renew-plan]");
    const toggleSuspend = e.target.closest("[data-toggle-suspend]");
    const toggleFeatured = e.target.closest("[data-toggle-featured]");
    const toggleReport = e.target.closest("[data-toggle-report]");
    const editSeller = e.target.closest("[data-edit-seller]");
    const delSeller = e.target.closest("[data-del-seller]");
    const preset = e.target.closest("[data-preset]");

    if (nav) goto(nav.dataset.section);
    if (go) goto(go.dataset.goto);

    // Cobrar membresía y renovar plan (+30 días)
    if (renewPlan) {
      const sId = renewPlan.dataset.renewPlan;
      const s = Store.getSeller(sId);
      if (s) {
        const fee = s.monthlyFee || 1500;
        if (confirm(`¿Confirmar cobro de cuota mensual para "${s.name}" por ${money(fee)}?\n\n• Se renueva el plan por 30 días.\n• La tienda se reactiva y sus artículos vuelven a estar visibles.\n• El pago se sumará a tus ganancias de membresías.`)) {
          Store.recordSellerPlanPayment(sId, fee);
          toast(`💳 ¡Cobro de ${money(fee)} registrado a "${s.name}" (+30 días renovado)!`);
          renderDashboard();
          renderFinances();
          renderSellers();
        }
      }
      return;
    }

    // Recordatorio de pago por WhatsApp con cuentas bancarias
    if (remindWa) {
      const s = Store.getSeller(remindWa.dataset.remindWa);
      if (s) sendPaymentReminderWhatsApp(s);
      return;
    }

    // Suspender / Reactivar vendedor
    if (toggleSuspend) {
      const s = Store.getSeller(toggleSuspend.dataset.toggleSuspend);
      if (s) {
        const willSuspend = s.status !== "suspended";
        s.status = willSuspend ? "suspended" : "active";
        Store.saveSeller(s);
        toast(willSuspend ? "⛔ Tienda suspendida. Sus artículos han sido ocultados del público." : "✅ Tienda reactivada. Sus artículos vuelven a estar visibles.");
        renderDashboard();
        renderSellers();
      }
      return;
    }

    // Marcar / Desmarcar producto Destacado VIP
    if (toggleFeatured) {
      const id = toggleFeatured.dataset.toggleFeatured;
      const isFeatured = Store.toggleProductFeatured(id);
      toast(isFeatured ? "★ Artículo marcado como DESTACADO (aparece primero)" : "Artículo retirado de destacados");
      renderProducts();
      return;
    }

    // Reportar / Ocultar producto por infracción de política
    if (toggleReport) {
      const id = toggleReport.dataset.toggleReport;
      const p = Store.getProduct(id);
      if (p.reported) {
        Store.unreportProduct(id);
        toast("✓ Reporte eliminado. El artículo vuelve a estar visible.");
      } else {
        const reason = prompt("Describe el motivo del reporte / infracción a la política de la empresa:", "No cumple con las normas de autenticidad o política de la tienda");
        if (reason !== null && reason.trim()) {
          Store.reportProduct(id, reason.trim());
          toast("⚠️ Artículo reportado y ocultado del catálogo de clientes.");
        }
      }
      renderProducts();
      return;
    }

    // Editar producto
    if (edit) {
      resetForm();
      const p = Store.getProduct(edit.dataset.edit);
      if (p) {
        fillForm(p);
        goto("add");
      }
      return;
    }

    // Eliminar producto
    if (del) {
      if (confirm("¿Eliminar este producto del catálogo?")) {
        Store.deleteProduct(del.dataset.del);
        toast("Producto eliminado");
        renderProducts();
      }
      return;
    }

    // Botón directo "Marcar Pagado" en pedidos entregados
    if (markPaid) {
      Store.updateOrderStatus(markPaid.dataset.markPaid, "Pagado");
      toast("¡Pedido marcado como PAGADO!");
      renderOrders();
      renderDashboard();
      return;
    }

    // Eliminar pedido
    if (delOrder) {
      if (confirm("¿Eliminar este pedido del historial?")) {
        Store.deleteOrder(delOrder.dataset.delOrder);
        toast("Pedido eliminado");
        renderOrders();
      }
      return;
    }

    // Probar WhatsApp de un vendedor específico
    if (testSellerWa) {
      const phone = (testSellerWa.dataset.testSellerWa || "").replace(/[^0-9]/g, "");
      const msg = encodeURIComponent("Hola, prueba de conexión de WhatsApp desde ZENTRO.");
      window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${msg}`, "_blank");
      return;
    }

    // Editar vendedor
    if (editSeller) {
      const s = Store.getSeller(editSeller.dataset.editSeller);
      if (s && sellerForm) {
        if (sellerForm.id) sellerForm.id.value = s.id;
        if (sellerForm.name) sellerForm.name.value = s.name;
        if (sellerForm.phone) sellerForm.phone.value = s.phone;
        if (sellerForm.province) sellerForm.province.value = s.province || "Santo Domingo";
        if (sellerForm.productLimit) sellerForm.productLimit.value = s.productLimit || 10;
        if (sellerForm.username) sellerForm.username.value = s.username || "";
        if (sellerForm.password) sellerForm.password.value = s.password || "123";
        if (sellerForm.monthlyFee) sellerForm.monthlyFee.value = s.monthlyFee || 1500;
        if (sellerForm.planRenewalDate) sellerForm.planRenewalDate.value = s.planRenewalDate || "2026-12-31";
        if (sellerForm.status) sellerForm.status.value = s.status || "active";
        if (sellerForm.notes) sellerForm.notes.value = s.notes || "";
        sellerForm.style.display = "grid";
        window.scrollTo({ top: sellerForm.offsetTop - 40, behavior: "smooth" });
      }
      return;
    }

    // Eliminar vendedor
    if (delSeller) {
      if (confirm("¿Eliminar este vendedor?")) {
        if (Store.deleteSeller(delSeller.dataset.delSeller)) {
          toast("Vendedor eliminado");
          renderSellers();
        }
      }
      return;
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
  $("#admin-toggle")?.addEventListener("click", () => {
    $("#admin-side")?.classList.add("open");
    $("#admin-overlay")?.classList.add("open");
  });
  $("#admin-overlay")?.addEventListener("click", closeSide);

  /* Botón reiniciar analíticas a cero */
  $("#reset-analytics-btn")?.addEventListener("click", () => {
    if (confirm("¿Estás seguro de reiniciar las estadísticas de visitas y clics a cero?")) {
      Store.resetAnalytics();
      toast("✅ Estadísticas reiniciadas a 0");
      renderAnalytics();
    }
  });

  /* Formulario cambiar contraseña de administrador en Firebase */
  $("#admin-change-password-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const current = ($("#pw-current")?.value || "").trim();
    const newP = ($("#pw-new")?.value || "").trim();
    const conf = ($("#pw-confirm")?.value || "").trim();

    if (!current) {
      toast("Introduce tu contraseña actual");
      return;
    }
    if (newP.length < 4) {
      toast("La nueva contraseña debe tener al menos 4 caracteres");
      return;
    }
    if (newP !== conf) {
      toast("❌ Las nuevas contraseñas no coinciden");
      return;
    }

    toast("Verificando contraseña actual...");
    const isValid = await Store.validateMasterPinAsync(current);
    if (!isValid) {
      toast("❌ La contraseña actual es incorrecta");
      return;
    }

    toast("Actualizando contraseña en Firebase...");
    await Store.setMasterPin(newP);
    toast("✅ ¡Contraseña actualizada y guardada en Firebase!");
    $("#admin-change-password-form").reset();
  });

  /* Botones de cerrar sesión y cambio de PIN */
  const handleLogout = () => {
    lockAdmin();
    toast("🔒 Sesión cerrada correctamente");
  };
  $("#lock-admin-btn")?.addEventListener("click", handleLogout);
  $("#topbar-logout-btn")?.addEventListener("click", handleLogout);

  $("#change-pin-btn")?.addEventListener("click", () => {
    goto("database");
    setTimeout(() => {
      $("#pw-current")?.focus();
      window.scrollTo({ top: $("#card-security-pin")?.offsetTop - 20, behavior: "smooth" });
    }, 100);
  });

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

  /* Suscripción en tiempo real a cambios de Firestore / Store */
  if (window.Store && typeof Store.subscribe === "function") {
    Store.subscribe(() => {
      try {
        const activeSec = $(".admin-section.active")?.id?.replace("sec-", "") || "dashboard";
        if (typeof RENDERERS[activeSec] === "function") {
          RENDERERS[activeSec]();
        }
      } catch (err) {
        console.warn("Aviso al refrescar admin por cambios en la tienda:", err);
      }
    });
  }

  /* Init */
  goto("dashboard");
})();
