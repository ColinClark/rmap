import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { 
  ChevronRight, 
  Building2, 
  Package, 
  Plus, 
  Search, 
  Upload, 
  FileText, 
  Image, 
  Video, 
  Download,
  ExternalLink,
  Calendar,
  DollarSign,
  Users,
  Globe,
  Target,
  BarChart3,
  TrendingUp,
  Clock,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  Info,
  Star,
  Edit,
  Trash2
} from 'lucide-react';
import { CampaignData, Brand, Product, BrandAsset, StatistaStudyRequest, ProductFeature } from '../App';

interface BrandProductSelectionProps {
  data: CampaignData;
  onUpdate: (updates: Partial<CampaignData>) => void;
  onNext: () => void;
}

const brandCategories = [
  'FMCG', 'Technology', 'Automotive', 'Fashion & Apparel', 'Beauty & Personal Care',
  'Food & Beverage', 'Healthcare & Pharmaceuticals', 'Financial Services', 'Retail',
  'Travel & Hospitality', 'Media & Entertainment', 'Sports & Recreation', 'Other'
];

const productCategories = [
  'Consumer Electronics', 'Food & Beverages', 'Clothing & Accessories', 'Home & Garden',
  'Health & Beauty', 'Sports & Outdoors', 'Books & Media', 'Toys & Games',
  'Automotive Parts', 'Office Supplies', 'Pet Supplies', 'Other'
];

const studyTypes = [
  { value: 'consumer-insights', label: 'Consumer Insights', description: 'Deep dive into consumer behavior and preferences' },
  { value: 'market-research', label: 'Market Research', description: 'Market size, trends, and competitive landscape' },
  { value: 'brand-tracking', label: 'Brand Tracking', description: 'Brand awareness, perception, and health metrics' },
  { value: 'usage-attitudes', label: 'Usage & Attitudes', description: 'How consumers use and perceive your category' }
];

const methodologies = [
  { value: 'online-survey', label: 'Online Survey', description: 'Quantitative research via online questionnaire' },
  { value: 'focus-groups', label: 'Focus Groups', description: 'Qualitative insights from moderated discussions' },
  { value: 'interviews', label: 'In-Depth Interviews', description: 'One-on-one qualitative conversations' },
  { value: 'mixed-methods', label: 'Mixed Methods', description: 'Combination of quantitative and qualitative approaches' }
];

