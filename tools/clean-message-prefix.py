#!/usr/bin/env python3
"""清理导入文档标题中的 (N 条消息) 前缀，并可选重命名同名文件。"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "source/_posts/collections")
PATTERN = re.compile(r"^\s*[（(]\s*\d+\s*条消息\s*[）)]\s*")


def strip_title(line):
    m = re.match(r'^title:\s*(?:"(.*)"|\'(.*)\'|(.*))$', line)
    if not m:
        return line, False
    value = next(group for group in m.groups() if group is not None)
    cleaned = PATTERN.sub("", value).strip()
    if cleaned == value or not cleaned:
        return line, False
    return "title: " + json.dumps(cleaned, ensure_ascii=False), True


def main():
    changed_titles = 0
    renamed = 0
    for dp, _, files in os.walk(DOCS):
        for name in files:
            if not name.endswith(".md"):
                continue
            path = os.path.join(dp, name)
            lines = open(path, encoding="utf-8", errors="replace").read().split("\n")
            in_fm = False
            changed = False
            for i, line in enumerate(lines):
                if line.strip() == "---":
                    if not in_fm:
                        in_fm = True
                        continue
                    break
                if in_fm and line.startswith("title:"):
                    new_line, hit = strip_title(line)
                    if hit:
                        lines[i] = new_line
                        changed = True
                    break
            if changed:
                open(path, "w", encoding="utf-8").write("\n".join(lines))
                changed_titles += 1

            # 文件名里如果也有 (N 条消息)，一并去掉
            stem = name[:-3]
            new_stem = PATTERN.sub("", stem).strip()
            if new_stem and new_stem != stem:
                new_path = os.path.join(dp, new_stem + ".md")
                if not os.path.exists(new_path):
                    os.rename(path, new_path)
                    renamed += 1
    print(f"titles={changed_titles} renamed={renamed}")


if __name__ == "__main__":
    main()
