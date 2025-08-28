import React, { useState } from 'react';
import { BrandProductSelection } from '../components/BrandProductSelection';
import { CampaignSetup } from '../components/CampaignSetup';
import { CohortBuilder } from '../components/CohortBuilder';
import { AudienceRefinement } from '../components/AudienceRefinement';
import { StrategyGenerator } from '../components/StrategyGenerator';
import { ComparativeDashboard } from '../components/ComparativeDashboard';
import { CollaborationPanel } from '../components/CollaborationPanel';
import { PerformanceMonitoring } from '../components/PerformanceMonitoring';
import { Progress } from '../components/ui/progress';
import { Users, Package, Building2 } from 'lucide-react';
import { Button } from '../components/ui/button';

export interface SynthiePopData {
  ids: string; // 15-digit hex person ID
  gemeindeCode: string; // 12-digit ARS geo key
  bundesland: number; // state code 1-16
  kreisCode: string; // state+county
  gemeinde: string; // municipality name
  gender: number; // 1=male, 2=female
  age: number;
  householdSize: number;
  occupation: string; // KldB codes
  educationLevel?: string;
  migrationBackground?: boolean;
}

export interface ProxyCohort {
  query: string;
  sourceData: 'statista-ci' | 'web-search';
  affinity: number; // percentage
  confidence: number; // confidence interval
  population: number;
  mapping: string;
}

export interface Strategy {
  id: string;
  name: string;
  cohorts: string[];
  channels: string[];
  budget: number;
  roas: number;
  reach: number;
  risk: number;
  impressions: number;
  cpm: number;
  confidence: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'viewer' | 'editor' | 'admin';
  avatar?: string;
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  timestamp: Date;
  target: string; // cohort-id, strategy-id, etc.
  tags: string[];
}

export interface ChannelPerformance {
  channelId: string;
  channelName: string;
  budgetAllocated: number;
  budgetSpent: number;
  impressionsPlanned: number;
  impressionsActual: number;
  reachPlanned: number;
  reachActual: number;
  roasPlanned: number;
  roasActual: number;
  cpmPlanned: number;
  cpmActual: number;
  status: 'active' | 'paused' | 'completed' | 'underperforming' | 'overperforming';
  lastUpdated: Date;
  campaignId?: string; // External campaign ID from the platform
}

export interface PerformanceAlert {
  id: string;
  type: 'budget' | 'performance' | 'pacing' | 'reach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  channelId?: string;
  threshold: number;
  actualValue: number;
  timestamp: Date;
  acknowledged: boolean;
}

export interface CampaignActivation {
  status: 'draft' | 'exporting' | 'active' | 'paused' | 'completed';
  activatedChannels: string[];
  campaignIds: Record<string, string>; // channel -> external campaign ID
  startDate?: Date;
  endDate?: Date;
  exportData?: {
    cohortJson: string;
    channelConfigs: Record<string, any>;
    activationTimestamp: Date;
  };
}

export interface PopulationFilters {
  ageMin?: number;
  ageMax?: number;
  genderFilter?: number[];
  householdSizeMin?: number;
  householdSizeMax?: number;
  occupationFilter?: string[];
  bundeslandFilter?: number[];
  gemeindeFilter?: string[];
  educationFilter?: string[];
  migrationBackgroundFilter?: boolean;
}

export interface BrandAsset {
  id: string;
  name: string;
  type: 'logo' | 'image' | 'video' | 'document' | 'guideline' | 'other';
  url: string;
  description?: string;
  uploadDate: Date;
  size: number; // in bytes
  format: string; // file extension
}

export interface Brand {
  id: string;
  name: string;
  description?: string;
  category: string; // e.g., 'FMCG', 'Technology', 'Automotive'
  parentCompany?: string;
  website?: string;
  founded?: number;
  headquarters?: string;
  brandGuidelines?: string;
  targetMarkets: string[]; // Geographic markets
  brandValues: string[];
  assets: BrandAsset[];
  createdDate: Date;
  lastModified: Date;
}

export interface ProductFeature {
  name: string;
  description: string;
  highlight: boolean; // Key selling point
}

export interface Product {
  id: string;
  brandId: string;
  name: string;
  description?: string;
  category: string;
  subCategory?: string;
  sku?: string;
  price?: {
    currency: string;
    amount: number;
    msrp?: number; // Manufacturer's suggested retail price
  };
  launchDate?: Date;
  availableMarkets: string[];
  targetDemographics: {
    ageRange?: [number, number];
    genderTarget?: string; // 'male' | 'female' | 'unisex'
    incomeLevel?: string;
    lifestyle?: string[];
  };
  features: ProductFeature[];
  competitorProducts: string[]; // Product names or IDs
  seasonality?: 'year-round' | 'seasonal' | 'holiday-specific';
  distributionChannels: string[];
  assets: BrandAsset[];
  createdDate: Date;
  lastModified: Date;
}

