/*
  Protex Shopify Cart Bridge
  Diese Datei kommt in Shopify ins Theme. Sie nimmt die Auswahl aus dem
  eingebetteten Protex-Konfigurator entgegen und legt sie in den Warenkorb.
*/

window.addEventListener("message", async (event) => {
  const data = event.data || {};
  if (data.type !== "PROTEX_ADD_TO_CART") return;

  const payload = data.payload || {};
  const items = Array.isArray(payload.items)
    ? payload.items
    : (payload.variantId ? [{ id: payload.variantId, quantity: payload.quantity || 1, properties: payload.properties || {} }] : []);

  if (!items.length) {
    alert("Keine Shopify Variant IDs zum Warenkorb gefunden.");
    return;
  }

  try {
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
