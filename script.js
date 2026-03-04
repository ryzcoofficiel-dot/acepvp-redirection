const WORKER_API_BASE = "https://acepvp-ratings.ryzcoofficiel.workers.dev";

const LS_KEY = "acepvp_rating_sent_v1";

const PRODUCTS = [
  { id: "vip_acepvp_service", name: "VIP AcePvP Service", image: "assets/vip.jpg" },
  { id: "coins_500", name: "500 AceCoins", image: "images/coins/500.png" },
  { id: "coins_1000", name: "1000 AceCoins", image: "images/coins/1000.png" },
  { id: "coins_2000", name: "2000 AceCoins", image: "images/coins/2000.png" },
  { id: "coins_5000", name: "5000 AceCoins", image: "images/coins/5000.png" },
  { id: "coins_10000", name: "10 000 AceCoins", image: "images/coins/10000.png" }
];

let selectedProductId = null;
let selectedStars = 0;

function $(sel) {
  return document.querySelector(sel);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeText(resp) {
  return resp.text().catch(() => "");
}

function setMsg(text) {
  const el = $("#msg");
  if (!el) return;
  el.textContent = text || "";
}

function alreadySent() {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (!v) return false;
    const obj = JSON.parse(v);
    return !!obj?.ok;
  } catch {
    return false;
  }
}

function markSent(itemId) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ok: true, at: Date.now(), itemId }));
  } catch {}
}

function starSvg(filled) {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
        ${filled ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.6"'} />
    </svg>
  `;
}

function paintStars(container, value) {
  const stars = [...container.querySelectorAll("button[data-star]")];
  stars.forEach((btn) => {
    const s = Number(btn.dataset.star);
    btn.classList.toggle("active", s <= value);
    btn.innerHTML = starSvg(s <= value);
  });
}

function renderStars(container) {
  container.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "star";
    btn.dataset.star = String(i);
    btn.innerHTML = starSvg(false);

    btn.addEventListener("mouseenter", () => paintStars(container, i));
    btn.addEventListener("mouseleave", () => paintStars(container, selectedStars));
    btn.addEventListener("click", () => {
      selectedStars = i;
      paintStars(container, selectedStars);
      const label = $("#starsValue");
      if (label) label.textContent = `${selectedStars}/5`;
    });

    container.appendChild(btn);
  }
  paintStars(container, selectedStars);
}

function setSelectedProduct(id) {
  selectedProductId = id;
  const cards = [...document.querySelectorAll("[data-product-id]")];
  cards.forEach((c) => c.classList.toggle("selected", c.dataset.productId === id));

  const p = PRODUCTS.find((x) => x.id === id);
  const previewImg = $("#selectedImage");
  const previewName = $("#selectedName");

  if (previewImg && p) {
    previewImg.src = p.image;
    previewImg.alt = p.name;
  }
  if (previewName && p) {
    previewName.textContent = p.name;
  }
}

function renderProducts() {
  const wrap = $("#products");
  if (!wrap) return;

  wrap.innerHTML = "";
  PRODUCTS.forEach((p) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "productCard";
    card.dataset.productId = p.id;

    card.innerHTML = `
      <div class="productImgWrap">
        <img class="productImg" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}">
      </div>
      <div class="productMeta">
        <div class="productTitle">${escapeHtml(p.name)}</div>
      </div>
    `;

    card.addEventListener("click", () => setSelectedProduct(p.id));
    wrap.appendChild(card);
  });

  setSelectedProduct(PRODUCTS[0]?.id || null);
}

async function submitRating() {
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

  const btn = $("#submitBtn");
  const commentEl = $("#comment");
  const comment = (commentEl?.value || "").trim();

  if (btn) btn.disabled = true;
  setMsg("Envoi en cours...");

  try {
    const url = `${WORKER_API_BASE.replace(/\/$/, "")}/rate`;
    const res = await fetch(url, {
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
      throw new Error(t || `HTTP ${res.status}`);
    }

    markSent(product.id);
    window.location.replace("merci.html");
  } catch (e) {
    if (btn) btn.disabled = false;
    setMsg("Impossible d'envoyer la note. Réessayez.");
  }
}

function init() {
  if (alreadySent()) {
    window.location.replace("merci.html");
    return;
  }

  renderProducts();

  const starsWrap = $("#stars");
  if (starsWrap) renderStars(starsWrap);

  const btn = $("#submitBtn");
  if (btn) btn.addEventListener("click", submitRating);

  const label = $("#starsValue");
  if (label) label.textContent = "0/5";
}

document.addEventListener("DOMContentLoaded", init);