export interface StatistaStudyRequest {
  id: string;
  brandId: string;
  productId?: string;
  studyType: 'consumer-insights' | 'market-research' | 'brand-tracking' | 'usage-attitudes';
  targetDemographics: {
    countries: string[];
    ageRange: [number, number];
    gender?: string[];
    incomeLevel?: string[];
    sampleSize: number;
  };
  researchQuestions: string[];
  methodology: 'online-survey' | 'focus-groups' | 'interviews' | 'mixed-methods';
  timeline: {
    requestDate: Date;
    expectedDelivery: Date;
    urgencyLevel: 'standard' | 'expedited' | 'rush';
  };
  budget: {
    currency: string;
    amount: number;
    approved: boolean;
  };
  status: 'draft' | 'submitted' | 'in-progress' | 'completed' | 'cancelled';
  contactInfo: {
    primaryContact: string;
    email: string;
    organization: string;
  };
  customRequirements?: string;
}

export interface StatistaStudyResult {
  id: string;
  studyRequestId: string;
  completionDate: Date;
  methodology: string;
  sampleSize: number;
  keyFindings: string[];
  demographicBreakdown: Record<string, any>;
  reportUrl?: string;
  dataFiles: BrandAsset[];
  executiveSummary: string;
  recommendations: string[];
  confidence: number; // 0-100%
  marginOfError: number;
}

export interface PerformanceChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'insight';
  content: string;
  timestamp: Date;
  data?: {
    channelId?: string;
    metricType?: 'roas' | 'spend' | 'reach' | 'cpm' | 'impressions';
    recommendation?: string;
    confidence?: number;
    impact?: 'low' | 'medium' | 'high';
  };
  actions?: Array<{
    id: string;
    label: string;
    type: 'budget_reallocation' | 'pause_channel' | 'optimization' | 'alert_action';
    parameters?: Record<string, any>;
  }>;
}

export interface AIPerformanceInsight {
  id: string;
  type: 'anomaly' | 'opportunity' | 'warning' | 'achievement' | 'forecast';
  title: string;
  description: string;
  channelId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100%
  impact: {
    type: 'cost_saving' | 'performance_gain' | 'risk_mitigation' | 'efficiency_improvement';
    estimated: number; // monetary value or percentage
    timeframe: string; // e.g., "next 7 days"
  };
  recommendations: string[];
  dataPoints: Array<{
    metric: string;
    current: number;
    expected: number;
    variance: number;
  }>;
  generatedAt: Date;
  acknowledged: boolean;
}

export interface CampaignData {
  // Brand and Product Selection
  selectedBrand?: Brand;
  selectedProduct?: Product;
  statistaStudies: StatistaStudyRequest[];
  statistaResults: StatistaStudyResult[];
  projectMaterials: BrandAsset[];
  
  // Basic info
  name: string;
  region: string;
  category: string;
  budget: number;
  flightLength: number; // days
  
  // Strategy generation flag
  shouldAutoGenerateStrategies?: boolean;
  
  // Team collaboration
  teamMembers: TeamMember[];
  comments: Comment[];
  decisionLog: Array<{
    id: string;
    decision: string;
    timestamp: Date;
    userId: string;
  }>;
  
  // SynthiePop cohorts
  directCohorts: {
    gemeindeCode: string;
    bundesland: number;
    ageRange: [number, number];
    gender: number[];
    householdSize: [number, number];
    occupation: string[];
    population: number;
    complexQuery?: string; // Advanced SQL-like query for complex demographic filtering
  };
  
  // Population data and refinement
  populationData: SynthiePopData[];
  populationFilters: PopulationFilters;
  refinedPopulation: SynthiePopData[];
  
  // AI-powered proxy cohorts
  proxyCohorts: ProxyCohort[];
  
  // Generated strategies
  strategies: Strategy[];
  selectedStrategies: string[]; // Multiple strategies can be selected for comparison
  finalStrategy?: string; // The one strategy chosen for implementation
  
  // Campaign activation and performance tracking
  activation: CampaignActivation;
  channelPerformance: ChannelPerformance[];
  performanceAlerts: PerformanceAlert[];
  
  // AI Performance Analysis
  performanceChatMessages: PerformanceChatMessage[];
  aiPerformanceInsights: AIPerformanceInsight[];
  
  // Performance summary
  overallPerformance: {
    totalSpend: number;
    totalImpressions: number;
    totalReach: number;
    overallRoas: number;
    campaignProgress: number; // 0-100%
    daysRemaining: number;
    lastUpdated: Date;
  };
  
  // Legacy fields for compatibility
  demographics: {
    ageRange: [number, number];
    gender: string[];
    householdSize: [number, number];
    incomeLevel: string;
  };
  brandAffinity: {
    brand: string;
    platform: string[];
  };
  audienceSize: number;
  affinityPercentage: number;
  mediaChannel: string;
  impressions: number;
  reach: number;
  cpm: number;
  roiLevel: string;
}

