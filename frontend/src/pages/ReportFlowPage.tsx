import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CameraCapture } from '../components/CameraCapture';
import { apiClient } from '../api/client';
import { WasteReport } from '../types';
import toast from 'react-hot-toast';
import {
  Camera,
  MapPin,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Navigation,
  Upload,
  Cpu,
  BarChart3,
  Send,
} from 'lucide-react';

// Multi-step AI analysis progress
const ANALYSIS_STEPS = [
  { icon: Upload,   label: 'Uploading image',          detail: 'Sending to GreenVision servers...' },
  { icon: Sparkles, label: 'GreenVision AI analyzing',   detail: 'Vision model inspecting waste type & fill level...' },
  { icon: Cpu,      label: 'Computing severity scores', detail: 'Calculating environmental impact & priority...' },
  { icon: Send,     label: 'Submitting to queue',       detail: 'Logging to municipal dispatch feed...' },
];

const AnalysisProgress: React.FC<{ step: number }> = ({ step }) => (
  <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
    {/* Animated background pulse */}
    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5 animate-pulse" />

    <div className="relative z-10 text-center space-y-1">
      <h3 className="text-base font-bold text-white flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
        Running GreenVision AI Diagnosis...
      </h3>
      <p className="text-xs text-slate-400">Please wait while we analyze your waste report</p>
    </div>

    <div className="relative z-10 space-y-3">
      {ANALYSIS_STEPS.map((s, i) => {
        const Icon = s.icon;
        const done = i < step;
        const active = i === step;
        return (
          <div
            key={i}
            className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
              active
                ? 'bg-emerald-500/15 border border-emerald-500/40'
                : done
                ? 'bg-slate-800/50 border border-slate-700/30'
                : 'opacity-30 border border-transparent'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              done ? 'bg-emerald-500 text-slate-950' : active ? 'bg-emerald-500/30 text-emerald-400' : 'bg-slate-800 text-slate-600'
            }`}>
              {done ? <CheckCircle2 className="w-4 h-4" /> : (
                active ? <Icon className="w-4 h-4 animate-spin" style={{ animationDuration: '2s' }} /> : <Icon className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold ${done ? 'text-emerald-400' : active ? 'text-slate-100' : 'text-slate-500'}`}>
                {s.label}
              </p>
              {active && <p className="text-[10px] text-slate-400 truncate">{s.detail}</p>}
            </div>
            {done && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            {active && (
              <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  </div>
);

export const ReportFlowPage: React.FC = () => {
  const navigate = useNavigate();

  const [inputMode, setInputMode] = useState<'camera' | 'upload'>('camera');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [locationText, setLocationText] = useState('');
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [submittedReport, setSubmittedReport] = useState<WasteReport | null>(null);

  // Auto-advance analysis steps
  useEffect(() => {
    if (!isAnalyzing) return;
    setAnalysisStep(0);
    const timers = [
      setTimeout(() => setAnalysisStep(1), 800),
      setTimeout(() => setAnalysisStep(2), 2500),
      setTimeout(() => setAnalysisStep(3), 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [isAnalyzing]);

  // Detect GPS location
  const detectLocation = () => {
    if ('geolocation' in navigator) {
      toast.loading('Detecting GPS location...', { id: 'gps' });
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationText(`GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
          toast.success('GPS coordinates retrieved', { id: 'gps' });
        },
        () => {
          toast.error('Could not auto-retrieve GPS coordinates. Please type location.', { id: 'gps' });
        }
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Image size must be under 15MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setImageBase64(canvas.toDataURL('image/jpeg', 0.75));
        } else {
          setImageBase64(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageBase64) {
      toast.error('Please capture or upload a photo of the waste bin first');
      return;
    }
    if (!locationText) {
      toast.error('Please enter the location description');
      return;
    }
    setIsAnalyzing(true);
    try {
      const res = await apiClient.post('/reports', {
        image_base64: imageBase64,
        location_text: locationText,
        // Default to 0,0 when GPS not detected (avoids hardcoded SF coordinates)
        latitude: coords.lat ?? 0,
        longitude: coords.lng ?? 0,
      });
      setSubmittedReport(res.data.report);
      toast.success('Report analyzed and submitted for municipal approval!');
    } catch {
      // Handled by client interceptor
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep(0);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-2 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-bold flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/40">
          <Camera className="w-6 h-6" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold mx-auto mb-1">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> ML Vision
        </div>
        <h1 className="text-2xl font-heading font-extrabold text-white">Report Overflowing Waste Bin</h1>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Capture photo &bull; GreenVision AI diagnoses waste weight &amp; severity &bull; Municipal team dispatches &bull; Points credited upon approval
        </p>
      </div>

      {!submittedReport ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Input Mode (Camera vs Upload) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center justify-between w-full">
                <span>Step 1: Provide Waste Image</span>
                {imageBase64 && (
                  <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Image Selected
                  </span>
                )}
              </label>
            </div>

            {/* Toggle Switch */}
            <div className="flex rounded-xl bg-slate-800 p-1 border border-slate-700/60 max-w-xs">
              <button
                type="button"
                onClick={() => { setInputMode('camera'); setImageBase64(null); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  inputMode === 'camera' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5" /> Live Camera
              </button>
              <button
                type="button"
                onClick={() => { setInputMode('upload'); setImageBase64(null); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  inputMode === 'upload' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Upload File
              </button>
            </div>

            {inputMode === 'camera' ? (
              <CameraCapture
                onCapture={(b64) => setImageBase64(b64)}
                onClear={() => setImageBase64(null)}
              />
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-500/20 file:text-emerald-300 hover:file:bg-emerald-500/30"
                />
                {imageBase64 && (
                  <img src={imageBase64} alt="Preview" className="rounded-xl max-h-56 object-cover w-full border border-slate-700" />
                )}
              </div>
            )}
          </div>

          {/* Step 2: Location Description */}
          <div className="space-y-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                Step 2: Enter Precise Location
              </label>

              {/* <button
                type="button"
                onClick={detectLocation}
                className="text-[11px] font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700"
              >
                <Navigation className="w-3 h-3" /> Auto Detect GPS
              </button> */}
            </div>

            <input
              type="text"
              required
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="e.g. 742 Evergreen Terrace, Rear Alleyway Bin #4"
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-medium placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Analyzing Loading Indicator */}
          {isAnalyzing ? (
            <AnalysisProgress step={analysisStep} />
          ) : (
            <button
              type="submit"
              disabled={!imageBase64 || !locationText}
              className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-900/40 hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" /> Analyze Image &amp; Submit Report
            </button>
          )}
        </form>
      ) : (
        /* AI Diagnosis & Submission Confirmation Card */
        <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-extrabold text-white">AI Diagnosis Completed &amp; Submitted</h2>
              <p className="text-xs text-slate-400">Report #{submittedReport.id} logged to municipal queue</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Captured Photo */}
            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
              <img
                src={submittedReport.image_base64.startsWith('data:') ? submittedReport.image_base64 : `data:image/jpeg;base64,${submittedReport.image_base64}`}
                alt="Report waste"
                className="w-full h-48 object-cover"
              />
              <div className="p-3 bg-slate-800/80 text-xs font-semibold text-slate-300 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">{submittedReport.location_text}</span>
              </div>
            </div>

            {/* AI Diagnostics */}
            <div className="space-y-3 bg-slate-800/50 p-5 rounded-2xl border border-slate-700/60">
              <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
                <span className="text-xs font-bold text-slate-400">Waste Classification</span>
                <span className="text-xs font-bold text-emerald-400 capitalize px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                  {submittedReport.waste_type}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
                <span className="text-xs font-bold text-slate-400">Fill Level</span>
                <span className="text-xs font-bold text-amber-300 capitalize">
                  {submittedReport.fill_level}
                </span>
              </div>

              {submittedReport.estimated_waste_kg !== undefined && (
                <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
                  <span className="text-xs font-bold text-slate-400">Est. Waste Weight</span>
                  <span className="text-xs font-black text-cyan-300">
                    {Number(submittedReport.estimated_waste_kg).toFixed(1)} kg
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
                <span className="text-xs font-bold text-slate-400">Severity Score</span>
                <span className="text-xs font-extrabold text-rose-400">
                  {Number(submittedReport.severity_score).toFixed(1)} / 10
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
                <span className="text-xs font-bold text-slate-400">Environmental Impact</span>
                <span className="text-xs font-extrabold text-teal-300">
                  {Number(submittedReport.environmental_impact_score).toFixed(1)} / 100
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Priority Assigned</span>
                <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {submittedReport.priority_level}
                </span>
              </div>
            </div>
          </div>

          {/* Actionable Guidance */}
          <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl space-y-1">
            <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Recommended Action Guidance:
            </h4>
            <p className="text-xs text-slate-200">{submittedReport.recommended_action}</p>
          </div>

          {/* Approval & Rewards Note */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-200 text-xs space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Reward Points Awaiting Admin Approval:
            </p>
            <p className="text-[11px] text-amber-300/90">
              Submitting a report logs it to the municipal dispatch queue. Reward points (~{Math.round(submittedReport.environmental_impact_score)} pts) will be automatically credited to your account once a municipal admin approves this report.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setSubmittedReport(null);
                setImageBase64(null);
                setLocationText('');
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Submit Another Waste Report
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold text-xs shadow-lg hover:brightness-110 flex items-center justify-center gap-2"
            >
              Return to Resident Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
