#!/usr/bin/env python3
"""把只有一个文档的目录折叠掉。

一个目录的整棵子树只有 1 篇文档时，它不值得再占用一个“目录页”：
- 从侧栏树和目录页的子目录列表中移除；
- 把这篇文档直接挂到最近的、仍然存在的父目录下；
- 如果原目录 URL 和文档 URL 不同，生成 301/跳转映射；
- 如果原目录 URL 就是文档 URL（文章资源目录），只移除目录路由，
  让 Hexo 的文章路由生效。

用法：
    python3 tools/collapse-single-doc-dirs.py source/_data/collections.json
"""
import json
import os
import sys


def doc_key(doc):
    return doc.get("url") or doc.get("title") or ""


def merge_docs(existing, extra):
    merged = {doc_key(d): d for d in existing if doc_key(d)}
    for doc in extra:
        key = doc_key(doc)
        if key and key not in merged:
            merged[key] = doc
    return sorted(
        merged.values(),
        key=lambda d: (str(d.get("date") or ""), str(d.get("title") or "")),
        reverse=True,
    )


def child_path(parent_path, child):
    return child.get("path") or (parent_path + "/" + child.get("name", "")).strip("/")


def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: collapse-single-doc-dirs.py <collections.json>")
    target = os.path.abspath(sys.argv[1])
    with open(target, encoding="utf-8") as fh:
        data = json.load(fh)

    dirs = data.get("dirs") or {}
    redirects = {}

    def collect_docs(path, seen=None):
        if seen is None:
            seen = set()
        if path in seen or path not in dirs:
            return []
        seen.add(path)
        node = dirs[path]
        out = list(node.get("docs") or [])
        for sub in node.get("children") or []:
            out.extend(collect_docs(child_path(path, sub), seen))
        return out

    def register_hidden(node, doc_url):
        node_url = node.get("url")
        if node_url and node_url != doc_url:
            redirects[node_url] = doc_url
        for sub in node.get("children") or []:
            register_hidden(sub, doc_url)

    def collapse(node):
        node_path = str(node.get("path") or "")
        visible = []
        flattened = []
        for child in node.get("children") or []:
            count = int(child.get("count") or 0)
            if count <= 1:
                docs = collect_docs(child_path(node_path, child))
                if len(docs) == 1:
                    doc = docs[0]
                    flattened.append(doc)
                    register_hidden(child, doc.get("url"))
                    continue
            visible.append(collapse(child))

        if node_path and node_path in dirs:
            node["docs"] = merge_docs(node.get("docs") or dirs[node_path].get("docs") or [], flattened)
            dirs[node_path]["docs"] = node["docs"]
            dirs[node_path]["children"] = [
                {
                    "name": sub.get("name"),
                    "url": sub.get("url"),
                    "count": sub.get("count"),
                }
                for sub in visible
            ]
        node["children"] = visible
        return node

    root = {"path": "", "children": data.get("tree") or []}
    for top in list(root["children"]):
        if int(top.get("count") or 0) <= 1:
            docs = collect_docs(top.get("path") or "")
            if len(docs) == 1 and docs[0].get("url"):
                register_hidden(top, docs[0]["url"])
            root["children"].remove(top)
    for top in root["children"]:
        collapse(top)

    data["tree"] = root["children"]

    def rebuild(node):
        if node.get("path") in dirs:
            current = dirs[node["path"]]
            current["docs"] = node.get("docs") or current.get("docs") or []
            current["children"] = [
                {"name": sub.get("name"), "url": sub.get("url"), "count": sub.get("count")}
                for sub in node.get("children") or []
            ]
        for child in node.get("children") or []:
            rebuild(child)

    for top in root["children"]:
        rebuild(top)

    visible_paths = set()

    def mark(node):
        if node.get("path"):
            visible_paths.add(node["path"])
        for child in node.get("children") or []:
            mark(child)

    for top in root["children"]:
        mark(top)
    data["dirs"] = {path: value for path, value in dirs.items() if path in visible_paths}

    data["groups"] = [
        group for group in (data.get("groups") or []) if int(group.get("count") or 0) > 1
    ]
    data["dir_redirects"] = redirects

    with open(target, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    print(
        "visible_dirs={} hidden_dirs={} redirects={}".format(
            len(data["dirs"]), len(dirs) - len(data["dirs"]), len(redirects)
        )
    )


if __name__ == "__main__":
    main()
