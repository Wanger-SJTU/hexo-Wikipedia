#!/usr/bin/env python3
"""Small OpenAI-compatible proxy for the HexWiki knowledge-base chat.

The browser performs retrieval locally (over wiki-search.json + rendered
documents), then sends the assembled messages here.  This service only keeps
the Ollama endpoint private and adds CORS for the Hexo site.

Configuration (environment):
  OLLAMA_URL    default http://127.0.0.1:11434
  OLLAMA_MODEL  default qwen3:8b
  RAG_HOST      default 0.0.0.0
  RAG_PORT      default 8787
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen3:8b")
HOST = os.environ.get("RAG_HOST", "0.0.0.0")
PORT = int(os.environ.get("RAG_PORT", "8787"))
MAX_BODY = 512 * 1024
MAX_MESSAGES = 20
MAX_CHARS = 40000


def _cors(handler: BaseHTTPRequestHandler) -> None:
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.send_header("Access-Control-Max-Age", "86400")


def _json(handler: BaseHTTPRequestHandler, code: int, payload: dict) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(code)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    _cors(handler)
    handler.end_headers()
    handler.wfile.write(body)


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "HexWikiRAG/1.0"

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("[rag] " + (fmt % args) + "\n")

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        _cors(self)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        if self.path.split("?", 1)[0] == "/health":
            _json(self, 200, {"ok": True, "model": OLLAMA_MODEL, "backend": OLLAMA_URL})
        else:
            _json(self, 404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path.split("?", 1)[0] != "/api/rag/chat":
            _json(self, 404, {"error": "not found"})
            return

        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            _json(self, 413, {"error": "request body too large"})
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:
            _json(self, 400, {"error": "invalid json"})
            return

        raw_messages = payload.get("messages")
        if not isinstance(raw_messages, list) or not raw_messages:
            _json(self, 400, {"error": "messages is required"})
            return
        messages = []
        total = 0
        for item in raw_messages[:MAX_MESSAGES]:
            if not isinstance(item, dict):
                continue
            role = str(item.get("role") or "user")
            if role not in ("system", "user", "assistant"):
                role = "user"
            content = str(item.get("content") or "")
            if not content:
                continue
            total += len(content)
            messages.append({"role": role, "content": content})
        if not messages or total > MAX_CHARS:
            _json(self, 400, {"error": "messages empty or too large"})
            return

        body = json.dumps(
            {
                "model": str(payload.get("model") or OLLAMA_MODEL),
                "messages": messages,
                "stream": True,
                "think": False,
                "options": {
                    "temperature": 0.2,
                    "num_ctx": 8192,
                    "num_predict": 1400,
                },
            },
            ensure_ascii=False,
        ).encode("utf-8")
        req = urllib.request.Request(
            OLLAMA_URL + "/api/chat",
            data=body,
            headers={"Content-Type": "application/json", "Accept": "application/x-ndjson"},
            method="POST",
        )

        try:
            upstream = urllib.request.urlopen(req, timeout=240)
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "replace")[:1000]
            _json(self, 502, {"error": "ollama error", "detail": detail})
            return
        except Exception as exc:
            _json(self, 502, {"error": "ollama unavailable", "detail": str(exc)[:300]})
            return

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache, no-transform")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-Accel-Buffering", "no")
        _cors(self)
        self.end_headers()
        try:
            for line in upstream:
                if not line.strip():
                    continue
                try:
                    event = json.loads(line.decode("utf-8", "replace"))
                except Exception:
                    continue
                if event.get("error"):
                    data = json.dumps({"error": event["error"]}, ensure_ascii=False)
                    self.wfile.write(("data: " + data + "\n\n").encode("utf-8"))
                    self.wfile.flush()
                    break
                msg = event.get("message") or {}
                chunk = msg.get("content") or ""
                if chunk:
                    data = json.dumps({"delta": chunk}, ensure_ascii=False)
                    self.wfile.write(("data: " + data + "\n\n").encode("utf-8"))
                    self.wfile.flush()
                if event.get("done"):
                    break
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            try:
                upstream.close()
            except Exception:
                pass
            try:
                self.wfile.write(b"data: [DONE]\n\n")
                self.wfile.flush()
            except Exception:
                pass


def main() -> None:
    print(f"HexWiki RAG proxy on http://{HOST}:{PORT} -> {OLLAMA_URL} ({OLLAMA_MODEL})", flush=True)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
