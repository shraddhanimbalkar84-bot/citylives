import {
  Report,
  ReportOut,
  DuplicateCheckResponse,
  DetectionResult,
  DashboardAnalytics,
  AuthResponse,
  User
} from '../types';

const API_BASE = '/api';

// Helper for auth headers
function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('civiceye_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Authentication & Demo Toggle
  async demoLogin(role: 'citizen' | 'admin'): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/demo-login/${role}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Demo login failed');
    const data: AuthResponse = await res.json();
    localStorage.setItem('civiceye_token', data.access_token);
    localStorage.setItem('civiceye_user', JSON.stringify(data.user));
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Login failed');
    }
    const data: AuthResponse = await res.json();
    localStorage.setItem('civiceye_token', data.access_token);
    localStorage.setItem('civiceye_user', JSON.stringify(data.user));
    return data;
  },

  logout(): void {
    localStorage.removeItem('civiceye_token');
    localStorage.removeItem('civiceye_user');
  },

  getCurrentStoredUser(): User | null {
    const raw = localStorage.getItem('civiceye_user');
    return raw ? JSON.parse(raw) : null;
  },

  // Reports
  async getReports(params: {
    status?: string;
    severity?: string;
    search?: string;
    days?: number;
    user_only?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<Report[]> {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'All') query.set('status', params.status);
    if (params.severity && params.severity !== 'All') query.set('severity', params.severity);
    if (params.search) query.set('search', params.search);
    if (params.days) query.set('days', String(params.days));
    if (params.user_only) query.set('user_only', 'true');
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));

    const res = await fetch(`${API_BASE}/reports?${query.toString()}`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to fetch reports');
    return res.json();
  },

  async getReport(identifier: string | number): Promise<Report> {
    const res = await fetch(`${API_BASE}/reports/${identifier}`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Report not found');
    return res.json();
  },

  async checkDuplicate(lat: number, lon: number, radiusMeters?: number): Promise<DuplicateCheckResponse> {
    const query = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
    });
    if (radiusMeters) query.set('radius_meters', String(radiusMeters));

    const res = await fetch(`${API_BASE}/reports/check-duplicate?${query.toString()}`);
    if (!res.ok) throw new Error('Duplicate check failed');
    return res.json();
  },

  async submitReport(formData: FormData): Promise<Report> {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit report');
    }
    return res.json();
  },

  async upvoteReport(reportId: number, clientId: string = 'user'): Promise<{ message: string; upvotes_count: number }> {
    const res = await fetch(`${API_BASE}/reports/${reportId}/upvote?client_id=${encodeURIComponent(clientId)}`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to record upvote');
    return res.json();
  },

  // AI Detection preview
  async detectImage(file: File, forceDemo: boolean = false): Promise<DetectionResult> {
    const formData = new FormData();
    formData.append('image', file);
    if (forceDemo) formData.append('force_demo', 'true');

    const res = await fetch(`${API_BASE}/detect`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'AI detection failed');
    }
    return res.json();
  },

  // Admin Actions
  async updateReportStatus(
    reportId: number,
    data: {
      new_status: string;
      admin_notes?: string;
      priority?: string;
      assigned_department?: string;
      assigned_crew?: string;
    }
  ): Promise<Report> {
    const res = await fetch(`${API_BASE}/admin/reports/${reportId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update report status');
    }
    return res.json();
  },

  async deleteReport(reportId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/reports/${reportId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to delete report');
  },

  async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    const res = await fetch(`${API_BASE}/analytics/dashboard`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
    return res.json();
  },

  getCsvExportUrl(): string {
    return `${API_BASE}/admin/export/csv`;
  }
};
