# Erklärungen zu falschen Antworten

Eine Datei pro Fach, benannt nach dem Fach in Kleinschreibung mit Bindestrichen.

Diese Dateien liegen **bewusst getrennt** von `data/questions.json`: die wird bei
jedem `npm run export:docsdocs` komplett neu geschrieben, alles darin Ergänzte
wäre also beim nächsten Sync verloren. Hier geschriebene Erklärungen überleben.

Format — Schlüssel ist die Frage-ID, dann je Antwort-ID der Text:

```json
{
  "01f0-7074-…": {
    "correct": "Warum die richtige Antwort stimmt (optional).",
    "choices": {
      "B": "Warum B falsch ist.",
      "C": "Warum C falsch ist."
    }
  }
}
```

Die Texte werden in der App als **KI-generiert** gekennzeichnet. Sie sind nicht
aus einer geprüften Quelle übernommen, sondern selbst geschrieben — bei
Widerspruch gilt die Vorlesung bzw. Leitlinie, nicht dieser Text.
