import React, { useState, useEffect } from 'react';
import {
  GitMerge,
  FileText,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Users,
  Search,
  Filter,
  Check,
  X,
  ShieldCheck,
  Layers,
  Settings,
  Sliders,
  ArrowRight,
  UserCheck,
  Clock,
  Paperclip,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Smartphone,
  UserX,
  MessageSquare,
  Copy,
  Building,
  Building2,
  FileSpreadsheet,
  Activity,
  Upload,
  Download,
  Save
} from 'lucide-react';

export default function AdminMasterDataPage() {
  const [activeTab, setActiveTab] = useState('APPROVAL_ROUTES'); // 'APPROVAL_ROUTES' or 'LEAVE_TYPES'
  const [loading, setLoading] = useState(true);

  // Doctors & Depts (for dropdowns)
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Approval Routes State
  const [routes, setRoutes] = useState([]);
  const [routeSearch, setRouteSearch] = useState('');
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [routeDoctorId, setRouteDoctorId] = useState('');
  const [routeStep1ApproverId, setRouteStep1ApproverId] = useState('');
  const [routeStep2ApproverId, setRouteStep2ApproverId] = useState('');
  const [isEditingDoctorRoute, setIsEditingDoctorRoute] = useState(false);

  // Leave Types State
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [typeSearch, setTypeSearch] = useState('');
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [typeForm, setTypeForm] = useState({
    code: '',
    name_th: '',
    name_en: '',
    count_mode: 'CALENDAR_DAYS',
    allows_half_day: true,
    requires_attachment: false,
    attachment_threshold_days: 2.0,
    attachment_deadline_days: 3,
    min_notice_days: 0,
    allows_backdate: false,
    is_full_time_only: false,
    color: '#006699'
  });

  // Doctor LINE Accounts & Doctor CRUD State
  const [doctorSearch, setDoctorSearch] = useState('');
  const [showIndividualRoutes, setShowIndividualRoutes] = useState(false);

  // Department CRUD & Dept Route State
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [savingDeptId, setSavingDeptId] = useState(null);
  const [deptForm, setDeptForm] = useState({
    code: '',
    name_th: '',
    name_en: '',
    min_staff_required: 2,
    max_leave_per_day: 2,
    head_doctor_id: '',
    final_approver_id: 'c0000000-0000-0000-0000-000000000099'
  });

  // Single Doctor Add/Edit Modal State
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [doctorForm, setDoctorForm] = useState({
    prefix_th: 'นพ.',
    first_name_th: '',
    last_name_th: '',
    employee_id: '',
    license_no: '',
    department_id: '',
    specialty_group: '',
    doctor_type: 'FULL_TIME',
    hire_date: new Date().toISOString().split('T')[0],
    phone: '',
    role: 'DOCTOR',
    is_admin: false
  });

  // Bulk Import Excel/CSV Modal State
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkRawText, setBulkRawText] = useState('');
  const [bulkPreviewRows, setBulkPreviewRows] = useState([]);
  const [importingBulk, setImportingBulk] = useState(false);

  // Medical Affairs Contact Settings State
  const [contactSettings, setContactSettings] = useState({
    coordinator_name: 'คุณธัญญธร ตันติกุล (พี่กุ้ง)',
    phone_hotline: '089-470-9256',
    notify_line: true
  });
  const [contactLoading, setContactLoading] = useState(false);

  // Doctor Quota Modal State
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [selectedDoctorForQuota, setSelectedDoctorForQuota] = useState(null);
  const [doctorQuotaList, setDoctorQuotaList] = useState([]);
  const [savingQuota, setSavingQuota] = useState(false);
  const currentFiscalYear = new Date().getFullYear();

  // Toast
  const [toastMessage, setToastMessage] = useState({ type: '', text: '' });
  const showToast = (text, type = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage({ type: '', text: '' }), 3500);
  };

  // Quota Handlers
  const handleOpenQuotaModal = async (doc) => {
    setSelectedDoctorForQuota(doc);
    try {
      const res = await fetch(`/api/balances/${doc.id}`);
      const balances = res.ok ? await res.json() : [];

      const activeTypes = leaveTypes.filter(lt => {
        if (doc.doctor_type === 'PART_TIME') return !lt.is_full_time_only;
        return true;
      });

      const initialList = activeTypes.map(lt => {
        const existing = balances.find(b => b.leave_type_id === lt.id);
        return {
          leave_type_id: lt.id,
          leave_type_code: lt.code,
          leave_type_name: lt.name_th,
          color: lt.color || '#006699',
          entitlement_days: existing !== undefined ? existing.entitlement_days : '',
          carried_over_days: existing !== undefined ? existing.carried_over_days : 0,
          used_days: existing ? existing.used_days : 0,
          pending_days: existing ? existing.pending_days : 0,
          has_quota: existing !== undefined
        };
      });

      setDoctorQuotaList(initialList);
      setQuotaModalOpen(true);
    } catch (err) {
      showToast('ไม่สามารถดึงข้อมูลโควตาวันลาได้', 'error');
    }
  };

  const handleApplyPreset = () => {
    setDoctorQuotaList(prev => prev.map(item => {
      let ent = item.entitlement_days;
      if (item.leave_type_code === 'VACATION') ent = 20;
      else if (item.leave_type_code === 'SICK') ent = 30;
      else if (item.leave_type_code === 'ORDINATION') ent = 120;
      else if (item.leave_type_code === 'MATERNITY') ent = 90;
      else if (item.leave_type_code === 'UNPAID') ent = 30;
      else if (item.leave_type_code === 'PERSONAL' || item.leave_type_code === 'TRAINING' || item.leave_type_code === 'SHIFT_SWAP') ent = 0;
      return {
        ...item,
        entitlement_days: ent,
        has_quota: ent !== ''
      };
    }));
    showToast('ปรับใช้ค่าโควตามาตรฐานแล้ว (อย่าลืมกดบันทึก)');
  };

  const handleSaveQuota = async (e) => {
    e.preventDefault();
    if (!selectedDoctorForQuota) return;
    setSavingQuota(true);
    try {
      const payload = doctorQuotaList
        .filter(item => item.entitlement_days !== '' && !isNaN(Number(item.entitlement_days)))
        .map(item => ({
          leave_type_id: item.leave_type_id,
          entitlement_days: Number(item.entitlement_days),
          carried_over_days: Number(item.carried_over_days) || 0
        }));

      const res = await fetch(`/api/balances/${selectedDoctorForQuota.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balances: payload, fiscal_year: currentFiscalYear })
      });

      if (!res.ok) throw new Error((await res.json()).error || 'เกิดข้อผิดพลาดในการบันทึก');
      showToast(`บันทึกโควตาวันลาของ ${selectedDoctorForQuota.prefix_th}${selectedDoctorForQuota.first_name_th} สำเร็จ`);
      setQuotaModalOpen(false);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingQuota(false);
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [docRes, deptRes, routeRes, typeRes, contactRes] = await Promise.all([
        fetch('/api/doctors'),
        fetch('/api/departments'),
        fetch('/api/approval-routes'),
        fetch('/api/leave-types?includeAll=true'),
        fetch('/api/settings/contact')
      ]);

      if (docRes.ok) setDoctors(await docRes.json());
      if (deptRes.ok) setDepartments(await deptRes.json());
      if (routeRes.ok) setRoutes(await routeRes.json());
      if (typeRes.ok) setLeaveTypes(await typeRes.json());
      if (contactRes.ok) setContactSettings(await contactRes.json());
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Save Medical Affairs Contact Settings
  const handleSaveContact = async (e) => {
    e.preventDefault();
    setContactLoading(true);
    try {
      const res = await fetch('/api/settings/contact', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactSettings)
      });
      if (res.ok) {
        showToast('บันทึกข้อมูลติดต่อฝ่ายการแพทย์เรียบร้อย');
      } else {
        showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
      }
    } catch {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    } finally {
      setContactLoading(false);
    }
  };

  // Unlink Doctor LINE Account
  const handleUnlinkDoctorLine = async (docId, docName) => {
    if (!window.confirm(`ท่านต้องการยกเลิกการผูกบัญชี LINE ของ ${docName} ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/doctors/${docId}/unlink-line`, { method: 'POST' });
      if (res.ok) {
        showToast(`ยกเลิกการผูก LINE ของ ${docName} เรียบร้อย`);
        const docRes = await fetch('/api/doctors');
        if (docRes.ok) setDoctors(await docRes.json());
      } else {
        showToast('เกิดข้อผิดพลาดในการยกเลิก', 'error');
      }
    } catch {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    }
  };

  // Toggle Doctor Working Pattern (OFFICE_HOURS vs SHIFT_BASED)
  const handleToggleDoctorWorkingPattern = async (doc) => {
    const currentPattern = doc.working_pattern || (doc.doctor_type === 'PART_TIME' ? 'SHIFT_BASED' : 'OFFICE_HOURS');
    const newPattern = currentPattern === 'OFFICE_HOURS' ? 'SHIFT_BASED' : 'OFFICE_HOURS';
    const label = newPattern === 'OFFICE_HOURS' ? 'จันทร์ - ศุกร์ (หยุด ส.-อา.)' : 'ตามตารางเวร (Shift-based)';

    try {
      const res = await fetch(`/api/doctors/${doc.id}/working-pattern`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ working_pattern: newPattern })
      });
      if (res.ok) {
        showToast(`อัปเดตรูปแบบการทำงานของ ${doc.prefix_th || ''}${doc.first_name_th} เป็น "${label}" เรียบร้อย`);
        const docRes = await fetch('/api/doctors');
        if (docRes.ok) setDoctors(await docRes.json());
      } else {
        showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');
      }
    } catch {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    }
  };

  // --- Handlers: Department Approval Routes & Department CRUD ---
  const handleDeptRouteChange = (deptId, field, value) => {
    setDepartments(prev =>
      prev.map(d => (d.id === deptId ? { ...d, [field]: value } : d))
    );
  };

  const handleSaveDeptApprovalRoute = async (dept) => {
    setSavingDeptId(dept.id);
    try {
      const res = await fetch(`/api/departments/${dept.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          head_doctor_id: dept.head_doctor_id || null,
          final_approver_id: dept.final_approver_id || 'c0000000-0000-0000-0000-000000000099'
        })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'บันทึกไม่สำเร็จ');
      showToast(`บันทึกสายอนุมัติแผนก${dept.name_th} และอัปเดตให้แพทย์ในแผนกเรียบร้อย`);
      fetchInitialData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingDeptId(null);
    }
  };

  const handleOpenAddDept = () => {
    setEditingDept(null);
    setDeptForm({
      code: '',
      name_th: '',
      name_en: '',
      min_staff_required: 2,
      max_leave_per_day: 2,
      head_doctor_id: '',
      final_approver_id: 'c0000000-0000-0000-0000-000000000099'
    });
    setDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept) => {
    setEditingDept(dept);
    setDeptForm({
      code: dept.code || '',
      name_th: dept.name_th || '',
      name_en: dept.name_en || '',
      min_staff_required: dept.min_staff_required ?? 2,
      max_leave_per_day: dept.max_leave_per_day ?? 2,
      head_doctor_id: dept.head_doctor_id || '',
      final_approver_id: dept.final_approver_id || 'c0000000-0000-0000-0000-000000000099'
    });
    setDeptModalOpen(true);
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    try {
      const url = editingDept ? `/api/departments/${editingDept.id}` : '/api/departments';
      const method = editingDept ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deptForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
      showToast(editingDept ? 'แก้ไขข้อมูลแผนกสำเร็จ' : 'เพิ่มแผนกใหม่สำเร็จ');
      setDeptModalOpen(false);
      fetchInitialData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteDept = async (dept) => {
    if (!window.confirm(`ยืนยันการลบแผนก "${dept.name_th}"?`)) return;
    try {
      const res = await fetch(`/api/departments/${dept.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถลบแผนกได้');
      showToast('ลบแผนกเรียบร้อยแล้ว');
      fetchInitialData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // --- Handlers: Doctor Add/Edit/Delete & Bulk Import ---
  const handleOpenAddDoctor = () => {
    setEditingDoctor(null);
    const defaultDept = departments.find(d => d.code !== 'EXEC') || departments[0];
    setDoctorForm({
      prefix_th: 'นพ.',
      first_name_th: '',
      last_name_th: '',
      employee_id: `DOC-${String(doctors.length + 1).padStart(3, '0')}`,
      license_no: '',
      department_id: defaultDept?.id || '',
      specialty_group: defaultDept?.staffing_groups?.[0]?.id || '',
      doctor_type: 'FULL_TIME',
      hire_date: new Date().toISOString().split('T')[0],
      phone: '',
      role: 'DOCTOR',
      is_admin: false
    });
    setDoctorModalOpen(true);
  };

  const handleOpenEditDoctor = (doc) => {
    setEditingDoctor(doc);
    const isHead = (doc.roles || []).includes('DEPT_HEAD');
    const isAdmin = (doc.roles || []).includes('MEDICAL_ADMIN') || (doc.roles || []).includes('ADMIN');
    setDoctorForm({
      prefix_th: doc.prefix_th || 'นพ.',
      first_name_th: doc.first_name_th || '',
      last_name_th: doc.last_name_th || '',
      employee_id: doc.employee_id || '',
      license_no: doc.license_no || '',
      department_id: doc.department_id || '',
      specialty_group: doc.specialty_group || '',
      doctor_type: doc.doctor_type || 'FULL_TIME',
      hire_date: doc.hire_date || new Date().toISOString().split('T')[0],
      phone: doc.phone || '',
      role: isHead ? 'DEPT_HEAD' : 'DOCTOR',
      is_admin: isAdmin
    });
    setDoctorModalOpen(true);
  };

  const handleSaveDoctor = async (e) => {
    e.preventDefault();
    try {
      const url = editingDoctor ? `/api/doctors/${editingDoctor.id}` : '/api/doctors';
      const method = editingDoctor ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doctorForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถบันทึกข้อมูลแพทย์ได้');
      showToast(editingDoctor ? 'แก้ไขข้อมูลแพทย์สำเร็จ' : 'เพิ่มรายชื่อแพทย์สำเร็จ');
      setDoctorModalOpen(false);
      fetchInitialData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteDoctor = async (doc) => {
    if (!window.confirm(`ยืนยันการลบรายชื่อ ${doc.prefix_th}${doc.first_name_th} ${doc.last_name_th}?`)) return;
    try {
      const res = await fetch(`/api/doctors/${doc.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถลบได้');
      showToast('ลบรายชื่อแพทย์เรียบร้อยแล้ว');
      fetchInitialData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Parse CSV/TSV text from Excel paste or file upload
  const parseBulkText = (text) => {
    setBulkRawText(text);
    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setBulkPreviewRows([]);
      return;
    }

    const parsed = [];
    lines.forEach((line, idx) => {
      // Detect delimiter (Tab from Excel copy-paste or Comma from CSV)
      const cols = line.includes('\t')
        ? line.split('\t').map(c => c.trim().replace(/^"|"$/g, ''))
        : line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));

      // Skip header row if detected
      if (
        idx === 0 &&
        (cols[0]?.includes('คำนำหน้า') ||
          cols[0]?.toLowerCase().includes('prefix') ||
          cols[1]?.includes('ชื่อ'))
      ) {
        return;
      }

      if (cols.length >= 2) {
        parsed.push({
          prefix_th: cols[0] || 'นพ.',
          first_name_th: cols[1] || '',
          last_name_th: cols[2] || '',
          employee_id: cols[3] || `DOC-${Date.now().toString().slice(-3)}-${idx + 1}`,
          license_no: cols[4] || '',
          department: cols[5] || 'อายุรกรรม',
          specialty_group: cols[6] || '',
          doctor_type: cols[7] || 'FULL_TIME',
          hire_date: cols[8] || new Date().toISOString().split('T')[0],
          phone: cols[9] || '',
          role: cols[10] || 'DOCTOR'
        });
      }
    });
    setBulkPreviewRows(parsed);
  };

  const handleBulkFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result || '';
      parseBulkText(String(content));
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDownloadTemplateCsv = () => {
    const csvContent =
      '\uFEFFคำนำหน้า,ชื่อ,นามสกุล,รหัสพนักงาน,เลขใบประกอบวิชาชีพ,แผนก,สาขาเฉพาะทาง (ถ้ามี),ประเภท (FULL_TIME/PART_TIME),วันเริ่มงาน (YYYY-MM-DD),เบอร์โทรศัพท์,บทบาท (DOCTOR/DEPT_HEAD)\n' +
      'นพ.,สมชาย,ใจดี,DOC-101,ว. 65432,อายุรกรรม,MED_GEN,FULL_TIME,2024-01-15,081-234-5678,DOCTOR\n' +
      'พญ.,กมลชนก,รักษ์ดี,DOC-102,ว. 65433,สูตินรีเวช,,FULL_TIME,2024-03-01,089-876-5432,DOCTOR\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bsi_doctors_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmBulkImport = async () => {
    if (bulkPreviewRows.length === 0) {
      showToast('ไม่พบข้อมูลแพทย์ที่จะนำเข้า', 'error');
      return;
    }
    setImportingBulk(true);
    try {
      const res = await fetch('/api/doctors/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctors: bulkPreviewRows })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'นำเข้าไม่สำเร็จ');
      showToast(data.message || 'นำเข้ารายชื่อแพทย์สำเร็จ');
      setBulkModalOpen(false);
      setBulkRawText('');
      setBulkPreviewRows([]);
      fetchInitialData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setImportingBulk(false);
    }
  };

  // --- Handlers: Approval Routes (Grouped by Doctor) ---
  const handleSelectDoctorForRoute = (docId) => {
    setRouteDoctorId(docId);
    const step1 = routes.find(r => r.doctor_id === docId && Number(r.step_order) === 1);
    const step2 = routes.find(r => r.doctor_id === docId && Number(r.step_order) === 2);
    const defaultExec = doctors.find(d => d.employee_id === 'EXEC-PARIWAT') || doctors.find(d => d.id !== docId);
    setRouteStep1ApproverId(step1 ? step1.approver_id : (defaultExec?.id || ''));
    setRouteStep2ApproverId(step2 ? step2.approver_id : '');
  };

  const handleOpenAddRoute = () => {
    setIsEditingDoctorRoute(false);
    const eligibleDocs = doctors.filter(d => d.employee_id !== 'EMP-KOONG' && d.employee_id !== 'EXEC-PARIWAT');
    const firstDoc = eligibleDocs[0] || doctors[0];
    if (firstDoc) {
      handleSelectDoctorForRoute(firstDoc.id);
    }
    setRouteModalOpen(true);
  };

  const handleOpenEditDoctorRoute = (docGroup) => {
    setIsEditingDoctorRoute(true);
    setRouteDoctorId(docGroup.doctor.id);
    setRouteStep1ApproverId(docGroup.step1 ? docGroup.step1.approver_id : '');
    setRouteStep2ApproverId(docGroup.step2 ? docGroup.step2.approver_id : '');
    setRouteModalOpen(true);
  };

  const handleSaveRoute = async (e) => {
    e.preventDefault();
    if (!routeDoctorId || !routeStep1ApproverId) {
      showToast('กรุณาเลือกแพทย์และผู้อนุมัติขั้นที่ 1', 'error');
      return;
    }
    if (routeDoctorId === routeStep1ApproverId || (routeStep2ApproverId && routeDoctorId === routeStep2ApproverId)) {
      showToast('แพทย์ไม่สามารถเป็นผู้อนุมัติตนเองได้', 'error');
      return;
    }
    if (routeStep2ApproverId && routeStep1ApproverId === routeStep2ApproverId) {
      showToast('ผู้อนุมัติขั้นที่ 1 และขั้นที่ 2 ไม่ควรเป็นคนเดียวกัน (หากอนุมัติจบในคนเดียว ให้เลือกขั้นที่ 2 เป็น "ไม่มีขั้นที่ 2")', 'error');
      return;
    }

    try {
      // 1. Save Step 1 (POST /api/approval-routes upserts by doctor_id + step_order)
      const res1 = await fetch('/api/approval-routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: routeDoctorId,
          approver_id: routeStep1ApproverId,
          step_order: 1
        })
      });
      if (!res1.ok) throw new Error((await res1.json()).error);

      // 2. Save or remove Step 2
      const existingStep2 = routes.find(r => r.doctor_id === routeDoctorId && Number(r.step_order) === 2);
      if (routeStep2ApproverId) {
        const res2 = await fetch('/api/approval-routes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doctor_id: routeDoctorId,
            approver_id: routeStep2ApproverId,
            step_order: 2
          })
        });
        if (!res2.ok) throw new Error((await res2.json()).error);
      } else if (existingStep2) {
        await fetch(`/api/approval-routes/${existingStep2.id}`, { method: 'DELETE' });
      }

      showToast('บันทึกสายการอนุมัติเรียบร้อย');
      setRouteModalOpen(false);
      const updatedRes = await fetch('/api/approval-routes');
      if (updatedRes.ok) setRoutes(await updatedRes.json());
    } catch (err) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกสายอนุมัติ', 'error');
    }
  };

  const handleClearDoctorRoute = async (docGroup) => {
    if (!window.confirm(`ยืนยันการล้างสายอนุมัติของ ${docGroup.doctor_name}?`)) return;
    try {
      if (docGroup.step1) {
        await fetch(`/api/approval-routes/${docGroup.step1.id}`, { method: 'DELETE' });
      }
      if (docGroup.step2) {
        await fetch(`/api/approval-routes/${docGroup.step2.id}`, { method: 'DELETE' });
      }
      showToast('ล้างสายอนุมัติเรียบร้อย');
      const updatedRes = await fetch('/api/approval-routes');
      if (updatedRes.ok) setRoutes(await updatedRes.json());
    } catch {
      showToast('ไม่สามารถลบสายอนุมัติได้', 'error');
    }
  };

  // --- Handlers: Leave Types ---
  const handleOpenAddType = () => {
    setSelectedType(null);
    setTypeForm({
      code: '',
      name_th: '',
      name_en: '',
      count_mode: 'CALENDAR_DAYS',
      allows_half_day: true,
      requires_attachment: false,
      attachment_threshold_days: 2.0,
      attachment_deadline_days: 3,
      min_notice_days: 0,
      allows_backdate: false,
      is_full_time_only: false,
      color: '#0ea5e9'
    });
    setTypeModalOpen(true);
  };

  const handleOpenEditType = (lt) => {
    setSelectedType(lt);
    setTypeForm({
      code: lt.code,
      name_th: lt.name_th,
      name_en: lt.name_en || '',
      count_mode: lt.count_mode || 'CALENDAR_DAYS',
      allows_half_day: lt.allows_half_day !== false,
      requires_attachment: Boolean(lt.requires_attachment),
      attachment_threshold_days: lt.attachment_threshold_days || 0,
      attachment_deadline_days: lt.attachment_deadline_days || 3,
      min_notice_days: lt.min_notice_days || 0,
      allows_backdate: Boolean(lt.allows_backdate),
      is_full_time_only: Boolean(lt.is_full_time_only),
      color: lt.color || '#006699'
    });
    setTypeModalOpen(true);
  };

  const handleSaveType = async (e) => {
    e.preventDefault();
    try {
      if (selectedType) {
        const res = await fetch(`/api/leave-types/${selectedType.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(typeForm)
        });
        if (!res.ok) throw new Error((await res.json()).error);
        showToast('แก้ไขประเภทการลาสำเร็จ');
      } else {
        const res = await fetch('/api/leave-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(typeForm)
        });
        if (!res.ok) throw new Error((await res.json()).error);
        showToast('เพิ่มประเภทการลาใหม่สำเร็จ');
      }
      setTypeModalOpen(false);
      const res2 = await fetch('/api/leave-types?includeAll=true');
      if (res2.ok) setLeaveTypes(await res2.json());
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleTypeActive = async (lt) => {
    try {
      const res = await fetch(`/api/leave-types/${lt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !lt.is_active })
      });
      if (res.ok) {
        setLeaveTypes(prev =>
          prev.map(item => (item.id === lt.id ? { ...item, is_active: !lt.is_active } : item))
        );
        showToast(`${!lt.is_active ? 'เปิด' : 'ปิด'}การใช้งานเรียบร้อย`);
      }
    } catch (err) {
      showToast('ไม่สามารถเปลี่ยนสถานะได้', 'error');
    }
  };

  // Group approval routes 1 row per doctor (excluding admin staff EMP-KOONG & final executive approver EXEC-PARIWAT)
  const groupedDoctorRoutes = doctors
    .filter(d => d.employee_id !== 'EMP-KOONG' && d.employee_id !== 'EXEC-PARIWAT')
    .map(doc => {
      const dept = departments.find(dp => dp.id === doc.department_id);
      const docRoutes = routes
        .filter(r => r.doctor_id === doc.id)
        .sort((a, b) => Number(a.step_order) - Number(b.step_order));
      const step1 = docRoutes.find(r => Number(r.step_order) === 1) || null;
      const step2 = docRoutes.find(r => Number(r.step_order) === 2) || null;
      const isDeptHead = doc.role === 'APPROVER' || doc.roles?.includes('DEPT_HEAD') || (doc.employee_id && doc.employee_id.startsWith('HEAD-')) || departments.some(dp => dp.head_doctor_id === doc.id);
      return {
        doctor: doc,
        doctor_id: doc.id,
        doctor_name: `${doc.prefix_th}${doc.first_name_th} ${doc.last_name_th}`,
        doctor_employee_id: doc.employee_id,
        department_name: dept ? dept.name_th : '',
        is_dept_head: isDeptHead,
        step1,
        step2,
        has_route: Boolean(step1 || step2)
      };
    });

  const filteredDoctorRoutes = groupedDoctorRoutes.filter(item => {
    if (!routeSearch.trim()) return true;
    const q = routeSearch.toLowerCase();
    return (
      item.doctor_name.toLowerCase().includes(q) ||
      item.doctor_employee_id.toLowerCase().includes(q) ||
      item.department_name.toLowerCase().includes(q) ||
      (item.step1?.approver_name || '').toLowerCase().includes(q) ||
      (item.step2?.approver_name || '').toLowerCase().includes(q)
    );
  });

  const filteredLeaveTypes = leaveTypes.filter(lt => {
    if (!typeSearch.trim()) return true;
    const q = typeSearch.toLowerCase();
    return lt.name_th.toLowerCase().includes(q) || lt.code.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
      
      {/* Toast */}
      {toastMessage.text && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-in slide-in-from-top-2 duration-200 ${
          toastMessage.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {toastMessage.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-600" /> : <CheckCircle className="w-4 h-4 text-emerald-600" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#006699] text-white flex items-center justify-center shadow-sm shadow-sky-900/10">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                จัดการข้อมูลหลัก & สายอนุมัติ (Master Data Portal)
              </h1>
              <p className="text-xs text-slate-500">
                ตั้งค่าสายบังคับบัญชาผู้อนุมัติการลา (Approver) และกำหนดประเภทการลาพร้อมกฎเงื่อนไขประจำโรงพยาบาล
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap sm:flex-nowrap overflow-x-auto rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold gap-1">
          <button
            onClick={() => setActiveTab('APPROVAL_ROUTES')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'APPROVAL_ROUTES'
                ? 'bg-white text-[#006699] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>สายอนุมัติ & แผนก ({departments.filter(d => d.code !== 'EXEC').length} แผนก)</span>
          </button>

          <button
            onClick={() => setActiveTab('LEAVE_TYPES')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'LEAVE_TYPES'
                ? 'bg-white text-[#006699] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>ประเภทการลา ({leaveTypes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('DOCTORS_LINE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'DOCTORS_LINE'
                ? 'bg-white text-[#006699] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>รายชื่อแพทย์ & LINE ({doctors.filter(d => d.employee_id !== 'EMP-KOONG').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('CONTACT_INFO')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'CONTACT_INFO'
                ? 'bg-white text-[#006699] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>ข้อมูลติดต่อฝ่ายการแพทย์</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: APPROVAL ROUTES BY DEPARTMENT + DEPT CRUD          */}
      {/* ========================================================= */}
      {activeTab === 'APPROVAL_ROUTES' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Easy-to-understand Visual Flow Guide */}
          <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="font-bold text-sky-900 flex items-center gap-1.5">
                <GitMerge className="w-4 h-4 text-[#006699]" />
                <span>ตั้งค่าสายการอนุมัติรายแผนก (Department Approval Flow)</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">แพทย์ในแผนก</span>
                  <span>➔ ขั้นที่ 1: <b>หัวหน้าแผนก</b> ➔ ขั้นที่ 2: <b>นพ.ปริวรรธน์ (ผช.ผอ.)</b></span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">หัวหน้าแผนก</span>
                  <span>➔ อนุมัติโดยตรง (1 ขั้นตอน): <b>นพ.ปริวรรธน์ (ผช.ผอ.)</b></span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={handleOpenAddDept}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#006699] hover:bg-[#005580] text-white text-xs font-bold transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มแผนกใหม่</span>
              </button>
              <button
                onClick={() => setShowIndividualRoutes(!showIndividualRoutes)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
              >
                <UserCheck className="w-3.5 h-3.5 text-[#006699]" />
                <span>{showIndividualRoutes ? 'ซ่อนสายอนุมัติรายบุคคล' : `ดู/แก้ไขรายบุคคล (${groupedDoctorRoutes.length} ท่าน)`}</span>
              </button>
            </div>
          </div>

          {/* Department-Level Approval Routes Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#006699]" />
                <span className="text-xs font-bold text-slate-800">
                  สายอนุมัติระดับแผนก (บันทึกครั้งเดียวมีผลกับแพทย์ทุกคนในแผนกอัตโนมัติ)
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                ทั้งหมด {departments.filter(d => d.code !== 'EXEC').length} แผนกคลินิก
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#006699]" />
                <span className="text-xs">กำลังโหลดข้อมูลแผนกและสายอนุมัติ...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">แผนก (Department)</th>
                      <th className="py-3 px-4">ขั้นที่ 1: หัวหน้าแผนก (Dept Head)</th>
                      <th className="py-3 px-4">ขั้นที่ 2: ผู้อนุมัติสูงสุด (Final Approver)</th>
                      <th className="py-3 px-4 text-right">จัดการแผนก & สายอนุมัติ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {departments
                      .filter(dept => dept.code !== 'EXEC')
                      .map((dept) => {
                        const deptDocs = doctors.filter(
                          d => d.department_id === dept.id && d.employee_id !== 'EMP-KOONG' && d.employee_id !== 'EXEC-PARIWAT'
                        );
                        return (
                          <tr key={dept.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <span className="px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-[#006699] font-mono font-bold text-[10px]">
                                  {dept.code}
                                </span>
                                <div>
                                  <div className="font-bold text-slate-800 text-xs">
                                    แผนก{dept.name_th}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {dept.name_en || '-'} • แพทย์ในสังกัด {deptDocs.length} ท่าน
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <select
                                value={dept.head_doctor_id || ''}
                                onChange={(e) => handleDeptRouteChange(dept.id, 'head_doctor_id', e.target.value)}
                                className="w-full max-w-[250px] p-2 rounded-xl border border-emerald-300 bg-emerald-50/40 text-slate-800 font-bold text-xs focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                              >
                                <option value="">-- เลือกหัวหน้าแผนก (ขั้นที่ 1) --</option>
                                {doctors
                                  .filter(d => d.employee_id !== 'EMP-KOONG')
                                  .map(d => (
                                    <option key={d.id} value={d.id}>
                                      {d.prefix_th}{d.first_name_th} {d.last_name_th} {d.department_id === dept.id ? '(ในแผนก)' : ''}
                                    </option>
                                  ))}
                              </select>
                            </td>

                            <td className="py-3 px-4">
                              <select
                                value={dept.final_approver_id || 'c0000000-0000-0000-0000-000000000099'}
                                onChange={(e) => handleDeptRouteChange(dept.id, 'final_approver_id', e.target.value)}
                                className="w-full max-w-[250px] p-2 rounded-xl border border-purple-300 bg-purple-50/40 text-slate-800 font-bold text-xs focus:ring-2 focus:ring-purple-600 focus:bg-white"
                              >
                                {doctors
                                  .filter(d => d.employee_id !== 'EMP-KOONG')
                                  .map(d => (
                                    <option key={d.id} value={d.id}>
                                      {d.prefix_th}{d.first_name_th} {d.last_name_th}
                                    </option>
                                  ))}
                              </select>
                            </td>

                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleSaveDeptApprovalRoute(dept)}
                                  disabled={savingDeptId === dept.id}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#006699] hover:bg-[#005580] text-white text-[11px] font-bold transition-all shadow-2xs disabled:opacity-50"
                                >
                                  {savingDeptId === dept.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  )}
                                  <span>บันทึกสายแผนก</span>
                                </button>
                                <button
                                  onClick={() => handleOpenEditDept(dept)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition-colors"
                                  title="แก้ไขชื่อแผนก / รหัสแผนก"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>แก้ไขแผนก</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteDept(dept)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="ลบแผนก"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Collapsible Individual Doctor Route Overrides */}
          {showIndividualRoutes && (
            <div className="space-y-3 pt-2 animate-in fade-in duration-150">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={routeSearch}
                    onChange={(e) => setRouteSearch(e.target.value)}
                    placeholder="ค้นหาชื่อแพทย์, แผนก, ผู้อนุมัติ..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#006699]"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                  <button
                    onClick={handleOpenAddRoute}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>ตั้งค่าสายอนุมัติเฉพาะบุคคล (Override)</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">แพทย์ผู้ขอลา</th>
                        <th className="py-3 px-4">แผนก</th>
                        <th className="py-3 px-4">ลำดับสายการอนุมัติ (Approval Flow)</th>
                        <th className="py-3 px-4 text-right">จัดการเฉพาะบุคคล</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDoctorRoutes.map((item) => (
                        <tr key={item.doctor_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                item.is_dept_head ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-[#006699]'
                              }`}>
                                <UserCheck className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                  <span>{item.doctor_name}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    item.is_dept_head
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-sky-100 text-sky-800'
                                  }`}>
                                    {item.is_dept_head ? 'หัวหน้าแผนก' : 'แพทย์ในแผนก'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {item.doctor_employee_id}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                            แผนก{item.department_name}
                          </td>

                          <td className="py-3.5 px-4">
                            {!item.has_route ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>ยังไม่ได้ตั้งค่าผู้อนุมัติ</span>
                              </span>
                            ) : (
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.step1 && (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      item.step2
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-purple-100 text-purple-800'
                                    }`}>
                                      {item.step2 ? 'ขั้นที่ 1' : 'อนุมัติโดยตรง (1 ขั้นตอน)'}
                                    </span>
                                    <span className="font-bold text-slate-800">{item.step1.approver_name}</span>
                                  </div>
                                )}
                                {item.step2 && (
                                  <>
                                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-50/60 border border-purple-200 text-slate-800">
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                        ขั้นที่ 2 (อนุมัติขั้นสุดท้าย)
                                      </span>
                                      <span className="font-bold text-slate-800">{item.step2.approver_name}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditDoctorRoute(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-sky-50 hover:border-sky-200 text-slate-700 hover:text-[#006699] text-[11px] font-bold transition-colors"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>แก้ไข</span>
                              </button>
                              {item.has_route && (
                                <button
                                  onClick={() => handleClearDoctorRoute(item)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="ล้างสายอนุมัติ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: LEAVE TYPES (ITEM 25)                              */}
      {/* ========================================================= */}
      {activeTab === 'LEAVE_TYPES' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Action Row */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={typeSearch}
                onChange={(e) => setTypeSearch(e.target.value)}
                placeholder="ค้นหาประเภทการลา..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#006699]"
              />
            </div>

            <button
              onClick={handleOpenAddType}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#006699] hover:bg-[#005580] text-white text-xs font-bold transition-all shadow-sm shadow-sky-900/10"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มประเภทการลาใหม่</span>
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLeaveTypes.map((lt) => (
              <div
                key={lt.id}
                className={`bg-white rounded-2xl border p-5 shadow-2xs flex flex-col justify-between transition-all ${
                  lt.is_active ? 'border-slate-200 hover:border-sky-300' : 'border-slate-200 opacity-60 bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: lt.color || '#006699' }}
                      />
                      <span className="font-bold text-sm text-slate-900">{lt.name_th}</span>
                    </div>

                    <button
                      onClick={() => handleToggleTypeActive(lt)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                        lt.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {lt.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono mb-4">
                    CODE: {lt.code} {lt.name_en ? `• ${lt.name_en}` : ''}
                  </div>

                  {/* Policy Badges */}
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <span className="text-[11px] text-slate-500">การนับจำนวนวัน:</span>
                      <span className="font-semibold text-slate-800">
                        {lt.count_mode === 'WORKING_DAYS' ? 'นับเฉพาะวันทำการ' : 'นับทุกวันตามปฏิทิน'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <span className="text-[11px] text-slate-500">แจ้งล่วงหน้าอย่างน้อย:</span>
                      <span className="font-semibold text-slate-800">
                        {lt.min_notice_days > 0 ? `${lt.min_notice_days} วัน` : 'ไม่ต้องแจ้งล่วงหน้า'}
                      </span>
                    </div>

                    {lt.max_days_per_request > 0 && (
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <span className="text-[11px] text-slate-500">ลาสูงสุดต่อครั้ง:</span>
                        <span className="font-semibold text-[#006699]">
                          ไม่เกิน {lt.max_days_per_request} วัน
                        </span>
                      </div>
                    )}

                    {lt.max_requests_per_year > 0 && (
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <span className="text-[11px] text-slate-500">จำนวนครั้งต่อปี:</span>
                        <span className="font-semibold text-violet-700">
                          ปีละ {lt.max_requests_per_year} ครั้ง
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <span className="text-[11px] text-slate-500">การแนบเอกสาร:</span>
                      <span className="font-semibold text-slate-800">
                        {lt.requires_attachment
                          ? lt.attachment_threshold_days > 0
                            ? `ลาเกิน ${lt.attachment_threshold_days} วัน`
                            : 'จำเป็นทุกกรณี'
                          : 'ไม่บังคับ'}
                      </span>
                    </div>

                    {lt.requires_attachment && (
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <span className="text-[11px] text-slate-500">แนบตามหลังได้:</span>
                        <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          ภายใน {lt.attachment_deadline_days || 3} วัน
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <span className="text-[11px] text-slate-500">ลาย้อนหลังได้:</span>
                      <span className={`font-semibold ${lt.allows_backdate ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {lt.allows_backdate ? 'อนุญาต' : 'ไม่อนุญาต'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">แพทย์พาร์ทไทม์:</span>
                      <span className={`font-semibold ${lt.is_full_time_only ? 'text-amber-700' : 'text-slate-800'}`}>
                        {lt.is_full_time_only ? 'เฉพาะแพทย์ประจำ' : 'ใช้ได้ทุกคน'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-1">
                  <button
                    onClick={() => handleOpenEditType(lt)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-[#006699] hover:bg-sky-50 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>แก้ไขกฎ</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: DOCTORS & LINE ACCOUNTS                            */}
      {/* ========================================================= */}
      {activeTab === 'DOCTORS_LINE' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Action Row & Summary */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  placeholder="ค้นหาแพทย์, แผนก, รหัสพนักงาน, เลข ว...."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#006699]"
                />
              </div>

              <div className="flex items-center gap-2 text-xs flex-wrap">
                <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>ผูก LINE: {doctors.filter(d => d.employee_id !== 'EMP-KOONG' && d.line_user_id).length} ท่าน</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-semibold">
                  <span>ยังไม่ผูก: {doctors.filter(d => d.employee_id !== 'EMP-KOONG' && !d.line_user_id).length} ท่าน</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleOpenAddDoctor}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#006699] hover:bg-[#005580] text-white text-xs font-bold transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มรายชื่อแพทย์ (รายคน)</span>
              </button>
              <button
                onClick={() => {
                  setBulkRawText('');
                  setBulkPreviewRows([]);
                  setBulkModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                <Upload className="w-4 h-4" />
                <span>นำเข้าจาก Excel / CSV (หลายคน)</span>
              </button>
            </div>
          </div>

          {/* Doctors Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">แพทย์ / รหัส</th>
                    <th className="py-3 px-4">แผนก / สาขา</th>
                    <th className="py-3 px-4">ประเภทแพทย์</th>
                    <th className="py-3 px-4">สถานะ LINE Official</th>
                    <th className="py-3 px-4">เบอร์โทรศัพท์</th>
                    <th className="py-3 px-4 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doctors
                    .filter(d => d.employee_id !== 'EMP-KOONG')
                    .filter(d => {
                      if (!doctorSearch.trim()) return true;
                      const q = doctorSearch.toLowerCase();
                      const name = `${d.prefix_th || ''}${d.first_name_th || ''} ${d.last_name_th || ''}`.toLowerCase();
                      const emp = (d.employee_id || '').toLowerCase();
                      const dept = (d.department_name || '').toLowerCase();
                      const lic = (d.license_no || '').toLowerCase();
                      return name.includes(q) || emp.includes(q) || dept.includes(q) || lic.includes(q);
                    })
                    .map(doc => {
                      const isLinked = Boolean(doc.line_user_id);
                      const deptObj = departments.find(dep => dep.id === doc.department_id);
                      const specGroupObj = (deptObj?.staffing_groups || []).find(g => (g.id || g.code) === doc.specialty_group);
                      return (
                        <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={doc.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100'}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                              <div>
                                <span className="font-bold text-slate-800 block text-xs">
                                  {doc.prefix_th}{doc.first_name_th} {doc.last_name_th}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {doc.employee_id}
                                  </span>
                                  {doc.license_no && (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-mono">
                                      {doc.license_no}
                                    </span>
                                  )}
                                  {((doc.roles || []).includes('MEDICAL_ADMIN') || (doc.roles || []).includes('ADMIN')) && (
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                      🛡️ แอดมิน
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            <div>{doc.department_name || deptObj?.name_th || 'ไม่ระบุ'}</div>
                            {specGroupObj && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {specGroupObj.name_th}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              doc.doctor_type === 'FULL_TIME'
                                ? 'bg-sky-50 text-[#006699] border border-sky-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}>
                              {doc.doctor_type === 'FULL_TIME' ? 'ประจำ (FT)' : 'Part-Time (PT)'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {isLinked ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>ผูกแล้ว</span>
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono truncate max-w-[100px]" title={doc.line_user_id}>
                                  {doc.line_display_name || doc.line_user_id.slice(0, 10) + '...'}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>ยังไม่ผูก LINE</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                            {doc.phone || '-'}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditDoctor(doc)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-semibold transition-colors"
                                title="แก้ไขข้อมูลแพทย์"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>แก้ไข</span>
                              </button>

                              <button
                                onClick={() => handleOpenQuotaModal(doc)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-sky-200 text-[#006699] hover:bg-sky-50 text-[11px] font-semibold transition-colors shadow-2xs"
                                title="ตั้งค่า/แก้ไขโควตาวันลาประจำปีของแพทย์ท่านนี้"
                              >
                                <Sliders className="w-3 h-3" />
                                <span>โควตา</span>
                              </button>

                              {isLinked ? (
                                <button
                                  onClick={() => handleUnlinkDoctorLine(doc.id, `${doc.prefix_th}${doc.first_name_th}`)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-semibold transition-colors"
                                  title="ยกเลิกการผูกเพื่ออนุญาตให้แพทย์ผูก LINE ใหม่ได้"
                                >
                                  <UserX className="w-3 h-3" />
                                  <span>ปลด LINE</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(window.location.origin);
                                    showToast('คัดลอกลิงก์หน้าลงทะเบียนเข้าใช้งานให้แพทย์แล้ว');
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-[11px] font-medium transition-colors"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>ลิงก์</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteDoctor(doc)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="ลบรายชื่อแพทย์"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: MEDICAL AFFAIRS CONTACT SETTINGS                   */}
      {/* ========================================================= */}
      {activeTab === 'CONTACT_INFO' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Form Column */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-[#006699] flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    ตั้งค่าข้อมูลผู้ประสานงาน (HR / ฝ่ายการแพทย์)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ระบุชื่อผู้ประสานงานและเบอร์โทรศัพท์สำหรับให้แพทย์ติดต่อโดยตรง
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveContact} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ชื่อผู้ประสานงานหลัก <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={contactSettings.coordinator_name || ''}
                      onChange={(e) => setContactSettings({ ...contactSettings, coordinator_name: e.target.value })}
                      placeholder="คุณธัญญธร ตันติกุล (พี่กุ้ง)"
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 focus:ring-2 focus:ring-[#006699]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      เบอร์โทรศัพท์ติดต่อ <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={contactSettings.phone_hotline || ''}
                        onChange={(e) =>
                          setContactSettings({
                            ...contactSettings,
                            phone_hotline: e.target.value,
                            phone_emergency: e.target.value
                          })
                        }
                        placeholder="089-470-9256"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-800 focus:ring-2 focus:ring-[#006699]"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#006699]" />
                    <span className="font-semibold text-slate-700">ส่ง Push Alert ด่วนเข้า LINE แอดมินทันทีที่มีการลาฉุกเฉิน</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(contactSettings.notify_line)}
                    onChange={(e) => setContactSettings({ ...contactSettings, notify_line: e.target.checked })}
                    className="w-4 h-4 rounded text-[#006699]"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={contactLoading}
                    className="px-5 py-2.5 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {contactLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>บันทึกข้อมูลติดต่อ</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Live Preview Box */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>ตัวอย่างการแสดงผลบนหน้าจอแพทย์ (Live Preview)</span>
              </h4>

              {/* Simulation of Emergency banner */}
              <div className="bg-white rounded-2xl border border-rose-200 p-4 shadow-sm space-y-3">
                <div className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">
                  กล่องแจ้งเตือนติดต่อกรณีฉุกเฉิน / โควตาเต็ม
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-2">
                  <p className="text-[11px] text-rose-800 leading-snug">
                    กรณีมีเหตุจำเป็นเร่งด่วน กรุณาติดต่อ {contactSettings.coordinator_name || 'คุณธัญญธร ตันติกุล (พี่กุ้ง)'} โดยตรง:
                  </p>
                  <div className="py-2 px-3 bg-rose-600 text-white rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-xs">
                    <Phone className="w-3.5 h-3.5" />
                    <span>โทรติดต่อ {contactSettings.coordinator_name || 'พี่กุ้ง'} ({contactSettings.phone_hotline || '089-470-9256'})</span>
                  </div>
                </div>
              </div>

              {/* Contact Card Preview */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1.5 text-xs">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  ข้อมูลผู้ประสานงานในระบบ
                </div>
                <div className="font-bold text-slate-800 text-sm">
                  {contactSettings.coordinator_name || 'คุณธัญญธร ตันติกุล (พี่กุ้ง)'}
                </div>
                <div className="text-slate-700 text-xs font-mono font-bold flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#006699]" />
                  <span>{contactSettings.phone_hotline || '089-470-9256'}</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: ADD/EDIT APPROVAL ROUTE (UNIFIED STEP 1 & 2)     */}
      {/* ========================================================= */}
      {routeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-[#006699]" />
                <h2 className="text-sm font-bold text-slate-800">
                  {isEditingDoctorRoute ? 'แก้ไขสายการอนุมัติรายบุคคล' : 'ตั้งค่าสายการอนุมัติรายบุคคล'}
                </h2>
              </div>
              <button onClick={() => setRouteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRoute} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">แพทย์ผู้ขอลา</label>
                <select
                  value={routeDoctorId}
                  onChange={(e) => handleSelectDoctorForRoute(e.target.value)}
                  disabled={isEditingDoctorRoute}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white disabled:bg-slate-100 focus:ring-2 focus:ring-[#006699]"
                  required
                >
                  {doctors
                    .filter(d => d.employee_id !== 'EMP-KOONG' && d.employee_id !== 'EXEC-PARIWAT')
                    .map(d => (
                      <option key={d.id} value={d.id}>
                        {d.prefix_th}{d.first_name_th} {d.last_name_th} ({d.employee_id})
                      </option>
                    ))}
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                <label className="block font-bold text-emerald-900">
                  1. ผู้อนุมัติขั้นที่ 1 (หัวหน้าแผนก / ผู้อนุมัติต้นสังกัด) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={routeStep1ApproverId}
                  onChange={(e) => setRouteStep1ApproverId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-emerald-300 bg-white focus:ring-2 focus:ring-emerald-600"
                  required
                >
                  <option value="">-- เลือกผู้อนุมัติขั้นที่ 1 --</option>
                  {doctors
                    .filter(d => d.id !== routeDoctorId && d.employee_id !== 'EMP-KOONG')
                    .map(d => (
                      <option key={d.id} value={d.id}>
                        {d.prefix_th}{d.first_name_th} {d.last_name_th} ({d.employee_id})
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-emerald-800/80">
                  กรณีหัวหน้าแผนกเป็นผู้ลาเอง ให้เลือกผู้บริหาร (เช่น นพ.ปริวรรธน์) เป็นขั้นที่ 1 และเว้นขั้นที่ 2 ไว้
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200 space-y-2">
                <label className="block font-bold text-purple-900">
                  2. ผู้อนุมัติขั้นที่ 2 (ผู้บริหาร / ผช.ผอ. อนุมัติขั้นสุดท้าย)
                </label>
                <select
                  value={routeStep2ApproverId}
                  onChange={(e) => setRouteStep2ApproverId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-purple-300 bg-white focus:ring-2 focus:ring-purple-600"
                >
                  <option value="">-- ไม่ใช้ขั้นที่ 2 (อนุมัติจบใน 1 ขั้นตอน) --</option>
                  {doctors
                    .filter(d => d.id !== routeDoctorId && d.id !== routeStep1ApproverId && d.employee_id !== 'EMP-KOONG')
                    .map(d => (
                      <option key={d.id} value={d.id}>
                        {d.prefix_th}{d.first_name_th} {d.last_name_th} ({d.employee_id})
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRouteModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-bold shadow-xs"
                >
                  บันทึกสายอนุมัติ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ADD/EDIT LEAVE TYPE                              */}
      {/* ========================================================= */}
      {typeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">
                {selectedType ? 'แก้ไขประเภทการลา' : 'เพิ่มประเภทการลาใหม่'}
              </h2>
              <button onClick={() => setTypeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveType} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    รหัส (CODE) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={typeForm.code}
                    onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                    disabled={Boolean(selectedType)}
                    placeholder="เช่น VACATION, SICK"
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">สีประจำประเภท</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={typeForm.color}
                      onChange={(e) => setTypeForm({ ...typeForm, color: e.target.value })}
                      className="w-9 h-8 p-0.5 rounded border border-slate-300 cursor-pointer"
                    />
                    <span className="font-mono text-slate-500 text-[11px]">{typeForm.color}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ชื่อภาษาไทย <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={typeForm.name_th}
                    onChange={(e) => setTypeForm({ ...typeForm, name_th: e.target.value })}
                    placeholder="เช่น ลาพักผ่อน, ลาป่วย"
                    className="w-full p-2 rounded-lg border border-slate-300"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อภาษาอังกฤษ</label>
                  <input
                    type="text"
                    value={typeForm.name_en}
                    onChange={(e) => setTypeForm({ ...typeForm, name_en: e.target.value })}
                    placeholder="e.g. Annual Leave"
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">วิธีการนับจำนวนวัน</label>
                  <select
                    value={typeForm.count_mode}
                    onChange={(e) => setTypeForm({ ...typeForm, count_mode: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="CALENDAR_DAYS">ทุกวันตามปฏิทิน (CALENDAR_DAYS - แพทย์ไม่มีวันหยุดเสาร์-อาทิตย์)</option>
                    <option value="WORKING_DAYS">วันทำการ (WORKING_DAYS)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">แจ้งล่วงหน้าอย่างน้อย (วัน)</label>
                  <input
                    type="number"
                    min="0"
                    value={typeForm.min_notice_days}
                    onChange={(e) => setTypeForm({ ...typeForm, min_notice_days: parseInt(e.target.value, 10) || 0 })}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={typeForm.allows_half_day}
                    onChange={(e) => setTypeForm({ ...typeForm, allows_half_day: e.target.checked })}
                    className="w-4 h-4 rounded text-[#006699]"
                  />
                  <span className="font-semibold text-slate-700">อนุญาตให้ลาครึ่งวันได้ (0.5 วัน)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={typeForm.allows_backdate}
                    onChange={(e) => setTypeForm({ ...typeForm, allows_backdate: e.target.checked })}
                    className="w-4 h-4 rounded text-[#006699]"
                  />
                  <span className="font-semibold text-slate-700">อนุญาตให้ยื่นลาย้อนหลังได้</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={typeForm.requires_attachment}
                    onChange={(e) => setTypeForm({ ...typeForm, requires_attachment: e.target.checked })}
                    className="w-4 h-4 rounded text-[#006699]"
                  />
                  <span className="font-semibold text-slate-700">บังคับแนบเอกสาร (ใบรับรองแพทย์ / หนังสือเชิญ)</span>
                </label>

                {typeForm.requires_attachment && (
                  <div className="pl-6 grid grid-cols-2 gap-3 pt-1 animate-in fade-in">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        บังคับแนบเมื่อลาเกิน (วัน)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={typeForm.attachment_threshold_days}
                        onChange={(e) => setTypeForm({ ...typeForm, attachment_threshold_days: parseFloat(e.target.value) || 0 })}
                        placeholder="เช่น 2 (0 = บังคับทุกกรณี)"
                        className="w-full p-2 rounded-lg border border-slate-300"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        {typeForm.attachment_threshold_days > 0 
                          ? `* ลาไม่เกิน ${typeForm.attachment_threshold_days} วัน ไม่บังคับแนบ` 
                          : '* บังคับแนบทุกกรณี (ตั้งแต่ 0.5 วัน)'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        แนบตามหลังได้ภายใน (วัน)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={typeForm.attachment_deadline_days ?? 3}
                        onChange={(e) => setTypeForm({ ...typeForm, attachment_deadline_days: parseInt(e.target.value, 10) || 3 })}
                        placeholder="เช่น 3, 7, 14"
                        className="w-full p-2 rounded-lg border border-slate-300 font-bold text-[#006699]"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        * กำหนดวันเตือน LINE Reminder
                      </p>
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={typeForm.is_full_time_only}
                    onChange={(e) => setTypeForm({ ...typeForm, is_full_time_only: e.target.checked })}
                    className="w-4 h-4 rounded text-[#006699]"
                  />
                  <span className="font-semibold text-slate-700">สงวนสิทธิ์เฉพาะแพทย์ประจำ (Full-Time Only)</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTypeModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#006699] text-white font-bold"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: MANAGE DOCTOR LEAVE QUOTAS                       */}
      {/* ========================================================= */}
      {quotaModalOpen && selectedDoctorForQuota && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#006699]" />
                  <span>จัดการโควตาสิทธิ์วันลาประจำปี ({currentFiscalYear})</span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  แพทย์: <strong className="text-slate-700">{selectedDoctorForQuota.prefix_th}{selectedDoctorForQuota.first_name_th} {selectedDoctorForQuota.last_name_th}</strong> 
                  <span className="font-mono text-slate-400 ml-1">({selectedDoctorForQuota.employee_id} • {selectedDoctorForQuota.doctor_type === 'FULL_TIME' ? 'แพทย์ประจำ' : 'พาร์ทไทม์'})</span>
                </p>
              </div>
              <button 
                onClick={() => setQuotaModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="bg-sky-50/60 px-5 py-2.5 border-b border-sky-100 flex items-center justify-between text-xs flex-wrap gap-2">
              <span className="text-sky-900 font-medium text-[11px]">
                💡 ช่องว่าง = ไม่กำหนดโควตา (จะแสดงเป็น "ตามเกณฑ์ รพ." หรือ "ไม่จำกัดสิทธิ์")
              </span>
              <button
                type="button"
                onClick={handleApplyPreset}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-sky-50 text-[#006699] border border-sky-200 rounded-lg font-bold text-[11px] shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>ใส่ค่ามาตรฐาน (พักร้อน 20, ป่วย 30, อุปสมบท 120, คลอดบุตร 90)</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveQuota} className="p-5 space-y-4">
              <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">ประเภทการลา</th>
                      <th className="py-2.5 px-3 text-center w-28">โควตาประจำปี (วัน)</th>
                      <th className="py-2.5 px-3 text-center w-24">ยกยอดมา (วัน)</th>
                      <th className="py-2.5 px-3 text-center">ใช้ไปแล้ว</th>
                      <th className="py-2.5 px-3 text-right">คงเหลือสุทธิ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {doctorQuotaList.map((item, idx) => {
                      const ent = item.entitlement_days === '' ? null : Number(item.entitlement_days);
                      const carry = Number(item.carried_over_days) || 0;
                      const used = Number(item.used_days) || 0;
                      const pending = Number(item.pending_days) || 0;
                      const hasQ = ent !== null && !isNaN(ent);
                      const remaining = hasQ ? Math.max(0, ent + carry - used - pending) : null;

                      return (
                        <tr key={item.leave_type_id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="font-bold text-slate-800">{item.leave_type_name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({item.leave_type_code})</span>
                            </div>
                          </td>

                          {/* Entitlement Days */}
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              placeholder="ไม่กำหนด"
                              value={item.entitlement_days}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDoctorQuotaList(prev => prev.map((q, i) => i === idx ? { ...q, entitlement_days: val } : q));
                              }}
                              className="w-24 text-center py-1 px-2 rounded-lg border border-slate-200 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#006699]"
                            />
                          </td>

                          {/* Carried Over Days */}
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={item.carried_over_days}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDoctorQuotaList(prev => prev.map((q, i) => i === idx ? { ...q, carried_over_days: val } : q));
                              }}
                              disabled={!hasQ}
                              className="w-20 text-center py-1 px-2 rounded-lg border border-slate-200 text-slate-700 disabled:opacity-40 disabled:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-[#006699]"
                            />
                          </td>

                          {/* Used Days */}
                          <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                            {used} {pending > 0 && <span className="text-amber-600 font-sans text-[10px]">(รอ {pending})</span>}
                          </td>

                          {/* Remaining */}
                          <td className="py-2.5 px-3 text-right">
                            {hasQ ? (
                              <span className="font-extrabold text-[#006699] text-xs">
                                เหลือ {remaining} วัน
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">
                                {item.leave_type_code === 'UNPAID' ? 'ไม่จำกัดสิทธิ์' : 'ตามเกณฑ์ รพ.'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  ระบบจะอัปเดตสิทธิ์ให้แพทย์ทันทีแบบ Real-time
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setQuotaModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={savingQuota}
                    className="px-5 py-2 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {savingQuota ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>บันทึกโควตา</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: ADD / EDIT DEPARTMENT                            */}
      {/* ========================================================= */}
      {deptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#006699]" />
                <h2 className="text-sm font-bold text-slate-800">
                  {editingDept ? 'แก้ไขข้อมูลแผนก & สายอนุมัติ' : 'เพิ่มแผนกใหม่'}
                </h2>
              </div>
              <button onClick={() => setDeptModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    รหัสแผนก <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                    placeholder="เช่น MED, PED"
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono uppercase"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    ชื่อแผนก (ภาษาไทย) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={deptForm.name_th}
                    onChange={(e) => setDeptForm({ ...deptForm, name_th: e.target.value })}
                    placeholder="เช่น อายุรกรรม, ศัลยกรรมกระดูกและข้อ"
                    className="w-full p-2 rounded-lg border border-slate-300"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ชื่อภาษาอังกฤษ (Optional)</label>
                <input
                  type="text"
                  value={deptForm.name_en}
                  onChange={(e) => setDeptForm({ ...deptForm, name_en: e.target.value })}
                  placeholder="e.g. Internal Medicine"
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">แพทย์ขั้นต่ำที่ต้องเหลือ (ท่าน)</label>
                  <input
                    type="number"
                    min="0"
                    value={deptForm.min_staff_required}
                    onChange={(e) => setDeptForm({ ...deptForm, min_staff_required: parseInt(e.target.value, 10) || 0 })}
                    className="w-full p-2 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ลาพร้อมกันสูงสุด/วัน (ท่าน)</label>
                  <input
                    type="number"
                    min="1"
                    value={deptForm.max_leave_per_day}
                    onChange={(e) => setDeptForm({ ...deptForm, max_leave_per_day: parseInt(e.target.value, 10) || 1 })}
                    className="w-full p-2 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                <label className="block font-bold text-emerald-900">
                  ขั้นที่ 1: หัวหน้าแผนก (ผู้อนุมัติต้นสังกัด)
                </label>
                <select
                  value={deptForm.head_doctor_id}
                  onChange={(e) => setDeptForm({ ...deptForm, head_doctor_id: e.target.value })}
                  className="w-full p-2 rounded-lg border border-emerald-300 bg-white font-semibold"
                >
                  <option value="">-- ยังไม่ระบุหัวหน้าแผนก --</option>
                  {doctors
                    .filter(d => d.employee_id !== 'EMP-KOONG')
                    .map(d => (
                      <option key={d.id} value={d.id}>
                        {d.prefix_th}{d.first_name_th} {d.last_name_th}
                      </option>
                    ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200 space-y-2">
                <label className="block font-bold text-purple-900">
                  ขั้นที่ 2: ผู้อนุมัติสูงสุด (ผช.ผอ.)
                </label>
                <select
                  value={deptForm.final_approver_id}
                  onChange={(e) => setDeptForm({ ...deptForm, final_approver_id: e.target.value })}
                  className="w-full p-2 rounded-lg border border-purple-300 bg-white font-semibold"
                >
                  {doctors
                    .filter(d => d.employee_id !== 'EMP-KOONG')
                    .map(d => (
                      <option key={d.id} value={d.id}>
                        {d.prefix_th}{d.first_name_th} {d.last_name_th}
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeptModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-bold shadow-xs"
                >
                  บันทึกแผนก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: ADD / EDIT SINGLE DOCTOR                         */}
      {/* ========================================================= */}
      {doctorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 my-8">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#006699]" />
                <h2 className="text-sm font-bold text-slate-800">
                  {editingDoctor ? 'แก้ไขข้อมูลแพทย์' : 'เพิ่มรายชื่อแพทย์ใหม่ (รายคน)'}
                </h2>
              </div>
              <button onClick={() => setDoctorModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDoctor} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">คำนำหน้า</label>
                  <select
                    value={doctorForm.prefix_th}
                    onChange={(e) => setDoctorForm({ ...doctorForm, prefix_th: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    <option value="นพ.">นพ.</option>
                    <option value="พญ.">พญ.</option>
                    <option value="ทพ.">ทพ.</option>
                    <option value="ทพญ.">ทพญ.</option>
                  </select>
                </div>
                <div className="sm:col-span-1">
                  <label className="block font-bold text-slate-700 mb-1">
                    ชื่อจริง <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={doctorForm.first_name_th}
                    onChange={(e) => setDoctorForm({ ...doctorForm, first_name_th: e.target.value })}
                    placeholder="เช่น ชาติชาย"
                    className="w-full p-2 rounded-lg border border-slate-300"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    นามสกุล <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={doctorForm.last_name_th}
                    onChange={(e) => setDoctorForm({ ...doctorForm, last_name_th: e.target.value })}
                    placeholder="เช่น วิสัยทัศน์"
                    className="w-full p-2 rounded-lg border border-slate-300"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">รหัสพนักงาน (Employee ID)</label>
                  <input
                    type="text"
                    value={doctorForm.employee_id}
                    onChange={(e) => setDoctorForm({ ...doctorForm, employee_id: e.target.value })}
                    placeholder="เว้นว่างเพื่อสร้างอัตโนมัติ (เช่น DOC-025)"
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">เลขใบประกอบวิชาชีพ (เลข ว.)</label>
                  <input
                    type="text"
                    value={doctorForm.license_no}
                    onChange={(e) => setDoctorForm({ ...doctorForm, license_no: e.target.value })}
                    placeholder="เช่น ว. 48921 หรือ ท. 9821"
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    แผนกที่สังกัด <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={doctorForm.department_id}
                    onChange={(e) => setDoctorForm({ ...doctorForm, department_id: e.target.value, specialty_group: '' })}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-semibold"
                    required
                  >
                    <option value="">-- เลือกแผนก --</option>
                    {departments
                      .filter(d => d.code !== 'EXEC')
                      .map(d => (
                        <option key={d.id} value={d.id}>
                          แผนก{d.name_th} ({d.code})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">สาขาเฉพาะทาง (ถ้าแผนกแยกสาขา)</label>
                  {(() => {
                    const selDept = departments.find(d => d.id === doctorForm.department_id);
                    const groups = selDept?.staffing_groups || [];
                    return (
                      <select
                        value={doctorForm.specialty_group}
                        onChange={(e) => setDoctorForm({ ...doctorForm, specialty_group: e.target.value })}
                        disabled={groups.length === 0}
                        className="w-full p-2 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100"
                      >
                        <option value="">{groups.length > 0 ? '-- เลือกสาขาเฉพาะทาง --' : 'ไม่แยกสาขา'}</option>
                        {groups.map(g => (
                          <option key={g.id || g.code} value={g.id || g.code}>
                            {g.name_th} (ขั้นต่ำ {g.min_staff_required ?? g.min_staff ?? 1} ท่าน)
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ประเภทแพทย์</label>
                  <select
                    value={doctorForm.doctor_type}
                    onChange={(e) => setDoctorForm({ ...doctorForm, doctor_type: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="FULL_TIME">แพทย์ประจำ (Full-Time)</option>
                    <option value="PART_TIME">แพทย์ Part-Time</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">บทบาทในระบบ</label>
                  <select
                    value={doctorForm.role}
                    onChange={(e) => setDoctorForm({ ...doctorForm, role: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    <option value="DOCTOR">แพทย์ในแผนก (ทั่วไป)</option>
                    <option value="DEPT_HEAD">หัวหน้าแผนก (ผู้อนุมัติขั้นที่ 1)</option>
                  </select>
                </div>
              </div>

              <label className={`flex items-start gap-2.5 p-3 rounded-xl border transition-colors ${
                editingDoctor?.employee_id === 'EMP-KOONG'
                  ? 'bg-amber-50/70 border-amber-200 cursor-not-allowed opacity-85'
                  : doctorForm.is_admin
                    ? 'bg-amber-50 border-amber-300 cursor-pointer'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70 cursor-pointer'
              }`}>
                <input
                  type="checkbox"
                  checked={Boolean(doctorForm.is_admin)}
                  disabled={editingDoctor?.employee_id === 'EMP-KOONG'}
                  onChange={(e) => setDoctorForm({ ...doctorForm, is_admin: e.target.checked })}
                  className="mt-0.5 w-4 h-4 accent-amber-600 rounded"
                />
                <div className="flex-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>🛡️ สิทธิ์แอดมินฝ่ายการแพทย์ (Medical Admin)</span>
                    {editingDoctor?.employee_id === 'EMP-KOONG' && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-200/70 text-amber-900">
                        แอดมินหลัก (ล็อก)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    สามารถเข้าเมนูฝ่ายการแพทย์, จัดการตารางเวร, แก้ไขรายชื่อ/สายอนุมัติ, ตั้งค่าเกณฑ์ และดู Audit Log ได้ทั้งหมด
                  </p>
                </div>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">วันที่เริ่มงาน (Hire Date)</label>
                  <input
                    type="date"
                    value={doctorForm.hire_date}
                    onChange={(e) => setDoctorForm({ ...doctorForm, hire_date: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    value={doctorForm.phone}
                    onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                    placeholder="เช่น 081-234-5678"
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100 text-[11px] text-sky-900">
                💡 เมื่อบันทึกแล้ว ระบบจะผูก <b>สายการอนุมัติตามแผนก</b> และสร้าง <b>โควตาวันลาประจำปีมาตรฐาน</b> ให้แพทย์ท่านนี้อัตโนมัติทันที
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDoctorModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-bold shadow-xs"
                >
                  {editingDoctor ? 'บันทึกการแก้ไข' : 'เพิ่มรายชื่อแพทย์'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 7: BULK IMPORT DOCTORS FROM EXCEL / CSV             */}
      {/* ========================================================= */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 my-8">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-800">
                    นำเข้ารายชื่อแพทย์หลายคนจากไฟล์ Excel / CSV
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    อัปโหลดไฟล์ .CSV หรือก๊อปปี้ตารางจาก Excel มาวางได้ทันที ระบบจะผูกแผนก สายอนุมัติ และโควตาให้อัตโนมัติ
                  </p>
                </div>
              </div>
              <button onClick={() => setBulkModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Step 1: Download Template or Upload File */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-bold text-emerald-900">
                    คอลัมน์ที่รองรับ (เรียงตามลำดับ):
                  </div>
                  <div className="text-[11px] text-emerald-800 font-mono">
                    คำนำหน้า | ชื่อ | นามสกุล | รหัสพนักงาน | เลข ว. | แผนก | สาขาเฉพาะทาง | ประเภท(FT/PT) | เบอร์โทร | วันที่เริ่มงาน
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadTemplateCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-[11px] shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลดไฟล์ตัวอย่าง (.CSV)</span>
                  </button>
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>เลือกไฟล์ CSV / TXT</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleBulkFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Paste from Excel Area */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  หรือคัดลอกข้อมูลจาก Excel (Ctrl+C) แล้ววาง (Ctrl+V) ในช่องนี้:
                </label>
                <textarea
                  rows={4}
                  value={bulkRawText}
                  onChange={(e) => {
                    setBulkRawText(e.target.value);
                    parseBulkText(e.target.value);
                  }}
                  placeholder={`นพ.,สมชาย,ใจดี,DOC-101,ว. 55112,อายุรกรรม,อายุรกรรมโรคไต,FT,081-111-2222,2024-01-15\nพญ.,สมหญิง,รักงาน,DOC-102,ว. 66223,กุมาร,,FT,089-333-4444,2025-03-01`}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-[11px] focus:ring-2 focus:ring-[#006699]"
                />
              </div>

              {/* Preview Table */}
              {bulkPreviewRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      ตัวอย่างข้อมูลที่จะนำเข้า ({bulkPreviewRows.length} รายการ):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setBulkRawText('');
                        setBulkPreviewRows([]);
                      }}
                      className="text-[11px] text-rose-600 hover:underline font-semibold"
                    >
                      ล้างข้อมูล
                    </button>
                  </div>
                  <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 text-slate-600 font-bold">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">ชื่อ-นามสกุล</th>
                          <th className="py-2 px-3">รหัส</th>
                          <th className="py-2 px-3">เลข ว.</th>
                          <th className="py-2 px-3">แผนก / สาขา</th>
                          <th className="py-2 px-3">ประเภท</th>
                          <th className="py-2 px-3">เบอร์โทร</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bulkPreviewRows.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 text-slate-400 font-mono">{i + 1}</td>
                            <td className="py-1.5 px-3 font-bold text-slate-800">
                              {r.prefix_th}{r.first_name_th} {r.last_name_th}
                            </td>
                            <td className="py-1.5 px-3 font-mono text-slate-600">{r.employee_id || '(อัตโนมัติ)'}</td>
                            <td className="py-1.5 px-3 font-mono text-emerald-700">{r.license_no || '-'}</td>
                            <td className="py-1.5 px-3 text-slate-700">
                              {r.department || r.department_name || 'อายุรกรรม'}
                              {r.specialty_group ? ` (${r.specialty_group})` : ''}
                            </td>
                            <td className="py-1.5 px-3">{r.doctor_type === 'PART_TIME' ? 'PT' : 'FT'}</td>
                            <td className="py-1.5 px-3 font-mono">{r.phone || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkImport}
                  disabled={bulkPreviewRows.length === 0 || importingBulk}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {importingBulk ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังนำเข้า...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>ยืนยันนำเข้าแพทย์ ({bulkPreviewRows.length} ท่าน)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
