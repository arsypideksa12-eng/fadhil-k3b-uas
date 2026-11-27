# KING HRM Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Identity & Email Verification**: All writes and PII reads require `request.auth != null && request.auth.token.email_verified == true`.
2. **Role Isolation**: Only verified administrators (`/admins/{uid}` or bootstrapped admin `pideksaarsy1206@gmail.com`) can create/modify/delete `positions`, `workSchedules`, `payrolls`, approve/reject `leaveRequests`, or modify another employee's `dailyRate` and `status`.
3. **Employee PII Protection**: `employees` documents contain PII (`email`, `phone`, `bankAccount`, `dailyRate`). Non-admin users can only `get` or `list` their own employee record (`userId == request.auth.uid` or pre-assigned `email == request.auth.token.email`).
4. **Daily Wage Integrity**: When an employee clocks in (`attendance` create), `dailyRateSnapshot` MUST equal the authoritative `dailyRate` stored on their `employees/{employeeId}` document (`get(...)`), preventing client-side salary inflation.
5. **Clock-Out Action Containment**: Once clocked in, an employee can ONLY update `checkOutTime`, `checkOutPhoto`, `notes`, and `updatedAt` on their own attendance record. They cannot tamper with `checkInTime`, `status`, `dailyRateSnapshot`, or `dateKey`.
6. **Terminal State Locking**: Once a `leaveRequest` is `approved` or `rejected`, non-admin users cannot alter or delete it. Only admins can transition `pending` -> `approved`/`rejected`.
7. **Temporal Integrity**: All `createdAt` and `updatedAt` timestamps must match `request.time` (`serverTimestamp()`).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unverified Email Spoof**: `{ auth: { uid: 'u1', token: { email: 'pideksaarsy1206@gmail.com', email_verified: false } } }` -> `PERMISSION_DENIED`.
2. **Self-Assigned Admin**: Non-admin attempts `setDoc('/admins/u1', { uid: 'u1', ... })` -> `PERMISSION_DENIED`.
3. **Employee Salary Inflation on Self-Onboarding**: Non-admin creates `/employees/u1` with `dailyRate: 9999999` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Attendance**: Employee creates `/attendance/att1` with extra `isVerifiedAdmin: true` -> `PERMISSION_DENIED`.
5. **Daily Rate Snapshot Tampering**: Employee creates `/attendance/att1` with `dailyRateSnapshot: 5000000` when their `/employees/emp1` has `dailyRate: 300000` -> `PERMISSION_DENIED`.
6. **Retroactive Check-In Tampering**: Employee updates `/attendance/att1` modifying `checkInTime` or `status: 'present'` -> `PERMISSION_DENIED`.
7. **Cross-User Attendance Forgery**: Employee A (`u1`) creates `/attendance/att2` with `userId: 'u2'` -> `PERMISSION_DENIED`.
8. **Blanket Employee PII Scraping**: Employee A executes `list` on `/employees` without `where('userId', '==', 'u1')` -> `PERMISSION_DENIED`.
9. **Self-Approving Leave Request**: Employee creates `/leaveRequests/l1` with `status: 'approved'` -> `PERMISSION_DENIED`.
10. **Mutating Decided Leave Request**: Employee updates `/leaveRequests/l1` after status is `rejected` -> `PERMISSION_DENIED`.
11. **ID Poisoning**: Write to `/positions/` with 200-char ID containing invalid symbols `../../admin` -> `PERMISSION_DENIED`.
12. **Client Timestamp Spoofing**: Write to `/attendance/att1` with `createdAt: '2020-01-01'` instead of `request.time` -> `PERMISSION_DENIED`.
