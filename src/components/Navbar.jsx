import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Clock,
  CheckSquare,
  LayoutDashboard,
  History,
  MessageCircle,
  Menu,
  X,
  Award,
  GitMerge,
  Sliders,
  CalendarRange,
  ChevronDown,
  Settings2,
  UserCheck,
  ShieldCheck,
  Check,
  QrCode
} from 'lucide-react';
import LineSimulatorModal from './LineSimulatorModal';
import LineLoginModal from './LineLoginModal';

export default function Navbar() {
  const location = useLocation();
  const { currentDoctor, switchDoctorByEmpId } = useAuth();
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [masterDataOpen, setMasterDataOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [msgCount, setMsgCount] = useState(0);

  const masterDataRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (masterDataRef.current && !masterDataRef.current.contains(event.target)) {
        setMasterDataOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Poll simulator messages count
  useEffect(() => {
    const checkMsgs = async () => {
      try {
        const res = await fetch('/api/line/simulator/messages');
        if (res.ok) {
          const data = await res.json();
          setMsgCount(data.length);
        }
      } catch (err) {
        // Ignore
      }
    };
    checkMsgs();
    const interval = setInterval(checkMsgs, 3000);
    return () => clearInterval(interval);
  }, []);

  const roles = currentDoctor?.roles || [];
  const isAdmin = roles.includes('ADMIN') || roles.includes('MEDICAL_ADMIN');
  const isApprover = roles.includes('APPROVER') || roles.includes('DEPT_HEAD');
  const isDoctor = roles.includes('DOCTOR');
  const isHrOnly = isAdmin && !isDoctor && !isApprover;
  const isDoctorOnly = isDoctor && !isAdmin && !isApprover;

  // Master Data Dropdown items
  const masterDataItems = [
    { to: '/admin/master-data', label: 'สายอนุมัติแผนก & รายชื่อแพทย์', desc: 'ตั้งค่าสายอนุมัติรายแผนก, ตรวจสอบรายชื่อแพทย์', icon: GitMerge },
    { to: '/admin/criteria', label: 'เกณฑ์โควตาแผนก (Quota)', desc: 'กำหนดจำนวนแพทย์ขั้นต่ำที่ต้องปฏิบัติงาน / ลาได้พร้อมกัน', icon: Sliders },
    { to: '/admin/tenure', label: 'เกณฑ์ลาพักร้อน 20 วัน & อายุงาน', desc: 'หลังครบ 6 เดือน (FT) • คำนวณตามปฏิทิน', icon: Award },
  ];

  const isMasterDataActive = masterDataItems.some(item => location.pathname === item.to);

  const handleQuickSwitch = (empId) => {
    switchDoctorByEmpId(empId);
    setProfileDropdownOpen(false);
  };

  return (
    <>
      {/* Main Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-2 sm:gap-4">
            
            {/* Official Hospital Brand Logo & Name */}
            <Link to="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0 group">
              <img 
                src="/official_bsi_logo.svg" 
                alt="Bangkok Hospital Siriroj" 
                className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-102 shrink-0" 
              />
              <div className="border-l border-slate-200 pl-2 sm:pl-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-800 text-xs sm:text-sm leading-tight whitespace-nowrap">
                    Doctor Leave Portal
                  </span>
                  <span className="bg-sky-100 text-[#002d74] text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-sky-200 shrink-0">
                    BSI
                  </span>
                </div>
                {/* Responsive Subtitle: Full on ultra-wide screens, concise on mid */}
                <p className="text-[11px] text-slate-500 font-medium whitespace-nowrap hidden 2xl:block">
                  ระบบบริหารการลาแพทย์ • โรงพยาบาลกรุงเทพศิริโรจน์
                </p>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium whitespace-nowrap hidden sm:block 2xl:hidden">
                  ระบบบริหารการลาแพทย์ (BSI)
                </p>
              </div>
            </Link>

            {/* Desktop Navigation - Active on xl screens */}
            <nav className="hidden xl:flex items-center gap-1 shrink-0">
              
              {/* 1. ยื่นใบลา (LIFF) - Visible for Doctors */}
              {!isHrOnly && (
                <Link
                  to="/"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                    location.pathname === '/'
                      ? 'bg-sky-50 text-[#006699] border border-sky-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FileText className={`w-3.5 h-3.5 shrink-0 ${location.pathname === '/' ? 'text-[#006699]' : 'text-slate-400'}`} />
                  <span className="whitespace-nowrap">ยื่นใบลา (LIFF)</span>
                </Link>
              )}

              {/* 2. ประวัติ & สิทธิ์คงเหลือ - Visible for Doctor role */}
              {isDoctorOnly && (
                <Link
                  to="/my-history"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                    location.pathname === '/my-history'
                      ? 'bg-sky-50 text-[#006699] border border-sky-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Clock className={`w-3.5 h-3.5 shrink-0 ${location.pathname === '/my-history' ? 'text-[#006699]' : 'text-slate-400'}`} />
                  <span className="whitespace-nowrap">ประวัติ &amp; สิทธิ์คงเหลือ</span>
                </Link>
              )}

              {/* 3. ศูนย์อนุมัติ - Visible for Dept Head / Approver */}
              {isApprover && (
                <Link
                  to="/approver"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                    location.pathname === '/approver'
                      ? 'bg-sky-50 text-[#006699] border border-sky-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <CheckSquare className={`w-3.5 h-3.5 shrink-0 ${location.pathname === '/approver' ? 'text-[#006699]' : 'text-slate-400'}`} />
                  <span className="whitespace-nowrap">ศูนย์อนุมัติ</span>
                </Link>
              )}

              {/* 4. ตารางเวรแพทย์ (Shift Schedule) - Visible for Dept Head & Admin */}
              {(isAdmin || isApprover) && (
                <Link
                  to="/admin/shifts"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                    location.pathname === '/admin/shifts'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <CalendarRange className={`w-3.5 h-3.5 shrink-0 ${location.pathname === '/admin/shifts' ? 'text-emerald-700' : 'text-slate-400'}`} />
                  <span className="whitespace-nowrap">ตารางเวรแพทย์</span>
                </Link>
              )}

              {/* 5. ฝ่ายการแพทย์ (พี่กุ้ง) - Admin Dashboard */}
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                    location.pathname === '/admin'
                      ? 'bg-sky-50 text-[#006699] border border-sky-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <LayoutDashboard className={`w-3.5 h-3.5 shrink-0 ${location.pathname === '/admin' ? 'text-[#006699]' : 'text-slate-400'}`} />
                  <span className="whitespace-nowrap">ฝ่ายการแพทย์</span>
                </Link>
              )}

              {/* 6. ตั้งค่า & เกณฑ์ (Master Data Dropdown) */}
              {isAdmin && (
                <div className="relative" ref={masterDataRef}>
                  <button
                    onClick={() => setMasterDataOpen(!masterDataOpen)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                      isMasterDataActive || masterDataOpen
                        ? 'bg-purple-50 text-purple-800 border border-purple-200 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Settings2 className={`w-3.5 h-3.5 shrink-0 ${isMasterDataActive ? 'text-purple-700' : 'text-slate-400'}`} />
                    <span className="whitespace-nowrap">ตั้งค่า &amp; เกณฑ์</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${masterDataOpen ? 'rotate-180 text-purple-700' : 'text-slate-400'}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {masterDataOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-scale-in">
                      <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                        ระบบจัดการเกณฑ์ &amp; Master Data
                      </div>
                      {masterDataItems.map(item => {
                        const Icon = item.icon;
                        const isSubActive = location.pathname === item.to;
                        return (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setMasterDataOpen(false)}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl transition-all ${
                              isSubActive
                                ? 'bg-purple-50 text-purple-900 font-bold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg mt-0.5 ${isSubActive ? 'bg-purple-200/60 text-purple-800' : 'bg-slate-100 text-slate-500'}`}>
                              <Icon className="w-4 h-4 shrink-0" />
                            </div>
                            <div>
                              <div className="text-xs font-bold whitespace-nowrap">{item.label}</div>
                              <div className="text-[10px] text-slate-400 font-normal">{item.desc}</div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 7. Audit Log (PDPA) */}
              {isAdmin && (
                <Link
                  to="/admin/audit"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                    location.pathname === '/admin/audit'
                      ? 'bg-slate-100 text-slate-900 border border-slate-300 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <History className={`w-3.5 h-3.5 shrink-0 ${location.pathname === '/admin/audit' ? 'text-slate-900' : 'text-slate-400'}`} />
                  <span className="whitespace-nowrap">Audit Log (PDPA)</span>
                </Link>
              )}

            </nav>

            {/* Right Actions: LINE Simulator Button & Active Profile Dropdown */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              
              {/* LINE QR Code Login Button for Admins on PC */}
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold shadow-xs transition-all hover:scale-102 active:scale-98 whitespace-nowrap shrink-0 cursor-pointer"
                title="เข้าสู่ระบบด้วย LINE (สแกน QR Code บนมือถือ)"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="whitespace-nowrap">เข้าสู่ระบบด้วย LINE</span>
              </button>

              {/* LINE Simulator Button */}
              <button
                onClick={() => setIsSimulatorOpen(true)}
                className="relative inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-bold shadow-xs transition-all hover:scale-102 active:scale-98 whitespace-nowrap shrink-0"
                title="เปิดเครื่องจำลองการส่ง LINE Flex Message 1-on-1"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">LINE Simulator</span>
                {msgCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full border-2 border-white animate-bounce">
                    {msgCount}
                  </span>
                )}
              </button>

              {/* Active Profile Dropdown Pill (Never cut off!) */}
              {currentDoctor && (
                <div className="relative shrink-0" ref={profileRef}>
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition-all cursor-pointer bg-white shadow-xs group shrink-0"
                    title="คลิกเพื่อดูข้อมูลบัญชี หรือสลับบทบาททดสอบ"
                  >
                    <div className="relative w-8 h-8 rounded-full overflow-hidden bg-slate-200 border border-slate-300 shrink-0">
                      <img
                        src={currentDoctor.avatar || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100'}
                        alt={currentDoctor.first_name_th}
                        className="w-full h-full object-cover"
                      />
                      {currentDoctor.line_user_id ? (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#06C755] border-2 border-white rounded-full" title="ผูก LINE แล้ว" />
                      ) : (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-slate-400 border-2 border-white rounded-full" title="ยังไม่ผูก LINE" />
                      )}
                    </div>
                    
                    <div className="text-left leading-tight hidden md:block max-w-[130px] lg:max-w-[160px]">
                      <div className="text-xs font-bold text-slate-800 group-hover:text-[#006699] flex items-center gap-1 truncate">
                        <span className="truncate">{currentDoctor.prefix_th}{currentDoctor.first_name_th}</span>
                        {currentDoctor.employee_id === 'DOC-TEST' && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1 py-0.1 rounded font-bold shrink-0">
                            TEST
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium truncate">
                        {currentDoctor.employee_id === 'DOC-TEST' 
                          ? 'แพทย์ทดสอบ (ทุกสิทธิ์)' 
                          : (currentDoctor.department_name || currentDoctor.position || 'แพทย์')}
                      </div>
                    </div>

                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform shrink-0 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Profile Dropdown Menu */}
                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-scale-in">
                      {/* Active Account Details */}
                      <div className="px-4 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <img
                            src={currentDoctor.avatar || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100'}
                            alt=""
                            className="w-11 h-11 rounded-full object-cover border-2 border-sky-100 shadow-xs shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-800 truncate">
                              {currentDoctor.prefix_th}{currentDoctor.first_name_th} {currentDoctor.last_name_th}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              รหัส: <span className="font-semibold text-slate-700">{currentDoctor.employee_id}</span>
                              {currentDoctor.license_no ? ` • ว. ${currentDoctor.license_no}` : ''}
                            </div>
                            <div className="text-[10px] text-[#006699] font-semibold truncate">
                              {currentDoctor.department_name || currentDoctor.position}
                            </div>
                          </div>
                        </div>

                        {/* LINE Connection Pill */}
                        <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">LINE Official:</span>
                          {currentDoctor.line_user_id ? (
                            <span className="inline-flex items-center gap-1 font-bold text-[#06C755]">
                              <span className="w-2 h-2 rounded-full bg-[#06C755] animate-pulse" />
                              ผูก LINE แล้ว
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400">
                              <span className="w-2 h-2 rounded-full bg-slate-300" />
                              ยังไม่ผูก LINE
                            </span>
                          )}
                        </div>

                        {/* Onboarding / Unlink Test Button */}
                        <div className="mt-2">
                          {currentDoctor.line_user_id ? (
                            <button
                              onClick={async () => {
                                try {
                                  await fetch(`/api/doctors/${currentDoctor.id}/unlink-line`, { method: 'POST' });
                                } catch (e) {
                                  console.error(e);
                                }
                                window.location.href = '/onboarding';
                              }}
                              className="w-full text-center py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              title="ปลด LINE ออกจากบัญชีนี้ เพื่อทดสอบขั้นตอน Onboarding สมัครเข้าใช้งานใหม่"
                            >
                              <span>🔓 ปลด LINE เพื่อทดสอบ Onboarding</span>
                            </button>
                          ) : (
                            <Link
                              to="/onboarding"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="w-full text-center py-1.5 px-2 bg-sky-50 hover:bg-sky-100 text-[#006699] border border-sky-200 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              title="เปิดหน้าจอ Onboarding ยืนยันตัวตนเพื่อผูก LINE บัญชีแพทย์"
                            >
                              <span>🔗 ไปหน้า Onboarding ผูก LINE</span>
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* LINE Scan QR Code Login Button */}
                      <div className="px-3 pt-2.5">
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            setIsLoginModalOpen(true);
                          }}
                          className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-[#06C755] hover:from-emerald-700 hover:to-[#05b34c] text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <QrCode className="w-4 h-4" />
                          <span>สแกน QR Code เข้าสู่ระบบด้วย LINE</span>
                        </button>
                      </div>

                      {/* Quick Role / Persona Switcher */}
                      <div className="px-3 pt-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
                          สลับบัญชีทดสอบ (Quick Switch)
                        </div>

                        <div className="space-y-1">
                          {/* 1. DOC-TEST */}
                          <button
                            onClick={() => handleQuickSwitch('DOC-TEST')}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-all ${
                              currentDoctor.employee_id === 'DOC-TEST'
                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold'
                                : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="leading-tight truncate font-bold text-slate-800">
                                นพ.ทดสอบ ระบบแพทย์ (DOC-TEST)
                              </div>
                              <div className="text-[10px] text-emerald-600 font-normal">
                                มีทุกสิทธิ์ (แพทย์, หน.แผนก, ฝ่ายแพทย์, ผู้อนุมัติ) • ผูก LINE
                              </div>
                            </div>
                            {currentDoctor.employee_id === 'DOC-TEST' && (
                              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                          </button>

                          {/* 2. EXEC-PARIWAT */}
                          <button
                            onClick={() => handleQuickSwitch('EXEC-PARIWAT')}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-all ${
                              currentDoctor.employee_id === 'EXEC-PARIWAT'
                                ? 'bg-purple-50 border border-purple-200 text-purple-900 font-bold'
                                : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="leading-tight truncate font-bold text-slate-800">
                                นพ.ปริวรรธน์ ระเด่น (EXEC-PARIWAT)
                              </div>
                              <div className="text-[10px] text-purple-600 font-normal">
                                ผช.ผู้อำนวยการ / ผู้อนุมัติขั้นสุดท้าย (Step 2)
                              </div>
                            </div>
                            {currentDoctor.employee_id === 'EXEC-PARIWAT' && (
                              <Check className="w-4 h-4 text-purple-600 shrink-0" />
                            )}
                          </button>

                          {/* 3. EMP-KOONG */}
                          <button
                            onClick={() => handleQuickSwitch('EMP-KOONG')}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-all ${
                              currentDoctor.employee_id === 'EMP-KOONG'
                                ? 'bg-amber-50 border border-amber-200 text-amber-900 font-bold'
                                : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="leading-tight truncate font-bold text-slate-800">
                                คุณธัญญธร (พี่กุ้ง HR) (EMP-KOONG)
                              </div>
                              <div className="text-[10px] text-amber-600 font-normal">
                                ฝ่ายการแพทย์ / แอดมินกลาง (Medical Admin)
                              </div>
                            </div>
                            {currentDoctor.employee_id === 'EMP-KOONG' && (
                              <Check className="w-4 h-4 text-amber-600 shrink-0" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mobile menu trigger (visible on screens below xl) */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 shrink-0"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Dropdown Menu (visible on screens below xl) */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-150">
            {/* Mobile Profile Card */}
            {currentDoctor && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-2">
                <div className="flex items-center gap-2.5">
                  <img
                    src={currentDoctor.avatar || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100'}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-slate-300"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {currentDoctor.prefix_th}{currentDoctor.first_name_th} {currentDoctor.last_name_th}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      รหัส: {currentDoctor.employee_id} {currentDoctor.license_no ? `• ว. ${currentDoctor.license_no}` : ''}
                    </div>
                  </div>
                </div>

                {/* Quick switch buttons inside mobile menu */}
                <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-bold uppercase w-full">สลับบทบาททดสอบ:</span>
                  <button
                    onClick={() => { handleQuickSwitch('DOC-TEST'); setMobileMenuOpen(false); }}
                    className={`text-[10px] px-2 py-1 rounded-lg font-bold transition-all ${
                      currentDoctor.employee_id === 'DOC-TEST' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                    }`}
                  >
                    🟢 DOC-TEST
                  </button>
                  <button
                    onClick={() => { handleQuickSwitch('EXEC-PARIWAT'); setMobileMenuOpen(false); }}
                    className={`text-[10px] px-2 py-1 rounded-lg font-bold transition-all ${
                      currentDoctor.employee_id === 'EXEC-PARIWAT' ? 'bg-purple-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                    }`}
                  >
                    🟣 นพ.ปริวรรธน์ (ผช.ผอ.)
                  </button>
                  <button
                    onClick={() => { handleQuickSwitch('EMP-KOONG'); setMobileMenuOpen(false); }}
                    className={`text-[10px] px-2 py-1 rounded-lg font-bold transition-all ${
                      currentDoctor.employee_id === 'EMP-KOONG' ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                    }`}
                  >
                    🟠 พี่กุ้ง (HR)
                  </button>
                </div>
              </div>
            )}

            {!isHrOnly && (
              <>
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  <FileText className="w-4 h-4 text-[#006699]" />
                  <span>ยื่นใบลา (LIFF)</span>
                </Link>

                <Link
                  to="/my-history"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  <Clock className="w-4 h-4 text-[#006699]" />
                  <span>ประวัติ &amp; สิทธิ์คงเหลือ</span>
                </Link>
              </>
            )}

            {(isAdmin || isApprover) && (
              <Link
                to="/admin/shifts"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                <CalendarRange className="w-4 h-4 text-emerald-600" />
                <span>ตารางเวรแพทย์</span>
              </Link>
            )}

            {isApprover && (
              <Link
                to="/approver"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                <CheckSquare className="w-4 h-4 text-[#006699]" />
                <span>ศูนย์อนุมัติ</span>
              </Link>
            )}

            {isAdmin && (
              <>
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  <LayoutDashboard className="w-4 h-4 text-[#006699]" />
                  <span>ฝ่ายการแพทย์</span>
                </Link>

                <Link
                  to="/admin/master-data"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  <GitMerge className="w-4 h-4 text-purple-600" />
                  <span>สายอนุมัติแผนก &amp; รายชื่อแพทย์</span>
                </Link>

                <Link
                  to="/admin/criteria"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  <Sliders className="w-4 h-4 text-purple-600" />
                  <span>เกณฑ์โควตาแผนก (Quota)</span>
                </Link>

                <Link
                  to="/admin/tenure"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  <Award className="w-4 h-4 text-purple-600" />
                  <span>เกณฑ์ลาพักร้อน 20 วัน &amp; อายุงาน</span>
                </Link>

                <Link
                  to="/admin/audit"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  <History className="w-4 h-4 text-slate-600" />
                  <span>Audit Log (PDPA)</span>
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      {/* LINE Simulator Modal */}
      <LineSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
      />

      {/* LINE Login Modal */}
      <LineLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </>
  );
}
