# Supabase Auth-/Recovery-Live-Konfiguration

Stand: 2026-10-01, Europe/Berlin. Ausgang: `admin-editor-preview`, HEAD `69daee54877a7867cfd95dda69024b2daac1c7af`. Der aktuelle Remote-Stand wurde vor der Arbeit geprüft und frisch ausgecheckt; Worktree sauber. Dieser HEAD enthält bereits die Entfernung des doppelten Kartenpunkts. GitHub-`main`: `94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`.

## Live-Abgleich und Änderung

Projekt `once-human-archiv` / `pmoazkdpkxveloespevd` im Supabase-Dashboard nach Anmeldung geprüft. Vorher unverändert: Site URL `http://localhost:3000`; Redirect-Allowlist ausschließlich `https://raw.githack.com/CHABOWEBco/once-human-Archiv-/design-preview/index.html`.

Ausschließlich zwei Auth-URL-Konfigurationswerte geändert:

- Site URL auf `https://raw.githack.com/CHABOWEBco/once-human-Archiv-/admin-editor-preview/index.html` gesetzt.
- Genau dieselbe vollständige URL als Redirect ergänzt, ohne Wildcard. Die vorhandene alte URL bleibt erhalten.

Diese Konfiguration ist in Supabase gespeichert; ein Git-Checkout allein ändert sie nicht. Keine Frontend-, Datenbank-, Rollen-, RLS-, Katalog-, Layout- oder Animationsänderung.

## Verifikation

Nach vollständigem Dashboard-Reload: aktuelle Site URL weiterhin gespeichert, Save changes deaktiviert; Redirect-Liste enthält beide URLs, Total URLs: 2. Der bestehende Frontend-Wert in `resetPasswordForEmail` stimmt exakt mit dem neu zugelassenen Ziel überein. `node --check supabase-client.js` und `git diff --check` bestanden.

Die tatsächliche raw.githack-Preview wurde im Cloud-Browser geladen. Anmelden → Passwort vergessen öffnet den vorhandenen Dialog „PASSWORT ZURÜCKSETZEN“ mit E-Mail-Feld und „RESET-LINK SENDEN“. Kein Formular abgesendet. Der separate HTTP-HEAD-Aufruf aus dem Terminal erhielt 403; daraus wird kein Website-Ausfall abgeleitet, da die Browseransicht erfolgreich geladen wurde.

Dashboard-Screenshot nach Reload separat gesichert; nicht in den GitHub-Verlauf aufgenommen. Die automatische Freigabe lehnte den ersten Push wegen des privaten Dashboard-Screenshots ab. Der abgelehnte lokale Commit bleibt im ursprünglichen temporären Checkout erhalten. Dieser saubere Checkout baut erneut auf dem unveränderten Remote-HEAD auf und enthält ausschließlich textliche Dokumentation, keinen Screenshot und keinen abgelehnten Commit als Vorfahren.

Kein echter Reset-Link versendet und kein echtes Passwort geändert. Der vollständige E-Mail-/Passwort-End-to-End-Ablauf ist daher weiterhin nicht live bestätigt. Die bereits abgeschlossene B-01-Frontend-Regression wurde nicht wiederholt.

## Abgrenzung und nächster Block

B-07 und B-13 bleiben offen. Gemäß der modularen Arbeitsregel nach Abschluss dieses ersten Blocks STOPP bis zum nächsten OK. Kein Mutanten-Finish, keine Assets ergänzt, kein Fly-by.

Alle Website-Produktdateien und Supabase-Migrationen bleiben gegenüber dem Ausgang identisch. Repositoryänderungen ausschließlich dieser Bericht und Aktualisierung des bestehenden Supabase-README. GitHub-`main` bleibt unverändert.
