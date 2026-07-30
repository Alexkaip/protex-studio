PROTEX Projekt v17 - Kategorien + Vercel E-Mail Versand

Neu:
- Kundenansicht startet mit Kategorie-Auswahl.
- Nach Klick auf eine Kategorie werden nur passende Produkte angezeigt.
- Erst mit Klick auf ein Produkt öffnet sich der Produktkonfigurator.
- Netlify-Formular wurde entfernt.
- Anfrage-Versand läuft jetzt über Vercel API: /api/send-order
- Layoutbilder werden als Anhänge mitgeschickt.

Wichtig für Vercel:
1. Dateien komplett in dein GitHub-Projekt hochladen und alte Dateien ersetzen.
2. In Vercel unter Project Settings > Environment Variables diese Werte anlegen:
   RESEND_API_KEY = dein Resend API Key
   ORDER_TO_EMAIL = office@protex-austria.at
   ORDER_FROM_EMAIL = Protex Studio <onboarding@resend.dev>

Hinweis:
- Mit onboarding@resend.dev kannst du am Anfang testen.
- Für den echten Betrieb solltest du später deine Domain bei Resend bestätigen und z.B. Protex Studio <office@protex-austria.at> verwenden.
- Danach in Vercel neu deployen.

Admin:
- /admin.html
