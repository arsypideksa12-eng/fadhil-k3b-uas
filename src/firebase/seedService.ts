import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './config';
import { getLocalDateKey } from '../utils/formatters';

function getRecentWorkdayKeys(count: number): string[] {
  const keys: string[] = [];
  const d = new Date();
  d.setDate(d.getDate() - 1);
  while (keys.length < count) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      keys.push(getLocalDateKey(d));
    }
    d.setDate(d.getDate() - 1);
  }
  return keys;
}

export async function claimInitialAdminIfAvailable(
  uid: string,
  email: string,
  name: string
): Promise<boolean> {
  try {
    const lockRef = doc(db, 'system', 'adminLock');
    const lockSnap = await getDoc(lockRef);
    if (lockSnap.exists()) {
      const adminSnap = await getDoc(doc(db, 'admins', uid));
      return adminSnap.exists();
    }

    const batch = writeBatch(db);
    batch.set(lockRef, {
      id: 'adminLock',
      adminUid: uid,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'admins', uid), {
      uid,
      email: email.toLowerCase(),
      name: (name || 'Administrator KING HRM').slice(0, 120),
      createdAt: serverTimestamp(),
    });
    await batch.commit();
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
      return false;
    }
    handleFirestoreError(error, OperationType.WRITE, 'system/adminLock');
  }
}

