import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  Briefcase,
  Building2,
  CalendarOff,
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  Home,
  LogOut,
  Plus,
  ShieldCheck,
  Trash2,
  User,
  Wallet,
  X,
} from 'lucide-react';
import type {
  Attendance,
  Employee,
  LeaveRequest,
  LeaveType,
  MobileTab,
  PayrollRecord,
  Position,
  WorkSchedule,
} from '../types/hrm';
import {
  cancelLeaveRequest,
  clockInAttendance,
  clockOutAttendance,
  selfOnboardEmployee,
  submitLeaveRequest,
  updateOwnEmployeeContact,
} from '../firebase/hrmService';
import {
  countDaysInclusive,
  formatDateDDMMMYYYY,
  formatIDR,
  formatMonthMMMYYYY,
  getCurrentTimeHHMMSS,
  getInitials,
  getLocalDateKey,
  getLocalMonthKey,
  isLateCheckIn,
} from '../utils/formatters';
import { SmartphoneShell } from './SmartphoneShell';
import { SelfieCameraModal } from './SelfieCameraModal';
import { PWAInstallButton } from './PWAComponents';

interface MobileEmployeeAppProps {
  authUser: { uid: string; email: string; displayName: string };
  isAdmin: boolean;
  employee: Employee | null;
  allEmployees: Employee[];
  positions: Position[];
  schedules: WorkSchedule[];
  attendanceList: Attendance[];
  leaveRequests: LeaveRequest[];
  payrolls: PayrollRecord[];
  onSwitchToBackoffice: () => void;
  onSelectPreviewEmployee: (empId: string | null) => void;
  selectedPreviewEmployeeId: string | null;
  onSignOut: () => Promise<void>;
}

const ANNUAL_LEAVE_QUOTA = 12;

