export enum ListingCategory {
  ELECTRONICS = "Electronics",
  FURNITURE = "Furniture",
  CLOTHING = "Clothing",
  BOOKS = "Books",
  GROCERIES = "Groceries",
  VEGETABLES = "Vegetables",
  AGRO = "Agro", // Agricultural products
  PHARMACY = "Pharmacy",
  SERVICES = "Services",
  OTHER = "Other",
}

export enum ListingType {
  SELL = "Sell",
  RENT = "Rent",
  SWAP = "Swap",
  SERVICE = "Service",
  CREDIT = "Credit",
}

export enum ItemCondition {
  NEW = "New",
  LIKE_NEW = "Like New",
  GOOD = "Good",
  FAIR = "Fair",
  POOR = "Poor",
}

export enum UserRole {
  ADMIN = "Admin",
  STORE_OWNER = "Store Owner",
  CUSTOMER = "Customer",
  CASHIER = "Cashier",
  DELIVERY = "Delivery",
  SUPPLIER = "Supplier",
}

export interface User {
  uid: string;
  name: string;
  email: string;
  avatarUrl?: string;
  avatarBase64?: string;
  campus?: string;
  phone?: string; 
  joinedDate: any; // Firestore Timestamp or ISO string
  role: UserRole;
  isSuspended?: boolean;
  storeName?: string;
  storeId?: string;
  supplierId?: string; // linked supplier profile id when role is Supplier
  storeIsActive?: boolean | null; // null can mean not applicable or not yet determined
  createdAt?: any; // Firestore Timestamp
  fcmTokens?: string[]; // For push notifications
}

export interface Store {
  id: string;
  ownerId: string;
  name: string;
  description:string;
  logoUrl?: string;
  logoBase64?: string;
  dataAiHint?: string; 
  campusCoverage: string[];
  categories?: string[];
  createdAt: any; // Firestore Timestamp or ISO string
  isActive: boolean;
  deliveryFee?: number;
  averageRating?: number;
  numberOfRatings?: number;
  operatingHours?: string;
  // Location
  lat?: number;
  lng?: number;
  addressLabel?: string;
  totalRatingSum?: number;
  updatedAt?: any; // Firestore Timestamp
  searchKeywords?: string[]; // For searching store by name
  // Premium feature flags (admin-controlled)
  featureQuotationsEnabled?: boolean;
  featureAiPredictionsEnabled?: boolean;
  featurePosEnabled?: boolean;
}

export interface Product { 
  id:string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  category: string; 
  condition?: ItemCondition;
  imageUrl: string;
  image?: string;
  dataAiHint?: string;
  stock: number;
  createdAt: string; 
  barcode?: string;
}

export enum OrderStatus {
  PENDING = "Pending",
  IN_TRANSIT = "In Transit",
  DELIVERED = "Delivered",
  COMPLETED = "Completed", 
  CANCELLED = "Cancelled",
}

export interface OrderItem {
  listingId: string;
  sellerId: string; 
  storeId?: string; 
  title: string;
  priceAtPurchase: number;
  quantity: number;
  imageUrl?: string;
  sellerName?: string; 
}

export interface Order {
  id: string;
  customerId: string;
  storeId?: string; 
  items: OrderItem[];
  totalAmount: number;
  itemSubtotal: number;
  deliveryCost: number;
  status: OrderStatus | string; 
  shippingAddress: string;
  shippingLat?: number;
  shippingLng?: number;
  shippingLabel?: string;
  contactPhone?: string;
  deliveryMethod: 'pickup' | 'delivery' | null;
  partnerId?: string; // when deliveryMethod is 'third_party'
  deliveryPayee?: 'store' | 'partner' | null; // who should receive the deliveryCost
  // Convenience amounts for settlement/reporting
  storeRevenueAmount?: number; // usually itemSubtotal; includes deliveryCost only if deliveryPayee==='store'
  partnerDeliveryAmount?: number; // equals deliveryCost if deliveryPayee==='partner'
  paymentMethod: 'cash' | 'mobile_money' | 'bank' | null;
  createdAt: any; // Firestore Timestamp or ISO string
  updatedAt: any; // Firestore Timestamp or ISO string
}

