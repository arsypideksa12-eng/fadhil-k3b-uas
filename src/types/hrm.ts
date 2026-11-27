import type { Timestamp } from 'firebase/firestore';

export type AppPortalMode = 'backoffice' | 'mobile';
export type MobileTab = 'beranda' | 'presensi' | 'cuti' | 'laporan' | 'profil';
export type BackofficeSection =
  | 'ringkasan'
  | 'karyawan'
  | 'jadwal'
  | 'kehadiran'
  | 'cuti'
  | 'payroll';

export interface AdminUser {
  uid: string;
  email: string;
  name: string;
  createdAt?: Timestamp;
}

export interface Position {
  id: string;
  title: string;
  department: string;
  dailyRate: number;
  description: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface WorkSchedule {
  id: string;
  name: string;
  activeDays: string[];
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  lateToleranceMinutes: number;
  isDefault: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Employee {
  id: string;
  employeeCode: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  positionId: string;
  positionTitle: string;
  department: string;
  scheduleId: string;
  dailyRate: number;
  joinDate: string; // YYYY-MM-DD (rendered as DD-MMM-YYYY)
  avatarUrl: string;
  bankName: string;
  bankAccount: string;
  status: 'active' | 'inactive';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type AttendanceStatus = 'present' | 'late' | 'leave' | 'absent';

export interface Attendance {
  id: string;
  employeeId: string;
  userId: string;
  employeeName: string;
  positionTitle: string;
  dateKey: string; // YYYY-MM-DD (rendered as DD-MMM-YYYY)
  checkInTime: string; // HH:mm:ss
  checkOutTime: string; // HH:mm:ss or ''
  checkInPhoto: string;
  checkOutPhoto: string;
  status: AttendanceStatus;
  dailyRateSnapshot: number;
  notes: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type LeaveType =
  | 'Cuti Tahunan'
  | 'Izin Sakit'
  | 'Izin Pribadi'
  | 'Cuti Melahirkan';

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  userId: string;
  employeeName: string;
  positionTitle: string;
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  adminNote: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  userId: string;
  employeeName: string;
  positionTitle: string;
  periodMonth: string; // YYYY-MM
  daysPresent: number;
  dailyRate: number;
  totalAmount: number;
  status: 'draft' | 'paid';
  paidDate: string; // YYYY-MM-DD or ''
  notes: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
