export type UserRole = 'admin' | 'resident';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  profile_image?: string;
  created_at?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type WasteType = 'organic' | 'recyclable' | 'general' | 'hazardous';
export type FillLevel = 'empty' | 'half-full' | 'full' | 'overflowing';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';
export type ReportStatus = 'pending' | 'approved' | 'rejected' | 'in_progress' | 'collected';

export interface WasteReport {
  id: string;
  user_id: string;
  image_base64: string;
  location_text: string;
  latitude?: number;
  longitude?: number;
  waste_type: WasteType;
  fill_level: FillLevel;
  estimated_waste_kg?: number;
  severity_score: number;
  environmental_impact_score: number;
  priority_level: PriorityLevel;
  recommended_action: string;
  status: ReportStatus;
  hidden_for?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ScheduleStatus = 'scheduled' | 'completed' | 'delayed';

export interface CollectionSchedule {
  id: string;
  zone_name: string;
  waste_type: string;
  collection_date: string;
  status: ScheduleStatus;
  created_by?: string;
}

export interface RewardSummary {
  total_points: number;
  earned_points: number;
  redeemed_points: number;
  pending_reports_count: number;
  estimated_pending_points: number;
}

export interface RewardTransaction {
  id: string;
  user_id: string;
  report_id?: string | null;
  points: number;
  type: 'earned' | 'redeemed';
  description: string;
  created_at?: string;
}

export interface OrganicWasteRecord {
  id: string;
  report_id?: string | null;
  quantity_kg: number;
  distributed_to: string;
  distribution_date: string;
  status: string;
}

export type OrganicWasteType = 'general' | 'food_scraps' | 'garden_waste' | 'compost' | 'agricultural';

export interface OrganicWasteListing {
  id: string;
  posted_by: string;
  total_kg: number;
  available_kg: number;
  description: string;
  waste_type: OrganicWasteType | string;
  pickup_location: string;
  available_until?: string | null;
  image_base64?: string;
  status: 'open' | 'closed';
  created_at: string;
}

export type OrganicRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface OrganicWasteRequest {
  id: string;
  listing_id: string;
  user_id: string;
  requested_kg: number;
  contact_info: string;
  status: OrganicRequestStatus;
  admin_note?: string | null;
  created_at: string;
  updated_at?: string;
  // Joined fields
  requester_name?: string;
  requester_email?: string;
  listing_description?: string;
  waste_type?: string;
  pickup_location?: string;
  available_kg?: number;
}

export type FeedbackStatus = 'open' | 'in_progress' | 'resolved';

export interface FeedbackTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: FeedbackStatus;
  admin_response?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MLInferenceResult {
  waste_type: WasteType;
  fill_level: FillLevel;
  estimated_waste_kg: number;
  severity_score: number;
  environmental_impact_score: number;
  priority_level: PriorityLevel;
  recommended_action: string;
}
