#!/usr/bin/env python3

import json
import os
import re
import secrets
import time
import uuid
from copy import deepcopy
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse


PORT = int(os.environ.get("PORT") or os.environ.get("CHURCHSUITE_MOCK_PORT", "8030"))
HOST = os.environ.get("CHURCHSUITE_MOCK_HOST") or (
    "0.0.0.0" if os.environ.get("PORT") else "127.0.0.1"
)
MOCK_API_KEY = os.environ.get("CHURCHSUITE_MOCK_API_KEY")
UI_ALLOWED_EMAILS = {
    email.strip().lower()
    for email in os.environ.get(
        "CHURCHSUITE_MOCK_UI_ALLOWED_EMAILS",
        "mlange2@mit.edu,oliver.youle@gmail.com",
    ).split(",")
    if email.strip()
}
UI_PASSWORD = os.environ.get("CHURCHSUITE_MOCK_UI_PASSWORD")
UI_SESSION_COOKIE = "churchsuite_mock_ui_session"
UI_SESSION_TTL_SECONDS = 12 * 60 * 60
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
        "id": "cs-contact-existing-3",
        "first_name": "Alex",
        "last_name": "Reed",
        "email": "shared@example.com",
        "mobile": "+447700900303",
        "status": "active",
        "tags": ["member"],
        "vulnerable": False,
    },
    {
        "id": "cs-contact-existing-4",
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
UI_SESSIONS = {}

CONTACT_VIEWER_HTML = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VineMe Fake ChurchSuite</title>
  <style>
    :root {
      color-scheme: light;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f6f7f9;
      color: #151821;
    }
    body {
      margin: 0;
      padding: 32px;
    }
    main {
      max-width: 1120px;
      margin: 0 auto;
    }
    header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
    }
    h1 {
      margin: 0 0 6px;
      font-size: 28px;
    }
    p {
      margin: 0;
      color: #5d6678;
    }
    section {
      background: #fff;
      border: 1px solid #dfe3ea;
      border-radius: 14px;
      padding: 18px;
      margin-bottom: 18px;
    }
    label {
      display: block;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .login-row {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    input {
      min-width: 320px;
      flex: 1;
      border: 1px solid #cbd2dd;
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 14px;
    }
    button {
      border: 0;
      border-radius: 10px;
      background: #1f6feb;
      color: white;
      font-weight: 700;
      padding: 11px 14px;
      cursor: pointer;
    }
    button.secondary {
      background: #eef2f7;
      color: #1f2937;
    }
    .status {
      margin-top: 10px;
      font-size: 13px;
      color: #5d6678;
    }
    .error {
      color: #b42318;
    }
    .meta {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 4px 9px;
      font-size: 12px;
      font-weight: 700;
      background: #eef2f7;
      color: #364152;
      white-space: nowrap;
    }
    .pill.warning {
      background: #fff3cd;
      color: #8a5a00;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      overflow: hidden;
      border: 1px solid #dfe3ea;
      border-radius: 12px;
      background: #fff;
    }
    th,
    td {
      text-align: left;
      padding: 11px 12px;
      border-bottom: 1px solid #edf0f5;
      vertical-align: top;
      font-size: 14px;
    }
    th {
      background: #f8fafc;
      color: #475467;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    tr:last-child td {
      border-bottom: 0;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      color: #475467;
    }
    @media (max-width: 760px) {
      body {
        padding: 16px;
      }
      header {
        display: block;
      }
      table {
        display: block;
        overflow-x: auto;
      }
      input {
        min-width: 0;
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>VineMe Fake ChurchSuite</h1>
        <p>Development-only contact viewer. Contacts are stored in server memory and reset on redeploy/restart.</p>
      </div>
      <div>
        <button class="secondary" id="refreshButton">Refresh contacts</button>
        <button class="secondary" id="logoutButton">Log out</button>
      </div>
    </header>

    <section>
      <label for="email">Login</label>
      <div class="login-row">
        <input id="email" type="email" autocomplete="email" placeholder="Email" />
        <input id="password" type="password" autocomplete="current-password" placeholder="Password" />
        <button id="loginButton">Log in and load</button>
      </div>
      <div class="status" id="status">Log in with an allowed email address to view protected contacts.</div>
    </section>

    <section>
      <div class="meta">
        <span class="pill" id="countPill">Contacts: unknown</span>
        <span class="pill">API: /addressbook/contacts</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Mobile</th>
            <th>Vulnerable</th>
            <th>Status</th>
            <th>Tags</th>
            <th>Mock ID</th>
          </tr>
        </thead>
        <tbody id="contactsBody">
          <tr>
            <td colspan="7">No contacts loaded yet.</td>
          </tr>
        </tbody>
      </table>
    </section>
  </main>

  <script>
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const loginButton = document.getElementById("loginButton");
    const refreshButton = document.getElementById("refreshButton");
    const logoutButton = document.getElementById("logoutButton");
    const statusEl = document.getElementById("status");
    const bodyEl = document.getElementById("contactsBody");
    const countPill = document.getElementById("countPill");

    emailInput.value = localStorage.getItem("vinemeMockUiEmail") || "";

    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function setStatus(message, isError = false) {
      statusEl.textContent = message;
      statusEl.className = isError ? "status error" : "status";
    }

    async function login() {
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      if (!email || !password) {
        setStatus("Enter your email and password first.", true);
        return;
      }

      setStatus("Logging in...");

      const response = await fetch("/__mock/ui/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || payload.error || `Login failed (${response.status})`);
      }

      localStorage.setItem("vinemeMockUiEmail", email);
      passwordInput.value = "";
      setStatus(`Logged in as ${payload.email}. Loading contacts...`);
      await loadContacts();
    }

    async function loadContacts() {
      setStatus("Loading contacts...");

      try {
        const response = await fetch("/__mock/ui/contacts", {
          credentials: "same-origin",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message || payload.error || `Request failed (${response.status})`);
        }

        const contacts = Array.isArray(payload.data) ? payload.data : [];
        countPill.textContent = `Contacts: ${contacts.length}`;

        if (contacts.length === 0) {
          bodyEl.innerHTML = '<tr><td colspan="7">No contacts returned.</td></tr>';
        } else {
          bodyEl.innerHTML = contacts
            .map((contact) => {
              const vulnerable = Boolean(contact.custom_fields && contact.custom_fields.vulnerable);
              const tags = Array.isArray(contact.tags) ? contact.tags.join(", ") : "";
              return `
                <tr>
                  <td>${escapeHtml(contact.name || `${contact.first_name || ""} ${contact.last_name || ""}`.trim())}</td>
                  <td>${escapeHtml(contact.email)}</td>
                  <td>${escapeHtml(contact.mobile)}</td>
                  <td><span class="pill ${vulnerable ? "warning" : ""}">${vulnerable ? "Yes" : "No"}</span></td>
                  <td>${escapeHtml(contact.status)}</td>
                  <td>${escapeHtml(tags)}</td>
                  <td><code>${escapeHtml(contact.id)}</code></td>
                </tr>
              `;
            })
            .join("");
        }

        setStatus(`Loaded ${contacts.length} contact(s). Refresh after app signups to see new mock contacts.`);
      } catch (error) {
        countPill.textContent = "Contacts: unavailable";
        bodyEl.innerHTML = '<tr><td colspan="7">Unable to load contacts.</td></tr>';
        setStatus(error.message || "Unable to load contacts. You may need to log in again.", true);
      }
    }

    loginButton.addEventListener("click", () => {
      login().catch((error) => setStatus(error.message || "Login failed.", true));
    });
    passwordInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        login().catch((error) => setStatus(error.message || "Login failed.", true));
      }
    });
    refreshButton.addEventListener("click", loadContacts);
    logoutButton.addEventListener("click", async () => {
      await fetch("/__mock/ui/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      bodyEl.innerHTML = '<tr><td colspan="7">No contacts loaded yet.</td></tr>';
      countPill.textContent = "Contacts: unknown";
      setStatus("Logged out.");
    });
  </script>
</body>
</html>
"""


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

    def send_json(self, status, body, extra_headers=None):
        payload = json.dumps(body, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header(
            "Access-Control-Allow-Headers",
            "authorization, content-type, x-mock-scenario, x-mock-api-key",
        )
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
        for name, value in (extra_headers or {}).items():
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(payload)

    def send_html(self, status, body):
        payload = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def read_json(self):
        length = int(self.headers.get("content-length") or "0")
        if length == 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw)

    def cookie_value(self, name):
        cookie_header = self.headers.get("cookie") or ""
        for item in cookie_header.split(";"):
            if "=" not in item:
                continue
            key, value = item.strip().split("=", 1)
            if key == name:
                return value
        return None

    def ui_session_email(self):
        token = self.cookie_value(UI_SESSION_COOKIE)
        if not token:
            return None
        session = UI_SESSIONS.get(token)
        if not session:
            return None
        if session["expires_at"] < time.time():
            UI_SESSIONS.pop(token, None)
            return None
        return session["email"]

    def require_ui_session(self):
        email = self.ui_session_email()
        if email:
            return email
        self.send_json(401, {"error": "ui_unauthorized", "message": "Please log in to view contacts"})
        return None

    def active_scenario(self):
        return self.headers.get("x-mock-scenario") or SCENARIO

    def has_mock_access(self):
        if not MOCK_API_KEY:
            return True
        return self.headers.get("x-mock-api-key") == MOCK_API_KEY

    def require_mock_access(self):
        if self.has_mock_access():
            return False
        self.send_json(401, {"error": "mock_unauthorized", "message": "Missing or invalid mock API key"})
        return True

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

        if parsed.path == "/":
            self.send_html(200, CONTACT_VIEWER_HTML)
            return

        if parsed.path == "/__mock/health":
            self.send_json(200, {"ok": True, "scenario": SCENARIO, "contacts": len(CONTACTS)})
            return

        if parsed.path == "/__mock/ui/contacts":
            email = self.require_ui_session()
            if not email:
                return
            matches = find_contacts(query)
            self.send_json(
                200,
                {
                    "data": [as_churchsuite_contact(contact) for contact in matches],
                    "meta": {"count": len(matches), "mock": True, "viewer": email},
                },
            )
            return

        if parsed.path == "/addressbook/contacts":
            if self.require_mock_access():
                return
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
            if self.require_mock_access():
                return
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

        if parsed.path == "/__mock/ui/login":
            if not UI_PASSWORD:
                self.send_json(
                    503,
                    {
                        "error": "ui_password_not_configured",
                        "message": "CHURCHSUITE_MOCK_UI_PASSWORD is not configured",
                    },
                )
                return
            body = self.read_json()
            email = normalize_email(body.get("email"))
            password = str(body.get("password") or "")
            if email not in UI_ALLOWED_EMAILS or not secrets.compare_digest(password, UI_PASSWORD):
                self.send_json(401, {"error": "invalid_login", "message": "Invalid email or password"})
                return

            token = secrets.token_urlsafe(32)
            UI_SESSIONS[token] = {"email": email, "expires_at": time.time() + UI_SESSION_TTL_SECONDS}
            self.send_json(
                200,
                {"ok": True, "email": email},
                {
                    "Set-Cookie": (
                        f"{UI_SESSION_COOKIE}={token}; "
                        f"Path=/; HttpOnly; SameSite=Lax; Max-Age={UI_SESSION_TTL_SECONDS}"
                    )
                },
            )
            return

        if parsed.path == "/__mock/ui/logout":
            token = self.cookie_value(UI_SESSION_COOKIE)
            if token:
                UI_SESSIONS.pop(token, None)
            self.send_json(
                200,
                {"ok": True},
                {"Set-Cookie": f"{UI_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"},
            )
            return

        if parsed.path == "/__mock/reset":
            if self.require_mock_access():
                return
            CONTACTS = deepcopy(SEED_CONTACTS)
            SCENARIO = "normal"
            self.send_json(200, {"ok": True, "contacts": len(CONTACTS)})
            return

        if parsed.path == "/__mock/scenario":
            if self.require_mock_access():
                return
            body = self.read_json()
            SCENARIO = body.get("scenario") or "normal"
            self.send_json(200, {"ok": True, "scenario": SCENARIO})
            return

        if parsed.path == "/oauth2/token":
            if self.require_mock_access():
                return
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
            if self.require_mock_access():
                return
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

        if self.require_mock_access():
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
