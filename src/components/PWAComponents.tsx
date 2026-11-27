import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const PWAInstallButton: React.FC<{ variant?: 'dark' | 'light' }> = ({
  variant = 'dark',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const baseClass =
    variant === 'dark'
      ? 'bg-slate-900 text-white hover:bg-slate-800 border-slate-900'
      : 'bg-white text-slate-900 hover:bg-slate-50 border-slate-200';

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${baseClass}`}
      >
        <Download className="w-4 h-4" />
        Install Mobile PWA
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${baseClass}`}
      >
        <Smartphone className="w-4 h-4" />
        {isIOS ? 'Install di iPhone' : 'Panduan Install PWA'}
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Install KING HRM di Perangkat
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Tutup panduan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 space-y-2.5 text-sm text-slate-600 leading-relaxed">
              {isIOS ? (
                <>
                  <p>1. Ketuk tombol <strong>Bagikan (Share)</strong> di bilah bawah Safari.</p>
                  <p>2. Gulir ke bawah dan pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.</p>
                  <p>3. Buka ikon <strong>KING HRM</strong> langsung seperti aplikasi mobile.</p>
                </>
              ) : (
                <>
                  <p>1. Buka halaman ini di <strong>Chrome / Edge</strong> pada smartphone atau desktop.</p>
                  <p>2. Ketuk ikon <strong>Install App</strong> di address bar browser atau menu browser → <strong>Add to Home screen</strong>.</p>
                  <p>3. Data presensi, cuti, dan payroll tersinkronisasi real-time di semua perangkat.</p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg">
      <WifiOff className="w-3.5 h-3.5" />
      Mode Offline — Menggunakan data cache lokal
    </div>
  );
};
