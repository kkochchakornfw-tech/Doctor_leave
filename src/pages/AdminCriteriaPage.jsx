import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Save,
  CheckCircle,
  RefreshCw,
  Hospital,
  Plus,
  Trash2,
  Layers,
  Building2,
  X
} from 'lucide-react';

export default function AdminCriteriaPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [newDeptForm, setNewDeptForm] = useState({
    code: '',
    name_th: '',
    name_en: '',
    min_staff_required: 2,
    max_leave_per_day: 2,
    staffing_mode: 'DEPARTMENT'
  });

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.filter(d => d.code !== 'EXEC'));
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

  const handleModeChange = (deptId, mode) => {
    setDepartments(prev =>
      prev.map(d => {
        if (d.id !== deptId) return d;
        const currentGroups = d.staffing_groups || [];
        return {
          ...d,
          staffing_mode: mode,
          staffing_groups: mode === 'GROUP' && currentGroups.length === 0
            ? [{ id: `${d.code}_SUB1`, name_th: `${d.name_th} (สาขา 1)`, min_staff_required: d.min_staff_required || 1 }]
            : currentGroups
        };
      })
    );
  };

  const handleGroupChange = (deptId, groupId, field, value) => {
    setDepartments(prev =>
      prev.map(d => {
        if (d.id !== deptId) return d;
        const groups = (d.staffing_groups || []).map(g => {
          if (g.id !== groupId) return g;
          if (field === 'min_staff_required') {
            return { ...g, min_staff_required: value === '' ? 0 : parseInt(value, 10) };
          }
          return { ...g, [field]: value };
        });
        return { ...d, staffing_groups: groups };
      })
    );
  };

  const handleAddGroup = (deptId) => {
    setDepartments(prev =>
      prev.map(d => {
        if (d.id !== deptId) return d;
        const groups = d.staffing_groups || [];
        const nextIdx = groups.length + 1;
        const newGrp = {
          id: `${d.code}_GRP_${Date.now().toString().slice(-3)}`,
          name_th: `สาขาเฉพาะทางที่ ${nextIdx}`,
          min_staff_required: 1
        };
        return {
          ...d,
          staffing_mode: 'GROUP',
          staffing_groups: [...groups, newGrp]
        };
      })
    );
  };

  const handleRemoveGroup = (deptId, groupId) => {
    setDepartments(prev =>
      prev.map(d => {
        if (d.id !== deptId) return d;
        const filtered = (d.staffing_groups || []).filter(g => g.id !== groupId);
        return {
          ...d,
          staffing_groups: filtered,
          staffing_mode: filtered.length === 0 ? 'DEPARTMENT' : d.staffing_mode
        };
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
          min_staff_required: dept.min_staff_required === '' ? 0 : dept.min_staff_required,
          max_leave_per_day: dept.max_leave_per_day === '' ? null : dept.max_leave_per_day,
          name_th: dept.name_th,
          staffing_mode: dept.staffing_mode || 'DEPARTMENT',
          staffing_groups: dept.staffing_groups || []
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

  const handleCreateDept = async (e) => {
    e.preventDefault();
    if (!newDeptForm.name_th.trim()) return;
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDeptForm)
      });
      if (res.ok) {
        setShowAddDeptModal(false);
        setNewDeptForm({
          code: '',
          name_th: '',
          name_en: '',
          min_staff_required: 2,
          max_leave_per_day: 2,
          staffing_mode: 'DEPARTMENT'
        });
        fetchDepartments();
        setToastMessage('เพิ่มแผนกใหม่สำเร็จ');
        setTimeout(() => setToastMessage(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#006699] text-white flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              ตั้งค่าเกณฑ์โควตาแผนก & สาขาเฉพาะทาง (Department Criteria)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            กำหนดจำนวนแพทย์ออกตรวจคงเหลือขั้นต่ำ (เลือกได้ทั้งแบบรวมทั้งแผนก หรือแยกตามสาขาเฉพาะทาง) และรองรับการเพิ่มสาขาในอนาคต
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => setShowAddDeptModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#006699] hover:bg-[#005580] text-white rounded-lg text-xs font-bold shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            เพิ่มแผนกใหม่
          </button>
          <button
            onClick={fetchDepartments}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Info Notice Box */}
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-xs text-sky-900 flex items-start gap-3">
        <Hospital className="w-5 h-5 text-[#006699] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold">เกณฑ์จำนวนแพทย์ออกตรวจคงเหลือขั้นต่ำ (BSI Medical Policy)</h4>
          <p className="text-sky-800 leading-relaxed text-[11px]">
            • สามารถสลับโหมดการคิดโควตาได้ทุกแผนก: <strong>"นับรวมทั้งแผนก"</strong> (เช่น อายุรกรรมรวมอย่างน้อย 5 ท่าน) หรือ <strong>"แยกตามสาขาเฉพาะทาง"</strong> (เช่น อายุรกรรมทั่วไป ≥ 4, โรคไต ≥ 1, โรคหัวใจ ≥ 1)<br />
            • สามารถกดปุ่ม <strong>"+ เพิ่มสาขาเฉพาะทาง"</strong> ในการ์ดแผนกใดก็ได้เพื่อรองรับการแยกสาขาใหม่ในอนาคต
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
            const mode = dept.staffing_mode || 'DEPARTMENT';
            const groups = dept.staffing_groups || [];

            return (
              <div
                key={dept.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4 hover:shadow-card transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-bold bg-sky-100 text-[#006699] px-2 py-0.5 rounded-md">
                        {dept.code}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm">
                        แผนก{dept.name_th}
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium text-right">
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

                  {/* Mode Switcher: Combined Department vs Sub-specialty Groups */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-600">
                      รูปแบบการนับเกณฑ์แพทย์คงเหลือขั้นต่ำ:
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => handleModeChange(dept.id, 'DEPARTMENT')}
                        className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
                          mode === 'DEPARTMENT'
                            ? 'bg-white text-[#006699] shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span>นับรวมทั้งแผนก</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModeChange(dept.id, 'GROUP')}
                        className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all ${
                          mode === 'GROUP'
                            ? 'bg-white text-[#006699] shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5 shrink-0" />
                        <span>แยกตามสาขา ({groups.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* Editable Inputs */}
                  <div className="space-y-3 text-xs">
                    {mode === 'GROUP' ? (
                      <div className="space-y-2.5 p-3 bg-sky-50/50 rounded-xl border border-sky-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[#006699]">
                            เกณฑ์แพทย์คงเหลือขั้นต่ำแยกตามสาขาเฉพาะทาง:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddGroup(dept.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#006699] bg-white hover:bg-sky-50 border border-sky-200 px-2 py-1 rounded-lg shadow-2xs"
                          >
                            <Plus className="w-3 h-3" />
                            เพิ่มสาขา
                          </button>
                        </div>

                        {groups.length === 0 ? (
                          <div className="text-[11px] text-slate-400 text-center py-2">
                            ยังไม่มีสาขาเฉพาะทาง กด "+ เพิ่มสาขา" เพื่อกำหนดเกณฑ์แยกสาขา
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {groups.map(group => (
                              <div key={group.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                                <input
                                  type="text"
                                  value={group.name_th || ''}
                                  onChange={(e) => handleGroupChange(dept.id, group.id, 'name_th', e.target.value)}
                                  placeholder="ชื่อสาขาเฉพาะทาง"
                                  className="flex-1 min-w-0 px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-50 rounded border border-slate-200 focus:bg-white focus:outline-none focus:border-sky-500"
                                />
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[10px] text-slate-400">อย่างน้อย</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={30}
                                    value={group.min_staff_required ?? 0}
                                    onChange={(e) => handleGroupChange(dept.id, group.id, 'min_staff_required', e.target.value)}
                                    className="w-14 p-1 text-center rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-sky-500 font-bold text-slate-800"
                                  />
                                  <span className="text-[11px] text-slate-500">ท่าน</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveGroup(dept.id, group.id)}
                                  title="ลบสาขานี้"
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="pt-2 border-t border-sky-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>เกณฑ์รวมทั้งแผนก (กรณีใช้โหมดรวม):</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={50}
                              value={dept.min_staff_required ?? 0}
                              onChange={(e) => handleChange(dept.id, 'min_staff_required', e.target.value)}
                              className="w-14 p-1 text-center rounded border border-slate-200 bg-white font-bold text-slate-700"
                            />
                            <span>ท่าน</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-slate-600 font-semibold mb-1">
                            จำนวนแพทย์คงเหลือขั้นต่ำทั้งแผนก (ท่าน):
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={50}
                            value={dept.min_staff_required ?? 0}
                            onChange={(e) => handleChange(dept.id, 'min_staff_required', e.target.value)}
                            placeholder="0 = ไม่จำกัดขั้นต่ำ"
                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-sky-500 font-bold text-slate-800"
                          />
                        </div>
                        {groups.length > 0 && (
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                            <span>มีข้อมูลสาขาเฉพาะทางที่บันทึกไว้ ({groups.map(g => `${g.name_th} ≥ ${g.min_staff_required}`).join(', ')})</span>
                            <button
                              type="button"
                              onClick={() => handleModeChange(dept.id, 'GROUP')}
                              className="text-[#006699] font-bold hover:underline shrink-0 ml-2"
                            >
                              สลับใช้แยกสาขา
                            </button>
                          </div>
                        )}
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
                </div>

                {/* Save Button */}
                <button
                  onClick={() => handleSave(dept)}
                  disabled={isSaving}
                  className="w-full py-2.5 bg-[#006699] hover:bg-[#005580] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-98 mt-4"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกเกณฑ์แผนกนี้'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add New Department */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#006699]" />
                เพิ่มแผนกการแพทย์ใหม่
              </h3>
              <button onClick={() => setShowAddDeptModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateDept} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">รหัสแผนก (ภาษาอังกฤษ) *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น CARDIO, NEURO"
                  value={newDeptForm.code}
                  onChange={e => setNewDeptForm({ ...newDeptForm, code: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">ชื่อแผนก (ภาษาไทย) *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น อายุรกรรมหัวใจ"
                  value={newDeptForm.name_th}
                  onChange={e => setNewDeptForm({ ...newDeptForm, name_th: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">ชื่อแผนก (ภาษาอังกฤษ)</label>
                <input
                  type="text"
                  placeholder="เช่น Cardiology"
                  value={newDeptForm.name_en}
                  onChange={e => setNewDeptForm({ ...newDeptForm, name_en: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">แพทย์ขั้นต่ำที่ต้องเหลือ (ท่าน)</label>
                  <input
                    type="number"
                    min={0}
                    value={newDeptForm.min_staff_required}
                    onChange={e => setNewDeptForm({ ...newDeptForm, min_staff_required: parseInt(e.target.value, 10) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ลาพร้อมกันได้สูงสุด (ท่าน)</label>
                  <input
                    type="number"
                    min={1}
                    value={newDeptForm.max_leave_per_day}
                    onChange={e => setNewDeptForm({ ...newDeptForm, max_leave_per_day: parseInt(e.target.value, 10) || 1 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#006699] text-white font-bold"
                >
                  บันทึกแผนกใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
