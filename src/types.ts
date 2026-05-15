export interface AdResult {
  captions: {
    aida: {
      attention: string;
      interest: string;
      desire: string;
      action: string;
    };
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
  location?: string;
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
  impresiones?: number;
  alcance?: number;
  clics_enlace?: number;
  cpc?: number;
  cpm?: number;
  gasto_total?: number;
}

export interface AnalysisReport {
  summary: string;
  conclusions: string[];
  recommendations: string[];
  topPerformers: {
    name: string;
    reason: string;
  }[];
  lowPerformers: {
    name: string;
    reason: string;
  }[];
  strategicInsights: string;
}

export interface DashboardMetric {
  name: string;
  value: number;
  unit?: string;
}

export interface AdPerformanceItem {
  name: string;
  impresiones: number;
  alcance: number;
  resultados: number;
  clics_enlace: number;
  interacciones: number;
  ctr: number;
  cpc: number;
  cpm: number;
  gasto_total: number;
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
