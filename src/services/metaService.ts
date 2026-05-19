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

export async function getCampaigns(token: string, adAccountId: string) {
  const res = await fetch(`/api/meta/campaigns?adAccountId=${adAccountId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  return data.data || [];
}

export async function getAdSets(token: string, adAccountId: string, campaignId?: string) {
  let url = `/api/meta/adsets?adAccountId=${adAccountId}`;
  if (campaignId) url += `&campaignId=${campaignId}`;
  
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  return data.data || [];
}

export async function getAds(token: string, adAccountId: string, adSetId?: string) {
  let url = `/api/meta/ads?adAccountId=${adAccountId}`;
  if (adSetId) url += `&adSetId=${adSetId}`;
  
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  return data.data || [];
}

export async function getInsights(token: string, params: {
  adAccountId: string;
  level?: 'campaign' | 'adset' | 'ad';
  filtering?: string;
  timeRange?: { since: string; until: string };
  timeIncrement?: number | 'all_days';
}) {
  let url = `/api/meta/insights?adAccountId=${params.adAccountId}`;
  if (params.level) url += `&level=${params.level}`;
  if (params.filtering) url += `&filtering=${params.filtering}`;
  if (params.timeIncrement) url += `&time_increment=${params.timeIncrement}`;
  if (params.timeRange) {
    url += `&time_range=${JSON.stringify(params.timeRange)}`;
  }

  const res = await fetch(url, {
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
  location?: string;
  gender?: string;
  ageRange?: string;
  destinationUrl: string;
  pixelId: string;
  whatsappNumber?: string;
  currency: string;
  facebookEnabled?: boolean;
  instagramEnabled?: boolean;
  feedEnabled?: boolean;
  reelsEnabled?: boolean;
  storiesEnabled?: boolean;
  marketplaceEnabled?: boolean;
  instreamEnabled?: boolean;
  audienceNetworkEnabled?: boolean;
  messengerEnabled?: boolean;
  advantagePlacementsEnabled?: boolean;
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
