PROTEX Projekt v25 - Mengenrabatte einstellbar + Gutscheincode ohne Vorlage

Neu:
- Mengenrabatte sind im Admin einstellbar.
- Kunde sieht die aktuelle Mengenrabatt-Staffel im Konfigurator.
- Gutscheincode-Feld zeigt keine Beispielcodes mehr an.
- Bestehende Gutscheincodes bleiben aktiv:
  PROTEX10 = 10%
  VIP20 = 20%
  VEREIN30 = 30%
  SPONSOR40 = 40%
- Rabattdaten werden in der Anfrage gespeichert und im Admin angezeigt.

WICHTIG:
Nach dem Hochladen bitte in Supabase die Datei supabase-setup-v18.sql erneut ausführen.
Dadurch wird die Tabelle settings für die einstellbaren Mengenrabatte angelegt.

Upload:
Alle Dateien in GitHub im Ordner protexstudio ersetzen.
Danach Vercel Deployment abwarten und mit STRG+F5 neu laden.
