#!/usr/bin/env python3

import json
import os
import sys
from urllib.parse import quote
from urllib import request
from urllib.error import HTTPError


BASE_URL = os.environ.get("CHURCHSUITE_MOCK_URL", "http://127.0.0.1:8030")


def call(path, method="GET", body=None, headers=None):
    data = None
    merged_headers = {"content-type": "application/json"}
    if headers:
        merged_headers.update(headers)
    if body is not None:
        data = json.dumps(body).encode("utf-8")

    req = request.Request(
        f"{BASE_URL}{path}",
        data=data,
        method=method,
        headers=merged_headers,
    )

    try:
        with request.urlopen(req, timeout=10) as response:
            raw = response.read().decode("utf-8")
            return response.status, json.loads(raw) if raw else {}
    except HTTPError as error:
        raw = error.read().decode("utf-8")
        return error.code, json.loads(raw) if raw else {}


def expect(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    call("/__mock/reset", method="POST")

    status, token = call(
        "/oauth2/token",
        method="POST",
        body={"grant_type": "client_credentials", "scope": "full_access"},
    )
    expect(status == 200, "token request should succeed")
    expect(token.get("access_token"), "token response should include access_token")

    status, existing = call(
        f"/addressbook/contacts?email={quote('grace.taylor@example.com')}"
    )
    expect(status == 200, "contact search should succeed")
    expect(len(existing["data"]) == 1, "email search should return one contact")
    expect(existing["data"][0]["id"] == "cs-contact-existing-1", "seed contact should match")

    status, duplicate = call(
        f"/addressbook/contacts?q={quote('shared@example.com')}"
    )
    expect(status == 200, "duplicate search should succeed")
    expect(len(duplicate["data"]) == 2, "duplicate fixture should return two matches")

    status, created = call(
        "/addressbook/contacts",
        method="POST",
        body={
            "first_name": "New",
            "last_name": "Person",
            "email": "new.person@example.com",
            "mobile": "07700 900 606",
        },
    )
    expect(status == 201, "contact creation should succeed")
    expect(created["data"]["mobile"] == "+447700900606", "UK local mobile should normalize")

    status, patched = call(
        f"/addressbook/contacts/{created['data']['id']}",
        method="PATCH",
        body={"vulnerable": True},
    )
    expect(status == 200, "contact update should succeed")
    expect(
        patched["data"]["custom_fields"]["vulnerable"] is True,
        "vulnerable flag should update",
    )

    status, _ = call(
        "/addressbook/contacts?q=anything",
        headers={"x-mock-scenario": "unauthorized"},
    )
    expect(status == 401, "unauthorized scenario should return 401")

    print("ChurchSuite Python mock smoke test passed")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(error, file=sys.stderr)
        sys.exit(1)
