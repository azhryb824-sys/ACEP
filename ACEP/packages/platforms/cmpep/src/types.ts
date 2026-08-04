export enum PartnerType {
  Contractor = 'contractor',
  ContractorMain = 'contractor_main',
  ContractorSub = 'contractor_sub',
  ContractorSpecialized = 'contractor_specialized',
  Supplier = 'supplier',
  SupplierMaterials = 'supplier_materials',
  SupplierSteel = 'supplier_steel',
  SupplierConcrete = 'supplier_concrete',
  SupplierCables = 'supplier_cables',
  SupplierPipes = 'supplier_pipes',
  SupplierElevators = 'supplier_elevators',
  SupplierHVAC = 'supplier_hvac',
  SupplierElectrical = 'supplier_electrical',
  SupplierSmartSystems = 'supplier_smart_systems',
  Manufacturer = 'manufacturer',
  ManufacturerSteel = 'manufacturer_steel',
  ManufacturerConcrete = 'manufacturer_concrete',
  ManufacturerElevators = 'manufacturer_elevators',
  ManufacturerDoors = 'manufacturer_doors',
  ManufacturerGlass = 'manufacturer_glass',
  ManufacturerAluminum = 'manufacturer_aluminum',
  ServiceProvider = 'service_provider',
  ServiceProviderTesting = 'service_provider_testing',
  ServiceProviderLab = 'service_provider_lab',
  ServiceProviderSurvey = 'service_provider_survey',
  ServiceProviderDrones = 'service_provider_drones',
  ServiceProviderRental = 'service_provider_rental',
  ServiceProviderTransport = 'service_provider_transport',
  ServiceProviderWaste = 'service_provider_waste',
  Consultant = 'consultant',
  ConsultantEngineering = 'consultant_engineering',
  ConsultantDesign = 'consultant_design',
  ConsultantProjectManagement = 'consultant_pm',
}

export interface CompanyProfile {
  companyId: string;
  commercialReg: string;
  name: string;
  nameAr: string;
  partnerType: PartnerType;
  country: string;
  cities: string[];
  specializations: string[];
  certs: string[];
  yearsExp: number;
  projects: number;
  size: 'micro' | 'small' | 'medium' | 'large' | 'enterprise';
  employees: number;
  equipment: string[];
  branches: number;
  contacts: {
    phone: string;
    email: string;
    address: string;
  };
  website?: string;
  payment: {
    bankName: string;
    iban: string;
    paymentTerms: number;
    maxCredit: number;
  };
  licenses: {
    type: string;
    number: string;
    expiry: string;
    issuingAuthority: string;
  }[];
  ratings: PartnerRating[];
}

export interface PartnerRating {
  source: string;
  score: number;
  date: string;
  comment?: string;
}

export interface SmartRating {
  companyId: string;
  execution: number;
  schedule: number;
  contract: number;
  product: number;
  response: number;
  satisfaction: number;
  complaints: number;
  rework: number;
  financial: number;
  safety: number;
  overall: number;
  lastUpdated: string;
}

export interface Tender {
  id: string;
  companyId: string;
  title: string;
  scope: string;
  budget: number;
  currency: string;
  deadline: string;
  documents: string[];
  requirements: TenderRequirement[];
  status: TenderStatus;
  awardDate?: string;
  invitedPartners: string[];
  bids: Bid[];
  createdAt: string;
  updatedAt: string;
}

export interface TenderRequirement {
  category: string;
  description: string;
  mandatory: boolean;
  weight: number;
}

export enum TenderStatus {
  Draft = 'draft',
  Published = 'published',
  Inviting = 'inviting',
  Receiving = 'receiving',
  Evaluating = 'evaluating',
  Awarded = 'awarded',
  Closed = 'closed',
  Cancelled = 'cancelled',
}

export interface Bid {
  id: string;
  tenderId: string;
  partnerId: string;
  price: number;
  duration: number;
  warranty: number;
  paymentTerms: number;
  submittedAt: string;
  documents: string[];
  notes?: string;
}

export interface BidComparison {
  bidId: string;
  tenderId: string;
  partnerId: string;
  price: number;
  quality: number;
  duration: number;
  warranty: number;
  experience: number;
  capacity: number;
  pastPerformance: number;
  compositeScore: number;
  rank: number;
}

