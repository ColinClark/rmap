import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Target, 
  TrendingUp, 
  Shield, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Database,
  Globe,
  BarChart3,
  Building,
  Calendar,
  Info
} from 'lucide-react';
import { CampaignData, Strategy } from '../App';

interface StrategyGeneratorProps {
  data: CampaignData;
  onUpdate: (updates: Partial<CampaignData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

interface DataSource {
  name: string;
  type: 'primary' | 'secondary' | 'benchmark' | 'proxy';
  confidence: number; // 0-100
  lastUpdated: string;
  coverage: string; // e.g., "Germany-wide", "NRW only"
  icon: React.ReactNode;
  description: string;
}

interface StrategyDataSources {
  demographics: DataSource[];
  behavioral: DataSource[];
  performance: DataSource[];
  market: DataSource[];
}

export function StrategyGenerator({ data, onUpdate, onNext, onPrev }: StrategyGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('');
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);

  // Auto-generate strategies when coming from Audience Refinement
  useEffect(() => {
    if ((data as any).shouldAutoGenerateStrategies && data.strategies.length === 0) {
      // Clear the flag and trigger generation
      onUpdate({ shouldAutoGenerateStrategies: false });
      generateStrategies();
    }
  }, [(data as any).shouldAutoGenerateStrategies]);

  // Mock data sources for different aspects of strategy generation
  const getDataSources = (strategy: Strategy): StrategyDataSources => {
    return {
      demographics: [
        {
          name: 'SynthiePop',
          type: 'primary',
          confidence: 95,
          lastUpdated: '2024-01-15',
          coverage: 'Germany-wide (83M people)',
          icon: <Database className="h-4 w-4" />,
          description: 'Official demographic data from German statistical offices'
        },
        {
          name: 'Statista Consumer Insights',
          type: 'secondary',
          confidence: 87,
          lastUpdated: '2024-01-10',
          coverage: 'German consumers 18-65',
          icon: <BarChart3 className="h-4 w-4" />,
          description: 'Consumer behavior and preference data from 12,000+ German respondents'
        }
      ],
      behavioral: [
        {
          name: 'Statista Media Intelligence',
          type: 'secondary',
          confidence: 82,
          lastUpdated: '2024-01-12',
          coverage: 'Digital platforms usage',
          icon: <BarChart3 className="h-4 w-4" />,
          description: 'Platform usage patterns and brand affinity scores'
        },
        {
          name: 'Web Search Analysis',
          type: 'proxy',
          confidence: 71,
          lastUpdated: '2024-01-14',
          coverage: 'Search trends & interests',
          icon: <Globe className="h-4 w-4" />,
          description: 'AI-powered analysis of search trends and online behavior patterns'
        }
      ],
      performance: [
        {
          name: 'Internal Benchmarks',
          type: 'benchmark',
          confidence: 89,
          lastUpdated: '2024-01-13',
          coverage: 'Retail media campaigns',
          icon: <Building className="h-4 w-4" />,
          description: 'Historical performance data from 500+ retail media campaigns'
        },
        {
          name: 'Partner API Feeds',
          type: 'benchmark',
          confidence: 91,
          lastUpdated: '2024-01-14',
          coverage: 'Live market rates',
          icon: <RefreshCw className="h-4 w-4" />,
          description: 'Real-time CPM and performance data from advertising partners'
        }
      ],
      market: [
        {
          name: 'Retail Media Networks',
          type: 'benchmark',
          confidence: 88,
          lastUpdated: '2024-01-13',
          coverage: 'DACH region networks',
          icon: <Building className="h-4 w-4" />,
          description: 'Performance benchmarks from Kaufland, REWE, Real, and other RMNs'
        },
        {
          name: 'Walled Garden APIs',
          type: 'benchmark',
          confidence: 85,
          lastUpdated: '2024-01-12',
          coverage: 'Meta, Google, TikTok',
          icon: <Globe className="h-4 w-4" />,
          description: 'Campaign performance data from major digital advertising platforms'
        }
      ]
    };
  };

  const generateStrategies = async () => {
    setIsGenerating(true);
    setSelectedStrategies([]);
    
    const steps = [
      'Analyzing SynthiePop demographic data...',
      'Processing Statista Consumer Insights...',
      'Fetching real-time market benchmarks...',
      'Running AI proxy mapping algorithms...',
      'Optimizing channel combinations...',
      'Calculating Pareto-optimal strategies...',
      'Finalizing recommendations...'
    ];

    for (let i = 0; i < steps.length; i++) {
      setGenerationStep(steps[i]);
      setGenerationProgress((i / (steps.length - 1)) * 100);
      await new Promise(resolve => setTimeout(resolve, 1200));
    }

    // Generate mock strategies with realistic data
    const mockStrategies: Strategy[] = [
      {
        id: 'strategy-1',
        name: 'Precision Targeting Pro',
        cohorts: ['direct-demographics', 'brand-affinity'],
        channels: ['retail-media', 'search', 'social'],
        budget: data.budget,
        roas: 4.2,
        reach: 34,
        risk: 23,
        impressions: 2800000,
        cpm: 2.15,
        confidence: 91
      },
      {
        id: 'strategy-2', 
        name: 'Broad Reach Optimizer',
        cohorts: ['direct-demographics', 'behavioral-proxy'],
        channels: ['social', 'display', 'video', 'retail-media'],
        budget: data.budget,
        roas: 3.1,
        reach: 67,
        risk: 31,
        impressions: 4200000,
        cpm: 1.89,
        confidence: 84
      },
      {
        id: 'strategy-3',
        name: 'Conservative ROI Focus',
        cohorts: ['direct-demographics'],
        channels: ['retail-media', 'search'],
        budget: data.budget,
        roas: 5.1,
        reach: 28,
        risk: 18,
        impressions: 1900000,
        cpm: 2.41,
        confidence: 94
      },
      {
        id: 'strategy-4',
        name: 'Multi-Channel Growth',
        cohorts: ['direct-demographics', 'platform-usage', 'brand-affinity'],
        channels: ['retail-media', 'social', 'display', 'video', 'audio'],
        budget: data.budget,
        roas: 2.8,
        reach: 78,
        risk: 42,
        impressions: 5100000,
        cpm: 1.67,
        confidence: 79
      },
      {
        id: 'strategy-5',
        name: 'AI-Enhanced Hybrid',
        cohorts: ['direct-demographics', 'ai-behavioral-proxy', 'purchase-intent'],
        channels: ['retail-media', 'social', 'search', 'ctv'],
        budget: data.budget,
        roas: 3.7,
        reach: 45,
        risk: 29,
        impressions: 3400000,
        cpm: 1.98,
        confidence: 86
      }
    ];

    onUpdate({ strategies: mockStrategies });
    setIsGenerating(false);
    setGenerationProgress(100);
    setGenerationStep('Strategy generation complete!');
  };

  const toggleStrategySelection = (strategyId: string) => {
    setSelectedStrategies(prev => {
      if (prev.includes(strategyId)) {
        return prev.filter(id => id !== strategyId);
      } else if (prev.length < 4) {
        return [...prev, strategyId];
      }
      return prev;
    });
  };

  const proceedToComparison = () => {
    onUpdate({ selectedStrategies });
    onNext();
  };

  const pickTop3Strategies = () => {
    // Sort strategies by a weighted score combining ROAS, confidence, and inverse risk
    const scoredStrategies = data.strategies.map(strategy => ({
      id: strategy.id,
      score: (strategy.roas * 0.4) + (strategy.confidence * 0.004) + ((100 - strategy.risk) * 0.006)
    }));

    // Sort by score descending and take top 3
    const top3 = scoredStrategies
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.id);

    setSelectedStrategies(top3);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-50';
    if (confidence >= 80) return 'text-blue-600 bg-blue-50';
    if (confidence >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getDataSourceTypeColor = (type: DataSource['type']) => {
    switch (type) {
      case 'primary': return 'bg-green-100 text-green-800';
      case 'secondary': return 'bg-blue-100 text-blue-800';
      case 'benchmark': return 'bg-purple-100 text-purple-800';
      case 'proxy': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDataSourceTypeLabel = (type: DataSource['type']) => {
    switch (type) {
      case 'primary': return 'Primary Data';
      case 'secondary': return 'Research Data';
      case 'benchmark': return 'Market Benchmark';
      case 'proxy': return 'AI Proxy';
      default: return 'Unknown';
    }
  };

  return (
    <TooltipProvider>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h2>AI Strategy Generator</h2>
          <p className="text-muted-foreground mt-2">
            Generate optimized campaign strategies using SynthiePop data, Statista insights, and AI-powered analysis.
          </p>
        </div>

        {/* Data Sources Overview */}
        <Card className="bg-blue-50/50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-blue-600" />
              <span>AI Data Sources & Methodology</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Demographics</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  SynthiePop (95% confidence)<br/>
                  Statista Consumer Insights (87% confidence)
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-orange-600" />
                  <span className="font-medium">Behavioral Data</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Statista Media Intelligence<br/>
                  AI Web Search Analysis
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">Performance</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Internal Benchmarks (500+ campaigns)<br/>
                  Real-time Partner API Feeds
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Market Data</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Retail Media Networks<br/>
                  Walled Garden APIs
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Generation Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5" />
              <span>Strategy Generation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isGenerating && data.strategies.length === 0 && (
              <div className="text-center space-y-4">
                <div className="text-muted-foreground">
                  Ready to generate AI-optimized campaign strategies based on your cohort definition.
                </div>
                <Button onClick={generateStrategies} size="lg" className="min-w-48">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Strategies
                </Button>
              </div>
            )}

            {isGenerating && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-lg font-medium mb-2">Generating Strategies...</div>
                  <div className="text-sm text-muted-foreground mb-4">{generationStep}</div>
                  <Progress value={generationProgress} className="h-3" />
                </div>
              </div>
            )}

            {!isGenerating && data.strategies.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Generated {data.strategies.length} optimized strategies
                </div>
                <Button onClick={generateStrategies} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Strategy Cards */}
        {data.strategies.length > 0 && (
          <>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Multi-select:</strong> Choose 2-4 strategies for detailed comparison analysis. Each strategy shows its data sources and confidence levels.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {data.strategies.map((strategy) => {
                const dataSources = getDataSources(strategy);
                const isSelected = selectedStrategies.includes(strategy.id);
                
                return (
                  <Card 
                    key={strategy.id} 
                    className={`transition-all cursor-pointer ${
                      isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                    }`}
                    onClick={() => toggleStrategySelection(strategy.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              checked={isSelected}
                              onChange={() => {}} // Controlled by card click
                            />
                            <CardTitle className="text-lg">{strategy.name}</CardTitle>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={`${getConfidenceColor(strategy.confidence)} border-0`}>
                              {strategy.confidence}% confidence
                            </Badge>
                            <Badge variant="outline">
                              {strategy.channels.length} channel{strategy.channels.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Performance Metrics */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-medium text-green-600">
                            {strategy.roas.toFixed(1)}x
                          </div>
                          <div className="text-xs text-muted-foreground">ROAS</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-medium text-blue-600">
                            {strategy.reach}%
                          </div>
                          <div className="text-xs text-muted-foreground">Reach</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-medium text-orange-600">
                            {strategy.risk}%
                          </div>
                          <div className="text-xs text-muted-foreground">Risk</div>
                        </div>
                      </div>

                      {/* Channel Mix */}
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Channel Mix</div>
                        <div className="flex flex-wrap gap-1">
                          {strategy.channels.map(channel => (
                            <Badge key={channel} variant="outline" className="text-xs">
                              {channel.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Data Sources Section */}
                      <Tabs defaultValue="sources" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="sources">Data Sources</TabsTrigger>
                          <TabsTrigger value="details">Strategy Details</TabsTrigger>
                        </TabsList>

                        <TabsContent value="sources" className="space-y-3 mt-4">
                          <div className="space-y-3">
                            {/* Demographics Sources */}
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-2">DEMOGRAPHICS</div>
                              <div className="space-y-1">
                                {dataSources.demographics.map((source, idx) => (
                                  <Tooltip key={idx}>
                                    <TooltipTrigger>
                                      <div className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded">
                                        <div className="flex items-center space-x-2">
                                          {source.icon}
                                          <span>{source.name}</span>
                                          <Badge className={`${getDataSourceTypeColor(source.type)} text-xs px-1`}>
                                            {getDataSourceTypeLabel(source.type)}
                                          </Badge>
                                        </div>
                                        <div className={`px-2 py-1 rounded text-xs ${getConfidenceColor(source.confidence)}`}>
                                          {source.confidence}%
                                        </div>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="max-w-xs space-y-1">
                                        <div className="font-medium">{source.name}</div>
                                        <div className="text-xs">{source.description}</div>
                                        <div className="text-xs text-muted-foreground">
                                          Coverage: {source.coverage}<br/>
                                          Last updated: {source.lastUpdated}
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                ))}
                              </div>
                            </div>

                            {/* Performance Sources */}
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-2">PERFORMANCE BENCHMARKS</div>
                              <div className="space-y-1">
                                {dataSources.performance.map((source, idx) => (
                                  <Tooltip key={idx}>
                                    <TooltipTrigger>
                                      <div className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded">
                                        <div className="flex items-center space-x-2">
                                          {source.icon}
                                          <span>{source.name}</span>
                                          <Badge className={`${getDataSourceTypeColor(source.type)} text-xs px-1`}>
                                            {getDataSourceTypeLabel(source.type)}
                                          </Badge>
                                        </div>
                                        <div className={`px-2 py-1 rounded text-xs ${getConfidenceColor(source.confidence)}`}>
                                          {source.confidence}%
                                        </div>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="max-w-xs space-y-1">
                                        <div className="font-medium">{source.name}</div>
                                        <div className="text-xs">{source.description}</div>
                                        <div className="text-xs text-muted-foreground">
                                          Coverage: {source.coverage}<br/>
                                          Last updated: {source.lastUpdated}
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                ))}
                              </div>
                            </div>

                            {/* Behavioral Sources - only show if strategy uses proxy data */}
                            {(strategy.name.includes('AI') || strategy.name.includes('Hybrid') || strategy.name.includes('Growth')) && (
                              <div>
                                <div className="text-xs font-medium text-muted-foreground mb-2">BEHAVIORAL PROXIES</div>
                                <div className="space-y-1">
                                  {dataSources.behavioral.map((source, idx) => (
                                    <Tooltip key={idx}>
                                      <TooltipTrigger>
                                        <div className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded">
                                          <div className="flex items-center space-x-2">
                                            {source.icon}
                                            <span>{source.name}</span>
                                            <Badge className={`${getDataSourceTypeColor(source.type)} text-xs px-1`}>
                                              {getDataSourceTypeLabel(source.type)}
                                            </Badge>
                                          </div>
                                          <div className={`px-2 py-1 rounded text-xs ${getConfidenceColor(source.confidence)}`}>
                                            {source.confidence}%
                                          </div>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <div className="max-w-xs space-y-1">
                                          <div className="font-medium">{source.name}</div>
                                          <div className="text-xs">{source.description}</div>
                                          <div className="text-xs text-muted-foreground">
                                            Coverage: {source.coverage}<br/>
                                            Last updated: {source.lastUpdated}
                                          </div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="details" className="space-y-3 mt-4">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-muted-foreground">Impressions:</span>
                              <span className="ml-1 font-medium">{(strategy.impressions / 1000000).toFixed(1)}M</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">CPM:</span>
                              <span className="ml-1 font-medium">€{strategy.cpm.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Budget:</span>
                              <span className="ml-1 font-medium">€{(strategy.budget / 1000).toFixed(0)}k</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Cohorts:</span>
                              <span className="ml-1 font-medium">{strategy.cohorts.length}</span>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Selection Summary and Proceed */}
            <Card className="bg-accent/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {selectedStrategies.length} strateg{selectedStrategies.length !== 1 ? 'ies' : 'y'} selected for comparison
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedStrategies.length === 0 ? 'Select 2-4 strategies to proceed' :
                       selectedStrategies.length === 1 ? 'Select at least 1 more strategy for comparison' :
                       `Ready to compare ${selectedStrategies.length} strategies`}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {data.strategies.length > 3 && (
                      <Button variant="outline" onClick={pickTop3Strategies}>
                        <Target className="mr-2 h-4 w-4" />
                        Pick Top 3
                      </Button>
                    )}
                    <Button 
                      onClick={proceedToComparison} 
                      disabled={selectedStrategies.length < 2}
                      className="min-w-32"
                    >
                      Compare Strategies
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onPrev}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous: Audience Refinement
          </Button>
          {data.strategies.length > 0 && selectedStrategies.length >= 2 && (
            <Button onClick={proceedToComparison} className="min-w-32">
              Next: Compare Strategies
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}