// Receipts & Quotations
export enum ReceiptStatus {
  ISSUED = 'issued',
  REFUNDED = 'refunded',
  VOIDED = 'voided',
}

export interface ReceiptItem {
  title: string;
  quantity: number;
  unitPrice: number;
  subtotal: number; // quantity * unitPrice at time of sale
}

export interface Receipt {
  id: string;
  storeId: string;
  orderId?: string;
  customerId?: string;
  customerName?: string;
  items: ReceiptItem[];
  itemSubtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'mobile_money' | 'card' | 'other';
  status: ReceiptStatus | string;
  createdAt: any; // Firestore Timestamp or ISO string
}

export enum QuotationStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export interface QuotationItem {
  title: string;
  quantity: number;
  unitPrice: number;
  subtotal: number; // quantity * unitPrice at time of quotation
}

export interface Quotation {
  id: string;
  storeId: string;
  customerId?: string;
  customerName?: string;
  items: QuotationItem[];
  itemSubtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  totalAmount: number;
  status: QuotationStatus | string;
  validUntil?: any; // Firestore Timestamp or ISO string
  createdAt: any; // Firestore Timestamp or ISO string
}

export type RatingValue = 1 | 2 | 3 | 4 | 5;

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl?: string; 
  imageBase64?: string;
  dataAiHint?: string;
  category: ListingCategory;
  type: ListingType;
  condition?: ItemCondition;
  sellerId: string; 
  sellerName: string; 
  postedDate: any; // Firestore Timestamp or ISO string
  views?: number;
  stock?: number; // Can be undefined for older items or non-applicable types
  averageRating?: number;
  numberOfRatings?: number;
  totalRatingSum?: number;
  searchKeywords?: string[]; // For searching listing by title
  isFeatured?: boolean;
  storeId?: string;
  barcode?: string; // Barcode for POS scanning
  // Optional precise location fields for where the item/service is based
  lat?: number;
  lng?: number;
  addressLabel?: string; // reverse-geocoded human-readable label
}

export interface Offer {
  id?: string;
  listingId: string;
  listingTitle: string;
  offeredByUserId: string;
  sellerId: string; 
  offerAmount: number;
  timestamp: any; // Firestore Timestamp
  status: 'pending' | 'accepted' | 'rejected';
}

export interface Message {
  id?: string;
  listingId?: string;
  listingTitle?: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  content: string;
  timestamp: any; // Firestore Timestamp
  isRead: boolean;
  // Optional threading helpers
  participants?: string[];
  conversationKey?: string;
  // Optional lightweight attachments embedded as data URLs
  attachments?: Array<{
    dataUrl: string;
    fileName: string;
    contentType: string | null;
    size: number | null;
  }>;
}

export enum SupportTicketStatus {
  OPEN = "Open",
  PENDING_ADMIN_REPLY = "Pending Admin Reply",
  PENDING_USER_REPLY = "Pending User Reply",
  RESOLVED = "Resolved",
  CLOSED = "Closed",
}

export enum SupportTicketPriority {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
}

export enum SupportTicketCategory {
  GENERAL_INQUIRY = "General Inquiry",
  ACCOUNT_ISSUE = "Account Issue",
  BUG_REPORT = "Bug Report",
  LISTING_ISSUE = "Listing Issue",
  PAYMENT_ISSUE = "Payment Issue",
  OTHER = "Other",
}

export interface SupportTicketMessage {
  id?: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: any; // Firestore Timestamp
}

export interface SupportTicket {
  id?: string;
  userId: string;
  subject: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  lastMessageSnippet?: string;
}

export enum FeedbackType {
  SUGGESTION = "Suggestion",
  BUG_REPORT = "Bug Report",
  GENERAL_INQUIRY = "General Inquiry",
}

export interface Feedback {
  id?: string;
  userId?: string; 
  email: string; 
  type: FeedbackType;
  message: string;
  submittedAt: any; // Firestore Timestamp
  isReviewed: boolean;
}

