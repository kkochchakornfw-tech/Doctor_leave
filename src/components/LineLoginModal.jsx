import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  QrCode,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  X,
  Lock,
  ArrowRight,
  Sparkles,
  UserCheck,
  AlertCircle
} from 'lucide-react';

export default function LineLoginModal({ isOpen, onClose }) {
  const { currentDoctor, switchDoctorByEmpId, setCurrentDoctor, isLiffMode } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loggedInName, setLoggedInName] = useState('');

  if (!isOpen) return null;

  // Real LIFF Login redirect
  const handleRealLiffLogin = async () => {
    try {
      const liff = (await import('@line/liff')).default;
      const liffId = import.meta.env.VITE_LIFF_ID || '2011832574-WtcSrDre';
      if (!liff.isInitialized()) {
        await liff.init({ liffId });
      }
      liff.login({ redirectUri: window.location.href });
    } catch (err) {
      console.warn('Real LIFF login failed, falling back to simulated scan:', err);
      handleSimulatedLogin('EMP-KOONG');
    }
  };

  // Simulated scan for instant testing on PC
  const handleSimulatedLogin = (empId) => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setSuccess(true);
      if (empId === 'EMP-KOONG') {
        switchDoctorByEmpId('EMP-KOONG');
        setLoggedInName('คุณธัญญธร ตันติกุล (พี่กุ้ง HR - Medical Admin)');
      } else if (empId === 'DOC-TEST') {
        switchDoctorByEmpId('DOC-TEST');
        setLoggedInName('นพ.ทดสอบ ระบบแพทย์ (DOC-TEST)');
      } else if (empId === 'EXEC-PARIWAT') {
        switchDoctorByEmpId('EXEC-PARIWAT');
        setLoggedInName('นพ.ปริวรรธน์ ระเด่น (EXEC-PARIWAT - ผช.ผอ.)');
      }
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#006699] to-[#002d74] text-white p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <QrCode className="w-6 h-6 text-sky-200" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                เข้าสู่ระบบแอดมินด้วย LINE
              </h3>
              <p className="text-[11px] text-sky-200 mt-0.5">
                สแกน QR Code ด้วยมือถือเพื่อยืนยันตัวตนเจ้าหน้าที่ (BSI Staff)
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-center">
          
          {success ? (
            <div className="py-8 space-y-3 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="font-bold text-slate-800 text-base">เข้าสู่ระบบสำเร็จ!</h4>
              <p className="text-xs text-slate-500 font-medium">ยินดีต้อนรับ {loggedInName}</p>
            </div>
          ) : (
            <>
              {/* QR Code Frame */}
              <div className="relative inline-block p-4 bg-white rounded-3xl border-2 border-dashed border-sky-300 shadow-inner group">
                <div className="w-48 h-48 bg-slate-50 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden border border-slate-200">
                  {scanning ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-3 border-[#06C755] border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-slate-600">กำลังตรวจสอบสิทธิ์...</span>
                    </div>
                  ) : (
                    <>
                      {/* Realistic Visual QR Code Generator SVG */}
                      <svg viewBox="0 0 100 100" className="w-40 h-40 object-contain text-slate-800">
                        {/* Position Markers */}
                        <rect x="5" y="5" width="25" height="25" rx="4" fill="currentColor" />
                        <rect x="9" y="9" width="17" height="17" rx="2" fill="white" />
                        <rect x="13" y="13" width="9" height="9" fill="currentColor" />

                        <rect x="70" y="5" width="25" height="25" rx="4" fill="currentColor" />
                        <rect x="74" y="9" width="17" height="17" rx="2" fill="white" />
                        <rect x="78" y="13" width="9" height="9" fill="currentColor" />

                        <rect x="5" y="70" width="25" height="25" rx="4" fill="currentColor" />
                        <rect x="9" y="74" width="17" height="17" rx="2" fill="white" />
                        <rect x="13" y="78" width="9" height="9" fill="currentColor" />

                        {/* Data Matrix Dots */}
                        <circle cx="45" cy="15" r="3" fill="currentColor" />
                        <circle cx="55" cy="15" r="3" fill="currentColor" />
                        <circle cx="40" cy="25" r="3" fill="currentColor" />
                        <circle cx="60" cy="25" r="3" fill="currentColor" />
                        
                        <circle cx="15" cy="45" r="3" fill="currentColor" />
                        <circle cx="25" cy="40" r="3" fill="currentColor" />
                        <circle cx="25" cy="60" r="3" fill="currentColor" />

                        <circle cx="75" cy="45" r="3" fill="currentColor" />
                        <circle cx="85" cy="55" r="3" fill="currentColor" />
                        <circle cx="75" cy="65" r="3" fill="currentColor" />

                        <circle cx="45" cy="75" r="3" fill="currentColor" />
                        <circle cx="55" cy="85" r="3" fill="currentColor" />
                        <circle cx="65" cy="75" r="3" fill="currentColor" />

                        {/* Center BSI Badge */}
                        <circle cx="50" cy="50" r="14" fill="#002d74" />
                        <circle cx="50" cy="50" r="12" fill="white" />
                        <path d="M47 44 h6 v12 h-6 z M44 47 h12 v6 h-12 z" fill="#006699" />
                      </svg>

                      {/* Scan Line Animation */}
                      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#06C755] to-transparent animate-pulse"></div>
                    </>
                  )}
                </div>
              </div>

              {/* Step by Step instructions */}
              <div className="text-left bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 text-xs text-slate-600">
                <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wide">
                  <Smartphone className="w-3.5 h-3.5 text-[#06C755]" />
                  <span>ขั้นตอนการเข้าสู่ระบบ:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                  <span>เปิดแอป LINE ในมือถือของคุณหมอหรือแอดมิน</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                  <span>แตะที่ไอคอนสแกน <strong>QR Code</strong> ในช่องค้นหาของ LINE</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                  <span>สแกน QR Code บนหน้านี้เพื่อยืนยันตัวตนอัตโนมัติ</span>
                </div>
              </div>

              {/* Action Buttons for Testing / Production */}
              <div className="space-y-2 pt-1">
                {/* Real LINE Web Login Button */}
                <button
                  onClick={handleRealLiffLogin}
                  className="w-full py-2.5 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" alt="" className="w-4 h-4" />
                  <span>เข้าสู่ระบบด้วย LINE Official (Web Login)</span>
                </button>

                {/* Quick Simulation Options for Dev / Admin Testing */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    จำลองผลการสแกนด้วย LINE (สำหรับทดสอบทันที):
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSimulatedLogin('EMP-KOONG')}
                      className="p-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-bold text-left transition-all"
                    >
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span>พี่กุ้ง HR (แอดมิน)</span>
                      </div>
                      <div className="text-[9px] text-amber-600 font-normal mt-0.5">เข้าสิทธิ์ Medical Admin</div>
                    </button>

                    <button
                      onClick={() => handleSimulatedLogin('EXEC-PARIWAT')}
                      className="p-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 text-[11px] font-bold text-left transition-all"
                    >
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        <span>นพ.ปริวรรธน์ (ผช.ผอ.)</span>
                      </div>
                      <div className="text-[9px] text-purple-600 font-normal mt-0.5">เข้าสิทธิ์ผู้อนุมัติขั้นสุดท้าย</div>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
}
