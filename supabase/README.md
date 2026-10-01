# Supabase setup – Kernschema

Dieser Ordner enthält die Datenbankbasis im Repository. Die Website besitzt inzwischen eine konfigurierte Supabase-Verbindung in `supabase-client.js`, einschließlich öffentlichem Publishable-Key. Login, Registrierung, Session-Restore, Recovery und Profil-/Rollenbezug sind frontendseitig angebunden. Der tatsächliche Live-Datenbankstand und die Auth-Redirect-Allowlist sind durch diese Dokumentation nicht bestätigt. Ein geheimer `service_role`-Key ist kein Bestandteil der Frontend-Verbindung.

## Migration

`migrations/20260929000000_core_profiles_roles.sql`

Sie erstellt ausschließlich die Identitäts-/Rechtebasis:

- Enum `public.app_role`: `user`, `moderator`, `admin`, `owner`
- Tabelle `public.profiles`
- Tabelle `public.user_roles`
- automatische Profilerstellung nach einem neuen `auth.users`-Datensatz
- automatische Standardrolle `user`
- Backfill für Auth-Benutzer, die beim späteren Ausführen der Migration bereits existieren
- RLS-Policies für das eigene Profil und das Lesen der eigenen Rolle
- private, read-only Rollenhelfer für spätere RLS-Policies:
  - `private.has_role(role)`
  - `private.has_role_at_least(role)`

## Sicherheitsmodell

Rollen werden **nicht** aus Frontend-Daten oder User-Metadaten übernommen. Neue Benutzer erhalten ausschließlich `user`.

Normale angemeldete Benutzer haben auf `user_roles` nur Leserechte für ihre eigene Zeile. Es gibt absichtlich **keine** Client-Policy und kein Frontend-RPC zum Einfügen, Ändern oder Löschen von Rollen.

Die Rollenhelfer laufen als `SECURITY DEFINER`, verwenden einen leeren festen `search_path` und referenzieren Tabellen/Funktionen vollständig qualifiziert. Dadurch können spätere RLS-Policies Rollen serverseitig prüfen, ohne einer vom Frontend behaupteten Rolle zu vertrauen.

Für `profiles` darf ein Benutzer nur seine eigene Zeile sehen und nur `display_name` bzw. `avatar_url` ändern. Die User-ID und Zeitstempel sind nicht als direkt beschreibbare Client-Spalten freigegeben.

Ein `service_role`-Schlüssel gehört niemals in Browsercode oder dieses Repository. Eine spätere Rollenverwaltung wird über einen separaten sicheren Server-/Adminweg aufgebaut.

## Migration und Live-Abgleich

Das Frontend-Projekt ist bereits konfiguriert. Die Live-Instanz wurde am 01.10.2026 read-only geprüft: `public` enthält `profiles` und `user_roles`, eine passende Katalogtabelle fehlte. Der private Rollenhelfer `private.has_role_at_least(public.app_role)` und die vorhandenen RLS-Policies für Profile und Rollen sind vorhanden.

`migrations/20261001010000_catalog_entries.sql` legt genau eine Katalogtabelle an. Sie speichert vorhandene Einträge als JSONB unter der stabilen ID, bewahrt alle bestehenden Eintragsfelder und seeded die 21 aktuellen Katalogeinträge mit `ON CONFLICT DO NOTHING`. Die 14 Kategorien bleiben in `catalog-data.js` und werden im Editor unverändert angeboten. Öffentliche Leserollen dürfen den Katalog laden; Moderator, Admin und Owner dürfen erstellen und ändern. Löschen ist nicht freigegeben. Updates enthalten eine Revisionsprüfung, damit ein veralteter Editorstand keinen neueren Datensatz überschreibt.

Empfohlener Weg über die Supabase CLI:

1. Supabase CLI lokal authentifizieren.
2. Repository mit dem gewünschten Projekt verknüpfen: `supabase link --project-ref <PROJECT_REF>`.
3. Migration prüfen.
4. Migration mit `supabase db push` auf das verknüpfte Projekt anwenden.

Alternativ kann die SQL-Datei einmalig im Supabase SQL Editor ausgeführt werden. Für reproduzierbare Änderungen sollte danach weiterhin die Migration im Repository die maßgebliche Quelle bleiben.

## Konfiguration und noch offener Live-Nachweis

- Project URL und öffentlicher Browser-Key sind bereits im zentralen Frontend-Client konfiguriert
- Project Ref für CLI/Deployment
- gewünschte Site URL und erlaubte Auth-Redirect-URLs
- Entscheidung zu E-Mail-Bestätigung und Passwort-Reset
- der Benutzer, der später initial die Rolle `owner` erhalten soll

Der geheime `service_role`-Key wird für die Frontend-Verbindung nicht benötigt und darf dort nicht verwendet werden.

## Vorhanden und weiter offen

Vorhanden: zentraler Frontend-Supabase-Client, Login/Registrierung/Recovery, Profil-/Rollenbezug und rollenabhängige sichere Admin-Vorschau.

Weiter offen:

- Live-Abgleich von Tabellen, Policies, Triggern und Redirect-Allowlist
- globale Migration/Synchronisierung lokaler Werkzeug- und Medienbestände
- sichere globale Rollenverwaltung, Moderationsmutationen und Server-Audit
- Builds, Routen, Posts, Einreichungen oder sonstige Fachtabellen
