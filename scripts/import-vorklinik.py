#!/usr/bin/env python3
"""Imports the Vorklinik Altklausuren (Semester 1-4) into data/vorklinik.json.

The source is a shared student archive of exam PDFs. Roughly 70% of them still
carry a text layer, so those need no OCR at all — this script parses them
directly. The layouts differ between institutes but share one skeleton:

    <number>.  <stem>
    A  <choice>            (also "A)", "(A)", "a.")
    ...
    <a page that is nothing but "1. E  2. B  3. C …">   <- the answer key

Nothing here ever guesses an answer. A question is emitted only when the exam's
own key names a letter for it, which is why exams without a key are skipped
outright rather than filled in by a model.

Output goes to data/vorklinik.json, kept separate from data/questions.json
because the docsdocs export rewrites that file wholesale.

    python3 scripts/import-vorklinik.py [--dry-run]
"""
import argparse
import hashlib
import json
import os
import re
import sys
import unicodedata
from collections import Counter

try:
    import fitz  # PyMuPDF
except ImportError:
    sys.exit("PyMuPDF missing — install it with: pip3 install pymupdf")

ROOT = "/Users/bebo/Downloads/Von Studierenden für Studierende/Altklausuren"
DATA = os.path.join(os.path.dirname(__file__), "..", "data")
OUTPUT = os.path.join(DATA, "vorklinik.json")
# Answer keys that exist only as a scan, so they cannot be read out of the PDF
# text. Hand-checked against the images; see the file's own note.
KEYS_PATH = os.path.join(DATA, "vorklinik-keys.json")
# Exams with no text layer at all, transcribed from the page images. One file
# per exam, checked in so a re-run doesn't need the transcription again.
OCR_DIR = os.path.join(DATA, "vorklinik-ocr")

# Only the pre-clinical semesters: 5-9 already come from docsdocs.
SCOPE = [
    ("iRM", "1. Semester IRM"), ("iRM", "2. Semester IRM"),
    ("iRM", "3. Semester IRM"), ("iRM", "4. Semester IRM"),
    ("Regelstudiengang", "1. Semester"), ("Regelstudiengang", "2. Semester"),
    ("Regelstudiengang", "3. Semester"), ("Regelstudiengang", "4. Semester"),
]

# Memory protocols, question pools and blank answer sheets are a different kind
# of document; they are held back for a separate archive.
NOT_AN_EXAM = re.compile(
    r"gedächtnis|gedanken|protokoll|fragenpool|sortierte|blanko|vorlage|tutorium|repetitorium",
    re.I,
)

# "A", "A)", "(A)", "A." — the letter must be followed by a separator, or
# "CH3COOH" reads as choice C and "Eine Substanz" as choice E.
CHOICE = re.compile(r"(?m)^[ \t]*\(?([A-Ea-e])[\)\.]?(?=[ \t]|$)[ \t]*")
QNUM = re.compile(
    r"(?m)^[ \t]*(?:(?:Frage|Aufgabe)[ \t]+(\d{1,3})\b[\.\):]?|(\d{1,3})[ \t]*[\.\)])[ \t]*"
)
KEYPAIR = re.compile(r"\b(\d{1,3})\s*[\.\):=\-]?\s*\(?([A-Ea-e])\)?(?![A-Za-zÄÖÜäöü])")
# A question that points at a picture is unanswerable without the picture.
FIGURE = re.compile(
    r"\b(Abbildung|Abb\.|abgebildet|Bild oben|Grafik|Schaubild|"
    r"mit \d bezeichnet|bezeichnete Struktur|Pfeil)\b",
    re.I,
)


