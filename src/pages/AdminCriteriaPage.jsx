import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Save,
  CheckCircle,
  AlertCircle,
  Users,
  Shield,
  RefreshCw,
  Hospital
} from 'lucide-react';

export default function AdminCriteriaPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleChange = (deptId, field, value) => {
    setDepartments(prev =>
      prev.map(d => (d.id === deptId ? { ...d, [field]: value === '' ? null : value } : d))
    );
  };

  const handleGroupChange = (deptId, groupId, value) => {
    setDepartments(prev =>
      prev.map(d => {
        if (d.id !== deptId) return d;
        const groups = (d.staffing_groups || []).map(g => {
          if (g.id !== groupId) return g;
          return { ...g, min_staff_required: value === '' ? null : parseInt(value, 10) };
        });
        return { ...d, staffing_groups: groups };
      })
    );
  };

  const handleSave = async (dept) => {
    setSavingId(dept.id);
    try {
      const res = await fetch(`/api/departments/${dept.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          min_staff_required: dept.min_staff_required === '' ? null : dept.min_staff_required,
          max_leave_per_day: dept.max_leave_per_day === '' ? null : dept.max_leave_per_day,
          name_th: dept.name_th,
          staffing_groups: dept.staffing_groups
        })
      });

      if (res.ok) {
        setToastMessage(`บันทึกเกณฑ์แผนก${dept.name_th}สำเร็จ`);
        setTimeout(() => setToastMessage(''), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#006699] text-white flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              ตั้งค่าเกณฑ์โควตาแผนก (Department Criteria)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            กำหนดจำนวนแพทย์ขั้นต่ำที่ต้องปฏิบัติงาน และโควตาแพทย์ที่สามารถลาพร้อมกันได้ต่อวัน
          </p>
        </div>

        <button
          onClick={fetchDepartments}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรชเกณฑ์
        </button>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Info Notice Box */}
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-xs text-sky-900 flex items-start gap-3">
        <Hospital className="w-5 h-5 text-[#006699] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold">กฎเกณฑ์ทางธุรกิจตามมติที่ประชุม (BSI Medical Policy)</h4>
          <p className="text-sky-800 leading-relaxed text-[11px]">
            หากวันใดมีแพทย์ยื่นลาครบตามโควตาสูงสุดแล้ว ระบบจะเตือนเป็น <strong>"โควตาเต็ม (สีแดง)"</strong> บนหน้าจอปฏิทินของแพทย์ และหากยื่นเข้ามา ระบบจะ Flag เป็น <strong>"คำขอข้อยกเว้นพิเศษ (Exception Request)"</strong> เพื่อให้ฝ่ายการแพทย์และหัวหน้าแผนกพิจารณาเป็นพิเศษ
          </p>
        </div>
      </div>

      {/* Criteria Cards Grid */}
      {loading ? (
        <div className="text-center py-16 text-xs text-slate-400">กำลังโหลดเกณฑ์แผนก...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {departments.map(dept => {
            const isSaving = savingId === dept.id;

            return (
              <div
                key={dept.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4 hover:shadow-card transition-all"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold bg-sky-100 text-[#006699] px-2.5 py-1 rounded-md">
                      {dept.code}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm">
                      แผนก{dept.name_th}
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {dept.name_en}
                  </span>
                </div>

                {/* Staffing Status Live Indicator */}
                <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl text-center text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">แพทย์ทั้งหมด</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                      {dept.doctor_count} ท่าน
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">ลาวันนี้</span>
                    <span className={`font-bold text-sm mt-0.5 block ${
                      dept.is_quota_exceeded_today ? 'text-rose-600' : 'text-slate-800'
                    }`}>
                      {dept.on_leave_today_count} ท่าน
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">ปฏิบัติงานวันนี้</span>
                    <span className="font-bold text-emerald-700 text-sm mt-0.5 block">
                      {dept.available_doctors_today} ท่าน
                    </span>
                  </div>
                </div>

                {/* Editable Inputs */}
                <div className="space-y-3 text-xs">
                  {dept.staffing_groups && dept.staffing_groups.length > 0 ? (
                    <div className="space-y-2 p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        เกณฑ์แพทย์ขั้นต่ำแยกตามสาขาเฉพาะทาง:
                      </span>
                      {dept.staffing_groups.map(group => (
                        <div key={group.id} className="flex items-center justify-between gap-2">
                          <label className="text-slate-600 font-medium">
                            {group.name_th}:
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={20}
                              value={group.min_staff_required ?? ''}
                              onChange={(e) => handleGroupChange(dept.id, group.id, e.target.value)}
                              className="w-16 p-1.5 text-center rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-sky-500 font-bold text-slate-800"
                            />
                            <span className="text-[11px] text-slate-500">ท่าน</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        จำนวนแพทย์ขั้นต่ำที่ต้องปฏิบัติงาน (คน):
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={dept.min_staff_required ?? ''}
                        onChange={(e) => handleChange(dept.id, 'min_staff_required', e.target.value)}
                        placeholder="ไม่กำหนด"
                        className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-sky-500 font-semibold text-slate-800"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      จำนวนแพทย์ที่ลาพร้อมกันได้สูงสุดต่อวัน (คน):
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={dept.max_leave_per_day ?? ''}
                      onChange={(e) => handleChange(dept.id, 'max_leave_per_day', e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-sky-500 font-semibold text-[#006699]"
                    />
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={() => handleSave(dept)}
                  disabled={isSaving}
                  className="w-full py-2.5 bg-[#006699] hover:bg-[#005580] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกเกณฑ์แผนกนี้'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
