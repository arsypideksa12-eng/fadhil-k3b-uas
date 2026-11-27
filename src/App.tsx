/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from './firebase/config';
import {
  checkIsAdminUser,
  subscribeAllEmployees,
  subscribeAttendance,
  subscribeLeaveRequests,
  subscribeMyEmployeeByUidOrEmail,
  subscribePayrolls,
  subscribePositions,
  subscribeWorkSchedules,
} from './firebase/hrmService';
import {
  claimInitialAdminIfAvailable,
  ensureDemoEmployeeProfile,
  ensureInitialCompanyData,
} from './firebase/seedService';
import type {
  AppPortalMode,
  Attendance,
  Employee,
  LeaveRequest,
  PayrollRecord,
  Position,
  WorkSchedule,
} from './types/hrm';
import {
  AuthSwitchPortal,
  DEMO_ACCOUNTS,
  type AuthFormPayload,
} from './components/AuthSwitchPortal';
import { BackofficeApp } from './components/BackofficeApp';
import { MobileEmployeeApp } from './components/MobileEmployeeApp';
import { OfflineIndicator } from './components/PWAComponents';
import { ErrorBoundary } from './components/ErrorBoundary';

function normalizeLoginEmail(identifier: string): string {
  const clean = identifier.trim().toLowerCase();
  if (clean === 'emp-002') return DEMO_ACCOUNTS.mobile.email;
  if (clean.includes('@')) return clean;
  return `${clean.replace(/[^a-z0-9\-_]/g, '')}@kinghrm.id`;
}

function mapFirebaseAuthError(codeOrMessage: string): {
  message: string;
  needsProviderSetup: boolean;
} {
  if (
    codeOrMessage.includes('auth/operation-not-allowed') ||
    codeOrMessage.includes('CONFIGURATION_NOT_FOUND')
  ) {
    return {
      needsProviderSetup: true,
      message:
        'Metode masuk Email/Password belum diaktifkan di Firebase Console proyek Anda. Silakan ikuti panduan aktivasi di atas.',
    };
  }
  if (
    codeOrMessage.includes('auth/invalid-credential') ||
    codeOrMessage.includes('auth/wrong-password') ||
    codeOrMessage.includes('auth/user-not-found')
  ) {
    return {
      needsProviderSetup: false,
      message:
        'Email/ID atau Password tidak cocok atau belum terdaftar. Gunakan Akun Demo atau tab Daftar.',
    };
  }
  if (codeOrMessage.includes('auth/email-already-in-use')) {
    return {
      needsProviderSetup: false,
      message: 'Email/ID tersebut sudah terdaftar. Silakan pindah ke tab Masuk.',
    };
  }
  if (codeOrMessage.includes('auth/weak-password')) {
    return {
      needsProviderSetup: false,
      message: 'Password minimal harus 6 karakter.',
    };
  }
  return {
    needsProviderSetup: false,
    message: `Autentikasi gagal: ${codeOrMessage}`,
  };
}

