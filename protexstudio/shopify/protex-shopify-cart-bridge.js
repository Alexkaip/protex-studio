/*
  Protex Shopify Cart Bridge
  Sucht fehlende Shopify Variant IDs automatisch ueber Produkt-Handle + Groesse.
*/

function normalizeProtexValue(value) {
  return String(value || "").trim().toLowerCase();
}

async function loadShopifyProduct(handle) {
  const cleanHandle = String(handle || "").trim();
  if (!cleanHandle) return null;
  const response = await fetch(`/products/${encodeURIComponent(cleanHandle)}.js`, {
    headers: { "Accept": "application/json" }
  });
  if (!response.ok) return null;
  return response.json();
}

async function resolveVariantId(item) {
  if (item.id) return item.id;

  const product = await loadShopifyProduct(item.handle);
  if (!product || !Array.isArray(product.variants)) return "";

  const wantedSize = normalizeProtexValue(item.size);
  const wantedSku = normalizeProtexValue(item.sku);

  const variant = product.variants.find((variant) => {
    const optionValues = [variant.option1, variant.option2, variant.option3, variant.title]
      .map(normalizeProtexValue)
      .filter(Boolean);
    const sku = normalizeProtexValue(variant.sku);
    return optionValues.includes(wantedSize) || (wantedSku && sku === wantedSku);
  });

  return variant ? variant.id : "";
}

function addPrintFeeItem(items, payload) {
  const printFeeVariantId = String(window.PROTEX_PRINT_FEE_VARIANT_ID || "").trim();
  const qty = Number(payload.printFeeQuantity || 0) || 0;
  if (!printFeeVariantId || qty <= 0) return;

  items.push({
    id: printFeeVariantId,
    quantity: qty,
    properties: {
      "Position": "Druckkosten",
      "Hinweis": "Automatisch aus dem Protex Konfigurator",
      "Preis pro Druck": payload.printCostPerPosition ? String(payload.printCostPerPosition) : ""
    }
  });
}
window.addEventListener("message", async (event) => {
  const data = event.data || {};
  if (data.type !== "PROTEX_ADD_TO_CART") return;

  const payload = data.payload || {};
  const rawItems = Array.isArray(payload.items)
    ? payload.items
    : (payload.variantId ? [{ id: payload.variantId, quantity: payload.quantity || 1, properties: payload.properties || {} }] : []);

  if (!rawItems.length) {
    alert("Keine Produkte fuer den Warenkorb gefunden.");
    return;
  }

  try {
    const items = [];
    const missing = [];

    for (const rawItem of rawItems) {
      const variantId = await resolveVariantId(rawItem);
      if (!variantId) {
        missing.push(`${rawItem.handle || rawItem.properties?.Produkt || "Produkt"} / ${rawItem.size || rawItem.properties?.Groesse || "Groesse"}`);
        continue;
      }
      items.push({
        id: variantId,
        quantity: rawItem.quantity || 1,
        properties: rawItem.properties || {}
      });
    }

    addPrintFeeItem(items, payload);

    if (!items.length) {
      alert("Shopify konnte keine passende Variante finden: " + missing.join(", "));
      return;
    }

    const response = await fetch("/cart/add.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ items })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    window.location.href = "/cart";
  } catch (error) {
    alert("Produkt konnte nicht in den Shopify Warenkorb gelegt werden: " + error.message);
  }
});

