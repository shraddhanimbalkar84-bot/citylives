import React, { useState, useRef, useEffect } from 'react';
import { BoundingBox, DetectionResult } from '../types';
import { Eye, EyeOff, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

interface BoundingBoxCanvasProps {
  imageUrl: string;
  boxes: BoundingBox[];
  detectionResult?: DetectionResult | null;
  className?: string;
  showToggle?: boolean;
}

export const BoundingBoxCanvas: React.FC<BoundingBoxCanvasProps> = ({
  imageUrl,
  boxes = [],
  detectionResult,
  className = '',
  showToggle = true
}) => {
  const [showBoxes, setShowBoxes] = useState(true);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    setNaturalSize({
      width: target.naturalWidth,
      height: target.naturalHeight
    });
  };

  const isDemo = detectionResult?.is_demo_mode ?? true;
  const detectorType = detectionResult?.detector_type ?? 'cv_heuristic';

  return (
    <div className={`relative overflow-hidden rounded-xl bg-slate-900 ${className}`}>
      {/* Main Image */}
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Road damage preview"
        onLoad={handleImageLoad}
        className="w-full h-auto block object-cover max-h-[460px] mx-auto select-none"
      />

      {/* SVG Bounding Boxes Overlay */}
      {showBoxes && naturalSize.width > 0 && naturalSize.height > 0 && (
        <svg
          viewBox={`0 0 ${naturalSize.width} ${naturalSize.height}`}
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="none"
        >
          {boxes.map((box, index) => {
            const isNorm = box.x2 <= 1.0 && box.y2 <= 1.0;
            const x1 = isNorm ? box.x1 * naturalSize.width : box.x1;
            const y1 = isNorm ? box.y1 * naturalSize.height : box.y1;
            const x2 = isNorm ? box.x2 * naturalSize.width : box.x2;
            const y2 = isNorm ? box.y2 * naturalSize.height : box.y2;
            const width = Math.max(10, x2 - x1);
            const height = Math.max(10, y2 - y1);

            return (
              <g key={index}>
                {/* Translucent fill */}
                <rect
                  x={x1}
                  y={y1}
                  width={width}
                  height={height}
                  fill="rgba(239, 68, 68, 0.15)"
                  stroke="#EF4444"
                  strokeWidth={naturalSize.width > 1200 ? 5 : 3}
                  strokeDasharray="4 2"
                  rx="6"
                />
                {/* Label pill */}
                <rect
                  x={x1}
                  y={Math.max(0, y1 - 28)}
                  width={Math.min(width, 160)}
                  height="26"
                  fill="#EF4444"
                  rx="4"
                />
                <text
                  x={x1 + 8}
                  y={Math.max(18, y1 - 10)}
                  fill="#FFFFFF"
                  fontSize="14"
                  fontWeight="bold"
                  fontFamily="Inter, sans-serif"
                >
                  {box.label.toUpperCase()} {Math.round(box.confidence * 100)}%
                </text>
              </g>
            );
          })}
        </svg>
      )}

      {/* Controls Overlay */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
        {showToggle && boxes.length > 0 && (
          <button
            type="button"
            onClick={() => setShowBoxes(!showBoxes)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-medium backdrop-blur-md transition-all shadow-lg border border-slate-700/50"
          >
            {showBoxes ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Hide AI Overlay</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-teal-400" />
                <span>Show AI Boxes ({boxes.length})</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Honest Model Disclaimer Banner */}
      <div className="absolute bottom-0 inset-x-0 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2 truncate">
          {isDemo ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30 text-[11px]">
              <AlertCircle className="w-3 h-3" />
              Demo / Heuristic Mode
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30 text-[11px]">
              <CheckCircle2 className="w-3 h-3" />
              YOLOv8 Real Inference
            </span>
          )}
          <span className="truncate text-slate-400 hidden sm:inline">
            {isDemo
              ? 'Contrast & surface analysis active. Never claiming unconfigured deep learning.'
              : 'Trained model weights loaded.'}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono text-slate-400">
            {boxes.length} defect{boxes.length === 1 ? '' : 's'} flagged
          </span>
        </div>
      </div>
    </div>
  );
};
