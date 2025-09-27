import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { 
  ChevronLeft, 
  ChevronRight, 
  Database, 
  MessageSquare, 
  BarChart3,
  Users,
  Filter,
  RefreshCw,
  Download,
  Search,
  Send,
  Bot,
  User,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  PieChart,
  MapPin,
  Sparkles
} from 'lucide-react';
import type { CampaignData, SynthiePopData, PopulationFilters } from '../types';

interface AudienceRefinementProps {
  data: CampaignData;
  onUpdate: (updates: Partial<CampaignData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  filters?: PopulationFilters;
  populationCount?: number;
}

interface StatsSummary {
  totalPopulation: number;
  ageStats: {
    min: number;
    max: number;
    median: number;
    mean: number;
  };
  genderDistribution: Record<number, number>;
  bundeslandDistribution: Record<number, number>;
  occupationDistribution: Record<string, number>;
  householdSizeStats: {
    min: number;
    max: number;
    median: number;
    mean: number;
  };
  educationDistribution: Record<string, number>;
  migrationBackgroundCount: number;
}

// German states mapping
const bundeslandNames: Record<number, string> = {
  1: 'Schleswig-Holstein',
  2: 'Hamburg', 
  3: 'Niedersachsen',
  4: 'Bremen',
  5: 'Nordrhein-Westfalen',
  6: 'Hessen',
  7: 'Rheinland-Pfalz',
  8: 'Baden-Württemberg',
  9: 'Bayern',
  10: 'Saarland',
  11: 'Berlin',
  12: 'Brandenburg',
  13: 'Mecklenburg-Vorpommern',
  14: 'Sachsen',
  15: 'Sachsen-Anhalt',
  16: 'Thüringen'
};

export function AudienceRefinement({ data, onUpdate, onNext, onPrev }: AudienceRefinementProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof SynthiePopData>('age');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const itemsPerPage = 50;

  // Generate mock SynthiePop population data based on cohort definition
  useEffect(() => {
    if (data.populationData.length === 0) {
      generateMockPopulationData();
    }
  }, [data.directCohorts]);

  const generateMockPopulationData = () => {
    const mockData: SynthiePopData[] = [];
    // Limit to 100 records until paging is implemented
    const targetPopulation = 100;

    const occupations = [
      '72211', '25212', '51212', '43213', '71403', '11212', '93212', '61212',
      '41213', '54212', '33213', '62212', '23212', '81212', '52213', '73212'
    ];

    const educationLevels = ['Hauptschule', 'Realschule', 'Gymnasium', 'Fachhochschule', 'Universität'];
    const cities = [
      'Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Stuttgart', 
      'Düsseldorf', 'Leipzig', 'Dortmund', 'Essen', 'Bremen', 'Dresden'
    ];

    for (let i = 0; i < targetPopulation; i++) {
      const age = Math.floor(Math.random() * (data.directCohorts.ageRange[1] - data.directCohorts.ageRange[0])) + data.directCohorts.ageRange[0];
      const bundesland = data.directCohorts.bundesland > 0 ? 
        data.directCohorts.bundesland : 
        (Math.floor(Math.random() * 16) + 1);
      const gender = data.directCohorts.gender.length > 0 ? 
        data.directCohorts.gender[Math.floor(Math.random() * data.directCohorts.gender.length)] :
        Math.floor(Math.random() * 2) + 1;
      
      mockData.push({
        ids: Math.random().toString(36).substr(2, 15),
        gemeindeCode: String(Math.floor(Math.random() * 99999999999)).padStart(12, '0'),
        bundesland,
        kreisCode: `${bundesland}${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
        gemeinde: cities[Math.floor(Math.random() * cities.length)],
        gender,
        age,
        householdSize: Math.floor(Math.random() * (data.directCohorts.householdSize[1] - data.directCohorts.householdSize[0])) + data.directCohorts.householdSize[0],
        occupation: occupations[Math.floor(Math.random() * occupations.length)],
        educationLevel: educationLevels[Math.floor(Math.random() * educationLevels.length)],
        migrationBackground: Math.random() < 0.15 // ~15% have migration background
      } as SynthiePopData);
    }

    onUpdate({ 
      populationData: mockData,
      refinedPopulation: mockData
    });

    // Add initial system message
    setChatMessages([{
      id: 'system-1',
      type: 'system',
      content: `Loaded ${targetPopulation.toLocaleString()} SynthiePop records based on your cohort definition. You can now refine this population using natural language commands.`,
      timestamp: new Date(),
      populationCount: targetPopulation
    }]);
  };

  // Calculate population statistics
  const populationStats = useMemo((): StatsSummary => {
    const population = data.refinedPopulation;
    if (population.length === 0) {
      return {
        totalPopulation: 0,
        ageStats: { min: 0, max: 0, median: 0, mean: 0 },
        genderDistribution: {},
        bundeslandDistribution: {},
        occupationDistribution: {},
        householdSizeStats: { min: 0, max: 0, median: 0, mean: 0 },
        educationDistribution: {},
        migrationBackgroundCount: 0
      };
    }

    const ages = population.map(p => p.age).sort((a, b) => a - b);
    const householdSizes = population.map(p => p.householdSize).sort((a, b) => a - b);
    
    return {
      totalPopulation: population.length,
      ageStats: {
        min: ages[0],
        max: ages[ages.length - 1],
        median: ages[Math.floor(ages.length / 2)],
        mean: Math.round(ages.reduce((a, b) => a + b, 0) / ages.length)
      },
      genderDistribution: population.reduce((acc, p) => {
        acc[p.gender] = (acc[p.gender] || 0) + 1;
        return acc;
      }, {} as Record<number, number>),
      bundeslandDistribution: population.reduce((acc, p) => {
        acc[p.bundesland] = (acc[p.bundesland] || 0) + 1;
        return acc;
      }, {} as Record<number, number>),
      occupationDistribution: population.reduce((acc, p) => {
        acc[p.occupation] = (acc[p.occupation] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      householdSizeStats: {
        min: householdSizes[0],
        max: householdSizes[householdSizes.length - 1],
        median: householdSizes[Math.floor(householdSizes.length / 2)],
        mean: Math.round(householdSizes.reduce((a, b) => a + b, 0) / householdSizes.length)
      },
      educationDistribution: population.reduce((acc, p) => {
        if (p.educationLevel) {
          acc[p.educationLevel] = (acc[p.educationLevel] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>),
      migrationBackgroundCount: population.filter(p => p.migrationBackground).length
    };
  }, [data.refinedPopulation]);

  // Filter and sort population data for table
  const filteredData = useMemo(() => {
    let filtered = data.refinedPopulation;

    if (searchTerm) {
      filtered = filtered.filter(person =>
        person.gemeinde.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.occupation.includes(searchTerm) ||
        person.educationLevel?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort data
    filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const modifier = sortDirection === 'asc' ? 1 : -1;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * modifier;
      }
      return ((aVal as number) - (bVal as number)) * modifier;
    });

    return filtered;
  }, [data.refinedPopulation, searchTerm, sortField, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Handle chat message processing
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock AI response with population filtering
    const response = processNaturalLanguageQuery(inputMessage);
    
    setChatMessages(prev => [...prev, response]);
    setIsProcessing(false);
  };

  const processNaturalLanguageQuery = (query: string): ChatMessage => {
    const lowerQuery = query.toLowerCase();
    let newFilters: PopulationFilters = { ...data.populationFilters };
    let responseText = '';
    let newPopulation = [...data.populationData];

    // Age filtering
    if (lowerQuery.includes('age') || lowerQuery.includes('years old')) {
      const ageMatch = lowerQuery.match(/(\d+)[\s-]*(?:to|and|-)[\s-]*(\d+)/);
      if (ageMatch) {
        newFilters.ageMin = parseInt(ageMatch[1]);
        newFilters.ageMax = parseInt(ageMatch[2]);
        responseText += `Filtered to ages ${ageMatch[1]}-${ageMatch[2]}. `;
      } else if (lowerQuery.includes('under') || lowerQuery.includes('below')) {
        const ageMatch = lowerQuery.match(/(?:under|below)\s*(\d+)/);
        if (ageMatch) {
          newFilters.ageMax = parseInt(ageMatch[1]);
          responseText += `Filtered to under ${ageMatch[1]} years old. `;
        }
      } else if (lowerQuery.includes('over') || lowerQuery.includes('above')) {
        const ageMatch = lowerQuery.match(/(?:over|above)\s*(\d+)/);
        if (ageMatch) {
          newFilters.ageMin = parseInt(ageMatch[1]);
          responseText += `Filtered to over ${ageMatch[1]} years old. `;
        }
      }
    }

    // Gender filtering
    if (lowerQuery.includes('female') || lowerQuery.includes('women')) {
      newFilters.genderFilter = [2];
      responseText += 'Filtered to females only. ';
    } else if (lowerQuery.includes('male') || lowerQuery.includes('men')) {
      newFilters.genderFilter = [1];
      responseText += 'Filtered to males only. ';
    }

    // Household size filtering
    if (lowerQuery.includes('household') || lowerQuery.includes('family size')) {
      const sizeMatch = lowerQuery.match(/(\d+)[\s-]*(?:to|and|-)[\s-]*(\d+)/);
      if (sizeMatch) {
        newFilters.householdSizeMin = parseInt(sizeMatch[1]);
        newFilters.householdSizeMax = parseInt(sizeMatch[2]);
        responseText += `Filtered to household size ${sizeMatch[1]}-${sizeMatch[2]}. `;
      }
    }

    // Education filtering
    if (lowerQuery.includes('university') || lowerQuery.includes('university degree')) {
      newFilters.educationFilter = ['Universität'];
      responseText += 'Filtered to university graduates. ';
    } else if (lowerQuery.includes('high school') || lowerQuery.includes('gymnasium')) {
      newFilters.educationFilter = ['Gymnasium'];
      responseText += 'Filtered to high school graduates. ';
    }

    // Geographic filtering - check for state names
    const stateMatches = Object.entries(bundeslandNames).find(([code, name]) => 
      lowerQuery.includes(name.toLowerCase()) || 
      lowerQuery.includes('bayern') && name === 'Bayern' ||
      lowerQuery.includes('bavaria') && name === 'Bayern' ||
      lowerQuery.includes('nrw') && name === 'Nordrhein-Westfalen'
    );
    
    if (stateMatches) {
      newFilters.bundeslandFilter = [parseInt(stateMatches[0])];
      responseText += `Filtered to ${stateMatches[1]}. `;
    }

    // Remove filters
    if (lowerQuery.includes('remove') || lowerQuery.includes('clear') || lowerQuery.includes('reset')) {
      newFilters = {};
      newPopulation = [...data.populationData];
      responseText = 'All filters removed. Population reset to original cohort. ';
    }

    // Apply filters if any were set
    if (Object.keys(newFilters).length > 0 && !lowerQuery.includes('remove')) {
      newPopulation = data.populationData.filter(person => {
        if (newFilters.ageMin && person.age < newFilters.ageMin) return false;
        if (newFilters.ageMax && person.age > newFilters.ageMax) return false;
        if (newFilters.genderFilter && !newFilters.genderFilter.includes(person.gender)) return false;
        if (newFilters.householdSizeMin && person.householdSize < newFilters.householdSizeMin) return false;
        if (newFilters.householdSizeMax && person.householdSize > newFilters.householdSizeMax) return false;
        if (newFilters.educationFilter && person.educationLevel && !newFilters.educationFilter.includes(person.educationLevel)) return false;
        if (newFilters.bundeslandFilter && !newFilters.bundeslandFilter.includes(person.bundesland)) return false;
        return true;
      });
    }

    // Update data
    onUpdate({
      populationFilters: newFilters,
      refinedPopulation: newPopulation
    });

    if (!responseText) {
      responseText = "I understand your request, but couldn't identify specific filters to apply. Try commands like 'show only females aged 25-35' or 'filter to university graduates' or 'show only people from Bayern'.";
    } else {
      responseText += `New population size: ${newPopulation.length.toLocaleString()} people.`;
    }

    return {
      id: `assistant-${Date.now()}`,
      type: 'assistant',
      content: responseText,
      timestamp: new Date(),
      filters: newFilters,
      populationCount: newPopulation.length
    };
  };

  const handleSort = (field: keyof SynthiePopData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const genderLabel = (gender: number) => gender === 1 ? 'Male' : 'Female';

  const proceedToStrategyGeneration = async () => {
    // Update the direct cohorts with refined population data
    onUpdate({
      directCohorts: {
        ...data.directCohorts,
        population: data.refinedPopulation.length
      }
    });
    
    // Advance to Strategy Generator step
    onNext();
    
    // Small delay to allow the step transition, then trigger strategy generation
    setTimeout(() => {
      // This will trigger the strategy generation automatically in the Strategy Generator component
      // We'll pass a flag to indicate auto-generation should start
      onUpdate({
        strategies: [], // Reset strategies to trigger auto-generation
        shouldAutoGenerateStrategies: true
      });
    }, 100);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2>Audience Refinement</h2>
        <p className="text-muted-foreground mt-2">
          Combine <strong>SynthiePop's individual-level data</strong> with <strong>Statista's market intelligence</strong> to identify high-value segments, detect spending opportunities, and optimize campaign efficiency through AI-powered analysis.
        </p>
      </div>

      {/* Market Intelligence Integration Alert */}
      <Alert className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-blue-50">
        <TrendingUp className="h-4 w-4 text-emerald-600" />
        <AlertDescription className="text-gray-800">
          <strong>Smart Opportunity Detection:</strong> As you refine your SynthiePop audience, our AI continuously cross-references with Statista's {data.category || 'category'} penetration rates to surface underserved segments where your competition is weak but population density is high – perfect for budget reallocation.
        </AlertDescription>
      </Alert>

      {/* Population Overview with Market Intelligence */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-blue-600" />
              <span>Population vs Market Intelligence</span>
            </div>
            <Badge className="bg-blue-100 text-blue-800">
              {populationStats.totalPopulation.toLocaleString()} people
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-medium text-blue-600">
                  {populationStats.ageStats.mean}
                </div>
                <div className="text-sm text-muted-foreground">Avg Age</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-medium">
                  {Math.round((populationStats.genderDistribution[2] || 0) / populationStats.totalPopulation * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Female</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-medium">
                  {populationStats.householdSizeStats.mean}
                </div>
                <div className="text-sm text-muted-foreground">Avg Household</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-medium">
                  {Math.round(populationStats.migrationBackgroundCount / populationStats.totalPopulation * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Migration Bkg</div>
              </div>
            </div>
            
            {/* Market Opportunity Indicators */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-100 p-3 rounded-lg">
                  <div className="text-lg font-semibold text-green-700">
                    {Math.floor(populationStats.totalPopulation * 0.18).toLocaleString()}
                  </div>
                  <div className="text-xs text-green-600">Current {data.category || 'Category'} Users</div>
                  <div className="text-xs text-muted-foreground">Statista CI Data</div>
                </div>
                <div className="bg-amber-100 p-3 rounded-lg">
                  <div className="text-lg font-semibold text-amber-700">
                    {Math.floor(populationStats.totalPopulation * 0.82).toLocaleString()}
                  </div>
                  <div className="text-xs text-amber-600">Untapped Population</div>
                  <div className="text-xs text-muted-foreground">Growth Opportunity</div>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <div className="text-lg font-semibold text-blue-700">€{Math.floor(data.budget * 0.82 / 1000)}k</div>
                  <div className="text-xs text-blue-600">Recommended Allocation</div>
                  <div className="text-xs text-muted-foreground">For Opportunity Segments</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="table" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="table">Population Data</TabsTrigger>
          <TabsTrigger value="statistics">Statistics & Analysis</TabsTrigger>
          <TabsTrigger value="chat">AI Refinement Chat</TabsTrigger>
        </TabsList>

        {/* Population Data Table */}
        <TabsContent value="table" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>SynthiePop Population Records</span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Search by city, occupation, education..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  <Button variant="outline" size="icon">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length.toLocaleString()} records
                  </span>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[400px] w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('age')}
                        >
                          Age {sortField === 'age' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('gender')}
                        >
                          Gender {sortField === 'gender' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('gemeinde')}
                        >
                          City {sortField === 'gemeinde' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('householdSize')}
                        >
                          Household {sortField === 'householdSize' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('occupation')}
                        >
                          Occupation {sortField === 'occupation' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('educationLevel')}
                        >
                          Education {sortField === 'educationLevel' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead>Migration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((person) => (
                        <TableRow key={person.ids}>
                          <TableCell>{person.age}</TableCell>
                          <TableCell>{genderLabel(person.gender)}</TableCell>
                          <TableCell>{person.gemeinde}</TableCell>
                          <TableCell>{person.householdSize}</TableCell>
                          <TableCell className="font-mono text-xs">{person.occupation}</TableCell>
                          <TableCell>{person.educationLevel || 'N/A'}</TableCell>
                          <TableCell>
                            {person.migrationBackground ? (
                              <Badge variant="outline" className="text-xs">Yes</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">No</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Panel */}
        <TabsContent value="statistics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Age Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Range</div>
                      <div className="font-medium">
                        {populationStats.ageStats.min} - {populationStats.ageStats.max} years
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Median</div>
                      <div className="font-medium">{populationStats.ageStats.median} years</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Distribution</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>18-30</span>
                        <span>{Math.round(data.refinedPopulation.filter(p => p.age >= 18 && p.age <= 30).length / populationStats.totalPopulation * 100)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>31-45</span>
                        <span>{Math.round(data.refinedPopulation.filter(p => p.age >= 31 && p.age <= 45).length / populationStats.totalPopulation * 100)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>46-65</span>
                        <span>{Math.round(data.refinedPopulation.filter(p => p.age >= 46 && p.age <= 65).length / populationStats.totalPopulation * 100)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>65+</span>
                        <span>{Math.round(data.refinedPopulation.filter(p => p.age > 65).length / populationStats.totalPopulation * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>Geographic Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(populationStats.bundeslandDistribution)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([code, count]) => (
                      <div key={code} className="flex justify-between text-sm">
                        <span>{bundeslandNames[Number(code)] || `State ${code}`}</span>
                        <span>{Math.round(count / populationStats.totalPopulation * 100)}%</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Chat Tab */}
        <TabsContent value="chat" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>AI Population Refinement Chat</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-64 border border-border rounded-lg p-4 overflow-y-auto bg-muted/10">
                  {chatMessages.map((message) => (
                    <div key={message.id} className={`mb-3 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className={`inline-block p-3 rounded-lg max-w-[80%] ${
                        message.type === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : message.type === 'system'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-muted text-foreground'
                      }`}>
                        <div className="text-sm">{message.content}</div>
                        {message.populationCount && (
                          <div className="text-xs mt-1 opacity-75">
                            Population: {message.populationCount.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="text-left">
                      <div className="inline-block p-3 rounded-lg bg-muted text-foreground">
                        <div className="flex items-center space-x-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Processing your request...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <Textarea
                    placeholder="Try: 'Show only females aged 25-35' or 'Filter to university graduates in Bayern'"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                    className="flex-1"
                    rows={2}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={isProcessing || !inputMessage.trim()}
                    size="icon"
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <strong>Available commands:</strong> age ranges (18-30), gender (male/female), education (university, gymnasium), 
                  location (state names), household size, occupation filters, or 'clear filters' to reset.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous: Cohort Builder
        </Button>
        <Button onClick={proceedToStrategyGeneration} className="min-w-32">
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Strategies
        </Button>
      </div>
    </div>
  );
}