import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, RotateCcw, Upload, X } from 'lucide-react';
import { formatDateDDMMMYYYY, getCurrentTimeHHMMSS } from '../utils/formatters';

interface SelfieCameraModalProps {
  mode: 'clock-in' | 'clock-out';
  employeeName: string;
  onConfirm: (photoDataUrl: string, notes: string) => Promise<void>;
  onClose: () => void;
}

export const SelfieCameraModal: React.FC<SelfieCameraModalProps> = ({
  mode,
  employeeName,
  onConfirm,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setCameraReady(false);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Peramban tidak mendukung akses kamera langsung. Gunakan unggah foto atau snapshot verifikasi.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch {
      setCameraError('Izin kamera tidak tersedia atau diblokir. Anda dapat memilih foto dari perangkat atau membuat snapshot verifikasi.');
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const stampAndExportCanvas = (drawFn: (ctx: CanvasRenderingContext2D, size: number) => void): string => {
    const size = 280;
    const canvas = canvasRef.current ?? document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    drawFn(ctx, size);

    // Subtle verified timestamp bar at bottom
    ctx.fillStyle = 'rgba(11, 18, 32, 0.78)';
    ctx.fillRect(0, size - 34, size, 34);
    ctx.fillStyle = '#10B981';
    ctx.font = '600 10px sans-serif';
    ctx.fillText('KING HRM SELFIE', 10, size - 19);
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '500 10px monospace';
    ctx.fillText(`${formatDateDDMMMYYYY(new Date())} · ${getCurrentTimeHHMMSS()}`, 10, size - 7);

    return canvas.toDataURL('image/jpeg', 0.72);
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !cameraReady) return;
    const dataUrl = stampAndExportCanvas((ctx, size) => {
      const vw = video.videoWidth || 480;
      const vh = video.videoHeight || 480;
      const minSide = Math.min(vw, vh);
      const sx = (vw - minSide) / 2;
      const sy = (vh - minSide) / 2;
      ctx.save();
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, minSide, minSide, 0, 0, size, size);
      ctx.restore();
    });
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const dataUrl = stampAndExportCanvas((ctx, size) => {
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        });
        setCapturedPhoto(dataUrl);
        stopCamera();
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFallbackSnapshot = () => {
    const dataUrl = stampAndExportCanvas((ctx, size) => {
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, '#0B1220');
      grad.addColorStop(1, '#1E293B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2 - 20, 48, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      const initials = employeeName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('');
      ctx.fillText(initials || 'KH', size / 2, size / 2 - 10);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '500 11px sans-serif';
      ctx.fillText(employeeName.slice(0, 26), size / 2, size / 2 + 54);
      ctx.textAlign = 'left';
    });
    setCapturedPhoto(dataUrl);
  };

  const handleRetake = () => {
    setCapturedPhoto('');
    startCamera();
  };

  const handleSubmit = async () => {
    if (!capturedPhoto || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(capturedPhoto, notes);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed min-[450px]:absolute inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full bg-white rounded-t-3xl overflow-hidden shadow-2xl border-t border-slate-200 max-h-[92%] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {mode === 'clock-in' ? 'Selfie Clock-In Masuk' : 'Selfie Clock-Out Pulang'}
            </h3>
            <p className="text-xs text-slate-500 font-mono-num mt-0.5">
              {formatDateDDMMMYYYY(new Date())} · {getCurrentTimeHHMMSS()}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors"
            aria-label="Tutup kamera"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="relative aspect-square w-full max-w-[280px] mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 flex items-center justify-center">
            {capturedPhoto ? (
              <img
                src={capturedPhoto}
                alt="Hasil foto selfie presensi"
                className="w-full h-full object-cover"
              />
            ) : cameraError ? (
              <div className="p-5 text-center space-y-3">
                <Camera className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Pilih / Ambil Foto
                  </button>
                  <button
                    type="button"
                    onClick={handleFallbackSnapshot}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-700 transition-colors"
                  >
                    Buat Snapshot Verifikasi
                  </button>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {/* Biometric guide circle */}
                <div className="pointer-events-none absolute inset-6 rounded-full border-2 border-dashed border-emerald-400/70" />
              </>
            )}
            <canvas ref={canvasRef} className="hidden" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Catatan Presensi (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={150}
              placeholder={
                mode === 'clock-in'
                  ? 'Contoh: WFO Kantor Pusat'
                  : 'Contoh: Pekerjaan hari ini selesai'
              }
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>

          {!capturedPhoto ? (
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors min-h-[48px]"
              >
                <Upload className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={!cameraReady}
                onClick={handleCapture}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors min-h-[48px]"
              >
                <Camera className="w-4 h-4" />
                Ambil Foto Selfie
              </button>
            </div>
          ) : (
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={handleRetake}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors min-h-[48px]"
              >
                <RotateCcw className="w-4 h-4" />
                Ulangi
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition-colors min-h-[48px]"
              >
                <Check className="w-4 h-4" />
                {submitting
                  ? 'Menyimpan...'
                  : mode === 'clock-in'
                  ? 'Konfirmasi Clock-In'
                  : 'Konfirmasi Clock-Out'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
