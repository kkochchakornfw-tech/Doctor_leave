import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Building,
  Check,
  Search,
  Sparkles,
  HelpCircle,
  X,
  ArrowRight,
  UserCheck,
  RotateCcw,
  QrCode
} from 'lucide-react';
import LineLoginModal from '../components/LineLoginModal';

export default function OnboardingPage() {
  const { liffProfile, setNeedsOnboarding, setCurrentDoctor } = useAuth();
  const [showQrModal, setShowQrModal] = useState(false);
  
  // Fallback for desktop testing / direct URL access
  const activeLiffProfile = liffProfile || {
    displayName: 'นพ.ทดสอบ (LINE Test User)',
    pictureUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120',
    userId: 'U_TEST_DOCTOR_BSI'
  };

  // Input states
  const [licenseInput, setLicenseInput] = useState('');
  const [employeeIdInput, setEmployeeIdInput] = useState('');
  const [mode, setMode] = useState('LICENSE'); // 'LICENSE' or 'EMP_ID'
  
  // Verification states
  const [searching, setSearching] = useState(false);
  const [verifiedDoctor, setVerifiedDoctor] = useState(null);
  
  // Submit states
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Search by exact License No. or Employee ID
  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    const query = mode === 'LICENSE' ? licenseInput.trim() : employeeIdInput.trim();
    if (!query) {
      setError(mode === 'LICENSE' ? 'กรุณาระบุเลข ว. (เช่น 99999 หรือ 28914)' : 'กรุณาระบุรหัสพนักงาน (เช่น DOC-TEST)');
      return;
    }

    setError('');
    setSearching(true);
    setVerifiedDoctor(null);

    try {
      const res = await fetch('/api/auth/verify-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_no: mode === 'LICENSE' ? query : undefined,
          employee_id: mode === 'EMP_ID' ? query : undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.doctor) {
        setVerifiedDoctor(data.doctor);
        if (data.doctor.is_linked) {
          setError(`บัญชีของ ${data.doctor.prefix_th}${data.doctor.first_name_th} ${data.doctor.last_name_th} ได้ผูกกับ LINE ไปแล้ว หากต้องการเปลี่ยนบัญชี LINE กรุณาติดต่อฝ่ายการแพทย์`);
        }
      } else {
        setError(data.error || 'ไม่พบข้อมูลแพทย์ในระบบ');
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSearching(false);
    }
  };

  // Confirm binding LINE with verified doctor
  const handleConfirmLink = async () => {
    if (!verifiedDoctor || verifiedDoctor.is_linked) return;

    setError('');
    setLoading(true);

    try {
      const payload = {
        lineUserId: activeLiffProfile?.userId || 'TEMP_USER_ID',
        doctorId: verifiedDoctor.id,
        lineDisplayName: activeLiffProfile?.displayName,
        linePictureUrl: activeLiffProfile?.pictureUrl
      };

      const res = await fetch('/api/auth/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          if (setCurrentDoctor) setCurrentDoctor(data.doctor);
          if (setNeedsOnboarding) setNeedsOnboarding(false);
          window.location.href = '/';
        }, 1200);
      } else {
        setError(data.error || 'เกิดข้อผิดพลาดในการผูกบัญชี');
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const resetSearch = () => {
    setVerifiedDoctor(null);
    setError('');
    setLicenseInput('');
    setEmployeeIdInput('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50/50 to-slate-200 py-6 px-4 flex flex-col items-center justify-center">
      <div className="bg-white rounded-3xl shadow-2xl border border-white/60 max-w-lg w-full overflow-hidden shadow-sky-950/10 transition-all duration-300">
        
        {/* Header Branding */}
        <div className="bg-gradient-to-r from-[#006699] via-[#0284c7] to-[#008b8b] text-white p-6 relative overflow-hidden text-center">
          <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none"></div>
          
          <img
            src="/official_bsi_logo.svg"
            alt="Bangkok Hospital Siriroj"
            className="h-9 w-auto mx-auto mb-3 brightness-0 invert drop-shadow-sm"
          />

          <h1 className="text-xl font-bold tracking-tight">
            ยืนยันตัวตนแพทย์เพื่อผูกบัญชี LINE
          </h1>
          <p className="text-xs text-sky-100 mt-1 font-medium">
            Doctor Leave @ LINE • โรงพยาบาลกรุงเทพศิริโรจน์ (BSI)
          </p>
        </div>

        {/* LINE Identity Card */}
        {activeLiffProfile && (
          <div className="px-6 pt-5">
            <div className="flex items-center gap-3 bg-sky-50/80 p-3 rounded-2xl border border-sky-100">
              <div className="relative shrink-0">
                <img
                  src={activeLiffProfile.pictureUrl || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100'}
                  alt={activeLiffProfile.displayName}
                  className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-xs"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="text-[10px] uppercase font-bold text-sky-700 tracking-wider">
                  บัญชี LINE ของท่าน
                </div>
                <div className="text-sm font-bold text-slate-800 truncate">
                  {activeLiffProfile.displayName}
                </div>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                <Check className="w-3 h-3" />
                <span>เข้าสู่ระบบแล้ว</span>
              </span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2.5 animate-shake">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium leading-tight">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mx-6 mt-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-3 animate-in zoom-in-95">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
            <div>
              <div className="font-bold text-sm">ผูกบัญชี LINE เรียบร้อยแล้ว!</div>
              <p className="text-[11px] text-emerald-700 mt-0.5">ยินดีต้อนรับเข้าสู่ระบบ กำลังนำท่านไปยังแบบฟอร์มยื่นใบลา...</p>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {!success && (
          <div className="p-6 space-y-4">
            
            {/* Step 1: Input License No. (เลข ว.) */}
            {!verifiedDoctor ? (
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>
                      {mode === 'LICENSE' ? 'ระบุเลขที่ใบประกอบวิชาชีพ (เลข ว.) ของท่าน:' : 'ระบุรหัสพนักงานของท่าน:'}
                    </span>
                    <span className="text-[10px] font-normal text-slate-400">
                      {mode === 'LICENSE' ? 'พิมพ์เฉพาะตัวเลข' : 'เช่น DOC-TEST'}
                    </span>
                  </label>

                  {mode === 'LICENSE' ? (
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-[#006699] text-sm bg-sky-100 px-2 py-0.5 rounded-md border border-sky-200">
                        ว.
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoFocus
                        value={licenseInput}
                        onChange={(e) => setLicenseInput(e.target.value)}
                        placeholder="เช่น 99999 หรือ 28914"
                        className="w-full pl-14 pr-4 py-3 bg-slate-50 rounded-2xl border border-slate-300 text-base font-mono font-bold text-slate-900 focus:bg-white focus:border-[#006699] focus:ring-4 focus:ring-sky-100 outline-none transition-all placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal placeholder:text-sm tracking-wide"
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        autoFocus
                        value={employeeIdInput}
                        onChange={(e) => setEmployeeIdInput(e.target.value)}
                        placeholder="ระบุรหัสพนักงาน เช่น DOC-TEST หรือ EMP-KOONG"
                        className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:bg-white focus:border-[#006699] focus:ring-4 focus:ring-sky-100 outline-none transition-all placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal"
                      />
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    🔒 <span className="font-semibold text-slate-700">การรักษาความปลอดภัย:</span> เพื่อป้องกันการแอบอ้างสิทธิ์ ระบบจะแสดงข้อมูลโปรไฟล์แพทย์เฉพาะเมื่อกรอกเลข ว. ถูกต้องสมบูรณ์เท่านั้น
                  </p>
                </div>

                {/* Submit Search Button */}
                <button
                  type="submit"
                  disabled={searching}
                  className="w-full py-3 bg-[#006699] hover:bg-[#005580] disabled:bg-slate-300 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  {searching ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>กำลังตรวจสอบข้อมูล...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>ตรวจสอบข้อมูลแพทย์</span>
                    </>
                  )}
                </button>

                {/* Mode toggle */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === 'LICENSE' ? 'EMP_ID' : 'LICENSE');
                      setError('');
                    }}
                    className="text-xs text-slate-500 hover:text-[#006699] font-medium underline transition-colors"
                  >
                    {mode === 'LICENSE' 
                      ? 'ไม่มีเลข ว. หรือเป็นเจ้าหน้าที่ฝ่ายการแพทย์? (คลิกกรอกรหัสพนักงาน)' 
                      : 'กลับไปกรอกด้วยเลข ว.'}
                  </button>
                </div>
              </form>
            ) : (
              /* Step 2: Show Verified Doctor Profile Card & Confirm Link */
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 bg-sky-50/60 rounded-2xl border-2 border-sky-200">
                  <div className="text-[10px] font-bold text-[#006699] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>ข้อมูลแพทย์ที่ตรวจสอบพบในฐานข้อมูล BSI</span>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0 shadow-sm">
                      <img
                        src={verifiedDoctor.avatar || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100'}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 text-sm leading-tight truncate">
                        {verifiedDoctor.prefix_th}{verifiedDoctor.first_name_th} {verifiedDoctor.last_name_th}
                      </h3>
                      <div className="text-xs font-semibold text-[#006699] mt-0.5 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{verifiedDoctor.department_name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-2">
                        {verifiedDoctor.license_no && (
                          <span className="bg-sky-100 text-[#002d74] px-1.5 py-0.2 rounded font-bold">
                            {verifiedDoctor.license_no}
                          </span>
                        )}
                        <span>รหัส: {verifiedDoctor.employee_id}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Confirm Action Button */}
                {!verifiedDoctor.is_linked ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleConfirmLink}
                      disabled={loading}
                      className="w-full py-3.5 bg-[#06C755] hover:bg-[#05b34c] disabled:bg-slate-300 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>กำลังผูกบัญชี LINE...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5 stroke-[2.5]" />
                          <span>ยืนยันว่านี่คือฉัน และผูกบัญชี LINE</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={resetSearch}
                      disabled={loading}
                      className="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>ไม่ใช่ข้อมูลของท่าน? ระบุเลข ว. ใหม่</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={resetSearch}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                    >
                      ระบุเลข ว. อื่น
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Help Card & Admin QR Scan Access */}
            <div className="pt-3 border-t border-slate-100 text-center space-y-3">
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="w-full py-2.5 px-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <QrCode className="w-4 h-4 text-[#06C755]" />
                <span>เจ้าหน้าที่แอดมิน / ฝ่ายการแพทย์ สแกน QR Code เข้าสู่ระบบ</span>
              </button>

              <p className="text-[11px] text-slate-400">
                หากพบปัญหาในการผูกบัญชี กรุณาติดต่อฝ่ายการแพทย์ โทร. <span className="font-mono font-bold text-slate-600">089-470-9256</span> (พี่กุ้ง)
              </p>
            </div>

          </div>
        )}

      </div>

      {/* LINE QR Code Login Modal */}
      <LineLoginModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
      />
    </div>
  );
}
