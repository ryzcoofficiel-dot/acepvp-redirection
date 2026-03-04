const WORKER_API_BASE = "https://acepvp-ratings.ryzcoofficiel.workers.dev";

const PRODUCTS = [
  { id: "coins_500", name: "500 AceCoins", category: "AceCoins", badge: "coins", image: "assets/ace_logo.png" },
  { id: "coins_1000", name: "1000 AceCoins", category: "AceCoins", badge: "coins", image: "assets/ace_logo.png" },
  { id: "coins_2000", name: "2000 AceCoins", category: "AceCoins", badge: "coins", image: "assets/ace_logo.png" },
  { id: "coins_5000", name: "5000 AceCoins", category: "AceCoins", badge: "coins", image: "assets/ace_logo.png" },
  { id: "coins_10000", name: "10000 AceCoins", category: "AceCoins", badge: "coins", image: "assets/ace_logo.png" },

  { id: "vehicle_21x90", name: "2021 X90 Blindée", category: "Véhicules blindés", badge: "vehicles", image: "assets/vehicles/x90_2021.png" },
  { id: "vehicle_mk2s95", name: "Karin S95 Blindée", category: "Véhicules blindés", badge: "vehicles", image: "assets/vehicles/karin_s95.png" },
  { id: "vehicle_mk2baggeds95", name: "Karin S95 Bagged Blindée", category: "Véhicules blindés", badge: "vehicles", image: "assets/vehicles/karin_s95_bagged.png" },
  { id: "vehicle_smash_schafter3", name: "Benefactor Schafter RS Blindée", category: "Véhicules blindés", badge: "vehicles", image: "assets/vehicles/benefactor_schafter.png" },
  { id: "vehicle_scharmann", name: "Benefactor Scharmann Blindée", category: "Véhicules blindés", badge: "vehicles", image: "assets/vehicles/benefactor_scharmann.png" },
  { id: "vehicle_sentinel_rts", name: "Ubermacht Sentinel RTS Blindée", category: "Véhicules blindés", badge: "vehicles", image: "assets/vehicles/ubermacht_sentinel_rts.png" },
  { id: "vehicle_growlerc", name: "Growler Custom Blindée", category: "Véhicules blindés", badge: "vehicles", image: "assets/vehicles/growler_custom.png" },
  { id: "vehicle_elegysa", name: "Annis Elegy SA Blindée", category: "Véhicules blindés", badge: "vehicles", image: "assets/vehicles/annis_elegy.png" },
  { id: "vehicle_weevb", name: "Baja Weevil Blindée", category: "Véhicules blindés", badge: "vehicles", image: "assets/vehicles/baja_weevil.png" },

  { id: "offer_unban", name: "Unban ACEPVP", category: "VIP & Services", badge: "offers", image: "assets/products/unban.png" },
  { id: "offer_vip", name: "VIP AcePvP", category: "VIP & Services", badge: "offers", image: "assets/products/vip_acepvp.png" }
];

const LS_KEY = "acepvp_rating_done";

let selectedProductId = null;
let selectedStars = 0;
let hotStars = 0;

window.addEventListener("DOMContentLoaded", () => {
  try {
    if (localStorage.getItem(LS_KEY)) {
      location.replace("merci.html");
      return;
    }
  } catch (e) {}

  renderProducts();
  renderStars();

  const submit = document.getElementById("submitBtn");
  if (submit) submit.addEventListener("click", submitRating);
});

function renderProducts() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  grid.innerHTML = PRODUCTS.map((p) => {
    return `
      <article class="pCard" data-product-id="${escapeAttr(p.id)}" tabindex="0" role="button" aria-label="${escapeAttr(p.name)}">
        <div class="pImg">
          <img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.name)}" loading="lazy" onerror="this.src='assets/ace_logo.png'" />
        </div>
        <div class="pBody">
          <div class="pTop">
            <div>
              <p class="pName">${escapeHtml(p.name)}</p>
              <p class="pCat">${escapeHtml(p.category)}</p>
            </div>
            <span class="badge badge--${escapeAttr(p.badge)}">${escapeHtml(p.badge === "coins" ? "AceCoins" : (p.badge === "vehicles" ? "Blindé" : "Service"))}</span>
          </div>
        </div>
      </article>
    `;
  }).join("");

  grid.querySelectorAll("[data-product-id]").forEach((card) => {
    const pick = () => setSelectedProduct(card.dataset.productId);
    card.addEventListener("click", pick);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pick();
      }
    });
  });
}

function setSelectedProduct(id) {
  selectedProductId = id;
  document.querySelectorAll(".pCard").forEach((el) => el.classList.toggle("is-active", el.dataset.productId === id));
  setMsg("");
}

function renderStars() {
  const wrap = document.getElementById("stars");
  if (!wrap) return;

  wrap.innerHTML = Array.from({ length: 5 }).map((_, i) => {
    const v = i + 1;
    return `
      <button class="starBtn" type="button" data-star="${v}" aria-label="${v} étoile${v > 1 ? "s" : ""}">
        ${starSvg()}
      </button>
    `;
  }).join("");

  wrap.querySelectorAll("[data-star]").forEach((btn) => {
    const v = Number(btn.dataset.star);

    btn.addEventListener("mouseenter", () => {
      hotStars = v;
      paintStars();
    });

    btn.addEventListener("mouseleave", () => {
      hotStars = 0;
      paintStars();
    });

    btn.addEventListener("click", () => {
      selectedStars = v;
      hotStars = 0;
      paintStars();
      const hint = document.getElementById("rateHint");
      if (hint) hint.textContent = `${selectedStars}/5`;
      setMsg("");
    });
  });

  paintStars();
}

function paintStars() {
  const on = hotStars || selectedStars;
  document.querySelectorAll(".starBtn").forEach((btn) => {
    const v = Number(btn.dataset.star);
    btn.classList.toggle("is-on", v <= on);
    btn.classList.toggle("is-hot", !!hotStars && v <= hotStars);
  });
}

async function submitRating() {
  const btn = document.getElementById("submitBtn");
  const commentEl = document.getElementById("comment");
  const comment = (commentEl?.value || "").trim();

  if (!selectedProductId) {
    setMsg("Choisissez un article.");
    return;
  }
  if (!selectedStars) {
    setMsg("Choisissez une note.");
    return;
  }

  const product = PRODUCTS.find((p) => p.id === selectedProductId);
  if (!product) {
    setMsg("Article invalide.");
    return;
  }

  if (btn) btn.disabled = true;
  setMsg("Envoi en cours...");

  try {
    const res = await fetch(`${WORKER_API_BASE.replace(/\/$/, "")}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: product.id,
        itemName: product.name,
        rating: selectedStars,
        comment
      })
    });

    if (!res.ok) {
      const t = await safeText(res);
      throw new Error(t || "Erreur serveur");
    }

    try { localStorage.setItem(LS_KEY, JSON.stringify({ ok: true, at: Date.now(), itemId: product.id })); } catch (e) {}
    location.replace("merci.html");
  } catch (e) {
    if (btn) btn.disabled = false;
    setMsg("Impossible d'envoyer la note. Réessayez.");
  }
}

function setMsg(text) {
  const el = document.getElementById("msg");
  if (el) el.textContent = text || "";
}

function starSvg() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(s) {
  return escapeHtml(s).replaceAll("`", "&#96;");
}

async function safeText(res) {
  try { return await res.text(); } catch { return ""; }
}
