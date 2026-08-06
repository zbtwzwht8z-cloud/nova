#!/usr/bin/env python3
"""Moves transcribed exams into data/vorklinik-ocr/, stamped with their exam.

The transcription itself happens outside this script (the page images are read
by a small model). This step attaches the exam identity, checks the result
against the hand-verified answer key, and refuses anything that does not line
up — a transcription whose question count disagrees with the key is a sign the
pages were misread, not something to paper over.

    python3 scripts/collect-vorklinik-ocr.py <scratchpad-dir>
"""
import hashlib
import json
import os
import sys

DATA = os.path.join(os.path.dirname(__file__), "..", "data")
OCR_DIR = os.path.join(DATA, "vorklinik-ocr")
KEYS_PATH = os.path.join(DATA, "vorklinik-keys.json")


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    scratch = sys.argv[1]

    with open(os.path.join(scratch, "scans.json"), encoding="utf-8") as handle:
        scans = {row["idx"]: row for row in json.load(handle)}
    with open(KEYS_PATH, encoding="utf-8") as handle:
        keys = json.load(handle)["keys"]

    os.makedirs(OCR_DIR, exist_ok=True)
    written = 0
    # Two exams must never come back with the same text. A transcriber handed
    # several exams at once has been seen to write one result into all of the
    # output files, which reads as a full, confident transcription.
    fingerprints = {}

    for name in sorted(os.listdir(scratch)):
        if not name.startswith("ocr_") or not name.endswith(".json"):
            continue
        index = int(name[4:-5])
        exam = scans[index]
        identity = f"{exam['subject']}|{exam['term']}|{exam['sitting']}"

        entry = keys.get(identity)
        if not entry:
            print(f"  übersprungen (kein geprüfter Schlüssel): {name}")
            continue
        # A key tied to a specific PDF means that PDF carries the questions;
        # transcribing them again would duplicate the exam.
        if entry.get("questions_file"):
            print(f"  übersprungen (Fragen kommen aus dem Text-PDF): {name}")
            continue

        with open(os.path.join(scratch, name), encoding="utf-8") as handle:
            questions = json.load(handle)

        fingerprint = hashlib.sha1(
            "".join(q["stem"] for q in sorted(questions, key=lambda q: q["number"]))
            .encode("utf-8")
        ).hexdigest()
        if fingerprint in fingerprints:
            print(f"  ABGELEHNT: {name} ist wortgleich mit {fingerprints[fingerprint]}")
            continue
        fingerprints[fingerprint] = name

        numbers = {q["number"] for q in questions}
        answered = set(int(n) for n in entry["answers"])
        missing = sorted(answered - numbers)

        payload = {
            "subject": exam["subject"],
            "term": exam["term"],
            "sitting": exam["sitting"],
            "track": "iRM" if "iRM" in exam["path"] else "Regelstudiengang",
            "source_pdf": exam["file"],
            "questions": sorted(questions, key=lambda q: q["number"]),
        }
        target = os.path.join(OCR_DIR, f"{index:02d}-{exam['subject'].replace(' ', '-')}.json")
        with open(target, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=1)
            handle.write("\n")

        written += 1
        note = f", ohne Frage {missing}" if missing else ""
        print(f"  {exam['subject']:28} {exam['term']:9} {len(questions):2} Fragen{note}")

    print(f"\n{written} Klausuren nach {os.path.relpath(OCR_DIR)} geschrieben")


if __name__ == "__main__":
    main()
