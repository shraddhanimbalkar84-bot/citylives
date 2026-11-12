export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
  label: string;
}

export interface DetectionResult {
  detected: boolean;
  count: number;
  confidence: number;
  boxes: BoundingBox[];
  detector_type: "yolov8_model" | "cv_heuristic" | "demo_simulation";
  is_demo_mode: boolean;
  notice: string;
  preliminary_severity: "Low" | "Medium" | "High" | "Critical";
  preliminary_score: number;
  surface_damage_ratio: number;
  severity_breakdown?: string;
}

export interface StatusHistory {
  id: number;
  from_status: string;
  to_status: string;
  changed_by_user: string;
  admin_notes?: string;
  created_at: string;
}

export type SeverityTier = "Low" | "Medium" | "High" | "Critical";
export type ReportStatus = "Submitted" | "Under Review" | "Assigned" | "In Progress" | "Resolved" | "Rejected";

export interface Report {
  id: number;
  tracking_number: string;
  user_id?: number;
  citizen_name: string;
  citizen_contact?: string;
  title: string;
  description?: string;
  image_filename: string;
  image_url: string;
  latitude: number;
  longitude: number;
  address: string;
  severity: SeverityTier;
  severity_score: number;
  severity_breakdown?: string;
  status: ReportStatus;
  priority: string;
  assigned_department?: string;
  assigned_crew?: string;
  ai_detected: boolean;
  ai_count: number;
  ai_confidence: number;
  ai_boxes_json: string;
  detector_type: string;
  is_demo_mode: boolean;
  upvotes_count: number;
  created_at: string;
  updated_at: string;
  status_history: StatusHistory[];
}

export interface DuplicateMatch {
  id: number;
  tracking_number: string;
  title: string;
  distance_meters: number;
  latitude: number;
  longitude: number;
  address: string;
  severity: SeverityTier;
  status: ReportStatus;
  image_url: string;
  created_at: string;
}

export interface DuplicateCheckResponse {
  has_duplicates: boolean;
  matches: DuplicateMatch[];
  message: string;
}

export interface SeverityCount {
  severity: string;
  count: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface DashboardAnalytics {
  total_reports: number;
  pending_reports: number;
  in_progress_reports: number;
  resolved_reports: number;
  rejected_reports: number;
  critical_reports: number;
  resolution_rate: number;
  avg_resolution_days: number;
  severity_distribution: SeverityCount[];
  status_distribution: StatusCount[];
  weekly_trend: TrendPoint[];
  recent_activity: Report[];
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: "citizen" | "admin";
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
