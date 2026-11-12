import React, { useState } from 'react';
import { Report, ReportStatus, SeverityTier } from '../types';
import { api } from '../api/client';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';
import { BoundingBoxCanvas } from './BoundingBoxCanvas';
import {
  X,
  MapPin,
  Calendar,
  ThumbsUp,
  Share2,
  Clock,
  Shield,
  User,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check
} from 'lucide-react';

interface ReportDetailModalProps {
  report: Report | null;
  isAdmin: boolean;
  onClose: () => void;
  onStatusUpdated?: (updatedReport: Report) => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  isAdmin,
  onClose,
  onStatusUpdated
}) => {
  if (!report) return null;

  const [copied, setCopied] = useState(false);
  const [upvotes, setUpvotes] = useState(report.upvotes_count);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [upvoting, setUpvoting] = useState(false);

  // Admin Status Update State
  const [newStatus, setNewStatus] = useState<ReportStatus>(report.status);
  const [adminNotes, setAdminNotes] = useState('');
  const [assignedDept, setAssignedDept] = useState(report.assigned_department || '');
  const [assignedCrew, setAssignedCrew] = useState(report.assigned_crew || '');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const boxes = report.ai_boxes_json ? JSON.parse(report.ai_boxes_json) : [];

  const handleCopyId = () => {
    navigator.clipboard.writeText(report.tracking_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpvote = async () => {
    if (hasUpvoted || upvoting) return;
    setUpvoting(true);
    try {
      const res = await api.upvoteReport(report.id);
      setUpvotes(res.upvotes_count);
      setHasUpvoted(true);
    } catch {
      // Fallback local increment
      setUpvotes(upvotes + 1);
      setHasUpvoted(true);
    } finally {
      setUpvoting(false);
    }
  };

  const handleAdminUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setUpdateError(null);

    try {
      const updated = await api.updateReportStatus(report.id, {
        new_status: newStatus,
        admin_notes: adminNotes,
        assigned_department: assignedDept || undefined,
        assigned_crew: assignedCrew || undefined
      });
      if (onStatusUpdated) {
        onStatusUpdated(updated);
      }
      setAdminNotes('');
    } catch (err: any) {
      setUpdateError(err.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold bg-teal-500/20 text-teal-400 px-2.5 py-1 rounded-md border border-teal-500/30">
              {report.tracking_number}
            </span>
            <button
              type="button"
              onClick={handleCopyId}
              className="p-1 rounded text-slate-400 hover:text-white transition-colors"
              title="Copy Tracking ID"
            >
              {copied ? <Check className="w-4 h-4 text-teal-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <StatusBadge status={report.status} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Main Visual with Bounding Boxes */}
          <div className="space-y-2">
            <BoundingBoxCanvas
              imageUrl={report.image_url}
              boxes={boxes}
              detectionResult={{
                detected: report.ai_detected,
                count: report.ai_count,
                confidence: report.ai_confidence,
                boxes: boxes,
                detector_type: report.detector_type as any,
                is_demo_mode: report.is_demo_mode,
                notice: report.is_demo_mode ? 'Demo / Heuristic Mode' : 'YOLOv8 Real Inference',
                preliminary_severity: report.severity,
                preliminary_score: report.severity_score,
                surface_damage_ratio: 0.15
              }}
            />
          </div>

          {/* Title & Metadata */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900">{report.title}</h2>
              <SeverityBadge severity={report.severity} score={report.severity_score} showScore />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>{report.address}</span>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{new Date(report.created_at).toLocaleDateString()} at {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Reported by {report.citizen_name}</span>
              </span>
            </div>

            {report.description && (
              <p className="text-sm text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 leading-relaxed">
                {report.description}
              </p>
            )}
          </div>

          {/* Assignment Information (if assigned) */}
          {(report.assigned_department || report.assigned_crew) && (
            <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <Wrench className="w-4 h-4" />
              </div>
              <div className="text-xs space-y-0.5">
                <p className="font-bold text-teal-900">Municipal Repair Crew Assigned</p>
                <p className="text-teal-700 font-medium">Department: {report.assigned_department || 'Public Works'}</p>
                {report.assigned_crew && <p className="text-teal-600">Unit: {report.assigned_crew}</p>}
              </div>
            </div>
          )}

          {/* Citizen Upvote Button */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs">
              <span className="font-bold text-slate-800">{upvotes} citizen{upvotes === 1 ? '' : 's'}</span>
              <span className="text-slate-500"> have upvoted or verified this hazard.</span>
            </div>
            <button
              type="button"
              onClick={handleUpvote}
              disabled={hasUpvoted || upvoting}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                hasUpvoted
                  ? 'bg-teal-100 text-teal-700 cursor-default'
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>{hasUpvoted ? 'Upvoted' : 'Upvote Hazard'}</span>
            </button>
          </div>

          {/* Complaint Lifecycle History Timeline */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Complaint Lifecycle Timeline
            </h3>

            <div className="relative pl-6 border-l-2 border-slate-200 space-y-4">
              {report.status_history && report.status_history.length > 0 ? (
                report.status_history.map((hist, idx) => (
                  <div key={hist.id || idx} className="relative group">
                    {/* Timeline bullet */}
                    <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-teal-600 shadow-xs" />
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{hist.to_status}</span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(hist.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      <p className="text-slate-600 text-xs">{hist.admin_notes || 'Status updated.'}</p>
                      <p className="text-[11px] text-slate-400 font-mono">By: {hist.changed_by_user}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-slate-400" />
                  <p className="text-xs text-slate-500">Submitted — awaiting initial municipal review.</p>
                </div>
              )}
            </div>
          </div>

          {/* Admin Management Section (if in Admin Mode) */}
          {isAdmin && (
            <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-4 shadow-lg border border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-bold text-white">Administrator Action Panel</h3>
              </div>

              {updateError && (
                <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs">
                  {updateError}
                </div>
              )}

              <form onSubmit={handleAdminUpdate} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Update Status</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as ReportStatus)}
                      className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:ring-1 focus:ring-teal-400"
                    >
                      <option value="Submitted">Submitted</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Assign Department</label>
                    <input
                      type="text"
                      value={assignedDept}
                      onChange={(e) => setAssignedDept(e.target.value)}
                      placeholder="e.g., Public Works Rapid Response"
                      className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:ring-1 focus:ring-teal-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Assign Crew / Unit</label>
                    <input
                      type="text"
                      value={assignedCrew}
                      onChange={(e) => setAssignedCrew(e.target.value)}
                      placeholder="e.g., Crew #4"
                      className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:ring-1 focus:ring-teal-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Official Audit Notes</label>
                  <textarea
                    rows={2}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Enter inspection results, crew dispatch notes, cold-patch asphalt completion details..."
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:ring-1 focus:ring-teal-400"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    {updating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Save Status & Notes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
