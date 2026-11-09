import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  UserPlus,
  AlertTriangle,
  Search,
  CheckCircle,
  UserCheck,
  ShieldCheck,
  Phone,
  Building,
  Check,
  ChevronRight,
  ArrowRight,
  Sparkles,
  HelpCircle,
  X
} from 'lucide-react';

export default function OnboardingPage() {
  const { liffProfile, setNeedsOnboarding, setCurrentDoctor } = useAuth();
  
  // Fallback for desktop testing / direct URL access
  const activeLiffProfile = liffProfile || {
    displayName: 'นพ.ทดสอบ (LINE Test User)',
    pictureUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120',
    userId: 'U_TEST_DOCTOR_BSI'
  };

  // Search & List state
  const [searchQuery, setSearchQuery] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [searching, setSearching] = useState(false);
  
  // Selected Doctor for confirmation
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  
  // Manual Employee ID fallback mode
  const [manualMode, setManualMode] = useState(false);
  const [employeeId, setEmployeeId] = useState('');

  // Status state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Initial fetch of doctors
  const fetchDoctors = async (query = '') => {
    setSearching(true);
    try {
      const res = await fetch(`/api/auth/search-doctors?query=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setDoctors(data.doctors || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    fetchDoctors('');
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDoctors(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle account link submission
  const handleConfirmLink = async () => {
    if (!selectedDoctor && !employeeId) return;

    setError('');
    setLoading(true);

    try {
      const payload = {
        lineUserId: activeLiffProfile?.userId || 'TEMP_USER_ID',
        doctorId: selectedDoctor?.id,
        employeeId: manualMode ? employeeId : undefined,
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
        setConfirmModalOpen(false);
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
      setConfirmModalOpen(false);
    } finally {
      setLoading(false);
    }
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
            ลงทะเบียนเข้าใช้งานครั้งแรก
          </h1>
          <p className="text-xs text-sky-100 mt-1 font-medium">
            Doctor Leave @ LINE • โรงพยาบาลกรุงเทพศิริโรจน์
          </p>
        </div>

        {/* LINE Identity Card */}
        {activeLiffProfile && (
          <div className="px-6 pt-5">
            <div className="flex items-center gap-3 bg-sky-50/80 p-3 rounded-2xl border border-sky-100">
              <div className="relative">
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
              <p className="text-[11px] text-emerald-700 mt-0.5">กำลังนำท่านเข้าสู่ระบบยื่นใบลา...</p>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {!success && (
          <div className="p-6 space-y-4">
            
            {!manualMode ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>ค้นหาข้อมูลแพทย์ของท่าน:</span>
                    <span className="text-[10px] font-normal text-slate-400">ค้นหาได้จากชื่อ หรือเบอร์โทรศัพท์</span>
                  </label>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="พิมพ์ชื่อแพทย์, เลข ว. (เช่น 48921) หรือเบอร์โทร..."
                      className="w-full pl-9 pr-9 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 focus:bg-white focus:border-[#006699] focus:ring-2 focus:ring-[#006699]/10 outline-none transition-all placeholder:text-slate-400 font-medium"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Doctor Cards List */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                  {searching ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      กำลังค้นหาข้อมูล...
                    </div>
                  ) : doctors.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-4">
                      <p>ไม่พบรายชื่อแพทย์ที่ตรงกับคำค้นหา</p>
                      <button
                        type="button"
                        onClick={() => setManualMode(true)}
                        className="mt-2 text-[#006699] font-bold underline hover:text-sky-700"
                      >
                        ต้องการกรอกด้วยรหัสพนักงานแทนหรือไม่?
                      </button>
                    </div>
                  ) : (
                    doctors.map((doc) => {
                      const isLinked = doc.is_linked;
                      return (
                        <div
                          key={doc.id}
                          onClick={() => {
                            if (isLinked) {
                              setError(`บัญชีของ ${doc.prefix_th}${doc.first_name_th} ได้ผูกกับ LINE ไปแล้ว หากต้องการเปลี่ยนกรุณาติดต่อฝ่ายการแพทย์`);
                              return;
                            }
                            setError('');
                            setSelectedDoctor(doc);
                            setConfirmModalOpen(true);
                          }}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 text-left ${
                            isLinked
                              ? 'bg-slate-50/70 border-slate-200 opacity-60 cursor-not-allowed'
                              : 'bg-white hover:bg-sky-50/40 border-slate-200 hover:border-[#006699] cursor-pointer shadow-xs hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                              <img
                                src={doc.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100'}
                                alt={doc.first_name_th}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 leading-snug truncate">
                                {doc.prefix_th}{doc.first_name_th} {doc.last_name_th}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                  {doc.department_name}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  doc.doctor_type === 'FULL_TIME'
                                    ? 'bg-sky-50 text-[#006699] border border-sky-100'
                                    : 'bg-purple-50 text-purple-700 border border-purple-100'
                                }`}>
                                  {doc.doctor_type === 'FULL_TIME' ? 'ประจำ (FT)' : 'พาร์ทไทม์ (PT)'}
                                </span>
                                {doc.license_no && (
                                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-mono">
                                    {doc.license_no}
                                  </span>
                                )}
                                {doc.phone_masked && doc.phone_masked !== '-' && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {doc.phone_masked}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            {isLinked ? (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded-full">
                                ผูกแล้ว
                              </span>
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-sky-100 text-[#006699] flex items-center justify-center group-hover:bg-[#006699] group-hover:text-white transition-colors">
                                <ChevronRight className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-2 text-center border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setManualMode(true)}
                    className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
                  >
                    หรือระบุด้วยรหัสพนักงาน (Employee ID) &rarr;
                  </button>
                </div>
              </>
            ) : (
              /* Manual Employee ID Form */
              <div className="space-y-4">
                <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-100 text-[11px] text-slate-600 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-[#006699] shrink-0 mt-0.5" />
                  <span>
                    ระบุรหัสพนักงานแพทย์ของท่านที่ขึ้นต้นด้วย <strong>DOC-</strong> หรือ <strong>EMP-</strong>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    รหัสพนักงาน (Employee ID) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                    placeholder="เช่น DOC-001"
                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#006699] focus:ring-2 focus:ring-[#006699]/10 outline-none text-sm font-mono uppercase"
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setManualMode(false)}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    กลับไปค้นหาชื่อ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!employeeId.trim()) {
                        setError('กรุณากรอกรหัสพนักงาน');
                        return;
                      }
                      handleConfirmLink();
                    }}
                    disabled={loading}
                    className="flex-1 bg-[#006699] hover:bg-[#005580] text-white font-bold py-2.5 px-3 rounded-xl text-xs shadow-sm transition-all disabled:opacity-50"
                  >
                    {loading ? 'กำลังตรวจสอบ...' : 'ผูกบัญชี LINE'}
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Security / PDPA Footer */}
        <div className="bg-slate-50/80 px-6 py-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>ระบบปลอดภัยตามมาตรฐาน PDPA • ข้อมูลส่งตรงเฉพาะบุคคล 1-on-1</span>
        </div>

      </div>

      {/* Confirmation Modal */}
      {confirmModalOpen && selectedDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-sky-100 text-[#006699] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <UserCheck className="w-7 h-7" />
            </div>

            <h3 className="text-base font-bold text-slate-800">
              ยืนยันการผูกบัญชีแพทย์
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              กรุณาตรวจสอบข้อมูลของท่านให้ถูกต้องก่อนกดยืนยัน
            </p>

            {/* Doctor Confirmation Box */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-2 mb-4">
              <div className="flex items-center gap-3">
                <img
                  src={selectedDoctor.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100'}
                  alt={selectedDoctor.first_name_th}
                  className="w-12 h-12 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <div className="font-bold text-sm text-slate-800">
                    {selectedDoctor.prefix_th}{selectedDoctor.first_name_th} {selectedDoctor.last_name_th}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    แผนก: <strong>{selectedDoctor.department_name}</strong>
                  </div>
                  <div className="text-[10px] text-[#006699] font-semibold mt-0.5 font-mono">
                    รหัส: {selectedDoctor.employee_id} {selectedDoctor.license_no ? `• ${selectedDoctor.license_no}` : ''}
                  </div>
                </div>
              </div>

              {liffProfile && (
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600">
                  <span>บัญชี LINE:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <img src={liffProfile.pictureUrl} alt="" className="w-4 h-4 rounded-full" />
                    <span>{liffProfile.displayName}</span>
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                disabled={loading}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmLink}
                disabled={loading}
                className="flex-1 bg-[#006699] hover:bg-[#005580] text-white font-bold py-2.5 px-3 rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <span>กำลังผูกบัญชี...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>ใช่ ฉันคือท่านนี้</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
