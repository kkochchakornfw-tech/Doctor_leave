import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserCog } from 'lucide-react';

export default function PersonaSwitcher() {
  const { doctors, currentDoctor, switchDoctor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!doctors || doctors.length === 0) return null;

  // Deduplicate doctors by id and exclude legacy duplicate DOC-001 (นพ.ปารวี) if present
  const uniqueDoctors = doctors.filter(
    (doc, index, self) =>
      doc.id !== 'c0000000-0000-0000-0000-000000000002' &&
      self.findIndex(d => d.id === doc.id) === index
  );

  const getRoleMeta = (doc) => {
    if (
      doc.id === 'c0000000-0000-0000-0000-000000000099' ||
      doc.employee_id === 'EXEC-PARIWAT' ||
      doc.roles?.includes('EXECUTIVE_APPROVER')
    ) {
      return { badge: 'ผช.ผอ. (Step 2)', color: 'bg-purple-600 text-white font-bold' };
    }
    if (doc.roles?.includes('MEDICAL_ADMIN') || doc.employee_id === 'EMP-KOONG') {
      return { badge: 'HR / Admin (พี่กุ้ง)', color: 'bg-amber-500 text-slate-950 font-bold' };
    }
    if (doc.roles?.includes('DEPT_HEAD')) {
      return { badge: 'หัวหน้าแผนก (Step 1)', color: 'bg-emerald-600 text-white font-bold' };
    }
    if (doc.doctor_type === 'PART_TIME') {
      return { badge: 'แพทย์ PT', color: 'bg-indigo-600 text-white' };
    }
    return { badge: 'แพทย์ FT', color: 'bg-sky-600 text-white' };
  };

  const handleSelectPersona = (docId) => {
    const targetDoc = uniqueDoctors.find(d => d.id === docId);
    if (!targetDoc) return;

    switchDoctor(docId);

    const roles = targetDoc.roles || [];
    const isAdmin = roles.includes('ADMIN') || roles.includes('MEDICAL_ADMIN');
    const isDeptHead = roles.includes('DEPT_HEAD') || roles.includes('APPROVER');
    const isHrOnly = targetDoc.employee_id === 'EMP-KOONG' || (!roles.includes('DOCTOR') && !roles.includes('DEPT_HEAD'));
    const path = location.pathname;

    // If switching to HR/Admin-only account (พี่กุ้ง) while on self-leave pages, redirect to /admin
    if (isHrOnly && (path === '/' || path.startsWith('/my-history'))) {
      navigate('/admin');
      return;
    }

    // If user is on an Admin-only page (/admin, /admin/criteria, /admin/tenure, /admin/master-data, /admin/audit)
    // and switches to a non-admin persona, navigate to that persona's appropriate page so it never gets stuck!
    const isAdminOnlyPage =
      path === '/admin' ||
      path.startsWith('/admin/criteria') ||
      path.startsWith('/admin/tenure') ||
      path.startsWith('/admin/master-data') ||
      path.startsWith('/admin/audit');

    if (isAdminOnlyPage && !isAdmin) {
      navigate(isDeptHead ? '/approver' : '/');
      return;
    }

    // If user is on /admin/shifts or /approver and switches to a regular staff doctor, navigate to LIFF form (/)
    if ((path.startsWith('/admin/shifts') || path.startsWith('/approver')) && !isAdmin && !isDeptHead) {
      navigate('/');
    }
  };

  return (
    <div className="bg-slate-900 text-white text-xs border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2">
        {/* Mobile View (< md): Compact Single-Row Dropdown */}
        <div className="flex md:hidden items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 font-semibold text-sky-400 shrink-0">
            <UserCog className="w-3.5 h-3.5" />
            <span>สลับบทบาท:</span>
          </span>

          <select
            value={currentDoctor?.id || ''}
            onChange={(e) => handleSelectPersona(e.target.value)}
            aria-label="เลือกบทบาทจำลอง"
            className="bg-slate-800 text-white border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-sky-400 flex-1 max-w-[260px] truncate cursor-pointer"
          >
            {uniqueDoctors.map(doc => {
              const meta = getRoleMeta(doc);
              return (
                <option key={doc.id} value={doc.id}>
                  {doc.prefix_th}{doc.first_name_th} {doc.last_name_th} — [{meta.badge}]
                </option>
              );
            })}
          </select>
        </div>

        {/* Desktop View (>= md): Single Unified List with Key Approvers + Staff Dropdown */}
        <div className="hidden md:flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <UserCog className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-semibold text-sky-400">สลับบทบาทจำลอง (Persona Switcher):</span>
              <span>คลิกเลือกผู้ใช้งานเพื่อทดสอบสิทธิ์และสายอนุมัติ 2 ขั้นตอน (หัวหน้าแผนก &gt;&gt; นพ.ปริวรรธน์)</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              กำลังใช้งาน: <strong className="text-white">{currentDoctor?.prefix_th}{currentDoctor?.first_name_th} {currentDoctor?.last_name_th}</strong> ({currentDoctor?.doctor_type === 'PART_TIME' ? 'PT' : 'FT'})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* 1. Key Approver Personas (Admin + Exec + 11 Dept Heads) */}
            {uniqueDoctors
              .filter(doc =>
                doc.employee_id === 'EMP-KOONG' ||
                doc.employee_id === 'EXEC-PARIWAT' ||
                doc.roles?.includes('DEPT_HEAD') ||
                doc.roles?.includes('EXECUTIVE_APPROVER')
              )
              .map(doc => {
                const isActive = currentDoctor?.id === doc.id;
                const meta = getRoleMeta(doc);
                return (
                  <button
                    type="button"
                    key={doc.id}
                    onClick={() => handleSelectPersona(doc.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-xs ring-2 ring-sky-400 font-bold'
                        : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <span>{doc.prefix_th}{doc.first_name_th}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded ${meta.color}`}>
                      {meta.badge}
                    </span>
                  </button>
                );
              })}

            {/* 2. Quick Selector for Other Staff Doctors (274 doctors) */}
            {uniqueDoctors.filter(doc =>
              doc.employee_id !== 'EMP-KOONG' &&
              doc.employee_id !== 'EXEC-PARIWAT' &&
              !doc.roles?.includes('DEPT_HEAD')
            ).length > 0 && (
              <select
                value={
                  uniqueDoctors.some(d =>
                    d.id === currentDoctor?.id &&
                    d.employee_id !== 'EMP-KOONG' &&
                    d.employee_id !== 'EXEC-PARIWAT' &&
                    !d.roles?.includes('DEPT_HEAD')
                  )
                    ? currentDoctor?.id
                    : ''
                }
                onChange={(e) => handleSelectPersona(e.target.value)}
                aria-label="เลือกแพทย์ประจำแผนกท่านอื่น"
                className="bg-slate-800 text-white border border-slate-700 rounded-lg px-2.5 py-1 text-[11px] font-medium focus:outline-hidden focus:ring-1 focus:ring-sky-400 cursor-pointer max-w-[280px]"
              >
                <option value="" disabled>
                  -- เลือกแพทย์ท่านอื่น (
                  {uniqueDoctors.filter(doc =>
                    doc.employee_id !== 'EMP-KOONG' &&
                    doc.employee_id !== 'EXEC-PARIWAT' &&
                    !doc.roles?.includes('DEPT_HEAD')
                  ).length} ท่าน) --
                </option>
                {uniqueDoctors
                  .filter(doc =>
                    doc.employee_id !== 'EMP-KOONG' &&
                    doc.employee_id !== 'EXEC-PARIWAT' &&
                    !doc.roles?.includes('DEPT_HEAD')
                  )
                  .map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.prefix_th}{doc.first_name_th} {doc.last_name_th} [{doc.doctor_type === 'FULL_TIME' ? 'FT' : 'PT'}] — {doc.position}
                    </option>
                  ))}
              </select>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
