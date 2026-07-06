#!/usr/bin/env node

const baseUrl = process.env.CHURCHSUITE_MOCK_URL || 'http://127.0.0.1:8030';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = text;
  }

  return { response, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  await request('/__mock/reset', { method: 'POST' });

  const tokenResult = await request('/oauth2/token', {
    method: 'POST',
    body: JSON.stringify({
      grant_type: 'client_credentials',
      scope: 'full_access',
    }),
  });
  assert(tokenResult.response.ok, 'Expected token request to succeed');
  assert(tokenResult.body.access_token, 'Expected access token in response');

  const existing = await request(
    '/addressbook/contacts?email=grace.taylor@example.com'
  );
  assert(existing.response.ok, 'Expected contact search to succeed');
  assert(existing.body.data.length === 1, 'Expected one email match');
  assert(
    existing.body.data[0].id === 'cs-contact-existing-1',
    'Expected seeded contact to match'
  );

  const duplicate = await request('/addressbook/contacts?q=shared@example.com');
  assert(duplicate.response.ok, 'Expected duplicate search to succeed');
  assert(
    duplicate.body.data.length === 2,
    'Expected duplicate email fixture to return two matches'
  );

  const created = await request('/addressbook/contacts', {
    method: 'POST',
    body: JSON.stringify({
      first_name: 'New',
      last_name: 'Person',
      email: 'new.person@example.com',
      mobile: '07700 900 606',
    }),
  });
  assert(created.response.status === 201, 'Expected contact creation to succeed');
  assert(
    created.body.data.mobile === '+447700900606',
    'Expected UK local mobile to normalize'
  );

  const patched = await request(`/addressbook/contacts/${created.body.data.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ vulnerable: true }),
  });
  assert(patched.response.ok, 'Expected contact update to succeed');
  assert(
    patched.body.data.custom_fields.vulnerable === true,
    'Expected vulnerable flag to update'
  );

  const unauthorized = await request('/addressbook/contacts?q=anything', {
    headers: { 'x-mock-scenario': 'unauthorized' },
  });
  assert(
    unauthorized.response.status === 401,
    'Expected unauthorized scenario to return 401'
  );

  console.log('ChurchSuite mock smoke test passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
