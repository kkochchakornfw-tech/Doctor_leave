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

  // Fetch doctors list; preserve LIFF-authenticated doctor if provided
  const fetchDoctors = async (authenticatedDoctor = null, skipRestore = false) => {
    try {
      const res = await fetch('/api/doctors');
      if (res.ok) {
        const data = await res.json();
        setDoctors(data);

        if (authenticatedDoctor) {
          const enriched = data.find(d => d.id === authenticatedDoctor.id) || authenticatedDoctor;
          setCurrentDoctor(enriched);
          localStorage.setItem('bsi_active_doctor_id', enriched.id);
          return;
        }

        if (skipRestore) {
          setCurrentDoctor(null);
          return;
        }

        // Only restore doctor if explicitly saved in session
        const savedId = localStorage.getItem('bsi_active_doctor_id');
        let selected = null;
        if (savedId) {
          selected = data.find(d => d.id === savedId) || null;
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
      const liffId = import.meta.env.VITE_LIFF_ID || '2012494812-wDotvhLS';

      try {
        const liff = (await import('@line/liff')).default;
        await liff.init({ liffId });
        
        if (liff.isLoggedIn()) {
          setIsLiffMode(true);
          const profile = await liff.getProfile();
          setLiffProfile(profile);

          let matchedDoctor = null;
          const res = await fetch(`/api/auth/me?lineUserId=${profile.userId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.doctor) {
              matchedDoctor = data.doctor;
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
          await fetchDoctors(matchedDoctor, !matchedDoctor);
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

  const logout = async () => {
    localStorage.removeItem('bsi_active_doctor_id');
    localStorage.removeItem('bsi_test_doctor_v5');
    try {
      const liff = (await import('@line/liff')).default;
      if (liff.id && liff.isLoggedIn() && !liff.isInClient()) {
        liff.logout();
      }
    } catch {
      // Ignore if LIFF is not initialized
    }
    setCurrentDoctor(null);
    setNeedsOnboarding(true);
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
        logout,
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
