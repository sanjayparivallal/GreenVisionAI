import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
  onClear?: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClear }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Initialize camera stream
  const startCamera = async () => {
    setIsStarting(true);
    setCameraError(null);

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        'Unable to access camera feed. Please grant camera permissions in your browser or iframe header.'
      );
      toast.error('Camera permission denied or camera not found');
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    if (!capturedImage) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, capturedImage]);

  // Capture frame
  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const rawWidth = video.videoWidth || 640;
    const rawHeight = video.videoHeight || 480;
    const maxDim = 800;
    let width = rawWidth;
    let height = rawHeight;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    const base64 = canvas.toDataURL('image/jpeg', 0.75);
    setCapturedImage(base64);

    // Stop active camera stream after snapshot
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    onCapture(base64);
    toast.success('Waste image captured successfully!');
  };

  // Retake photo
  const retake = () => {
    setCapturedImage(null);
    if (onClear) onClear();
  };

  // Toggle camera direction
  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
      {/* Hidden canvas for image extraction */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100">Live Camera Feed</h4>
            <p className="text-[11px] text-slate-400">Position overflowing bin inside camera box</p>
          </div>
        </div>

        {/* Gallery upload disabled notice as specified */}
        <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
          Gallery disabled (Camera Only)
        </span>
      </div>

      {/* Video Stream Container / Image Preview */}
      <div className="relative aspect-video rounded-xl bg-slate-950 overflow-hidden border border-slate-800 flex items-center justify-center">
        {capturedImage ? (
          <div className="relative w-full h-full">
            <img src={capturedImage} alt="Captured waste bin" className="w-full h-full object-cover" />
            <div className="absolute top-3 left-3 bg-emerald-500 text-slate-950 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg">
              <CheckCircle2 className="w-3.5 h-3.5" /> Photo Ready
            </div>
          </div>
        ) : cameraError ? (
          <div className="p-6 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
            <p className="text-xs text-slate-300 max-w-sm">{cameraError}</p>
            <button
              type="button"
              onClick={startCamera}
              className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:brightness-110"
            >
              Retry Camera Connection
            </button>
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Target Reticle Overlay */}
            <div className="absolute inset-8 border-2 border-emerald-400/60 border-dashed rounded-2xl pointer-events-none flex flex-col justify-between p-4">
              <div className="flex justify-between text-[10px] font-bold text-emerald-400/80 bg-slate-900/60 px-2 py-0.5 rounded-full self-center">
                <span>Align Bin & Waste Overflow</span>
              </div>
            </div>

            {isStarting && (
              <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center text-xs text-slate-300">
                Initializing camera feed...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Camera Action Toolbar */}
      <div className="flex items-center justify-between pt-1">
        {capturedImage ? (
          <button
            type="button"
            onClick={retake}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 flex items-center justify-center gap-2 border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Retake Waste Photo
          </button>
        ) : (
          <div className="flex items-center justify-between w-full gap-3">
            <button
              type="button"
              onClick={flipCamera}
              className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              title="Flip Camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={takeSnapshot}
              disabled={!!cameraError || isStarting}
              className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-900/40 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" /> Capture Waste Snapshot
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