export async function ensureDemoEmployeeProfile(
  uid: string,
  email: string,
  name: string
): Promise<void> {
  const empId = `EMP-DEMO-${uid.slice(0, 12)}`;
  const empRef = doc(db, 'employees', empId);
  try {
    const snap = await getDoc(empRef);
    if (snap.exists()) return;

    await setDoc(empRef, {
      id: empId,
      employeeCode: 'EMP-002',
      userId: uid,
      name: (name || 'Nadia Kusuma').slice(0, 120),
      email: email.toLowerCase(),
      phone: '0813-4421-8890',
      positionId: 'POS-02',
      positionTitle: 'UI/UX Designer',
      department: 'Product',
      scheduleId: 'SCH-DEFAULT',
      dailyRate: 300000,
      joinDate: '2025-03-10',
      avatarUrl: '/src/assets/images/avatar_emp_nadia_1795750510046.jpg',
      bankName: 'Mandiri',
      bankAccount: '1320-0098-4412',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const recentDays = getRecentWorkdayKeys(3);
    for (let i = 0; i < recentDays.length; i++) {
      const dateKey = recentDays[i];
      const attId = `ATT-${empId}-${dateKey}`;
      await setDoc(doc(db, 'attendance', attId), {
        id: attId,
        employeeId: empId,
        userId: uid,
        employeeName: (name || 'Nadia Kusuma').slice(0, 120),
        positionTitle: 'UI/UX Designer',
        dateKey,
        checkInTime: i === 1 ? '08:49:12' : '08:22:08',
        checkOutTime: '17:32:45',
        checkInPhoto: '',
        checkOutPhoto: '',
        status: i === 1 ? 'late' : 'present',
        dailyRateSnapshot: 300000,
        notes: i === 1 ? 'Terlambat perjalanan' : 'Hadir tepat waktu',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `employees/${empId}`);
  }
}

export async function ensureInitialCompanyData(
  adminUid: string,
  adminEmail: string,
  adminName: string
): Promise<void> {
  try {
    // 1. Ensure admin doc exists
    const adminRef = doc(db, 'admins', adminUid);
    const adminSnap = await getDoc(adminRef);
    if (!adminSnap.exists()) {
      await claimInitialAdminIfAvailable(adminUid, adminEmail, adminName);
    }

    // 2. Check if positions already seeded
    const posSnap = await getDocs(collection(db, 'positions'));
    if (!posSnap.empty) return;

    const positions = [
      {
        id: 'POS-01',
        title: 'Software Engineer',
        department: 'Engineering',
        dailyRate: 350000,
        description: 'Pengembangan sistem inti, aplikasi web, dan integrasi API perusahaan.',
      },
      {
        id: 'POS-02',
        title: 'UI/UX Designer',
        department: 'Product',
        dailyRate: 300000,
        description: 'Perancangan antarmuka produk digital dan riset pengalaman pengguna.',
      },
      {
        id: 'POS-03',
        title: 'HR & GA Specialist',
        department: 'People Operations',
        dailyRate: 275000,
        description: 'Pengelolaan kepegawaian, presensi, cuti, dan operasional kantor.',
      },
      {
        id: 'POS-04',
        title: 'Finance & Payroll Staff',
        department: 'Finance',
        dailyRate: 280000,
        description: 'Rekonsiliasi pembayaran gaji harian dan pembukuan operasional.',
      },
      {
        id: 'POS-05',
        title: 'Operations Lead',
        department: 'Operations',
        dailyRate: 400000,
        description: 'Supervisi operasional harian dan koordinasi tim lintas divisi.',
      },
    ];

    for (const p of positions) {
      await setDoc(doc(db, 'positions', p.id), {
        ...p,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const schedules = [
      {
        id: 'SCH-DEFAULT',
        name: 'Shift Reguler Kantor',
        activeDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
        startTime: '08:30',
        endTime: '17:30',
        lateToleranceMinutes: 15,
        isDefault: true,
      },
      {
        id: 'SCH-OPS',
        name: 'Shift Operasional Lapangan',
        activeDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
        startTime: '08:00',
        endTime: '16:30',
        lateToleranceMinutes: 10,
        isDefault: false,
      },
    ];

    for (const s of schedules) {
      await setDoc(doc(db, 'workSchedules', s.id), {
        ...s,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const employees = [
      {
        id: 'EMP-001',
        employeeCode: 'EMP-001',
        userId: adminUid,
        name: adminName || 'Raka Pratama',
        email: adminEmail.toLowerCase(),
        phone: '0812-8890-1206',
        positionId: 'POS-05',
        positionTitle: 'Operations Lead',
        department: 'Operations',
        scheduleId: 'SCH-DEFAULT',
        dailyRate: 400000,
        joinDate: '2025-01-15',
        avatarUrl: '/src/assets/images/avatar_emp_raka_1795750508702.jpg',
        bankName: 'BCA',
        bankAccount: '8830-1129-4401',
        status: 'active',
      },
      {
        id: 'EMP-002',
        employeeCode: 'EMP-002',
        userId: '',
        name: 'Nadia Kusuma',
        email: 'nadia.kusuma@kinghrm.id',
        phone: '0813-4421-8890',
        positionId: 'POS-02',
        positionTitle: 'UI/UX Designer',
        department: 'Product',
        scheduleId: 'SCH-DEFAULT',
        dailyRate: 300000,
        joinDate: '2025-03-10',
        avatarUrl: '/src/assets/images/avatar_emp_nadia_1795750510046.jpg',
        bankName: 'Mandiri',
        bankAccount: '1320-0098-4412',
        status: 'active',
      },
      {
        id: 'EMP-003',
        employeeCode: 'EMP-003',
        userId: '',
        name: 'Dimas Wijaya',
        email: 'dimas.wijaya@kinghrm.id',
        phone: '0811-7720-3341',
        positionId: 'POS-04',
        positionTitle: 'Finance & Payroll Staff',
        department: 'Finance',
        scheduleId: 'SCH-DEFAULT',
        dailyRate: 280000,
        joinDate: '2025-04-02',
        avatarUrl: '/src/assets/images/avatar_emp_dimas_1795750509492.jpg',
        bankName: 'BNI',
        bankAccount: '0294-8821-7710',
        status: 'active',
      },
      {
        id: 'EMP-004',
        employeeCode: 'EMP-004',
        userId: '',
        name: 'Siti Rahmawati',
        email: 'siti.rahmawati@kinghrm.id',
        phone: '0856-9012-5581',
        positionId: 'POS-03',
        positionTitle: 'HR & GA Specialist',
        department: 'People Operations',
        scheduleId: 'SCH-DEFAULT',
        dailyRate: 275000,
        joinDate: '2025-02-18',
        avatarUrl: '/src/assets/images/avatar_emp_siti_1795750510664.jpg',
        bankName: 'BRI',
        bankAccount: '0041-0102-8823',
        status: 'active',
      },
    ];

    for (const emp of employees) {
      await setDoc(doc(db, 'employees', emp.id), {
        ...emp,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const recentDays = getRecentWorkdayKeys(4);
    for (let i = 0; i < recentDays.length; i++) {
      const dateKey = recentDays[i];
      for (const emp of employees) {
        const isLate = i === 1 && emp.id === 'EMP-003';
        const attId = `ATT-${emp.id}-${dateKey}`;
        await setDoc(doc(db, 'attendance', attId), {
          id: attId,
          employeeId: emp.id,
          userId: emp.userId,
          employeeName: emp.name,
          positionTitle: emp.positionTitle,
          dateKey,
          checkInTime: isLate ? '08:52:10' : '08:21:05',
          checkOutTime: '17:34:22',
          checkInPhoto: '',
          checkOutPhoto: '',
          status: isLate ? 'late' : 'present',
          dailyRateSnapshot: emp.dailyRate,
          notes: isLate ? 'Terlambat lalu lintas pagi' : 'Hadir sesuai jadwal shift',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const tomorrowKey = getLocalDateKey(tomorrow);
    await setDoc(doc(db, 'leaveRequests', 'LV-EMP-002-INIT'), {
      id: 'LV-EMP-002-INIT',
      employeeId: 'EMP-002',
      userId: '',
      employeeName: 'Nadia Kusuma',
      positionTitle: 'UI/UX Designer',
      leaveType: 'Cuti Tahunan',
      startDate: tomorrowKey,
      endDate: tomorrowKey,
      totalDays: 1,
      reason: 'Keperluan administrasi keluarga di luar kota.',
      status: 'pending',
      adminNote: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seed');
  }
}
