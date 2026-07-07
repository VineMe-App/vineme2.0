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
4. Set a secret environment variable in Render:

   ```text
   CHURCHSUITE_MOCK_API_KEY=<long random shared secret>
   ```

   `/__mock/health` stays public for Render health checks. All other endpoints
   require this value in the `x-mock-api-key` header.
5. The start command should be:

   ```bash
   python3 mocks/churchsuite/server.py
   ```

6. After deploy, test the public health URL:

   ```bash
   curl https://YOUR-RENDER-URL.onrender.com/__mock/health
   ```

7. Run the smoke test against the hosted mock:

   ```bash
   CHURCHSUITE_MOCK_URL=https://YOUR-RENDER-URL.onrender.com \
   CHURCHSUITE_MOCK_API_KEY=<same shared secret> \
   python3 mocks/churchsuite/smoke_test.py
   ```

8. If Supabase Edge Functions call this mock, set these secrets in Supabase:

   ```text
   CHURCHSUITE_MOCK_API_URL=https://YOUR-RENDER-URL.onrender.com
   ```

   ```text
   CHURCHSUITE_MOCK_API_KEY=<same shared secret>
   ```

## App Test-Only Guard

The VineMe onboarding integration only calls ChurchSuite for explicitly allowed
test email domains. Configure this in the app build environment:

```text
EXPO_PUBLIC_CHURCHSUITE_TEST_EMAIL_DOMAINS=example.com
```

Multiple domains can be comma-separated:

```text
EXPO_PUBLIC_CHURCHSUITE_TEST_EMAIL_DOMAINS=example.com,test.vineme.app
```

If the value is empty or missing, onboarding skips ChurchSuite linking for all
users. This keeps real signups from being sent to the mock by default.

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

- Several existing contacts with names, email addresses, and UK mobile numbers.
- One contact with `custom_fields.vulnerable = true`.
- Two contacts that share `shared@example.com`, so the integration can be
  tested against a multi-result search.
- A local UK phone normalization case for `077...` numbers when creating new
  contacts.
