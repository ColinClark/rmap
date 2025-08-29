import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ChevronLeft, ChevronRight, Users, Database, Bot, Search, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { CampaignData, ProxyCohort } from '../App';

interface CohortBuilderProps {
  data: CampaignData;
  onUpdate: (updates: Partial<CampaignData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const bundeslaender = [
  { code: 1, name: 'Schleswig-Holstein' },
  { code: 2, name: 'Hamburg' },
  { code: 3, name: 'Niedersachsen' },
  { code: 4, name: 'Bremen' },
  { code: 5, name: 'Nordrhein-Westfalen' },
  { code: 6, name: 'Hessen' },
  { code: 7, name: 'Rheinland-Pfalz' },
  { code: 8, name: 'Baden-Württemberg' },
  { code: 9, name: 'Bayern' },
  { code: 10, name: 'Saarland' },
  { code: 11, name: 'Berlin' },
  { code: 12, name: 'Brandenburg' },
  { code: 13, name: 'Mecklenburg-Vorpommern' },
  { code: 14, name: 'Sachsen' },
  { code: 15, name: 'Sachsen-Anhalt' },
  { code: 16, name: 'Thüringen' }
];

const occupationCategories = [
  'Managers and Senior Officials',
  'Professional Occupations',
  'Technical and Associate Professional',
  'Administrative and Secretarial',
  'Skilled Trades',
  'Personal Service',
  'Sales and Customer Service',
  'Process, Plant and Machine Operatives',
  'Elementary Occupations'
];

export function CohortBuilder({ data, onUpdate, onNext, onPrev }: CohortBuilderProps) {
  const [proxyQuery, setProxyQuery] = useState('');
  const [isProcessingProxy, setIsProcessingProxy] = useState(false);
  const [proxyResults, setProxyResults] = useState<ProxyCohort | null>(null);

  // Simple hash function to create deterministic "randomness" from query string
  const hashQuery = (query: string): number => {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  };

  // Calculate SynthiePop population
  useEffect(() => {
    let calculatedSize: number;
    
    // If there's a complex query, simulate processing it
    if (data.directCohorts.complexQuery && data.directCohorts.complexQuery.trim()) {
      // Simulate complex query evaluation - in real implementation this would query the actual SynthiePop database
      const baseSize = 83000000; // 83M German population
      // Use deterministic "randomness" based on query content to prevent flickering
      const queryHash = hashQuery(data.directCohorts.complexQuery);
      const queryComplexityFactor = 0.3 + ((queryHash % 1000) / 1000 * 0.4); // 30-70% of base population
      calculatedSize = Math.floor(baseSize * queryComplexityFactor);
    } else {
      // Standard calculation based on individual filters
      const baseSize = 83000000; // 83M German population 
      const bundeslandMultiplier = data.directCohorts.bundesland ? 0.06 : 1; // ~6% average per state (varies by state)
      const ageRange = data.directCohorts.ageRange[1] - data.directCohorts.ageRange[0];
      const ageMultiplier = ageRange / 65;
      const genderMultiplier = data.directCohorts.gender.length === 0 ? 1 : data.directCohorts.gender.length / 2;
      const householdRange = data.directCohorts.householdSize[1] - data.directCohorts.householdSize[0];
      const householdMultiplier = householdRange / 8;
      const occupationMultiplier = data.directCohorts.occupation.length === 0 ? 1 : data.directCohorts.occupation.length / occupationCategories.length;
      
      calculatedSize = Math.floor(
        baseSize * 
        bundeslandMultiplier *
        ageMultiplier * 
        genderMultiplier * 
        householdMultiplier *
        occupationMultiplier
      );
    }

    onUpdate({
      directCohorts: {
        ...data.directCohorts,
        population: calculatedSize
      },
      audienceSize: calculatedSize + data.proxyCohorts.reduce((sum, proxy) => sum + proxy.population, 0)
    });
  }, [data.directCohorts, data.proxyCohorts, onUpdate]);

  const handleGenderChange = (gender: number, checked: boolean) => {
    const currentGenders = data.directCohorts.gender;
    const newGenders = checked 
      ? [...currentGenders, gender]
      : currentGenders.filter(g => g !== gender);
    
    onUpdate({
      directCohorts: {
        ...data.directCohorts,
        gender: newGenders
      }
    });
  };

  const handleOccupationChange = (occupation: string, checked: boolean) => {
    const currentOccupations = data.directCohorts.occupation;
    const newOccupations = checked 
      ? [...currentOccupations, occupation]
      : currentOccupations.filter(o => o !== occupation);
    
    onUpdate({
      directCohorts: {
        ...data.directCohorts,
        occupation: newOccupations
      }
    });
  };

  const processProxyQuery = async () => {
    if (!proxyQuery.trim()) return;
    
    setIsProcessingProxy(true);
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate contextualized mapping based on current SynthiePop selection
    const genderContext = data.directCohorts.gender.length > 0 ? 
      data.directCohorts.gender.map(g => g === 1 ? 'Male' : 'Female').join(' & ') : 'All genders';
    const occupationContext = data.directCohorts.occupation.length > 0 ? 
      ` in ${data.directCohorts.occupation.slice(0, 2).join(', ')} roles` : '';
    const regionContext = selectedBundesland ? ` in ${selectedBundesland.name}` : ' across Germany';
    
    // More sophisticated population estimation based on context
    const basePopulation = data.directCohorts.population || 100000;
    const behavioralAffinityFactor = Math.random() * 0.4 + 0.1; // 10-50% of base population might have this behavior
    const estimatedPopulation = Math.floor(basePopulation * behavioralAffinityFactor);
    
    // Mock proxy cohort generation with better context
    const mockResult: ProxyCohort = {
      query: proxyQuery,
      sourceData: Math.random() > 0.6 ? 'statista-ci' : 'web-search',
      affinity: Math.floor(Math.random() * 40) + 35, // 35-75%
      confidence: Math.floor(Math.random() * 20) + 78, // 78-98%
      population: estimatedPopulation,
      mapping: `Mapped to ${genderContext} aged ${data.directCohorts.ageRange[0]}-${data.directCohorts.ageRange[1]}${occupationContext}${regionContext} with behavioral affinity for "${proxyQuery}"`
    };
    
    setProxyResults(mockResult);
    setIsProcessingProxy(false);
  };

  const addProxyCohort = () => {
    if (proxyResults) {
      onUpdate({
        proxyCohorts: [...data.proxyCohorts, proxyResults]
      });
      setProxyResults(null);
      setProxyQuery('');
    }
  };

  const removeProxyCohort = (index: number) => {
    onUpdate({
      proxyCohorts: data.proxyCohorts.filter((_, i) => i !== index)
    });
  };

  const selectedBundesland = bundeslaender.find(b => b.code === data.directCohorts.bundesland);

  const [isScrolled, setIsScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState('direct');

  // Track scroll position - only when Direct Cohorts tab is active
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      // Only set scrolled state when on Direct Cohorts tab
      setIsScrolled(activeTab === 'direct' && scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2>Cohort Builder</h2>
        <p className="text-muted-foreground mt-2">
          Build precise audience cohorts by combining <strong>SynthiePop's 83M+ synthetic population</strong> with <strong>Statista's consumer insights</strong> to identify untapped opportunities and optimize spending.
        </p>
      </div>

      {/* Data Integration Value Proposition */}
      <Alert className="border-emerald-200 bg-emerald-50">
        <Database className="h-4 w-4 text-emerald-600" />
        <AlertDescription className="text-emerald-800">
          <strong>Opportunity Detection:</strong> When SynthiePop shows high population density but Statista reveals low market penetration, you've found an underserved segment ripe for increased investment. Conversely, oversaturated segments suggest budget reallocation opportunities.
        </AlertDescription>
      </Alert>

      {/* Combined Audience Metrics Panel - Fixed when scrolled */}
      <div className={`${isScrolled ? 'fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-background' : ''}`}>
        <Card className={`${isScrolled ? 'bg-background border-primary/30 shadow-xl max-w-6xl mx-auto' : 'bg-primary/5 border-primary/20'}`}>
          <CardContent className={`${isScrolled ? 'py-4' : 'py-6'}`}>
          <div className="space-y-4">
            {/* Main Audience Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SynthiePop Population */}
              <div className="flex items-center justify-center space-x-4">
                <Database className="h-8 w-8 text-primary" />
                <div className="text-center">
                  <div className="text-2xl font-semibold text-primary">{data.directCohorts.population.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">
                    SynthiePop Population
                    {data.directCohorts.complexQuery && (
                      <span className="text-xs text-amber-600 ml-1">(Complex Query)</span>
                    )}
                  </div>
                  {selectedBundesland && (
                    <div className="text-xs text-muted-foreground mt-1">in {selectedBundesland.name}</div>
                  )}
                </div>
              </div>
              
              {/* Total Audience Size */}
              <div className="flex items-center justify-center space-x-4">
                <Users className="h-8 w-8 text-primary" />
                <div className="text-center">
                  <div className="text-2xl font-semibold text-primary">{data.audienceSize.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">
                    Total Audience Size
                    {data.proxyCohorts.length > 0 && (
                      <span className="text-xs text-muted-foreground"> ({data.proxyCohorts.length} proxy cohorts)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Market Opportunity Analysis */}
            {data.category && (
              <div className="border-t pt-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-semibold text-green-600">
                      {Math.floor(data.directCohorts.population * 0.23).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Statista: {data.category} Users</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-amber-600">
                      {Math.floor(data.directCohorts.population * 0.77).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Opportunity Gap</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-blue-600">77%</div>
                    <div className="text-sm text-muted-foreground">Untapped Potential</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Spacer to prevent content jump when panel becomes fixed */}
      {isScrolled && <div className="h-32"></div>}

      <Tabs defaultValue="direct" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="direct" className="flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span>Direct Cohorts (SynthiePop)</span>
          </TabsTrigger>
          <TabsTrigger value="proxy" className="flex items-center space-x-2">
            <Bot className="h-4 w-4" />
            <span>AI Proxy Cohorts</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="direct" className="space-y-6">
          {/* Occupation & Advanced Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Occupation & Advanced Targeting (KldB Codes)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Occupation Presets */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Quick Occupation Presets</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdate({
                      directCohorts: { 
                        ...data.directCohorts, 
                        occupation: ['Managers and Senior Officials', 'Professional Occupations']
                      }
                    })}
                    className="text-xs"
                  >
                    High-Income Professionals
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdate({
                      directCohorts: { 
                        ...data.directCohorts, 
                        occupation: ['Sales and Customer Service', 'Personal Service']
                      }
                    })}
                    className="text-xs"
                  >
                    Service Workers
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdate({
                      directCohorts: { 
                        ...data.directCohorts, 
                        occupation: ['Technical and Associate Professional', 'Administrative and Secretarial']
                      }
                    })}
                    className="text-xs"
                  >
                    White Collar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdate({
                      directCohorts: { 
                        ...data.directCohorts, 
                        occupation: ['Skilled Trades', 'Process, Plant and Machine Operatives']
                      }
                    })}
                    className="text-xs"
                  >
                    Blue Collar
                  </Button>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <Label className="text-sm font-medium mb-3 block">Individual Occupation Categories</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {occupationCategories.map((occupation) => (
                    <div key={occupation} className="flex items-center space-x-2">
                      <Checkbox
                        id={occupation}
                        checked={data.directCohorts.occupation.includes(occupation)}
                        onCheckedChange={(checked) => handleOccupationChange(occupation, !!checked)}
                      />
                      <Label htmlFor={occupation} className="text-sm">{occupation}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Advanced SynthiePop Query Builder */}
              <div className="border-t pt-4 space-y-3">
                <Label className="text-sm font-medium">Advanced SynthiePop Query Builder</Label>
                
                {/* Sample Query Buttons */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Sample Complex Queries:</Label>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-2 text-xs text-left justify-start"
                      onClick={() => {
                        const query = "(age >= 30 AND age <= 45) AND (householdSize >= 3) AND (bundesland IN [8,9])";
                        onUpdate({
                          directCohorts: { ...data.directCohorts, complexQuery: query }
                        });
                      }}
                    >
                      <code className="text-xs">Families in South Germany: (age 30-45) AND (household ≥3) AND (Baden-Württemberg OR Bayern)</code>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-2 text-xs text-left justify-start"
                      onClick={() => {
                        const query = "(gender = 2) AND (age >= 25 AND age <= 40) AND (occupation LIKE '%Professional%' OR occupation LIKE '%Manager%')";
                        onUpdate({
                          directCohorts: { ...data.directCohorts, complexQuery: query }
                        });
                      }}
                    >
                      <code className="text-xs">Professional Women: (female) AND (age 25-40) AND (professional/manager roles)</code>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-2 text-xs text-left justify-start"
                      onClick={() => {
                        const query = "(householdSize = 1) AND (age >= 55) AND (bundesland IN [11,2,6])";
                        onUpdate({
                          directCohorts: { ...data.directCohorts, complexQuery: query }
                        });
                      }}
                    >
                      <code className="text-xs">Urban Singles 55+: (single household) AND (age ≥55) AND (Berlin OR Hamburg OR Hessen)</code>
                    </Button>
                  </div>
                </div>
                
                <Textarea
                  placeholder="Enter custom SQL-like query or use samples above..."
                  value={data.directCohorts.complexQuery || ''}
                  className="h-20 text-xs font-mono"
                  onChange={(e) => {
                    onUpdate({
                      directCohorts: {
                        ...data.directCohorts,
                        complexQuery: e.target.value
                      }
                    });
                  }}
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Variables:</strong> age, gender (1=male, 2=female), householdSize, bundesland (1-16), occupation, migrationBackground (true/false)</p>
                  <p><strong>Operators:</strong> AND, OR, IN, LIKE, =, !=, &gt;=, &lt;=, &gt;, &lt;</p>
                  <p><strong>Examples:</strong> age &gt;= 30, gender = 2, bundesland IN [8,9,11], occupation LIKE '%Manager%'</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Geographic Targeting */}
            <Card>
              <CardHeader>
                <CardTitle>Geographic Targeting (AGS/NUTS)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Bundesland (Optional Geographic Filter)</Label>
                  <Select 
                    value={data.directCohorts.bundesland.toString()} 
                    onValueChange={(value) => onUpdate({
                      directCohorts: { ...data.directCohorts, bundesland: parseInt(value) }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All of Germany (83M population)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">All of Germany</SelectItem>
                      {bundeslaender.map((state) => (
                        <SelectItem key={state.code} value={state.code.toString()}>
                          {state.name} ({state.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gemeinde-code">GemeindeCode (12-digit ARS)</Label>
                  <Input
                    id="gemeinde-code"
                    placeholder="e.g. 110000000000"
                    value={data.directCohorts.gemeindeCode}
                    onChange={(e) => onUpdate({
                      directCohorts: { ...data.directCohorts, gemeindeCode: e.target.value }
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Demographics */}
            <Card>
              <CardHeader>
                <CardTitle>Demographics & Complex Queries</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quick Filters */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Quick Demographic Filters</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdate({
                        directCohorts: { 
                          ...data.directCohorts, 
                          ageRange: [25, 35],
                          gender: [2],
                          householdSize: [3, 5]
                        }
                      })}
                      className="text-xs"
                    >
                      Young Families
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdate({
                        directCohorts: { 
                          ...data.directCohorts, 
                          ageRange: [35, 50],
                          householdSize: [2, 4]
                        }
                      })}
                      className="text-xs"
                    >
                      Middle-aged Adults
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdate({
                        directCohorts: { 
                          ...data.directCohorts, 
                          ageRange: [55, 75],
                          householdSize: [1, 2]
                        }
                      })}
                      className="text-xs"
                    >
                      Empty Nesters
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdate({
                        directCohorts: { 
                          ...data.directCohorts, 
                          ageRange: [18, 30],
                          gender: [],
                          householdSize: [1, 3]
                        }
                      })}
                      className="text-xs"
                    >
                      Young Adults
                    </Button>
                  </div>
                </div>
                <div className="border-t pt-4"></div>
                <div className="space-y-3">
                  <Label>Age Range: {data.directCohorts.ageRange[0]} - {data.directCohorts.ageRange[1]} years</Label>
                  <Slider
                    value={data.directCohorts.ageRange}
                    onValueChange={(value) => onUpdate({
                      directCohorts: { ...data.directCohorts, ageRange: value as [number, number] }
                    })}
                    min={18}
                    max={75}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Gender (SynthiePop Codes)</Label>
                  <div className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="male"
                        checked={data.directCohorts.gender.includes(1)}
                        onCheckedChange={(checked) => handleGenderChange(1, !!checked)}
                      />
                      <Label htmlFor="male">Male (1)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="female"
                        checked={data.directCohorts.gender.includes(2)}
                        onCheckedChange={(checked) => handleGenderChange(2, !!checked)}
                      />
                      <Label htmlFor="female">Female (2)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Household Size: {data.directCohorts.householdSize[0]} - {data.directCohorts.householdSize[1]} people</Label>
                  <Slider
                    value={data.directCohorts.householdSize}
                    onValueChange={(value) => onUpdate({
                      directCohorts: { ...data.directCohorts, householdSize: value as [number, number] }
                    })}
                    min={1}
                    max={8}
                    step={1}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="proxy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="h-5 w-5" />
                <span>AI-Powered Proxy Cohorts</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-blue-200 bg-blue-50">
                <Bot className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Smart Data Fusion:</strong> When behaviors aren't captured in SynthiePop demographics, our AI automatically sources from Statista's consumer insights database or validates through real-time web research, creating a comprehensive audience profile that bridges demographic reality with behavioral insights.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                {/* Show current SynthiePop selection context */}
                {(data.directCohorts.ageRange[0] !== 25 || data.directCohorts.ageRange[1] !== 45 || 
                  data.directCohorts.gender.length > 0 || data.directCohorts.occupation.length > 0) && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Label className="text-sm font-medium text-blue-800 mb-2 block">Current SynthiePop Selection Context</Label>
                    <div className="text-xs text-blue-700 space-y-1">
                      <div>Ages: {data.directCohorts.ageRange[0]}-{data.directCohorts.ageRange[1]}</div>
                      {data.directCohorts.gender.length > 0 && (
                        <div>Gender: {data.directCohorts.gender.map(g => g === 1 ? 'Male' : 'Female').join(', ')}</div>
                      )}
                      {data.directCohorts.occupation.length > 0 && (
                        <div>Occupations: {data.directCohorts.occupation.slice(0, 2).join(', ')}{data.directCohorts.occupation.length > 2 ? '...' : ''}</div>
                      )}
                      <div>Region: {data.region || 'All regions'}</div>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      AI will map behavioral queries within this demographic context
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="proxy-query">Natural Language Behavioral Query</Label>
                  <Textarea
                    id="proxy-query"
                    placeholder="e.g. TikTok users who drink energy drinks, Luxury car owners in Munich, Organic food shoppers, Premium brand loyalists, Eco-conscious consumers..."
                    value={proxyQuery}
                    onChange={(e) => setProxyQuery(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Describe behavioral characteristics that aren't captured in SynthiePop demographics. AI will source from Statista or validate via web research.
                  </p>
                </div>

                <Button 
                  onClick={processProxyQuery} 
                  disabled={!proxyQuery.trim() || isProcessingProxy}
                  className="w-full"
                >
                  {isProcessingProxy ? (
                    <>
                      <Search className="mr-2 h-4 w-4 animate-spin" />
                      Processing with AI...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Generate Proxy Cohort
                    </>
                  )}
                </Button>
              </div>

              {proxyResults && (
                <Card className="bg-accent/50">
                  <CardHeader>
                    <CardTitle className="text-lg">AI Mapping Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Source</div>
                        <Badge variant="outline">
                          {proxyResults.sourceData === 'statista-ci' ? 'Statista CI' : 'Web Search'}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Confidence</div>
                        <div>{proxyResults.confidence}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Affinity</div>
                        <div>{proxyResults.affinity}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Population</div>
                        <div>{proxyResults.population.toLocaleString()}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Mapping</div>
                      <div className="text-sm">{proxyResults.mapping}</div>
                    </div>
                    <Button onClick={addProxyCohort} className="w-full">
                      Add to Campaign
                    </Button>
                  </CardContent>
                </Card>
              )}

              {data.proxyCohorts.length > 0 && (
                <div className="space-y-3">
                  <Label>Active Proxy Cohorts ({data.proxyCohorts.length})</Label>
                  <div className="space-y-3">
                    {data.proxyCohorts.map((proxy, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2 flex-1">
                              <div>{proxy.query}</div>
                              <div className="flex space-x-4 text-sm text-muted-foreground">
                                <span>Population: {proxy.population.toLocaleString()}</span>
                                <span>Affinity: {proxy.affinity}%</span>
                                <span>Confidence: {proxy.confidence}%</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeProxyCohort(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <Button onClick={onNext} className="min-w-32">
          Generate Strategies
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}