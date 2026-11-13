import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  AlertTriangle,
  Phone,
  Calendar,
  Clock,
  UserCheck,
  CheckCircle2,
  XCircle,
  PlusCircle,
  ShieldAlert,
  Sliders,
  Users,
  Search,
  RefreshCw,
  Hospital,
  ChevronRight,
  Download,
  CalendarDays,
  Award,
  GitMerge,
  CalendarRange
} from 'lucide-react';
import { Link } from 'react-router-dom';
import CalendarView from '../components/CalendarView';

export default function AdminDashboardPage() {
  const { doctors, currentDoctor } = useAuth();

  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'

  // Filter state
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Record on behalf modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [overrideModalReq, setOverrideModalReq] = useState(null);
  const [overrideReason, setOverrideReason] = useState('อนุมัติแทนกรณีเร่งด่วน / หัวหน้าแผนกติดผ่าตัด');
  const [cancelModalReq, setCancelModalReq] = useState(null);
  const [cancelReason, setCancelReason] = useState('ฝ่ายการแพทย์ยกเลิกใบลาแทนแพทย์');
  const [cancelling, setCancelling] = useState(false);

  // Form state for creating on behalf
  const todayStr = new Date().toISOString().split('T')[0];
  const [newDoctorId, setNewDoctorId] = useState('');
  const [newLeaveTypeId, setNewLeaveTypeId] = useState('');
  const [newStartDate, setNewStartDate] = useState(todayStr);
  const [newEndDate, setNewEndDate] = useState(todayStr);
  const [newHalfDay, setNewHalfDay] = useState('FULL_DAY');
  const [newReason, setNewReason] = useState('แพทย์โทรแจ้งฝ่ายการแพทย์โดยตรง (บันทึกแทนโดยฝ่ายการแพทย์)');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, reqsRes, ltRes] = await Promise.all([
        fetch('/api/stats/dashboard'),
        fetch('/api/leave-requests'),
        fetch('/api/leave-types')
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (reqsRes.ok) setRequests(await reqsRes.json());
      if (ltRes.ok) {
        const ltData = await ltRes.json();
        setLeaveTypes(ltData);
        if (ltData.length > 0 && !newLeaveTypeId) {
          const sickType = ltData.find(t => t.code === 'SICK') || ltData[0];
          setNewLeaveTypeId(sickType.id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    // Export filtered requests if there are any, otherwise all requests (unless completely empty)
    const dataToExport = filteredRequests.length > 0 ? filteredRequests : requests;
    if (dataToExport.length === 0) return alert('ไม่มีข้อมูลสำหรับดาวน์โหลด');

    const headers = [
      'เลขที่ใบลา', 'รหัสแพทย์', 'ชื่อแพทย์', 'ประเภทแพทย์', 'แผนก', 'ประเภทการลา',
      'เริ่มวันที่', 'ถึงวันที่', 'จำนวนวัน', 'รูปแบบ', 'สถานะ', 'เหตุผล'
    ];

    const rows = dataToExport.map(req => [
      req.request_no || '',
      req.doctor?.employee_id || '',
      req.doctor?.name || '',
      req.doctor?.doctor_type === 'FULL_TIME' ? 'Full-Time' : 'Part-Time',
      req.doctor?.department_name || '',
      req.leave_type?.name_th || '',
      req.start_date || '',
      req.end_date || '',
      req.duration_days || '',
      req.half_day_type === 'FULL_DAY' ? 'เต็มวัน' : req.half_day_type === 'MORNING' ? 'ครึ่งเช้า' : 'ครึ่งบ่าย',
      req.status || '',
      `"${(req.reason || '').replace(/"/g, '""')}"` // Escape quotes for CSV
    ]);

    // Add BOM for Excel Thai UTF-8 support
    const csvContent = '\uFEFF' + [headers, ...rows].map(e => e.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `leave_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchDashboardData();
    const handleUpdate = () => fetchDashboardData();
    window.addEventListener('leave-status-updated', handleUpdate);
    return () => window.removeEventListener('leave-status-updated', handleUpdate);
  }, []);

  // Handle Admin Override Approval
  const handleOverride = async () => {
    if (!overrideModalReq) return;
    try {
      const res = await fetch(`/api/leave-requests/${overrideModalReq.id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_id: 'c0000000-0000-0000-0000-000000000001', // P'Koong
          reason: overrideReason
        })
      });

      if (res.ok) {
        setOverrideModalReq(null);
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit on behalf of doctor
  const handleCreateOnBehalf = async (e) => {
    e.preventDefault();
    if (!newDoctorId) return alert('กรุณาเลือกแพทย์');

    setFormSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('doctor_id', newDoctorId);
      formData.append('leave_type_id', newLeaveTypeId);
      formData.append('start_date', newStartDate);
      formData.append('end_date', newHalfDay !== 'FULL_DAY' ? newStartDate : newEndDate);
      formData.append('half_day_type', newHalfDay);
      formData.append('reason', newReason);
      formData.append('submitted_by_admin', 'true');

      const res = await fetch('/api/leave-requests', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        setShowCreateModal(false);
        fetchDashboardData();
      } else {
        const data = await res.json();
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleAdminCancelRequest = async () => {
    if (!cancelModalReq) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/leave-requests/${cancelModalReq.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: currentDoctor?.id,
          reason: cancelReason
        })
      });
      if (res.ok) {
        setCancelModalReq(null);
        fetchDashboardData();
      } else {
        const data = await res.json();
        alert(data.error || 'ไม่สามารถยกเลิกใบลาได้');
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setCancelling(false);
    }
  };

  // Filtered requests
  const filteredRequests = requests.filter(r => {
    if (deptFilter !== 'ALL' && r.doctor?.department_id !== deptFilter) return false;
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const docName = r.doctor?.name?.toLowerCase() || '';
      const reqNo = r.request_no?.toLowerCase() || '';
      if (!docName.includes(q) && !reqNo.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#006699] text-white flex items-center justify-center shadow-md">
            <Hospital className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                Medical Admin Portal (ฝ่ายการแพทย์)
              </h1>
              <span className="bg-sky-100 text-[#006699] text-[10px] font-bold px-2 py-0.5 rounded-full">
                เจ้าหน้าที่ฝ่ายการแพทย์
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ระบบตรวจสอบและบริหารจัดการตารางการลาแพทย์ • รพ.กรุงเทพสิริโรจน์ (BSI)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#006699] hover:bg-[#005580] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98"
          >
            <PlusCircle className="w-4 h-4" />
            <span>บันทึกการลาแทนแพทย์</span>
          </button>

          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>ดาวน์โหลด (CSV)</span>
          </button>

          <Link
            to="/admin/master-data"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <GitMerge className="w-4 h-4 text-purple-700" />
            <span>สายอนุมัติ & การลา</span>
          </Link>

          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* Emergency Same-Day Leaves Alert Banner (Goal G3) */}
      {stats?.emergency_leaves && stats.emergency_leaves.length > 0 && (
        <div className="bg-rose-500 text-white rounded-2xl p-4 shadow-lg border border-rose-600 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-3 border-b border-rose-400/50">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-300 animate-bounce" />
              <span>แจ้งเตือนด่วน: มีแพทย์แจ้งลาฉุกเฉินวันนี้ ({stats.emergency_leaves.length} ท่าน)</span>
            </div>
            <span className="text-[11px] bg-rose-600 px-2 py-0.5 rounded font-mono">
              Action Required ทันที
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {stats.emergency_leaves.map(em => (
              <div key={em.id} className="bg-white text-slate-800 p-3 rounded-xl shadow-xs flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-rose-700 flex items-center gap-1.5">
                    <span>{em.doctor_name}</span>
                    <span className="text-[10px] text-slate-500 font-normal">({em.leave_type_name})</span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    เหตุผล: {em.reason || 'โทรแจ้งฉุกเฉิน'}
                  </div>
                </div>

                <a
                  href={`tel:${em.doctor_phone || '076361888'}`}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 ml-2"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>โทรหาแพทย์</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">รอการพิจารณาอนุมัติ</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {stats?.pending_count || 0}
            <span className="text-xs font-normal text-slate-400 ml-1.5">รายการ</span>
          </div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">
            สามารถกด Override อนุมัติแทนได้
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">แจ้งลาฉุกเฉินวันนี้</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">
            {stats?.emergency_today_count || 0}
            <span className="text-xs font-normal text-slate-400 ml-1.5">ท่าน</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Same-day emergency alert
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">แพทย์ปฏิบัติงานลาวันนี้</span>
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#006699] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {stats?.on_leave_today_count || 0}
            <span className="text-xs font-normal text-slate-400 ml-1.5">ท่าน</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            ทุกแผนกรวมกัน
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">เกณฑ์โควตาแผนกวันนี้</span>
            <Link
              to="/admin/criteria"
              className="text-[11px] text-[#006699] font-bold hover:underline flex items-center gap-0.5"
            >
              <span>ตั้งค่า</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {stats?.departments?.filter(d => !d.is_quota_full).length || 0}
            <span className="text-sm font-semibold text-slate-400">/{stats?.departments?.length || 10}</span>
            <span className="text-xs font-normal text-slate-400 ml-1.5">แผนกว่าง</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>โควตาเต็มวันนี้:</span>
            <span className={`font-bold ${(stats?.departments?.filter(d => d.is_quota_full).length || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {stats?.departments?.filter(d => d.is_quota_full).length || 0} แผนก
            </span>
          </div>
        </div>
      </div>

      {/* Compact Department Quota Strip */}
      {stats?.departments && stats.departments.length > 0 && (
        <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              สถานะโควตาการลาแยกตามแผนกวันนี้ ({stats.departments.length} แผนก)
            </span>
            <Link to="/admin/criteria" className="text-[11px] text-[#006699] font-semibold hover:underline">
              ปรับเพดานโควตา →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {stats.departments.map(d => (
              <div
                key={d.department_id}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] flex items-center justify-between gap-1 ${
                  d.is_quota_full
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : d.on_leave_today_count > 0
                    ? 'bg-amber-50/60 border-amber-200 text-slate-800'
                    : 'bg-slate-50/80 border-slate-200/80 text-slate-600'
                }`}
              >
                <span className="truncate font-medium" title={d.name_th}>{d.name_th}</span>
                <span className={`font-bold shrink-0 ${d.is_quota_full ? 'text-rose-600' : 'text-slate-800'}`}>
                  {d.on_leave_today_count}/{d.max_leave_per_day} {d.is_quota_full && '⚠️'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Table / Calendar Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        
        {/* Unified Filters & Toggle Header */}
        <div className="p-4 border-b border-slate-200 flex flex-col xl:flex-row items-center justify-between gap-4 bg-slate-50/50">
          
          <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>รายการ</span>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'calendar' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>ปฏิทิน</span>
              </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 w-full md:w-auto bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-sky-500 transition-all">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาแพทย์, เลขที่ใบลา..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs bg-transparent border-none outline-hidden w-full sm:w-48 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs p-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-sky-500 font-medium outline-hidden"
            >
              <option value="ALL">สถานะทั้งหมด</option>
              <option value="PENDING">รอการอนุมัติ (Pending)</option>
              <option value="APPROVED">อนุมัติแล้ว (Approved)</option>
              <option value="REJECTED">ไม่อนุมัติ (Rejected)</option>
              <option value="CANCELLED">ยกเลิกแล้ว (Cancelled)</option>
            </select>

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="text-xs p-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-sky-500 font-medium outline-hidden"
            >
              <option value="ALL">แผนกทั้งหมด</option>
              {stats?.departments?.map(d => (
                <option key={d.department_id} value={d.department_id}>
                  แผนก{d.name_th}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Area */}
        {viewMode === 'calendar' ? (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <CalendarView requests={filteredRequests} />
          </div>
        ) : (
          <div className="overflow-x-auto animate-in fade-in zoom-in-95 duration-300">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/75 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">เลขที่ใบลา</th>
                <th className="py-3 px-4">แพทย์ผู้ขอลา</th>
                <th className="py-3 px-4">แผนก</th>
                <th className="py-3 px-4">ประเภทการลา</th>
                <th className="py-3 px-4">วันที่ลา</th>
                <th className="py-3 px-4">สถานะ</th>
                <th className="py-3 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    ไม่พบรายการใบลาตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => {
                  const isPending = req.status === 'PENDING';
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {req.request_no}
                        {req.is_emergency && (
                          <span className="ml-1 text-[9px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.2 rounded">
                            ฉุกเฉิน
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{req.doctor?.name}</div>
                        <div className="text-[10px] text-slate-400">{req.doctor?.doctor_type === 'FULL_TIME' ? 'Full-Time' : 'Part-Time'}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {req.doctor?.department_name || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#006699]">
                          {req.leave_type?.name_th}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div>{req.start_date}</div>
                        <div className="text-[10px] text-slate-400">
                          {req.duration_days} วัน ({req.half_day_type === 'FULL_DAY' ? 'เต็มวัน' : 'ครึ่งวัน'})
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                          req.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                          req.status === 'CANCELLED' ? 'bg-slate-100 text-slate-600' :
                          'bg-amber-100 text-amber-800 animate-pulse'
                        }`}>
                          {req.status === 'APPROVED' ? 'อนุมัติแล้ว' :
                           req.status === 'REJECTED' ? 'ไม่อนุมัติ' :
                           req.status === 'CANCELLED' ? 'ยกเลิก' : 'รออนุมัติ'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <button
                              onClick={() => setOverrideModalReq(req)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
                              title="อนุมัติแทนกรณีฉุกเฉินหรือหัวหน้าแผนกไม่อยู่"
                            >
                              ⚡ Override อนุมัติแทน
                            </button>
                          )}
                          {(req.status === 'PENDING' || req.status === 'APPROVED') ? (
                            <button
                              onClick={() => {
                                setCancelReason('ฝ่ายการแพทย์ยกเลิกใบลาแทนแพทย์');
                                setCancelModalReq(req);
                              }}
                              className="px-2.5 py-1 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-all"
                              title="ยกเลิกใบลาแทนแพทย์ (คืนโควตาและคืนตารางเวร)"
                            >
                              ยกเลิกใบลา
                            </button>
                          ) : (
                            !isPending && <span className="text-[11px] text-slate-400">เสร็จสิ้น</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Modal: Override Approval */}
      {overrideModalReq && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2 text-amber-600">
              <ShieldAlert className="w-5 h-5" />
              อนุมัติแทนโดยฝ่ายการแพทย์ (Admin Override)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              ใช้กรณีฉุกเฉิน หรือหัวหน้าแผนกติดภารกิจออกตรวจ/ผ่าตัด ไม่สามารถกดผ่าน LINE ได้
            </p>

            <div className="bg-slate-50 p-3 rounded-xl mb-4 text-xs space-y-1">
              <div><strong>แพทย์:</strong> {overrideModalReq.doctor?.name}</div>
              <div><strong>ประเภท:</strong> {overrideModalReq.leave_type?.name_th}</div>
              <div><strong>วันที่:</strong> {overrideModalReq.start_date} ({overrideModalReq.duration_days} วัน)</div>
            </div>

            <label className="block text-xs font-bold text-slate-700 mb-1">
              ระบุเหตุผลการ Override
            </label>
            <textarea
              rows={2}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOverrideModalReq(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleOverride}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                ยืนยันการอนุมัติแทน (Override)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create on Behalf of Doctor */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2 text-[#006699]">
              <PlusCircle className="w-5 h-5" />
              บันทึกการลาแทนแพทย์ (โดยฝ่ายการแพทย์)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              ใช้กรณีแพทย์โทรศัพท์แจ้งฝ่ายการแพทย์โดยตรง หรือเกิดเหตุฉุกเฉินไม่สะดวกเข้า LINE
            </p>

            <form onSubmit={handleCreateOnBehalf} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">เลือกแพทย์</label>
                <select
                  value={newDoctorId}
                  onChange={(e) => setNewDoctorId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  required
                >
                  <option value="">-- กรุณาเลือกแพทย์ --</option>
                  {doctors.filter(d => d.employee_id !== 'EMP-KOONG').map(d => (
                    <option key={d.id} value={d.id}>
                      {d.prefix_th}{d.first_name_th} {d.last_name_th} ({d.employee_id}) - {d.department_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ประเภทการลา</label>
                  <select
                    value={newLeaveTypeId}
                    onChange={(e) => setNewLeaveTypeId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    {leaveTypes.map(lt => (
                      <option key={lt.id} value={lt.id}>
                        {lt.name_th} ({lt.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">รูปแบบวันลา</label>
                  <select
                    value={newHalfDay}
                    onChange={(e) => setNewHalfDay(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    <option value="FULL_DAY">เต็มวัน (1.0 วัน)</option>
                    <option value="MORNING">ครึ่งวันเช้า (0.5 วัน)</option>
                    <option value="AFTERNOON">ครึ่งวันบ่าย (0.5 วัน)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">เริ่มวันที่</label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ถึงวันที่</label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">บันทึกเหตุผล / การโทรแจ้ง</label>
                <textarea
                  rows={2}
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-[#006699] hover:bg-[#005580] text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  {formSubmitting ? 'กำลังบันทึก...' : 'บันทึกคำขอ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Cancel Leave Request Modal */}
      {cancelModalReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">ยกเลิกใบลาแทนแพทย์</h3>
                <p className="text-xs text-slate-500">
                  {cancelModalReq.request_no} • {cancelModalReq.doctor?.name}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
              <div><strong>ประเภท:</strong> {cancelModalReq.leave_type?.name_th}</div>
              <div><strong>วันที่ลา:</strong> {cancelModalReq.start_date} ({cancelModalReq.duration_days} วัน)</div>
              <div className="text-[11px] text-rose-700 pt-1">
                เมื่อยกเลิกแล้ว ระบบจะคืนโควตาวันลา และคืนสถานะตารางเวรของแพทย์ท่านนี้ให้อัตโนมัติ
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">เหตุผลการยกเลิก</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50"
                placeholder="ระบุเหตุผลที่ฝ่ายการแพทย์ยกเลิกใบลา..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelModalReq(null)}
                disabled={cancelling}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={handleAdminCancelRequest}
                disabled={cancelling}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-60"
              >
                {cancelling ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิกใบลา'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
