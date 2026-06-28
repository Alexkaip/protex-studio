/*
  Protex Shopify Cart Bridge
  Sucht fehlende Shopify Variant IDs automatisch ueber Produkt-Handle + Groesse.
*/

function normalizeProtexValue(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeProtexNumber(value) {
  const number = Number(String(value || "0").replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function notifyProtexFrame(source, status, message) {
  if (!source || typeof source.postMessage !== "function") return;
  source.postMessage({ type: "PROTEX_CART_STATUS", status, message: message || "" }, "*");
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function loadShopifyProduct(handle) {
  const cleanHandle = String(handle || "").trim();
  if (!cleanHandle) return null;
  const response = await fetchWithTimeout(`/products/${encodeURIComponent(cleanHandle)}.js`, {
    headers: { "Accept": "application/json" }
  });
  if (!response.ok) return null;
  return response.json();
}

function getHandleFromProductResult(product) {
  if (!product) return "";
  if (product.handle) return product.handle;
  const url = String(product.url || "");
  const match = url.match(/\/products\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function searchShopifyProduct(item) {
  const query = String(item.title || item.properties?.Produkt || item.handle || "").trim();
  if (!query) return null;
  const response = await fetchWithTimeout(`/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=8`, {
    headers: { "Accept": "application/json" }
  });
  if (!response.ok) return null;
  const data = await response.json();
  const products = data?.resources?.results?.products || [];
  if (!products.length) return null;
  const wantedTitle = normalizeProtexValue(query);
  const exact = products.find((product) => normalizeProtexValue(product.title) === wantedTitle) || products[0];
  const handle = getHandleFromProductResult(exact);
  return handle ? loadShopifyProduct(handle) : null;
}

async function resolveVariantId(item) {
  if (item.id) return item.id;

  const product = await loadShopifyProduct(item.handle) || await searchShopifyProduct(item);
  if (!product || !Array.isArray(product.variants)) return "";

  if (item.allowFirstVariant === true || item.shopOnly === true) {
    const firstAvailable = product.variants.find((variant) => variant.available !== false) || product.variants[0];
    return firstAvailable ? firstAvailable.id : "";
  }

  const wantedSize = normalizeProtexValue(item.size);
  const wantedSku = normalizeProtexValue(item.sku);
  const wantedPrice = normalizeProtexNumber(item.printFeePrice);
  if (!wantedSize && !wantedSku && wantedPrice <= 0) {
    const firstAvailable = product.variants.find((variant) => variant.available !== false) || product.variants[0];
    return firstAvailable ? firstAvailable.id : "";
  }

  const variant = product.variants.find((variant) => {
    const optionValues = [variant.option1, variant.option2, variant.option3, variant.title]
      .map(normalizeProtexValue)
      .filter(Boolean);
    const sku = normalizeProtexValue(variant.sku);
    const variantPrice = normalizeProtexNumber(variant.price);
    return optionValues.includes(wantedSize) ||
      (wantedSku && sku === wantedSku) ||
      (wantedPrice > 0 && Math.abs(variantPrice - wantedPrice) < 0.01);
  });

  return variant ? variant.id : "";
}

function addPrintFeeItem(items, payload) {
  const printFeeVariantId = String(window.PROTEX_PRINT_FEE_VARIANT_ID || "").trim();
  const printFeeHandle = String(window.PROTEX_PRINT_FEE_HANDLE || "dtf-druck").trim();
  const lines = Array.isArray(payload.printFeeLines) && payload.printFeeLines.length
    ? payload.printFeeLines
    : [{ price: payload.printCostPerPosition || 0, quantity: payload.printFeeQuantity || 0 }];

  lines.forEach((line) => {
    const qty = Number(line.quantity || 0) || 0;
    const price = normalizeProtexNumber(line.price);
    if (qty <= 0 || price <= 0) return;

    items.push({
      id: printFeeHandle ? "" : (printFeeVariantId && printFeeVariantId !== "0" ? printFeeVariantId : ""),
      handle: printFeeHandle,
      size: String(price),
      printFeePrice: price,
      quantity: qty,
      label: "Druckkosten " + price.toFixed(2),
      properties: {
        "Position": "Druckkosten",
        "Hinweis": "Automatisch aus dem Protex Konfigurator",
        "Preis pro Druck": price.toFixed(2)
      }
    });
  });
}

async function addCartItem(item) {
  const variantId = item.id || await resolveVariantId(item);
  if (!variantId) {
    throw new Error((item.label || item.properties?.Produkt || item.handle || "Produkt") + ": keine passende Shopify Variante gefunden");
  }

  const response = await fetchWithTimeout("/cart/add.js", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      id: variantId,
      quantity: item.quantity || 1,
      properties: item.properties || {}
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error((item.label || item.properties?.Produkt || "Produkt") + ": " + error);
  }
}

window.addEventListener("message", async (event) => {
  const data = event.data || {};
  if (data.type !== "PROTEX_ADD_TO_CART") return;

  const payload = data.payload || {};
  const rawItems = Array.isArray(payload.items)
    ? payload.items
    : (payload.variantId ? [{ id: payload.variantId, quantity: payload.quantity || 1, properties: payload.properties || {} }] : []);

  if (!rawItems.length) {
    notifyProtexFrame(event.source, "error", "Keine Produkte fuer den Warenkorb gefunden.");
    alert("Keine Produkte fuer den Warenkorb gefunden.");
    return;
  }

  try {
    const items = [];
    const missing = [];

    for (const rawItem of rawItems) {
      const variantId = await resolveVariantId(rawItem);
      if (!variantId) {
        const sizeLabel = rawItem.size || rawItem.properties?.Groesse || rawItem.properties?.["Größe"] || "";
        missing.push(`${rawItem.title || rawItem.properties?.Produkt || rawItem.handle || "Produkt"}${sizeLabel ? " / " + sizeLabel : ""}`);
        continue;
      }
      items.push({
        id: variantId,
        quantity: rawItem.quantity || 1,
        label: `${rawItem.title || rawItem.properties?.Produkt || rawItem.handle || "Produkt"}${rawItem.size || rawItem.properties?.Groesse || rawItem.properties?.["Größe"] ? " / " + (rawItem.size || rawItem.properties?.Groesse || rawItem.properties?.["Größe"]) : ""}`,
        properties: rawItem.properties || {}
      });
    }

    addPrintFeeItem(items, payload);

    if (!items.length) {
      const msg = "Shopify konnte keine passende Variante finden: " + missing.join(", ");
      notifyProtexFrame(event.source, "error", msg);
      alert(msg);
      return;
    }

    for (const item of items) {
      await addCartItem(item);
    }

    notifyProtexFrame(event.source, "success", "Produkt wurde in den Warenkorb gelegt.");
    window.location.href = "/cart";
  } catch (error) {
    const msg = "Produkt konnte nicht in den Shopify Warenkorb gelegt werden: " + error.message;
    notifyProtexFrame(event.source, "error", msg);
    alert(msg);
  }
});