# --- subjects -------------------------------------------------------------
# Both curricula teach the same subjects under different folder names; the two
# are merged so "Anatomie II" is one subject with papers from either track.
def subject_of(folder, filename):
    name = re.sub(r"\s*-\s*(Histo|Organe|Neuro)\b.*$", "", folder).strip()

    if name.startswith("Ersti-ABC"):
        text = filename.lower()
        if "chem" in text:
            return "Chemie"
        if "anatomie" in text or "ana" in text:
            return "Anatomie I"
        return "Biologie"

    aliases = {
        "MedPsych I": "Medizinische Psychologie I",
        "MedPsych IV": "Medizinische Psychologie IV",
    }
    return aliases.get(name, name)


SEMESTER_OF = {
    "Anatomie I": 1, "Biologie": 1, "Chemie": 1, "Physik": 1,
    "Terminologie": 1, "Medizinische Psychologie I": 1,
    "Ärztliche Fertigkeiten I": 1,
    "Anatomie II": 2, "Biochemie I": 2, "Physiologie I": 2,
    "Anatomie III": 3, "Biochemie II": 3, "Physiologie II": 3,
    "Ärztliche Fertigkeiten III": 3,
    "Anatomie IV": 4, "Biochemie III": 4, "Physiologie III": 4,
    "Medizinische Psychologie IV": 4,
}


# --- exam term ------------------------------------------------------------
def year2(value):
    value = int(value)
    return value % 100


def winter_label(first, second=None):
    first = year2(first)
    second = year2(second) if second is not None else (first + 1) % 100
    return f"WS {first:02d}/{second:02d}"


def exam_term(filename, semester=None):
    """"Anatomie II - Nachklausur SS22.pdf" -> ("SS 22", "Nachklausur")."""
    text = filename.replace("_", " ").replace("-", " ")
    text = re.sub(r"\.pdf$", "", text, flags=re.I)
    # "HauptklausurWS 24_25" — give the term marker back its word boundary.
    text = re.sub(r"(?<=[a-zäöü])(WS|SS|SoSe|WiSe)", r" \1", text)

    sitting = ""
    if re.search(r"\b(2\.\s*Nach|Zweitnach)", text, re.I):
        sitting = "2. Nachklausur"
    elif re.search(r"\b(Nachklausur|NP\b|WH.?Klausur|Wdh|Wiederholung)", text, re.I):
        sitting = "Nachklausur"

    winter = re.search(r"\b(?:WS|WiSe|Winter)\s*(\d{2,4})\s*(?:/|\s)?\s*(\d{2,4})?", text, re.I)
    if winter:
        first, second = winter.group(1), winter.group(2)
        # "WS2425" is one token holding both years. Only split it when no second
        # year followed — in "WS 2021_22" the 2021 really is the year.
        if second is None and len(first) == 4 and int(first[2:]) == int(first[:2]) + 1:
            first, second = first[:2], first[2:]
        return winter_label(first, second), sitting

    summer = re.search(r"\b(?:SS|SoSe|Sommer)\s*(\d{2,4})", text, re.I)
    if summer:
        return f"SS {year2(summer.group(1)):02d}", sitting

    # "Neuro 2004 2005 WS", "Wdh Klausur ... 2014 15", "Klausur BWA 2012 13":
    # a span of two consecutive years is always a winter term.
    span = re.search(r"\b(19|20)(\d{2})[ /]+((?:19|20)?\d{2})\b", text)
    if span:
        first = int(span.group(2))
        second = year2(span.group(3))
        if second == (first + 1) % 100:
            return winter_label(first, second), sitting

    # "Chemieklausur 14.02.2013" — the month says which term it closed.
    dated = re.search(r"\b(\d{1,2})\.(\d{1,2})\.((?:19|20)?\d{2})\b", text)
    if dated:
        month, year = int(dated.group(2)), year2(dated.group(3))
        if month <= 4:
            return winter_label((year - 1) % 100, year), sitting
        if 5 <= month <= 10:
            return f"SS {year:02d}", sitting

    # "Histo 2004", "Medizinische Psychologie ... 2021" — a bare year. Which
    # term it was depends on when the subject is taught: odd semesters run in
    # winter, even ones in summer.
    bare = re.search(r"\b(19|20)(\d{2})\b", text)
    if bare and semester:
        year = int(bare.group(2))
        if semester % 2 == 1:
            return winter_label(year, None), sitting
        return f"SS {year:02d}", sitting

    return None, sitting


