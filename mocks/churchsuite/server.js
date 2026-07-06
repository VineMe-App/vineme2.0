#!/usr/bin/env node

const http = require('node:http');
const { randomUUID } = require('node:crypto');

const PORT = Number(process.env.CHURCHSUITE_MOCK_PORT || 8030);
const TOKEN_TTL_SECONDS = 3600;

const seedContacts = [
  {
    id: 'cs-contact-existing-1',
    first_name: 'Grace',
    last_name: 'Taylor',
    email: 'grace.taylor@example.com',
    mobile: '+447700900101',
    status: 'active',
    tags: ['member'],
    vulnerable: false,
  },
  {
    id: 'cs-contact-vulnerable-1',
    first_name: 'Sam',
    last_name: 'Morgan',
    email: 'sam.morgan@example.com',
    mobile: '+447700900202',
    status: 'active',
    tags: ['member', 'pastoral-care'],
    vulnerable: true,
  },
  {
    id: 'cs-contact-duplicate-email',
    first_name: 'Alex',
    last_name: 'Reed',
    email: 'shared@example.com',
    mobile: '+447700900303',
    status: 'active',
    tags: ['member'],
    vulnerable: false,
  },
  {
    id: 'cs-contact-duplicate-phone',
    first_name: 'Avery',
    last_name: 'Reed',
    email: 'avery.reed@example.com',
    mobile: '+447700900404',
    status: 'active',
    tags: ['member'],
    vulnerable: false,
  },
  {
    id: 'cs-contact-shared-email',
    first_name: 'Jordan',
    last_name: 'Lee',
    email: 'shared@example.com',
    mobile: '+447700900505',
    status: 'active',
    tags: ['member'],
    vulnerable: false,
  },
];

let contacts = clone(seedContacts);
let scenario = 'normal';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizePhone(value) {
  if (!value) return '';
  const compact = String(value).replace(/[^\d+]/g, '');
  if (!compact) return '';
  if (compact.startsWith('+')) {
    return `+${compact.slice(1).replace(/\D/g, '')}`;
  }
  const digits = compact.replace(/\D/g, '');
  if (digits.startsWith('0')) return `+44${digits.slice(1)}`;
  return `+${digits}`;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function toChurchSuiteContact(contact) {
  return {
    id: contact.id,
    type: 'contact',
    first_name: contact.first_name,
    last_name: contact.last_name,
    name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
    email: contact.email,
    mobile: contact.mobile,
    status: contact.status,
    tags: contact.tags || [],
    custom_fields: {
      vulnerable: Boolean(contact.vulnerable),
    },
    updated_at: contact.updated_at || new Date(0).toISOString(),
  };
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers':
      'authorization, content-type, x-mock-scenario',
    'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS',
  });
  res.end(JSON.stringify(body, null, 2));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function requestScenario(req) {
  return req.headers['x-mock-scenario'] || scenario;
}

function maybeScenarioResponse(req, res) {
  const activeScenario = requestScenario(req);

  if (activeScenario === 'server-down') {
    req.socket.destroy();
    return true;
  }

  if (activeScenario === 'timeout') {
    setTimeout(() => {
      sendJson(res, 504, {
        error: 'gateway_timeout',
        message: 'ChurchSuite mock timeout',
      });
    }, 5000);
    return true;
  }

  if (activeScenario === 'unauthorized') {
    sendJson(res, 401, {
      error: 'invalid_token',
      message: 'Access token is missing or invalid',
    });
    return true;
  }

  if (activeScenario === 'malformed') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"contacts":');
    return true;
  }

  return false;
}

function searchContacts(params) {
  const query = normalizeEmail(params.get('q'));
  const email = normalizeEmail(params.get('email'));
  const mobile = normalizePhone(params.get('mobile') || params.get('phone'));

  if (!query && !email && !mobile) {
    return contacts;
  }

  return contacts.filter((contact) => {
    const contactEmail = normalizeEmail(contact.email);
    const contactMobile = normalizePhone(contact.mobile);
    const name = `${contact.first_name} ${contact.last_name}`.toLowerCase();

    return (
      (email && contactEmail === email) ||
      (mobile && contactMobile === mobile) ||
      (query &&
        (contactEmail === query ||
          contactMobile === normalizePhone(query) ||
          name.includes(query)))
    );
  });
}

