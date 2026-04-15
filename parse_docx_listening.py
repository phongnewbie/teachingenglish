# -*- coding: utf-8 -*-
"""Parse _docx_extract.txt -> structured listening JSON (100 câu)."""
import json
import re

def clean_ws(t):
    return re.sub(r"\s+", " ", (t or "")).strip()

def letter_to_idx(ch, n=4):
    ch = (ch or "A").upper()
    if n == 3:
        return "ABC".index(ch) if ch in "ABC" else 0
    return "ABCD".index(ch) if ch in "ABCD" else 0

def extract_options_abcd(text):
    mopts = re.findall(r"\(([A-D])\)\s*([^()]+?)(?=\([A-D]\)|$)", text, re.DOTALL)
    return [clean_ws(x[1]) for x in mopts[:4]]

def strip_after_last_option(s):
    """Remove junk like '2A.B.C.D.' glued to last option."""
    return re.sub(r"\d+A\.B\.C\.D\..*$", "", s, flags=re.DOTALL).strip()

def extract_part1(part1_text):
    parts = re.split(r"([1-6])A\.B\.C\.D\.", part1_text)
    if len(parts) < 3:
        return []
    out = []

    # Q1: options trong parts[0]
    a1 = extract_options_abcd(parts[0])
    for i in range(len(a1)):
        a1[i] = strip_after_last_option(a1[i])
    blk1 = parts[2] if len(parts) > 2 else ""
    ex1 = re.search(
        r"Giải thích chi tiết đáp án\s*Dịch đáp án:\s*(.+?)(?=\d+\.\s*Hiện Transcript|\d+Hiện Transcript|(?<=\d)Hiện Transcript|PART\s*2|$)",
        blk1,
        re.DOTALL,
    )
    da1 = re.search(r"Đáp án đúng:\s*([A-D])", blk1.split(r"2", 1)[0] if "2" in blk1 else blk1)
    out.append(
        {
            "id": 1,
            "answers": a1,
            "letter": da1.group(1) if da1 else None,
            "explain": clean_ws(ex1.group(1)) if ex1 else "",
        }
    )

    for n in range(2, 7):
        try:
            inter = parts[2 * (n - 1)]
            inter_ans = parts[2 * n] if 2 * n < len(parts) else ""
        except IndexError:
            break
        m = re.search(
            rf"{n}(?:\.\s*|\s*)Hiện Transcript\s*(.+)$",
            inter,
            re.DOTALL,
        )
        body = m.group(1) if m else inter
        a = extract_options_abcd(body)
        for i in range(len(a)):
            a[i] = strip_after_last_option(a[i])
        da = re.search(r"^\s*Đáp án đúng:\s*([A-D])", inter_ans)
        if not da:
            da = re.search(r"Đáp án đúng:\s*([A-D])", inter_ans)
        expl = re.search(
            r"Giải thích chi tiết đáp án\s*Dịch đáp án:\s*(.+?)(?=\d+(?:\.\s*|\s*)Hiện Transcript|(?=\d)Hiện Transcript|PART\s*2|$)",
            inter_ans,
            re.DOTALL,
        )
        out.append(
            {
                "id": n,
                "answers": a,
                "letter": da.group(1) if da else None,
                "explain": clean_ws(expl.group(1)) if expl else "",
            }
        )
    return out

def extract_part2(p2_text):
    """Tách theo NA.B.C. (có cả 8Can you... không có Hiện Transcript)."""
    parts = re.split(
        r"(?<![0-9])([1-9]|1\d|2\d|30|31)(?!\d)A\.B\.C\.",
        p2_text,
    )
    out = []
    if len(parts) < 3:
        return out
    for n in range(7, 32):
        try:
            k = parts.index(str(n))
        except ValueError:
            continue
        opt_src = parts[k - 1] if k >= 1 else ""
        ans_src = parts[k + 1] if k + 1 < len(parts) else ""
        if n == 7:
            body = re.sub(
                r"^.*?7(?:\.\s*|\s*)Hiện Transcript\s*",
                "",
                opt_src,
                count=1,
                flags=re.DOTALL,
            )
        else:
            m = re.search(
                rf"{n}(?:\.\s*|\s*)(?:Hiện Transcript\s*)?(.+)$",
                opt_src,
                re.DOTALL,
            )
            body = m.group(1) if m else opt_src
        qm = re.match(r"^(.+?)(?=\([A-C]\))", body, re.DOTALL)
        qtext = clean_ws(qm.group(1)) if qm else ""
        mopts = re.findall(r"\(([A-C])\)\s*([^()]+?)(?=\([A-C]\)|$)", body, re.DOTALL)
        answers = [clean_ws(x[1]) for x in mopts[:3]]
        for j in range(len(answers)):
            answers[j] = re.sub(r"\d+A\.B\.C\..*$", "", answers[j]).strip()
        da = re.search(r"^\s*Đáp án đúng:\s*([A-C])", ans_src)
        if not da:
            da = re.search(r"Đáp án đúng:\s*([A-C])", ans_src)
        letter = da.group(1) if da else None
        expl = re.search(
            r"Giải thích chi tiết đáp án\s*Dịch đáp án:\s*(.+?)(?=\d+(?:\.\s*|\s*)(?:Hiện Transcript\s*)?(?:[A-Za-z'’])|PART\s*3|$)",
            ans_src,
            re.DOTALL,
        )
        out.append(
            {
                "id": n,
                "question": qtext,
                "answers": answers,
                "letter": letter,
                "explain": clean_ws(expl.group(1)) if expl else "",
            }
        )
    return out