function KingHrmRoot() {
  const [portalMode, setPortalMode] = useState<AppPortalMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('king_hrm_portal_mode');
      if (saved === 'mobile' || saved === 'backoffice') return saved;
    }
    return 'backoffice';
  });

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [needsEmailProviderSetup, setNeedsEmailProviderSetup] = useState(false);

  // Real-time Firestore state
  const [positions, setPositions] = useState<Position[]>([]);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [myEmployee, setMyEmployee] = useState<Employee | null>(null);
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);

  // Admin preview employee selector for Mobile App Karyawan
  const [selectedPreviewEmployeeId, setSelectedPreviewEmployeeId] = useState<string | null>(null);

  const handleSetPortalMode = (mode: AppPortalMode) => {
    setPortalMode(mode);
    setAuthError(null);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('king_hrm_portal_mode', mode);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthReady(true);

      if (!user) {
        setIsAdmin(false);
        setRoleChecked(true);
        setPositions([]);
        setSchedules([]);
        setAllEmployees([]);
        setMyEmployee(null);
        setAttendanceList([]);
        setLeaveRequests([]);
        setPayrolls([]);
        return;
      }

      setRoleChecked(false);
      try {
        let adminStatus = await checkIsAdminUser(user.uid, user.email ?? '');
        if (!adminStatus && window.localStorage.getItem('king_hrm_portal_mode') === 'backoffice') {
          adminStatus = await claimInitialAdminIfAvailable(
            user.uid,
            user.email ?? '',
            user.displayName ?? 'Admin KING HRM'
          );
        }
        if (adminStatus) {
          await ensureInitialCompanyData(
            user.uid,
            user.email ?? '',
            user.displayName ?? 'Admin KING HRM'
          );
        } else if ((user.email ?? '').toLowerCase() === DEMO_ACCOUNTS.mobile.email) {
          await ensureDemoEmployeeProfile(
            user.uid,
            user.email ?? DEMO_ACCOUNTS.mobile.email,
            user.displayName ?? DEMO_ACCOUNTS.mobile.name
          );
        }
        setIsAdmin(adminStatus);
      } catch (err) {
        console.error('Role verification error:', err);
        setIsAdmin(false);
      } finally {
        setRoleChecked(true);
      }
    });

    return () => unsub();
  }, []);

  // Attach Firestore real-time listeners only when authenticated & role verified
  useEffect(() => {
    if (!authReady || !roleChecked || !firebaseUser) return;

    const unsubs: (() => void)[] = [];
    unsubs.push(subscribePositions(setPositions));
    unsubs.push(subscribeWorkSchedules(setSchedules));

    if (isAdmin) {
      unsubs.push(subscribeAllEmployees(setAllEmployees));
      unsubs.push(subscribeAttendance(null, setAttendanceList));
      unsubs.push(subscribeLeaveRequests(null, setLeaveRequests));
      unsubs.push(subscribePayrolls(null, setPayrolls));
    } else {
      const uid = firebaseUser.uid;
      unsubs.push(subscribeMyEmployeeByUidOrEmail(uid, '', setMyEmployee));
      unsubs.push(subscribeAttendance(uid, setAttendanceList));
      unsubs.push(subscribeLeaveRequests(uid, setLeaveRequests));
      unsubs.push(subscribePayrolls(uid, setPayrolls));
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authReady, roleChecked, firebaseUser, isAdmin]);

  const activeMobileEmployee = useMemo(() => {
    if (!isAdmin) return myEmployee;
    if (selectedPreviewEmployeeId) {
      return allEmployees.find((e) => e.id === selectedPreviewEmployeeId) ?? null;
    }
    return (
      allEmployees.find((e) => e.userId === firebaseUser?.uid) ??
      allEmployees[0] ??
      null
    );
  }, [isAdmin, myEmployee, allEmployees, selectedPreviewEmployeeId, firebaseUser]);

  const handleSubmitAuth = async (payload: AuthFormPayload) => {
    setAuthError(null);
    setNeedsEmailProviderSetup(false);
    setLoginBusy(true);
    handleSetPortalMode(payload.mode);

    const email = normalizeLoginEmail(payload.identifier);
    const isDemoCred =
      payload.isDemo ||
      (email === DEMO_ACCOUNTS.backoffice.email &&
        payload.password === DEMO_ACCOUNTS.backoffice.password) ||
      (email === DEMO_ACCOUNTS.mobile.email &&
        payload.password === DEMO_ACCOUNTS.mobile.password);

    try {
      let user: User;
      if (payload.action === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, email, payload.password);
        user = cred.user;
        if (payload.fullName) {
          await updateProfile(user, { displayName: payload.fullName });
        }
      } else {
        try {
          const cred = await signInWithEmailAndPassword(auth, email, payload.password);
          user = cred.user;
        } catch (signInErr) {
          const errStr = signInErr instanceof Error ? signInErr.message : String(signInErr);
          // Auto-provision demo account on first click if not yet created in Firebase Auth
          if (
            isDemoCred &&
            (errStr.includes('auth/user-not-found') || errStr.includes('auth/invalid-credential'))
          ) {
            const cred = await createUserWithEmailAndPassword(auth, email, payload.password);
            user = cred.user;
            const demoName =
              payload.mode === 'backoffice'
                ? DEMO_ACCOUNTS.backoffice.name
                : DEMO_ACCOUNTS.mobile.name;
            await updateProfile(user, { displayName: demoName });
          } else {
            throw signInErr;
          }
        }
      }

      if (payload.mode === 'backoffice') {
        let adminStatus = await checkIsAdminUser(user.uid, user.email ?? '');
        if (!adminStatus) {
          adminStatus = await claimInitialAdminIfAvailable(
            user.uid,
            user.email ?? '',
            payload.fullName || user.displayName || 'Admin KING HRM'
          );
        }
        if (adminStatus) {
          await ensureInitialCompanyData(
            user.uid,
            user.email ?? '',
            payload.fullName || user.displayName || 'Admin KING HRM'
          );
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          setAuthError(
            `Akun ${user.email} terdaftar sebagai Karyawan, bukan Admin Backoffice. Silakan beralih ke Mobile App Karyawan.`
          );
        }
      } else if (email === DEMO_ACCOUNTS.mobile.email) {
        await ensureDemoEmployeeProfile(
          user.uid,
          email,
          payload.fullName || user.displayName || DEMO_ACCOUNTS.mobile.name
        );
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const mapped = mapFirebaseAuthError(raw);
      setNeedsEmailProviderSetup(mapped.needsProviderSetup);
      setAuthError(mapped.message);
    } finally {
      setLoginBusy(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setSelectedPreviewEmployeeId(null);
    setAuthError(null);
  };

  if (!authReady || (firebaseUser && !roleChecked)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#0B1220] text-emerald-400 mx-auto flex items-center justify-center font-display font-bold">
            K
          </div>
          <p className="text-sm font-semibold text-slate-800">Memuat KING HRM...</p>
          <p className="text-xs text-slate-500">Menghubungkan sinkronisasi database real-time</p>
        </div>
      </div>
    );
  }

  // Not signed in OR non-admin attempting Backoffice
  if (!firebaseUser || (portalMode === 'backoffice' && !isAdmin)) {
    return (
      <>
        <AuthSwitchPortal
          portalMode={portalMode}
          onChangeMode={handleSetPortalMode}
          onSubmitAuth={handleSubmitAuth}
          authError={authError}
          needsEmailProviderSetup={needsEmailProviderSetup}
          loading={loginBusy}
        />
        <OfflineIndicator />
      </>
    );
  }

  const userInfo = {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    displayName: firebaseUser.displayName ?? 'Pengguna KING HRM',
  };

  return (
    <>
      {portalMode === 'backoffice' && isAdmin ? (
        <BackofficeApp
          authUser={userInfo}
          employees={allEmployees}
          positions={positions}
          schedules={schedules}
          attendanceList={attendanceList}
          leaveRequests={leaveRequests}
          payrolls={payrolls}
          onSwitchToMobile={() => handleSetPortalMode('mobile')}
          onSignOut={handleSignOut}
        />
      ) : (
        <MobileEmployeeApp
          authUser={userInfo}
          isAdmin={isAdmin}
          employee={activeMobileEmployee}
          allEmployees={allEmployees}
          positions={positions}
          schedules={schedules}
          attendanceList={attendanceList}
          leaveRequests={leaveRequests}
          payrolls={payrolls}
          onSwitchToBackoffice={() => handleSetPortalMode('backoffice')}
          onSelectPreviewEmployee={setSelectedPreviewEmployeeId}
          selectedPreviewEmployeeId={selectedPreviewEmployeeId}
          onSignOut={handleSignOut}
        />
      )}
      <OfflineIndicator />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <KingHrmRoot />
    </ErrorBoundary>
  );
}
