import React, { useState } from 'react';
import {
  Building2,
  CalendarClock,
  Camera,
  Crown,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Smartphone,
  User,
  Wallet,
} from 'lucide-react';
import type { AppPortalMode } from '../types/hrm';
import { formatDateDDMMMYYYY } from '../utils/formatters';
import { SmartphoneShell } from './SmartphoneShell';
import { PWAInstallButton } from './PWAComponents';

export const DEMO_ACCOUNTS = {
  backoffice: {
    email: 'admin@kinghrm.id',
    password: 'Password123!',
    name: 'Administrator KING HRM',
  },
  mobile: {
    identifier: 'EMP-002',
    email: 'nadia.kusuma@kinghrm.id',
    password: 'Password123!',
    name: 'Nadia Kusuma',
  },
} as const;

export interface AuthFormPayload {
  mode: AppPortalMode;
  action: 'login' | 'register';
  identifier: string;
  password: string;
  fullName?: string;
  isDemo?: boolean;
}

interface AuthSwitchPortalProps {
  portalMode: AppPortalMode;
  onChangeMode: (mode: AppPortalMode) => void;
  onSubmitAuth: (payload: AuthFormPayload) => Promise<void>;
  authError: string | null;
  needsEmailProviderSetup: boolean;
  loading: boolean;
}

