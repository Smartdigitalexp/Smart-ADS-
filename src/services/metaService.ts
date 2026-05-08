export interface MetaAdAccount {
  id: string;
  name: string;
  account_id: string;
}

export interface MetaPage {
  id: string;
  name: string;
  access_token: string;
}

export async function getMetaAuthUrl(): Promise<string> {
  const res = await fetch('/api/meta/auth-url');
  const data = await res.json();
  return data.url;
}

export async function getAdAccounts(token: string): Promise<MetaAdAccount[]> {
  const res = await fetch('/api/meta/ad-accounts', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  return data.data || [];
}

export async function getPages(token: string): Promise<MetaPage[]> {
  const res = await fetch('/api/meta/pages', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  return data.data || [];
}

export async function publishAd(params: {
  accessToken: string;
  adAccountId: string;
  pageId: string;
  productName: string;
  imageUrl: string;
  headline: string;
  body: string;
  objective: string;
  budget: string;
  audience: string;
  destinationUrl: string;
  pixelId: string;
  whatsappNumber?: string;
  currency: string;
  facebookEnabled?: boolean;
  instagramEnabled?: boolean;
  scheduleStart?: string;
  scheduleEnd?: string;
}) {
  const res = await fetch('/api/meta/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  
  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      throw new Error(json.error || json.message || `Error del servidor (${res.status})`);
    } catch (e) {
      throw new Error(`Error del servidor (${res.status}): ${text.substring(0, 100)}`);
    }
  }
  
  return await res.json();
}
