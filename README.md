# Handy-Tracker

Web-App (PWA) für Android/Chrome: verbindet sich per Bluetooth mit dem kabellosen
PASCO-Magnetfeldsensor **PS-3221** und macht daraus einen „Handy-Detektor“ mit Radar,
Geigerzähler-Sound, Alarm und Fundliste.

## Installieren (einmalig)

1. Auf GitHub: **Settings → Pages → Source: „Deploy from a branch“**, Branch wählen, Ordner `/ (root)`, speichern.
   (GitHub Pages braucht bei kostenlosen Konten ein öffentliches Repository.)
2. Nach ca. einer Minute die angezeigte Adresse (`https://<name>.github.io/<repo>/`) in **Chrome auf dem Handy** öffnen.
3. Chrome-Menü ⋮ → **„App installieren“ / „Zum Startbildschirm hinzufügen“**. Danach startet die App wie jede andere und läuft auch offline.

## Benutzen

1. PASCO-Sensor einschalten, in der App **Sensor verbinden** → „Mag Field …“ auswählen.
2. Sensor frei in die Luft halten, **Nullen** tippen.
3. Langsam an Taschen, Bänken, Jacken entlangführen. Je näher, desto schneller das Ticken; über der Alarmschwelle gibt es Fanfare, Vibration und einen Eintrag in der Fundliste.

Betriebsarten: **Suchen** (Sensor wird bewegt, drehunabhängig) und **Wache** (Sensor liegt still, z. B. an einer Ablage – empfindlicher).
Ohne Sensor lässt sich alles über *Einstellungen → Datenquelle → Demo* ausprobieren.

## Grenzen

- Reichweite realistisch 5–15 cm: Magnetfelder fallen mit der dritten Potenz des Abstands ab.
- Der Sensor unterscheidet nicht zwischen Handy, Kopfhörer, Magnetverschluss und Stahl im Tischgestell.
- Das Bluetooth-Protokoll stammt aus PASCOs offener Python-Bibliothek (`pasco`); getestet wurde gegen einen simulierten Sensor, nicht gegen echte Hardware. Falls keine Messwerte kommen: *Hilfe & Diagnose* zeigt die empfangenen Rohdaten.
