// Shared types for AdminClientDetails components

export type AccountStatus = "ACTIVE" | "BLOCKED" | "SUSPENDED";
export type KYCStatus = "VERIFIED" | "PENDING" | "REVERIFY_REQUESTED" | "REJECTED" | "NOT_STARTED";
export type PhoneStatus = "VERIFIED" | "NOT_VERIFIED";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type BookingStatus = "PENDING" | "CONFIRMED" | "ONGOING" | "COMPLETED" | "CANCELLED" | "REFUNDED";
export type PaymentStatus = "PAID" | "UNPAID" | "FAILED" | "REFUNDED";
export type NoteCategory = "Support" | "Risk" | "Payment" | "Booking" | "KYC";
export type TimelineEventType = "ADMIN_ACTION" | "BOOKING" | "KYC" | "TRUST" | "NOTE" | "SYSTEM";

export interface ClientData {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  joinedAt: string | null;
  lastActiveAt: string | null;
  accountStatus: AccountStatus;
  kycStatus: KYCStatus;
  phoneStatus: PhoneStatus;
  riskLevel: RiskLevel;
  trustScore: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShows: number;
  totalSpend: number;
  refundsCount: number;
  paymentFailedCount: number;
  avgRentalDuration: number;
  lastBookingAt: string | null;
  frontIdUrl: string | null;
  backIdUrl: string | null;
  selfieUrl: string | null;
  idCardNumber: string | null;
}

export interface ClientFileData {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
  downloadCount: number;
}

export interface FileDownloadRecord {
  id: string;
  fileId: string;
  downloadedBy: string;
  downloadedByName: string;
  downloadedAt: string;
}

export interface BookingData {
  id: string;
  motorbikeName: string;
  city: string;
  pickupLocation: string;
  startDate: string;
  endDate: string;
  price: number;
  deposit: number;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  createdAt: string;
}

export interface TrustEventData {
  id: string;
  datetime: string;
  delta: number;
  reason: string;
  actor: string;
  relatedBookingId: string | null;
}

export interface NoteData {
  id: string;
  category: NoteCategory;
  text: string;
  createdBy: string;
  createdAt: string;
  isPinned: boolean;
}

export interface TimelineEventData {
  id: string;
  type: TimelineEventType;
  label: string;
  description: string;
  actor: string;
  actorType: string;
  datetime: string;
  relatedId?: string;
}

// Common props for tab components
export interface ClientTabProps {
  client: ClientData;
  isRTL: boolean;
}
