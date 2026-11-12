import React from 'react';
import { DuplicateMatch } from '../types';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';
import { AlertTriangle, MapPin, ArrowRight, CheckCircle2 } from 'lucide-react';

interface DuplicateWarningModalProps {
  duplicates: DuplicateMatch[];
  onProceedAnyway: () => void;
  onSelectExisting: (reportId: number) => void;
  onCancel: () => void;
}

export const DuplicateWarningModal: React.FC<DuplicateWarningModalProps> = ({
  duplicates,
  onProceedAnyway,
  onSelectExisting,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-amber-500 p-5 text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Possible Duplicate Report Detected</h3>
            <p className="text-xs text-amber-100">
              {duplicates.length} existing report{duplicates.length === 1 ? '' : 's'} found within 50 meters of your pin.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-xs text-slate-600 leading-relaxed">
            A road damage complaint has already been filed near this location. Upvoting existing reports helps the city
            prioritize high-impact areas faster without creating duplicate municipal tickets.
          </p>

          <div className="space-y-3">
            {duplicates.map((dup) => (
              <div
                key={dup.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors flex gap-3 items-center justify-between"
              >
                <div className="flex gap-3 items-center min-w-0">
                  <img
                    src={dup.image_url}
                    alt={dup.title}
                    className="w-16 h-16 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-200"
                  />
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800">{dup.tracking_number}</span>
                      <SeverityBadge severity={dup.severity} size="sm" />
                    </div>
                    <p className="text-xs font-medium text-slate-700 truncate">{dup.title}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                      <span className="font-semibold text-amber-700">{Math.round(dup.distance_meters)}m away</span>
                      <span>&bull;</span>
                      <StatusBadge status={dup.status} size="sm" />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectExisting(dup.id)}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shrink-0 shadow-xs flex items-center gap-1 transition-colors"
                >
                  <span>View</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Adjust Location
          </button>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onProceedAnyway}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium shadow-xs transition-colors"
            >
              Submit as New Report Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
