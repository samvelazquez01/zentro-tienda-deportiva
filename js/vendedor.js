/* ============================================================
   Portal de Vendedores - Lógica ZENTRO
   ------------------------------------------------------------
   1. Inicio de sesión con usuario y contraseña
   2. Control estricto de cupo por plan (ej. 10 productos)
   3. Máximo 3 fotos por artículo con compresión local
   4. Botón "Marcar como Vendido" para liberar cupo mensual
   5. Edición de perfil, WhatsApp y provincia
   6. Estadísticas de clics y calificaciones verificadas
   ============================================================ */

(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const getCurrency = () => Store.getSettings().currency || "$";
  const money = (n) => getCurrency() + Number(n || 0).toFixed(2);

  let currentSeller = null;
  let currentImages = []; // Máximo 3 imágenes

  /* ---------- Toast ---------- */
  let toastTimer;
  const toast = (msg) => {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
  };

  /* ---------- Compresión de imágenes a WebP / JPEG (máx 1200px) ---------- */
  const compressImage = (file, maxDimension = 1200, quality = 0.82) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  /* ============================================================
     AUTENTICACIÓN DE VENDEDOR
     ============================================================ */
  const initAuth = () => {
    // Verificar si hay sesión previa guardada
    const saved = Store.getCurrentSeller();
    if (saved) {
      const live = Store.getSeller(saved.id);
      if (live) {
        showSellerPanel(live);
        return;
      }
    }
    showLoginScreen();
  };

  const showLoginScreen = () => {
    $("#seller-auth-screen").style.display = "flex";
    $("#seller-app").style.display = "none";
  };

  const showSellerPanel = (seller) => {
    currentSeller = seller;
    $("#seller-auth-screen").style.display = "none";
    $("#seller-app").style.display = "block";

    renderSellerHeader();
    renderQuotaDisplay();
    renderProductsTable();
    renderSellerFinances();
    renderProfileForm();
    renderStatsAndRatings();
  };

  /* ============================================================
     RENDER HEADER & PLAN
     ============================================================ */
  const renderSellerHeader = () => {
    if (!currentSeller) return;
    $("#header-seller-name").textContent = currentSeller.name;
    $("#header-seller-prov").textContent = `📍 ${currentSeller.province || "RD"} · +${currentSeller.phone}`;

    const quota = Store.getSellerProductQuota(currentSeller.id);
    $("#header-plan-badge").textContent = `${currentSeller.planName || "Plan"} (${quota.count}/${quota.limit})`;

    // Banner si está suspendido o próximo a vencer
    const banner = $("#seller-alert-banner");
    const today = new Date().toISOString().slice(0, 10);
    const renewal = currentSeller.planRenewalDate || "2026-12-31";

    if (currentSeller.status === "suspended") {
      banner.style.display = "block";
      banner.style.background = "#ef4444";
      banner.style.color = "#fff";
      banner.style.padding = "12px 20px";
      banner.style.fontWeight = "700";
      banner.style.fontSize = "13px";
      banner.style.textAlign = "center";
      banner.innerHTML = `⚠️ <b>ATENCIÓN:</b> Tu tienda se encuentra temporalmente suspendida por falta de pago. Tus artículos no son visibles en el catálogo público hasta que el Administrador confirme tu renovación.`;
    } else if (renewal <= today) {
      banner.style.display = "block";
      banner.style.background = "#f59e0b";
      banner.style.color = "#000";
      banner.style.padding = "10px 20px";
      banner.style.fontWeight = "700";
      banner.style.fontSize = "13px";
      banner.style.textAlign = "center";
      banner.innerHTML = `🔔 <b>AVISO DE PAGO:</b> El pago de tu plan venció el <b>${renewal}</b>. Por favor realiza tu transferencia para evitar la suspensión de tus productos.`;
    } else {
      banner.style.display = "none";
    }
  };

  /* ============================================================
     RENDER CUOTA Y LÍMITES
     ============================================================ */
  const renderQuotaDisplay = () => {
    if (!currentSeller) return;
    const q = Store.getSellerProductQuota(currentSeller.id);
    const percent = Math.min(100, Math.round((q.count / q.limit) * 100));

    $("#seller-quota-display").innerHTML = `
      <div>
        <div style="font-size:12px;font-weight:800;color:var(--accent);letter-spacing:0.05em;text-transform:uppercase">
          Capacidad de tu suscripción
        </div>
        <div style="font-size:20px;font-weight:900;color:#fff;margin-top:2px">
          ${q.count} de ${q.limit} artículos publicados
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">
          ${q.remaining > 0 ? `Te quedan <b style="color:#22c55e">${q.remaining} espacios disponibles</b> para subir artículos.` : `<b style="color:#ef4444">Has alcanzado el límite de tu plan.</b>`}
        </div>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);font-weight:700">
          <span>Ocupación del plan</span>
          <span>${percent}%</span>
        </div>
        <div class="seller-quota-progress-bar">
          <div class="seller-quota-progress-fill" style="width:${percent}%"></div>
        </div>
      </div>`;

    // Alertar en el formulario de agregar si se superó el límite
    const limitAlert = $("#seller-quota-limit-alert");
    const submitBtn = $("#seller-submit-prod-btn");
    const isEditing = Boolean($("#prod-id-field").value);

    if (!q.canAdd && !isEditing) {
      if (limitAlert) limitAlert.style.display = "block";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.5";
        submitBtn.style.cursor = "not-allowed";
        submitBtn.title = "Alcanzaste el límite de tu plan";
      }
    } else {
      if (limitAlert) limitAlert.style.display = "none";
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
        submitBtn.style.cursor = "pointer";
      }
    }
  };

  /* ============================================================
     RENDER TABLA DE PRODUCTOS DEL VENDEDOR
     ============================================================ */
  const renderProductsTable = () => {
    if (!currentSeller) return;
    const allProds = Store.getProducts();
    const myProds = allProds.filter((p) => p.sellerId === currentSeller.id);
    const table = $("#seller-products-table");
    $("#seller-prod-count").textContent = `(${myProds.length} en total)`;

    if (!myProds.length) {
      table.innerHTML = `<tbody><tr><td style="text-align:center;padding:40px;color:var(--text-muted)">Aún no has subido productos a tu tienda. Haz clic en <b>"+ Subir Artículo"</b> para comenzar.</td></tr></tbody>`;
      return;
    }

    const analytics = Store.getAnalytics();
    const clicksMap = analytics.whatsappClicksByProduct || {};

    table.innerHTML = `
      <thead>
        <tr>
          <th>Foto</th>
          <th>Tenis / Artículo</th>
          <th>Precio</th>
          <th>Stock</th>
          <th>Clics WhatsApp</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${myProds
          .map((p) => {
            const img = p.images && p.images[0] ? p.images[0] : "";
            const isSold = p.status === "sold" || p.stock <= 0;
            const waClicks = clicksMap[p.id] || 0;

            return `
            <tr style="${isSold ? "opacity:0.65" : ""}">
              <td>
                <div class="table-img">
                  ${img ? `<img src="${img}" alt="${p.model}" />` : "👟"}
                </div>
              </td>
              <td>
                <b>${p.brand}</b> ${p.model}
                <div style="font-size:11px;color:var(--text-muted)">
                  ${p.category} · ${p.color || "Varios"} · ${p.sizes ? p.sizes.join(", ") : "Única"}
                  ${p.isFeatured ? '<span style="color:#facc15;font-weight:800;margin-left:6px">★ Destacado</span>' : ""}
                  ${p.reported ? '<span style="color:#ef4444;font-weight:800;margin-left:6px">⚠️ Oculto por Políticas</span>' : ""}
                </div>
              </td>
              <td><b>${money(p.price)}</b></td>
              <td>
                ${
                  isSold
                    ? '<span class="pill-sold">Vendido / Agotado</span>'
                    : `<span class="pill ok">${p.stock} uds</span>`
                }
              </td>
              <td>
                <span class="badge-whatsapp" style="font-size:11px">💬 ${waClicks} clics</span>
              </td>
              <td>
                ${
                  p.reported
                    ? '<span style="color:#ef4444;font-size:11px;font-weight:700">Infracción</span>'
                    : isSold
                    ? '<span style="color:var(--text-muted);font-size:11px;font-weight:700">Vendido (Liberó cupo)</span>'
                    : '<span style="color:#22c55e;font-size:11px;font-weight:700">● Visible en Tienda</span>'
                }
              </td>
              <td>
                <div style="display:flex;gap:6px;align-items:center">
                  ${
                    !isSold
                      ? `<button class="btn-sold" data-mark-sold="${p.id}" title="Marcar como vendido y liberar cupo de tu plan">
                           ✓ Marcar Vendido
                         </button>`
                      : ""
                  }
                  <button class="icon-btn" data-edit-prod="${p.id}" title="Editar">${ICON.edit}</button>
                  <button class="icon-btn del" data-del-prod="${p.id}" title="Eliminar">${ICON.del}</button>
                </div>
              </td>
            </tr>`;
          })
          .join("")}
      </tbody>`;
  };

  const ICON = {
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>',
    del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
  };

  /* ============================================================
     IMÁGENES (MÁXIMO 3 FOTOS)
     ============================================================ */
  const renderImgPreviews = () => {
    const container = $("#seller-img-previews");
    const counter = $("#seller-img-counter");
    if (!container) return;

    counter.textContent = `${currentImages.length} / 3 fotos`;

    container.innerHTML = currentImages
      .map(
        (url, idx) => `
      <div class="preview-item">
        <img src="${url}" alt="Foto ${idx + 1}" />
        <span class="preview-badge">Foto ${idx + 1}</span>
        <button type="button" class="preview-del" data-remove-img="${idx}">✕</button>
      </div>`
      )
      .join("");
  };

  const addImage = (url) => {
    if (currentImages.length >= 3) {
      toast("Máximo 3 fotos permitidas por producto");
      return false;
    }
    currentImages.push(url);
    renderImgPreviews();
    return true;
  };

  /* ============================================================
     PREVIEW DE GANANCIA DEL VENDEDOR
     ============================================================ */
  const updateSellerProfitPreview = () => {
    const cost = parseFloat($("#seller-cost-price")?.value) || 0;
    const sell = parseFloat($("#seller-price")?.value) || 0;
    const profit = sell - cost;
    const margin = sell > 0 ? (profit / sell) * 100 : 0;
    const el = $("#seller-profit-preview");
    if (el) {
      el.textContent = `Ganancia estimada: ${money(profit)} (${margin.toFixed(1)}% margen)`;
      el.style.color = profit >= 0 ? "#22c55e" : "#ef4444";
    }
  };

  /* ============================================================
     FORMULARIO DE PRODUCTO (AGREGAR / EDITAR)
     ============================================================ */
  const openEditProduct = (prodId) => {
    const p = Store.getProduct(prodId);
    if (!p) return;

    $("#seller-form-title").textContent = `Editar Artículo: ${p.brand} ${p.model}`;
    const form = $("#seller-product-form");
    form.id.value = p.id;
    form.brand.value = p.brand || "";
    form.model.value = p.model || "";
    form.category.value = p.category || "Tenis Deportivo";
    if (form.sport) form.sport.value = p.sport || (p.category === "Baloncesto" ? "Baloncesto" : "Multideporte / General");
    if (form.costPrice) form.costPrice.value = p.costPrice || "";
    form.price.value = p.price || "";
    form.stock.value = p.stock || 1;
    form.condition.value = p.condition || "Nuevo";
    form.color.value = p.color || "";
    form.gender.value = p.gender || "Unisex";
    form.sizes.value = (p.sizes || []).join(", ");
    form.description.value = p.description || "";

    // Sincronizar checkboxes de categorías
    const pCats = Array.isArray(p.categories) ? p.categories : [p.category].filter(Boolean);
    $$(".seller-cat-check").forEach((cb) => {
      cb.checked = pCats.includes(cb.value);
    });
    if (p.category === "Baloncesto" || p.sport === "Baloncesto" || pCats.includes("Baloncesto")) {
      const bCb = $("#seller-cat-baloncesto");
      const dCb = $("#seller-cat-deportivo");
      if (bCb) bCb.checked = true;
      if (dCb) dCb.checked = true;
    }

    currentImages = Array.isArray(p.images) ? [...p.images.slice(0, 3)] : [];
    renderImgPreviews();
    updateSellerProfitPreview();

    switchTab("add");
    renderQuotaDisplay();
  };

  const resetProductForm = () => {
    $("#seller-form-title").textContent = "Publicar Nuevo Artículo";
    const form = $("#seller-product-form");
    form.reset();
    form.id.value = "";
    if (form.costPrice) form.costPrice.value = "";
    $$(".seller-cat-check").forEach((cb) => (cb.checked = false));
    currentImages = [];
    renderImgPreviews();
    updateSellerProfitPreview();
    renderQuotaDisplay();
  };

  /* ============================================================
     FINANZAS Y GANANCIAS DEL VENDEDOR (PRECIO VENTA - PRECIO COSTO)
     ============================================================ */
  const renderSellerFinances = () => {
    if (!currentSeller) return;
    const fin = Store.getSellerFinances(currentSeller.id);

    const metricsEl = $("#seller-finances-metrics-grid");
    if (metricsEl) {
      metricsEl.innerHTML = `
        <div class="stat" style="border-left:4px solid #22c55e">
          <small>Mi Ganancia Neta Total</small>
          <b style="color:#22c55e;font-size:24px">+${money(fin.netProfit)}</b>
          <span class="trend">Margen real: ${fin.marginPercent.toFixed(1)}%</span>
        </div>
        <div class="stat">
          <small>Total en Ventas</small>
          <b style="font-size:24px">${money(fin.totalSales)}</b>
          <span class="trend">${fin.soldUnits} artículos vendidos</span>
        </div>
        <div class="stat">
          <small>Costo de Compra Invertido</small>
          <b style="color:#f59e0b;font-size:24px">${money(fin.totalCost)}</b>
          <span class="trend">Inversión recuperada</span>
        </div>
        <div class="stat">
          <small>Artículos Vendidos</small>
          <b style="font-size:24px">${fin.soldUnits} uds</b>
          <span class="trend">Cupos liberados para reponer</span>
        </div>`;
    }

    const tableEl = $("#seller-sold-history-table");
    if (tableEl) {
      tableEl.innerHTML = `
        <thead>
          <tr>
            <th>Foto</th>
            <th>Artículo Vendido</th>
            <th>Costo Compra</th>
            <th>Precio Venta</th>
            <th>Tu Ganancia Neta</th>
            <th>Fecha Vendido</th>
          </tr>
        </thead>
        <tbody>
          ${fin.soldProducts && fin.soldProducts.length
            ? fin.soldProducts
                .map((p) => {
                  const img = p.images && p.images[0] ? p.images[0] : "";
                  const cost = Number(p.costPrice) || 0;
                  const sell = Number(p.price) || 0;
                  const profit = sell - cost;
                  return `
                <tr>
                  <td><div class="table-img">${img ? `<img src="${img}" alt="${p.model}" />` : "📦"}</div></td>
                  <td>
                    <b>${p.brand}</b> ${p.model}
                    <div style="font-size:11px;color:var(--text-muted)">${p.category || "General"} · ${p.sizes ? p.sizes.join(", ") : "Única"}</div>
                  </td>
                  <td style="color:var(--text-muted)">${money(cost)}</td>
                  <td><b>${money(sell)}</b></td>
                  <td><b style="color:#22c55e;font-size:15px">+${money(profit)}</b></td>
                  <td><small style="color:var(--text-muted)">${p.soldAt || p.createdAt?.slice(0, 10) || "Reciente"}</small></td>
                </tr>`;
                })
                .join("")
            : `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted)">Aún no tienes artículos marcados como vendidos.<br /><br />Cuando vendas un producto, haz clic en el botón <b>"✓ Marcar Vendido"</b> en la pestaña de <b>Mis Artículos</b> para registrar tu ganancia neta y liberar automáticamente tu cupo para subir otro.</td></tr>`
          }
        </tbody>`;
    }
  };

  /* ============================================================
     PERFIL DEL VENDEDOR
     ============================================================ */
  const renderProfileForm = () => {
    if (!currentSeller) return;
    $("#prof-name").value = currentSeller.name || "";
    $("#prof-phone").value = currentSeller.phone || "";
    $("#prof-province").value = currentSeller.province || "Santo Domingo";
    $("#prof-username").value = currentSeller.username || "";
    $("#prof-password").value = currentSeller.password || "";
    $("#prof-notes").value = currentSeller.notes || "";
  };

  /* ============================================================
     ESTADÍSTICAS Y RESEÑAS
     ============================================================ */
  const renderStatsAndRatings = () => {
    if (!currentSeller) return;
    const analytics = Store.getAnalytics();
    const myProds = Store.getProducts().filter((p) => p.sellerId === currentSeller.id);
    const sellerClicks = (analytics.whatsappClicksBySeller || {})[currentSeller.id] || 0;

    const cardsContainer = $("#seller-stats-cards");
    cardsContainer.innerHTML = `
      <div class="stat"><small>Clics en mi WhatsApp</small><b>${sellerClicks}</b><span class="trend">Clientes contactados</span></div>
      <div class="stat"><small>Artículos Publicados</small><b>${myProds.length}</b><span class="trend">En tienda</span></div>
      <div class="stat"><small>Calificación Promedio</small><b>★ ${currentSeller.rating || "5.0"}</b><span class="trend">${currentSeller.ratingCount || 0} opiniones</span></div>
    `;

    $("#seller-avg-rating-badge").textContent = `★ ${currentSeller.rating || "5.0"} (${currentSeller.ratingCount || 0} opiniones)`;

    // Lista de calificaciones verificadas de este vendedor
    const ratings = Store.getRatings(currentSeller.id);
    const listContainer = $("#seller-ratings-list");

    if (!ratings.length) {
      listContainer.innerHTML = `
        <div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px">
          Aún no tienes calificaciones registradas. Cuando tus clientes completen su compra por WhatsApp, podrán dejar su valoración verificada con su número de pedido.
        </div>`;
      return;
    }

    listContainer.innerHTML = ratings
      .map(
        (r) => `
      <div class="rating-item">
        <div class="rating-header">
          <div>
            <b>${r.customerName}</b>
            <span style="color:#22c55e;font-size:11px;font-weight:700;margin-left:8px">✓ Compra Verificada (Pedido #${r.orderId})</span>
          </div>
          <span style="color:#facc15;font-weight:800;font-size:13px">${"★".repeat(r.stars)}</span>
        </div>
        <p style="margin:4px 0 0;font-size:13px;color:var(--text);line-height:1.5">${r.comment || "Sin comentario escrito."}</p>
        <div style="font-size:11px;color:var(--text-muted);margin-top:6px">${r.date}</div>
      </div>`
      )
      .join("");
  };

  /* ============================================================
     CAMBIO DE PESTAÑAS
     ============================================================ */
  const switchTab = (tabName) => {
    $$(".seller-tab-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.tab === tabName);
    });
    $$(".seller-section").forEach((sec) => {
      sec.classList.toggle("active", sec.id === `sec-seller-${tabName}`);
    });
    if (tabName === "finances") {
      renderSellerFinances();
    } else if (tabName === "products") {
      renderProductsTable();
      renderQuotaDisplay();
    } else if (tabName === "stats") {
      renderStatsAndRatings();
    }
  };

  /* ============================================================
     EVENT LISTENERS
     ============================================================ */
  const setupEvents = () => {
    // 1. Login Form (Autenticación en Firebase y Local)
    $("#seller-login-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = $("#seller-user-input").value;
      const pass = $("#seller-pass-input").value;
      toast("Verificando credenciales en Firebase...");

      const seller = await Store.authenticateSellerAsync(user, pass);
      if (!seller) {
        toast("Usuario o contraseña incorrectos. Revisa con el Administrador.");
        return;
      }

      Store.setCurrentSeller(seller);
      showSellerPanel(seller);
      toast(`¡Bienvenido, ${seller.name}!`);
    });

    // 2. Logout
    $("#seller-logout-btn")?.addEventListener("click", () => {
      Store.logoutSeller();
      currentSeller = null;
      showLoginScreen();
      toast("Sesión cerrada.");
    });

    // 3. Tab switching
    $$(".seller-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        if (tab === "add" && !$("#prod-id-field").value) {
          resetProductForm();
        }
        switchTab(tab);
      });
    });

    $("#btn-goto-add")?.addEventListener("click", () => {
      resetProductForm();
      switchTab("add");
    });

    $("#seller-cancel-form")?.addEventListener("click", () => {
      resetProductForm();
      switchTab("products");
    });

    // 4. Subida y compresión de fotos (máximo 3)
    $("#seller-img-input")?.addEventListener("change", async (e) => {
      const files = [...(e.target.files || [])];
      if (!files.length) return;

      const availableSlots = 3 - currentImages.length;
      if (availableSlots <= 0) {
        toast("Ya alcanzaste el máximo de 3 fotos.");
        e.target.value = "";
        return;
      }

      const toProcess = files.slice(0, availableSlots);
      toast("Comprimiendo fotos...");

      for (const file of toProcess) {
        try {
          const dataUrl = await compressImage(file);
          addImage(dataUrl);
        } catch (err) {
          console.error("Error al comprimir foto:", err);
        }
      }

      e.target.value = "";
    });

    // 5. Agregar foto por URL
    $("#seller-add-url-btn")?.addEventListener("click", () => {
      const input = $("#seller-img-url-input");
      const url = (input.value || "").trim();
      if (!url) return;
      if (addImage(url)) {
        input.value = "";
      }
    });

    // 6. Eliminar foto del preview
    $("#seller-img-previews")?.addEventListener("click", (e) => {
      const delBtn = e.target.closest("[data-remove-img]");
      if (!delBtn) return;
      const idx = Number(delBtn.dataset.removeImg);
      currentImages.splice(idx, 1);
      renderImgPreviews();
    });

    // 7. Presets de tallas
    $$(".quick-size-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const input = $("#seller-sizes-input");
        const preset = btn.dataset.preset;
        if (preset === "sneakers") input.value = "8, 8.5, 9, 9.5, 10, 10.5, 11, 12";
        else if (preset === "clothing") input.value = "S, M, L, XL, 2XL";
        else if (preset === "one") input.value = "Ajustable / Única";
      });
    });

    // 7.1 Ayudante de categorías para vendedor
    $("#seller-category")?.addEventListener("change", (e) => {
      if (e.target.value === "Baloncesto") {
        const b = $("#seller-cat-baloncesto");
        const d = $("#seller-cat-deportivo");
        if (b) b.checked = true;
        if (d) d.checked = true;
        if ($("#seller-sport")) $("#seller-sport").value = "Baloncesto";
      } else if (e.target.value === "Tenis Deportivo") {
        const d = $("#seller-cat-deportivo");
        if (d) d.checked = true;
      }
    });

    $("#seller-sport")?.addEventListener("change", (e) => {
      if (e.target.value === "Baloncesto") {
        const b = $("#seller-cat-baloncesto");
        const d = $("#seller-cat-deportivo");
        if (b) b.checked = true;
        if (d) d.checked = true;
      }
    });

    // 8. Enviar formulario de producto
    $("#seller-product-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!currentSeller) return;

      const form = e.target;
      const isEditing = Boolean(form.id.value);

      // Si no está editando, validar cupo de plan
      if (!isEditing) {
        const quota = Store.getSellerProductQuota(currentSeller.id);
        if (!quota.canAdd) {
          toast("Límite de plan alcanzado. Marca un artículo como vendido o solicita ampliación.");
          return;
        }
      }

      const id = form.id.value || "p_" + Date.now();
      const rawSizes = (form.sizes.value || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const selectedCats = $$(".seller-cat-check:checked").map((cb) => cb.value);
      const mainCategory = form.category.value || "Tenis Deportivo";
      if (!selectedCats.includes(mainCategory)) selectedCats.unshift(mainCategory);
      if (mainCategory === "Baloncesto" || form.sport?.value === "Baloncesto" || selectedCats.includes("Baloncesto")) {
        if (!selectedCats.includes("Tenis Deportivo")) selectedCats.push("Tenis Deportivo");
        if (!selectedCats.includes("Baloncesto")) selectedCats.push("Baloncesto");
      }

      const productData = {
        id: id,
        sellerId: currentSeller.id,
        brand: form.brand.value.trim(),
        model: form.model.value.trim(),
        category: mainCategory,
        categories: selectedCats,
        sport: form.sport?.value || (selectedCats.includes("Baloncesto") ? "Baloncesto" : "General"),
        costPrice: Number(form.costPrice?.value) || 0,
        price: Number(form.price.value) || 0,
        stock: Number(form.stock.value) || 0,
        condition: form.condition.value,
        color: form.color.value.trim(),
        gender: form.gender.value,
        sizes: rawSizes.length ? rawSizes : ["Única"],
        description: form.description.value.trim(),
        images: currentImages.slice(0, 3),
        status: Number(form.stock.value) > 0 ? "active" : "sold",
        createdAt: isEditing ? (Store.getProduct(id)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      };

      Store.saveProduct(productData);
      toast(isEditing ? "¡Artículo actualizado correctamente!" : "¡Artículo publicado en tu tienda!");

      resetProductForm();
      switchTab("products");
      renderProductsTable();
      renderQuotaDisplay();
      renderSellerFinances();
    });

    // 8.1 Escuchar cambios de costo y precio para preview de ganancia
    $("#seller-cost-price")?.addEventListener("input", updateSellerProfitPreview);
    $("#seller-price")?.addEventListener("input", updateSellerProfitPreview);

    // 9. Acciones en la tabla de productos (Marcar vendido, Editar, Eliminar)
    $("#seller-products-table")?.addEventListener("click", (e) => {
      // Marcar vendido
      const soldBtn = e.target.closest("[data-mark-sold]");
      if (soldBtn) {
        const id = soldBtn.dataset.markSold;
        if (confirm("¿Confirmas que este artículo ya se vendió? Se marcará como vendido, se calculará tu ganancia neta y se liberará 1 cupo de tu plan para que puedas subir otro este mes.")) {
          Store.markProductAsSold(id);
          toast("¡Artículo marcado como vendido! Tienes 1 cupo nuevo liberado.");
          renderProductsTable();
          renderQuotaDisplay();
          renderSellerFinances();
        }
        return;
      }

      // Editar
      const editBtn = e.target.closest("[data-edit-prod]");
      if (editBtn) {
        openEditProduct(editBtn.dataset.editProd);
        return;
      }

      // Eliminar
      const delBtn = e.target.closest("[data-del-prod]");
      if (delBtn) {
        if (confirm("¿Estás seguro de eliminar este artículo de tu tienda?")) {
          Store.deleteProduct(delBtn.dataset.delProd);
          toast("Artículo eliminado.");
          renderProductsTable();
          renderQuotaDisplay();
          renderSellerFinances();
        }
        return;
      }
    });

    // 10. Guardar cambios de perfil
    $("#seller-profile-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!currentSeller) return;

      const form = e.target;
      const updated = {
        ...currentSeller,
        name: form.name.value.trim(),
        phone: form.phone.value.trim().replace(/[^0-9]/g, ""),
        province: form.province.value,
        notes: form.notes.value.trim(),
      };

      if (form.password.value) {
        updated.password = form.password.value.trim();
      }

      currentSeller = Store.saveSeller(updated);
      Store.setCurrentSeller(currentSeller);
      toast("¡Perfil de tienda actualizado con éxito!");
      renderSellerHeader();
    });

    // Suscribirse a cambios en Store
    Store.subscribe(() => {
      if (currentSeller) {
        const refreshed = Store.getSeller(currentSeller.id);
        if (refreshed) {
          currentSeller = refreshed;
          renderSellerHeader();
          renderQuotaDisplay();
          renderProductsTable();
          renderSellerFinances();
          renderStatsAndRatings();
        }
      }
    });
  };

  // Inicializar
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initAuth();
      setupEvents();
    });
  } else {
    initAuth();
    setupEvents();
  }
})();