def parse_qnum_before_keyword(rest_text, kw_start):
    """Lấy số câu (32–100) ngay trước What/Where/... (xử lý 497What, 1564What)."""
    i = kw_start - 1
    digits = []
    while i >= 0 and rest_text[i].isdigit() and len(digits) < 4:
        digits.append(rest_text[i])
        i -= 1
    digits.reverse()
    if not digits:
        return None
    s = "".join(digits)
    n = int(s)
    if 32 <= n <= 100:
        return n
    if len(s) >= 2:
        n2 = int(s[-2:])
        if 32 <= n2 <= 100:
            return n2
    if len(s) >= 3:
        n3 = int(s[-3:])
        if 32 <= n3 <= 100:
            return n3
    return None


def extract_part34(rest_text):
    keys = r"(?:What|Where|Why|How|Who|When|Which|According|Look)\b"
    kw_iter = list(re.finditer(keys, rest_text))
    markers = []
    for m in kw_iter:
        num = parse_qnum_before_keyword(rest_text, m.start())
        if num is None:
            continue
        kw_start = m.start()
        block_start = kw_start - len(str(num))
        markers.append((block_start, kw_start, num, m.group(0)))
    out = []
    for i, (block_start, kw_start, num, _kw) in enumerate(markers):
        end = markers[i + 1][0] if i + 1 < len(markers) else len(rest_text)
        block = rest_text[block_start:end]
        qfull = re.match(rf"^\d+\s*(.+?)(?=A\.\s|Đáp án đúng:|Giải thích)", block, re.DOTALL)
        if not qfull:
            qfull = re.match(rf"^.+?(?=A\.\s|Đáp án đúng:|Giải thích)", block, re.DOTALL)
        qtext = clean_ws(qfull.group(1)) if qfull else ""
        answers = []
        for L in ("A", "B", "C", "D"):
            mm = re.search(
                rf"{L}\.\s*([^\n]+?)(?=(?:[A-D]\.\s)|Đáp án đúng:|Giải thích|$)",
                block,
            )
            if mm:
                answers.append(clean_ws(mm.group(1)))
        da = re.search(r"Đáp án đúng:\s*([A-D])", block)
        letter = da.group(1) if da else None
        expl = re.search(
            r"Giải thích chi tiết đáp án\s*Dịch đáp án:\s*(.+?)(?=(?<![0-9])(?:3[2-9]|[4-9]\d|100)\s*(?:What|Where|Why|How|Who|When|Which|According|Look)\b|PART\s*4|$)",
            block,
            re.DOTALL,
        )
        part = "part3" if num <= 70 else "part4"
        while len(answers) < 4:
            answers.append("")
        out.append(
            {
                "id": num,
                "part": part,
                "question": qtext,
                "answers": answers[:4],
                "letter": letter,
                "explain": clean_ws(expl.group(1)) if expl else "",
            }
        )
    return out

def main():
    path = r"c:\Users\ACER\Desktop\codetest\_docx_extract.txt"
    with open(path, "r", encoding="utf-8") as f:
        s = f.read()

    p2s = s.find("PART 2")
    p3s = s.find("PART 3")
    part1_text = s[:p2s] if p2s >= 0 else s
    part2_text = s[p2s:p3s] if p2s >= 0 and p3s > p2s else ""
    # Export Word dính "PART 2" + "7Hiện" thành "PART 27Hiện"
    part2_text = re.sub(
        r"(PART\s*2)(\d)(Hiện Transcript)",
        r"\1 \2\3",
        part2_text,
        flags=re.IGNORECASE,
    )
    part34_text = s[p3s:] if p3s >= 0 else ""

    rows = []

    p1 = extract_part1(part1_text)
    for r in p1:
        letter = r.get("letter")
        rows.append(
            {
                "id": r["id"],
                "part": "part1",
                "partLabel": "PART 1",
                "title": f"Question {r['id']}",
                "image": "",
                "question": f"(Mô tả tranh) — Câu {r['id']}",
                "answers": r["answers"],
                "correct": letter_to_idx(letter, 4) if letter else 0,
                "explain": r["explain"] or (f"Đáp án đúng: {letter}" if letter else ""),
            }
        )

    p2 = extract_part2(part2_text)
    for r in p2:
        letter = r.get("letter")
        rows.append(
            {
                "id": r["id"],
                "part": "part2",
                "partLabel": "PART 2",
                "title": f"Question {r['id']}",
                "image": "",
                "question": r["question"],
                "answers": r["answers"],
                "correct": letter_to_idx(letter, 3) if letter else 0,
                "explain": r["explain"],
            }
        )

    p34 = extract_part34(part34_text)
    for r in p34:
        letter = r.get("letter")
        rows.append(
            {
                "id": r["id"],
                "part": r["part"],
                "partLabel": "PART 3" if r["part"] == "part3" else "PART 4",
                "title": f"Question {r['id']}",
                "image": "",
                "question": r["question"],
                "answers": r["answers"],
                "correct": letter_to_idx(letter, 4) if letter else 0,
                "explain": r["explain"],
            }
        )

    rows.sort(key=lambda x: x["id"])
    seen = set()
    uniq = []
    for r in rows:
        if r["id"] in seen:
            continue
        seen.add(r["id"])
        uniq.append(r)

    log_path = r"c:\Users\ACER\Desktop\codetest\_parse_log.txt"
    with open(log_path, "w", encoding="utf-8") as f:
        f.write(f"total: {len(uniq)}\n")
        f.write(f"missing: {[i for i in range(1, 101) if i not in seen]}\n")

    out_path = r"c:\Users\ACER\Desktop\codetest\_parsed_listening.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(uniq, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
