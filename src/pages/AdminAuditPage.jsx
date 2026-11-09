import React, { useState, useEffect } from 'react';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Lock,
  UserCheck
} from 'lucide-react';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const actor = log.actor_name?.toLowerCase() || '';
      const reqNo = (log.new_data?.request_no || log.old_data?.request_no || '').toLowerCase();
      if (!actor.includes(q) && !reqNo.includes(q)) return false;
    }
    return true;
  });

  const getActionBadge = (log) => {
    const action = log.action;
    const reqNo = log.new_data?.request_no || log.old_data?.request_no;
    const status = log.new_data?.status;

    let label = action;
    let colorClass = 'bg-slate-100 text-slate-700 border-slate-200';

    if (action === 'INSERT') {
      label = 'ยื่นคำขอลาใหม่';
      colorClass = 'bg-sky-50 text-sky-800 border-sky-200';
    } else if (action === 'APPROVE' || (action === 'UPDATE' && status === 'APPROVED')) {
      label = 'อนุมัติใบลา';
      colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    } else if (action === 'REJECT' || (action === 'UPDATE' && status === 'REJECTED')) {
      label = 'ไม่อนุมัติใบลา';
      colorClass = 'bg-rose-50 text-rose-800 border-rose-200';
    } else if (action === 'CANCEL' || (action === 'UPDATE' && status === 'CANCELLED')) {
      label = 'ยกเลิกใบลา';
      colorClass = 'bg-amber-50 text-amber-800 border-amber-200';
    } else if (action === 'OVERRIDE_APPROVE') {
      label = 'บันทึก/อนุมัติโดยฝ่ายการแพทย์ (Admin Override)';
      colorClass = 'bg-purple-50 text-purple-800 border-purple-200';
    } else if (action === 'UPDATE') {
      label = 'อัปเดตสถานะใบลา';
      colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }

    return (
      <div className="inline-flex items-center gap-2 flex-wrap">
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${colorClass}`}>
          {label}
        </span>
        {reqNo && (
          <span className="text-[11px] font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
            {reqNo}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Audit Logs & PDPA Compliance (บันทึกประวัติการตรวจสอบ)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            เก็บบันทึกประวัติการยื่น อนุมัติ และเปลี่ยนแปลงสถานะคำขอลาแพทย์อย่างละเอียดตามมาตรฐานความปลอดภัย
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรชประวัติ
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        
        {/* Filters Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="ค้นหาชื่อผู้ดำเนินการ หรือเลขที่ใบลา..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs p-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden w-full sm:w-72"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="text-xs p-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-sky-500 font-medium w-full sm:w-auto"
            >
              <option value="ALL">การกระทำ (Action) ทั้งหมด</option>
              <option value="INSERT">ยื่นคำขอลาใหม่ (INSERT)</option>
              <option value="APPROVE">อนุมัติใบลา (APPROVE)</option>
              <option value="REJECT">ไม่อนุมัติใบลา (REJECT)</option>
              <option value="UPDATE">อัปเดตสถานะใบลา (UPDATE)</option>
              <option value="OVERRIDE_APPROVE">บันทึกโดยฝ่ายการแพทย์ (Admin Override)</option>
              <option value="CANCEL">ยกเลิกใบลา (CANCEL)</option>
            </select>
          </div>
        </div>

        {/* Logs Table (3 Columns Only: วัน-เวลา, การกระทำ, ผู้ดำเนินการ) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/75 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 sm:px-6 w-1/3">วัน-เวลา</th>
                <th className="py-3.5 px-4 sm:px-6 w-1/3">การกระทำ (Action)</th>
                <th className="py-3.5 px-4 sm:px-6 w-1/3">ผู้ดำเนินการ (Actor)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-slate-400">
                    ไม่พบบันทึกประวัติการตรวจสอบ (Audit Log)
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-mono text-slate-600 text-[11px] sm:text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('th-TH')}
                    </td>
                    <td className="py-3.5 px-4 sm:px-6">
                      {getActionBadge(log)}
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 font-bold text-slate-800 whitespace-nowrap">
                      {log.actor_name}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
