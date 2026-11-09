import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  Clock,
  AlertTriangle,
  Phone,
  Paperclip,
  CheckCircle,
  Check,
  Info,
  Send,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  FileText,
  CalendarDays,
  CalendarCheck,
  ArrowRight,
  Sun,
  Sunrise,
  Sunset,
  Sparkles,
  CalendarRange,
  Activity
} from 'lucide-react';

// Get local today date string (YYYY-MM-DD) avoiding UTC boundary issues
function getLocalTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

// Thai Date Formatter with Day of Week
function formatThaiDate(dateStr, includeDayOfWeek = true) {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return dateStr;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  if (isNaN(d.getTime())) return dateStr;

  const daysOfWeek = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const monthsTh = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];

  const dow = daysOfWeek[d.getDay()];
  const day = d.getDate();
  const month = monthsTh[d.getMonth()];
  const year = d.getFullYear() + 543;

  if (includeDayOfWeek) {
    return `วัน${dow}ที่ ${day} ${month} ${year}`;
  }
  return `${day} ${month} ${year}`;
}

// Short Thai Date Formatter for Flight Cards
function formatThaiDateShort(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return dateStr;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  if (isNaN(d.getTime())) return dateStr;

  const daysShort = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const monthsTh = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  return `${daysShort[d.getDay()]} ${d.getDate()} ${monthsTh[d.getMonth()]}`;
}