# --- parsing --------------------------------------------------------------
def clean(text):
    text = unicodedata.normalize("NFC", text).replace("­", "")
    text = text.replace("ﬁ", "fi").replace("ﬂ", "fl")
    lines = [line.strip() for line in text.split("\n")]
    out = []
    for line in lines:
        if not line:
            out.append("")
        elif out and out[-1] and not re.search(r"[.:?!;]$", out[-1]):
            # PDF line breaks are layout, not meaning — rejoin wrapped lines.
            out[-1] += " " + line
        else:
            out.append(line)
    text = re.sub(r"[ \t]+", " ", "\n".join(out))
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def is_key_page(text):
    pairs = len(KEYPAIR.findall(text))
    words = len(re.findall(r"[A-Za-zÄÖÜäöüß]{4,}", text))
    return pairs >= 10 and words < max(40, pairs * 3)


def find_key(pages):
    best = {}
    for text in pages:
        if not is_key_page(text):
            continue

        # A blank answer sheet lists every option per question ("1. A B C D E")
        # and only marks the right one graphically. It looks exactly like a key
        # to a text parser, and would hand back "A" for every single question.
        numbers = len(re.findall(r"(?m)^[ \t]*\d{1,3}[ \t]*[\.\)]", text))
        letters = len(re.findall(r"(?m)^[ \t]*\(?[A-Ea-e]\)?[ \t]*$", text))
        if numbers and letters / numbers >= 2.5:
            continue

        pairs = {}
        for match in KEYPAIR.finditer(text):
            number = int(match.group(1))
            if 1 <= number <= 200:
                pairs[number] = match.group(2).upper()
        if len(pairs) > len(best):
            best = pairs

    # Last line of defence: a real key spreads across the options. One letter
    # answering almost everything means we misread something, whatever it was.
    if len(best) >= 15:
        top = Counter(best.values()).most_common(1)[0][1]
        if top / len(best) > 0.6:
            return {}
    return best


def run_of(marks, first):
    kept, expect = [], first
    for start, end, letter in marks:
        if letter == expect:
            kept.append((start, end, letter.upper()))
            expect = chr(ord(expect) + 1)
    return kept


def split_choices(block):
    marks = [(m.start(), m.end(), m.group(1)) for m in CHOICE.finditer(block)]
    # Uppercase first: a lone lowercase "a" line is far likelier to be prose.
    kept = run_of([m for m in marks if m[2].isupper()], "A")
    if len(kept) < 2:
        kept = run_of([m for m in marks if m[2].islower()], "a")
    if len(kept) < 2:
        return None, None

    stem = block[: kept[0][0]]
    choices = []
    for index, (start, end, letter) in enumerate(kept):
        stop = kept[index + 1][0] if index + 1 < len(kept) else len(block)
        choices.append({"id": letter, "text": clean(block[end:stop])})
    return clean(stem), choices