export enum MarketplaceCategory {
  Equipment = 'equipment',
  Materials = 'materials',
  Machinery = 'machinery',
  SpareParts = 'spare_parts',
  Elevators = 'elevators',
  HVAC = 'hvac',
  EngineeringSoftware = 'engineering_software',
  EngineeringServices = 'engineering_services',
  Design = 'design',
  Consulting = 'consulting',
}

export enum ListingType {
  Sale = 'sale',
  Rental = 'rental',
  Subscription = 'subscription',
}

export interface MarketplaceItem {
  id: string;
  companyId: string;
  category: MarketplaceCategory;
  title: string;
  description: string;
  listingType: ListingType;
  price: number;
  currency: string;
  quantity: number;
  unit: string;
  specifications: Record<string, string>;
  images: string[];
  location: string;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SmartPricing {
  itemId: string;
  marketPrice: number;
  historicalPrices: {
    date: string;
    price: number;
  }[];
  seasonalChanges: {
    season: string;
    multiplier: number;
  }[];
  supplierPrices: {
    supplierId: string;
    price: number;
    date: string;
  }[];
  pastProjectPrices: {
    projectId: string;
    price: number;
    date: string;
  }[];
  suggestedRange: {
    min: number;
    max: number;
    recommended: number;
  };
  volatility: number;
  trend: 'up' | 'down' | 'stable';
}

export interface PaymentEngine {
  paymentOrders: PaymentOrder[];
  invoices: Invoice[];
  claims: PaymentClaim[];
  progressPayments: ProgressPayment[];
  guarantees: Guarantee[];
  lettersOfCredit: LetterOfCredit[];
  collections: Collection[];
}

export interface PaymentOrder {
  id: string;
  fromCompanyId: string;
  toCompanyId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'executed' | 'cancelled';
  dueDate: string;
  reference: string;
}

export interface Invoice {
  id: string;
  orderId: string;
  number: string;
  items: { description: string; amount: number; quantity: number; total: number }[];
  subtotal: number;
  tax: number;
  total: number;
  issuedDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
}

export interface PaymentClaim {
  id: string;
  projectId: string;
  claimType: 'variation' | 'extension' | 'damage' | 'delay' | 'other';
  amount: number;
  description: string;
  evidence: string[];
  status: 'submitted' | 'reviewing' | 'approved' | 'rejected' | 'settled';
}

export interface ProgressPayment {
  id: string;
  projectId: string;
  milestone: string;
  percentage: number;
  amount: number;
  dueDate: string;
  status: 'pending' | 'approved' | 'paid' | 'disputed';
}

export interface Guarantee {
  id: string;
  type: 'bid_bond' | 'performance' | 'advance_payment' | 'retention' | 'maintenance';
  issuer: string;
  beneficiary: string;
  amount: number;
  expiryDate: string;
  status: 'active' | 'claimed' | 'released' | 'expired';
}

export interface LetterOfCredit {
  id: string;
  type: 'sight' | 'usance' | 'revolving' | 'standby';
  applicant: string;
  beneficiary: string;
  issuingBank: string;
  amount: number;
  expiryDate: string;
  status: 'opened' | 'confirmed' | 'utilized' | 'closed';
}

export interface Collection {
  id: string;
  debtorId: string;
  creditorId: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'collected' | 'overdue' | 'written_off';
  actions: CollectionAction[];
}

export interface CollectionAction {
  date: string;
  type: 'reminder' | 'demand' | 'escalation' | 'legal';
  note: string;
}

export interface TrustedPartnerIndex {
  companyId: string;
  quality: number;
  schedule: number;
  financial: number;
  safety: number;
  contracts: number;
  satisfaction: number;
  response: number;
  priceStability: number;
  overall: number;
  lastCalculated: string;
}

export interface PartnerRelationship {
  fromCompanyId: string;
  toCompanyId: string;
  relationshipType: 'subcontractor' | 'supplier' | 'partner' | 'client' | 'competitor';
  projects: string[];
  rating: number;
  established: string;
}

export interface MatchResult {
  partnerId: string;
  score: number;
  confidence: number;
  reason: string;
  alternatives: MatchAlternative[];
  risks: string[];
}

export interface MatchAlternative {
  partnerId: string;
  score: number;
  reason: string;
}
