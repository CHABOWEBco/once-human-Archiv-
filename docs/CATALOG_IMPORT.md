# Originalbild-Import

Der erhaltene Katalog enthält 21 Datensätze in 14 Kategorien. Der Datenstand der visuellen Basis bleibt erhalten. Für künftige Importe sind fehlende Originalbilder als `image: null` anzugeben; angezeigt werden ausschließlich validierte Pfade unter `assets/items/`. Ohne Original bleibt das bisherige Kategoriezeichen sichtbar. Keine generierten Ersatzbilder werden veröffentlicht. Die 12.211 vollständigen Itembilder sind noch nicht verfügbar.

Originale unter `assets/items/` ablegen. Ein JSON-Import enthält `entries` und optional die vollständigen `categories`. Stabile `id`-Werte aktualisieren vorhandene Datensätze; neue IDs ergänzen sie. Pflichtfelder: `id`, `name_de`, `category`. Textfelder, `tags`, Prüfdatum und Bildpfad werden validiert. Bildpfade erlauben PNG, JPG und WebP einschließlich Unicode-Dateinamen. Fehlende Dateien, Traversal und aus dem Bildverzeichnis führende Symlinks werden abgewiesen.

```sh
node scripts/import-catalog.mjs import.json
node scripts/import-catalog.mjs import.json --apply
```

Der erste Aufruf prüft ohne Änderungen. `--apply` aktualisiert JSON und Browserdaten aus demselben Objekt. Der Import erfindet keine Kategorien, Spielwerte oder Zuordnungen aus Dateinamen. Suche und Filter arbeiten auf dem vollständigen Bestand; die Darstellung paginiert mit 12 Einträgen.
