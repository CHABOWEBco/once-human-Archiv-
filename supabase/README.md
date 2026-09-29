# Supabase setup – Kernschema

Dieser Ordner enthält die vorbereitete Supabase-Datenbankbasis. Die Website ist in diesem Stand **noch nicht** mit einem Supabase-Projekt verbunden. Es werden keine echten Projekt-Keys eingecheckt.

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

## Später in Supabase ausführen

Bevor die echte Verbindung hergestellt wird, ein Supabase-Projekt anlegen bzw. auswählen.

Empfohlener Weg über die Supabase CLI:

1. Supabase CLI lokal authentifizieren.
2. Repository mit dem gewünschten Projekt verknüpfen: `supabase link --project-ref <PROJECT_REF>`.
3. Migration prüfen.
4. Migration mit `supabase db push` auf das verknüpfte Projekt anwenden.

Alternativ kann die SQL-Datei einmalig im Supabase SQL Editor ausgeführt werden. Für reproduzierbare Änderungen sollte danach weiterhin die Migration im Repository die maßgebliche Quelle bleiben.

## Für die echte Projektverbindung später benötigt

- Supabase Project URL
- öffentlicher Browser-Key (Publishable Key bzw. Legacy `anon` Key)
- Project Ref für CLI/Deployment
- gewünschte Site URL und erlaubte Auth-Redirect-URLs
- Entscheidung zu E-Mail-Bestätigung und Passwort-Reset
- der Benutzer, der später initial die Rolle `owner` erhalten soll

Der geheime `service_role`-Key wird für die Frontend-Verbindung nicht benötigt und darf dort nicht verwendet werden.

## Noch nicht Bestandteil dieses Blocks

- Frontend-Supabase-Client
- Login/Registrierung/Passwort-Reset
- Migration der aktuellen localStorage-Daten
- Admin-Oberfläche
- Rollenänderungs-RPC
- Builds, Routen, Posts, Einreichungen oder sonstige Fachtabellen
