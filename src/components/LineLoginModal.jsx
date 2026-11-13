import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  CheckCircle2,
  X,
  Lock,
  AlertCircle
} from 'lucide-react';

export default function LineLoginModal({ isOpen, onClose }) {
  const { currentDoctor, switchDoctorByEmpId, setCurrentDoctor, isLiffMode } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loggedInName, setLoggedInName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Real LIFF Login redirect
  const handleRealLiffLogin = async () => {
    setErrorMsg('');
    setScanning(true);
    try {
      const liff = (await import('@line/liff')).default;
      const liffId = import.meta.env.VITE_LIFF_ID || '2012494812-wDotvhLS';
      if (!liff.id) {
        await liff.init({ liffId });
      }
      if (liff.isLoggedIn()) {
        liff.logout();
      }
      liff.login({ redirectUri: `${window.location.origin}/` });
    } catch (err) {
      console.error('Real LIFF login failed:', err);
      setScanning(false);
      setErrorMsg(`ไม่สามารถเปิดหน้าล็อกอิน LINE ได้: ${err?.message || 'กรุณาเปิดผ่านโดเมนจริงของระบบ'}`);
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
              <ShieldCheck className="w-6 h-6 text-sky-200" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                เข้าสู่ระบบบนคอมพิวเตอร์ด้วย LINE
              </h3>
              <p className="text-[11px] text-sky-200 mt-0.5">
                ยืนยันตัวตนเจ้าหน้าที่ / แอดมิน / แพทย์ (BSI Staff)
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
              {/* Step by Step instructions */}
              <div className="text-left bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-600">
                <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wide">
                  <Lock className="w-3.5 h-3.5 text-[#06C755]" />
                  <span>วิธีล็อกอินเข้าใช้งานบนคอมพิวเตอร์:</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                  <span>กดปุ่มสีเขียว <strong>"เข้าสู่ระบบด้วย LINE Official (Web Login)"</strong> ด้านล่าง</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                  <span>ระบบจะเปิดหน้าล็อกอินทางการของ LINE (เลือก <strong>สแกน QR Code</strong> ด้วยแอป LINE ในมือถือ หรือกรอกอีเมล/รหัสผ่าน LINE)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                  <span>เมื่อยืนยันเสร็จ ระบบจะพากลับมาที่หน้าจอคอมเครื่องนี้ตามสิทธิ์ของท่านอัตโนมัติ</span>
                </div>
              </div>

              {/* Action Buttons for Testing / Production */}
              <div className="space-y-2 pt-1">
                {errorMsg && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-medium flex items-start gap-2 text-left">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Real LINE Web Login Button */}
                <button
                  onClick={handleRealLiffLogin}
                  disabled={scanning}
                  className="w-full py-3 bg-[#06C755] hover:bg-[#05b34c] disabled:opacity-60 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  {scanning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>กำลังเปิดหน้าล็อกอินของ LINE...</span>
                    </>
                  ) : (
                    <>
                      <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" alt="" className="w-4 h-4" />
                      <span>เข้าสู่ระบบด้วย LINE Official (Web Login)</span>
                    </>
                  )}
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

