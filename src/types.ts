export interface AdResult {
  captions: {
    aida: string;
    storytelling: string;
    urgency: string;
  };
  performanceScore: number;
  analysis: string;
  concept: string;
  headline: string;
  generatedImageUrl?: string;
}

export interface GenerationResponse {
  results: AdResult[];
}

export interface CampaignData {
  productName: string;
  objective: string;
  format: 'image' | 'video';
  aspectRatio: string;
  creativeConcept: string;
  audience: string;
  videoDuration?: 5 | 10;
  budget?: string;
  destinationUrl?: string;
  pixelId?: string;
  whatsappNumber?: string;
  currency?: string;
  facebookEnabled?: boolean;
  instagramEnabled?: boolean;
  scheduleStart?: string;
  scheduleEnd?: string;
}

export interface CSVRow {
  formato: string;
  concepto: string;
  texto: string;
  ctr: number;
  engagement: number;
  resultados: number;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  campaign: CampaignData;
  results: AdResult[];
}

export interface UserProfile {
  displayName: string;
  email: string;
  phone: string;
  website: string;
  multiVariantEnabled?: boolean;
  credits?: number;
}
