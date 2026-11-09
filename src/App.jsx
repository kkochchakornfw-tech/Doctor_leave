import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import DoctorLiffPage from './pages/DoctorLiffPage';
import DoctorHistoryPage from './pages/DoctorHistoryPage';
import ApproverPage from './pages/ApproverPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminCriteriaPage from './pages/AdminCriteriaPage';
import AdminAuditPage from './pages/AdminAuditPage';
import AdminHolidaysPage from './pages/AdminHolidaysPage';
import AdminTenurePage from './pages/AdminTenurePage';
import AdminMasterDataPage from './pages/AdminMasterDataPage';
import AdminShiftsPage from './pages/AdminShiftsPage';
import ProtectedRoute from './components/ProtectedRoute';
import OnboardingPage from './pages/OnboardingPage';

// Intercepts LINE LIFF subpath/query routing (?liff.state=... or ?route=... or sessionStorage)
function LiffRedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    try {
      // 1. Check synchronous capture from sessionStorage
      const savedTarget = sessionStorage.getItem('bsi_liff_target');
      if (savedTarget) {
        sessionStorage.removeItem('bsi_liff_target');
        if (savedTarget !== location.pathname) {
          console.log(`[LIFF Navigation] Redirecting to savedTarget: ${savedTarget}`);
          navigate(savedTarget, { replace: true });
          return;
        }
      }

      // 2. Check window.location.search
      const searchParams = new URLSearchParams(window.location.search);
      const liffState = searchParams.get('liff.state');
      const routeParam = searchParams.get('route') || searchParams.get('path');
      
      let targetPath = null;
      if (liffState) {
        targetPath = decodeURIComponent(liffState);
      } else if (routeParam) {
        targetPath = decodeURIComponent(routeParam);
      }

      // 3. Check window.location.hash
      if (!targetPath && window.location.hash) {
        const hash = window.location.hash.replace(/^#/, '');
        if (hash.startsWith('/') && hash !== location.pathname) {
          targetPath = hash;
        }
      }

      if (targetPath && targetPath !== location.pathname) {
        console.log(`[LIFF Navigation] Redirecting to target path: ${targetPath}`);
        navigate(targetPath, { replace: true });
      }
    } catch (e) {
      console.warn('[LIFF Navigation Error]', e);
    }
  }, [location.pathname, navigate]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { needsOnboarding, loading } = useAuth();

  // Show loading spinner while LIFF initializes and authenticates with LINE
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="w-9 h-9 border-3 border-[#006699] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">กำลังเชื่อมต่อระบบ Doctor Leave @ LINE...</p>
      </div>
    );
  }

  if (needsOnboarding) {
    return <OnboardingPage />;
  }

  return (
      <BrowserRouter>
        <LiffRedirectHandler />
        <div className="min-h-screen flex flex-col bg-slate-100">
          <Navbar />
          <main className="flex-1 pb-12">
            <Routes>
              <Route path="/" element={
                <ProtectedRoute allowedRoles={['DOCTOR', 'MEDICAL_ADMIN', 'ADMIN', 'APPROVER', 'DEPT_HEAD']}>
                  <DoctorLiffPage />
                </ProtectedRoute>
              } />
              <Route path="/my-history" element={
                <ProtectedRoute allowedRoles={['DOCTOR', 'MEDICAL_ADMIN', 'ADMIN', 'APPROVER', 'DEPT_HEAD']}>
                  <DoctorHistoryPage />
                </ProtectedRoute>
              } />
              <Route path="/approver" element={
                <ProtectedRoute allowedRoles={['DEPT_HEAD', 'APPROVER']}>
                  <ApproverPage />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['MEDICAL_ADMIN', 'ADMIN']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/criteria" element={
                <ProtectedRoute allowedRoles={['MEDICAL_ADMIN', 'ADMIN']}>
                  <AdminCriteriaPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/audit" element={
                <ProtectedRoute allowedRoles={['MEDICAL_ADMIN', 'ADMIN']}>
                  <AdminAuditPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/holidays" element={<Navigate to="/admin/tenure" replace />} />
              <Route path="/admin/tenure" element={
                <ProtectedRoute allowedRoles={['MEDICAL_ADMIN', 'ADMIN']}>
                  <AdminTenurePage />
                </ProtectedRoute>
              } />
              <Route path="/admin/master-data" element={
                <ProtectedRoute allowedRoles={['MEDICAL_ADMIN', 'ADMIN']}>
                  <AdminMasterDataPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/shifts" element={
                <ProtectedRoute allowedRoles={['MEDICAL_ADMIN', 'ADMIN', 'DEPT_HEAD']}>
                  <AdminShiftsPage />
                </ProtectedRoute>
              } />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          
          <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="font-semibold text-slate-700">
                Doctor Leave @ LINE — โรงพยาบาลกรุงเทพสิริโรจน์ (BSI)
              </span>
              <span className="text-slate-400 text-[11px]">
                Informatics Development Team • PDPA Compliant 100%
              </span>
            </div>
          </footer>
        </div>
      </BrowserRouter>
  );
}