def parse_exam(path, external_key=None):
    document = fitz.open(path)
    pages = [document[i].get_text() for i in range(len(document))]
    document.close()

    key = find_key(pages) or (external_key or {})
    if len(key) < 5:
        return [], "kein Lösungsschlüssel"

    text = "\n".join(page for page in pages if not is_key_page(page))
    marks = [
        (m.start(), m.end(), int(m.group(1) or m.group(2)))
        for m in QNUM.finditer(text)
    ]
    # Follow the numbering upward so dates and dosages don't split blocks, but
    # tolerate a small gap: one number swallowed by the layout must not end the
    # run and cost us the rest of the exam.
    kept, last = [], 0
    for start, end, number in marks:
        if last < number <= last + 3:
            kept.append((start, end, number))
            last = number
    if len(kept) < 5:
        return [], "keine Fragennummerierung"

    questions, dropped = [], Counter()
    for index, (start, end, number) in enumerate(kept):
        stop = kept[index + 1][0] if index + 1 < len(kept) else len(text)
        block = text[end:stop]

        if number not in key:
            dropped["nicht im Schlüssel"] += 1
            continue
        stem, choices = split_choices(block)
        if not choices:
            dropped["keine Antwortoptionen"] += 1
            continue
        if not stem or len(stem) < 12:
            dropped["kein Fragetext"] += 1
            continue
        if key[number] not in {choice["id"] for choice in choices}:
            dropped["Lösungsbuchstabe fehlt"] += 1
            continue
        if any(not choice["text"] for choice in choices):
            dropped["leere Antwortoption"] += 1
            continue
        if FIGURE.search(block):
            dropped["Abbildungsbezug"] += 1
            continue
        # Some archives wrap the exam in a foreword; that prose lands in the
        # first block and is not a question.
        if len(stem) > 700 or "fachschaft" in stem.lower():
            dropped["Fließtext statt Frage"] += 1
            continue

        questions.append({
            "number": number,
            "stem": stem,
            "choices": choices,
            "answer": key[number],
        })
    return questions, dropped


def question_id(subject, topic, stem, choices):
    """Identity is the exam plus the full wording — deliberately not the question
    number, because the archive holds several exams twice (a scan and a
    corrected re-type) with the same question under a different number.

    The choices are part of it: stems like "Welche Aussage zum Colon ist
    richtig?" repeat verbatim within one exam, and keying on the stem alone
    would throw away every question after the first.
    """
    body = stem + "|" + "|".join(f"{c['id']}{c['text']}" for c in choices)
    seed = f"{subject}|{topic}|{re.sub(r'[^a-zäöüß0-9]', '', body.lower())}"
    return "vk-" + hashlib.sha1(seed.encode("utf-8")).hexdigest()[:16]