export const AuthSwitchPortal: React.FC<AuthSwitchPortalProps> = ({
  portalMode,
  onChangeMode,
  onSubmitAuth,
  authError,
  needsEmailProviderSetup,
  loading,
}) => {
  const todayLabel = formatDateDDMMMYYYY(new Date());

  // Backoffice form state
  const [boAction, setBoAction] = useState<'login' | 'register'>('login');
  const [boName, setBoName] = useState('Administrator KING HRM');
  const [boEmail, setBoEmail] = useState<string>(DEMO_ACCOUNTS.backoffice.email);
  const [boPassword, setBoPassword] = useState('');
  const [boShowPass, setBoShowPass] = useState(false);

  // Mobile form state
  const [mobAction, setMobAction] = useState<'login' | 'register'>('login');
  const [mobName, setMobName] = useState('');
  const [mobIdentifier, setMobIdentifier] = useState<string>(DEMO_ACCOUNTS.mobile.email);
  const [mobPassword, setMobPassword] = useState('');
  const [mobShowPass, setMobShowPass] = useState(false);

  const handleBackofficeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmitAuth({
      mode: 'backoffice',
      action: boAction,
      identifier: boEmail.trim(),
      password: boPassword,
      fullName: boName.trim(),
    });
  };

  const handleMobileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmitAuth({
      mode: 'mobile',
      action: mobAction,
      identifier: mobIdentifier.trim(),
      password: mobPassword,
      fullName: mobName.trim(),
    });
  };

  const handleDemoLogin = async (target: AppPortalMode) => {
    if (target === 'backoffice') {
      setBoAction('login');
      setBoEmail(DEMO_ACCOUNTS.backoffice.email);
      setBoPassword(DEMO_ACCOUNTS.backoffice.password);
      await onSubmitAuth({
        mode: 'backoffice',
        action: 'login',
        identifier: DEMO_ACCOUNTS.backoffice.email,
        password: DEMO_ACCOUNTS.backoffice.password,
        fullName: DEMO_ACCOUNTS.backoffice.name,
        isDemo: true,
      });
    } else {
      setMobAction('login');
      setMobIdentifier(DEMO_ACCOUNTS.mobile.email);
      setMobPassword(DEMO_ACCOUNTS.mobile.password);
      await onSubmitAuth({
        mode: 'mobile',
        action: 'login',
        identifier: DEMO_ACCOUNTS.mobile.email,
        password: DEMO_ACCOUNTS.mobile.password,
        fullName: DEMO_ACCOUNTS.mobile.name,
        isDemo: true,
      });
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors ${
        portalMode === 'mobile' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Mode Switcher Bar */}
      <header
        className={`w-full border-b px-4 sm:px-6 py-3 ${
          portalMode === 'mobile'
            ? 'bg-slate-950/90 border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
              <Crown className="w-4 h-4" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">KING HRM</span>
          </div>

          <div
            role="tablist"
            aria-label="Pilih Tampilan Login"
            className={`inline-flex p-1 rounded-xl ${
              portalMode === 'mobile' ? 'bg-slate-800' : 'bg-slate-200/80'
            }`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={portalMode === 'backoffice'}
              onClick={() => onChangeMode('backoffice')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                portalMode === 'backoffice'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Backoffice Manajemen
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={portalMode === 'mobile'}
              onClick={() => onChangeMode('mobile')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                portalMode === 'mobile'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              Mobile App Karyawan
            </button>
          </div>

          <div className="hidden md:flex items-center gap-3 shrink-0">
            <span
              className={`font-mono-num text-xs ${
                portalMode === 'mobile' ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {todayLabel}
            </span>
            <PWAInstallButton variant={portalMode === 'mobile' ? 'dark' : 'light'} />
          </div>
        </div>
      </header>

      {/* Firebase Email/Password Provider Guide Banner (shown if disabled in Console) */}
      {needsEmailProviderSetup && (
        <div className="max-w-4xl mx-auto w-full px-4 pt-5">
          <div className="rounded-2xl border border-amber-300 bg-amber-50 text-amber-950 p-5 shadow-sm space-y-2.5">
            <h3 className="font-display text-sm font-bold">
              Aktifkan Provider Email/Password di Firebase Console
            </h3>
            <p className="text-xs leading-relaxed text-amber-900">
              Untuk menggunakan login akun Email/Password dan akun demo di bawah, aktifkan metode <strong>Email/Password</strong> satu kali pada Firebase Console:
            </p>
            <ol className="text-xs space-y-1 list-decimal list-inside text-amber-900">
              <li>Buka Authentication Providers pada proyek <strong>meta-sonar-tf38q</strong>.</li>
              <li>Pilih <strong>Email/Password</strong> → nyalakan <strong>Enable</strong> → klik <strong>Save</strong>.</li>
              <li>Kembali ke halaman ini lalu klik <strong>Masuk Akun Demo</strong>.</li>
            </ol>
            <a
              href="https://console.firebase.google.com/project/meta-sonar-tf38q/authentication/providers"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-900 text-white text-xs font-semibold hover:bg-amber-800 transition-colors"
            >
              Buka Firebase Authentication Providers
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col justify-center">
        {portalMode === 'backoffice' ? (
          /* =========================================================
             BACKOFFICE MANAJEMEN LOGIN + AKUN DEMO
             ========================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Panel Administrasi &amp; Manajemen SDM</span>
                  </div>
                  <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setBoAction('login')}
                      className={`px-3 py-1 rounded-md font-semibold ${
                        boAction === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      Masuk
                    </button>
                    <button
                      type="button"
                      onClick={() => setBoAction('register')}
                      className={`px-3 py-1 rounded-md font-semibold ${
                        boAction === 'register'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500'
                      }`}
                    >
                      Daftar Admin
                    </button>
                  </div>
                </div>

                <h1 className="font-display text-2xl font-bold text-slate-900">
                  {boAction === 'login'
                    ? 'Login Backoffice Manajemen'
                    : 'Registrasi Admin KING HRM'}
                </h1>
                <p className="mt-1.5 text-sm text-slate-600">
                  Masuk untuk mengelola karyawan, jabatan, jadwal kerja, foto selfie kehadiran, cuti, dan payroll harian.
                </p>

                {authError && (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
                    {authError}
                  </div>
                )}

                <form onSubmit={handleBackofficeSubmit} className="mt-5 space-y-4">
                  {boAction === 'register' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Nama Lengkap Admin
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={boName}
                          onChange={(e) => setBoName(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email Administrator
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={boEmail}
                        onChange={(e) => setBoEmail(e.target.value)}
                        placeholder="admin@kinghrm.id"
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={boShowPass ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={boPassword}
                        onChange={(e) => setBoPassword(e.target.value)}
                        placeholder="Password123!"
                        className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setBoShowPass(!boShowPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        aria-label="Tampilkan password"
                      >
                        {boShowPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0B1220] text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition-colors min-h-[46px]"
                  >
                    {loading
                      ? 'Memproses...'
                      : boAction === 'login'
                      ? 'Masuk ke Panel Backoffice'
                      : 'Buat Akun Admin & Masuk'}
                  </button>
                </form>

                {/* Demo Admin Card */}
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                      <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Akun Demo Backoffice (Admin)</span>
                    </div>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleDemoLogin('backoffice')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                    >
                      Masuk Akun Demo
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono-num text-emerald-950">
                    <div>
                      <span className="text-[10px] font-sans text-emerald-700 block">Email</span>
                      <span>{DEMO_ACCOUNTS.backoffice.email}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-sans text-emerald-700 block">Password</span>
                      <span>{DEMO_ACCOUNTS.backoffice.password}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Single Source of Truth · Real-time Database</span>
                <span className="font-mono-num">{todayLabel}</span>
              </div>
            </div>

            {/* Right Executive Summary */}
            <div className="lg:col-span-6 bg-[#0B1220] text-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-400">
                  Arsitektur Backoffice KING HRM
                </p>
                <h2 className="mt-2 font-display text-xl sm:text-2xl font-bold text-white">
                  Kendali Penuh Operasional SDM &amp; Payroll Harian
                </h2>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                  Tersinkronisasi langsung dengan Mobile App Karyawan secara real-time di semua perangkat.
                </p>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4">
                    <Building2 className="w-5 h-5 text-emerald-400 mb-2.5" />
                    <h4 className="text-sm font-semibold text-white">Karyawan &amp; Jabatan</h4>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                      Atur biodata karyawan, departemen, jabatan, dan tarif gaji harian Rp/hari.
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4">
                    <CalendarClock className="w-5 h-5 text-emerald-400 mb-2.5" />
                    <h4 className="text-sm font-semibold text-white">Hari &amp; Jam Kerja</h4>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                      Konfigurasi hari kerja aktif, jam masuk/pulang, dan toleransi terlambat.
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4">
                    <Camera className="w-5 h-5 text-emerald-400 mb-2.5" />
                    <h4 className="text-sm font-semibold text-white">Kehadiran &amp; Cuti</h4>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                      Audit foto selfie clock-in/out serta persetujuan pengajuan cuti karyawan.
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4">
                    <Wallet className="w-5 h-5 text-emerald-400 mb-2.5" />
                    <h4 className="text-sm font-semibold text-white">Payroll Model Harian</h4>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                      Tercatat masuk = otomatis terhitung tarif harian × jumlah hari masuk.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Format Tanggal: {todayLabel}</span>
                <button
                  type="button"
                  onClick={() => onChangeMode('mobile')}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                >
                  Lihat Tampilan HP Karyawan →
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================
             MOBILE APP KARYAWAN LOGIN — CENTERED SMARTPHONE ("SEPERTI DI HP")
             ========================================================= */
          <div className="flex flex-col items-center justify-center">
            <SmartphoneShell darkTopBar={true}>
              <div className="flex-1 flex flex-col bg-[#F4F6F9] text-slate-900 overflow-y-auto no-scrollbar">
                {/* Fintech Obsidian Hero Header inside Phone */}
                <div className="bg-[#0B1220] text-white px-5 pt-5 pb-8 rounded-b-[30px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 flex items-center justify-center">
                        <Crown className="w-4 h-4" />
                      </div>
                      <span className="font-display text-base font-bold tracking-tight">
                        KING HRM
                      </span>
                    </div>
                    <span className="font-mono-num text-[11px] text-slate-400">
                      {todayLabel}
                    </span>
                  </div>

                  <div className="mt-5">
                    <p className="text-[11px] font-semibold text-emerald-400">
                      Mobile App Karyawan
                    </p>
                    <h1 className="mt-1 font-display text-xl font-bold text-white leading-snug">
                      {mobAction === 'login' ? 'Masuk Akun Karyawan' : 'Aktivasi Akun Baru'}
                    </h1>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                      Presensi selfie, pantau gaji harian, cuti &amp; laporan kerja.
                    </p>
                  </div>
                </div>

                {/* Login / Register & Demo Card Inside Phone */}
                <div className="px-4 -mt-4 flex-1 flex flex-col justify-between pb-5 space-y-3">
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
                    <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs">
                      <button
                        type="button"
                        onClick={() => setMobAction('login')}
                        className={`py-1.5 rounded-lg font-semibold transition-colors ${
                          mobAction === 'login'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500'
                        }`}
                      >
                        Masuk
                      </button>
                      <button
                        type="button"
                        onClick={() => setMobAction('register')}
                        className={`py-1.5 rounded-lg font-semibold transition-colors ${
                          mobAction === 'register'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500'
                        }`}
                      >
                        Daftar Baru
                      </button>
                    </div>

                    {authError && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800 leading-snug">
                        {authError}
                      </div>
                    )}

                    <form onSubmit={handleMobileSubmit} className="space-y-2.5">
                      {mobAction === 'register' && (
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Nama Lengkap
                          </label>
                          <input
                            type="text"
                            required
                            value={mobName}
                            onChange={(e) => setMobName(e.target.value)}
                            placeholder="Nama lengkap Anda"
                            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Email atau ID Karyawan
                        </label>
                        <input
                          type="text"
                          required
                          value={mobIdentifier}
                          onChange={(e) => setMobIdentifier(e.target.value)}
                          placeholder="nadia.kusuma@kinghrm.id"
                          className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type={mobShowPass ? 'text' : 'password'}
                            required
                            minLength={6}
                            value={mobPassword}
                            onChange={(e) => setMobPassword(e.target.value)}
                            placeholder="Password123!"
                            className="w-full px-3.5 pr-10 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setMobShowPass(!mobShowPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                            aria-label="Lihat password"
                          >
                            {mobShowPass ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-60 transition-all min-h-[44px] shadow-sm"
                      >
                        {loading
                          ? 'Memproses...'
                          : mobAction === 'login'
                          ? 'Masuk Mobile App'
                          : 'Daftar & Masuk'}
                      </button>
                    </form>

                    {/* Demo Karyawan Inside Phone */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                          Akun Demo Karyawan
                        </span>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleDemoLogin('mobile')}
                          className="px-2.5 py-1 rounded-lg bg-[#0B1220] text-white text-[11px] font-semibold hover:bg-slate-800 disabled:opacity-60"
                        >
                          Masuk Demo
                        </button>
                      </div>
                      <div className="text-[11px] font-mono-num text-slate-600 leading-relaxed">
                        <div>Email: {DEMO_ACCOUNTS.mobile.email}</div>
                        <div>Pass: {DEMO_ACCOUNTS.mobile.password}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-1 text-center text-[10px] text-slate-500 bg-white rounded-xl border border-slate-200/70 py-2 px-1">
                    <span className="font-semibold text-slate-700">Beranda</span>
                    <span className="font-semibold text-slate-700">Presensi</span>
                    <span className="font-semibold text-slate-700">Cuti</span>
                    <span className="font-semibold text-slate-700">Laporan</span>
                    <span className="font-semibold text-slate-700">Profil</span>
                  </div>
                </div>
              </div>
            </SmartphoneShell>
          </div>
        )}
      </main>
    </div>
  );
};