export function BrandProductSelection({ data, onUpdate, onNext }: BrandProductSelectionProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('brand-selection');
  const [showBrandDialog, setShowBrandDialog] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showStatistaDialog, setShowStatistaDialog] = useState(false);
  const [newBrand, setNewBrand] = useState<Partial<Brand>>({
    name: '',
    description: '',
    category: '',
    targetMarkets: [],
    brandValues: [],
    assets: []
  });
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    description: '',
    category: '',
    features: [],
    targetDemographics: {},
    assets: []
  });
  const [newStudyRequest, setNewStudyRequest] = useState<Partial<StatistaStudyRequest>>({
    studyType: 'consumer-insights',
    methodology: 'online-survey',
    targetDemographics: {
      countries: ['Germany'],
      ageRange: [18, 65],
      sampleSize: 1000
    },
    researchQuestions: [],
    timeline: {
      requestDate: new Date(),
      expectedDelivery: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      urgencyLevel: 'standard'
    },
    budget: {
      currency: 'EUR',
      amount: 15000,
      approved: false
    },
    status: 'draft'
  });

  // Load mock brands and products
  useEffect(() => {
    loadMockData();
  }, []);

  const loadMockData = () => {
    const mockBrands: Brand[] = [
      {
        id: 'brand-1',
        name: 'TechFlow',
        description: 'Leading European technology brand specializing in smart home solutions',
        category: 'Technology',
        parentCompany: 'TechFlow Group',
        website: 'https://techflow.com',
        founded: 2015,
        headquarters: 'Berlin, Germany',
        targetMarkets: ['Germany', 'Austria', 'Switzerland', 'Netherlands'],
        brandValues: ['Innovation', 'Sustainability', 'User-Centric Design', 'Quality'],
        assets: [
          {
            id: 'asset-1',
            name: 'TechFlow Logo - Primary',
            type: 'logo',
            url: '/assets/techflow-logo.svg',
            description: 'Primary brand logo in SVG format',
            uploadDate: new Date('2024-01-15'),
            size: 45678,
            format: 'svg'
          },
          {
            id: 'asset-2',
            name: 'Brand Guidelines 2024',
            type: 'guideline',
            url: '/assets/techflow-guidelines.pdf',
            description: 'Complete brand guidelines and usage instructions',
            uploadDate: new Date('2024-01-20'),
            size: 2345678,
            format: 'pdf'
          }
        ],
        createdDate: new Date('2024-01-10'),
        lastModified: new Date('2024-01-20')
      },
      {
        id: 'brand-2',
        name: 'NaturePure',
        description: 'Organic beauty and personal care brand focused on sustainable ingredients',
        category: 'Beauty & Personal Care',
        website: 'https://naturepure.de',
        founded: 2018,
        headquarters: 'Munich, Germany',
        targetMarkets: ['Germany', 'Austria', 'France', 'Italy'],
        brandValues: ['Natural', 'Sustainable', 'Ethical', 'Effective'],
        assets: [
          {
            id: 'asset-3',
            name: 'NaturePure Logo Set',
            type: 'logo',
            url: '/assets/naturepure-logos.zip',
            description: 'Complete logo set including variations',
            uploadDate: new Date('2024-02-01'),
            size: 156789,
            format: 'zip'
          }
        ],
        createdDate: new Date('2024-01-25'),
        lastModified: new Date('2024-02-01')
      },
      {
        id: 'brand-3',
        name: 'GermanCraft',
        description: 'Premium automotive accessories manufacturer with 50+ years of heritage',
        category: 'Automotive',
        parentCompany: 'GermanCraft Industries',
        website: 'https://germancraft.com',
        founded: 1970,
        headquarters: 'Stuttgart, Germany',
        targetMarkets: ['Germany', 'Europe', 'North America'],
        brandValues: ['Precision', 'Heritage', 'Performance', 'Reliability'],
        assets: [],
        createdDate: new Date('2024-01-05'),
        lastModified: new Date('2024-01-15')
      }
    ];

    const mockProducts: Product[] = [
      {
        id: 'product-1',
        brandId: 'brand-1',
        name: 'SmartHome Hub Pro',
        description: 'Advanced smart home control system with AI-powered automation',
        category: 'Consumer Electronics',
        subCategory: 'Smart Home',
        sku: 'TF-SHH-PRO-001',
        price: {
          currency: 'EUR',
          amount: 299.99,
          msrp: 349.99
        },
        launchDate: new Date('2024-03-15'),
        availableMarkets: ['Germany', 'Austria', 'Switzerland'],
        targetDemographics: {
          ageRange: [25, 55],
          genderTarget: 'unisex',
          incomeLevel: 'middle-to-high',
          lifestyle: ['tech-savvy', 'early-adopter', 'home-owner']
        },
        features: [
          { name: 'Voice Control', description: 'Works with Alexa, Google Assistant, and Siri', highlight: true },
          { name: 'AI Learning', description: 'Learns your habits and automates routines', highlight: true },
          { name: 'Energy Monitoring', description: 'Track and optimize home energy usage', highlight: false },
          { name: '50+ Device Support', description: 'Compatible with major smart home brands', highlight: true }
        ],
        competitorProducts: ['Philips Hue Bridge', 'Samsung SmartThings', 'Apple HomeKit'],
        seasonality: 'year-round',
        distributionChannels: ['Online Direct', 'Electronics Retailers', 'Amazon', 'MediaMarkt'],
        assets: [
          {
            id: 'asset-4',
            name: 'SmartHome Hub Pro - Product Images',
            type: 'image',
            url: '/assets/smarthome-hub-images.zip',
            description: 'High-resolution product photography set',
            uploadDate: new Date('2024-02-20'),
            size: 15234567,
            format: 'zip'
          }
        ],
        createdDate: new Date('2024-02-01'),
        lastModified: new Date('2024-02-20')
      },
      {
        id: 'product-2',
        brandId: 'brand-2',
        name: 'Botanical Face Serum',
        description: 'Intensive anti-aging serum with organic botanical extracts',
        category: 'Health & Beauty',
        subCategory: 'Skincare',
        sku: 'NP-BFS-030',
        price: {
          currency: 'EUR',
          amount: 89.99,
          msrp: 99.99
        },
        launchDate: new Date('2024-01-10'),
        availableMarkets: ['Germany', 'Austria', 'France'],
        targetDemographics: {
          ageRange: [30, 60],
          genderTarget: 'female',
          incomeLevel: 'middle-to-high',
          lifestyle: ['health-conscious', 'premium-beauty', 'eco-friendly']
        },
        features: [
          { name: '99% Natural Ingredients', description: 'Certified organic botanical extracts', highlight: true },
          { name: 'Clinically Tested', description: 'Proven results in 4-week clinical study', highlight: true },
          { name: 'Sustainable Packaging', description: 'Recyclable glass bottle with bamboo cap', highlight: false },
          { name: 'Cruelty-Free', description: 'Never tested on animals, certified by PETA', highlight: false }
        ],
        competitorProducts: ['The Ordinary Hyaluronic Acid', 'Drunk Elephant C-Firma', 'Paula\'s Choice Vitamin C'],
        seasonality: 'year-round',
        distributionChannels: ['Online Direct', 'Sephora', 'Douglas', 'Organic Beauty Stores'],
        assets: [],
        createdDate: new Date('2024-01-05'),
        lastModified: new Date('2024-01-10')
      }
    ];

    setBrands(mockBrands);
    setProducts(mockProducts);
  };

  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    brand.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    brand.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = products.filter(product => {
    if (!data.selectedBrand) return product;
    return product.brandId === data.selectedBrand.id &&
      (product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
       product.description?.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const handleBrandSelect = (brand: Brand) => {
    onUpdate({ 
      selectedBrand: brand,
      selectedProduct: undefined // Reset product selection when brand changes
    });
  };

  const handleProductSelect = (product: Product) => {
    onUpdate({ selectedProduct: product });
  };

  const handleCreateBrand = () => {
    if (!newBrand.name || !newBrand.category) return;

    const brand: Brand = {
      id: `brand-${Date.now()}`,
      name: newBrand.name,
      description: newBrand.description || '',
      category: newBrand.category,
      parentCompany: newBrand.parentCompany,
      website: newBrand.website,
      founded: newBrand.founded,
      headquarters: newBrand.headquarters,
      brandGuidelines: newBrand.brandGuidelines,
      targetMarkets: newBrand.targetMarkets || [],
      brandValues: newBrand.brandValues || [],
      assets: newBrand.assets || [],
      createdDate: new Date(),
      lastModified: new Date()
    };

    setBrands(prev => [...prev, brand]);
    handleBrandSelect(brand);
    setShowBrandDialog(false);
    setNewBrand({
      name: '',
      description: '',
      category: '',
      targetMarkets: [],
      brandValues: [],
      assets: []
    });
  };

  const handleCreateProduct = () => {
    if (!newProduct.name || !newProduct.category || !data.selectedBrand) return;

    const product: Product = {
      id: `product-${Date.now()}`,
      brandId: data.selectedBrand.id,
      name: newProduct.name,
      description: newProduct.description || '',
      category: newProduct.category,
      subCategory: newProduct.subCategory,
      sku: newProduct.sku,
      price: newProduct.price,
      launchDate: newProduct.launchDate,
      availableMarkets: newProduct.availableMarkets || [],
      targetDemographics: newProduct.targetDemographics || {},
      features: newProduct.features || [],
      competitorProducts: newProduct.competitorProducts || [],
      seasonality: newProduct.seasonality || 'year-round',
      distributionChannels: newProduct.distributionChannels || [],
      assets: newProduct.assets || [],
      createdDate: new Date(),
      lastModified: new Date()
    };

    setProducts(prev => [...prev, product]);
    handleProductSelect(product);
    setShowProductDialog(false);
    setNewProduct({
      name: '',
      description: '',
      category: '',
      features: [],
      targetDemographics: {},
      assets: []
    });
  };

  const handleCreateStatistaStudy = () => {
    if (!data.selectedBrand || !newStudyRequest.studyType) return;

    const studyRequest: StatistaStudyRequest = {
      id: `study-${Date.now()}`,
      brandId: data.selectedBrand.id,
      productId: data.selectedProduct?.id,
      studyType: newStudyRequest.studyType as any,
      targetDemographics: newStudyRequest.targetDemographics as any,
      researchQuestions: newStudyRequest.researchQuestions || [],
      methodology: newStudyRequest.methodology as any,
      timeline: newStudyRequest.timeline as any,
      budget: newStudyRequest.budget as any,
      status: 'draft',
      contactInfo: newStudyRequest.contactInfo as any,
      customRequirements: newStudyRequest.customRequirements
    };

    onUpdate({
      statistaStudies: [...data.statistaStudies, studyRequest]
    });

    setShowStatistaDialog(false);
    setNewStudyRequest({
      studyType: 'consumer-insights',
      methodology: 'online-survey',
      targetDemographics: {
        countries: ['Germany'],
        ageRange: [18, 65],
        sampleSize: 1000
      },
      researchQuestions: [],
      timeline: {
        requestDate: new Date(),
        expectedDelivery: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        urgencyLevel: 'standard'
      },
      budget: {
        currency: 'EUR',
        amount: 15000,
        approved: false
      },
      status: 'draft'
    });
  };

  const addBrandValue = (value: string) => {
    if (value.trim() && !newBrand.brandValues?.includes(value.trim())) {
      setNewBrand(prev => ({
        ...prev,
        brandValues: [...(prev.brandValues || []), value.trim()]
      }));
    }
  };

  const addProductFeature = (name: string, description: string) => {
    if (name.trim() && description.trim()) {
      const feature: ProductFeature = {
        name: name.trim(),
        description: description.trim(),
        highlight: false
      };
      setNewProduct(prev => ({
        ...prev,
        features: [...(prev.features || []), feature]
      }));
    }
  };

  const addResearchQuestion = (question: string) => {
    if (question.trim() && !newStudyRequest.researchQuestions?.includes(question.trim())) {
      setNewStudyRequest(prev => ({
        ...prev,
        researchQuestions: [...(prev.researchQuestions || []), question.trim()]
      }));
    }
  };

  const canProceed = data.selectedBrand && data.selectedProduct;

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'logo': return Building2;
      case 'image': return Image;
      case 'video': return Video;
      case 'document': return FileText;
      case 'guideline': return FileText;
      default: return FileText;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2>Brand & Product Selection</h2>
        <p className="text-muted-foreground mt-2">
          Select or create a brand and product for your retail-media campaign. Optionally commission Statista consumer insights research.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="brand-selection">Brand Selection</TabsTrigger>
          <TabsTrigger value="product-selection" disabled={!data.selectedBrand}>
            Product Selection
          </TabsTrigger>
          <TabsTrigger value="statista-research" disabled={!data.selectedBrand}>
            Statista Research
          </TabsTrigger>
          <TabsTrigger value="project-materials">Project Materials</TabsTrigger>
        </TabsList>

        {/* Brand Selection */}
        <TabsContent value="brand-selection" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>Select Brand</span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Search brands..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  <Dialog open={showBrandDialog} onOpenChange={setShowBrandDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        New Brand
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Create New Brand</DialogTitle>
                        <DialogDescription>
                          Add a new brand to your portfolio with complete brand information and assets.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="brand-name">Brand Name*</Label>
                            <Input
                              id="brand-name"
                              value={newBrand.name}
                              onChange={(e) => setNewBrand(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Enter brand name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="brand-category">Category*</Label>
                            <Select
                              value={newBrand.category}
                              onValueChange={(value) => setNewBrand(prev => ({ ...prev, category: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {brandCategories.map(category => (
                                  <SelectItem key={category} value={category}>{category}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="brand-description">Description</Label>
                          <Textarea
                            id="brand-description"
                            value={newBrand.description}
                            onChange={(e) => setNewBrand(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Brief description of the brand"
                            rows={3}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="parent-company">Parent Company</Label>
                            <Input
                              id="parent-company"
                              value={newBrand.parentCompany || ''}
                              onChange={(e) => setNewBrand(prev => ({ ...prev, parentCompany: e.target.value }))}
                              placeholder="Parent company name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="website">Website</Label>
                            <Input
                              id="website"
                              value={newBrand.website || ''}
                              onChange={(e) => setNewBrand(prev => ({ ...prev, website: e.target.value }))}
                              placeholder="https://brand.com"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="founded">Founded Year</Label>
                            <Input
                              id="founded"
                              type="number"
                              value={newBrand.founded || ''}
                              onChange={(e) => setNewBrand(prev => ({ ...prev, founded: parseInt(e.target.value) }))}
                              placeholder="2020"
                            />
                          </div>
                          <div>
                            <Label htmlFor="headquarters">Headquarters</Label>
                            <Input
                              id="headquarters"
                              value={newBrand.headquarters || ''}
                              onChange={(e) => setNewBrand(prev => ({ ...prev, headquarters: e.target.value }))}
                              placeholder="Berlin, Germany"
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Brand Values</Label>
                          <div className="flex flex-wrap gap-2 mt-2 mb-2">
                            {newBrand.brandValues?.map((value, index) => (
                              <Badge key={index} variant="secondary">
                                {value}
                                <button
                                  onClick={() => setNewBrand(prev => ({
                                    ...prev,
                                    brandValues: prev.brandValues?.filter((_, i) => i !== index)
                                  }))}
                                  className="ml-2 text-muted-foreground hover:text-foreground"
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                          <div className="flex space-x-2">
                            <Input
                              placeholder="Add brand value (e.g., Innovation)"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  addBrandValue(e.currentTarget.value);
                                  e.currentTarget.value = '';
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                const input = e.currentTarget.parentNode?.querySelector('input') as HTMLInputElement;
                                if (input) {
                                  addBrandValue(input.value);
                                  input.value = '';
                                }
                              }}
                            >
                              Add
                            </Button>
                          </div>
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setShowBrandDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreateBrand} disabled={!newBrand.name || !newBrand.category}>
                            Create Brand
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBrands.map((brand) => (
                  <Card
                    key={brand.id}
                    className={`cursor-pointer transition-colors ${
                      data.selectedBrand?.id === brand.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => handleBrandSelect(brand)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{brand.name}</h4>
                            <Badge variant="secondary" className="text-xs mt-1">
                              {brand.category}
                            </Badge>
                          </div>
                          {data.selectedBrand?.id === brand.id && (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        
                        {brand.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {brand.description}
                          </p>
                        )}
                        
                        <div className="space-y-2">
                          {brand.targetMarkets.length > 0 && (
                            <div className="flex items-center space-x-2">
                              <Globe className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {brand.targetMarkets.slice(0, 2).join(', ')}
                                {brand.targetMarkets.length > 2 && ` +${brand.targetMarkets.length - 2}`}
                              </span>
                            </div>
                          )}
                          
                          {brand.founded && (
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Founded {brand.founded}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-2">
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {brand.assets.length} asset{brand.assets.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {filteredBrands.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No brands found matching your search.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {data.selectedBrand && (
            <Card>
              <CardHeader>
                <CardTitle>Selected Brand Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Brand</div>
                      <div className="font-medium">{data.selectedBrand.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Category</div>
                      <div className="font-medium">{data.selectedBrand.category}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Markets</div>
                      <div className="font-medium">{data.selectedBrand.targetMarkets.length} markets</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Assets</div>
                      <div className="font-medium">{data.selectedBrand.assets.length} files</div>
                    </div>
                  </div>
                  
                  {data.selectedBrand.brandValues.length > 0 && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Brand Values</div>
                      <div className="flex flex-wrap gap-2">
                        {data.selectedBrand.brandValues.map((value, index) => (
                          <Badge key={index} variant="outline">{value}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Product Selection */}
        <TabsContent value="product-selection" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Select Product</span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
                    <DialogTrigger asChild>
                      <Button disabled={!data.selectedBrand}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Product
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Create New Product</DialogTitle>
                        <DialogDescription>
                          Add a new product for {data.selectedBrand?.name}.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="product-name">Product Name*</Label>
                            <Input
                              id="product-name"
                              value={newProduct.name}
                              onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Enter product name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="product-category">Category*</Label>
                            <Select
                              value={newProduct.category}
                              onValueChange={(value) => setNewProduct(prev => ({ ...prev, category: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {productCategories.map(category => (
                                  <SelectItem key={category} value={category}>{category}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="product-description">Description</Label>
                          <Textarea
                            id="product-description"
                            value={newProduct.description}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Product description"
                            rows={3}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="product-sku">SKU</Label>
                            <Input
                              id="product-sku"
                              value={newProduct.sku || ''}
                              onChange={(e) => setNewProduct(prev => ({ ...prev, sku: e.target.value }))}
                              placeholder="Product SKU"
                            />
                          </div>
                          <div>
                            <Label htmlFor="product-price">Price (EUR)</Label>
                            <Input
                              id="product-price"
                              type="number"
                              step="0.01"
                              value={newProduct.price?.amount || ''}
                              onChange={(e) => setNewProduct(prev => ({
                                ...prev,
                                price: {
                                  currency: 'EUR',
                                  amount: parseFloat(e.target.value) || 0,
                                  msrp: prev.price?.msrp
                                }
                              }))}
                              placeholder="99.99"
                            />
                          </div>
                          <div>
                            <Label htmlFor="product-msrp">MSRP (EUR)</Label>
                            <Input
                              id="product-msrp"
                              type="number"
                              step="0.01"
                              value={newProduct.price?.msrp || ''}
                              onChange={(e) => setNewProduct(prev => ({
                                ...prev,
                                price: {
                                  currency: 'EUR',
                                  amount: prev.price?.amount || 0,
                                  msrp: parseFloat(e.target.value) || undefined
                                }
                              }))}
                              placeholder="119.99"
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Key Features</Label>
                          <div className="space-y-2 mt-2 mb-2">
                            {newProduct.features?.map((feature, index) => (
                              <div key={index} className="flex items-center justify-between p-2 border rounded">
                                <div>
                                  <div className="font-medium">{feature.name}</div>
                                  <div className="text-sm text-muted-foreground">{feature.description}</div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setNewProduct(prev => ({
                                    ...prev,
                                    features: prev.features?.filter((_, i) => i !== index)
                                  }))}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Feature name"
                              id="feature-name"
                            />
                            <div className="flex space-x-2">
                              <Input
                                placeholder="Feature description"
                                id="feature-description"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const nameInput = document.getElementById('feature-name') as HTMLInputElement;
                                  const descInput = document.getElementById('feature-description') as HTMLInputElement;
                                  if (nameInput && descInput) {
                                    addProductFeature(nameInput.value, descInput.value);
                                    nameInput.value = '';
                                    descInput.value = '';
                                  }
                                }}
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setShowProductDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreateProduct} disabled={!newProduct.name || !newProduct.category}>
                            Create Product
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className={`cursor-pointer transition-colors ${
                      data.selectedProduct?.id === product.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => handleProductSelect(product)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{product.name}</h4>
                            <Badge variant="secondary" className="text-xs mt-1">
                              {product.category}
                            </Badge>
                          </div>
                          {data.selectedProduct?.id === product.id && (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        
                        {product.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {product.description}
                          </p>
                        )}
                        
                        <div className="space-y-2">
                          {product.price && (
                            <div className="flex items-center space-x-2">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                €{product.price.amount}
                                {product.price.msrp && product.price.msrp !== product.price.amount && (
                                  <span className="ml-1 line-through">€{product.price.msrp}</span>
                                )}
                              </span>
                            </div>
                          )}
                          
                          {product.targetDemographics.ageRange && (
                            <div className="flex items-center space-x-2">
                              <Target className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Ages {product.targetDemographics.ageRange[0]}-{product.targetDemographics.ageRange[1]}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-2">
                            <Star className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {product.features.length} feature{product.features.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {filteredProducts.length === 0 && data.selectedBrand && (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No products found for {data.selectedBrand.name}.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {data.selectedProduct && (
            <Card>
              <CardHeader>
                <CardTitle>Selected Product Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Product</div>
                      <div className="font-medium">{data.selectedProduct.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Category</div>
                      <div className="font-medium">{data.selectedProduct.category}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Price</div>
                      <div className="font-medium">
                        {data.selectedProduct.price 
                          ? `€${data.selectedProduct.price.amount}`
                          : 'N/A'
                        }
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Features</div>
                      <div className="font-medium">{data.selectedProduct.features.length}</div>
                    </div>
                  </div>
                  
                  {data.selectedProduct.features.length > 0 && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Key Features</div>
                      <div className="space-y-2">
                        {data.selectedProduct.features.slice(0, 3).map((feature, index) => (
                          <div key={index} className="flex items-start justify-between">
                            <div>
                              <div className="font-medium text-sm">{feature.name}</div>
                              <div className="text-xs text-muted-foreground">{feature.description}</div>
                            </div>
                            {feature.highlight && (
                              <Badge variant="outline" className="text-xs">Key Feature</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Statista Research */}
        <TabsContent value="statista-research" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Statista Consumer Insights</span>
                </CardTitle>
                <Dialog open={showStatistaDialog} onOpenChange={setShowStatistaDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Request Study
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Request Statista Consumer Insights Study</DialogTitle>
                      <DialogDescription>
                        Commission custom research for {data.selectedBrand?.name}
                        {data.selectedProduct && ` - ${data.selectedProduct.name}`}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="study-type">Study Type*</Label>
                          <Select
                            value={newStudyRequest.studyType}
                            onValueChange={(value) => setNewStudyRequest(prev => ({ ...prev, studyType: value as any }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {studyTypes.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  <div>
                                    <div>{type.label}</div>
                                    <div className="text-xs text-muted-foreground">{type.description}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="methodology">Methodology*</Label>
                          <Select
                            value={newStudyRequest.methodology}
                            onValueChange={(value) => setNewStudyRequest(prev => ({ ...prev, methodology: value as any }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {methodologies.map(method => (
                                <SelectItem key={method.value} value={method.value}>
                                  <div>
                                    <div>{method.label}</div>
                                    <div className="text-xs text-muted-foreground">{method.description}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="sample-size">Sample Size*</Label>
                          <Input
                            id="sample-size"
                            type="number"
                            value={newStudyRequest.targetDemographics?.sampleSize || 1000}
                            onChange={(e) => setNewStudyRequest(prev => ({
                              ...prev,
                              targetDemographics: {
                                ...prev.targetDemographics!,
                                sampleSize: parseInt(e.target.value) || 1000
                              }
                            }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="age-min">Min Age</Label>
                          <Input
                            id="age-min"
                            type="number"
                            value={newStudyRequest.targetDemographics?.ageRange[0] || 18}
                            onChange={(e) => setNewStudyRequest(prev => ({
                              ...prev,
                              targetDemographics: {
                                ...prev.targetDemographics!,
                                ageRange: [parseInt(e.target.value) || 18, prev.targetDemographics!.ageRange[1]]
                              }
                            }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="age-max">Max Age</Label>
                          <Input
                            id="age-max"
                            type="number"
                            value={newStudyRequest.targetDemographics?.ageRange[1] || 65}
                            onChange={(e) => setNewStudyRequest(prev => ({
                              ...prev,
                              targetDemographics: {
                                ...prev.targetDemographics!,
                                ageRange: [prev.targetDemographics!.ageRange[0], parseInt(e.target.value) || 65]
                              }
                            }))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="budget-amount">Budget (EUR)*</Label>
                          <Input
                            id="budget-amount"
                            type="number"
                            value={newStudyRequest.budget?.amount || 15000}
                            onChange={(e) => setNewStudyRequest(prev => ({
                              ...prev,
                              budget: {
                                currency: 'EUR',
                                amount: parseInt(e.target.value) || 15000,
                                approved: false
                              }
                            }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="urgency">Urgency Level</Label>
                          <Select
                            value={newStudyRequest.timeline?.urgencyLevel}
                            onValueChange={(value) => setNewStudyRequest(prev => ({
                              ...prev,
                              timeline: {
                                ...prev.timeline!,
                                urgencyLevel: value as any
                              }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="standard">Standard (4-6 weeks)</SelectItem>
                              <SelectItem value="expedited">Expedited (2-3 weeks)</SelectItem>
                              <SelectItem value="rush">Rush (1-2 weeks)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>Research Questions</Label>
                        <div className="space-y-2 mt-2 mb-2">
                          {newStudyRequest.researchQuestions?.map((question, index) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded">
                              <span className="text-sm">{question}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setNewStudyRequest(prev => ({
                                  ...prev,
                                  researchQuestions: prev.researchQuestions?.filter((_, i) => i !== index)
                                }))}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Add research question"
                            id="research-question"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addResearchQuestion(e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const input = document.getElementById('research-question') as HTMLInputElement;
                              if (input) {
                                addResearchQuestion(input.value);
                                input.value = '';
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="custom-requirements">Custom Requirements</Label>
                        <Textarea
                          id="custom-requirements"
                          value={newStudyRequest.customRequirements || ''}
                          onChange={(e) => setNewStudyRequest(prev => ({ 
                            ...prev, 
                            customRequirements: e.target.value 
                          }))}
                          placeholder="Any specific requirements or special considerations"
                          rows={3}
                        />
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowStatistaDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateStatistaStudy}>
                          Request Study
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {data.statistaStudies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No Statista studies requested yet.</p>
                  <p className="text-sm mt-2">Commission custom consumer insights research to enhance your campaign targeting.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.statistaStudies.map((study) => (
                    <Card key={study.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">
                                {studyTypes.find(t => t.value === study.studyType)?.label}
                              </h4>
                              <Badge variant={
                                study.status === 'completed' ? 'default' :
                                study.status === 'in-progress' ? 'secondary' :
                                study.status === 'submitted' ? 'outline' : 'secondary'
                              }>
                                {study.status}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground">Sample Size</div>
                                <div>{study.targetDemographics.sampleSize.toLocaleString()}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Age Range</div>
                                <div>{study.targetDemographics.ageRange[0]}-{study.targetDemographics.ageRange[1]}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Budget</div>
                                <div>€{study.budget.amount.toLocaleString()}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Delivery</div>
                                <div>{study.timeline.expectedDelivery.toLocaleDateString()}</div>
                              </div>
                            </div>
                            
                            {study.researchQuestions.length > 0 && (
                              <div>
                                <div className="text-sm text-muted-foreground mb-1">Research Questions</div>
                                <div className="text-sm">
                                  {study.researchQuestions.slice(0, 2).join(', ')}
                                  {study.researchQuestions.length > 2 && ` +${study.researchQuestions.length - 2} more`}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {study.status === 'completed' && (
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Download Report
                              </Button>
                            )}
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Project Materials */}
        <TabsContent value="project-materials" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Project Materials</span>
                </CardTitle>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Brand Assets */}
                {data.selectedBrand && data.selectedBrand.assets.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Brand Assets</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {data.selectedBrand.assets.map((asset) => {
                        const IconComponent = getAssetIcon(asset.type);
                        return (
                          <div key={asset.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                            <IconComponent className="h-8 w-8 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{asset.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {asset.format.toUpperCase()} • {(asset.size / 1024).toFixed(1)}KB
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Product Assets */}
                {data.selectedProduct && data.selectedProduct.assets.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Product Assets</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {data.selectedProduct.assets.map((asset) => {
                        const IconComponent = getAssetIcon(asset.type);
                        return (
                          <div key={asset.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                            <IconComponent className="h-8 w-8 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{asset.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {asset.format.toUpperCase()} • {(asset.size / 1024).toFixed(1)}KB
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Additional Project Materials */}
                {data.projectMaterials.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Additional Materials</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {data.projectMaterials.map((asset) => {
                        const IconComponent = getAssetIcon(asset.type);
                        return (
                          <div key={asset.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                            <IconComponent className="h-8 w-8 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{asset.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {asset.format.toUpperCase()} • {(asset.size / 1024).toFixed(1)}KB
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(!data.selectedBrand?.assets.length && !data.selectedProduct?.assets.length && !data.projectMaterials.length) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No project materials uploaded yet.</p>
                    <p className="text-sm mt-2">Upload brand assets, product materials, and other project files.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-4">
        <Button onClick={onNext} disabled={!canProceed}>
          Continue to Campaign Setup
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}