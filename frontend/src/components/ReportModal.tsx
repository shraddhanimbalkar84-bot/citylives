import React, { useState } from 'react';
import { api } from '../api/client';
import { DetectionResult, DuplicateMatch, Report } from '../types';
import { BoundingBoxCanvas } from './BoundingBoxCanvas';
import { LocationPicker } from './LocationPicker';
import { DuplicateWarningModal } from './DuplicateWarningModal';
import { SeverityBadge } from './SeverityBadge';
import {
  X,
  UploadCloud,
  Sparkles,
  MapPin,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportCreated: (report: Report) => void;
  onViewExistingReport?: (reportId: number) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  onReportCreated,
  onViewExistingReport
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Location State (defaults to Seattle Metro Hub)
  const [latitude, setLatitude] = useState(47.6062);
  const [longitude, setLongitude] = useState(-122.3321);
  const [address, setAddress] = useState('4th Ave & Pike St, Seattle, WA');

  // Metadata State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [citizenName, setCitizenName] = useState('');
  const [citizenContact, setCitizenContact] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Duplicate Check State
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateChecked, setDuplicateChecked] = useState(false);

  if (!isOpen) return null;

  // Handle File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, or WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size exceeds 10MB limit. Please upload a smaller photo.');
      return;
    }

    setUploadError(null);
    setImageFile(file);

    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);

    // Run AI detection preview
    setAnalyzingImage(true);
    try {
      const result = await api.detectImage(file);
      setDetectionResult(result);
      if (!title) {
        setTitle(
          `${result.preliminary_severity} road damage detected (${result.count} pothole${result.count === 1 ? '' : 's'})`
        );
      }
    } catch {
      setUploadError('Could not process image AI preview. You can still submit the report.');
    } finally {
      setAnalyzingImage(false);
    }
  };

  // Location Next Handler (runs duplicate check)
  const handleLocationNext = async () => {
    try {
      const dupRes = await api.checkDuplicate(latitude, longitude, 50.0);
      if (dupRes.has_duplicates && !duplicateChecked) {
        setDuplicateMatches(dupRes.matches);
        setShowDuplicateModal(true);
        return;
      }
    } catch {
      // Proceed if duplicate check network fails
    }
    setStep(3);
  };

  // Final Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile || !title) return;

    setSubmitting(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('latitude', String(latitude));
    formData.append('longitude', String(longitude));
    formData.append('address', address);
    formData.append('description', description);
    formData.append('citizen_name', citizenName || 'Anonymous Citizen');
    if (citizenContact) formData.append('citizen_contact', citizenContact);
    formData.append('image', imageFile);

    try {
      const createdReport = await api.submitReport(formData);
      onReportCreated(createdReport);
      onClose();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Report Road Damage</h2>
              <p className="text-xs text-slate-400">Step {step} of 3: {step === 1 ? 'Upload & AI Detection' : step === 2 ? 'Pin Exact Location' : 'Details & Review'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Progress Bar */}
        <div className="w-full bg-slate-100 h-1">
          <div
            className="bg-teal-500 h-1 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {uploadError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Step 1: Image & AI Detection Preview */}
        {step === 1 && (
          <div className="p-6 space-y-4">
            {!imagePreview ? (
              <label className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-slate-50 hover:bg-teal-50/30 transition-all text-center group">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 group-hover:border-teal-300 text-teal-600 flex items-center justify-center shadow-xs transition-all">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Click to upload or drag road damage photo
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Supports JPG, PNG, WebP up to 10MB</p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/60 text-slate-600 text-[11px] font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>AI scans for potholes & scores severity instantly</span>
                </div>
              </label>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <BoundingBoxCanvas
                    imageUrl={imagePreview}
                    boxes={detectionResult?.boxes || []}
                    detectionResult={detectionResult}
                  />

                  {analyzingImage && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white rounded-xl">
                      <Loader2 className="w-7 h-7 animate-spin text-teal-400" />
                      <p className="text-xs font-semibold">Running Road Damage AI Scanner...</p>
                    </div>
                  )}
                </div>

                {/* AI Summary Box */}
                {detectionResult && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700">Preliminary Assessment:</span>
                        <SeverityBadge
                          severity={detectionResult.preliminary_severity}
                          score={detectionResult.preliminary_score}
                          showScore
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-500">
                        {detectionResult.count} pothole{detectionResult.count === 1 ? '' : 's'} identified
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 italic bg-white p-2.5 rounded-lg border border-slate-200/80 leading-relaxed">
                      &bull; Notice: Image-based severity estimates are preliminary calculations based on cavity size and count. Municipal inspectors verify conditions on-site before roadwork begins.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setImageFile(null);
                        setDetectionResult(null);
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline"
                    >
                      Choose a different photo
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={!imageFile || analyzingImage}
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
              >
                <span>Continue to Location</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Location Selection & Duplicate Check */}
        {step === 2 && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Pin Pothole Location</h3>
                <p className="text-xs text-slate-500">Use GPS, search an address, or drag the map pin.</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                  {latitude.toFixed(4)}, {longitude.toFixed(4)}
                </span>
              </div>
            </div>

            <LocationPicker
              latitude={latitude}
              longitude={longitude}
              address={address}
              onChange={(lat, lon, addr) => {
                setLatitude(lat);
                setLongitude(lon);
                setAddress(addr);
                setDuplicateChecked(false);
              }}
            />

            <div className="pt-3 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleLocationNext}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
              >
                <span>Confirm Location & Details</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Details & Final Submit */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Report Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Deep pothole in center lane near crosswalk"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description & Context (Optional)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe vehicle impact, depth, hazard to cyclists or traffic..."
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={citizenName}
                    onChange={(e) => setCitizenName(e.target.value)}
                    placeholder="Alex Rivera (or leave Anonymous)"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Email / Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={citizenContact}
                    onChange={(e) => setCitizenContact(e.target.value)}
                    placeholder="For status updates on this ticket"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                </div>
              </div>

              {/* Summary Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Confirmed Address:</span>
                  <span className="font-medium text-slate-800 truncate max-w-[260px]">{address}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">AI Severity Rating:</span>
                  <SeverityBadge
                    severity={detectionResult?.preliminary_severity || 'Medium'}
                    size="sm"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Report...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Civic Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Duplicate Warning Dialog */}
      {showDuplicateModal && (
        <DuplicateWarningModal
          duplicates={duplicateMatches}
          onProceedAnyway={() => {
            setDuplicateChecked(true);
            setShowDuplicateModal(false);
            setStep(3);
          }}
          onSelectExisting={(reportId) => {
            setShowDuplicateModal(false);
            onClose();
            if (onViewExistingReport) onViewExistingReport(reportId);
          }}
          onCancel={() => {
            setShowDuplicateModal(false);
          }}
        />
      )}
    </div>
  );
};
