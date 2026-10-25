#!/usr/bin/env python3
"""根据当前 source/_posts/collections 重新生成 source/_data/collections.json。"""
import json
import os
import re
import unicodedata
import urllib.parse
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "source/_posts/collections")
OUT = os.path.join(ROOT, "source/_data/collections.json")
URL_PREFIX = "/collections/"


def slug_segment(value):
    text = unicodedata.normalize("NFKC", str(value or ""))
    text = re.sub(r'[\\/:*?"<>|#%&{}$!@+`=]+', "-", text)
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"-+", "-", text)
    text = re.sub(r"^[-.]+|[-.]+$", "", text)
    return text[:90] or "untitled"


def encode(url):
    return urllib.parse.quote(url, safe="/%")


def parse_doc(path):
    raw = open(path, encoding="utf-8", errors="replace").read()
    if not raw.startswith("---"):
        return None
    end = raw.find("\n---", 3)
    if end < 0:
        return None
    fm = raw[3:end]
    try:
        data = yaml.safe_load(fm) or {}
    except Exception:
        return None
    title = str(data.get("title") or "").strip()
    permalink = str(data.get("permalink") or "").strip()
    if not title or not permalink:
        return None
    date = str(data.get("date") or "")[:10]
    tags = data.get("tags") or []
    if isinstance(tags, str):
        tags = [tags]
    rel = os.path.relpath(path, DOCS).replace(os.sep, "/")
    if rel.endswith(".md"):
        rel = rel[:-3]
    return {
        "rel": rel,
        "title": title,
        "permalink": permalink,
        "url": encode(permalink),
        "date": date,
        "tags": [str(t) for t in tags],
    }


def main():
    global yaml
    import yaml  # noqa: E402

    docs = []
    for dp, _, files in os.walk(DOCS):
        for name in files:
            if not name.endswith(".md"):
                continue
            item = parse_doc(os.path.join(dp, name))
            if item:
                docs.append(item)
    docs.sort(key=lambda d: d["rel"])

    root = {"name": "", "path": "", "url": URL_PREFIX, "children": {}, "docs": []}
    for doc in docs:
        parts = doc["rel"].split("/")[:-1]
        node = root
        for part in parts:
            child = node["children"].get(part)
            if child is None:
                child_path = f'{node["path"]}/{part}'.strip("/")
                child_route = "/".join(slug_segment(p) for p in child_path.split("/"))
                child = {
                    "name": part,
                    "path": child_path,
                    "route": child_route,
                    "url": URL_PREFIX + child_route + "/",
                    "children": {},
                    "docs": [],
                }
                node["children"][part] = child
            node = child
        node["docs"].append({"title": doc["title"], "url": doc["url"], "date": doc["date"]})

    def finish(node):
        total = len(node["docs"])
        for child in node["children"].values():
            total += finish(child)
        node["count"] = total
        node["children_arr"] = sorted(
            node["children"].values(),
            key=lambda c: (-c["count"], c["name"]),
        )
        node["docs"].sort(key=lambda d: (d["date"], d["title"]), reverse=True)
        return total

    finish(root)

    def to_tree(node):
        return [
            {
                "name": child["name"],
                "path": child["path"],
                "url": child["url"],
                "count": child["count"],
                "children": to_tree(child),
            }
            for child in node["children_arr"]
        ]

    dirs = {}

    def walk(node, ancestors):
        for child in node["children_arr"]:
            dirs[child["path"]] = {
                "name": child["name"],
                "path": child["path"],
                "route": child["route"],
                "url": child["url"],
                "count": child["count"],
                "ancestors": ancestors,
                "children": [
                    {"name": sub["name"], "url": sub["url"], "count": sub["count"]}
                    for sub in child["children_arr"]
                ],
                "docs": child["docs"],
            }
            walk(child, ancestors + [{"name": child["name"], "url": child["url"]}])

    walk(root, [{"name": "文档库", "url": URL_PREFIX}])

    groups = []
    for child in root["children_arr"]:
        items = [d for d in docs if d["rel"].startswith(child["path"] + "/")]
        items.sort(key=lambda d: d["date"], reverse=True)
        groups.append(
            {
                "name": child["name"],
                "count": child["count"],
                "url": child["url"],
                "examples": [
                    {"title": d["title"], "url": d["url"]} for d in items[:4]
                ],
            }
        )

    tags = set()
    for doc in docs:
        tags.update(doc["tags"])
    recent = [
        {"title": d["title"], "url": d["url"], "updated": d["date"]}
        for d in sorted(docs, key=lambda d: d["date"], reverse=True)[:10]
    ]
    latest = max((d["date"] for d in docs), default="")
    data = {
        "count": len(docs),
        "groups": groups,
        "tree": to_tree(root),
        "dirs": dirs,
        "recent": recent,
        "tags": len(tags),
        "updated": latest,
        "url": URL_PREFIX,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    print(f"docs={len(docs)} dirs={len(dirs)} groups={len(groups)} -> {OUT}")


if __name__ == "__main__":
    main()
