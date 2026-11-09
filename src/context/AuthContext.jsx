import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [doctors, setDoctors] = useState([]);
  const [currentDoctor, setCurrentDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // LIFF & Onboarding States
  const [liffProfile, setLiffProfile] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isLiffMode, setIsLiffMode] = useState(false);

  // Fetch doctors list (Developer Mode fallback)
  const fetchDoctors = async () => {
    try {
      const res = await fetch('/api/doctors');
      if (res.ok) {
        const data = await res.json();
        setDoctors(data);

        const testDoc = data.find(d => d.employee_id === 'DOC-TEST');
        const v5Key = localStorage.getItem('bsi_test_doctor_v5');
        const savedId = localStorage.getItem('bsi_active_doctor_id');

        let selected = null;

        // Auto-select DOC-TEST if first time on v5 or previously defaulted to EXEC-PARIWAT
        if (testDoc && (v5Key !== 'ready' || savedId === 'c0000000-0000-0000-0000-000000000099')) {
          selected = testDoc;
          localStorage.setItem('bsi_active_doctor_id', testDoc.id);
          localStorage.setItem('bsi_test_doctor_v5', 'ready');
        } else if (savedId) {
          selected = data.find(d => d.id === savedId);
          if (!selected) {
            localStorage.removeItem('bsi_active_doctor_id');
          }
        }

        if (!selected) {
          selected = testDoc || data.find(d => d.employee_id === 'EMP-KOONG') || data[0] || null;
          if (selected) {
            localStorage.setItem('bsi_active_doctor_id', selected.id);
          }
        }
        setCurrentDoctor(selected);
      }
    } catch (err) {
      console.error('Failed to load doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initLiff = async () => {
      // Default fallback LIFF ID ensuring it always runs in production/Render even if env variable is unset
      const liffId = import.meta.env.VITE_LIFF_ID || '2011832574-WtcSrDre';

      try {
        const liff = (await import('@line/liff')).default;
        await liff.init({ liffId });
        
        if (liff.isLoggedIn()) {
          setIsLiffMode(true);
          const profile = await liff.getProfile();
          setLiffProfile(profile);

          const res = await fetch(`/api/auth/me?lineUserId=${profile.userId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.doctor) {
              setCurrentDoctor(data.doctor);
              setNeedsOnboarding(false);
            } else {
              // Unregistered doctor LINE account -> Immediately show Onboarding screen!
              setCurrentDoctor(null);
              setNeedsOnboarding(true);
            }
          } else {
            setCurrentDoctor(null);
            setNeedsOnboarding(true);
          }
          await fetchDoctors();
          return;
        }
      } catch (err) {
        console.warn("LIFF Init / Auth Notice:", err);
      }

      // Desktop browser or outside LINE client fallback
      setIsLiffMode(false);
      await fetchDoctors();
    };
    
    initLiff();
  }, []);

  const switchDoctor = (doctorId) => {
    const found = doctors.find(d => d.id === doctorId);
    if (found) {
      setCurrentDoctor(found);
      localStorage.setItem('bsi_active_doctor_id', doctorId);
    }
  };

  const switchDoctorByEmpId = (empId) => {
    const found = doctors.find(d => d.employee_id === empId);
    if (found) {
      setCurrentDoctor(found);
      localStorage.setItem('bsi_active_doctor_id', found.id);
    }
  };

  const isMedicalAdmin = currentDoctor?.roles?.includes('ADMIN') || currentDoctor?.roles?.includes('MEDICAL_ADMIN');
  const isApprover = currentDoctor?.roles?.includes('APPROVER') || currentDoctor?.roles?.includes('DEPT_HEAD');
  const isDoctor = currentDoctor?.roles?.includes('DOCTOR');

  return (
    <AuthContext.Provider
      value={{
        doctors,
        currentDoctor,
        setCurrentDoctor,
        switchDoctor,
        switchDoctorByEmpId,
        refreshDoctors: fetchDoctors,
        isMedicalAdmin,
        isApprover,
        isDoctor,
        loading,
        liffProfile,
        needsOnboarding,
        setNeedsOnboarding,
        isLiffMode
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
