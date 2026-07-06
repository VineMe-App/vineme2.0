export interface ChurchSuiteContact {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  mobile: string;
  status: string;
  tags: string[];
  custom_fields?: {
    vulnerable?: boolean;
  };
  updated_at?: string;
}

export interface ChurchSuiteResponse<T> {
  data: T;
  meta?: {
    count?: number;
    mock?: boolean;
  };
}

export interface CreateChurchSuiteContactInput {
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let body: any = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`ChurchSuite returned invalid JSON (${response.status})`);
  }

  if (!response.ok) {
    throw new Error(
      body?.message || body?.error || `ChurchSuite request failed (${response.status})`
    );
  }

  return body as T;
}

export class ChurchSuiteMockService {
  constructor(private readonly baseUrl: string) {}

  async health(): Promise<{ ok: boolean; scenario: string; contacts: number }> {
    const response = await fetch(`${trimTrailingSlash(this.baseUrl)}/__mock/health`);
    return parseResponse(response);
  }

  async searchContacts(
    query: string,
    scenario?: string
  ): Promise<ChurchSuiteResponse<ChurchSuiteContact[]>> {
    const headers: Record<string, string> = {};
    if (scenario && scenario !== 'normal') {
      headers['x-mock-scenario'] = scenario;
    }

    const response = await fetch(
      `${trimTrailingSlash(this.baseUrl)}/addressbook/contacts?q=${encodeURIComponent(query)}`,
      { headers }
    );
    return parseResponse(response);
  }

  async createContact(
    input: CreateChurchSuiteContactInput
  ): Promise<ChurchSuiteResponse<ChurchSuiteContact>> {
    const response = await fetch(
      `${trimTrailingSlash(this.baseUrl)}/addressbook/contacts`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(input),
      }
    );
    return parseResponse(response);
  }

  async updateVulnerableFlag(
    contactId: string,
    vulnerable: boolean
  ): Promise<ChurchSuiteResponse<ChurchSuiteContact>> {
    const response = await fetch(
      `${trimTrailingSlash(this.baseUrl)}/addressbook/contacts/${contactId}`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ vulnerable }),
      }
    );
    return parseResponse(response);
  }
}
