import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  CalendarClock,
  Camera,
  Check,
  Crown,
  Download,
  Edit3,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Smartphone,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type {
  Attendance,
  AttendanceStatus,
  BackofficeSection,
  Employee,
  LeaveRequest,
  LeaveType,
  PayrollRecord,
  Position,
  WorkSchedule,
} from '../types/hrm';
import {
  adminSaveAttendance,
  deleteAttendance,
  deleteEmployee,
  deletePosition,
  deleteWorkSchedule,
  reviewLeaveRequest,
  saveEmployee,
  savePosition,
  saveWorkSchedule,
  submitLeaveRequest,
  upsertPayrollRecord,
} from '../firebase/hrmService';
import {
  countDaysInclusive,
  formatDateDDMMMYYYY,
  formatIDR,
  formatMonthMMMYYYY,
  getInitials,
  getLocalDateKey,
  getLocalMonthKey,
} from '../utils/formatters';

interface BackofficeAppProps {
  authUser: { uid: string; email: string; displayName: string };
  employees: Employee[];
  positions: Position[];
  schedules: WorkSchedule[];
  attendanceList: Attendance[];
  leaveRequests: LeaveRequest[];
  payrolls: PayrollRecord[];
  onSwitchToMobile: () => void;
  onSignOut: () => Promise<void>;
}

