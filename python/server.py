"""Receives HuddleWatch webhooks: new Facebook group posts and comments.

    HUDDLEWATCH_SECRET=whsec_... python3 server.py
"""
import hashlib
import hmac
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

SECRET = os.environ.get("HUDDLEWATCH_SECRET", "").encode()
PORT = int(os.environ.get("PORT", "8787"))
seen = set()  # use a database in production; retries resend the same id


def verified(raw: bytes, header: str | None) -> bool:
    if not SECRET:
        return True
    expected = "sha256=" + hmac.new(SECRET, raw, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header or "")


class Hook(BaseHTTPRequestHandler):
    def do_POST(self):
        raw = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        if not verified(raw, self.headers.get("X-HuddleWatch-Signature")):
            self.send_response(401)
            self.end_headers()
            return
        self.send_response(200)
        self.end_headers()

        event = json.loads(raw)
        if event["id"] in seen:
            return
        seen.add(event["id"])

        if event.get("type") == "comment":
            print(f"[comment] {event['group']} · {event['author']}: {event['body']}\n  {event['permalink']}\n  on post {event['post_permalink']}", flush=True)
        else:
            print(f"[post] {event['group']} · {event['author']} (score {event['score']}): {event['body']}\n  {event['permalink']}", flush=True)


HTTPServer(("", PORT), Hook).serve_forever()
