PROTEX Projekt v18 - Kategorien dauerhaft + Anfragen im Admin

Neu:
- Kategorien können im Admin selbst angelegt werden.
- Kategorien werden dauerhaft in Supabase gespeichert.
- Startseite zeigt zuerst Kategorien.
- Klick auf Kategorie zeigt nur passende Produkte.
- Klick auf Produkt öffnet den Konfigurator.
- E-Mail-Versand ist vorerst deaktiviert.
- Kundenanfragen werden direkt in Supabase gespeichert.
- Im Adminbereich gibt es jetzt "📋 Anfragen" mit Detailansicht und Layout-Downloads.

WICHTIG:
Vor dem Testen in Supabase ausführen:
supabase-setup-v18.sql

Supabase:
1. Supabase öffnen
2. SQL Editor
3. Inhalt von supabase-setup-v18.sql einfügen
4. Run / Ausführen

Danach:
- Dateien komplett in GitHub ersetzen.
- Vercel deployed automatisch neu.
- Kunden senden Anfragen, diese erscheinen im Admin unter /admin.html

Admin:
- /admin.html
- Benutzer wie bisher über Supabase Authentication anlegen.