export const MobileEmployeeApp: React.FC<MobileEmployeeAppProps> = ({
  authUser,
  isAdmin,
  employee,
  allEmployees,
  positions,
  schedules,
  attendanceList,
  leaveRequests,
  payrolls,
  onSwitchToBackoffice,
  onSelectPreviewEmployee,
  selectedPreviewEmployeeId,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<MobileTab>('beranda');
  const [now, setNow] = useState(() => new Date());
  const [cameraMode, setCameraMode] = useState<'clock-in' | 'clock-out' | null>(null);
  const [photoPreview, setPhotoPreview] = useState<{ title: string; src: string } | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveFilter, setLeaveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => getLocalMonthKey());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Onboarding state (if new user not yet in employees)
  const [onboardName, setOnboardName] = useState(authUser.displayName || '');
  const [onboardPhone, setOnboardPhone] = useState('');
  const [onboardBank, setOnboardBank] = useState('BCA');
  const [onboardAcc, setOnboardAcc] = useState('');
  const [onboardingBusy, setOnboardingBusy] = useState(false);

  // Leave form state
  const [leaveType, setLeaveType] = useState<LeaveType>('Cuti Tahunan');
  const [leaveStart, setLeaveStart] = useState(() => getLocalDateKey());
  const [leaveEnd, setLeaveEnd] = useState(() => getLocalDateKey());
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editBank, setEditBank] = useState('');
  const [editAccount, setEditAccount] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (employee) {
      setEditPhone(employee.phone || '');
      setEditBank(employee.bankName || 'BCA');
      setEditAccount(employee.bankAccount || '');
    }
  }, [employee]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const todayKey = getLocalDateKey(now);
  const todayFormatted = formatDateDDMMMYYYY(now);
  const timeFormatted = getCurrentTimeHHMMSS(now);

  const employeeSchedule = useMemo(() => {
    if (!employee) return schedules.find((s) => s.isDefault) ?? schedules[0];
    return (
      schedules.find((s) => s.id === employee.scheduleId) ??
      schedules.find((s) => s.isDefault) ??
      schedules[0]
    );
  }, [employee, schedules]);

  const myAttendance = useMemo(() => {
    if (!employee) return [];
    return attendanceList.filter((a) => a.employeeId === employee.id);
  }, [attendanceList, employee]);

  const todayRecord = useMemo(
    () => myAttendance.find((a) => a.dateKey === todayKey) ?? null,
    [myAttendance, todayKey]
  );

  const monthAttendance = useMemo(
    () => myAttendance.filter((a) => a.dateKey.startsWith(selectedMonth)),
    [myAttendance, selectedMonth]
  );

  const currentMonthAttendance = useMemo(() => {
    const curM = getLocalMonthKey(now);
    return myAttendance.filter((a) => a.dateKey.startsWith(curM));
  }, [myAttendance, now]);

  const currentMonthSummary = useMemo(() => {
    const presentDays = currentMonthAttendance.filter(
      (a) => a.status === 'present' || a.status === 'late'
    );
    const totalWage = presentDays.reduce(
      (sum, a) => sum + (a.dailyRateSnapshot || employee?.dailyRate || 0),
      0
    );
    const lateCount = presentDays.filter((a) => a.status === 'late').length;
    return {
      daysCount: presentDays.length,
      totalWage,
      lateCount,
    };
  }, [currentMonthAttendance, employee]);

  const reportSummary = useMemo(() => {
    const valid = monthAttendance.filter(
      (a) => a.status === 'present' || a.status === 'late'
    );
    const onTimeCount = valid.filter((a) => a.status === 'present').length;
    const lateCount = valid.filter((a) => a.status === 'late').length;
    const totalWage = valid.reduce(
      (sum, a) => sum + (a.dailyRateSnapshot || employee?.dailyRate || 0),
      0
    );
    return {
      daysCount: valid.length,
      onTimeCount,
      lateCount,
      totalWage,
    };
  }, [monthAttendance, employee]);

  const myLeaves = useMemo(() => {
    if (!employee) return [];
    return leaveRequests.filter((l) => l.employeeId === employee.id);
  }, [leaveRequests, employee]);

  const leaveSummary = useMemo(() => {
    const pendingCount = myLeaves.filter((l) => l.status === 'pending').length;
    const approvedCount = myLeaves.filter((l) => l.status === 'approved').length;
    const rejectedCount = myLeaves.filter((l) => l.status === 'rejected').length;
    const usedAnnualDays = myLeaves
      .filter((l) => l.status === 'approved' && l.leaveType === 'Cuti Tahunan')
      .reduce((sum, l) => sum + (l.totalDays || 0), 0);
    const remainingAnnualDays = Math.max(0, ANNUAL_LEAVE_QUOTA - usedAnnualDays);
    return {
      pendingCount,
      approvedCount,
      rejectedCount,
      usedAnnualDays,
      remainingAnnualDays,
    };
  }, [myLeaves]);

  const filteredMyLeaves = useMemo(() => {
    if (leaveFilter === 'all') return myLeaves;
    return myLeaves.filter((l) => l.status === leaveFilter);
  }, [myLeaves, leaveFilter]);

  const myPayrolls = useMemo(() => {
    if (!employee) return [];
    return payrolls.filter((p) => p.employeeId === employee.id);
  }, [payrolls, employee]);

  const handleConfirmSelfie = async (photoDataUrl: string, notes: string) => {
    if (!employee) return;
    const nowTime = getCurrentTimeHHMMSS();
    if (cameraMode === 'clock-in') {
      const startTime = employeeSchedule?.startTime ?? '08:30';
      const tolerance = employeeSchedule?.lateToleranceMinutes ?? 15;
      const late = isLateCheckIn(nowTime, startTime, tolerance);
      await clockInAttendance({
        employee,
        dateKey: todayKey,
        checkInTime: nowTime,
        checkInPhoto: photoDataUrl,
        status: late ? 'late' : 'present',
        notes: notes || (late ? 'Clock-In (Terlambat)' : 'Clock-In Tepat Waktu'),
      });
      showToast(`Clock-In berhasil pada ${nowTime}`);
    } else if (cameraMode === 'clock-out' && todayRecord) {
      await clockOutAttendance({
        attendanceId: todayRecord.id,
        checkOutTime: nowTime,
        checkOutPhoto: photoDataUrl,
        notes: notes || todayRecord.notes,
      });
      showToast(`Clock-Out berhasil pada ${nowTime}`);
    }
  };

  const handleSelfOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingBusy(true);
    try {
      const defaultPos = positions[0];
      const defaultSch = schedules.find((s) => s.isDefault) ?? schedules[0];
      await selfOnboardEmployee({
        uid: authUser.uid,
        name: onboardName || authUser.displayName || 'Karyawan KING HRM',
        email: authUser.email,
        phone: onboardPhone || '0812-0000-0000',
        positionId: defaultPos?.id ?? 'POS-01',
        positionTitle: defaultPos?.title ?? 'Staff Operasional',
        department: defaultPos?.department ?? 'Operations',
        scheduleId: defaultSch?.id ?? 'SCH-DEFAULT',
        dailyRate: defaultPos?.dailyRate ?? 300000,
        bankName: onboardBank,
        bankAccount: onboardAcc,
      });
      showToast('Profil karyawan berhasil dibuat.');
    } finally {
      setOnboardingBusy(false);
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || leaveReason.trim().length < 3) return;
    setLeaveSubmitting(true);
    try {
      await submitLeaveRequest({
        employee,
        leaveType,
        startDate: leaveStart,
        endDate: leaveEnd < leaveStart ? leaveStart : leaveEnd,
        reason: leaveReason,
      });
      setShowLeaveModal(false);
      setLeaveReason('');
      setActiveTab('cuti');
      showToast('Pengajuan cuti terkirim ke HR.');
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const handleCancelLeave = async (leaveId: string) => {
    await cancelLeaveRequest(leaveId);
    showToast('Pengajuan cuti dibatalkan.');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    setSavingProfile(true);
    try {
      await updateOwnEmployeeContact(employee.id, editPhone, editBank, editAccount);
      setEditingProfile(false);
      showToast('Biodata kontak & rekening diperbarui.');
    } finally {
      setSavingProfile(false);
    }
  };

  const availableMonths = useMemo(() => {
    const set = new Set<string>([getLocalMonthKey()]);
    myAttendance.forEach((a) => set.add(a.dateKey.slice(0, 7)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [myAttendance]);

  return (
    <div className="min-h-screen bg-slate-950 min-[450px]:py-3 min-[450px]:px-4 flex flex-col items-center justify-center relative">
      {/* Compact Desktop Controls around the Smartphone Screen */}
      <div className="hidden min-[450px]:flex items-center justify-between w-full max-w-4xl mb-2.5 px-2 gap-3">
        <div className="flex items-center gap-2 text-slate-300 text-xs truncate">
          <span className="font-display font-bold text-white text-sm">KING HRM</span>
          <span aria-hidden="true">·</span>
          <span className="hidden sm:inline">Mobile App Karyawan</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span className="font-mono-num text-emerald-400">{todayFormatted}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && allEmployees.length > 0 && (
            <select
              value={selectedPreviewEmployeeId ?? employee?.id ?? ''}
              onChange={(e) => onSelectPreviewEmployee(e.target.value || null)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-700 bg-slate-900 text-slate-200 focus:outline-none max-w-[175px]"
              aria-label="Pilih akun karyawan"
            >
              {allEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employeeCode} — {emp.name}
                </option>
              ))}
            </select>
          )}

          <div className="hidden md:block">
            <PWAInstallButton variant="dark" />
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={onSwitchToBackoffice}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" />
              Backoffice
            </button>
          )}

          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar
          </button>
        </div>
      </div>

      {/* Centered Smartphone ("seperti tampilan hp yang ada di layar") */}
      <SmartphoneShell darkTopBar={activeTab === 'beranda' || activeTab === 'cuti' || !employee}>
        {!employee ? (
          /* Self-Onboarding if new user */
          <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col">
            <div className="bg-[#0B1220] text-white px-5 pt-6 pb-8 rounded-b-[28px]">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-base">Aktivasi Karyawan</span>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="text-xs text-slate-300 hover:text-white"
                >
                  Keluar
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Akun <strong className="text-white">{authUser.email}</strong> belum terhubung ke data karyawan. Lengkapi biodata di bawah untuk mulai presensi &amp; cuti.
              </p>
            </div>
            <form onSubmit={handleSelfOnboard} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={onboardName}
                  onChange={(e) => setOnboardName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor HP / WhatsApp
                </label>
                <input
                  type="text"
                  required
                  value={onboardPhone}
                  onChange={(e) => setOnboardPhone(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bank</label>
                  <input
                    type="text"
                    value={onboardBank}
                    onChange={(e) => setOnboardBank(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Rekening
                  </label>
                  <input
                    type="text"
                    value={onboardAcc}
                    onChange={(e) => setOnboardAcc(e.target.value)}
                    placeholder="1234567890"
                    className="w-full px-3 py-2.5 text-sm font-mono-num rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={onboardingBusy}
                className="w-full py-3.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors min-h-[48px]"
              >
                {onboardingBusy ? 'Menyimpan...' : 'Aktifkan Akun Karyawan'}
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Fintech Mobile App Inside Smartphone */
          <div className="flex-1 flex flex-col bg-[#F4F6F9] overflow-hidden relative">
            {/* Toast inside phone */}
            {toastMsg && (
              <div className="absolute top-3 left-4 right-4 z-40 rounded-xl bg-[#0B1220] text-white px-4 py-2.5 text-xs font-medium shadow-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">{toastMsg}</span>
              </div>
            )}

            {/* Scrollable Viewport Body */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
              {/* TAB 1: BERANDA */}
              {activeTab === 'beranda' && (
                <div>
                  <div className="bg-[#0B1220] text-white px-5 pt-4 pb-8 rounded-b-[30px]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {employee.avatarUrl ? (
                          <img
                            src={employee.avatarUrl}
                            alt={employee.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(employee.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[11px] text-slate-400 truncate">
                            {employee.positionTitle} · {employee.employeeCode}
                          </p>
                          <h2 className="font-display text-sm font-bold text-white truncate">
                            {employee.name}
                          </h2>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={onSwitchToBackoffice}
                            className="min-[450px]:hidden px-2.5 py-1.5 rounded-lg bg-slate-800 text-[11px] font-semibold text-emerald-400"
                          >
                            Backoffice
                          </button>
                        )}
                        <span className="font-mono-num text-[11px] text-slate-400">
                          {todayFormatted}
                        </span>
                      </div>
                    </div>

                    {/* Fintech Daily Salary Balance Card */}
                    <div className="mt-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/60 border border-slate-800 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                          Akumulasi Gaji · {formatMonthMMMYYYY(getLocalMonthKey(now))}
                        </span>
                        <Wallet className="w-4 h-4 text-emerald-400" />
                      </div>
                      <p className="mt-1 font-mono-num text-2xl font-bold text-white tracking-tight">
                        {formatIDR(currentMonthSummary.totalWage)}
                      </p>
                      <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-300">
                        <span>
                          Tarif:{' '}
                          <strong className="font-mono-num text-emerald-400">
                            {formatIDR(employee.dailyRate)}/hari
                          </strong>
                        </span>
                        <span className="font-mono-num">
                          {currentMonthSummary.daysCount} hari masuk
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Floating Clock-In / Clock-Out Card */}
                  <div className="px-4 -mt-4 space-y-3.5 pb-4">
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-500">Waktu Perangkat</p>
                          <p className="font-mono-num text-2xl font-bold text-slate-900 mt-0.5">
                            {timeFormatted}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">
                            {employeeSchedule?.name ?? 'Shift Reguler'}
                          </p>
                          <p className="font-mono-num text-xs font-semibold text-slate-800 mt-0.5">
                            {employeeSchedule?.startTime ?? '08:30'} –{' '}
                            {employeeSchedule?.endTime ?? '17:30'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3.5 grid grid-cols-2 gap-2.5 text-xs">
                        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                          <span className="text-slate-500 block">Clock-In</span>
                          <span className="font-mono-num font-bold text-slate-900 text-sm mt-0.5 block">
                            {todayRecord?.checkInTime || '--:--:--'}
                          </span>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                          <span className="text-slate-500 block">Clock-Out</span>
                          <span className="font-mono-num font-bold text-slate-900 text-sm mt-0.5 block">
                            {todayRecord?.checkOutTime || '--:--:--'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3.5">
                        {!todayRecord ? (
                          <button
                            type="button"
                            onClick={() => setCameraMode('clock-in')}
                            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 active:scale-[0.99] transition-all min-h-[46px] shadow-sm"
                          >
                            <Camera className="w-4 h-4" />
                            Clock-In Foto Selfie
                          </button>
                        ) : !todayRecord.checkOutTime ? (
                          <button
                            type="button"
                            onClick={() => setCameraMode('clock-out')}
                            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0B1220] text-white text-sm font-semibold hover:bg-slate-800 active:scale-[0.99] transition-all min-h-[46px] shadow-sm"
                          >
                            <Camera className="w-4 h-4 text-emerald-400" />
                            Clock-Out Foto Selfie
                          </button>
                        ) : (
                          <div className="w-full py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-2 min-h-[46px]">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Presensi Hari Ini Selesai ({todayFormatted})
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Action: Pengajuan Cuti Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <CalendarOff className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-slate-900">Pengajuan Cuti &amp; Izin</h3>
                          <p className="text-[11px] text-slate-500 font-mono-num truncate">
                            Sisa kuota {leaveSummary.remainingAnnualDays}/{ANNUAL_LEAVE_QUOTA} hari · {leaveSummary.pendingCount} pending
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowLeaveModal(true)}
                        className="px-3 py-2 rounded-xl bg-[#0B1220] text-white text-xs font-semibold hover:bg-slate-800 transition-colors shrink-0 min-h-[40px]"
                      >
                        + Ajukan
                      </button>
                    </div>

                    {/* Quick 3-Metric Strip */}
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 text-center">
                        <p className="font-mono-num text-lg font-bold text-slate-900">
                          {currentMonthSummary.daysCount}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Hari Hadir</p>
                      </div>
                      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 text-center">
                        <p className="font-mono-num text-lg font-bold text-amber-600">
                          {currentMonthSummary.lateCount}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Terlambat</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('cuti')}
                        className="bg-white rounded-2xl border border-slate-200/80 p-3 text-center hover:bg-slate-50 transition-colors"
                      >
                        <p className="font-mono-num text-lg font-bold text-emerald-600">
                          {leaveSummary.remainingAnnualDays}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Sisa Cuti</p>
                      </button>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-900">
                          Aktivitas Presensi Terbaru
                        </h3>
                        <button
                          type="button"
                          onClick={() => setActiveTab('presensi')}
                          className="text-xs font-semibold text-emerald-600"
                        >
                          Semua
                        </button>
                      </div>
                      {myAttendance.length === 0 ? (
                        <div className="p-5 text-center text-xs text-slate-500">
                          Belum ada catatan presensi. Ketuk Clock-In Foto Selfie di atas.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {myAttendance.slice(0, 3).map((att) => (
                            <div
                              key={att.id}
                              className="px-4 py-3 flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {att.checkInPhoto ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPhotoPreview({
                                        title: `Selfie Masuk · ${formatDateDDMMMYYYY(att.dateKey)}`,
                                        src: att.checkInPhoto,
                                      })
                                    }
                                    className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shrink-0"
                                  >
                                    <img
                                      src={att.checkInPhoto}
                                      alt="Selfie"
                                      className="w-full h-full object-cover"
                                    />
                                  </button>
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                                    <Clock className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-mono-num text-xs font-semibold text-slate-900">
                                    {formatDateDDMMMYYYY(att.dateKey)}
                                  </p>
                                  <p className="text-[11px] text-slate-500 font-mono-num truncate">
                                    {att.checkInTime || '--:--'} → {att.checkOutTime || 'Belum pulang'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-mono-num text-xs font-bold text-emerald-600">
                                  +{formatIDR(att.dailyRateSnapshot)}
                                </p>
                                <p
                                  className={`text-[10px] font-semibold ${
                                    att.status === 'late' ? 'text-amber-600' : 'text-slate-500'
                                  }`}
                                >
                                  {att.status === 'late' ? 'Terlambat' : 'Tepat Waktu'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PRESENSI */}
              {activeTab === 'presensi' && (
                <div className="p-4 space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="font-display text-base font-bold text-slate-900">
                          Presensi Foto Selfie
                        </h2>
                        <p className="text-xs text-slate-500 font-mono-num mt-0.5">
                          {todayFormatted} · {timeFormatted}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowLeaveModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold hover:bg-slate-200 transition-colors min-h-[40px]"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Ajukan Cuti
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-200 p-3 bg-slate-50 flex flex-col items-center text-center">
                        <span className="text-[11px] font-semibold text-slate-600">Selfie Masuk</span>
                        {todayRecord?.checkInPhoto ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPhotoPreview({
                                title: `Selfie Masuk · ${todayFormatted}`,
                                src: todayRecord.checkInPhoto,
                              })
                            }
                            className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-slate-200"
                          >
                            <img
                              src={todayRecord.checkInPhoto}
                              alt="Selfie masuk"
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ) : (
                          <div className="mt-2 w-20 h-20 rounded-xl bg-slate-200/60 flex items-center justify-center text-slate-400">
                            <Camera className="w-6 h-6" />
                          </div>
                        )}
                        <span className="mt-2 font-mono-num text-xs font-bold text-slate-900">
                          {todayRecord?.checkInTime || '--:--:--'}
                        </span>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-3 bg-slate-50 flex flex-col items-center text-center">
                        <span className="text-[11px] font-semibold text-slate-600">
                          Selfie Pulang
                        </span>
                        {todayRecord?.checkOutPhoto ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPhotoPreview({
                                title: `Selfie Pulang · ${todayFormatted}`,
                                src: todayRecord.checkOutPhoto,
                              })
                            }
                            className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-slate-200"
                          >
                            <img
                              src={todayRecord.checkOutPhoto}
                              alt="Selfie pulang"
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ) : (
                          <div className="mt-2 w-20 h-20 rounded-xl bg-slate-200/60 flex items-center justify-center text-slate-400">
                            <Camera className="w-6 h-6" />
                          </div>
                        )}
                        <span className="mt-2 font-mono-num text-xs font-bold text-slate-900">
                          {todayRecord?.checkOutTime || '--:--:--'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      {!todayRecord ? (
                        <button
                          type="button"
                          onClick={() => setCameraMode('clock-in')}
                          className="w-full py-3.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 min-h-[48px]"
                        >
                          <Camera className="w-4 h-4" />
                          Buka Kamera Clock-In
                        </button>
                      ) : !todayRecord.checkOutTime ? (
                        <button
                          type="button"
                          onClick={() => setCameraMode('clock-out')}
                          className="w-full py-3.5 rounded-xl bg-[#0B1220] text-white text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 min-h-[48px]"
                        >
                          <Camera className="w-4 h-4 text-emerald-400" />
                          Buka Kamera Clock-Out
                        </button>
                      ) : (
                        <div className="py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold text-center">
                          Clock-In &amp; Clock-Out Hari Ini Sudah Tercatat
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Full Attendance Log */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <h3 className="text-xs font-bold text-slate-900">Log Kehadiran Lengkap</h3>
                    </div>
                    {myAttendance.length === 0 ? (
                      <p className="p-5 text-center text-xs text-slate-500">
                        Belum ada log presensi tersimpan.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {myAttendance.map((att) => (
                          <div
                            key={att.id}
                            className="px-4 py-3 flex items-center justify-between gap-2"
                          >
                            <div>
                              <p className="font-mono-num text-xs font-semibold text-slate-900">
                                {formatDateDDMMMYYYY(att.dateKey)}
                              </p>
                              <p className="font-mono-num text-[11px] text-slate-500">
                                In {att.checkInTime} · Out {att.checkOutTime || '-'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {att.checkInPhoto && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPhotoPreview({
                                      title: `Selfie Masuk · ${formatDateDDMMMYYYY(att.dateKey)}`,
                                      src: att.checkInPhoto,
                                    })
                                  }
                                  className="text-[11px] font-semibold text-emerald-700 underline"
                                >
                                  Foto In
                                </button>
                              )}
                              {att.checkOutPhoto && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPhotoPreview({
                                      title: `Selfie Pulang · ${formatDateDDMMMYYYY(att.dateKey)}`,
                                      src: att.checkOutPhoto,
                                    })
                                  }
                                  className="text-[11px] font-semibold text-slate-700 underline"
                                >
                                  Foto Out
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: CUTI (PENGAJUAN CUTI & IZIN) */}
              {activeTab === 'cuti' && (
                <div>
                  <div className="bg-[#0B1220] text-white px-5 pt-4 pb-7 rounded-b-[30px]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-emerald-400 font-semibold">
                          Layanan Karyawan
                        </p>
                        <h2 className="font-display text-lg font-bold text-white mt-0.5">
                          Pengajuan Cuti &amp; Izin
                        </h2>
                      </div>
                      <span className="font-mono-num text-[11px] text-slate-400">
                        {todayFormatted}
                      </span>
                    </div>

                    <div className="mt-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/60 border border-slate-800 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Sisa Kuota Cuti Tahunan</span>
                        <CalendarOff className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="font-mono-num text-2xl font-bold text-white">
                          {leaveSummary.remainingAnnualDays}
                        </span>
                        <span className="text-xs text-slate-400 font-mono-num">
                          / {ANNUAL_LEAVE_QUOTA} hari tersisa
                        </span>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-[11px]">
                        <div>
                          <span className="font-mono-num font-bold text-amber-400 block">
                            {leaveSummary.pendingCount}
                          </span>
                          <span className="text-slate-400">Menunggu</span>
                        </div>
                        <div>
                          <span className="font-mono-num font-bold text-emerald-400 block">
                            {leaveSummary.approvedCount}
                          </span>
                          <span className="text-slate-400">Disetujui</span>
                        </div>
                        <div>
                          <span className="font-mono-num font-bold text-rose-400 block">
                            {leaveSummary.rejectedCount}
                          </span>
                          <span className="text-slate-400">Ditolak</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 -mt-3.5 space-y-3.5 pb-4">
                    <button
                      type="button"
                      onClick={() => setShowLeaveModal(true)}
                      className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 active:scale-[0.99] transition-all min-h-[48px] shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      Ajukan Cuti / Izin Baru
                    </button>

                    {/* Segmented Status Filter */}
                    <div className="grid grid-cols-4 gap-1 p-1 bg-white rounded-xl border border-slate-200/80 text-[11px]">
                      {(
                        [
                          { id: 'all', label: 'Semua' },
                          { id: 'pending', label: 'Menunggu' },
                          { id: 'approved', label: 'Disetujui' },
                          { id: 'rejected', label: 'Ditolak' },
                        ] as const
                      ).map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setLeaveFilter(st.id)}
                          className={`py-1.5 rounded-lg font-semibold transition-colors ${
                            leaveFilter === st.id
                              ? 'bg-[#0B1220] text-white'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>

                    {/* Leave History List */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-900">Riwayat Pengajuan</h3>
                        <span className="font-mono-num text-[11px] text-slate-500">
                          {filteredMyLeaves.length} data
                        </span>
                      </div>

                      {filteredMyLeaves.length === 0 ? (
                        <div className="p-6 text-center space-y-2">
                          <CalendarOff className="w-7 h-7 text-slate-300 mx-auto" />
                          <p className="text-xs text-slate-500">
                            Belum ada pengajuan cuti pada kategori ini.
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {filteredMyLeaves.map((lv) => (
                            <div key={lv.id} className="p-4 space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-xs font-bold text-slate-900">
                                    {lv.leaveType} ·{' '}
                                    <span className="font-mono-num">{lv.totalDays} hari</span>
                                  </p>
                                  <p className="font-mono-num text-[11px] text-slate-500 mt-0.5">
                                    {formatDateDDMMMYYYY(lv.startDate)} –{' '}
                                    {formatDateDDMMMYYYY(lv.endDate)}
                                  </p>
                                </div>
                                <span
                                  className={`text-[11px] font-semibold shrink-0 ${
                                    lv.status === 'approved'
                                      ? 'text-emerald-600'
                                      : lv.status === 'rejected'
                                      ? 'text-rose-600'
                                      : 'text-amber-600'
                                  }`}
                                >
                                  {lv.status === 'approved'
                                    ? 'Disetujui'
                                    : lv.status === 'rejected'
                                    ? 'Ditolak'
                                    : 'Menunggu HR'}
                                </span>
                              </div>

                              <p className="text-xs text-slate-600 leading-relaxed">{lv.reason}</p>

                              {lv.adminNote && (
                                <p className="text-[11px] text-slate-500 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100">
                                  Catatan HR: {lv.adminNote}
                                </p>
                              )}

                              {lv.status === 'pending' && (
                                <div className="pt-1 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleCancelLeave(lv.id)}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Batalkan Pengajuan
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: LAPORAN */}
              {activeTab === 'laporan' && (
                <div className="p-4 space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="font-display text-base font-bold text-slate-900">
                          Laporan Kehadiran &amp; Gaji
                        </h2>
                        <p className="text-xs text-slate-500">Model gajian harian per hari masuk</p>
                      </div>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-3 py-1.5 text-xs font-mono-num font-semibold rounded-xl border border-slate-200 bg-slate-50"
                      >
                        {availableMonths.map((m) => (
                          <option key={m} value={m}>
                            {formatMonthMMMYYYY(m)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-4 rounded-xl bg-[#0B1220] text-white p-4">
                      <p className="text-xs text-slate-400">
                        Total Pendapatan Tercatat ({formatMonthMMMYYYY(selectedMonth)})
                      </p>
                      <p className="mt-1 font-mono-num text-2xl font-bold text-emerald-400">
                        {formatIDR(reportSummary.totalWage)}
                      </p>
                      <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <p className="font-mono-num font-bold text-white">
                            {reportSummary.daysCount}
                          </p>
                          <p className="text-[10px] text-slate-400">Total Masuk</p>
                        </div>
                        <div>
                          <p className="font-mono-num font-bold text-emerald-400">
                            {reportSummary.onTimeCount}
                          </p>
                          <p className="text-[10px] text-slate-400">Tepat Waktu</p>
                        </div>
                        <div>
                          <p className="font-mono-num font-bold text-amber-400">
                            {reportSummary.lateCount}
                          </p>
                          <p className="text-[10px] text-slate-400">Terlambat</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-900">
                        Rincian Harian ({monthAttendance.length} hari)
                      </h3>
                      <span className="font-mono-num text-[11px] text-slate-500">
                        {formatIDR(employee.dailyRate)}/hari
                      </span>
                    </div>
                    {monthAttendance.length === 0 ? (
                      <p className="p-5 text-center text-xs text-slate-500">
                        Belum ada data kehadiran di periode {formatMonthMMMYYYY(selectedMonth)}.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {monthAttendance.map((att) => (
                          <div key={att.id} className="px-4 py-3 flex items-center justify-between">
                            <div>
                              <p className="font-mono-num text-xs font-semibold text-slate-900">
                                {formatDateDDMMMYYYY(att.dateKey)}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {att.status === 'late' ? 'Hadir (Terlambat)' : 'Hadir Tepat Waktu'} ·{' '}
                                <span className="font-mono-num">{att.checkInTime}</span>
                              </p>
                            </div>
                            <span className="font-mono-num text-xs font-bold text-emerald-600">
                              +{formatIDR(att.dailyRateSnapshot || employee.dailyRate)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <h3 className="text-xs font-bold text-slate-900">
                        Riwayat Pencairan Payroll HR
                      </h3>
                    </div>
                    {myPayrolls.length === 0 ? (
                      <p className="p-4 text-center text-xs text-slate-500">
                        Belum ada slip payroll diproses untuk periode ini.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {myPayrolls.map((pay) => (
                          <div key={pay.id} className="px-4 py-3 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold text-slate-900">
                                Periode {formatMonthMMMYYYY(pay.periodMonth)}
                              </p>
                              <p className="text-[11px] text-slate-500 font-mono-num">
                                {pay.daysPresent} hari × {formatIDR(pay.dailyRate)}
                                {pay.paidDate ? ` · ${formatDateDDMMMYYYY(pay.paidDate)}` : ''}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono-num text-xs font-bold text-slate-900">
                                {formatIDR(pay.totalAmount)}
                              </p>
                              <span
                                className={`text-[10px] font-semibold ${
                                  pay.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                                }`}
                              >
                                {pay.status === 'paid' ? 'Sudah Dibayar' : 'Draft HR'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: PROFIL (BIODATA & GAJI) */}
              {activeTab === 'profil' && (
                <div className="p-4 space-y-4">
                  <div className="bg-[#0B1220] text-white rounded-2xl p-5">
                    <div className="flex items-center gap-3.5">
                      {employee.avatarUrl ? (
                        <img
                          src={employee.avatarUrl}
                          alt={employee.name}
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 rounded-2xl object-cover border border-slate-700"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 font-bold text-lg flex items-center justify-center">
                          {getInitials(employee.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h2 className="font-display text-base font-bold text-white truncate">
                          {employee.name}
                        </h2>
                        <p className="text-xs text-emerald-400 font-medium">
                          {employee.positionTitle}
                        </p>
                        <p className="font-mono-num text-[11px] text-slate-400 mt-0.5">
                          {employee.employeeCode} · {employee.department}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-xs font-bold text-slate-900">Informasi Gaji Harian</h3>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700">
                        {employee.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                        <p className="text-[11px] text-slate-500">Tarif Gaji Harian</p>
                        <p className="font-mono-num text-sm font-bold text-slate-900 mt-0.5">
                          {formatIDR(employee.dailyRate)}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">per hari masuk</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                        <p className="text-[11px] text-slate-500">Estimasi 22 Hari</p>
                        <p className="font-mono-num text-sm font-bold text-emerald-600 mt-0.5">
                          {formatIDR(employee.dailyRate * 22)}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">proyeksi bulanan</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-slate-700" />
                        <h3 className="text-xs font-bold text-slate-900">Biodata Karyawan</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingProfile(!editingProfile)}
                        className="text-xs font-semibold text-emerald-600"
                      >
                        {editingProfile ? 'Batal' : 'Ubah Kontak'}
                      </button>
                    </div>

                    {editingProfile ? (
                      <form onSubmit={handleSaveProfile} className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Nomor HP
                          </label>
                          <input
                            type="text"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">
                              Bank
                            </label>
                            <input
                              type="text"
                              value={editBank}
                              onChange={(e) => setEditBank(e.target.value)}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">
                              No. Rekening
                            </label>
                            <input
                              type="text"
                              value={editAccount}
                              onChange={(e) => setEditAccount(e.target.value)}
                              className="w-full px-3 py-2 text-xs font-mono-num rounded-xl border border-slate-200 bg-slate-50"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={savingProfile}
                          className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold"
                        >
                          {savingProfile ? 'Menyimpan...' : 'Simpan Biodata'}
                        </button>
                      </form>
                    ) : (
                      <dl className="divide-y divide-slate-100 text-xs">
                        <div className="py-2.5 flex justify-between gap-2">
                          <dt className="text-slate-500">Email</dt>
                          <dd className="font-medium text-slate-900 truncate">{employee.email}</dd>
                        </div>
                        <div className="py-2.5 flex justify-between gap-2">
                          <dt className="text-slate-500">No. HP</dt>
                          <dd className="font-mono-num font-medium text-slate-900">
                            {employee.phone || '-'}
                          </dd>
                        </div>
                        <div className="py-2.5 flex justify-between gap-2">
                          <dt className="text-slate-500">Tanggal Bergabung</dt>
                          <dd className="font-mono-num font-medium text-slate-900">
                            {formatDateDDMMMYYYY(employee.joinDate)}
                          </dd>
                        </div>
                        <div className="py-2.5 flex justify-between gap-2">
                          <dt className="text-slate-500">Rekening Payroll</dt>
                          <dd className="font-mono-num font-medium text-slate-900">
                            {employee.bankName} · {employee.bankAccount || '-'}
                          </dd>
                        </div>
                        <div className="py-2.5 flex justify-between gap-2">
                          <dt className="text-slate-500">Jadwal Kerja</dt>
                          <dd className="font-medium text-slate-900">
                            {employeeSchedule?.name ?? 'Shift Reguler'}
                          </dd>
                        </div>
                      </dl>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {isAdmin && allEmployees.length > 0 && (
                      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Mode Pratinjau Admin (Multi-Karyawan)
                        </div>
                        <select
                          value={selectedPreviewEmployeeId ?? employee.id}
                          onChange={(e) => onSelectPreviewEmployee(e.target.value || null)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50"
                        >
                          {allEmployees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.employeeCode} — {emp.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={onSwitchToBackoffice}
                          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0B1220] text-white text-xs font-semibold"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          Kembali ke Panel Backoffice
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <PWAInstallButton variant="light" />
                      <button
                        type="button"
                        onClick={onSignOut}
                        className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors min-h-[40px]"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Keluar Akun
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Fixed 5-Tab Bottom Navigation Bar Inside Phone */}
            <nav
              aria-label="Navigasi Mobile Karyawan"
              className="absolute bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/80 grid grid-cols-5 h-16 pb-safe"
            >
              {(
                [
                  { id: 'beranda', label: 'Beranda', icon: Home },
                  { id: 'presensi', label: 'Presensi', icon: Camera },
                  { id: 'cuti', label: 'Cuti', icon: CalendarOff },
                  { id: 'laporan', label: 'Laporan', icon: BarChart3 },
                  { id: 'profil', label: 'Profil', icon: User },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`relative flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors ${
                      isActive ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 1.8} />
                    <span className="text-[10px] font-semibold tracking-tight">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Modals Contained Inside Smartphone Screen */}
            {cameraMode && (
              <SelfieCameraModal
                mode={cameraMode}
                employeeName={employee.name}
                onConfirm={handleConfirmSelfie}
                onClose={() => setCameraMode(null)}
              />
            )}

            {photoPreview && (
              <div className="fixed min-[450px]:absolute inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
                <div className="w-full max-w-xs bg-white rounded-2xl overflow-hidden shadow-xl border border-slate-200">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{photoPreview.title}</span>
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="p-1 rounded-lg text-slate-500 hover:bg-slate-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <img
                    src={photoPreview.src}
                    alt={photoPreview.title}
                    className="w-full aspect-square object-cover"
                  />
                </div>
              </div>
            )}

            {showLeaveModal && (
              <div className="fixed min-[450px]:absolute inset-0 z-50 flex items-end justify-center bg-slate-950/65 backdrop-blur-sm">
                <div className="w-full bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-200 max-h-[90%] overflow-y-auto">
                  <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-3" />
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-sm font-bold text-slate-900">Ajukan Cuti / Izin</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLeaveModal(false)}
                      className="p-1.5 rounded-full bg-slate-100 text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmitLeave} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Jenis Cuti / Izin
                      </label>
                      <select
                        value={leaveType}
                        onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50"
                      >
                        <option value="Cuti Tahunan">Cuti Tahunan</option>
                        <option value="Izin Sakit">Izin Sakit</option>
                        <option value="Izin Pribadi">Izin Pribadi</option>
                        <option value="Cuti Melahirkan">Cuti Melahirkan</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Mulai ({formatDateDDMMMYYYY(leaveStart)})
                        </label>
                        <input
                          type="date"
                          value={leaveStart}
                          onChange={(e) => {
                            setLeaveStart(e.target.value);
                            if (leaveEnd < e.target.value) setLeaveEnd(e.target.value);
                          }}
                          required
                          className="w-full px-3 py-2 text-xs font-mono-num rounded-xl border border-slate-200 bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Sampai ({formatDateDDMMMYYYY(leaveEnd)})
                        </label>
                        <input
                          type="date"
                          min={leaveStart}
                          value={leaveEnd}
                          onChange={(e) => setLeaveEnd(e.target.value)}
                          required
                          className="w-full px-3 py-2 text-xs font-mono-num rounded-xl border border-slate-200 bg-slate-50"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 flex items-center justify-between">
                      <span>Total Durasi</span>
                      <span className="font-mono-num font-bold text-slate-900">
                        {countDaysInclusive(leaveStart, leaveEnd)} Hari
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Alasan Pengajuan
                      </label>
                      <textarea
                        rows={3}
                        required
                        minLength={3}
                        maxLength={500}
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        placeholder="Jelaskan keperluan cuti atau izin..."
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={leaveSubmitting}
                      className="w-full py-3.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors min-h-[48px]"
                    >
                      {leaveSubmitting ? 'Mengirim Pengajuan...' : 'Kirim Pengajuan Cuti'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </SmartphoneShell>
    </div>
  );
};
