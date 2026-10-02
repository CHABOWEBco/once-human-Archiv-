# Supabase setup – Kernschema

Phase-1-Asset-Bibliothek: Metadatenmigration `migrations/20261002010000_asset_library.sql` vom Nutzer live angewendet, vorhandene Rollen/RLS wiederverwendet. SQL-Abschluss gemeldet: 129 Assets insgesamt, 128 aktiv, Test archiviert mit Revision 4. Öffentliche Freigabegrenze und unveränderter Live-Katalog unabhängig nachgeprüft. Vollständiger Inventar-/Rechtestand in [`../docs/ASSET_LIBRARY_PHASE_1.md`](../docs/ASSET_LIBRARY_PHASE_1.md), Live-Ergebnis mit Nachweisgrenzen in [`../docs/ASSET_LIBRARY_LIVE_VERIFICATION_20261002.md`](../docs/ASSET_LIBRARY_LIVE_VERIFICATION_20261002.md). Keine alte Migration oder Bestandsdaten zurücksetzen.

Dieser Ordner enthält die Datenbankbasis im Repository. Die Website besitzt inzwischen eine konfigurierte Supabase-Verbindung in `supabase-client.js`, einschließlich öffentlichem Publishable-Key. Login, Registrierung, Session-Restore, Recovery und Profil-/Rollenbezug sind frontendseitig angebunden. Tabellen, Grants, RLS, Trigger und Auth-Konfiguration wurden am 01.10.2026 read-only live geprüft; Nachweis: `../docs/B12_LIVE_20261001.json`. Die Auth-URL-Konfiguration wurde am 01.10.2026 anschließend auf die aktuelle Preview ergänzt und nach Reload geprüft; Nachweis: `../docs/AUTH_REDIRECT_LIVE_20261001.md`. Ein geheimer `service_role`-Key ist kein Bestandteil der Frontend-Verbindung.

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

## Live-Konfiguration und offene Grenzen

- Drei Live-Tabellen: `profiles` und `user_roles` mit RLS ENABLED/FORCED; `catalog_entries` mit RLS ENABLED (nicht FORCED, wie in der Migration).
- Sechs Live-Policies: zwei eigene Profil-Policies, eine eigene Rollen-Lese-Policy und drei Katalog-Policies.
- Authenticated darf ausschließlich `profiles.display_name`/`avatar_url` am eigenen Profil ändern. Rollen besitzen keine Client-Schreibrechte.
- Katalog: anon SELECT; authenticated INSERT sowie UPDATE nur auf `entry`, `revision`, `updated_at`, `updated_by`, jeweils zusätzlich mit den vorhandenen Moderator-/Admin-/Owner-RLS-Prüfungen. Kein Client-DELETE und keine ID-/created_at-Änderung.
- Der private Rollenhelfer verwendet die serverseitige Rolle (`user` < `moderator` < `admin` < `owner`), SECURITY DEFINER und einen leeren festen search_path. Trigger erzeugt ausschließlich Standardrolle `user`.
- Live: 21 eindeutige Einträge, Revision 1, alle Originalfelder identisch zum erhaltenen JSON-Bestand. 14 Kategorien bleiben lokal definiert; acht davon werden von den 21 Einträgen verwendet.
- Auth: E-Mail-Anmeldung aktiv, Registrierung erlaubt, E-Mail-Bestätigung erforderlich; externe Website-Login-Provider deaktiviert. Der GitHub-Login ins Supabase-Dashboard ist ein separater Dashboardzugang.
- Auth-URL-Nachtrag am 01.10.2026: Site URL ist `https://raw.githack.com/CHABOWEBco/once-human-Archiv-/admin-editor-preview/index.html`. Redirect-Allowlist enthält diese exakte URL sowie die bestehende `design-preview/index.html`-URL. Speicherung nach Dashboard-Reload bestätigt; keine Wildcard. Der ursprüngliche read-only B12-Nachweis dokumentiert weiterhin den vorherigen Stand. Details: `../docs/AUTH_REDIRECT_LIVE_20261001.md`.
- Auth-Tokens: 3600 s Ablaufzeit, Replay-Erkennung für Refresh-Tokens aktiv, 10 s Wiederverwendungsintervall. Session-Timebox/Inaktivitätsgrenze beide 0; Single-Session nicht aktiviert. Diese erweiterten Sessionregeln sind im vorhandenen Free-Plan nicht konfigurierbar.
- Frontend behält persistSession, autoRefreshToken und detectSessionInUrl sowie PASSWORD_RECOVERY/updateUser/finishRecovery. Keine Live-Reset-E-Mail versendet und kein Passwort geändert.
- Ein Live-Owner vorhanden. Die vollständigen Schreibabläufe mit vier realen Rollen wurden nicht wiederholt: weitere Rollen-Testkonten existieren nicht. Read-only Grants/Policies/Helper-Prüfung bestanden; vorhandene isolierte Editor-/Reload-/Versionsschutztests bleiben der Integrationsnachweis.

Der geheime `service_role`-Key wird für die Frontend-Verbindung nicht benötigt und darf dort nicht verwendet werden.

## Vorhanden und weiter offen

Vorhanden: zentraler Frontend-Supabase-Client, Login/Registrierung/Recovery-Code, Profil-/Rollenbezug, rollenabhängige Adminansichten und realer Katalog-Speicherweg.

Weiter offen:

- Echter E-Mail-/Passwort-End-to-End-Test der Recovery; Auth-Redirect-Konfiguration ist korrigiert und nach Reload bestätigt
- globale Migration/Synchronisierung lokaler Werkzeug- und Medienbestände
- sichere globale Rollenverwaltung, Moderationsmutationen und Server-Audit
- Builds, Routen, Posts, Einreichungen oder sonstige Fachtabellen

## Asset Library – Phase 2A (vorbereitet, noch nicht live angewendet)

Nach der abgeschlossenen Phase 1 ergänzt ausschließlich `migrations/20261002020000_asset_library_storage.sql` einen privaten `archive-assets`-Bucket, Storage-Policies und die normalisierten Referenzspalten in der bestehenden `asset_library`. Diese neue Datei einmal vollständig manuell im bestehenden Supabase SQL Editor ausführen; keine alten Migrationen erneut ausführen. Danach die Asset-Bibliothek im vorhandenen Adminbereich neu laden. Originale und statische `file_ref`-Einträge bleiben erhalten. Modell, Ablauf, isolierte Tests und verbleibende Live-Prüfung: [Phase-2A-Bericht](../docs/ASSET_LIBRARY_PHASE_2A.md).
