# ChurchSuite Mock

Local, dependency-free mock for developing the ChurchSuite integration without
touching real ChurchSuite data.

## Start With Python

This path does not need Node, npm, Docker, or any package install:

```bash
python3 mocks/churchsuite/server.py
```

In a second terminal:

```bash
python3 mocks/churchsuite/smoke_test.py
```

The mock listens on `http://127.0.0.1:8030` by default. Override with:

```bash
CHURCHSUITE_MOCK_PORT=8031 python3 mocks/churchsuite/server.py
```

## Deploy To Render

This repo includes `render.yaml`, so Render can deploy the Python mock as a
free web service.

1. Push this branch to GitHub.
2. In Render, create a new Blueprint or Web Service from the GitHub repo.
3. Use the `render.yaml` settings if Render detects them.
4. The start command should be:

   ```bash
   python3 mocks/churchsuite/server.py
   ```

5. After deploy, test the public URL:

   ```bash
   curl https://YOUR-RENDER-URL.onrender.com/__mock/health
   ```

6. Run the smoke test against the hosted mock:

   ```bash
   CHURCHSUITE_MOCK_URL=https://YOUR-RENDER-URL.onrender.com python3 mocks/churchsuite/smoke_test.py
   ```

## Start With Node

```bash
npm run churchsuite:mock
```

## Smoke Test

In a second terminal:

```bash
npm run churchsuite:mock:test
```

## Endpoints

- `POST /oauth2/token` returns a fake OAuth access token.
- `GET /addressbook/contacts?q=<email|phone|name>` searches seeded contacts.
- `GET /addressbook/contacts?email=<email>` searches by exact email.
- `GET /addressbook/contacts?mobile=<phone>` searches by normalized phone.
- `POST /addressbook/contacts` creates a contact.
- `GET /addressbook/contacts/:id` returns one contact.
- `PATCH /addressbook/contacts/:id` updates a contact, including
  `vulnerable`.

## Mock Controls

- `GET /__mock/health` returns current mock status.
- `POST /__mock/reset` restores seeded contacts and normal behavior.
- `POST /__mock/scenario` with `{ "scenario": "unauthorized" }` sets a global
  failure scenario.

You can also set a scenario for one request with the `x-mock-scenario` header.

Supported scenarios:

- `normal`
- `unauthorized`
- `malformed`
- `timeout`
- `server-down`

## Seed Data

The fixture includes:

- One normal existing contact.
- One contact with `custom_fields.vulnerable = true`.
- Duplicate email contacts to force a manual-review matching case.
- A local UK phone normalization case for `077...` numbers.
