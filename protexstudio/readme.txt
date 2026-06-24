PROTEX Studio v37 - Mengenrabatt Fix

Geändert:
- Mengenrabatt wird wieder berechnet, auch wenn Supabase keine gültige Rabattstaffel liefert.
- Kostenbox bleibt sichtbar: Produktpreis, Druckkosten, Warenwert, Zwischensumme, Endpreis.
- Mengenrabatt-Zeile erscheint nur, wenn tatsächlich Rabatt aktiv ist.
- Gutscheincode-Rabatt bleibt nur sichtbar, wenn ein gültiger Code aktiv ist.
- Logo im Header größer dargestellt.

Nach Upload: Vercel Deployment abwarten und STRG + F5 drücken.

V39 Excel/CSV Export Bilder:
- CSV Export schreibt jedes Produkt in eine eigene Zeile mit echten Zeilenumbrüchen.
- Export enthält Bildlinks für Vorderseite, Rückseite, linker Ärmel und rechter Ärmel.
- CSV Import erkennt die Überschriften und übernimmt Bildlinks direkt.
- Vorlage: produkt-vorlage.csv und produkt-vorlage.xlsx
