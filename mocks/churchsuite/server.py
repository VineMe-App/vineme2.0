#!/usr/bin/env python3

import json
import os
import re
import time
import uuid
from copy import deepcopy
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse


PORT = int(os.environ.get("PORT") or os.environ.get("CHURCHSUITE_MOCK_PORT", "8030"))
HOST = os.environ.get("CHURCHSUITE_MOCK_HOST") or (
    "0.0.0.0" if os.environ.get("PORT") else "127.0.0.1"
)
TOKEN_TTL_SECONDS = 3600

SEED_CONTACTS = [
    {
        "id": "cs-contact-existing-1",
        "first_name": "Grace",
        "last_name": "Taylor",
        "email": "grace.taylor@example.com",
        "mobile": "+447700900101",
        "status": "active",
        "tags": ["member"],
        "vulnerable": False,
    },
    {
        "id": "cs-contact-vulnerable-1",
        "first_name": "Sam",
        "last_name": "Morgan",
        "email": "sam.morgan@example.com",
        "mobile": "+447700900202",
        "status": "active",
        "tags": ["member", "pastoral-care"],
        "vulnerable": True,
    },
    {
        "id": "cs-contact-duplicate-email",
        "first_name": "Alex",
        "last_name": "Reed",
        "email": "shared@example.com",
        "mobile": "+447700900303",
        "status": "active",
        "tags": ["member"],
        "vulnerable": False,
    },
    {
        "id": "cs-contact-shared-email",
        "first_name": "Jordan",
        "last_name": "Lee",
        "email": "shared@example.com",
        "mobile": "+447700900505",
        "status": "active",
        "tags": ["member"],
        "vulnerable": False,
    },
]

CONTACTS = deepcopy(SEED_CONTACTS)
SCENARIO = "normal"


def normalize_email(value):
    return str(value or "").strip().lower()


def normalize_phone(value):
    compact = re.sub(r"[^\d+]", "", str(value or ""))
    if not compact:
        return ""
    if compact.startswith("+"):
        return "+" + re.sub(r"\D", "", compact[1:])
    digits = re.sub(r"\D", "", compact)
    if digits.startswith("0"):
        return "+44" + digits[1:]
    return "+" + digits


def as_churchsuite_contact(contact):
    name = f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip()
    return {
        "id": contact["id"],
        "type": "contact",
        "first_name": contact.get("first_name", ""),
        "last_name": contact.get("last_name", ""),
        "name": name,
        "email": contact.get("email", ""),
        "mobile": contact.get("mobile", ""),
        "status": contact.get("status", "active"),
        "tags": contact.get("tags", []),
        "custom_fields": {"vulnerable": bool(contact.get("vulnerable", False))},
        "updated_at": contact.get("updated_at", "1970-01-01T00:00:00Z"),
    }


def find_contacts(query):
    q = normalize_email((query.get("q") or [""])[0])
    email = normalize_email((query.get("email") or [""])[0])
    mobile = normalize_phone((query.get("mobile") or query.get("phone") or [""])[0])

    if not q and not email and not mobile:
        return CONTACTS

    matches = []
    for contact in CONTACTS:
        contact_email = normalize_email(contact.get("email"))
        contact_mobile = normalize_phone(contact.get("mobile"))
        name = f"{contact.get('first_name', '')} {contact.get('last_name', '')}".lower()
        if (
            (email and contact_email == email)
            or (mobile and contact_mobile == mobile)
            or (q and (contact_email == q or contact_mobile == normalize_phone(q) or q in name))
        ):
            matches.append(contact)
    return matches


class ChurchSuiteMockHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args))

    def send_json(self, status, body):
        payload = json.dumps(body, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header(
            "Access-Control-Allow-Headers",
            "authorization, content-type, x-mock-scenario",
        )
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
        self.end_headers()
        self.wfile.write(payload)

    def read_json(self):
        length = int(self.headers.get("content-length") or "0")
        if length == 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw)

    def active_scenario(self):
        return self.headers.get("x-mock-scenario") or SCENARIO

    def maybe_scenario_response(self):
        scenario = self.active_scenario()
        if scenario == "server-down":
            self.connection.close()
            return True
        if scenario == "timeout":
            time.sleep(5)
            self.send_json(504, {"error": "gateway_timeout", "message": "ChurchSuite mock timeout"})
            return True
        if scenario == "unauthorized":
            self.send_json(401, {"error": "invalid_token", "message": "Access token is missing or invalid"})
            return True
        if scenario == "malformed":
            payload = b'{"contacts":'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return True
        return False

    def do_OPTIONS(self):
        self.send_json(204, {})

    def do_GET(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)

        if parsed.path == "/__mock/health":
            self.send_json(200, {"ok": True, "scenario": SCENARIO, "contacts": len(CONTACTS)})
            return

        if parsed.path == "/addressbook/contacts":
            if self.maybe_scenario_response():
                return
            matches = find_contacts(query)
            self.send_json(
                200,
                {
                    "data": [as_churchsuite_contact(contact) for contact in matches],
                    "meta": {"count": len(matches), "mock": True},
                },
            )
            return

        match = re.match(r"^/addressbook/contacts/([^/]+)$", parsed.path)
        if match:
            if self.maybe_scenario_response():
                return
            contact_id = match.group(1)
            contact = next((item for item in CONTACTS if item["id"] == contact_id), None)
            if not contact:
                self.send_json(404, {"error": "not_found", "message": "Contact not found"})
                return
            self.send_json(200, {"data": as_churchsuite_contact(contact)})
            return

        self.send_json(404, {"error": "not_found", "message": f"No mock route for GET {parsed.path}"})

    def do_POST(self):
        global CONTACTS, SCENARIO

        parsed = urlparse(self.path)

        if parsed.path == "/__mock/reset":
            CONTACTS = deepcopy(SEED_CONTACTS)
            SCENARIO = "normal"
            self.send_json(200, {"ok": True, "contacts": len(CONTACTS)})
            return

        if parsed.path == "/__mock/scenario":
            body = self.read_json()
            SCENARIO = body.get("scenario") or "normal"
            self.send_json(200, {"ok": True, "scenario": SCENARIO})
            return

        if parsed.path == "/oauth2/token":
            if self.maybe_scenario_response():
                return
            self.send_json(
                200,
                {
                    "access_token": f"mock-token-{uuid.uuid4()}",
                    "token_type": "Bearer",
                    "expires_in": TOKEN_TTL_SECONDS,
                    "scope": "full_access",
                },
            )
            return

        if parsed.path == "/addressbook/contacts":
            if self.maybe_scenario_response():
                return
            body = self.read_json()
            contact = {
                "id": f"cs-contact-{uuid.uuid4()}",
                "first_name": body.get("first_name") or body.get("firstName") or "",
                "last_name": body.get("last_name") or body.get("lastName") or "",
                "email": normalize_email(body.get("email")),
                "mobile": normalize_phone(body.get("mobile") or body.get("phone")),
                "status": body.get("status") or "active",
                "tags": body.get("tags") or [],
                "vulnerable": bool(body.get("vulnerable")),
                "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
            CONTACTS.append(contact)
            self.send_json(201, {"data": as_churchsuite_contact(contact)})
            return

        self.send_json(404, {"error": "not_found", "message": f"No mock route for POST {parsed.path}"})

    def do_PATCH(self):
        parsed = urlparse(self.path)
        match = re.match(r"^/addressbook/contacts/([^/]+)$", parsed.path)
        if not match:
            self.send_json(404, {"error": "not_found", "message": f"No mock route for PATCH {parsed.path}"})
            return

        if self.maybe_scenario_response():
            return

        contact_id = match.group(1)
        contact = next((item for item in CONTACTS if item["id"] == contact_id), None)
        if not contact:
            self.send_json(404, {"error": "not_found", "message": "Contact not found"})
            return

        body = self.read_json()
        contact["first_name"] = body.get("first_name") or body.get("firstName") or contact["first_name"]
        contact["last_name"] = body.get("last_name") or body.get("lastName") or contact["last_name"]
        if body.get("email"):
            contact["email"] = normalize_email(body.get("email"))
        if body.get("mobile") or body.get("phone"):
            contact["mobile"] = normalize_phone(body.get("mobile") or body.get("phone"))
        if "status" in body:
            contact["status"] = body["status"]
        if "tags" in body:
            contact["tags"] = body["tags"]
        if "vulnerable" in body:
            contact["vulnerable"] = bool(body["vulnerable"])
        contact["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        self.send_json(200, {"data": as_churchsuite_contact(contact)})


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), ChurchSuiteMockHandler)
    print(f"ChurchSuite mock listening on http://{HOST}:{PORT}", flush=True)
    server.serve_forever()
