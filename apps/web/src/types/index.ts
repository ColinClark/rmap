// Re-export types from RetailMediaWorkflow
export type { CampaignData, Strategy, SynthiePopData } from '../workflows/RetailMediaWorkflow';

export interface PopulationFilters {
  ageRange?: [number, number];
  gender?: string[];
  incomeRange?: [number, number];
  education?: string[];
  occupation?: string[];
  maritalStatus?: string[];
  householdSize?: number[];
  hasChildren?: boolean;
  interests?: string[];
  shoppingPreferences?: string[];
  brandAffinities?: string[];
  mediaConsumption?: string[];
  cities?: string[];
  states?: string[];
}

export interface DemographicInsight {
  category: string;
  value: string | number;
  percentage: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface AudienceSegment {
  id: string;
  name: string;
  description: string;
  size: number;
  filters: PopulationFilters;
  confidence: number;
  performance?: {
    ctr?: number;
    conversionRate?: number;
    avgOrderValue?: number;
  };
}