def load_ocr(external_keys, out, seen, skipped):
    """Exams that had no text layer, transcribed from the page images.

    These go through the same gate as the parsed PDFs: a question is kept only
    if the hand-checked key names a letter for it and that letter is among the
    transcribed options.
    """
    if not os.path.isdir(OCR_DIR):
        return 0

    added = 0
    for name in sorted(os.listdir(OCR_DIR)):
        if not name.endswith(".json"):
            continue
        with open(os.path.join(OCR_DIR, name), encoding="utf-8") as handle:
            exam = json.load(handle)

        subject, term, sitting = exam["subject"], exam["term"], exam.get("sitting", "")
        key = external_keys.get(f"{subject}|{term}|{sitting}")
        if not key:
            skipped["OCR ohne geprüften Schlüssel"] += 1
            continue

        topic = f"{term} {sitting}".strip()
        for question in exam["questions"]:
            number = question["number"]
            choices = [
                {"id": letter, "text": clean(text)}
                for letter, text in sorted(question["choices"].items())
            ]
            stem = clean(question["stem"])

            if number not in key:
                skipped["OCR: nicht im Schlüssel"] += 1
                continue
            if len(choices) < 2 or any(not choice["text"] for choice in choices):
                skipped["OCR: Antwortoptionen unvollständig"] += 1
                continue
            if key[number] not in {choice["id"] for choice in choices}:
                skipped["OCR: Lösungsbuchstabe fehlt"] += 1
                continue
            if len(stem) < 12:
                skipped["OCR: kein Fragetext"] += 1
                continue
            if question.get("figure"):
                skipped["OCR: Abbildungsbezug"] += 1
                continue

            identifier = question_id(subject, topic, stem, choices)
            if identifier in seen:
                skipped["OCR: doppelte Frage"] += 1
                continue
            seen[identifier] = True
            out.append({
                "id": identifier,
                "subject": subject,
                "topic": topic,
                "source": f"{subject} / {topic}",
                "stem": stem,
                "choices": choices,
                "answer": key[number],
                "tags": ["Vorklinik", exam.get("track", "iRM"), "OCR"],
            })
            added += 1
    return added


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    files = []
    for track, semester in SCOPE:
        base = os.path.join(ROOT, track, semester)
        if not os.path.isdir(base):
            continue
        for dirpath, _, names in os.walk(base):
            for name in sorted(names):
                if not name.lower().endswith(".pdf") or NOT_AN_EXAM.search(name):
                    continue
                relative = os.path.relpath(os.path.join(dirpath, name), base)
                folder = relative.split(os.sep)[0] if os.sep in relative else ""
                if not folder or NOT_AN_EXAM.search(relative):
                    continue
                files.append((track, os.path.join(dirpath, name), folder, name))

    external_keys, key_for_file = {}, {}
    if os.path.exists(KEYS_PATH):
        with open(KEYS_PATH, encoding="utf-8") as handle:
            for name, entry in json.load(handle).get("keys", {}).items():
                answers = {int(n): v for n, v in entry["answers"].items()}
                external_keys[name] = answers
                # A key belongs to one exam version. The same exam often exists
                # in both curricula with its questions in a different order, and
                # applying the key across them would silently mis-answer it.
                if entry.get("questions_file"):
                    key_for_file[entry["questions_file"]] = answers

    out, seen, skipped = [], {}, Counter()
    reasons = Counter()

    for track, path, folder, name in files:
        subject = subject_of(folder, name)
        if subject not in SEMESTER_OF:
            skipped["unbekanntes Fach"] += 1
            continue
        term, sitting = exam_term(name, SEMESTER_OF[subject])
        if not term:
            skipped["kein Semester erkennbar"] += 1
            continue

        questions, info = parse_exam(path, key_for_file.get(name))
        if not questions:
            skipped[info if isinstance(info, str) else "nichts geparst"] += 1
            continue
        if isinstance(info, Counter):
            reasons.update(info)

        topic = f"{term} {sitting}".strip()
        for question in questions:
            identifier = question_id(subject, topic, question["stem"], question["choices"])
            if identifier in seen:
                skipped["doppelte Frage"] += 1
                continue
            seen[identifier] = True
            out.append({
                "id": identifier,
                "subject": subject,
                "topic": topic,
                "source": f"{subject} / {topic}",
                "stem": question["stem"],
                "choices": question["choices"],
                "answer": question["answer"],
                "tags": ["Vorklinik", track],
            })

    ocr_added = load_ocr(external_keys, out, seen, skipped)

    out.sort(key=lambda q: (SEMESTER_OF[q["subject"]], q["subject"], q["topic"], q["id"]))

    papers = len({(q["subject"], q["topic"]) for q in out})
    print(f"PDFs im Zuschnitt:  {len(files)}")
    print(f"Klausuren übernommen: {papers}")
    print(f"Fragen:               {len(out)}  (davon {ocr_added} aus OCR)")
    print("\nübersprungene Dateien:")
    for reason, count in skipped.most_common():
        print(f"  {count:4}  {reason}")
    print("\nübersprungene Einzelfragen:")
    for reason, count in reasons.most_common():
        print(f"  {count:4}  {reason}")
    print("\npro Fach:")
    per = Counter(q["subject"] for q in out)
    for subject in sorted(per, key=lambda s: (SEMESTER_OF[s], s)):
        terms = len({q["topic"] for q in out if q["subject"] == subject})
        print(f"  S{SEMESTER_OF[subject]}  {subject:28} {per[subject]:5} Fragen  aus {terms:2} Klausuren")

    if args.dry_run:
        print("\n--dry-run: nichts geschrieben")
        return

    with open(OUTPUT, "w", encoding="utf-8") as handle:
        json.dump(out, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(f"\ngeschrieben: {os.path.relpath(OUTPUT)}")


if __name__ == "__main__":
    main()
