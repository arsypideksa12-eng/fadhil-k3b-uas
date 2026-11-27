import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './config';
import type {
  Attendance,
  AttendanceStatus,
  Employee,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  PayrollRecord,
  Position,
  WorkSchedule,
} from '../types/hrm';
import {
  BLUEPRINT_LIMITS,
  countDaysInclusive,
  getCurrentTimeHHMMSS,
  getLocalDateKey,
  sanitizeId,
} from '../utils/formatters';

function clampStr(val: string, max: number): string {
  return (val ?? '').trim().slice(0, max);
}

// =========================================================
// Real-Time Subscriptions (Single Source of Truth)
// =========================================================

export function subscribePositions(
  onData: (items: Position[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'positions';
  const q = query(collection(db, path), orderBy('title', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Position));
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeWorkSchedules(
  onData: (items: WorkSchedule[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'workSchedules';
  const q = query(collection(db, path), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as WorkSchedule));
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeAllEmployees(
  onData: (items: Employee[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'employees';
  const q = query(collection(db, path), orderBy('employeeCode', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as Employee));
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeMyEmployeeByUidOrEmail(
  uid: string,
  _email: string,
  onData: (emp: Employee | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'employees';
  const qUid = query(collection(db, path), where('userId', '==', uid));

  return onSnapshot(
    qUid,
    (snap) => {
      if (!snap.empty) {
        onData(snap.docs[0].data() as Employee);
      } else {
        onData(null);
      }
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeAttendance(
  uidFilter: string | null,
  onData: (items: Attendance[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'attendance';
  const q = uidFilter
    ? query(collection(db, path), where('userId', '==', uidFilter))
    : query(collection(db, path), orderBy('dateKey', 'desc'));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as Attendance);
      list.sort((a, b) => {
        if (a.dateKey !== b.dateKey) return b.dateKey.localeCompare(a.dateKey);
        return (b.checkInTime || '').localeCompare(a.checkInTime || '');
      });
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeLeaveRequests(
  uidFilter: string | null,
  onData: (items: LeaveRequest[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'leaveRequests';
  const q = uidFilter
    ? query(collection(db, path), where('userId', '==', uidFilter))
    : query(collection(db, path), orderBy('startDate', 'desc'));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as LeaveRequest);
      list.sort((a, b) => b.startDate.localeCompare(a.startDate));
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribePayrolls(
  uidFilter: string | null,
  onData: (items: PayrollRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'payrolls';
  const q = uidFilter
    ? query(collection(db, path), where('userId', '==', uidFilter))
    : query(collection(db, path), orderBy('periodMonth', 'desc'));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as PayrollRecord);
      list.sort((a, b) => b.periodMonth.localeCompare(a.periodMonth));
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function checkIsAdminUser(uid: string, email: string): Promise<boolean> {
  if (email === 'pideksaarsy1206@gmail.com') return true;
  const path = `admins/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'admins', sanitizeId(uid)));
    return snap.exists();
  } catch (error) {
    // Non-admins get permission-denied when checking /admins/{uid}; treat as false cleanly
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
      return false;
    }
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// =========================================================
// Positions CRUD
// =========================================================

export async function savePosition(input: {
  id?: string;
  title: string;
  department: string;
  dailyRate: number;
  description: string;
}): Promise<void> {
  const id = sanitizeId(input.id || `POS-${Date.now()}`);
  const path = `positions/${id}`;
  try {
    const ref = doc(db, 'positions', id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        title: clampStr(input.title, BLUEPRINT_LIMITS.maxTitle),
        department: clampStr(input.department, BLUEPRINT_LIMITS.maxTitle),
        dailyRate: Math.max(0, Math.round(Number(input.dailyRate) || 0)),
        description: clampStr(input.description, BLUEPRINT_LIMITS.maxDescription),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        id,
        title: clampStr(input.title, BLUEPRINT_LIMITS.maxTitle),
        department: clampStr(input.department, BLUEPRINT_LIMITS.maxTitle),
        dailyRate: Math.max(0, Math.round(Number(input.dailyRate) || 0)),
        description: clampStr(input.description, BLUEPRINT_LIMITS.maxDescription),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePosition(id: string): Promise<void> {
  const cleanId = sanitizeId(id);
  const path = `positions/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'positions', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// =========================================================
// Work Schedules CRUD
// =========================================================

export async function saveWorkSchedule(input: {
  id?: string;
  name: string;
  activeDays: string[];
  startTime: string;
  endTime: string;
  lateToleranceMinutes: number;
  isDefault: boolean;
}): Promise<void> {
  const id = sanitizeId(input.id || `SCH-${Date.now()}`);
  const path = `workSchedules/${id}`;
  const days = input.activeDays.length > 0 ? input.activeDays.slice(0, 7) : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
  try {
    const ref = doc(db, 'workSchedules', id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        name: clampStr(input.name, BLUEPRINT_LIMITS.maxTitle),
        activeDays: days,
        startTime: clampStr(input.startTime, 5),
        endTime: clampStr(input.endTime, 5),
        lateToleranceMinutes: Math.max(0, Math.min(180, Math.round(Number(input.lateToleranceMinutes) || 0))),
        isDefault: Boolean(input.isDefault),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        id,
        name: clampStr(input.name, BLUEPRINT_LIMITS.maxTitle),
        activeDays: days,
        startTime: clampStr(input.startTime, 5),
        endTime: clampStr(input.endTime, 5),
        lateToleranceMinutes: Math.max(0, Math.min(180, Math.round(Number(input.lateToleranceMinutes) || 0))),
        isDefault: Boolean(input.isDefault),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteWorkSchedule(id: string): Promise<void> {
  const cleanId = sanitizeId(id);
  const path = `workSchedules/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'workSchedules', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// =========================================================
// Employees CRUD & Self-Binding
// =========================================================

export async function saveEmployee(input: {
  id?: string;
  employeeCode: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  positionId: string;
  positionTitle: string;
  department: string;
  scheduleId: string;
  dailyRate: number;
  joinDate: string;
  avatarUrl: string;
  bankName: string;
  bankAccount: string;
  status: 'active' | 'inactive';
}): Promise<void> {
  const id = sanitizeId(input.id || `EMP-${Date.now()}`);
  const path = `employees/${id}`;
  const cleanCode = input.employeeCode.toUpperCase().replace(/[^A-Z0-9\-]/g, '').slice(0, 32) || `EMP-${Date.now().toString().slice(-4)}`;
  try {
    const ref = doc(db, 'employees', id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        employeeCode: cleanCode,
        userId: clampStr(input.userId ?? snap.data().userId ?? '', 128),
        name: clampStr(input.name, BLUEPRINT_LIMITS.maxName),
        email: clampStr(input.email.toLowerCase(), 200),
        phone: clampStr(input.phone, 30),
        positionId: clampStr(input.positionId, 64),
        positionTitle: clampStr(input.positionTitle, BLUEPRINT_LIMITS.maxTitle),
        department: clampStr(input.department, BLUEPRINT_LIMITS.maxTitle),
        scheduleId: clampStr(input.scheduleId, 64),
        dailyRate: Math.max(0, Math.round(Number(input.dailyRate) || 0)),
        joinDate: BLUEPRINT_LIMITS.dateYYYYMMDDPattern.test(input.joinDate) ? input.joinDate : getLocalDateKey(),
        avatarUrl: clampStr(input.avatarUrl, 500),
        bankName: clampStr(input.bankName, 60),
        bankAccount: clampStr(input.bankAccount, 40),
        status: input.status,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        id,
        employeeCode: cleanCode,
        userId: clampStr(input.userId ?? '', 128),
        name: clampStr(input.name, BLUEPRINT_LIMITS.maxName),
        email: clampStr(input.email.toLowerCase(), 200),
        phone: clampStr(input.phone, 30),
        positionId: clampStr(input.positionId, 64),
        positionTitle: clampStr(input.positionTitle, BLUEPRINT_LIMITS.maxTitle),
        department: clampStr(input.department, BLUEPRINT_LIMITS.maxTitle),
        scheduleId: clampStr(input.scheduleId, 64),
        dailyRate: Math.max(0, Math.round(Number(input.dailyRate) || 0)),
        joinDate: BLUEPRINT_LIMITS.dateYYYYMMDDPattern.test(input.joinDate) ? input.joinDate : getLocalDateKey(),
        avatarUrl: clampStr(input.avatarUrl, 500),
        bankName: clampStr(input.bankName, 60),
        bankAccount: clampStr(input.bankAccount, 40),
        status: input.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function bindEmployeeToAuthUid(employeeId: string, uid: string): Promise<void> {
  const cleanId = sanitizeId(employeeId);
  const path = `employees/${cleanId}`;
  try {
    await updateDoc(doc(db, 'employees', cleanId), {
      userId: sanitizeId(uid),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function selfOnboardEmployee(input: {
  uid: string;
  name: string;
  email: string;
  phone: string;
  positionId: string;
  positionTitle: string;
  department: string;
  scheduleId: string;
  dailyRate?: number;
  avatarUrl?: string;
  bankName: string;
  bankAccount: string;
}): Promise<void> {
  const id = sanitizeId(`EMP-${input.uid.slice(0, 16)}`);
  const path = `employees/${id}`;
  const code = `EMP-${input.uid.slice(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, 'X')}`;
  try {
    await setDoc(doc(db, 'employees', id), {
      id,
      employeeCode: code,
      userId: input.uid,
      name: clampStr(input.name || 'Karyawan Baru', BLUEPRINT_LIMITS.maxName),
      email: clampStr(input.email.toLowerCase(), 200),
      phone: clampStr(input.phone, 30),
      positionId: clampStr(input.positionId || 'POS-01', 64),
      positionTitle: clampStr(input.positionTitle || 'Staff Operasional', BLUEPRINT_LIMITS.maxTitle),
      department: clampStr(input.department || 'Operations', BLUEPRINT_LIMITS.maxTitle),
      scheduleId: clampStr(input.scheduleId || 'SCH-DEFAULT', 64),
      dailyRate: input.dailyRate ?? 300000,
      joinDate: getLocalDateKey(),
      avatarUrl: clampStr(input.avatarUrl ?? '', 500),
      bankName: clampStr(input.bankName || 'BCA', 60),
      bankAccount: clampStr(input.bankAccount, 40),
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateOwnEmployeeContact(
  employeeId: string,
  phone: string,
  bankName: string,
  bankAccount: string
): Promise<void> {
  const cleanId = sanitizeId(employeeId);
  const path = `employees/${cleanId}`;
  try {
    await updateDoc(doc(db, 'employees', cleanId), {
      phone: clampStr(phone, 30),
      bankName: clampStr(bankName, 60),
      bankAccount: clampStr(bankAccount, 40),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  const cleanId = sanitizeId(id);
  const path = `employees/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'employees', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// =========================================================
// Attendance Clock-In & Clock-Out (with Selfie)
// =========================================================

export async function clockInAttendance(input: {
  employee: Employee;
  dateKey: string;
  checkInTime: string;
  checkInPhoto: string;
  status: 'present' | 'late';
  notes?: string;
}): Promise<void> {
  const attId = sanitizeId(`ATT-${input.employee.id}-${input.dateKey}`);
  const path = `attendance/${attId}`;
  try {
    await setDoc(doc(db, 'attendance', attId), {
      id: attId,
      employeeId: input.employee.id,
      userId: input.employee.userId,
      employeeName: clampStr(input.employee.name, BLUEPRINT_LIMITS.maxName),
      positionTitle: clampStr(input.employee.positionTitle, BLUEPRINT_LIMITS.maxTitle),
      dateKey: input.dateKey,
      checkInTime: clampStr(input.checkInTime, 8),
      checkOutTime: '',
      checkInPhoto: input.checkInPhoto.slice(0, BLUEPRINT_LIMITS.maxPhotoLength),
      checkOutPhoto: '',
      status: input.status,
      dailyRateSnapshot: input.employee.dailyRate,
      notes: clampStr(input.notes ?? '', BLUEPRINT_LIMITS.maxDescription),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function clockOutAttendance(input: {
  attendanceId: string;
  checkOutTime: string;
  checkOutPhoto: string;
  notes?: string;
}): Promise<void> {
  const cleanId = sanitizeId(input.attendanceId);
  const path = `attendance/${cleanId}`;
  try {
    await updateDoc(doc(db, 'attendance', cleanId), {
      checkOutTime: clampStr(input.checkOutTime, 8),
      checkOutPhoto: input.checkOutPhoto.slice(0, BLUEPRINT_LIMITS.maxPhotoLength),
      notes: clampStr(input.notes ?? '', BLUEPRINT_LIMITS.maxDescription),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminSaveAttendance(input: {
  employee: Employee;
  dateKey: string;
  checkInTime: string;
  checkOutTime: string;
  status: AttendanceStatus;
  notes: string;
}): Promise<void> {
  const attId = sanitizeId(`ATT-${input.employee.id}-${input.dateKey}`);
  const path = `attendance/${attId}`;
  try {
    const ref = doc(db, 'attendance', attId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        checkInTime: clampStr(input.checkInTime, 8),
        checkOutTime: clampStr(input.checkOutTime, 8),
        status: input.status,
        dailyRateSnapshot: input.employee.dailyRate,
        notes: clampStr(input.notes, BLUEPRINT_LIMITS.maxDescription),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        id: attId,
        employeeId: input.employee.id,
        userId: input.employee.userId,
        employeeName: clampStr(input.employee.name, BLUEPRINT_LIMITS.maxName),
        positionTitle: clampStr(input.employee.positionTitle, BLUEPRINT_LIMITS.maxTitle),
        dateKey: input.dateKey,
        checkInTime: clampStr(input.checkInTime || getCurrentTimeHHMMSS(), 8),
        checkOutTime: clampStr(input.checkOutTime, 8),
        checkInPhoto: '',
        checkOutPhoto: '',
        status: input.status,
        dailyRateSnapshot: input.employee.dailyRate,
        notes: clampStr(input.notes, BLUEPRINT_LIMITS.maxDescription),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAttendance(id: string): Promise<void> {
  const cleanId = sanitizeId(id);
  const path = `attendance/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'attendance', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// =========================================================
// Leave Requests
// =========================================================

export async function submitLeaveRequest(input: {
  employee: Employee;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<void> {
  const id = sanitizeId(`LV-${input.employee.employeeCode}-${Date.now()}`);
  const path = `leaveRequests/${id}`;
  const totalDays = countDaysInclusive(input.startDate, input.endDate);
  try {
    await setDoc(doc(db, 'leaveRequests', id), {
      id,
      employeeId: input.employee.id,
      userId: input.employee.userId,
      employeeName: clampStr(input.employee.name, BLUEPRINT_LIMITS.maxName),
      positionTitle: clampStr(input.employee.positionTitle, BLUEPRINT_LIMITS.maxTitle),
      leaveType: input.leaveType,
      startDate: input.startDate,
      endDate: input.endDate,
      totalDays,
      reason: clampStr(input.reason, BLUEPRINT_LIMITS.maxReason),
      status: 'pending',
      adminNote: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function reviewLeaveRequest(
  leaveId: string,
  status: LeaveStatus,
  adminNote: string
): Promise<void> {
  const cleanId = sanitizeId(leaveId);
  const path = `leaveRequests/${cleanId}`;
  try {
    await updateDoc(doc(db, 'leaveRequests', cleanId), {
      status,
      adminNote: clampStr(adminNote, BLUEPRINT_LIMITS.maxDescription),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function cancelLeaveRequest(leaveId: string): Promise<void> {
  const cleanId = sanitizeId(leaveId);
  const path = `leaveRequests/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'leaveRequests', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// =========================================================
// Payroll (Daily Wage Model: Days Present × Daily Rate)
// =========================================================

export async function upsertPayrollRecord(input: {
  employee: Employee;
  periodMonth: string;
  daysPresent: number;
  dailyRate: number;
  totalAmount: number;
  status: 'draft' | 'paid';
  paidDate: string;
  notes: string;
}): Promise<void> {
  const id = sanitizeId(`PAY-${input.employee.id}-${input.periodMonth}`);
  const path = `payrolls/${id}`;
  try {
    const ref = doc(db, 'payrolls', id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        daysPresent: Math.max(0, Math.min(31, input.daysPresent)),
        dailyRate: Math.max(0, Math.round(input.dailyRate)),
        totalAmount: Math.max(0, Math.round(input.totalAmount)),
        status: input.status,
        paidDate: clampStr(input.paidDate, 10),
        notes: clampStr(input.notes, BLUEPRINT_LIMITS.maxDescription),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        id,
        employeeId: input.employee.id,
        userId: input.employee.userId,
        employeeName: clampStr(input.employee.name, BLUEPRINT_LIMITS.maxName),
        positionTitle: clampStr(input.employee.positionTitle, BLUEPRINT_LIMITS.maxTitle),
        periodMonth: input.periodMonth,
        daysPresent: Math.max(0, Math.min(31, input.daysPresent)),
        dailyRate: Math.max(0, Math.round(input.dailyRate)),
        totalAmount: Math.max(0, Math.round(input.totalAmount)),
        status: input.status,
        paidDate: clampStr(input.paidDate, 10),
        notes: clampStr(input.notes, BLUEPRINT_LIMITS.maxDescription),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function checkIfCollectionEmpty(collectionName: string): Promise<boolean> {
  try {
    const snap = await getDocs(collection(db, collectionName));
    return snap.empty;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
}
