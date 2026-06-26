# Protex Shopify Einbindung

Ziel: Der Kunde öffnet im Shopify-Shop den Protex-Konfigurator, personalisiert ein Produkt und legt die gewählten Größen direkt in den Shopify-Warenkorb.

## So funktioniert es

1. Produkte werden wie bisher im Protex Admin gepflegt.
2. Der Shopify CSV Export erzeugt automatisch SKUs pro Produkt und Größe, zum Beispiel `championship-20-schwarz-s`.
3. Nach dem Import in Shopify vergibt Shopify echte Variant IDs.
4. Diese Variant IDs werden im Protex Admin beim Produkt hinterlegt, zum Beispiel:

```text
S=1234567890
M=1234567891
L=1234567892
```

5. Der Konfigurator wird in Shopify per Section/Iframe eingebunden.
6. Nach dem Personalisieren speichert Protex die Anfrage und sendet die gewählten Variant IDs an Shopify.
7. Shopify legt die Positionen in den Warenkorb und öffnet den Warenkorb.

## Dateien

- `protex-shopify-section.liquid`: Section für dein Shopify Theme.
- `protex-shopify-cart-bridge.js`: Warenkorb-Brücke für Shopify.

Wichtig: Ohne echte Shopify Variant IDs kann Shopify nichts in den Warenkorb legen. SKUs helfen beim Zuordnen, ersetzen die Variant ID aber nicht.