async function handleRequest(req, res) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/__mock/health') {
    sendJson(res, 200, {
      ok: true,
      scenario,
      contacts: contacts.length,
    });
    return;
  }

  if (url.pathname === '/__mock/reset' && req.method === 'POST') {
    contacts = clone(seedContacts);
    scenario = 'normal';
    sendJson(res, 200, { ok: true, contacts: contacts.length });
    return;
  }

  if (url.pathname === '/__mock/scenario' && req.method === 'POST') {
    const body = await readJson(req);
    scenario = body.scenario || 'normal';
    sendJson(res, 200, { ok: true, scenario });
    return;
  }

  if (url.pathname === '/oauth2/token' && req.method === 'POST') {
    if (maybeScenarioResponse(req, res)) return;

    sendJson(res, 200, {
      access_token: `mock-token-${randomUUID()}`,
      token_type: 'Bearer',
      expires_in: TOKEN_TTL_SECONDS,
      scope: 'full_access',
    });
    return;
  }

  if (url.pathname === '/addressbook/contacts' && req.method === 'GET') {
    if (maybeScenarioResponse(req, res)) return;

    const matches = searchContacts(url.searchParams);
    sendJson(res, 200, {
      data: matches.map(toChurchSuiteContact),
      meta: {
        count: matches.length,
        mock: true,
      },
    });
    return;
  }

  if (url.pathname === '/addressbook/contacts' && req.method === 'POST') {
    if (maybeScenarioResponse(req, res)) return;

    const body = await readJson(req);
    const contact = {
      id: `cs-contact-${randomUUID()}`,
      first_name: body.first_name || body.firstName || '',
      last_name: body.last_name || body.lastName || '',
      email: normalizeEmail(body.email),
      mobile: normalizePhone(body.mobile || body.phone),
      status: body.status || 'active',
      tags: body.tags || [],
      vulnerable: Boolean(body.vulnerable),
      updated_at: new Date().toISOString(),
    };

    contacts.push(contact);
    sendJson(res, 201, { data: toChurchSuiteContact(contact) });
    return;
  }

  const contactMatch = url.pathname.match(/^\/addressbook\/contacts\/([^/]+)$/);
  if (contactMatch && req.method === 'GET') {
    if (maybeScenarioResponse(req, res)) return;

    const contact = contacts.find((item) => item.id === contactMatch[1]);
    if (!contact) {
      sendJson(res, 404, {
        error: 'not_found',
        message: 'Contact not found',
      });
      return;
    }

    sendJson(res, 200, { data: toChurchSuiteContact(contact) });
    return;
  }

  if (contactMatch && req.method === 'PATCH') {
    if (maybeScenarioResponse(req, res)) return;

    const contact = contacts.find((item) => item.id === contactMatch[1]);
    if (!contact) {
      sendJson(res, 404, {
        error: 'not_found',
        message: 'Contact not found',
      });
      return;
    }

    const body = await readJson(req);
    Object.assign(contact, {
      first_name: body.first_name ?? body.firstName ?? contact.first_name,
      last_name: body.last_name ?? body.lastName ?? contact.last_name,
      email: body.email ? normalizeEmail(body.email) : contact.email,
      mobile:
        body.mobile || body.phone
          ? normalizePhone(body.mobile || body.phone)
          : contact.mobile,
      status: body.status ?? contact.status,
      tags: body.tags ?? contact.tags,
      vulnerable:
        body.vulnerable === undefined
          ? contact.vulnerable
          : Boolean(body.vulnerable),
      updated_at: new Date().toISOString(),
    });

    sendJson(res, 200, { data: toChurchSuiteContact(contact) });
    return;
  }

  sendJson(res, 404, {
    error: 'not_found',
    message: `No mock route for ${req.method} ${url.pathname}`,
  });
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    sendJson(res, 500, {
      error: 'mock_error',
      message: error instanceof Error ? error.message : String(error),
    });
  });
});

server.listen(PORT, () => {
  console.log(`ChurchSuite mock listening on http://127.0.0.1:${PORT}`);
});