export interface Promotion {
  id?: string;
  title: string;
  description: string;
  discountCode?: string;
  discountPercentage: number; 
  startDate: any; // Firestore Timestamp
  endDate: any; // Firestore Timestamp
  isActive: boolean;
  applicableCategory?: ListingCategory;
  storeId?: string; 
  storeName?: string; 
  displayAsPopup?: boolean;
  popupImageUrl?: string;
  dataAiHint?: string; 
  popupDisplayDurationSeconds?: number;
  linkUrl?: string; 
  cost?: number;    
  paid?: boolean;   
  imageUrl?: string;
  imageBase64?: string;
}

export interface CampusEvent {
  id?: string;
  name: string;
  description: string;
  date: any; 
  time: string;
  location: string;
  organizer: string;
  contact?: string;
  imageUrl?: string; 
  imageBase64?: string;
  dataAiHint?: string;
  isFeatured?: boolean;
  storeId?: string; 
  storeName?: string;
  displayAsPopup?: boolean;
  popupImageUrl?: string; 
  dataAiHintPopup?: string; 
  popupDisplayDurationSeconds?: number;
  startDate?: any; 
  endDate?: any;   
  linkUrl?: string; 
}

export interface Advertisement {
  id?: string;
  title: string;
  content: string;
  imageUrl?: string; 
  dataAiHint?: string;
  linkUrl?: string; 
  displayDurationSeconds: number; 
  isActive: boolean;
  createdAt?: any; // Firestore Timestamp
  startDate: any; 
  endDate: any;   
  storeId?: string;
  storeName?: string;
  paid?: boolean;
  cost?: number;
  displayAsPopup?: boolean;
  popupImageUrl?: string; 
  dataAiHintPopup?: string; 
  popupDisplayDurationSeconds?: number;
}

export interface Address {
  id?: string;
  userId: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  // Precise GPS coordinates (required going forward)
  lat?: number; // legacy records may be missing; new writes must include
  lng?: number;
  label?: string; // reverse-geocoded human label
  createdAt: any; // Firestore Timestamp
}

export interface PlatformSettings {
  id?: string; 
}

export interface StoreStaffMember {
  id?: string;
  storeId: string;
  storeName: string; 
  userId: string; 
  userName: string; 
  userEmail: string; 
  role: string; 
  addedAt: any; // Firestore Timestamp
  addedBy: string; 
}

export interface DeliveryPartner {
  id: string;
  name: string; // Person's full name
  companyName: string;
  contactEmail: string; // Primary contact/login email
  userId?: string; // Firebase Auth uid for delivery partner login
  userEmail?: string; // Redundant, equals contactEmail
  serviceArea: string; 
  deliveryFee: number; // legacy flat fee; prefer pricing fields below
  // Pricing configuration (new)
  pricingMode?: 'flat' | 'distance';
  flatFee?: number;
  baseFee?: number;
  perKmFee?: number;
  minFee?: number;
  freeOver?: number;
  rating: number | null;
  isActive: boolean;
  active?: boolean; // alias
  createdAt: any; // Firestore Timestamp
  logoBase64?: string; // Optional company logo stored as base64
}

export type PopupItemContent =
  | ({ itemType: 'advertisement' } & Advertisement)
  | ({ itemType: 'promotion' } & Promotion)
  | ({ itemType: 'event' } & CampusEvent);

// Additional types for app state management
export interface CartItem {
  id: string;
  listing: Listing;
  quantity: number;
  selectedVariant?: string;
}

export interface SwapRequest {
  id?: string;
  fromUserId: string;
  toUserId: string;
  fromListingId: string;
  toListingId: string;
  fromListingTitle: string;
  toListingTitle: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  message?: string;
  createdAt: any;
  updatedAt: any;
}

export interface RentalRequest {
  id?: string;
  listingId: string;
  renterId: string;
  ownerId: string;
  startDate: any;
  endDate: any;
  totalCost: number;
  status: 'pending' | 'approved' | 'active' | 'completed' | 'cancelled';
  message?: string;
  terms?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Favorite {
  id?: string;
  userId: string;
  listingId: string;
  addedAt: any;
}

// Types exported for use throughout the application