// Helper to add days to a date string (YYYY-MM-DD)
function addDaysToDate(dateStr, daysToAdd) {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + daysToAdd);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Helper to get next day (returning to duty at hospital - doctors work every day, no weekend off)
function getNextWorkingDay(endDateStr) {
  if (!endDateStr) return '';
  const parts = endDateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Helper for Real-Time Duration Calculation & Transparency Breakdown (สำหรับแพทย์ นับตามปฏิทินทุกวัน ไม่มีวันหยุดเสาร์-อาทิตย์)
function getLeaveBreakdown(startDate, endDate, halfDayType) {
  if (!startDate) {
    return { totalCalendarDays: 0, weekendDays: 0, holidaysCount: 0, weekendShiftsCount: 0, netDays: 0, isAllHolidays: false };
  }
  if (halfDayType === 'MORNING' || halfDayType === 'AFTERNOON') {
    return { totalCalendarDays: 1, weekendDays: 0, holidaysCount: 0, weekendShiftsCount: 0, netDays: 0.5, isAllHolidays: false };
  }

  const end = endDate || startDate;
  const sParts = startDate.split('-').map(Number);
  const eParts = end.split('-').map(Number);
  const startD = new Date(sParts[0], sParts[1] - 1, sParts[2]);
  const endD = new Date(eParts[0], eParts[1] - 1, eParts[2]);

  if (startD > endD) {
    return { totalCalendarDays: 1, weekendDays: 0, holidaysCount: 0, weekendShiftsCount: 0, netDays: 1, isAllHolidays: false };
  }

  // แพทย์ไม่มีวันหยุดเสาร์-อาทิตย์ คำนวณวันลาตามปฏิทินจริงทุกวัน
  const diffTime = Math.abs(endD - startD);
  const days = Math.round(diffTime / 86400000) + 1;

  return {
    totalCalendarDays: days,
    weekendDays: 0,
    holidaysCount: 0,
    weekendShiftsCount: 0,
    netDays: days,
    isAllHolidays: false
  };
}

export default function DoctorLiffPage() {
  const { currentDoctor, doctors, refreshDoctors } = useAuth();

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [contactSettings, setContactSettings] = useState({
    department_name: 'ฝ่ายการแพทย์ / HR (Medical Affairs)',
    coordinator_name: 'คุณธัญญธร ตันติกุล (พี่กุ้ง)',
    phone_emergency: '076-361-888',
    phone_ext: '1234',
    phone_hotline: '089-470-9256'
  });

  useEffect(() => {
    fetch('/api/settings/contact')
      .then(res => res.json())
      .then(data => {
        if (data && data.phone_emergency) setContactSettings(data);
      })
      .catch(() => { });
  }, []);

  // Form State
  const todayStr = getLocalTodayString();
  const maxSwapDateStr = (() => {
    const now = new Date();
    const lastDayNext = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    return `${lastDayNext.getFullYear()}-${String(lastDayNext.getMonth() + 1).padStart(2, '0')}-${String(lastDayNext.getDate()).padStart(2, '0')}`;
  })();
  const [leaveMode, setLeaveMode] = useState('SINGLE'); // 'SINGLE' (วันเดียว) | 'RANGE' (หลายวัน - Flight Style)
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [halfDayType, setHalfDayType] = useState('FULL_DAY');
  const [reason, setReason] = useState('');
  const [uploadLater, setUploadLater] = useState(false);
  const [files, setFiles] = useState([]);
  const [reimbursementRequested, setReimbursementRequested] = useState(false);
  const [swapDate, setSwapDate] = useState('');
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0); // 0 = เดือนนี้, 1 = เดือนหน้า
  const [calendarSelectTarget, setCalendarSelectTarget] = useState('SWAP_DATE'); // 'OFF_DATE' | 'SWAP_DATE'

  // Shift Conflict & Duty Handover State (Feature #26)
  const [shiftConflict, setShiftConflict] = useState(null);
  const [substituteDoctorId, setSubstituteDoctorId] = useState('');
  const [dutyHandoverNotes, setDutyHandoverNotes] = useState('');

  // Quota Status & Duration Preview
  const [quotaInfo, setQuotaInfo] = useState(null);
  const [swapQuotaInfo, setSwapQuotaInfo] = useState(null);
  const [durationPreview, setDurationPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Is Emergency (Same-Day)
  const isEmergency = startDate === todayStr;

  // Fetch Leave Types
  useEffect(() => {
    if (!currentDoctor) return;
    const fetchTypes = async () => {
      try {
        const res = await fetch(`/api/leave-types?doctorType=${currentDoctor.doctor_type}`);
        if (res.ok) {
          const data = await res.json();
          setLeaveTypes(data);
          if (data.length > 0 && !selectedType) {
            setSelectedType(data[0]);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchTypes();
  }, [currentDoctor]);

  // Reset attachment state and adjust default start date when leave type changes
  useEffect(() => {
    setUploadLater(false);
    setFiles([]);
    setErrorMessage('');
    if (selectedType) {
      if (!selectedType.allows_half_day && halfDayType !== 'FULL_DAY') {
        setHalfDayType('FULL_DAY');
      }
      if (selectedType.code === 'SHIFT_SWAP') {
        setLeaveMode('SINGLE');
        const nextDay = addDaysToDate(startDate, 1);
        if (!swapDate || swapDate === startDate) {
          setSwapDate(nextDay);
        }
      }
      if (selectedType.min_notice_days > 0) {
        const minValidDate = addDaysToDate(todayStr, selectedType.min_notice_days);
        if (startDate < minValidDate) {
          setStartDate(minValidDate);
          setEndDate(leaveMode === 'RANGE' ? addDaysToDate(minValidDate, 1) : minValidDate);
        }
      } else if (!selectedType.allows_backdate && startDate < todayStr) {
        setStartDate(todayStr);
        setEndDate(todayStr);
      }
    }
  }, [selectedType]);

  // Fetch Balances for current doctor
  const fetchBalances = async () => {
    if (!currentDoctor) return;
    try {
      const res = await fetch(`/api/balances/${currentDoctor.id}`);
      if (res.ok) {
        const data = await res.json();
        setBalances(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [currentDoctor]);

  // Check Department Quota when date or dept changes
  useEffect(() => {
    if (!currentDoctor || !startDate) return;
    const checkQuota = async () => {
      try {
        const res = await fetch(`/api/quota-check?departmentId=${currentDoctor.department_id}&date=${startDate}&doctorId=${currentDoctor.id}`);
        if (res.ok) {
          const data = await res.json();
          setQuotaInfo(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    checkQuota();
  }, [currentDoctor, startDate]);

  // Check Department Availability on Swap Date (for SHIFT_SWAP)
  useEffect(() => {
    if (!currentDoctor || !swapDate) {
      setSwapQuotaInfo(null);
      return;
    }
    const checkSwapQuota = async () => {
      try {
        const res = await fetch(`/api/quota-check?departmentId=${currentDoctor.department_id}&date=${swapDate}&doctorId=${currentDoctor.id}`);
        if (res.ok) {
          const data = await res.json();
          setSwapQuotaInfo(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    checkSwapQuota();
  }, [currentDoctor, swapDate]);

  // Live Calculate Duration (with Working Days & Holidays check)
  useEffect(() => {
    if (!startDate || !selectedType) return;
    const finalEnd = leaveMode === 'SINGLE' || halfDayType !== 'FULL_DAY' ? startDate : (endDate || startDate);
    const effectiveHalfDay = leaveMode === 'SINGLE' ? halfDayType : 'FULL_DAY';

    const calc = async () => {
      try {
        const res = await fetch('/api/calculate-duration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_date: startDate,
            end_date: finalEnd,
            half_day_type: effectiveHalfDay,
            leave_type_id: selectedType.id,
            doctor_id: currentDoctor.id
          })
        });
        if (res.ok) {
          const data = await res.json();
          setDurationPreview(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    calc();
  }, [startDate, endDate, halfDayType, selectedType, leaveMode, currentDoctor]);

  // Live Shift Conflict Check (Feature #26)
  useEffect(() => {
    if (!currentDoctor || !startDate) return;
    const finalEnd = leaveMode === 'SINGLE' || halfDayType !== 'FULL_DAY' ? startDate : (endDate || startDate);
    const effectiveHalfDay = leaveMode === 'SINGLE' ? halfDayType : 'FULL_DAY';

    const checkShifts = async () => {
      try {
        const res = await fetch(`/api/shifts/check-conflict?doctor_id=${currentDoctor.id}&start_date=${startDate}&end_date=${finalEnd}&half_day_type=${effectiveHalfDay}`);
        if (res.ok) {
          const data = await res.json();
          setShiftConflict(data);
        }
      } catch (err) {
        console.error('Shift conflict check error:', err);
      }
    };
    checkShifts();
  }, [currentDoctor, startDate, endDate, halfDayType, leaveMode]);

  // Department Colleagues for Handover
  const departmentColleagues = (doctors || []).filter(
    d => d.id !== currentDoctor?.id && d.department_id === currentDoctor?.department_id && d.is_active
  );

  // Real-time Duration & Leave Balance Calculations
  const countMode = selectedType?.count_mode || 'CALENDAR_DAYS';
  const currentFinalEnd = leaveMode === 'SINGLE' || halfDayType !== 'FULL_DAY' ? startDate : (endDate || startDate);
  const effectiveHalfDay = leaveMode === 'SINGLE' ? halfDayType : 'FULL_DAY';
  const breakdown = getLeaveBreakdown(startDate, currentFinalEnd, effectiveHalfDay);
  const activeDuration = durationPreview?.duration_days !== undefined ? Number(durationPreview.duration_days) : breakdown.netDays;
  const returnToWorkDate = getNextWorkingDay(currentFinalEnd);

  const selectedBalance = balances.find(b => b.leave_type_id === selectedType?.id);
  const nonDayQuotaCodes = ['TRAINING', 'PERSONAL', 'SHIFT_SWAP', 'UNPAID'];
  const isDayQuotaType = selectedType && (!nonDayQuotaCodes.includes(selectedType.code) || Number(selectedBalance?.total_quota || 0) > 0);
  const remainingDays = isDayQuotaType && selectedBalance !== undefined ? Number(selectedBalance.remaining_days) : null;

  const isTrainingLimitReached = Boolean(
    selectedType?.code === 'TRAINING' &&
    (selectedBalance?.request_count_this_year || 0) >= (selectedType?.max_requests_per_year || 1)
  );
  const isPersonalQuotaExhausted = (isDayQuotaType && selectedBalance !== undefined && remainingDays !== null && remainingDays <= 0) || isTrainingLimitReached;
  const isRequestedExceeded = isDayQuotaType && selectedBalance !== undefined && remainingDays !== null && activeDuration > remainingDays;
  const isMaxDaysPerRequestExceeded = Boolean(
    selectedType?.max_days_per_request && activeDuration > Number(selectedType.max_days_per_request)
  );
  const isBackdateNotAllowed = Boolean(selectedType && !selectedType.allows_backdate && startDate < todayStr);
  const diffNoticeCalendarDays = (() => {
    if (!startDate) return 0;
    const [tY, tM, tD] = todayStr.split('-').map(Number);
    const [sY, sM, sD] = startDate.split('-').map(Number);
    return Math.round((new Date(sY, sM - 1, sD) - new Date(tY, tM - 1, tD)) / 86400000);
  })();
  const isNoticeDaysInsufficient = Boolean(
    selectedType?.min_notice_days > 0 && diffNoticeCalendarDays < Number(selectedType.min_notice_days)
  );
  const isDeptQuotaFull = Boolean(quotaInfo && quotaInfo.status === 'FULL' && !isEmergency);
  const isBlockedByQuota = isPersonalQuotaExhausted || isRequestedExceeded || isMaxDaysPerRequestExceeded || isDeptQuotaFull;

  // Attachment Mandatory Check (Threshold Rule)
  const isAttachmentMandatory = Boolean(
    selectedType?.requires_attachment && (
      !selectedType.attachment_threshold_days || activeDuration > Number(selectedType.attachment_threshold_days)
    )
  );

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedType) {
      setErrorMessage('กรุณาเลือกประเภทการลา');
      return;
    }

    // Policy & Quota Checks
    if (activeDuration === 0) {
      setErrorMessage('ช่วงวันที่ท่านเลือกตรงกับวันหยุดทั้งหมด (ไม่มีวันทำการที่ต้องลา)');
      return;
    }
    if (isTrainingLimitReached) {
      setErrorMessage(`ไม่สามารถยื่นลาได้ เนื่องจากสิทธิ์${selectedType.name_th} ใช้ได้ปีละ 1 ครั้ง และท่านได้ใช้สิทธิ์ในปีนี้ไปแล้ว`);
      return;
    }
    if (isPersonalQuotaExhausted) {
      setErrorMessage(`ไม่สามารถยื่นลาได้ เนื่องจากสิทธิ์${selectedType.name_th}คงเหลือ 0 วัน (โควตาเต็ม)`);
      return;
    }
    if (isMaxDaysPerRequestExceeded) {
      setErrorMessage(`การ${selectedType.name_th} กำหนดให้ลาต่อเนื่องได้ไม่เกิน ${selectedType.max_days_per_request} วันต่อครั้ง (ท่านเลือก ${activeDuration} วัน)`);
      return;
    }
    if (isRequestedExceeded) {
      setErrorMessage(`สิทธิ์วันลาคงเหลือไม่เพียงพอ (ต้องการลา ${durationPreview?.duration_days || activeDuration} วัน แต่คงเหลือ ${remainingDays} วัน)`);
      return;
    }
    if (isBackdateNotAllowed) {
      setErrorMessage(`การ${selectedType.name_th}ต้องบันทึกก่อนลาเท่านั้น (ไม่อนุญาตให้บันทึกลาย้อนหลัง)`);
      return;
    }
    if (isNoticeDaysInsufficient) {
      setErrorMessage(`การ${selectedType.name_th}ต้องส่งวันลาล่วงหน้าอย่างน้อย ${selectedType.min_notice_days} วันก่อนวันเริ่มลา`);
      return;
    }
    if (isDeptQuotaFull) {
      const scope = quotaInfo?.scope_name || quotaInfo?.department_name || 'แผนก';
      if (quotaInfo?.is_below_min || (quotaInfo?.min_staff_required != null && quotaInfo?.remaining_doctors_count < quotaInfo?.min_staff_required)) {
        setErrorMessage(`ไม่สามารถยื่นลาได้ เนื่องจากแพทย์${scope}จะเหลือเพียง ${quotaInfo.remaining_doctors_count} ท่าน ซึ่งต่ำกว่าเกณฑ์ขั้นต่ำ (${quotaInfo.min_staff_required} ท่าน) กรุณาติดต่อฝ่ายการแพทย์ (พี่กุ้ง)`);
      } else {
        setErrorMessage(`โควตาการลาของ${scope}ในวันที่เลือกเต็มแล้ว (${quotaInfo.current_on_leave}/${quotaInfo.max_allowed} ท่าน) ไม่สามารถยื่นลาได้`);
      }
      return;
    }
    if (selectedType.code === 'SHIFT_SWAP' && !swapDate) {
      setErrorMessage('กรุณาระบุวันที่ต้องการสลับออกตรวจ');
      return;
    }
    if (selectedType.code === 'SHIFT_SWAP' && (startDate > maxSwapDateStr || swapDate > maxSwapDateStr)) {
      setErrorMessage('การลาสลับวันออกตรวจ สามารถลาล่วงหน้าได้เฉพาะเดือนนี้และเดือนหน้าเท่านั้น');
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('กรุณาระบุเหตุผลการลา');
      return;
    }
    if (shiftConflict?.requires_substitute && !substituteDoctorId) {
      setErrorMessage('คำขอนี้ชนกับเวรสำคัญ (ER / Night Duty) กรุณาระบุแพทย์ผู้ปฏิบัติหน้าที่แทน');
      return;
    }

    // Attachment Requirement Validation
    if (isAttachmentMandatory && (!files || files.length === 0) && !uploadLater) {
      if (selectedType.code === 'PERSONAL') {
        setErrorMessage('การลากิจ (ครอบครัวเสียชีวิต) ต้องแนบใบมรณบัตร หรือติ๊กเลือก "ส่งให้เจ้าหน้าที่หลังจบงาน"');
      } else if (selectedType.code === 'UNPAID') {
        setErrorMessage('การลาไม่รับค่าตอบแทน ต้องแนบจดหมายเรียนถึงผู้อำนวยการแจ้งถึงเหตุผล');
      } else if (selectedType.code === 'SICK') {
        setErrorMessage(`การลาป่วยตั้งแต่ 3 วันขึ้นไป (${activeDuration} วัน) ต้องแนบใบรับรองแพทย์ หรือติ๊กเลือก "สะดวกแนบเอกสารตามหลัง"`);
      } else {
        setErrorMessage(`การ${selectedType.name_th} (${activeDuration} วัน) จำเป็นต้องมีเอกสารประกอบตามระเบียบ กรุณาแนบไฟล์ หรือติ๊กเลือก 'สะดวกแนบเอกสารตามหลัง'`);
      }
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const finalEnd = leaveMode === 'SINGLE' || halfDayType !== 'FULL_DAY' ? startDate : endDate;
      const effectiveHalfDay = leaveMode === 'SINGLE' ? halfDayType : 'FULL_DAY';

      const formData = new FormData();
      formData.append('doctor_id', currentDoctor.id);
      formData.append('leave_type_id', selectedType.id);
      formData.append('start_date', startDate);
      formData.append('end_date', finalEnd);
      formData.append('half_day_type', effectiveHalfDay);
      formData.append('reason', reason);
      formData.append('upload_later', uploadLater ? 'true' : 'false');
      if (selectedType.code === 'TRAINING' || selectedType.has_reimbursement_option) {
        formData.append('reimbursement_requested', reimbursementRequested ? 'true' : 'false');
      }
      if (selectedType.code === 'SHIFT_SWAP' && swapDate) {
        formData.append('swap_date', swapDate);
      }
      if (substituteDoctorId) {
        formData.append('substitute_doctor_id', substituteDoctorId);
      }
      if (dutyHandoverNotes) {
        formData.append('duty_handover_notes', dutyHandoverNotes);
      }

      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type.startsWith('image/')) {
            try {
              const options = {
                maxSizeMB: 0.5, // บีบให้เหลือไม่เกิน 500KB
                maxWidthOrHeight: 1920,
                useWebWorker: true,
              };
              const compressedFile = await imageCompression(file, options);
              formData.append('attachments', compressedFile, file.name);
            } catch (error) {
              console.error('Image compression error:', error);
              formData.append('attachments', file); // หากเกิดข้อผิดพลาดให้ส่งไฟล์ต้นฉบับ
            }
          } else {
            // ไฟล์ที่ไม่ใช่รูปภาพ (เช่น PDF)
            formData.append('attachments', file);
          }
        }
      }

      const res = await fetch('/api/leave-requests', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการยื่นใบลา');
      }

      setSuccessResult(data);
      fetchBalances();
      refreshDoctors();
      setLeaveMode('SINGLE');
      const resetStart = selectedType?.min_notice_days > 0 ? addDaysToDate(todayStr, selectedType.min_notice_days) : todayStr;
      setStartDate(resetStart);
      setEndDate(resetStart);
      setHalfDayType('FULL_DAY');
      setReason('');
      setFiles([]);
      setUploadLater(false);
      setReimbursementRequested(false);
      setSwapDate('');
      setSubstituteDoctorId('');
      setDutyHandoverNotes('');
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentDoctor) {
    return (
      <div className="p-8 text-center text-slate-500">
        กำลังโหลดข้อมูลแพทย์...
      </div>
    );
  }

  const isHrOnly =
    currentDoctor.employee_id === 'EMP-KOONG' ||
    (!(currentDoctor.roles || []).includes('DOCTOR') && !(currentDoctor.roles || []).includes('DEPT_HEAD'));

  if (isHrOnly) {
    return (
      <div className="min-h-[80vh] bg-gradient-to-br from-slate-100 via-sky-50/50 to-slate-200 py-8 px-4 max-w-xl mx-auto flex flex-col justify-center">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto font-bold shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
              บัญชีเจ้าหน้าที่ HR / ผู้ดูแลระบบ (Admin)
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              {currentDoctor.prefix_th}{currentDoctor.first_name_th} {currentDoctor.last_name_th}
            </h2>
            <p className="text-xs text-slate-500">
              โทร. {currentDoctor.phone || '089-470-9256'} • ระบบนี้สำหรับแพทย์ยื่นใบลาเท่านั้น
            </p>
          </div>
          <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-xs text-sky-900 text-left space-y-1.5">
            <p className="font-bold">คำแนะนำสำหรับฝ่ายการแพทย์ / HR (พี่กุ้ง):</p>
            <p className="text-[11px] text-sky-800 leading-relaxed">
              เจ้าหน้าที่ HR ไม่ต้องยื่นใบลาของตนเองในระบบนี้ หากต้องการ <strong>บันทึกวันลาแทนแพทย์ (กรณีฉุกเฉิน/ข้อยกเว้น)</strong> หรือจัดการข้อมูลระบบ กรุณาเลือกเมนูด้านล่าง:
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <Link
              to="/admin"
              className="py-3 px-4 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
            >
              <span>ไปหน้าแดชบอร์ดฝ่ายการแพทย์</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/admin/master-data"
              className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2"
            >
              <span>จัดการสายอนุมัติ & รายชื่อแพทย์</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50/50 to-slate-200 py-4 px-2.5 sm:px-6 max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto flex flex-col justify-center">

      {/* Mobile & Desktop LIFF Container Card */}
      <div className="bg-white/85 backdrop-blur-xl rounded-[24px] shadow-2xl overflow-hidden border border-white shadow-sky-900/10 transition-all duration-500 hover:shadow-sky-900/20">

        {/* Hospital Brand Header */}
        <div className="bg-gradient-to-r from-[#006699] via-[#0284c7] to-[#008b8b] text-white p-4 sm:p-5 relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 animate-pulse-subtle"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-sky-300/20 rounded-full blur-xl -ml-10 -mb-10"></div>

          <div className="flex items-start sm:items-center justify-between gap-2 relative z-10">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-semibold text-sky-200 uppercase tracking-wider block truncate">
                  LINE Official Account • LIFF
                </span>
                <h1 className="text-base sm:text-lg font-bold leading-tight truncate">
                  แบบฟอร์มยื่นใบลาแพทย์
                </h1>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur-xs whitespace-nowrap">
                {currentDoctor.doctor_type === 'FULL_TIME' ? 'แพทย์ประจำ (FT)' : 'พาร์ทไทม์ (PT)'}
              </span>
            </div>
          </div>

          {/* Smart Profile Info Bar */}
          <div className="mt-3 pt-2.5 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
              <span className="font-semibold">{currentDoctor.prefix_th}{currentDoctor.first_name_th} {currentDoctor.last_name_th}</span>
              <span className="text-sky-200 text-[11px] font-mono">
                ({currentDoctor.employee_id}{currentDoctor.license_no ? ` • ${currentDoctor.license_no}` : ''})
              </span>
            </div>
            <span className="text-sky-100 bg-sky-950/35 px-2.5 py-0.5 rounded-md text-[11px] font-medium self-start sm:self-auto max-w-full truncate">
              แผนก{currentDoctor.department_name || 'อายุรกรรม'}
            </span>
          </div>
        </div>



        {/* Leave Request Form */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-5 space-y-4">

          {/* Error Message */}
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. เลือกประเภทการลา */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              1. เลือกประเภทการลา <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
              {leaveTypes.map(lt => {
                const isSelected = selectedType?.id === lt.id;
                const bal = balances.find(b => b.leave_type_id === lt.id);
                const isTrainingType = lt.code === 'TRAINING';
                const trainingUsedCount = bal?.request_count_this_year || 0;
                const trainingMaxCount = lt.max_requests_per_year || 1;
                const hasQuota = bal !== undefined && !['TRAINING', 'PERSONAL', 'SHIFT_SWAP', 'UNPAID'].includes(lt.code) && Number(bal.total_quota) > 0;
                const isFull = (hasQuota && Number(bal.remaining_days) <= 0) || (isTrainingType && trainingUsedCount >= trainingMaxCount);

                return (
                  <button
                    type="button"
                    key={lt.id}
                    onClick={() => setSelectedType(lt)}
                    className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all duration-200 relative flex flex-col justify-between min-h-[78px] overflow-hidden group ${isSelected
                        ? isFull
                          ? 'border-rose-400 bg-gradient-to-br from-rose-50 to-white shadow-md ring-1 ring-rose-400'
                          : 'border-[#006699] bg-gradient-to-br from-sky-50 to-white shadow-md shadow-sky-900/10 ring-1 ring-[#006699]'
                        : isFull
                          ? 'border-rose-200/90 bg-rose-50/30 hover:border-rose-300'
                          : 'border-slate-200 hover:border-sky-300 hover:shadow-sm bg-white'
                      }`}
                  >
                    {isSelected && (
                      <div className={`absolute top-0 right-0 w-10 h-10 rounded-bl-full -mr-2 -mt-2 ${isFull ? 'bg-rose-200/40' : 'bg-sky-200/30'}`} />
                    )}
                    <div className="flex items-start justify-between gap-1.5 relative z-10">
                      <span className="text-[11px] sm:text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                        {lt.name_th}
                      </span>
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                        style={{ backgroundColor: isFull ? '#ef4444' : (lt.color || '#0ea5e9') }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 mt-2 pt-1.5 border-t border-slate-100/80 flex flex-wrap items-center justify-between gap-1 relative z-10">
                      <span className="truncate text-[9px] sm:text-[10px] text-slate-400">
                        {lt.allows_half_day ? 'ครึ่งวันได้' : 'เต็มวัน'}
                      </span>
                      {isTrainingType ? (
                        <span className={`font-semibold px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] shrink-0 ${
                          isFull
                            ? 'text-rose-700 bg-rose-100 border border-rose-200 font-bold'
                            : 'text-violet-700 bg-violet-50 border border-violet-200'
                        }`}>
                          {isFull ? 'ใช้สิทธิ์แล้ว' : '1 ครั้ง/ปี'}
                        </span>
                      ) : hasQuota ? (
                        isSelected && activeDuration > 0 ? (
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[9px] sm:text-[10px] flex items-center gap-0.5 shrink-0">
                            <span>เหลือ {Math.max(0, Number(bal.remaining_days) - activeDuration)} วัน</span>
                            <span className="text-rose-600 font-extrabold text-[9px]">(-{activeDuration})</span>
                          </span>
                        ) : (
                          <span className={`font-semibold shrink-0 text-[10px] ${isFull ? 'text-rose-600 font-bold' : 'text-[#006699]'}`}>
                            {isFull ? 'โควตาเต็ม' : `เหลือ ${bal.remaining_days} วัน`}
                          </span>
                        )
                      ) : (
                        <span className={`font-semibold px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] shrink-0 ${
                          lt.code === 'UNPAID'
                            ? 'text-slate-600 bg-slate-100 border border-slate-200/80'
                            : lt.code === 'SHIFT_SWAP'
                              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/80'
                              : 'text-amber-700 bg-amber-50 border border-amber-200/60'
                        }`}>
                          {lt.code === 'UNPAID' ? 'ไม่เกิน 30 วัน' : lt.code === 'SHIFT_SWAP' ? 'สลับวันตรวจ' : 'ตามเกณฑ์ รพ.'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Leave Type Policy & Conditions Banner */}
            {selectedType && (
              <div className="mt-2.5 p-3 bg-gradient-to-br from-sky-50/90 to-slate-50 border border-sky-200/80 rounded-xl text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#006699] shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <div className="font-bold text-slate-800 flex items-center justify-between flex-wrap gap-1">
                      <span>เงื่อนไข: {selectedType.name_th}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-[#006699] border border-sky-200">
                        คำนวณวันลาตามปฏิทิน
                      </span>
                    </div>
                    {selectedType.code === 'TRAINING' && (
                      <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-0.5">
                        <li>บันทึกก่อนลาล่วงหน้าอย่างน้อย <strong>7 วัน</strong></li>
                        <li>ใช้สิทธิ์ได้ <strong>ปีละ 1 ครั้ง</strong> (คำนวณวันลาตามปฏิทิน)</li>
                        <li>กรุณาเลือกความประสงค์ว่า <strong>ต้องการเบิกค่าใช้จ่ายหรือไม่</strong> ด้านล่าง</li>
                      </ul>
                    )}
                    {selectedType.code === 'VACATION' && (
                      <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-0.5">
                        <li>สิทธิ์ <strong>20 วัน/ปี</strong> (เริ่มใช้งานได้หลังทำงานครบ 6 เดือน เฉพาะ Full-time)</li>
                        <li>ลาต่อเนื่องได้ <strong>ไม่เกิน 10 วัน</strong> ทั้งในเดือนและคร่อมเดือน (นับรวมวันหยุดประจำ)</li>
                        <li>บันทึกก่อนลาเท่านั้น ส่งวันลาล่วงหน้าอย่างน้อย <strong>7 วัน</strong></li>
                        <li>ต้องมีวันทำงานเหลือในเดือนไม่น้อยกว่า <strong>15 วัน</strong> (คำนวณวันลาตามปฏิทิน)</li>
                      </ul>
                    )}
                    {selectedType.code === 'PERSONAL' && (
                      <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-0.5">
                        <li>ลากิจ (ครอบครัวเสียชีวิต) คำนวณวันลาตามปฏิทิน</li>
                        <li>ต้อง <strong>แนบใบมรณบัตร</strong> หรือเลือกส่งให้เจ้าหน้าที่หลังจบงาน (บันทึกลาย้อนหลังได้)</li>
                      </ul>
                    )}
                    {selectedType.code === 'ORDINATION' && (
                      <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-0.5">
                        <li>ลาอุปสมบท ได้ไม่เกิน <strong>120 วัน</strong> (คำนวณวันลาตามปฏิทิน)</li>
                      </ul>
                    )}
                    {selectedType.code === 'MATERNITY' && (
                      <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-0.5">
                        <li>ลาคลอดบุตร ได้ไม่เกิน <strong>90 วัน</strong> (คำนวณวันลาตามปฏิทิน)</li>
                      </ul>
                    )}
                    {selectedType.code === 'SHIFT_SWAP' && (
                      <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-0.5">
                        <li>สำหรับขอหยุดแบบสลับวันออกตรวจ <strong>ลาล่วงหน้าได้เฉพาะเดือนนี้และเดือนหน้าเท่านั้น</strong></li>
                        <li>คลิกเลือกวันจาก <strong>ปฏิทินเช็คแพทย์ออกตรวจคงเหลือ</strong> ด้านล่างได้เลย</li>
                      </ul>
                    )}
                    {selectedType.code === 'SICK' && (
                      <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-0.5">
                        <li>กรณีลาตั้งแต่ <strong>3 วันขึ้นไป ต้องแนบใบรับรองแพทย์</strong></li>
                        <li>สามารถบันทึกลาย้อนหลังได้ • คำนวณวันลาตามปฏิทิน</li>
                      </ul>
                    )}
                    {selectedType.code === 'UNPAID' && (
                      <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-0.5">
                        <li>ลาได้สูงสุดต่อเนื่องไม่เกิน <strong>1 เดือน (30 วัน)</strong> คำนวณวันลาตามปฏิทิน</li>
                        <li>ต้องแนบ <strong>จดหมายเรียนถึงผู้อำนวยการ</strong> แจ้งถึงเหตุผลในการลา</li>
                      </ul>
                    )}
                  </div>
                </div>

                {/* Expense Reimbursement Button for TRAINING (ลาฝึกอบรม/ประชุมวิชาการ) */}
                {(selectedType.code === 'TRAINING' || selectedType.has_reimbursement_option) && (
                  <div className="pt-2 border-t border-sky-200/80">
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      ต้องการเบิกค่าใช้จ่ายหรือไม่ <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setReimbursementRequested(true)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                          reimbursementRequested === true
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>เบิกค่าใช้จ่าย</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setReimbursementRequested(false)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                          reimbursementRequested === false
                            ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span>ไม่เบิกค่าใช้จ่าย</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quota Exhausted Alert */}
            {isPersonalQuotaExhausted && (
              <div className="mt-2.5 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">
                    {isTrainingLimitReached ? 'ใช้สิทธิ์ครบ 1 ครั้ง/ปีแล้ว:' : 'สิทธิ์วันลาคงเหลือหมดแล้ว (โควตาเต็ม 0 วัน):'}
                  </strong>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-rose-700">
                    {isTrainingLimitReached
                      ? `สิทธิ์การ${selectedType?.name_th} กำหนดให้ใช้ได้ปีละ 1 ครั้งเท่านั้น และท่านมีประวัติการใช้สิทธิ์ในปีนี้แล้ว`
                      : `ท่านใช้สิทธิ์ ${selectedType?.name_th} ครบตามโควตาประจำปีแล้ว ระบบไม่อนุญาตให้กดส่งใบลาประเภทนี้`}
                  </p>
                </div>
              </div>
            )}

            {isMaxDaysPerRequestExceeded && !isPersonalQuotaExhausted && (
              <div className="mt-2.5 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">เกินจำนวนวันลาสูงสุดต่อครั้ง ({selectedType?.max_days_per_request} วัน):</strong>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-rose-700">
                    การ{selectedType?.name_th} กำหนดให้ลาต่อเนื่องได้ไม่เกิน {selectedType?.max_days_per_request} วัน (ท่านเลือก {activeDuration} วัน) กรุณาปรับลดช่วงวันลา
                  </p>
                </div>
              </div>
            )}

            {isRequestedExceeded && !isPersonalQuotaExhausted && !isMaxDaysPerRequestExceeded && (
              <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">จำนวนวันลาเกินสิทธิ์คงเหลือ:</strong>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700">
                    ท่านเลือกวันลา {activeDuration} วัน แต่มีสิทธิ์คงเหลือ {remainingDays} วัน กรุณาปรับลดจำนวนวันลา
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 2. เลือกช่วงเวลา & วันที่ */}
          <div className="space-y-3">
            {selectedType?.code === 'SHIFT_SWAP' ? (
              /* ============================================================ */
              /* FRIENDLY SIDE-BY-SIDE CARD FOR SHIFT SWAP (ลาสลับวันออกตรวจ)  */
              /* ============================================================ */
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="block text-xs font-bold text-slate-700">
                    2. เลือกวันหยุดเดิม และวันที่จะสลับไปออกตรวจแทน <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-bold text-[#006699] bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                    ลาล่วงหน้าได้เฉพาะเดือนนี้และเดือนหน้า
                  </span>
                </div>

                {/* Step A (วันขอหยุด) ➔ Step B (วันสลับไปออกตรวจแทน) */}
                <div className="grid grid-cols-1 md:grid-cols-11 gap-2.5 items-stretch">
                  {/* Left Box: วันที่ขอหยุดตรวจ */}
                  <div
                    onClick={() => setCalendarSelectTarget('OFF_DATE')}
                    className={`md:col-span-5 p-3 sm:p-3.5 bg-amber-50/50 rounded-2xl border space-y-2 flex flex-col justify-between cursor-pointer transition-all ${
                      calendarSelectTarget === 'OFF_DATE'
                        ? 'border-amber-500 ring-2 ring-amber-200 shadow-xs'
                        : 'border-amber-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold inline-flex items-center justify-center shrink-0">1</span>
                          <span>วันที่ขอหยุดออกตรวจ <span className="text-rose-500">*</span></span>
                        </span>
                        <span className="text-[11px] font-bold text-amber-800 bg-white px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                          {formatThaiDateShort(startDate)}
                        </span>
                      </div>
                      <input
                        type="date"
                        min={todayStr}
                        max={maxSwapDateStr}
                        value={startDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStartDate(val);
                          setEndDate(val);
                        }}
                        className="w-full text-xs p-2.5 rounded-xl border border-amber-300 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-semibold text-slate-800"
                        required
                      />
                    </div>
                    {quotaInfo && (
                      <div className="space-y-1">
                        <div className="text-[11px] text-amber-900 bg-white/95 px-2.5 py-1.5 rounded-lg border border-amber-200/80 flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-slate-600 font-medium">แพทย์คงเหลือวันนั้น:</span>
                          <strong className="text-amber-950 shrink-0">
                            เหลือ {quotaInfo.remaining_doctors_count ?? 0} / {quotaInfo.total_doctors ?? 0} ท่าน
                            {quotaInfo.min_staff_required ? ` (ขั้นต่ำ ${quotaInfo.min_staff_required})` : ''}
                          </strong>
                        </div>
                        {quotaInfo.status === 'FULL' && (
                          <div className="text-[10px] text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200 font-bold">
                            ⚠️ แพทย์จะเหลือต่ำกว่าเกณฑ์ขั้นต่ำ ({quotaInfo.min_staff_required} ท่าน) ไม่สามารถเลือกวันนี้ได้
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Arrow Connector */}
                  <div className="md:col-span-1 flex items-center justify-center py-0.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-2xs">
                      <ArrowRight className="w-4 h-4 rotate-90 md:rotate-0" />
                    </div>
                  </div>

                  {/* Right Box: วันที่จะสลับไปออกตรวจแทน */}
                  <div
                    onClick={() => setCalendarSelectTarget('SWAP_DATE')}
                    className={`md:col-span-5 p-3 sm:p-3.5 bg-emerald-50/60 rounded-2xl border space-y-2 flex flex-col justify-between cursor-pointer transition-all ${
                      calendarSelectTarget === 'SWAP_DATE'
                        ? 'border-emerald-600 ring-2 ring-emerald-200 shadow-xs'
                        : 'border-emerald-300 hover:border-emerald-400'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold inline-flex items-center justify-center shrink-0">2</span>
                          <span>สลับไปออกตรวจวันที่ <span className="text-rose-500">*</span></span>
                        </span>
                        {swapDate && (
                          <span className="text-[11px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                            {formatThaiDateShort(swapDate)}
                          </span>
                        )}
                      </div>
                      <input
                        type="date"
                        min={todayStr}
                        max={maxSwapDateStr}
                        value={swapDate}
                        onChange={(e) => setSwapDate(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-emerald-400 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-semibold text-slate-800"
                        required
                      />
                    </div>
                    {swapDate && swapQuotaInfo ? (
                      <div className="text-[11px] text-emerald-900 bg-white/95 px-2.5 py-1.5 rounded-lg border border-emerald-200 flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-slate-600 font-medium">แพทย์คงเหลือวันนั้น:</span>
                        <strong className="text-emerald-700 shrink-0">
                          เหลือ {swapQuotaInfo.remaining_doctors_count ?? 0} / {swapQuotaInfo.total_doctors ?? 0} ท่าน
                        </strong>
                      </div>
                    ) : (
                      <div className="text-[11px] text-emerald-700 px-1 font-medium">
                        💡 คลิกเลือกวันจากปฏิทินด้านล่างได้เลย
                      </div>
                    )}
                  </div>
                </div>

                {/* Interactive Monthly Calendar Grid showing Remaining Doctors per day (Current Month & Next Month) */}
                {quotaInfo?.upcoming_days && quotaInfo.upcoming_days.length > 0 && (() => {
                  const nowD = new Date();
                  const viewDate = new Date(nowD.getFullYear(), nowD.getMonth() + calendarMonthOffset, 1);
                  const viewYear = viewDate.getFullYear();
                  const viewMonth = viewDate.getMonth();
                  const monthsFullTh = [
                    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
                  ];
                  const curMonthLabel = `${monthsFullTh[nowD.getMonth()]} ${nowD.getFullYear() + 543}`;
                  const nextD = new Date(nowD.getFullYear(), nowD.getMonth() + 1, 1);
                  const nextMonthLabel = `${monthsFullTh[nextD.getMonth()]} ${nextD.getFullYear() + 543}`;

                  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 (Sun) - 6 (Sat)
                  const daysInViewMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
                  const dayMap = {};
                  (quotaInfo.upcoming_days || []).forEach(d => {
                    dayMap[d.date] = d;
                  });

                  const cells = [];
                  for (let b = 0; b < firstDayOfWeek; b++) {
                    cells.push(null);
                  }
                  for (let dayNum = 1; dayNum <= daysInViewMonth; dayNum++) {
                    const dStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    cells.push({
                      dayNum,
                      dateStr: dStr,
                      info: dayMap[dStr] || null
                    });
                  }

                  return (
                    <div className="p-3 sm:p-4 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                      {/* Header & Target Mode Selector */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            📅 ปฏิทินเช็คจำนวนแพทย์ออกตรวจคงเหลือ ({quotaInfo.scope_name || quotaInfo.department_name})
                          </span>
                          <span className="text-[11px] text-slate-500">
                            คลิกวันที่ในปฏิทินเพื่อเลือก {calendarSelectTarget === 'OFF_DATE' ? 'วันที่ขอหยุดออกตรวจ (ช่องที่ 1)' : 'วันที่สลับไปออกตรวจแทน (ช่องที่ 2)'}
                          </span>
                        </div>

                        {/* Click Target Switcher */}
                        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-[11px] font-bold self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => setCalendarSelectTarget('OFF_DATE')}
                            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                              calendarSelectTarget === 'OFF_DATE'
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            1. เลือกวันหยุด
                          </button>
                          <button
                            type="button"
                            onClick={() => setCalendarSelectTarget('SWAP_DATE')}
                            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                              calendarSelectTarget === 'SWAP_DATE'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            2. เลือกวันสลับตรวจ
                          </button>
                        </div>
                      </div>

                      {/* Month Switcher Tabs: เดือนนี้ vs เดือนหน้า */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCalendarMonthOffset(0)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            calendarMonthOffset === 0
                              ? 'bg-[#006699] text-white border-[#006699] shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>เดือนนี้ ({curMonthLabel})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCalendarMonthOffset(1)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            calendarMonthOffset === 1
                              ? 'bg-[#006699] text-white border-[#006699] shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                          <span>เดือนหน้า ({nextMonthLabel})</span>
                        </button>
                      </div>

                      {/* Day of Week Header */}
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] sm:text-[11px] font-bold text-slate-500 pt-1">
                        <div className="text-rose-500">อา.</div>
                        <div>จ.</div>
                        <div>อ.</div>
                        <div>พ.</div>
                        <div>พฤ.</div>
                        <div>ศ.</div>
                        <div className="text-sky-600">ส.</div>
                      </div>

                      {/* 7-Column Calendar Days Grid */}
                      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                        {cells.map((cell, idx) => {
                          if (!cell) {
                            return <div key={`blank-${idx}`} className="min-h-[52px] sm:min-h-[62px] rounded-xl bg-slate-50/40" />;
                          }
                          const { dayNum, dateStr, info } = cell;
                          const isPast = dateStr < todayStr;
                          const isPickedOff = dateStr === startDate;
                          const isPickedSwap = dateStr === swapDate;
                          const rem = info?.remaining_doctors_count ?? quotaInfo.total_doctors ?? 0;
                          const tot = info?.total_doctors ?? quotaInfo.total_doctors ?? 0;
                          const minStaff = info?.min_staff_required ?? quotaInfo.min_staff_required;
                          const isFull = info?.status === 'FULL' || (minStaff && rem < minStaff);
                          const isNear = info?.status === 'NEAR_LIMIT' || (minStaff && rem === minStaff);

                          return (
                            <button
                              type="button"
                              key={dateStr}
                              disabled={isPast}
                              onClick={() => {
                                if (calendarSelectTarget === 'OFF_DATE') {
                                  setStartDate(dateStr);
                                  setEndDate(dateStr);
                                  setCalendarSelectTarget('SWAP_DATE');
                                } else {
                                  setSwapDate(dateStr);
                                }
                              }}
                              className={`min-h-[54px] sm:min-h-[64px] p-1 sm:p-1.5 rounded-xl border text-center transition-all flex flex-col items-center justify-between ${
                                isPast
                                  ? 'bg-slate-100/60 border-slate-100 text-slate-300 cursor-not-allowed opacity-60'
                                  : isPickedSwap
                                  ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-200 shadow-xs cursor-pointer'
                                  : isPickedOff
                                  ? 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-200 shadow-xs cursor-pointer'
                                  : isFull
                                  ? 'bg-rose-50/80 border-rose-200 hover:border-rose-400 text-rose-900 cursor-pointer'
                                  : isNear
                                  ? 'bg-amber-50/70 border-amber-200 hover:border-amber-400 text-amber-900 cursor-pointer'
                                  : 'bg-white border-slate-200 hover:border-[#006699] hover:bg-sky-50/40 text-slate-800 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full px-0.5">
                                <span className={`text-[11px] sm:text-xs font-extrabold ${
                                  isPickedSwap || isPickedOff ? 'text-white' : isPast ? 'text-slate-400' : 'text-slate-800'
                                }`}>
                                  {dayNum}
                                </span>
                                {(isPickedOff || isPickedSwap) && (
                                  <span className="text-[8px] sm:text-[9px] font-bold bg-white/25 px-1 rounded text-white">
                                    {isPickedOff ? 'หยุด' : 'สลับ'}
                                  </span>
                                )}
                              </div>

                              <div className={`w-full py-0.5 px-0.5 rounded text-[9px] sm:text-[10px] font-bold leading-tight truncate ${
                                isPast
                                  ? 'bg-slate-100 text-slate-400'
                                  : isPickedSwap
                                  ? 'bg-white text-emerald-700'
                                  : isPickedOff
                                  ? 'bg-white text-amber-800'
                                  : isFull
                                  ? 'bg-rose-100 text-rose-700'
                                  : isNear
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}>
                                <span className="hidden sm:inline">เหลือ </span>{rem}/{tot}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Legend & Doctors on duty on selected swap date */}
                      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] sm:text-[11px] text-slate-500">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> วันขอหยุด
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-emerald-600 inline-block" /> วันสลับตรวจ
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-300 inline-block" /> ปกติ
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-300 inline-block" /> พอดีเกณฑ์ขั้นต่ำ
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-rose-100 border border-rose-300 inline-block" /> ต่ำกว่าเกณฑ์
                          </span>
                        </div>

                        {swapDate && swapQuotaInfo?.available_doctors?.length > 0 && (
                          <div className="text-slate-600">
                            แพทย์ที่ออกตรวจวัน{formatThaiDateShort(swapDate)}:{' '}
                            <strong className="text-slate-800">
                              {swapQuotaInfo.available_doctors.map(d => d.short_name).join(', ')}
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Optional: Colleague to swap with */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-700 shrink-0">
                    แพทย์ที่สลับวันออกตรวจด้วย (ถ้ามี):
                  </label>
                  <select
                    value={substituteDoctorId}
                    onChange={(e) => setSubstituteDoctorId(e.target.value)}
                    className="w-full sm:w-72 text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  >
                    <option value="">-- ไม่ระบุ / สลับตารางตรวจของตนเอง --</option>
                    {departmentColleagues.map((colleague) => (
                      <option key={colleague.id} value={colleague.id}>
                        {colleague.prefix_th}{colleague.first_name_th} {colleague.last_name_th}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              /* ============================================================ */
              /* STANDARD LEAVE DATE PICKER (สำหรับประเภทการลาอื่นๆ)             */
              /* ============================================================ */
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-slate-700">
                    2. วันที่ต้องการลา <span className="text-rose-500">*</span>
                  </label>

                  {/* Leave Mode Switcher */}
                  <div className="grid grid-cols-2 sm:inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        setLeaveMode('SINGLE');
                        setEndDate(startDate);
                      }}
                      className={`px-3 py-1.5 sm:py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        leaveMode === 'SINGLE'
                          ? 'bg-white text-[#006699] shadow-xs font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>ลาวันเดียว</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLeaveMode('RANGE');
                        setHalfDayType('FULL_DAY');
                        if (endDate === startDate) {
                          setEndDate(addDaysToDate(startDate, 1));
                        }
                      }}
                      className={`px-3 py-1.5 sm:py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        leaveMode === 'RANGE'
                          ? 'bg-white text-[#006699] shadow-xs font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <CalendarRange className="w-3.5 h-3.5 shrink-0" />
                      <span>ลาหลายวัน (ช่วงวันที่)</span>
                    </button>
                  </div>
                </div>

                {/* Mode: SINGLE DAY (ลาวันเดียว) */}
                {leaveMode === 'SINGLE' ? (
                  <div className="p-3.5 bg-gradient-to-br from-white via-sky-50/20 to-sky-50/50 rounded-2xl border border-sky-200/80 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#006699]" />
                        วันที่ระบุลา
                      </span>
                      <span className="text-xs font-bold text-[#006699] bg-white px-2.5 py-0.5 rounded-full border border-sky-200 shadow-2xs">
                        {formatThaiDate(startDate, true)}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStartDate(val);
                          setEndDate(val);
                        }}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden transition-all font-medium text-slate-800"
                        required
                      />
                    </div>
                    {/* Quick single day shortcuts */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-[11px] text-slate-400">เลือกเร็ว:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setStartDate(todayStr);
                          setEndDate(todayStr);
                        }}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-700 transition-colors"
                      >
                        วันนี้
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const tomorrow = addDaysToDate(todayStr, 1);
                          setStartDate(tomorrow);
                          setEndDate(tomorrow);
                        }}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-700 transition-colors"
                      >
                        พรุ่งนี้
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextWeek = addDaysToDate(todayStr, 7);
                          setStartDate(nextWeek);
                          setEndDate(nextWeek);
                        }}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-700 transition-colors"
                      >
                        สัปดาห์หน้า
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Mode: DATE RANGE (ช่วงวันที่ - Dual Connected Cards) */
                  <div className="p-3.5 bg-gradient-to-br from-white via-sky-50/30 to-blue-50/40 rounded-2xl border border-sky-300/80 shadow-2xs space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-11 gap-2.5 items-center">
                      {/* Left: Start Date */}
                      <div className="sm:col-span-5 p-3 bg-white rounded-xl border border-slate-200 hover:border-sky-300 transition-all space-y-1 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#006699]" />
                            วันแรกที่ลา (เริ่มต้น)
                          </span>
                          <span className="text-[10px] font-bold text-[#006699] bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                            {formatThaiDateShort(startDate)}
                          </span>
                        </div>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            const newStart = e.target.value;
                            setStartDate(newStart);
                            if (newStart > endDate) setEndDate(newStart);
                          }}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden transition-all font-medium text-slate-800"
                          required
                        />
                      </div>

                      {/* Center: Range Duration Connector */}
                      <div className="sm:col-span-1 flex flex-col items-center justify-center py-1 sm:py-0">
                        <div className="hidden sm:flex flex-col items-center gap-1">
                          <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center text-[#006699] shadow-2xs">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[10px] font-bold text-[#006699] whitespace-nowrap bg-white px-2 py-0.5 rounded-full border border-sky-200 shadow-2xs">
                            {activeDuration} วัน
                          </span>
                        </div>
                        <div className="flex sm:hidden items-center justify-center gap-2 py-0.5 w-full">
                          <div className="h-px bg-sky-200 flex-1" />
                          <span className="text-[11px] font-bold text-[#006699] flex items-center gap-1 bg-white px-2.5 py-0.5 rounded-full border border-sky-200 shadow-2xs">
                            <ArrowRight className="w-3 h-3 text-[#006699]" />
                            {activeDuration} วัน
                          </span>
                          <div className="h-px bg-sky-200 flex-1" />
                        </div>
                      </div>

                      {/* Right: End Date */}
                      <div className="sm:col-span-5 p-3 bg-white rounded-xl border border-slate-200 hover:border-sky-300 transition-all space-y-1 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                            <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                            วันสุดท้ายที่ลา (สิ้นสุด)
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {formatThaiDateShort(endDate)}
                          </span>
                        </div>
                        <input
                          type="date"
                          value={endDate}
                          min={startDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden transition-all font-medium text-slate-800"
                          required
                        />
                      </div>
                    </div>

                    {/* Quick Range Presets & Return to Work Info */}
                    <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] text-slate-400">เลือกช่วงเร็ว:</span>
                        {[
                          { label: '2 วัน', days: 1 },
                          { label: '3 วัน', days: 2 },
                          { label: '4 วัน', days: 3 },
                          { label: '5 วัน (1 สัปดาห์)', days: 4 },
                        ].map(p => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => setEndDate(addDaysToDate(startDate, p.days))}
                            className="text-[11px] px-2.5 py-0.5 rounded-md bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-700 transition-colors shadow-2xs font-medium"
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>

                      {returnToWorkDate && (
                        <div className="text-[11px] text-slate-600 bg-white/90 px-2.5 py-1 rounded-lg border border-sky-100 flex items-center gap-1.5 shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-[#006699]" />
                          <span>กลับมาปฏิบัติงาน: <strong className="text-slate-800">{formatThaiDate(returnToWorkDate, false)}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 3. รูปแบบเวลาการลา (Time Slot) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                3. รูปแบบเวลาการลา
              </label>
              <span className="text-[11px] font-bold text-[#006699] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200 animate-in fade-in">
                รวมวันลา: {activeDuration} วัน
              </span>
            </div>

            {leaveMode === 'SINGLE' ? (
              selectedType?.allows_half_day ? (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'FULL_DAY', label: 'เต็มวัน (1 วัน)', desc: 'ตลอดวันทำการ' },
                    { id: 'MORNING', label: 'ครึ่งเช้า (0.5)', desc: '08:00 - 12:00' },
                    { id: 'AFTERNOON', label: 'ครึ่งบ่าย (0.5)', desc: '13:00 - 17:00' }
                  ].map(opt => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setHalfDayType(opt.id)}
                      className={`p-2 sm:p-2.5 rounded-xl text-xs border text-center transition-all ${
                        halfDayType === opt.id
                          ? 'bg-[#006699] text-white border-[#006699] shadow-xs font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-semibold text-[11px] sm:text-xs">{opt.label}</div>
                      <div className={`text-[9px] sm:text-[10px] mt-0.5 ${halfDayType === opt.id ? 'text-sky-100' : 'text-slate-400'}`}>
                        {opt.desc}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>ประเภทการลานี้ ({selectedType?.name_th}) กำหนดให้ลาเต็มวันเท่านั้น</span>
                </div>
              )
            ) : (
              <div className="p-3 bg-gradient-to-r from-sky-50 to-white rounded-xl border border-sky-200 text-xs text-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#006699] shrink-0" />
                  <div>
                    <span className="font-bold text-[#006699]">เต็มวันตลอดช่วง (Full Day)</span>
                    <p className="text-[11px] text-slate-500">ระบบคำนวณวันลาตามปฏิทิน (นับรวมทุกวัน แพทย์ไม่มีวันหยุดเสาร์-อาทิตย์)</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-sky-200 text-[#006699] shadow-2xs">
                  รวม {activeDuration} วัน
                </span>
              </div>
            )}
          </div>

          {/* Department Quota & Remaining Clinic Doctors Indicator Box */}
          {quotaInfo && selectedType?.code !== 'SHIFT_SWAP' && (
            <div className={`p-3.5 rounded-2xl border text-xs space-y-2 ${quotaInfo.status === 'FULL'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : quotaInfo.status === 'NEAR_LIMIT'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${quotaInfo.status === 'FULL' ? 'bg-rose-500' :
                      quotaInfo.status === 'NEAR_LIMIT' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                  <div>
                    <span className="font-bold">{quotaInfo.scope_name || quotaInfo.department_name} ({formatThaiDateShort(startDate)}):</span>
                    <span className="ml-1.5 font-extrabold text-[13px]">
                      แพทย์ออกตรวจคงเหลือ {quotaInfo.remaining_doctors_count ?? 0} / {quotaInfo.total_doctors ?? 0} ท่าน
                    </span>
                    {quotaInfo.min_staff_required && (
                      <span className="ml-1.5 text-[11px] opacity-80">
                        (เกณฑ์ขั้นต่ำ {quotaInfo.min_staff_required} ท่าน)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/80 border border-current/15">
                    ลาแล้ว {quotaInfo.current_on_leave} ท่าน
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white shadow-2xs">
                    {quotaInfo.status === 'FULL'
                      ? '⚠️ ต่ำกว่าเกณฑ์/เต็ม'
                      : quotaInfo.status === 'NEAR_LIMIT'
                        ? '⚡ ใกล้ถึงเกณฑ์'
                        : '✓ ว่างปกติ'}
                  </span>
                </div>
              </div>

              {quotaInfo.available_doctors && quotaInfo.available_doctors.length > 0 && (
                <div className="text-[11px] opacity-90 pl-4 border-t border-current/10 pt-1.5">
                  <span>แพทย์ที่อยู่ปฏิบัติงาน: </span>
                  <strong className="font-semibold">
                    {quotaInfo.available_doctors.map(d => d.short_name).join(', ')}
                  </strong>
                  {quotaInfo.on_leave_doctors && quotaInfo.on_leave_doctors.length > 0 && (
                    <span className="ml-1.5 text-rose-700">
                      • ลาวันดังกล่าว: {quotaInfo.on_leave_doctors.map(d => d.short_name).join(', ')}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Department Quota Full or Below Minimum Staff Warning Banner */}
          {quotaInfo?.status === 'FULL' && (
            <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs text-rose-900 space-y-2.5 animate-in fade-in shadow-xs">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="font-bold text-rose-900 text-sm block">
                    {quotaInfo.is_below_min || (quotaInfo.min_staff_required && quotaInfo.remaining_doctors_count < quotaInfo.min_staff_required)
                      ? `แพทย์จะเหลือต่ำกว่าเกณฑ์ขั้นต่ำ (เหลือ ${quotaInfo.remaining_doctors_count} ท่าน จากเกณฑ์ขั้นต่ำ ${quotaInfo.min_staff_required} ท่าน)`
                      : `โควตาแพทย์ลาของแผนกเต็มแล้ว (${quotaInfo.current_on_leave} / ${quotaInfo.max_allowed} ท่าน)`}
                  </strong>
                  <p className="text-[11px] leading-relaxed text-rose-800">
                    {quotaInfo.min_staff_required
                      ? `ระเบียบ รพ. กำหนดให้แพทย์${quotaInfo.scope_name || quotaInfo.department_name} ต้องมีแพทย์ออกตรวจไม่น้อยกว่า ${quotaInfo.min_staff_required} ท่าน เพื่อความปลอดภัยและคุณภาพการดูแลผู้ป่วย ระบบจึงล็อคไม่ให้ยื่นลาในวันดังกล่าว`
                      : `ระบบจำกัดแพทย์ลาพร้อมกันไม่เกิน ${quotaInfo.max_allowed} ท่านต่อวันเพื่อความปลอดภัยของผู้ป่วย จึงไม่สามารถกดส่งใบลาในวันที่เลือกได้`}
                  </p>
                </div>
              </div>

              {/* Action: Contact Admin (P'Koong) for Override */}
              <div className="pt-2 border-t border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] text-rose-700 font-medium">
                  กรณีมีเหตุจำเป็นเร่งด่วน กรุณาติดต่อคุณธัญญธร ตันติกุล (พี่กุ้ง) เพื่อพิจารณาเป็นกรณีพิเศษ:
                </span>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <a
                    href="tel:0894709256"
                    className="inline-flex items-center gap-1 px-3 py-1 bg-rose-600 text-white rounded-lg font-bold text-[11px] hover:bg-rose-700 transition-colors shadow-2xs"
                  >
                    📱 โทรติดต่อพี่กุ้ง (089-470-9256)
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Shift Collision Alert & Substitute Doctor Handover (Feature #26) */}
          {shiftConflict && shiftConflict.has_conflict && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-300 rounded-2xl p-3.5 shadow-sm space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <h4 className="text-xs font-bold text-amber-950">
                      ตรวจพบตารางเวรตรงกับวันลา ({shiftConflict.conflict_count} รายการ)
                    </h4>
                    {shiftConflict.requires_substitute && (
                      <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200 shrink-0">
                        ต้องระบุผู้รับเวรแทน
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {shiftConflict.conflicts.map((conf, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white/90 rounded-lg px-2.5 py-1.5 text-[11px] border border-amber-200/80">
                        <span className="font-semibold text-slate-800">
                          📅 {conf.shift_date} • <span className="text-amber-800 font-bold">{conf.shift_label}</span> ({conf.time})
                        </span>
                        <span className="text-[10px] text-slate-500">{conf.notes || 'เวรประจำ'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Handover & Substitute Doctor Picker */}
              <div className="pt-2 border-t border-amber-200/80 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  👨‍⚕️ แพทย์ผู้ปฏิบัติหน้าที่แทน (Substitute Doctor) {shiftConflict.requires_substitute && <span className="text-rose-500">*</span>}
                </label>
                <select
                  value={substituteDoctorId}
                  onChange={(e) => setSubstituteDoctorId(e.target.value)}
                  className="w-full text-xs font-medium border border-amber-300 rounded-xl px-3 py-2 bg-white text-slate-800 focus:ring-2 focus:ring-[#006699] outline-hidden"
                >
                  <option value="">-- เลือกแพทย์ผู้รับเวรแทนในแผนก --</option>
                  {departmentColleagues.map((colleague) => (
                    <option key={colleague.id} value={colleague.id}>
                      {colleague.prefix_th}{colleague.first_name_th} {colleague.last_name_th} ({colleague.doctor_type === 'FULL_TIME' ? 'แพทย์ประจำ' : 'พาร์ทไทม์'})
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="บันทึกส่งมอบเวร / ข้อมูลเคสคนไข้สำคัญ (Handover Notes)"
                  value={dutyHandoverNotes}
                  onChange={(e) => setDutyHandoverNotes(e.target.value)}
                  className="w-full text-xs border border-amber-200 rounded-xl px-3 py-2 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#006699] outline-hidden"
                />
              </div>
            </div>
          )}

          {/* 4. เหตุผลการลา */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              4. เหตุผลความจำเป็นในการลา <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ระบุเหตุผล เช่น ติดภารกิจครอบครัว, ป่วยมีไข้สูง, เข้าร่วมประชุมวิชาการ..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden transition-all"
              required
            />
          </div>

          {/* 5. เอกสารแนบ หรือ แนบตามหลัง */}
          {selectedType?.requires_attachment && (
            <div className={`p-3.5 rounded-xl border transition-all ${
              isAttachmentMandatory 
                ? 'bg-amber-50/40 border-amber-200' 
                : 'bg-slate-50 border-slate-200'
            } space-y-2.5 animate-in fade-in`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                  5. เอกสารประกอบ {isAttachmentMandatory && <span className="text-rose-500">*</span>}
                  <span className="text-[11px] font-normal text-slate-500">
                    {selectedType.code === 'PERSONAL'
                      ? '(ใบมรณบัตร)'
                      : selectedType.code === 'UNPAID'
                        ? '(จดหมายเรียนถึงผู้อำนวยการแจ้งถึงเหตุผล)'
                        : selectedType.code === 'SICK'
                          ? '(ใบรับรองแพทย์ กรณีลา 3 วันขึ้นไป)'
                          : '(ใบรับรองแพทย์ / หนังสือเชิญ)'}
                  </span>
                </label>
                <div>
                  {isAttachmentMandatory ? (
                    <span className="inline-flex items-center gap-1 text-[10.5px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      จำเป็นต้องแนบ {selectedType.attachment_threshold_days > 0 ? `(ลา ${activeDuration} วัน ตั้งแต่ 3 วันขึ้นไป)` : ''}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      ไม่บังคับ {selectedType.attachment_threshold_days > 0 ? `(ลา ${activeDuration} วัน น้อยกว่า 3 วัน แนบหรือไม่ก็ได้)` : '(ตามความสะดวก)'}
                    </span>
                  )}
                </div>
              </div>

              {!uploadLater && (
                <div>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,image/png,image/jpeg"
                    onChange={(e) => setFiles(e.target.files)}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-100 file:text-[#006699] hover:file:bg-sky-200 cursor-pointer"
                  />
                  {files && files.length > 0 && (
                    <p className="text-[10px] text-emerald-600 mt-1 font-medium">
                      ✓ เลือกแล้ว {files.length} ไฟล์
                    </p>
                  )}
                </div>
              )}

              {/* Checkbox: แนบเอกสารตามหลัง (เปลี่ยนจำนวนวันตามประเภทการลาที่ตั้งค่าไว้) */}
              <label className="flex items-start gap-2 cursor-pointer pt-0.5">
                <input
                  type="checkbox"
                  checked={uploadLater}
                  onChange={(e) => setUploadLater(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-[#006699] focus:ring-sky-400 cursor-pointer"
                />
                <div className="text-xs">
                  <span className={`font-medium ${uploadLater ? 'text-[#006699] font-bold' : 'text-slate-700'}`}>
                    {selectedType.code === 'PERSONAL'
                      ? `ส่งใบมรณบัตรให้เจ้าหน้าที่หลังจบงาน (ภายใน ${selectedType?.attachment_deadline_days || 7} วัน)`
                      : `สะดวกแนบเอกสารตามหลัง (ภายใน ${selectedType?.attachment_deadline_days || 3} วัน)`}
                  </span>
                  <p className="text-[10px] text-slate-400 italic mt-0.5">
                    * ทางเลือกสำหรับแพทย์เมื่อยังไม่มีเอกสารติดตัว ระบบจะส่ง LINE Reminder แจ้งเตือนพร้อมลิงก์ให้อัปโหลดตามหลัง
                  </p>
                </div>
              </label>

              {isAttachmentMandatory && !uploadLater && (!files || files.length === 0) && (
                <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded-lg p-2 flex items-center gap-1.5">
                  <span className="font-bold">คำแนะนำ:</span>
                  <span>
                    {selectedType.code === 'PERSONAL'
                      ? 'กรุณาแนบไฟล์ใบมรณบัตร หรือติ๊กช่อง "ส่งใบมรณบัตรให้เจ้าหน้าที่หลังจบงาน"'
                      : selectedType.code === 'UNPAID'
                        ? 'กรุณาแนบจดหมายเรียนถึงผู้อำนวยการแจ้งถึงเหตุผล'
                        : 'กรุณาเลือกไฟล์แนบ หรือติ๊กช่อง "สะดวกแนบเอกสารตามหลัง" อย่างใดอย่างหนึ่งครับ'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || isBlockedByQuota}
            className={`w-full py-3.5 px-4 rounded-2xl text-white font-bold text-[13px] flex items-center justify-center gap-2 transition-all duration-300 ${submitting || isBlockedByQuota
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-[#006699] to-[#008b8b] hover:shadow-floating hover:-translate-y-0.5 active:scale-[0.98]'
              }`}
          >
            {submitting ? (
              <span>กำลังประมวลผลและส่ง LINE...</span>
            ) : isTrainingLimitReached ? (
              <>
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <span>🚫 ใช้สิทธิ์ครบ 1 ครั้ง/ปีแล้ว ไม่สามารถยื่นได้</span>
              </>
            ) : isPersonalQuotaExhausted ? (
              <>
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <span>🚫 สิทธิ์วันลาหมดแล้ว (โควตาเต็ม 0 วัน) ไม่สามารถยื่นได้</span>
              </>
            ) : isMaxDaysPerRequestExceeded ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>🚫 เกินจำนวนวันลาสูงสุดต่อครั้ง (ไม่เกิน {selectedType?.max_days_per_request} วัน)</span>
              </>
            ) : isRequestedExceeded ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>🚫 จำนวนวันลาเกินสิทธิ์คงเหลือ (เหลือ {remainingDays} วัน)</span>
              </>
            ) : isDeptQuotaFull ? (
              <>
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <span>
                  {quotaInfo?.is_below_min || (quotaInfo?.min_staff_required && quotaInfo?.remaining_doctors_count < quotaInfo?.min_staff_required)
                    ? `🚫 แพทย์จะเหลือต่ำกว่าเกณฑ์ (${quotaInfo?.remaining_doctors_count}/${quotaInfo?.min_staff_required} ท่าน) - ติดต่อฝ่ายการแพทย์`
                    : `🚫 โควตาแพทย์ลาเต็มแล้ว (${quotaInfo?.current_on_leave}/${quotaInfo?.max_allowed} ท่าน)`}
                </span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>ยืนยันการส่งใบลา (ส่งเข้า LINE 1-on-1 ทันที)</span>
              </>
            )}
          </button>

          <p className="text-[10px] text-center text-slate-400">
            ระบบรักษาความปลอดภัยตามมาตรฐาน PDPA ข้อมูลจะไม่ถูกส่งเข้ากลุ่มรวมเด็ดขาด
          </p>
        </form>

      </div>

      {/* Centered Success Modal Pop-up (Guaranteed visible anywhere on screen) */}
      {successResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CheckCircle className="w-9 h-9" />
            </div>

            <h3 className="text-base font-bold text-slate-800">
              ยื่นใบลาสำเร็จเรียบร้อย!
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-3 leading-relaxed">
              ระบบส่ง LINE Flex Message แจ้งเตือนไปยังหัวหน้าแพทย์เพื่อพิจารณาขั้นที่ 1 และจะส่งต่อให้ นพ.ปริวรรธน์ ระเด่น (ผู้ช่วย ผอ.รพ.) พิจารณาขั้นสุดท้าย
            </p>

            {/* Leave Details Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-2.5 mb-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-medium">เลขที่ใบลา:</span>
                <span className="font-mono font-bold text-[#006699] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {successResult.request?.request_no}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">สายอนุมัติ:</span>
                <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[11px]">
                  หัวหน้าแพทย์ &gt;&gt; นพ.ปริวรรธน์ (ผช.ผอ.)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">ประเภทการลา:</span>
                <span className="font-bold text-slate-800">
                  {selectedType?.name_th || 'ใบลาแพทย์'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">ช่วงวันที่ลา:</span>
                <span className="font-semibold text-slate-800">
                  {successResult.request?.start_date}
                  {successResult.request?.end_date && successResult.request.end_date !== successResult.request.start_date
                    ? ` ถึง ${successResult.request.end_date}`
                    : ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">จำนวนวันลา:</span>
                <span className="font-bold text-emerald-600 text-sm">
                  {successResult.request?.duration_days} วัน
                </span>
              </div>

              {successResult.quota_warning && (
                <div className="p-2 bg-amber-50 text-amber-800 rounded-lg text-[11px] font-medium border border-amber-200 mt-2">
                  ⚠️ {successResult.quota_warning}
                </div>
              )}
              {successResult.line_quota_error && (
                <div className="p-2 bg-rose-50 text-rose-800 rounded-lg text-[11px] font-medium border border-rose-200 mt-2">
                  ⚠️ โควตาข้อความ LINE เต็ม กรุณาโทรแจ้งหัวหน้าแผนกโดยตรง
                </div>
              )}
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    if (window.liff && window.liff.isInClient && window.liff.isInClient()) {
                      window.liff.closeWindow();
                    } else {
                      setSuccessResult(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  } catch {
                    setSuccessResult(null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="w-full bg-[#006699] hover:bg-[#005580] text-white font-bold py-3 px-4 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-98"
              >
                <Check className="w-4 h-4" />
                <span>ปิดหน้าต่าง (กลับเข้าแชท LINE)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSuccessResult(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ยื่นใบลาเพิ่มเติม / ตรวจสอบสิทธิ์
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