const steps = [
  'Brand & Product Selection',
  'Campaign Setup',
  'Cohort Builder',
  'Audience Refinement',
  'Strategy Generator',
  'Comparative Dashboard',
  'Campaign Export & Activation',
  'Performance Monitoring'
];

export function RetailMediaWorkflow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [campaignData, setCampaignData] = useState<CampaignData>({
    statistaStudies: [],
    statistaResults: [],
    projectMaterials: [],
    name: '',
    region: 'Germany',
    category: '',
    budget: 50000,
    flightLength: 30,
    teamMembers: [],
    comments: [],
    decisionLog: [],
    directCohorts: {
      gemeindeCode: '',
      bundesland: 0, // 0 = All of Germany (83M population)
      ageRange: [25, 45],
      gender: [],
      householdSize: [2, 4],
      occupation: [],
      population: 83000000 // Start with full German population
    },
    populationData: [],
    populationFilters: {},
    refinedPopulation: [],
    proxyCohorts: [],
    strategies: [],
    selectedStrategies: [],
    activation: {
      status: 'draft',
      activatedChannels: [],
      campaignIds: {}
    },
    channelPerformance: [],
    performanceAlerts: [],
    performanceChatMessages: [],
    aiPerformanceInsights: [],
    overallPerformance: {
      totalSpend: 0,
      totalImpressions: 0,
      totalReach: 0,
      overallRoas: 0,
      campaignProgress: 0,
      daysRemaining: 30,
      lastUpdated: new Date()
    },
    demographics: {
      ageRange: [25, 45],
      gender: [],
      householdSize: [2, 4],
      incomeLevel: 'middle'
    },
    brandAffinity: {
      brand: '',
      platform: []
    },
    audienceSize: 0,
    affinityPercentage: 0,
    mediaChannel: '',
    impressions: 0,
    reach: 0,
    cpm: 0,
    roiLevel: 'medium'
  });

  const updateCampaignData = (updates: Partial<CampaignData>) => {
    setCampaignData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return <BrandProductSelection data={campaignData} onUpdate={updateCampaignData} onNext={nextStep} />;
      case 1:
        return <CampaignSetup data={campaignData} onUpdate={updateCampaignData} onNext={nextStep} onPrev={prevStep} />;
      case 2:
        return <CohortBuilder data={campaignData} onUpdate={updateCampaignData} onNext={nextStep} onPrev={prevStep} />;
      case 3:
        return <AudienceRefinement data={campaignData} onUpdate={updateCampaignData} onNext={nextStep} onPrev={prevStep} />;
      case 4:
        return <StrategyGenerator data={campaignData} onUpdate={updateCampaignData} onNext={nextStep} onPrev={prevStep} />;
      case 5:
        return <ComparativeDashboard data={campaignData} onUpdate={updateCampaignData} onNext={nextStep} onPrev={prevStep} />;
      case 6:
        return <CollaborationPanel data={campaignData} onUpdate={updateCampaignData} onNext={nextStep} onPrev={prevStep} />;
      case 7:
        return <PerformanceMonitoring data={campaignData} onUpdate={updateCampaignData} onPrev={prevStep} />;
      default:
        return null;
    }
  };

  // Determine if Performance Monitoring should be accessible
  const isPerformanceMonitoringAvailable = campaignData.activation.status !== 'draft';

  const getHeaderInfo = () => {
    const info = [];
    
    if (campaignData.selectedBrand) {
      info.push({
        icon: Building2,
        text: campaignData.selectedBrand.name,
        color: 'text-blue-600'
      });
    }
    
    if (campaignData.selectedProduct) {
      info.push({
        icon: Package,
        text: campaignData.selectedProduct.name,
        color: 'text-green-600'
      });
    }
    
    if (campaignData.teamMembers.length > 0) {
      info.push({
        icon: Users,
        text: `${campaignData.teamMembers.length} team member${campaignData.teamMembers.length !== 1 ? 's' : ''}`,
        color: 'text-muted-foreground'
      });
    }
    
    return info;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1>Retail-Media Audience Planner</h1>
            <div className="flex items-center space-x-4">
              {getHeaderInfo().map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                  <span className={`text-sm ${item.color}`}>
                    {item.text}
                  </span>
                </div>
              ))}
              {campaignData.activation.status === 'active' && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-muted-foreground">Campaign Active</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="flex justify-between">
              {steps.map((step, index) => (
                <div key={step} className="flex items-center space-x-2">
                  <button
                    onClick={() => goToStep(index)}
                    disabled={index === 7 && !isPerformanceMonitoringAvailable}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                      index <= currentStep 
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                        : index === 7 && !isPerformanceMonitoringAvailable
                        ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {index + 1}
                  </button>
                  <span className={`text-sm ${
                    index <= currentStep ? 'text-foreground' : 
                    index === 7 && !isPerformanceMonitoringAvailable ? 'text-muted-foreground opacity-50' :
                    'text-muted-foreground'
                  }`}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
            <Progress value={(currentStep / (steps.length - 1)) * 100} className="h-2" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {renderCurrentStep()}
      </div>
    </div>
  );
}