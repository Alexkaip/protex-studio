PROTEX Projekt v15 - Multi Design Front/Back

Neu:
- Mengenberechnung repariert
- 01 wird korrekt als 1 gezählt
- Text und Logo gleichzeitig möglich
- mehrere Logos/Grafiken möglich
- mehrere Texte möglich
- Vorderseite und Rückseite getrennt gestaltbar
- Anfrage speichert beide Seiten
- Layout-Downloads für Vorder- und Rückseite
- Netlify-Versand sendet bis zu 5 Layoutbilder mit
- Druckposition und Fake-3D bleiben entfernt
- Kategorien bleiben im Admin erhalten

Wichtig:
- Supabase URL und Publishable Key sind in config.js bereits eingetragen.
- Ordner komplett in dasselbe Netlify-Projekt hochladen.
- Link bleibt: https://protexstudio.netlify.app
- Admin: https://protexstudio.netlify.app/admin.html


V16:
- Preisberechnung erweitert.
- Sobald ein Logo/Text auf Vorderseite oder Rückseite platziert wird, erhöht sich der Preis automatisch.
- Standard: +5,00 € pro bedruckter Seite und Stück.
- Änderung möglich in config.js:
  PRINT_PRICE_PER_SIDE: 5.00


V17:
- 5 € werden je Druckelement berechnet, nicht je Seite.
- Jedes Logo = 1 Druckelement.
- Jeder Text = 1 Druckelement.
- Druckpreis pro Element ist im Admin pro Produkt einstellbar.
- Mindestbestellmenge im Admin pro Produkt einstellbar.
- Rabatt ab 20 und ab 50 Stück möglich.
- SQL-Datei SUPABASE_SQL_v17.txt einmal in Supabase ausführen.

V18:
- Handy-Bedienung mit Pfeiltasten.
- Elemente größer/kleiner machen.
- Elemente drehen.
- Zoom 100/150/200%.
- Schnellpositionen Brust links/rechts/Mitte.
- Elementliste zum Auswählen.
- Mehrere Logos gleichzeitig hochladen.
- Vorderseite auf Rückseite kopieren.
- Laptop-Vorschau größer.


V19:
- PC-Layout verbessert.
- Linke Produktvorschau bleibt fix sichtbar.
- Nur das rechte Einstellungsmenü scrollt.
- Produktbild füllt die verfügbare Höhe besser aus.


V20:
- Viele neue Schriftarten eingebaut.
- Google Fonts: Bebas Neue, Oswald, Anton, Montserrat, Poppins, Russo One, Rajdhani, Barlow Condensed usw.
- Text fett/normal.
- Text kursiv.
- Textschatten.
- Textkontur schwarz oder weiß.
- Effekte werden auch im Download und in der Anfrage berücksichtigt.


V21:
- Handy-Fix: Neue Texte und Logos erscheinen sofort mittig auf dem Produktbild.
- Auf Mobilgeräten wird nach dem Hinzufügen automatisch zur Vorschau gescrollt.
- Startgröße für Texte/Logos am Handy angepasst.


V22:
- Fehler beim Button "Text hinzufügen" behoben.
- Text-Button hat wieder eine direkte Klick-Funktion.
- Text erscheint mittig auf dem Produktbild.
- Schriftarten und Text-Effekte bleiben erhalten.


V23:
- Rabattcode-Feld im Kundenbereich.
- Codes werden in config.js festgelegt:
  DISCOUNT_CODES: { "PROTEX10": 10, "VEREIN20": 20, "VIP30": 30, "SPONSOR40": 40 }
- Rabattcode wird mit Mengenrabatt kombiniert.
- Maximaler Gesamtrabatt ist auf 90% begrenzt.
- Rabattcode wird in der Anfrage mitgesendet.


V24:
- Adminbereich am PC wieder scrollbar.
- Kundenansicht mit fixem Produktbild bleibt erhalten.


V25:
- Anfrage erhält automatisch ein Auftragsblatt als PDF.
- Original hochgeladene Logos/Grafiken werden zusätzlich als Anhang mitgesendet.
- PDF enthält Produkt, Größen, Preise, Rabatte, Texte, Schriftarten, Farben und Logos.
- Layoutbilder Vorder-/Rückseite bleiben erhalten.
