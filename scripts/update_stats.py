"""Refresh the download and star counts marked with data-stat in the site's pages.

Run from the repository root. Rewrites only the text inside <... data-stat="name">...</...>;
the fetched date changes only when a number does. Exits non-zero if any source cannot be read,
so a failed fetch never overwrites the last good numbers.
"""
import datetime
import json
import re
import sys
import urllib.request

PAGES = ["index.html", "projects.html"]
HF = "https://huggingface.co/api"
MODEL = "chinmays18/medical-prescription-ocr"
DATASET = "chinmays18/medical-prescription-dataset"
OCR_REPO = "JonSnow1807/Medical-Prescription-OCR"


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "chinmay18.com-stats"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def main():
    model = get(f"{HF}/models/{MODEL}?expand[]=downloads&expand[]=downloadsAllTime")
    dataset = get(f"{HF}/datasets/{DATASET}?expand[]=downloadsAllTime")
    repo = get(f"https://api.github.com/repos/{OCR_REPO}")
    stats = {
        "hf_model_all": model["downloadsAllTime"],
        "hf_model_30d": model["downloads"],
        "hf_dataset_all": dataset["downloadsAllTime"],
        "gh_ocr_stars": repo["stargazers_count"],
    }
    for name, value in stats.items():
        if not isinstance(value, int) or value < 0:
            sys.exit(f"bad value for {name}: {value!r}")

    changed = False
    texts = {}
    for page in PAGES:
        text = open(page, encoding="utf-8").read()
        for name, value in stats.items():
            pattern = re.compile(r'(data-stat="%s">)([^<]*)(<)' % name)
            text, n = pattern.subn(lambda m: m.group(1) + f"{value:,}" + m.group(3), text)
            if n == 0 and name != "gh_ocr_stars" and page == "projects.html":
                sys.exit(f"{page}: no data-stat={name}")
        texts[page] = text
        if text != open(page, encoding="utf-8").read():
            changed = True

    if not changed:
        print("no change")
        return
    today = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    for page, text in texts.items():
        text = re.sub(r'(data-stat="fetched">)[^<]*(<)', lambda m: m.group(1) + today + m.group(2), text)
        open(page, "w", encoding="utf-8").write(text)
    print("updated", stats, today)


if __name__ == "__main__":
    main()