const ALL_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export const BackofficeApp: React.FC<BackofficeAppProps> = ({
  authUser,
  employees,
  positions,
  schedules,
  attendanceList,
  leaveRequests,
  payrolls,
  onSwitchToMobile,
  onSignOut,
}) => {
  const [section, setSection] = useState<BackofficeSection>('ringkasan');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Karyawan & Jabatan state
  const [empTab, setEmpTab] = useState<'employees' | 'positions'>('employees');
  const [empSearch, setEmpSearch] = useState('');
  const [empStatusFilter, setEmpStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  const [showPosModal, setShowPosModal] = useState(false);
  const [editingPos, setEditingPos] = useState<Position | null>(null);

  // Jadwal Kerja state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);

  // Kehadiran state
  const [attDateFilter, setAttDateFilter] = useState('');
  const [attSearch, setAttSearch] = useState('');
  const [attStatusFilter, setAttStatusFilter] = useState<'all' | 'present' | 'late'>('all');
  const [photoInspect, setPhotoInspect] = useState<{ title: string; subtitle: string; src: string } | null>(null);
  const [showManualAttModal, setShowManualAttModal] = useState(false);

  // Cuti state
  const [leaveFilter, setLeaveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [reviewingLeave, setReviewingLeave] = useState<LeaveRequest | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [showAddLeaveModal, setShowAddLeaveModal] = useState(false);
  const [fLeaveEmpId, setFLeaveEmpId] = useState('');
  const [fLeaveType, setFLeaveType] = useState<LeaveType>('Cuti Tahunan');
  const [fLeaveStart, setFLeaveStart] = useState(() => getLocalDateKey());
  const [fLeaveEnd, setFLeaveEnd] = useState(() => getLocalDateKey());
  const [fLeaveReason, setFLeaveReason] = useState('');

  // Payroll state
  const [payrollMonth, setPayrollMonth] = useState(() => getLocalMonthKey());
  const [payrollBusyId, setPayrollBusyId] = useState<string | null>(null);

  // Form states: Employee
  const [fEmpCode, setFEmpCode] = useState('');
  const [fEmpName, setFEmpName] = useState('');
  const [fEmpEmail, setFEmpEmail] = useState('');
  const [fEmpPhone, setFEmpPhone] = useState('');
  const [fEmpPosId, setFEmpPosId] = useState('');
  const [fEmpSchId, setFEmpSchId] = useState('');
  const [fEmpRate, setFEmpRate] = useState(300000);
  const [fEmpJoinDate, setFEmpJoinDate] = useState(() => getLocalDateKey());
  const [fEmpBank, setFEmpBank] = useState('BCA');
  const [fEmpAcc, setFEmpAcc] = useState('');
  const [fEmpStatus, setFEmpStatus] = useState<'active' | 'inactive'>('active');

  // Form states: Position
  const [fPosTitle, setFPosTitle] = useState('');
  const [fPosDept, setFPosDept] = useState('');
  const [fPosRate, setFPosRate] = useState(300000);
  const [fPosDesc, setFPosDesc] = useState('');

  // Form states: WorkSchedule
  const [fSchName, setFSchName] = useState('');
  const [fSchDays, setFSchDays] = useState<string[]>(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);
  const [fSchStart, setFSchStart] = useState('08:30');
  const [fSchEnd, setFSchEnd] = useState('17:30');
  const [fSchTolerance, setFSchTolerance] = useState(15);
  const [fSchDefault, setFSchDefault] = useState(false);

  // Form states: Manual Attendance
  const [fAttEmpId, setFAttEmpId] = useState('');
  const [fAttDate, setFAttDate] = useState(() => getLocalDateKey());
  const [fAttIn, setFAttIn] = useState('08:25:00');
  const [fAttOut, setFAttOut] = useState('17:30:00');
  const [fAttStatus, setFAttStatus] = useState<AttendanceStatus>('present');
  const [fAttNotes, setFAttNotes] = useState('Input manual HR');

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const todayKey = getLocalDateKey();
  const todayFormatted = formatDateDDMMMYYYY(todayKey);
  const currentMonthKey = getLocalMonthKey();

  const todayAttendance = useMemo(
    () => attendanceList.filter((a) => a.dateKey === todayKey),
    [attendanceList, todayKey]
  );

  const pendingLeaves = useMemo(
    () => leaveRequests.filter((l) => l.status === 'pending'),
    [leaveRequests]
  );

  const currentMonthPayrollTotal = useMemo(() => {
    return attendanceList
      .filter(
        (a) =>
          a.dateKey.startsWith(currentMonthKey) &&
          (a.status === 'present' || a.status === 'late')
      )
      .reduce((sum, a) => sum + (a.dailyRateSnapshot || 0), 0);
  }, [attendanceList, currentMonthKey]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (empStatusFilter !== 'all' && e.status !== empStatusFilter) return false;
      if (empSearch.trim()) {
        const q = empSearch.toLowerCase();
        return (
          e.name.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q) ||
          e.positionTitle.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [employees, empStatusFilter, empSearch]);

  const filteredAttendance = useMemo(() => {
    return attendanceList.filter((a) => {
      if (attDateFilter && a.dateKey !== attDateFilter) return false;
      if (attStatusFilter !== 'all' && a.status !== attStatusFilter) return false;
      if (attSearch.trim()) {
        const q = attSearch.toLowerCase();
        return (
          a.employeeName.toLowerCase().includes(q) ||
          a.positionTitle.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [attendanceList, attDateFilter, attStatusFilter, attSearch]);

  const filteredLeaves = useMemo(() => {
    return leaveRequests.filter((l) => {
      if (leaveFilter !== 'all' && l.status !== leaveFilter) return false;
      return true;
    });
  }, [leaveRequests, leaveFilter]);

  const availablePayrollMonths = useMemo(() => {
    const set = new Set<string>([currentMonthKey]);
    attendanceList.forEach((a) => set.add(a.dateKey.slice(0, 7)));
    payrolls.forEach((p) => set.add(p.periodMonth));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [attendanceList, payrolls, currentMonthKey]);

  // Real-time Daily Payroll Computation
  const payrollRows = useMemo(() => {
    return employees.map((emp) => {
      const attInPeriod = attendanceList.filter(
        (a) =>
          a.employeeId === emp.id &&
          a.dateKey.startsWith(payrollMonth) &&
          (a.status === 'present' || a.status === 'late')
      );
      const daysPresent = attInPeriod.length;
      const computedAmount = attInPeriod.reduce(
        (sum, a) => sum + (a.dailyRateSnapshot || emp.dailyRate),
        0
      );
      const savedRecord = payrolls.find(
        (p) => p.employeeId === emp.id && p.periodMonth === payrollMonth
      );
      return {
        employee: emp,
        daysPresent,
        dailyRate: emp.dailyRate,
        totalAmount: computedAmount,
        savedRecord: savedRecord ?? null,
      };
    });
  }, [employees, attendanceList, payrolls, payrollMonth]);

  const payrollPeriodTotals = useMemo(() => {
    const totalDays = payrollRows.reduce((s, r) => s + r.daysPresent, 0);
    const totalAmount = payrollRows.reduce((s, r) => s + r.totalAmount, 0);
    const paidCount = payrollRows.filter((r) => r.savedRecord?.status === 'paid').length;
    return { totalDays, totalAmount, paidCount };
  }, [payrollRows]);

  // Modal Openers
  const openNewEmpModal = () => {
    const defaultPos = positions[0];
    const defaultSch = schedules.find((s) => s.isDefault) ?? schedules[0];
    setEditingEmp(null);
    setFEmpCode(`EMP-00${employees.length + 1}`);
    setFEmpName('');
    setFEmpEmail('');
    setFEmpPhone('');
    setFEmpPosId(defaultPos?.id ?? '');
    setFEmpSchId(defaultSch?.id ?? '');
    setFEmpRate(defaultPos?.dailyRate ?? 300000);
    setFEmpJoinDate(getLocalDateKey());
    setFEmpBank('BCA');
    setFEmpAcc('');
    setFEmpStatus('active');
    setShowEmpModal(true);
  };

  const openEditEmpModal = (emp: Employee) => {
    setEditingEmp(emp);
    setFEmpCode(emp.employeeCode);
    setFEmpName(emp.name);
    setFEmpEmail(emp.email);
    setFEmpPhone(emp.phone);
    setFEmpPosId(emp.positionId);
    setFEmpSchId(emp.scheduleId);
    setFEmpRate(emp.dailyRate);
    setFEmpJoinDate(emp.joinDate);
    setFEmpBank(emp.bankName);
    setFEmpAcc(emp.bankAccount);
    setFEmpStatus(emp.status);
    setShowEmpModal(true);
  };

  const handleSaveEmp = async (e: React.FormEvent) => {
    e.preventDefault();
    const pos = positions.find((p) => p.id === fEmpPosId);
    await saveEmployee({
      id: editingEmp?.id,
      employeeCode: fEmpCode,
      userId: editingEmp?.userId ?? '',
      name: fEmpName,
      email: fEmpEmail,
      phone: fEmpPhone,
      positionId: pos?.id ?? fEmpPosId,
      positionTitle: pos?.title ?? editingEmp?.positionTitle ?? 'Staff',
      department: pos?.department ?? editingEmp?.department ?? 'Operations',
      scheduleId: fEmpSchId || 'SCH-DEFAULT',
      dailyRate: fEmpRate,
      joinDate: fEmpJoinDate,
      avatarUrl: editingEmp?.avatarUrl ?? '',
      bankName: fEmpBank,
      bankAccount: fEmpAcc,
      status: fEmpStatus,
    });
    setShowEmpModal(false);
    notify(editingEmp ? 'Data karyawan diperbarui.' : 'Karyawan baru ditambahkan.');
  };

  const openNewPosModal = () => {
    setEditingPos(null);
    setFPosTitle('');
    setFPosDept('');
    setFPosRate(300000);
    setFPosDesc('');
    setShowPosModal(true);
  };

  const openEditPosModal = (pos: Position) => {
    setEditingPos(pos);
    setFPosTitle(pos.title);
    setFPosDept(pos.department);
    setFPosRate(pos.dailyRate);
    setFPosDesc(pos.description);
    setShowPosModal(true);
  };

  const handleSavePos = async (e: React.FormEvent) => {
    e.preventDefault();
    await savePosition({
      id: editingPos?.id,
      title: fPosTitle,
      department: fPosDept,
      dailyRate: fPosRate,
      description: fPosDesc,
    });
    setShowPosModal(false);
    notify(editingPos ? 'Jabatan diperbarui.' : 'Jabatan baru ditambahkan.');
  };

  const openNewScheduleModal = () => {
    setEditingSchedule(null);
    setFSchName('');
    setFSchDays(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);
    setFSchStart('08:30');
    setFSchEnd('17:30');
    setFSchTolerance(15);
    setFSchDefault(false);
    setShowScheduleModal(true);
  };

  const openEditScheduleModal = (sch: WorkSchedule) => {
    setEditingSchedule(sch);
    setFSchName(sch.name);
    setFSchDays(sch.activeDays);
    setFSchStart(sch.startTime);
    setFSchEnd(sch.endTime);
    setFSchTolerance(sch.lateToleranceMinutes);
    setFSchDefault(sch.isDefault);
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveWorkSchedule({
      id: editingSchedule?.id,
      name: fSchName,
      activeDays: fSchDays,
      startTime: fSchStart,
      endTime: fSchEnd,
      lateToleranceMinutes: fSchTolerance,
      isDefault: fSchDefault,
    });
    setShowScheduleModal(false);
    notify('Jadwal hari & jam kerja disimpan.');
  };

  const handleSaveManualAtt = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === fAttEmpId) ?? employees[0];
    if (!emp) return;
    await adminSaveAttendance({
      employee: emp,
      dateKey: fAttDate,
      checkInTime: fAttIn,
      checkOutTime: fAttOut,
      status: fAttStatus,
      notes: fAttNotes,
    });
    setShowManualAttModal(false);
    notify(`Kehadiran ${emp.name} (${formatDateDDMMMYYYY(fAttDate)}) disimpan.`);
  };

  const handleProcessPayrollRow = async (
    row: (typeof payrollRows)[number],
    status: 'draft' | 'paid'
  ) => {
    setPayrollBusyId(row.employee.id);
    try {
      await upsertPayrollRecord({
        employee: row.employee,
        periodMonth: payrollMonth,
        daysPresent: row.daysPresent,
        dailyRate: row.dailyRate,
        totalAmount: row.totalAmount,
        status,
        paidDate: status === 'paid' ? todayKey : '',
        notes: `Payroll harian ${formatMonthMMMYYYY(payrollMonth)} (${row.daysPresent} hari masuk)`,
      });
      notify(
        status === 'paid'
          ? `Payroll ${row.employee.name} ditandai sudah dibayar.`
          : `Draft payroll ${row.employee.name} disimpan.`
      );
    } finally {
      setPayrollBusyId(null);
    }
  };

  const handleExportPayrollCsv = () => {
    const header = [
      'Kode Karyawan',
      'Nama',
      'Jabatan',
      'Periode',
      'Hari Masuk',
      'Tarif Harian (IDR)',
      'Total Gaji (IDR)',
      'Status',
      'Tanggal Bayar',
    ];
    const lines = payrollRows.map((r) => [
      r.employee.employeeCode,
      `"${r.employee.name}"`,
      `"${r.employee.positionTitle}"`,
      formatMonthMMMYYYY(payrollMonth),
      r.daysPresent,
      r.dailyRate,
      r.totalAmount,
      r.savedRecord?.status === 'paid' ? 'Dibayar' : 'Belum Dibayar',
      r.savedRecord?.paidDate ? formatDateDDMMMYYYY(r.savedRecord.paidDate) : '-',
    ]);
    const csv = [header.join(','), ...lines.map((l) => l.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KING-HRM-Payroll-${formatMonthMMMYYYY(payrollMonth)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const navItems: { id: BackofficeSection; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'ringkasan', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'karyawan', label: 'Karyawan & Jabatan', icon: Users },
    { id: 'jadwal', label: 'Hari & Jam Kerja', icon: CalendarClock },
    { id: 'kehadiran', label: 'Data Kehadiran', icon: Camera },
    { id: 'cuti', label: 'Pengajuan Cuti', icon: FileCheck2 },
    { id: 'payroll', label: 'Payroll Harian', icon: Wallet },
  ];

  const sectionTitle = navItems.find((n) => n.id === section)?.label ?? 'Ringkasan';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      {/* Left Sidebar (256px) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0B1220] text-slate-200 flex flex-col shrink-0 transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-5 py-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 whitespace-nowrap">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Crown className="w-4 h-4" />
            </div>
            <span className="font-display text-base font-bold text-white tracking-tight">
              KING HRM
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            const badgeCount = item.id === 'cuti' ? pendingLeaves.length : 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSection(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {badgeCount > 0 && (
                  <span
                    className={`font-mono-num text-xs font-semibold ${
                      active ? 'text-white' : 'text-amber-400'
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/80 space-y-2">
          <button
            type="button"
            onClick={onSwitchToMobile}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 text-slate-100 text-xs font-semibold hover:bg-slate-700 transition-colors"
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            Buka Mobile App Karyawan
          </button>
          <div className="px-2 pt-1 flex items-center justify-between text-xs text-slate-400">
            <span className="truncate max-w-[140px]">{authUser.email}</span>
            <button
              type="button"
              onClick={onSignOut}
              className="text-rose-400 hover:text-rose-300 font-semibold shrink-0"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar (3-zone contract) */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700"
              aria-label="Buka menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="text-slate-400 hidden sm:inline">Backoffice</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="font-display font-bold text-slate-900 truncate">
                {sectionTitle}
              </h1>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4 text-xs text-slate-500">
            <span>Tanggal Sistem:</span>
            <span className="font-mono-num font-semibold text-slate-800">
              {todayFormatted}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onSwitchToMobile}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              Pratinjau HP Karyawan
            </button>
          </div>
        </header>

        {toast && (
          <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-[#0B1220] text-white px-4 py-3 text-xs font-semibold shadow-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toast}</span>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* =========================================================
              1. RINGKASAN (OVERVIEW)
              ========================================================= */}
          {section === 'ringkasan' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <p className="text-xs font-medium text-slate-500">Karyawan Aktif</p>
                  <p className="mt-2 font-mono-num text-2xl font-bold text-slate-900">
                    {employees.filter((e) => e.status === 'active').length}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Dari {employees.length} total terdaftar · {positions.length} jabatan
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <p className="text-xs font-medium text-slate-500">
                    Hadir Hari Ini ({todayFormatted})
                  </p>
                  <p className="mt-2 font-mono-num text-2xl font-bold text-emerald-600">
                    {todayAttendance.length}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {todayAttendance.filter((a) => a.status === 'late').length} terlambat tercatat
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <p className="text-xs font-medium text-slate-500">Pengajuan Cuti Pending</p>
                  <p className="mt-2 font-mono-num text-2xl font-bold text-amber-600">
                    {pendingLeaves.length}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Menunggu persetujuan manajemen
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <p className="text-xs font-medium text-slate-500">
                    Akumulasi Payroll ({formatMonthMMMYYYY(currentMonthKey)})
                  </p>
                  <p className="mt-2 font-mono-num text-2xl font-bold text-slate-900">
                    {formatIDR(currentMonthPayrollTotal)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Perhitungan otomatis berbasis hari masuk
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Live Today Attendance */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h2 className="font-display text-sm font-bold text-slate-900">
                        Presensi Real-Time Hari Ini
                      </h2>
                      <p className="text-xs text-slate-500 font-mono-num">{todayFormatted}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSection('kehadiran')}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      Lihat Semua →
                    </button>
                  </div>
                  {todayAttendance.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      Belum ada karyawan yang melakukan Clock-In hari ini ({todayFormatted}).
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {todayAttendance.map((att) => (
                        <div
                          key={att.id}
                          className="px-5 py-3.5 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {att.checkInPhoto ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPhotoInspect({
                                    title: att.employeeName,
                                    subtitle: `Selfie Clock-In · ${formatDateDDMMMYYYY(att.dateKey)} · ${att.checkInTime}`,
                                    src: att.checkInPhoto,
                                  })
                                }
                                className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shrink-0"
                              >
                                <img
                                  src={att.checkInPhoto}
                                  alt={att.employeeName}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                                {getInitials(att.employeeName)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {att.employeeName}
                              </p>
                              <p className="text-xs text-slate-500 truncate">{att.positionTitle}</p>
                            </div>
                          </div>
                          <div className="text-right font-mono-num text-xs shrink-0">
                            <p className="font-semibold text-slate-900">
                              In {att.checkInTime} · Out {att.checkOutTime || '-'}
                            </p>
                            <p
                              className={`mt-0.5 font-semibold ${
                                att.status === 'late' ? 'text-amber-600' : 'text-emerald-600'
                              }`}
                            >
                              {att.status === 'late' ? 'Terlambat' : 'Hadir'} · +
                              {formatIDR(att.dailyRateSnapshot)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending Leave Queue */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="font-display text-sm font-bold text-slate-900">
                      Antrean Pengajuan Cuti
                    </h2>
                    <button
                      type="button"
                      onClick={() => setSection('cuti')}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      Kelola Cuti →
                    </button>
                  </div>
                  {pendingLeaves.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      Tidak ada pengajuan cuti yang menunggu persetujuan.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {pendingLeaves.slice(0, 4).map((lv) => (
                        <div key={lv.id} className="p-4 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {lv.employeeName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {lv.leaveType} ·{' '}
                                <span className="font-mono-num">
                                  {formatDateDDMMMYYYY(lv.startDate)} –{' '}
                                  {formatDateDDMMMYYYY(lv.endDate)}
                                </span>{' '}
                                ({lv.totalDays} hari)
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600">{lv.reason}</p>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={async () => {
                                await reviewLeaveRequest(lv.id, 'approved', 'Disetujui manajemen');
                                notify(`Cuti ${lv.employeeName} disetujui.`);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                            >
                              Setujui
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await reviewLeaveRequest(lv.id, 'rejected', 'Ditolak manajemen');
                                notify(`Cuti ${lv.employeeName} ditolak.`);
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                            >
                              Tolak
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* =========================================================
              2. DATA KARYAWAN & JABATAN
              ========================================================= */}
          {section === 'karyawan' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="inline-flex p-1 bg-slate-200/70 rounded-xl self-start">
                  <button
                    type="button"
                    onClick={() => setEmpTab('employees')}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      empTab === 'employees'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Data Karyawan ({employees.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmpTab('positions')}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      empTab === 'positions'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Master Jabatan ({positions.length})
                  </button>
                </div>

                {empTab === 'employees' ? (
                  <button
                    type="button"
                    onClick={openNewEmpModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B1220] text-white text-xs font-semibold hover:bg-slate-800 self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Karyawan
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={openNewPosModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B1220] text-white text-xs font-semibold hover:bg-slate-800 self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Jabatan
                  </button>
                )}
              </div>

              {empTab === 'employees' ? (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={empSearch}
                        onChange={(e) => setEmpSearch(e.target.value)}
                        placeholder="Cari nama, ID, atau jabatan..."
                        className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
                      {(['all', 'active', 'inactive'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setEmpStatusFilter(st)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                            empStatusFilter === st
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-600'
                          }`}
                        >
                          {st === 'all' ? 'Semua' : st === 'active' ? 'Aktif' : 'Nonaktif'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                          <th className="py-3 px-4">Karyawan</th>
                          <th className="py-3 px-4">Jabatan & Divisi</th>
                          <th className="py-3 px-4">Tgl Bergabung</th>
                          <th className="py-3 px-4 text-right">Tarif Harian</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredEmployees.map((emp) => (
                          <tr key={emp.id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {emp.avatarUrl ? (
                                  <img
                                    src={emp.avatarUrl}
                                    alt={emp.name}
                                    referrerPolicy="no-referrer"
                                    className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                                    {getInitials(emp.name)}
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold text-slate-900">{emp.name}</p>
                                  <p className="font-mono-num text-[11px] text-slate-500">
                                    {emp.employeeCode} · {emp.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-medium text-slate-800">{emp.positionTitle}</p>
                              <p className="text-[11px] text-slate-500">{emp.department}</p>
                            </td>
                            <td className="py-3 px-4 font-mono-num text-slate-700">
                              {formatDateDDMMMYYYY(emp.joinDate)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono-num font-semibold text-slate-900">
                              {formatIDR(emp.dailyRate)}/hari
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`font-semibold ${
                                  emp.status === 'active' ? 'text-emerald-600' : 'text-slate-400'
                                }`}
                              >
                                {emp.status === 'active' ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditEmpModal(emp)}
                                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                                  aria-label={`Ubah ${emp.name}`}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await deleteEmployee(emp.id);
                                    notify(`Karyawan ${emp.name} dihapus.`);
                                  }}
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                                  aria-label={`Hapus ${emp.name}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {positions.map((pos) => (
                    <div
                      key={pos.id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-medium text-slate-500">{pos.department}</p>
                            <h3 className="font-display text-base font-bold text-slate-900 mt-0.5">
                              {pos.title}
                            </h3>
                          </div>
                          <Briefcase className="w-4 h-4 text-emerald-600 shrink-0" />
                        </div>
                        <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                          {pos.description || 'Tidak ada deskripsi jabatan.'}
                        </p>
                      </div>

                      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-slate-500 block">Tarif Gaji Harian</span>
                          <span className="font-mono-num text-sm font-bold text-emerald-700">
                            {formatIDR(pos.dailyRate)} / hari
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditPosModal(pos)}
                            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await deletePosition(pos.id);
                              notify(`Jabatan ${pos.title} dihapus.`);
                            }}
                            className="p-2 rounded-lg text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              3. DATA HARI & JAM KERJA
              ========================================================= */}
          {section === 'jadwal' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Atur hari kerja aktif, jam masuk, jam pulang, dan batas toleransi keterlambatan.
                </p>
                <button
                  type="button"
                  onClick={openNewScheduleModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B1220] text-white text-xs font-semibold hover:bg-slate-800 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Jadwal Kerja
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schedules.map((sch) => (
                  <div
                    key={sch.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-base font-bold text-slate-900">
                          {sch.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {sch.isDefault ? 'Jadwal Default Perusahaan' : 'Jadwal Shift Khusus'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditScheduleModal(sch)}
                          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteWorkSchedule(sch.id);
                            notify(`Jadwal ${sch.name} dihapus.`);
                          }}
                          className="p-2 rounded-lg text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-xl p-3.5 border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-500 block">Jam Masuk</span>
                        <span className="font-mono-num font-bold text-slate-900 text-sm mt-0.5 block">
                          {sch.startTime}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Jam Pulang</span>
                        <span className="font-mono-num font-bold text-slate-900 text-sm mt-0.5 block">
                          {sch.endTime}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Toleransi</span>
                        <span className="font-mono-num font-bold text-emerald-700 text-sm mt-0.5 block">
                          {sch.lateToleranceMinutes} menit
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-2">Hari Kerja Aktif</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ALL_DAYS.map((day) => {
                          const on = sch.activeDays.includes(day);
                          return (
                            <span
                              key={day}
                              className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                                on
                                  ? 'bg-[#0B1220] text-white'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {day}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================
              4. DATA KEHADIRAN
              ========================================================= */}
          {section === 'kehadiran' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={attSearch}
                      onChange={(e) => setAttSearch(e.target.value)}
                      placeholder="Cari nama karyawan..."
                      className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50"
                    />
                  </div>
                  <input
                    type="date"
                    value={attDateFilter}
                    onChange={(e) => setAttDateFilter(e.target.value)}
                    className="px-3 py-2 text-xs font-mono-num rounded-xl border border-slate-200 bg-slate-50"
                  />
                  {attDateFilter && (
                    <button
                      type="button"
                      onClick={() => setAttDateFilter('')}
                      className="text-xs text-slate-500 hover:text-slate-900 underline"
                    >
                      Reset Tanggal ({formatDateDDMMMYYYY(attDateFilter)})
                    </button>
                  )}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    {(['all', 'present', 'late'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setAttStatusFilter(st)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                          attStatusFilter === st
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600'
                        }`}
                      >
                        {st === 'all' ? 'Semua' : st === 'present' ? 'Tepat Waktu' : 'Terlambat'}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFAttEmpId(employees[0]?.id ?? '');
                    setShowManualAttModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B1220] text-white text-xs font-semibold hover:bg-slate-800 self-start lg:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Input Manual
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Karyawan</th>
                      <th className="py-3 px-4">Clock-In</th>
                      <th className="py-3 px-4">Clock-Out</th>
                      <th className="py-3 px-4">Foto Selfie</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Upah Harian</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-500">
                          Tidak ada data kehadiran yang sesuai filter.
                        </td>
                      </tr>
                    ) : (
                      filteredAttendance.map((att) => (
                        <tr key={att.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-mono-num font-semibold text-slate-900 whitespace-nowrap">
                            {formatDateDDMMMYYYY(att.dateKey)}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{att.employeeName}</p>
                            <p className="text-[11px] text-slate-500">{att.positionTitle}</p>
                          </td>
                          <td className="py-3 px-4 font-mono-num text-slate-800">
                            {att.checkInTime || '-'}
                          </td>
                          <td className="py-3 px-4 font-mono-num text-slate-800">
                            {att.checkOutTime || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {att.checkInPhoto ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPhotoInspect({
                                      title: att.employeeName,
                                      subtitle: `Selfie Masuk · ${formatDateDDMMMYYYY(att.dateKey)} · ${att.checkInTime}`,
                                      src: att.checkInPhoto,
                                    })
                                  }
                                  className="w-8 h-8 rounded-lg overflow-hidden border border-emerald-300"
                                  title="Lihat Selfie Masuk"
                                >
                                  <img
                                    src={att.checkInPhoto}
                                    alt="In"
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400">No In</span>
                              )}
                              {att.checkOutPhoto ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPhotoInspect({
                                      title: att.employeeName,
                                      subtitle: `Selfie Pulang · ${formatDateDDMMMYYYY(att.dateKey)} · ${att.checkOutTime}`,
                                      src: att.checkOutPhoto,
                                    })
                                  }
                                  className="w-8 h-8 rounded-lg overflow-hidden border border-slate-300"
                                  title="Lihat Selfie Pulang"
                                >
                                  <img
                                    src={att.checkOutPhoto}
                                    alt="Out"
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400">No Out</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`font-semibold ${
                                att.status === 'late'
                                  ? 'text-amber-600'
                                  : att.status === 'present'
                                  ? 'text-emerald-600'
                                  : 'text-slate-500'
                              }`}
                            >
                              {att.status === 'late'
                                ? 'Terlambat'
                                : att.status === 'present'
                                ? 'Hadir'
                                : att.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono-num font-semibold text-slate-900">
                            {formatIDR(att.dailyRateSnapshot)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteAttendance(att.id);
                                notify('Log kehadiran dihapus.');
                              }}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                              aria-label="Hapus kehadiran"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================
              5. PENGAJUAN CUTI
              ========================================================= */}
          {section === 'cuti' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setLeaveFilter(st)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                        leaveFilter === st
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600'
                      }`}
                    >
                      {st === 'all'
                        ? 'Semua'
                        : st === 'pending'
                        ? 'Menunggu'
                        : st === 'approved'
                        ? 'Disetujui'
                        : 'Ditolak'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono-num text-xs text-slate-500">
                    {filteredLeaves.length} pengajuan
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFLeaveEmpId(employees[0]?.id ?? '');
                      setFLeaveStart(getLocalDateKey());
                      setFLeaveEnd(getLocalDateKey());
                      setFLeaveReason('');
                      setShowAddLeaveModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B1220] text-white text-xs font-semibold hover:bg-slate-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Input Pengajuan Cuti
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                      <th className="py-3 px-4">Karyawan</th>
                      <th className="py-3 px-4">Jenis Cuti</th>
                      <th className="py-3 px-4">Rentang Tanggal</th>
                      <th className="py-3 px-4">Durasi</th>
                      <th className="py-3 px-4">Alasan</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredLeaves.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-500">
                          Belum ada data pengajuan cuti.
                        </td>
                      </tr>
                    ) : (
                      filteredLeaves.map((lv) => (
                        <tr key={lv.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{lv.employeeName}</p>
                            <p className="text-[11px] text-slate-500">{lv.positionTitle}</p>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">{lv.leaveType}</td>
                          <td className="py-3 px-4 font-mono-num text-slate-700 whitespace-nowrap">
                            {formatDateDDMMMYYYY(lv.startDate)} – {formatDateDDMMMYYYY(lv.endDate)}
                          </td>
                          <td className="py-3 px-4 font-mono-num font-semibold text-slate-900">
                            {lv.totalDays} hari
                          </td>
                          <td className="py-3 px-4 max-w-xs text-slate-600">{lv.reason}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`font-semibold ${
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
                                : 'Menunggu'}
                            </span>
                            {lv.adminNote && (
                              <p className="text-[11px] text-slate-400 mt-0.5">{lv.adminNote}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setReviewingLeave(lv);
                                setReviewNote(lv.adminNote || '');
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                            >
                              Tinjau
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================
              6. PAYROLL (MODEL GAJIAN HARIAN)
              ========================================================= */}
          {section === 'payroll' && (
            <div className="space-y-4">
              {/* Summary & Period Controls */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Payroll Harian Otomatis ({formatMonthMMMYYYY(payrollMonth)})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Rumus: <span className="font-mono-num font-semibold text-slate-700">Jumlah Hari Masuk Tercatat × Tarif Harian (Rp / hari)</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={payrollMonth}
                    onChange={(e) => setPayrollMonth(e.target.value)}
                    className="px-3.5 py-2 text-xs font-mono-num font-semibold rounded-xl border border-slate-200 bg-slate-50"
                  >
                    {availablePayrollMonths.map((m) => (
                      <option key={m} value={m}>
                        Periode {formatMonthMMMYYYY(m)}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleExportPayrollCsv}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-semibold hover:bg-slate-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <span className="text-xs text-slate-500">Total Hari Kerja Tercatat</span>
                  <p className="mt-1 font-mono-num text-xl font-bold text-slate-900">
                    {payrollPeriodTotals.totalDays} hari
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <span className="text-xs text-slate-500">Total Beban Payroll Harian</span>
                  <p className="mt-1 font-mono-num text-xl font-bold text-emerald-700">
                    {formatIDR(payrollPeriodTotals.totalAmount)}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <span className="text-xs text-slate-500">Status Pencairan</span>
                  <p className="mt-1 font-mono-num text-xl font-bold text-slate-900">
                    {payrollPeriodTotals.paidCount} / {payrollRows.length} Lunas
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                        <th className="py-3 px-4">Karyawan</th>
                        <th className="py-3 px-4">Rekening</th>
                        <th className="py-3 px-4 text-right">Hari Masuk</th>
                        <th className="py-3 px-4 text-right">Tarif / Hari</th>
                        <th className="py-3 px-4 text-right">Total Gaji</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {payrollRows.map((row) => {
                        const isPaid = row.savedRecord?.status === 'paid';
                        const busy = payrollBusyId === row.employee.id;
                        return (
                          <tr key={row.employee.id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-4">
                              <p className="font-semibold text-slate-900">{row.employee.name}</p>
                              <p className="text-[11px] text-slate-500">
                                {row.employee.employeeCode} · {row.employee.positionTitle}
                              </p>
                            </td>
                            <td className="py-3 px-4 font-mono-num text-slate-600">
                              {row.employee.bankName} · {row.employee.bankAccount || '-'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono-num font-bold text-slate-900">
                              {row.daysPresent} hari
                            </td>
                            <td className="py-3 px-4 text-right font-mono-num text-slate-700">
                              {formatIDR(row.dailyRate)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono-num font-bold text-emerald-700">
                              {formatIDR(row.totalAmount)}
                            </td>
                            <td className="py-3 px-4">
                              {isPaid ? (
                                <div>
                                  <span className="font-semibold text-emerald-600">Dibayar</span>
                                  {row.savedRecord?.paidDate && (
                                    <p className="font-mono-num text-[10px] text-slate-400">
                                      {formatDateDDMMMYYYY(row.savedRecord.paidDate)}
                                    </p>
                                  )}
                                </div>
                              ) : row.savedRecord ? (
                                <span className="font-semibold text-amber-600">Draft Tersimpan</span>
                              ) : (
                                <span className="text-slate-400">Belum Diproses</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleProcessPayrollRow(row, 'draft')}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50"
                                >
                                  Simpan
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleProcessPayrollRow(row, 'paid')}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  Tandai Dibayar
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =========================================================
          MODALS (Employee, Position, Schedule, Manual Attendance, Leave Review, Photo)
          ========================================================= */}
      {showEmpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900">
                {editingEmp ? 'Ubah Data Karyawan' : 'Tambah Karyawan Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowEmpModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEmp} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Karyawan
                  </label>
                  <input
                    type="text"
                    required
                    value={fEmpCode}
                    onChange={(e) => setFEmpCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono-num rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Bergabung ({formatDateDDMMMYYYY(fEmpJoinDate)})
                  </label>
                  <input
                    type="date"
                    required
                    value={fEmpJoinDate}
                    onChange={(e) => setFEmpJoinDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono-num rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={fEmpName}
                    onChange={(e) => setFEmpName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Google (Login Mobile)
                  </label>
                  <input
                    type="email"
                    required
                    value={fEmpEmail}
                    onChange={(e) => setFEmpEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jabatan</label>
                  <select
                    value={fEmpPosId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setFEmpPosId(nextId);
                      const p = positions.find((x) => x.id === nextId);
                      if (p && !editingEmp) setFEmpRate(p.dailyRate);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.department})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tarif Harian (Rp / hari)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    required
                    value={fEmpRate}
                    onChange={(e) => setFEmpRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono-num rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jadwal Kerja
                  </label>
                  <select
                    value={fEmpSchId}
                    onChange={(e) => setFEmpSchId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    {schedules.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.startTime}–{s.endTime})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">No. HP</label>
                  <input
                    type="text"
                    value={fEmpPhone}
                    onChange={(e) => setFEmpPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono-num rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bank</label>
                  <input
                    type="text"
                    value={fEmpBank}
                    onChange={(e) => setFEmpBank(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Rekening
                  </label>
                  <input
                    type="text"
                    value={fEmpAcc}
                    onChange={(e) => setFEmpAcc(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono-num rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={fEmpStatus}
                    onChange={(e) => setFEmpStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmpModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0B1220] text-white text-xs font-semibold hover:bg-slate-800"
                >
                  Simpan Karyawan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900">
                {editingPos ? 'Ubah Jabatan' : 'Tambah Jabatan Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowPosModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSavePos} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Jabatan
                </label>
                <input
                  type="text"
                  required
                  value={fPosTitle}
                  onChange={(e) => setFPosTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Departemen
                </label>
                <input
                  type="text"
                  required
                  value={fPosDept}
                  onChange={(e) => setFPosDept(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tarif Gaji Harian Default (Rp / hari)
                </label>
                <input
                  type="number"
                  min={0}
                  step={5000}
                  required
                  value={fPosRate}
                  onChange={(e) => setFPosRate(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono-num rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Tugas
                </label>
                <textarea
                  rows={2}
                  value={fPosDesc}
                  onChange={(e) => setFPosDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPosModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0B1220] text-white text-xs font-semibold"
                >
                  Simpan Jabatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900">
                {editingSchedule ? 'Ubah Jadwal Kerja' : 'Tambah Jadwal Kerja'}
              </h3>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSchedule} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Jadwal / Shift
                </label>
                <input
                  type="text"
                  required
                  value={fSchName}
                  onChange={(e) => setFSchName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jam Masuk
                  </label>
                  <input
                    type="time"
                    required
                    value={fSchStart}
                    onChange={(e) => setFSchStart(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-mono-num rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jam Pulang
                  </label>
                  <input
                    type="time"
                    required
                    value={fSchEnd}
                    onChange={(e) => setFSchEnd(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-mono-num rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Toleransi (mnt)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={180}
                    required
                    value={fSchTolerance}
                    onChange={(e) => setFSchTolerance(Number(e.target.value))}
                    className="w-full px-2.5 py-2 text-xs font-mono-num rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Hari Kerja Aktif
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DAYS.map((day) => {
                    const active = fSchDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          setFSchDays((prev) =>
                            prev.includes(day)
                              ? prev.length > 1
                                ? prev.filter((d) => d !== day)
                                : prev
                              : [...prev, day]
                          )
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          active ? 'bg-[#0B1220] text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={fSchDefault}
                  onChange={(e) => setFSchDefault(e.target.checked)}
                />
                Jadikan jadwal default perusahaan
              </label>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0B1220] text-white text-xs font-semibold"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showManualAttModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900">
                Input / Koreksi Kehadiran Manual
              </h3>
              <button
                type="button"
                onClick={() => setShowManualAttModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveManualAtt} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Karyawan</label>
                <select
                  value={fAttEmpId}
                  onChange={(e) => setFAttEmpId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employeeCode} — {emp.name} ({formatIDR(emp.dailyRate)}/hari)
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal ({formatDateDDMMMYYYY(fAttDate)})
                  </label>
                  <input
                    type="date"
                    required
                    value={fAttDate}
                    onChange={(e) => setFAttDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono-num rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={fAttStatus}
                    onChange={(e) => setFAttStatus(e.target.value as AttendanceStatus)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="present">Hadir</option>
                    <option value="late">Terlambat</option>
                    <option value="leave">Izin / Cuti</option>
                    <option value="absent">Alpa</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jam Masuk
                  </label>
                  <input
                    type="text"
                    value={fAttIn}
                    onChange={(e) => setFAttIn(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono-num rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jam Pulang
                  </label>
                  <input
                    type="text"
                    value={fAttOut}
                    onChange={(e) => setFAttOut(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono-num rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan</label>
                <input
                  type="text"
                  value={fAttNotes}
                  onChange={(e) => setFAttNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualAttModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0B1220] text-white text-xs font-semibold"
                >
                  Simpan Kehadiran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reviewingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900">
                Tinjau Pengajuan Cuti
              </h3>
              <button
                type="button"
                onClick={() => setReviewingLeave(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3.5 text-xs">
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 space-y-1">
                <p className="font-bold text-slate-900 text-sm">{reviewingLeave.employeeName}</p>
                <p className="text-slate-600">
                  {reviewingLeave.leaveType} · {reviewingLeave.totalDays} hari
                </p>
                <p className="font-mono-num text-slate-700">
                  {formatDateDDMMMYYYY(reviewingLeave.startDate)} –{' '}
                  {formatDateDDMMMYYYY(reviewingLeave.endDate)}
                </p>
                <p className="text-slate-600 pt-1">{reviewingLeave.reason}</p>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan Manajemen (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  placeholder="Contoh: Disetujui, silakan serah terima tugas sebelum cuti."
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    await reviewLeaveRequest(reviewingLeave.id, 'rejected', reviewNote || 'Ditolak HR');
                    setReviewingLeave(null);
                    notify('Pengajuan cuti ditolak.');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 font-semibold hover:bg-rose-100"
                >
                  Tolak Pengajuan
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await reviewLeaveRequest(reviewingLeave.id, 'approved', reviewNote || 'Disetujui HR');
                    setReviewingLeave(null);
                    notify('Pengajuan cuti disetujui.');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                >
                  Setujui Cuti
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900">
                Input Pengajuan Cuti Karyawan
              </h3>
              <button
                type="button"
                onClick={() => setShowAddLeaveModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const emp = employees.find((item) => item.id === fLeaveEmpId);
                if (!emp || fLeaveReason.trim().length < 3) return;
                await submitLeaveRequest({
                  employee: emp,
                  leaveType: fLeaveType,
                  startDate: fLeaveStart,
                  endDate: fLeaveEnd < fLeaveStart ? fLeaveStart : fLeaveEnd,
                  reason: fLeaveReason,
                });
                setShowAddLeaveModal(false);
                notify(`Pengajuan cuti untuk ${emp.name} ditambahkan.`);
              }}
              className="p-5 space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Karyawan</label>
                <select
                  value={fLeaveEmpId}
                  onChange={(e) => setFLeaveEmpId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employeeCode} — {emp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jenis Cuti / Izin</label>
                <select
                  value={fLeaveType}
                  onChange={(e) => setFLeaveType(e.target.value as LeaveType)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="Cuti Tahunan">Cuti Tahunan</option>
                  <option value="Izin Sakit">Izin Sakit</option>
                  <option value="Izin Pribadi">Izin Pribadi</option>
                  <option value="Cuti Melahirkan">Cuti Melahirkan</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mulai ({formatDateDDMMMYYYY(fLeaveStart)})
                  </label>
                  <input
                    type="date"
                    required
                    value={fLeaveStart}
                    onChange={(e) => {
                      setFLeaveStart(e.target.value);
                      if (fLeaveEnd < e.target.value) setFLeaveEnd(e.target.value);
                    }}
                    className="w-full px-3 py-2 font-mono-num rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Sampai ({formatDateDDMMMYYYY(fLeaveEnd)})
                  </label>
                  <input
                    type="date"
                    required
                    min={fLeaveStart}
                    value={fLeaveEnd}
                    onChange={(e) => setFLeaveEnd(e.target.value)}
                    className="w-full px-3 py-2 font-mono-num rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 flex items-center justify-between text-slate-600">
                <span>Total Durasi</span>
                <span className="font-mono-num font-bold text-slate-900">
                  {countDaysInclusive(fLeaveStart, fLeaveEnd)} Hari
                </span>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alasan Pengajuan</label>
                <textarea
                  rows={2}
                  required
                  minLength={3}
                  maxLength={500}
                  value={fLeaveReason}
                  onChange={(e) => setFLeaveReason(e.target.value)}
                  placeholder="Jelaskan keperluan cuti / izin..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <div className="pt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddLeaveModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0B1220] text-white font-semibold"
                >
                  Simpan Pengajuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {photoInspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-2xl">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">{photoInspect.title}</p>
                <p className="font-mono-num text-[11px] text-slate-500">{photoInspect.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setPhotoInspect(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={photoInspect.src}
              alt={photoInspect.title}
              className="w-full aspect-square object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
};
