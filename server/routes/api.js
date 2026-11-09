import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import {
  getDb,
  saveStore,
  resetStore,
  isSupabaseConfigured,
  supabase
} from '../db.js';
import {
  sendLinePushMessage,
  sendLineReplyMessage,
  buildDoctorSubmittedFlex,
  buildApproverRequestFlex,
  buildLeaveDecisionFlex,
  buildDoctorStep1ApprovedFlex,
  buildMedicalAdminNotificationFlex,
  buildEmergencyAlertFlex,
  buildCancelAlertFlex,
  buildWelcomeFlex,
  buildContactCardFlex,
  buildApproverReceiptFlex,
  simulatedLineMessages,
  isLineConfigured
} from '../line.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Whitelist allowed MIME types and file extensions (Security Hardening)
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp'
]);

// Multer storage configuration with random UUID to prevent path traversal
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${uuidv4().substring(0, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit per file
    files: 3 // Max 3 files per upload
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();

    if (!ALLOWED_MIME_TYPES.has(mime) || !ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error('ประเภทไฟล์ไม่ได้รับอนุญาต (อนุญาตเฉพาะไฟล์ PDF, JPG, PNG, WEBP เท่านั้น)'));
    }
    cb(null, true);
  }
});

export const defaultContactSettings = {
  coordinator_name: 'คุณธัญญธร ตันติกุล (พี่กุ้ง)',
  phone_hotline: '089-470-9256',
  phone_emergency: '089-470-9256',
  notify_line: true
};

// Middleware that conditionally applies multer only when Content-Type is multipart/form-data
const handleUpload = (req, res, next) => {
  if (req.is('multipart/form-data')) {
    upload.array('attachments', 3)(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'ขนาดไฟล์ใหญ่เกินไป (จำกัดไม่เกิน 2MB ต่อไฟล์)' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: 'แนบไฟล์ได้สูงสุดไม่เกิน 3 ไฟล์' });
        }
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  } else {
    next();
  }
};

// Helper: Format today's date in YYYY-MM-DD
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Security Sanitizer: Strip HTML / Script injection tags from string inputs (XSS Protection)
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<[^>]*>?/gm, '') // Strip HTML/script tags
    .trim();
}

// Helper: Calculate duration between two dates (สำหรับแพทย์ นับตามปฏิทินจริงทุกวัน แพทย์ไม่มีวันหยุดเสาร์-อาทิตย์)
function calculateDays(startDate, endDate) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// -------------------------------------------------------------
// -------------------------------------------------------------
// SYSTEM & HEALTH
// -------------------------------------------------------------
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Doctor Leave @ LINE API',
    hospital: 'Bangkok Hospital Siriroj (BSI)',
    version: '1.0',
    endpoints: {
      health: '/api/health',
      doctors: '/api/doctors',
      departments: '/api/departments',
      leave_types: '/api/leave-types',
      leave_requests: '/api/leave-requests',
      auth_me: '/api/auth/me',
      search_doctors: '/api/auth/search-doctors'
    }
  });
});

router.get('/health', (req, res) => {
  const db = getDb();
  res.json({
    status: 'ok',
    system: 'Doctor Leave @ LINE - Bangkok Hospital Siriroj',
    supabaseConnected: isSupabaseConfigured,
    lineConfigured: isLineConfigured,
    totalDoctors: db.doctors.length,
    totalLeaveRequests: db.leave_requests.length,
    serverTime: new Date().toISOString()
  });
});

router.post('/system/reset', (req, res) => {
  const freshDb = resetStore();
  res.json({ message: 'Database reset to initial BSI seed successfully', freshDb });
});

// -------------------------------------------------------------
// AUTH & ONBOARDING (LIFF)
// -------------------------------------------------------------
router.get('/auth/me', (req, res) => {
  const db = getDb();
  const lineUserId = req.query.lineUserId;
  if (!lineUserId) return res.status(400).json({ error: 'lineUserId is required' });

  const doctor = db.doctors.find(d => d.line_user_id === lineUserId);
  res.json({ doctor: doctor || null });
});

// Seed/Reset Mock Test Data on demand
router.post('/mock/seed', async (req, res) => {
  try {
    const { generateMockData } = await import('../seed_mock_data.js');
    const result = await generateMockData();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search doctors by name or phone or employeeId or licenseNo for Onboarding
router.get('/auth/search-doctors', (req, res) => {
  const db = getDb();
  const query = (req.query.query || '').trim().toLowerCase();
  
  const cleanQuery = query.replace(/[^0-9]/g, '');

  let filtered = db.doctors;
  if (query) {
    filtered = db.doctors.filter(d => {
      const fullName = `${d.prefix_th || ''}${d.first_name_th || ''} ${d.last_name_th || ''}`.toLowerCase();
      const empId = (d.employee_id || '').toLowerCase();
      const lic = (d.license_no || '').toLowerCase();
      const phone = (d.phone || '').replace(/[^0-9]/g, '');

      return (
        fullName.includes(query) ||
        empId.includes(query) ||
        lic.includes(query) ||
        (cleanQuery.length >= 3 && phone.includes(cleanQuery))
      );
    });
  }

  const results = filtered.map(d => {
    const dept = db.departments.find(dept => dept.id === d.department_id);
    return {
      id: d.id,
      employee_id: d.employee_id,
      license_no: d.license_no || null,
      prefix_th: d.prefix_th,
      first_name_th: d.first_name_th,
      last_name_th: d.last_name_th,
      doctor_type: d.doctor_type,
      department_name: dept?.name_th || 'ไม่ระบุแผนก',
      phone: d.phone,
      phone_masked: d.phone ? d.phone.replace(/(\d{3})\d{3}(\d{4})/, '$1-xxx-$2') : '-',
      is_linked: !!d.line_user_id,
      line_user_id: d.line_user_id,
      line_display_name: d.line_display_name,
      avatar: d.avatar
    };
  });

  res.json({ doctors: results });
});

router.post('/auth/link', (req, res) => {
  const db = getDb();
  const { lineUserId, doctorId, employeeId, lineDisplayName, linePictureUrl } = req.body;
  if (!lineUserId) {
    return res.status(400).json({ error: 'lineUserId is required' });
  }

  let doctor = null;
  if (doctorId) {
    doctor = db.doctors.find(d => d.id === doctorId);
  } else if (employeeId) {
    doctor = db.doctors.find(d => d.employee_id === employeeId);
  }

  if (!doctor) {
    return res.status(404).json({ error: 'ไม่พบข้อมูลแพทย์ในระบบ' });
  }

  if (doctor.line_user_id && doctor.line_user_id !== lineUserId) {
    return res.status(400).json({ error: 'บัญชีแพทย์ท่านนี้ได้ผูกกับ LINE อื่นไปแล้ว หากต้องการเปลี่ยนกรุณาติดต่อฝ่ายการแพทย์' });
  }

  doctor.line_user_id = lineUserId;
  if (lineDisplayName) doctor.line_display_name = lineDisplayName;
  if (linePictureUrl && !doctor.avatar) doctor.avatar = linePictureUrl;
  
  saveStore();

  if (db.audit_logs) {
    db.audit_logs.push({
      id: uuidv4(),
      table_name: 'doctors',
      record_id: doctor.id,
      action: 'UPDATE',
      actor_id: doctor.id,
      new_data: { line_user_id: lineUserId, line_display_name: lineDisplayName },
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });
  }

  res.json({ success: true, doctor });
});

// Admin unlink doctor LINE
router.post('/doctors/:id/unlink-line', (req, res) => {
  const db = getDb();
  const doctor = db.doctors.find(d => d.id === req.params.id);
  if (!doctor) return res.status(404).json({ error: 'ไม่พบแพทย์' });

  const prevLineId = doctor.line_user_id;
  doctor.line_user_id = null;
  doctor.line_display_name = null;
  saveStore();

  if (db.audit_logs) {
    db.audit_logs.push({
      id: uuidv4(),
      table_name: 'doctors',
      record_id: doctor.id,
      action: 'UPDATE',
      actor_id: req.body.actor_id || null,
      old_data: { line_user_id: prevLineId },
      new_data: { line_user_id: null },
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });
  }

  res.json({ success: true, message: 'ยกเลิกการผูกบัญชี LINE เรียบร้อย' });
});

// -------------------------------------------------------------
// DOCTORS & ROLES
// -------------------------------------------------------------
router.get('/doctors', (req, res) => {
  const db = getDb();
  const currentYear = new Date().getFullYear();

  const results = db.doctors.map(doc => {
    const dept = db.departments.find(d => d.id === doc.department_id);
    const roles = db.doctor_roles.filter(r => r.doctor_id === doc.id).map(r => r.role);
    const balances = db.leave_balances.filter(b => b.doctor_id === doc.id && b.fiscal_year === currentYear);
    
    return {
      ...doc,
      working_pattern: doc.working_pattern || (doc.doctor_type === 'PART_TIME' ? 'SHIFT_BASED' : 'OFFICE_HOURS'),
      department_name: dept ? dept.name_th : 'ไม่ระบุ',
      department_code: dept ? dept.code : '',
      roles,
      balances
    };
  });

  res.json(results);
});

router.get('/doctors/:id', (req, res) => {
  const db = getDb();
  const currentYear = new Date().getFullYear();
  const doc = db.doctors.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Doctor not found' });

  const dept = db.departments.find(d => d.id === doc.department_id);
  const roles = db.doctor_roles.filter(r => r.doctor_id === doc.id).map(r => r.role);

  // Compute remaining balances
  const balances = db.leave_balances
    .filter(b => b.doctor_id === doc.id && b.fiscal_year === currentYear)
    .map(b => {
      const lt = db.leave_types.find(t => t.id === b.leave_type_id);
      const total = Number(b.entitlement_days) + Number(b.carried_over_days);
      const remaining = total - Number(b.used_days) - Number(b.pending_days);
      return {
        ...b,
        leave_type_code: lt ? lt.code : '',
        leave_type_name: lt ? lt.name_th : '',
        total_quota: total,
        remaining_days: Math.max(0, remaining)
      };
    });

  res.json({
    ...doc,
    department: dept,
    roles,
    balances
  });
});

// Helper to sync approval routes for a single doctor or entire department
function syncDoctorApprovalRoute(db, doc, dept) {
  if (!doc || !dept || doc.employee_id === 'EMP-KOONG') return;
  const roles = (db.doctor_roles || []).filter(r => r.doctor_id === doc.id).map(r => r.role);
  if (!roles.includes('DOCTOR') && !roles.includes('DEPT_HEAD')) return;

  const finalApproverId = dept.final_approver_id || 'c0000000-0000-0000-0000-000000000099';
  const headDoctorId = dept.head_doctor_id || null;
  const isHead = roles.includes('DEPT_HEAD') || doc.id === headDoctorId;

  // Remove old routes for this doctor
  db.approval_routes = (db.approval_routes || []).filter(r => r.doctor_id !== doc.id);

  if (doc.id === finalApproverId) return;

  if (isHead || !headDoctorId) {
    db.approval_routes.push({
      id: uuidv4(),
      doctor_id: doc.id,
      step_order: 1,
      approver_id: finalApproverId,
      is_active: true,
      created_at: new Date().toISOString()
    });
  } else {
    db.approval_routes.push({
      id: uuidv4(),
      doctor_id: doc.id,
      step_order: 1,
      approver_id: headDoctorId,
      is_active: true,
      created_at: new Date().toISOString()
    });
    if (finalApproverId && finalApproverId !== headDoctorId) {
      db.approval_routes.push({
        id: uuidv4(),
        doctor_id: doc.id,
        step_order: 2,
        approver_id: finalApproverId,
        is_active: true,
        created_at: new Date().toISOString()
      });
    }
  }
}

// POST /api/doctors - Add single doctor
router.post('/doctors', (req, res) => {
  const db = getDb();
  const {
    prefix_th = 'นพ.',
    first_name_th,
    last_name_th,
    employee_id,
    license_no,
    department_id,
    specialty_group = null,
    doctor_type = 'FULL_TIME',
    hire_date,
    phone = '',
    email = '',
    position = '',
    role = 'DOCTOR',
    actor_id
  } = req.body;

  if (!first_name_th || !last_name_th || !department_id) {
    return res.status(400).json({ error: 'กรุณาระบุชื่อ-นามสกุล และแผนกของแพทย์' });
  }

  const cleanEmpId = (employee_id || `DOC-${Date.now().toString().slice(-4)}`).trim();
  if (db.doctors.some(d => d.employee_id === cleanEmpId)) {
    return res.status(400).json({ error: `รหัสพนักงาน '${cleanEmpId}' มีอยู่ในระบบแล้ว` });
  }

  const dept = db.departments.find(d => d.id === department_id);
  const newDoc = {
    id: uuidv4(),
    employee_id: cleanEmpId,
    license_no: license_no ? license_no.trim() : null,
    line_user_id: null,
    prefix_th: prefix_th.trim(),
    first_name_th: first_name_th.trim(),
    last_name_th: last_name_th.trim(),
    position: position ? position.trim() : (role === 'DEPT_HEAD' ? `หัวหน้าแผนก${dept?.name_th || ''}` : `แพทย์ประจำแผนก${dept?.name_th || ''}`),
    doctor_type: doctor_type === 'PART_TIME' ? 'PART_TIME' : 'FULL_TIME',
    department_id,
    specialty_group: specialty_group || null,
    phone: phone ? phone.trim() : '',
    email: email ? email.trim() : '',
    hire_date: hire_date || getTodayString(),
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  };

  db.doctors.push(newDoc);

  // Roles
  db.doctor_roles.push({ id: uuidv4(), doctor_id: newDoc.id, role: 'DOCTOR' });
  if (role === 'DEPT_HEAD') {
    db.doctor_roles.push({ id: uuidv4(), doctor_id: newDoc.id, role: 'DEPT_HEAD' });
    if (dept) {
      dept.head_doctor_id = newDoc.id;
    }
  }

  // Provision leave balances
  const currentYear = new Date().getFullYear();
  db.leave_types.forEach(lt => {
    let entitlement = 0;
    if (lt.code === 'VACATION') entitlement = newDoc.doctor_type === 'PART_TIME' ? 0 : 20;
    else if (lt.code === 'SICK') entitlement = 30;
    else if (lt.code === 'ORDINATION') entitlement = 120;
    else if (lt.code === 'MATERNITY') entitlement = 90;
    else if (lt.code === 'UNPAID') entitlement = 30;

    db.leave_balances.push({
      id: uuidv4(),
      doctor_id: newDoc.id,
      leave_type_id: lt.id,
      fiscal_year: currentYear,
      entitlement_days: entitlement,
      carried_over_days: 0,
      used_days: 0,
      pending_days: 0,
      updated_at: new Date().toISOString()
    });
  });

  // Sync approval routes
  if (dept) {
    if (role === 'DEPT_HEAD') {
      db.doctors.filter(d => d.department_id === dept.id).forEach(d => syncDoctorApprovalRoute(db, d, dept));
    } else {
      syncDoctorApprovalRoute(db, newDoc, dept);
    }
  }

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'doctors',
    record_id: newDoc.id,
    action: 'INSERT',
    actor_id: actor_id || null,
    new_data: { name: `${newDoc.prefix_th}${newDoc.first_name_th} ${newDoc.last_name_th}`, employee_id: newDoc.employee_id },
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.status(201).json({ message: 'เพิ่มรายชื่อแพทย์สำเร็จ', doctor: newDoc });
});

// PUT /api/doctors/:id - Update doctor profile
router.put('/doctors/:id', (req, res) => {
  const db = getDb();
  const doc = db.doctors.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'ไม่พบข้อมูลแพทย์' });

  const {
    prefix_th,
    first_name_th,
    last_name_th,
    employee_id,
    license_no,
    department_id,
    specialty_group,
    doctor_type,
    hire_date,
    phone,
    email,
    position,
    is_active,
    role,
    actor_id
  } = req.body;

  if (prefix_th !== undefined) doc.prefix_th = prefix_th.trim();
  if (first_name_th !== undefined) doc.first_name_th = first_name_th.trim();
  if (last_name_th !== undefined) doc.last_name_th = last_name_th.trim();
  if (employee_id !== undefined) doc.employee_id = employee_id.trim();
  if (license_no !== undefined) doc.license_no = license_no ? license_no.trim() : null;
  if (department_id !== undefined) doc.department_id = department_id;
  if (specialty_group !== undefined) doc.specialty_group = specialty_group || null;
  if (doctor_type !== undefined) doc.doctor_type = doctor_type;
  if (hire_date !== undefined) doc.hire_date = hire_date;
  if (phone !== undefined) doc.phone = phone.trim();
  if (email !== undefined) doc.email = email.trim();
  if (position !== undefined) doc.position = position.trim();
  if (is_active !== undefined) doc.is_active = Boolean(is_active);

  if (role && doc.employee_id !== 'EMP-KOONG') {
    const hasHead = db.doctor_roles.some(r => r.doctor_id === doc.id && r.role === 'DEPT_HEAD');
    if (role === 'DEPT_HEAD' && !hasHead) {
      db.doctor_roles.push({ id: uuidv4(), doctor_id: doc.id, role: 'DEPT_HEAD' });
    } else if (role === 'DOCTOR' && hasHead) {
      db.doctor_roles = db.doctor_roles.filter(r => !(r.doctor_id === doc.id && r.role === 'DEPT_HEAD'));
    }
  }

  const dept = db.departments.find(d => d.id === doc.department_id);
  if (dept) {
    syncDoctorApprovalRoute(db, doc, dept);
  }

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'doctors',
    record_id: doc.id,
    action: 'UPDATE',
    actor_id: actor_id || null,
    new_data: { name: `${doc.prefix_th}${doc.first_name_th} ${doc.last_name_th}`, department_id: doc.department_id, specialty_group: doc.specialty_group },
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json({ message: 'แก้ไขข้อมูลแพทย์สำเร็จ', doctor: doc });
});

// DELETE /api/doctors/:id - Delete doctor
router.delete('/doctors/:id', (req, res) => {
  const db = getDb();
  const idx = db.doctors.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'ไม่พบข้อมูลแพทย์' });

  const deleted = db.doctors[idx];
  if (deleted.employee_id === 'EMP-KOONG' || deleted.employee_id === 'EXEC-PARIWAT') {
    return res.status(400).json({ error: 'ไม่สามารถลบบัญชีผู้บริหารหรือผู้ดูแลระบบหลักได้' });
  }

  db.doctors.splice(idx, 1);
  db.doctor_roles = (db.doctor_roles || []).filter(r => r.doctor_id !== deleted.id);
  db.approval_routes = (db.approval_routes || []).filter(r => r.doctor_id !== deleted.id && r.approver_id !== deleted.id);
  db.leave_balances = (db.leave_balances || []).filter(b => b.doctor_id !== deleted.id);

  saveStore();
  res.json({ message: 'ลบรายชื่อแพทย์เรียบร้อยแล้ว', id: deleted.id });
});

// POST /api/doctors/bulk-import - Import multiple doctors from Excel/CSV
router.post('/doctors/bulk-import', (req, res) => {
  const db = getDb();
  const { doctors: rows = [], actor_id } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'ไม่พบข้อมูลรายชื่อแพทย์ที่ต้องการนำเข้า' });
  }

  const currentYear = new Date().getFullYear();
  let importedCount = 0;
  let updatedCount = 0;
  const errors = [];

  rows.forEach((row, index) => {
    const firstName = (row.first_name_th || '').trim();
    const lastName = (row.last_name_th || '').trim();
    if (!firstName) {
      errors.push(`แถวที่ ${index + 1}: ไม่ระบุชื่อแพทย์`);
      return;
    }

    // Match department by id, code, or Thai name
    const deptKey = (row.department || row.department_code || row.department_id || '').trim();
    let dept = db.departments.find(dp =>
      dp.id === deptKey ||
      dp.code.toLowerCase() === deptKey.toLowerCase() ||
      dp.name_th.includes(deptKey) ||
      deptKey.includes(dp.name_th)
    );
    if (!dept) {
      dept = db.departments[0];
    }

    // Match specialty_group if provided
    let specGroup = (row.specialty_group || '').trim() || null;
    if (specGroup && dept?.staffing_groups?.length > 0) {
      const matchedGrp = dept.staffing_groups.find(g => g.id.toLowerCase() === specGroup.toLowerCase() || g.name_th.includes(specGroup));
      if (matchedGrp) specGroup = matchedGrp.id;
    }

    const empId = (row.employee_id || `DOC-${Date.now().toString().slice(-4)}-${index + 1}`).trim();
    const existing = db.doctors.find(d =>
      (row.employee_id && d.employee_id === empId) ||
      (d.first_name_th === firstName && d.last_name_th === lastName)
    );

    const docType = (row.doctor_type || '').toUpperCase().includes('PART') || (row.doctor_type || '').includes('พาร์ท') ? 'PART_TIME' : 'FULL_TIME';
    const isHeadRole = (row.role || '').toUpperCase().includes('HEAD') || (row.role || '').includes('หัวหน้า');

    if (existing) {
      existing.prefix_th = (row.prefix_th || existing.prefix_th || 'นพ.').trim();
      existing.first_name_th = firstName;
      existing.last_name_th = lastName;
      if (row.license_no) existing.license_no = String(row.license_no).trim();
      if (dept) existing.department_id = dept.id;
      if (specGroup) existing.specialty_group = specGroup;
      existing.doctor_type = docType;
      if (row.hire_date) existing.hire_date = row.hire_date;
      if (row.phone) existing.phone = String(row.phone).trim();
      syncDoctorApprovalRoute(db, existing, dept);
      updatedCount++;
    } else {
      const newDoc = {
        id: uuidv4(),
        employee_id: empId,
        license_no: row.license_no ? String(row.license_no).trim() : null,
        line_user_id: null,
        prefix_th: (row.prefix_th || 'นพ.').trim(),
        first_name_th: firstName,
        last_name_th: lastName,
        position: isHeadRole ? `หัวหน้าแผนก${dept?.name_th || ''}` : `แพทย์ประจำแผนก${dept?.name_th || ''}`,
        doctor_type: docType,
        department_id: dept ? dept.id : null,
        specialty_group: specGroup,
        phone: row.phone ? String(row.phone).trim() : '',
        email: row.email ? String(row.email).trim() : '',
        hire_date: row.hire_date || getTodayString(),
        is_active: true,
        avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80',
        created_at: new Date().toISOString()
      };
      db.doctors.push(newDoc);
      db.doctor_roles.push({ id: uuidv4(), doctor_id: newDoc.id, role: 'DOCTOR' });
      if (isHeadRole) {
        db.doctor_roles.push({ id: uuidv4(), doctor_id: newDoc.id, role: 'DEPT_HEAD' });
        if (dept) dept.head_doctor_id = newDoc.id;
      }

      db.leave_types.forEach(lt => {
        let entitlement = 0;
        if (lt.code === 'VACATION') entitlement = newDoc.doctor_type === 'PART_TIME' ? 0 : 20;
        else if (lt.code === 'SICK') entitlement = 30;
        else if (lt.code === 'ORDINATION') entitlement = 120;
        else if (lt.code === 'MATERNITY') entitlement = 90;
        else if (lt.code === 'UNPAID') entitlement = 30;

        db.leave_balances.push({
          id: uuidv4(),
          doctor_id: newDoc.id,
          leave_type_id: lt.id,
          fiscal_year: currentYear,
          entitlement_days: entitlement,
          carried_over_days: 0,
          used_days: 0,
          pending_days: 0,
          updated_at: new Date().toISOString()
        });
      });

      syncDoctorApprovalRoute(db, newDoc, dept);
      importedCount++;
    }
  });

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'doctors',
    record_id: 'bulk-import',
    action: 'INSERT',
    actor_id: actor_id || null,
    new_data: { importedCount, updatedCount },
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json({
    message: `นำเข้ารายชื่อแพทย์สำเร็จ (เพิ่มใหม่ ${importedCount} ท่าน, อัปเดต ${updatedCount} ท่าน)`,
    importedCount,
    updatedCount,
    errors
  });
});

// -------------------------------------------------------------
// DEPARTMENTS & QUOTA RULES
// -------------------------------------------------------------
router.get('/departments', (req, res) => {
  const db = getDb();
  const today = getTodayString();

  const results = db.departments.map(dept => {
    // Doctors in dept (excluding HR Admin)
    const deptDoctors = db.doctors.filter(d => d.department_id === dept.id && d.employee_id !== 'EMP-KOONG' && d.is_active !== false);
    
    // On-leave today
    const onLeaveToday = db.leave_requests.filter(req => {
      if (req.status !== 'APPROVED' && req.status !== 'PENDING') return false;
      const doc = deptDoctors.find(d => d.id === req.doctor_id);
      if (!doc) return false;
      return today >= req.start_date && today <= req.end_date;
    });

    const headDoc = dept.head_doctor_id ? db.doctors.find(d => d.id === dept.head_doctor_id) : null;
    const finalDoc = dept.final_approver_id ? db.doctors.find(d => d.id === dept.final_approver_id) : db.doctors.find(d => d.employee_id === 'EXEC-PARIWAT');

    return {
      ...dept,
      staffing_mode: dept.staffing_mode || 'DEPARTMENT',
      staffing_groups: dept.staffing_groups || [],
      head_doctor_name: headDoc ? `${headDoc.prefix_th}${headDoc.first_name_th} ${headDoc.last_name_th}` : 'ไม่ระบุ',
      final_approver_name: finalDoc ? `${finalDoc.prefix_th}${finalDoc.first_name_th} ${finalDoc.last_name_th}` : 'นพ.ปริวรรธน์ ระเด่น',
      doctor_count: deptDoctors.length,
      on_leave_today_count: onLeaveToday.length,
      available_doctors_today: Math.max(0, deptDoctors.length - onLeaveToday.length),
      is_quota_exceeded_today: dept.max_leave_per_day ? onLeaveToday.length >= dept.max_leave_per_day : false
    };
  });

  res.json(results);
});

router.post('/departments', (req, res) => {
  const db = getDb();
  const {
    code,
    name_th,
    name_en = '',
    min_staff_required = 1,
    max_leave_per_day = 2,
    staffing_mode = 'DEPARTMENT',
    staffing_groups = [],
    head_doctor_id = null,
    final_approver_id = 'c0000000-0000-0000-0000-000000000099'
  } = req.body;

  if (!name_th) {
    return res.status(400).json({ error: 'กรุณาระบุชื่อแผนก' });
  }

  const cleanCode = (code || `DEPT_${Date.now().toString().slice(-4)}`).trim().toUpperCase().replace(/\s+/g, '_');
  if (db.departments.some(d => d.code === cleanCode)) {
    return res.status(400).json({ error: `รหัสแผนก '${cleanCode}' มีอยู่ในระบบแล้ว` });
  }

  const newDept = {
    id: uuidv4(),
    code: cleanCode,
    name_th: name_th.trim(),
    name_en: name_en.trim(),
    min_staff_required: Number(min_staff_required) || 0,
    max_leave_per_day: Number(max_leave_per_day) || 2,
    staffing_mode,
    staffing_groups: Array.isArray(staffing_groups) ? staffing_groups : [],
    head_doctor_id: head_doctor_id || null,
    final_approver_id: final_approver_id || 'c0000000-0000-0000-0000-000000000099',
    is_active: true,
    created_at: new Date().toISOString()
  };

  db.departments.push(newDept);
  saveStore();
  res.status(201).json({ message: 'สร้างแผนกใหม่สำเร็จ', department: newDept });
});

router.put('/departments/:id', (req, res) => {
  const db = getDb();
  const dept = db.departments.find(d => d.id === req.params.id);
  if (!dept) return res.status(404).json({ error: 'Department not found' });

  const {
    code,
    name_th,
    name_en,
    min_staff_required,
    max_leave_per_day,
    staffing_mode,
    staffing_groups,
    head_doctor_id,
    final_approver_id
  } = req.body;

  if (code !== undefined && code.trim()) dept.code = code.trim().toUpperCase();
  if (name_th !== undefined) dept.name_th = name_th.trim();
  if (name_en !== undefined) dept.name_en = name_en.trim();
  if (min_staff_required !== undefined) {
    dept.min_staff_required = min_staff_required === '' || min_staff_required === null ? 0 : parseInt(min_staff_required, 10);
  }
  if (max_leave_per_day !== undefined) {
    dept.max_leave_per_day = max_leave_per_day === '' || max_leave_per_day === null ? null : parseInt(max_leave_per_day, 10);
  }
  if (staffing_mode !== undefined) dept.staffing_mode = staffing_mode;
  if (staffing_groups !== undefined) dept.staffing_groups = staffing_groups;

  // If head_doctor_id or final_approver_id updated, sync roles & approval routes for this department
  let shouldSyncRoutes = false;
  if (head_doctor_id !== undefined) {
    const prevHeadId = dept.head_doctor_id;
    dept.head_doctor_id = head_doctor_id || null;
    if (prevHeadId && prevHeadId !== dept.head_doctor_id && prevHeadId !== 'c0000000-0000-0000-0000-000000000099') {
      db.doctor_roles = (db.doctor_roles || []).filter(r => !(r.doctor_id === prevHeadId && r.role === 'DEPT_HEAD'));
    }
    if (dept.head_doctor_id) {
      const hasHeadRole = (db.doctor_roles || []).some(r => r.doctor_id === dept.head_doctor_id && r.role === 'DEPT_HEAD');
      if (!hasHeadRole) {
        db.doctor_roles.push({ id: uuidv4(), doctor_id: dept.head_doctor_id, role: 'DEPT_HEAD' });
      }
    }
    shouldSyncRoutes = true;
  }
  if (final_approver_id !== undefined) {
    dept.final_approver_id = final_approver_id || 'c0000000-0000-0000-0000-000000000099';
    shouldSyncRoutes = true;
  }

  if (shouldSyncRoutes) {
    const deptDoctors = db.doctors.filter(d => d.department_id === dept.id);
    deptDoctors.forEach(doc => syncDoctorApprovalRoute(db, doc, dept));
  }

  saveStore();
  res.json({ message: 'บันทึกการตั้งค่าแผนกเรียบร้อยแล้ว', department: dept });
});

router.delete('/departments/:id', (req, res) => {
  const db = getDb();
  const idx = db.departments.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'ไม่พบแผนกที่ระบุ' });

  const dept = db.departments[idx];
  const assignedDocs = db.doctors.filter(d => d.department_id === dept.id && d.employee_id !== 'EMP-KOONG');
  if (assignedDocs.length > 0) {
    return res.status(400).json({ error: `ไม่สามารถลบแผนกได้ เนื่องจากยังมีแพทย์สังกัดอยู่ในแผนกนี้ (${assignedDocs.length} ท่าน) กรุณาย้ายแผนกของแพทย์ก่อน` });
  }

  db.departments.splice(idx, 1);
  saveStore();
  res.json({ message: 'ลบแผนกเรียบร้อยแล้ว', id: dept.id });
});

// -------------------------------------------------------------
// -------------------------------------------------------------
// LEAVE TYPES (PHASE 4 - ITEM 25)
// -------------------------------------------------------------
router.get('/leave-types', (req, res) => {
  const db = getDb();
  const { doctorType, includeAll } = req.query;
  
  let types = includeAll === 'true' ? [...db.leave_types] : db.leave_types.filter(t => t.is_active);
  if (doctorType === 'PART_TIME') {
    types = types.filter(t => !t.is_full_time_only);
  }

  res.json(types.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
});

// POST /api/leave-types - Add new leave type
router.post('/leave-types', (req, res) => {
  const db = getDb();
  const {
    code,
    name_th,
    name_en,
    count_mode = 'WORKING_DAYS',
    allows_half_day = true,
    requires_attachment = false,
    attachment_threshold_days = 2.0,
    attachment_deadline_days = 3,
    min_notice_days = 0,
    max_days_per_request,
    allows_backdate = false,
    is_full_time_only = false,
    color = '#006699',
    sort_order,
    actor_id
  } = req.body;

  if (!code || !name_th) {
    return res.status(400).json({ error: 'กรุณาระบุรหัสและชื่อประเภทการลา' });
  }

  const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '_');
  if (db.leave_types.some(lt => lt.code === cleanCode)) {
    return res.status(400).json({ error: `รหัสประเภทการลา '${cleanCode}' มีอยู่แล้วในระบบ` });
  }

  const newType = {
    id: uuidv4(),
    code: cleanCode,
    name_th: name_th.trim(),
    name_en: (name_en || '').trim(),
    count_mode: count_mode === 'CALENDAR_DAYS' ? 'CALENDAR_DAYS' : 'WORKING_DAYS',
    allows_half_day: Boolean(allows_half_day),
    requires_attachment: Boolean(requires_attachment),
    attachment_threshold_days: Number(attachment_threshold_days) || 0,
    attachment_deadline_days: Number(attachment_deadline_days) || 3,
    min_notice_days: Number(min_notice_days) || 0,
    max_days_per_request: max_days_per_request ? Number(max_days_per_request) : null,
    allows_backdate: Boolean(allows_backdate),
    is_full_time_only: Boolean(is_full_time_only),
    color: color || '#006699',
    sort_order: Number(sort_order) || (db.leave_types.length + 1),
    is_active: true
  };

  db.leave_types.push(newType);

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'leave_types',
    record_id: newType.id,
    action: 'INSERT',
    actor_id: actor_id || null,
    new_data: newType,
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.status(201).json(newType);
});

// PUT /api/leave-types/:id - Update leave type
router.put('/leave-types/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const index = db.leave_types.findIndex(lt => lt.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'ไม่พบประเภทการลาที่ระบุ' });
  }

  const oldData = { ...db.leave_types[index] };
  const updates = req.body;

  if (updates.name_th) db.leave_types[index].name_th = updates.name_th.trim();
  if (updates.name_en !== undefined) db.leave_types[index].name_en = updates.name_en.trim();
  if (updates.count_mode) db.leave_types[index].count_mode = updates.count_mode;
  if (updates.allows_half_day !== undefined) db.leave_types[index].allows_half_day = Boolean(updates.allows_half_day);
  if (updates.requires_attachment !== undefined) db.leave_types[index].requires_attachment = Boolean(updates.requires_attachment);
  if (updates.attachment_threshold_days !== undefined) db.leave_types[index].attachment_threshold_days = Number(updates.attachment_threshold_days);
  if (updates.attachment_deadline_days !== undefined) db.leave_types[index].attachment_deadline_days = Number(updates.attachment_deadline_days);
  if (updates.min_notice_days !== undefined) db.leave_types[index].min_notice_days = Number(updates.min_notice_days);
  if (updates.max_days_per_request !== undefined) db.leave_types[index].max_days_per_request = updates.max_days_per_request ? Number(updates.max_days_per_request) : null;
  if (updates.max_requests_per_year !== undefined) db.leave_types[index].max_requests_per_year = updates.max_requests_per_year ? Number(updates.max_requests_per_year) : null;
  if (updates.has_reimbursement_option !== undefined) db.leave_types[index].has_reimbursement_option = Boolean(updates.has_reimbursement_option);
  if (updates.min_tenure_months !== undefined) db.leave_types[index].min_tenure_months = updates.min_tenure_months ? Number(updates.min_tenure_months) : 0;
  if (updates.min_work_days_in_month !== undefined) db.leave_types[index].min_work_days_in_month = updates.min_work_days_in_month ? Number(updates.min_work_days_in_month) : 0;
  if (updates.allows_backdate !== undefined) db.leave_types[index].allows_backdate = Boolean(updates.allows_backdate);
  if (updates.is_full_time_only !== undefined) db.leave_types[index].is_full_time_only = Boolean(updates.is_full_time_only);
  if (updates.color) db.leave_types[index].color = updates.color;
  if (updates.is_active !== undefined) db.leave_types[index].is_active = Boolean(updates.is_active);
  if (updates.sort_order !== undefined) db.leave_types[index].sort_order = Number(updates.sort_order);

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'leave_types',
    record_id: id,
    action: 'UPDATE',
    actor_id: updates.actor_id || null,
    old_data: oldData,
    new_data: db.leave_types[index],
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json(db.leave_types[index]);
});

// DELETE /api/leave-types/:id - Delete or disable
router.delete('/leave-types/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const index = db.leave_types.findIndex(lt => lt.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'ไม่พบประเภทการลาที่ระบุ' });
  }

  const hasRequests = (db.leave_requests || []).some(lr => lr.leave_type_id === id);
  if (hasRequests) {
    db.leave_types[index].is_active = false;
    saveStore();
    return res.json({ message: 'ปิดการใช้งานประเภทการลาเรียบร้อย (มีประวัติการลาในระบบ)', softDeleted: true });
  }

  const deleted = db.leave_types[index];
  db.leave_types.splice(index, 1);
  saveStore();
  res.json({ message: 'ลบประเภทการลาสำเร็จ', id });
});

// -------------------------------------------------------------
// BALANCES
// -------------------------------------------------------------
router.get('/balances/:doctorId', (req, res) => {
  const db = getDb();
  const currentYear = new Date().getFullYear();
  const doctorId = req.params.doctorId;

  const doc = db.doctors.find(d => d.id === doctorId);
  if (!doc) return res.status(404).json({ error: 'Doctor not found' });

  // Find or provision balances for all active leave types
  const activeTypes = db.leave_types.filter(lt => {
    if (!lt.is_active) return false;
    if (doc.doctor_type === 'PART_TIME' && lt.is_full_time_only) return false;
    return true;
  });

  let hasNew = false;
  const balances = activeTypes.map(lt => {
    let b = db.leave_balances.find(b => b.doctor_id === doctorId && b.leave_type_id === lt.id && b.fiscal_year === currentYear);
    if (!b) {
      let defaultEntitlement = 0;
      if (lt.code === 'VACATION') defaultEntitlement = doc.doctor_type === 'PART_TIME' ? 0 : 20;
      else if (lt.code === 'SICK') defaultEntitlement = 30;
      else if (lt.code === 'ORDINATION') defaultEntitlement = 120;
      else if (lt.code === 'MATERNITY') defaultEntitlement = 90;
      else if (lt.code === 'UNPAID') defaultEntitlement = 30;

      b = {
        id: uuidv4(),
        doctor_id: doctorId,
        leave_type_id: lt.id,
        fiscal_year: currentYear,
        entitlement_days: defaultEntitlement,
        carried_over_days: 0,
        used_days: 0,
        pending_days: 0,
        updated_at: new Date().toISOString()
      };
      db.leave_balances.push(b);
      hasNew = true;
    }

    const requestCountThisYear = (db.leave_requests || []).filter(r =>
      r.doctor_id === doctorId &&
      r.leave_type_id === lt.id &&
      (r.status === 'PENDING' || r.status === 'APPROVED') &&
      new Date(r.start_date).getFullYear() === currentYear
    ).length;

    const total = Number(b.entitlement_days) + Number(b.carried_over_days);
    const remaining = total - Number(b.used_days) - Number(b.pending_days);
    return {
      ...b,
      leave_type_code: lt.code,
      leave_type_name: lt.name_th,
      total_quota: total,
      remaining_days: Math.max(0, remaining),
      request_count_this_year: requestCountThisYear,
      max_requests_per_year: lt.max_requests_per_year || null
    };
  });

  if (hasNew) {
    saveStore();
  }

  res.json(balances);
});

router.put('/balances/:doctorId', (req, res) => {
  const db = getDb();
  const doctorId = req.params.doctorId;
  const { leave_type_id, entitlement_days, carried_over_days, fiscal_year, balances } = req.body;
  const year = fiscal_year || new Date().getFullYear();

  // Support Batch Update from Admin UI
  if (Array.isArray(balances)) {
    const updated = [];
    balances.forEach(item => {
      if (!item.leave_type_id) return;
      let bal = db.leave_balances.find(b => b.doctor_id === doctorId && b.leave_type_id === item.leave_type_id && b.fiscal_year === year);
      const ent = parseFloat(item.entitlement_days);
      const carry = parseFloat(item.carried_over_days) || 0;

      if (!bal) {
        if (!isNaN(ent)) {
          bal = {
            id: uuidv4(),
            doctor_id: doctorId,
            leave_type_id: item.leave_type_id,
            fiscal_year: year,
            entitlement_days: ent,
            carried_over_days: carry,
            used_days: 0,
            pending_days: 0,
            updated_at: new Date().toISOString()
          };
          db.leave_balances.push(bal);
          updated.push(bal);
        }
      } else {
        if (!isNaN(ent)) bal.entitlement_days = ent;
        if (!isNaN(carry)) bal.carried_over_days = carry;
        bal.updated_at = new Date().toISOString();
        updated.push(bal);
      }
    });

    saveStore();
    return res.json({ message: 'Balances updated successfully', balances: updated });
  }

  // Single balance update
  let bal = db.leave_balances.find(b => b.doctor_id === doctorId && b.leave_type_id === leave_type_id && b.fiscal_year === year);
  if (!bal) {
    bal = {
      id: uuidv4(),
      doctor_id: doctorId,
      leave_type_id,
      fiscal_year: year,
      entitlement_days: parseFloat(entitlement_days) || 0,
      carried_over_days: parseFloat(carried_over_days) || 0,
      used_days: 0,
      pending_days: 0,
      updated_at: new Date().toISOString()
    };
    db.leave_balances.push(bal);
  } else {
    if (entitlement_days !== undefined) bal.entitlement_days = parseFloat(entitlement_days);
    if (carried_over_days !== undefined) bal.carried_over_days = parseFloat(carried_over_days);
    bal.updated_at = new Date().toISOString();
  }

  saveStore();
  res.json({ message: 'Balance updated', balance: bal });
});

// -------------------------------------------------------------
// DEPARTMENT QUOTA CHECK
// -------------------------------------------------------------
router.get('/quota-check', (req, res) => {
  const db = getDb();
  const { departmentId, date, doctorId } = req.query;

  if (!departmentId || !date) {
    return res.status(400).json({ error: 'departmentId and date are required' });
  }

  const dept = db.departments.find(d => d.id === departmentId);
  if (!dept) return res.status(404).json({ error: 'Department not found' });

  // Look up doctor if provided (to see if they belong to a specific specialty group)
  const requestingDoctor = doctorId ? db.doctors.find(d => d.id === doctorId) : null;
  let targetGroup = null;
  if (dept.staffing_mode === 'GROUP' && dept.staffing_groups?.length > 0 && requestingDoctor?.specialty_group) {
    targetGroup = dept.staffing_groups.find(g => g.id === requestingDoctor.specialty_group);
  }

  // Only count actual doctors in this department / specialty group (exclude Medical Admin staff like EMP-KOONG)
  const poolDoctors = db.doctors.filter(d => {
    if (d.department_id !== departmentId || d.is_active === false) return false;
    if (d.employee_id === 'EMP-KOONG') return false;
    if (targetGroup && d.specialty_group !== targetGroup.id) return false;
    const roles = db.doctor_roles.filter(r => r.doctor_id === d.id).map(r => r.role);
    return roles.includes('DOCTOR') || roles.includes('DEPT_HEAD');
  });
  const totalDoctors = poolDoctors.length;
  const minRequired = targetGroup ? targetGroup.min_staff_required : dept.min_staff_required;
  const scopeName = targetGroup ? targetGroup.name_th : dept.name_th;

  const computeDayAvailability = (targetDate) => {
    const onLeaveReqs = db.leave_requests.filter(r => {
      if (r.status !== 'APPROVED' && r.status !== 'PENDING') return false;
      const doc = poolDoctors.find(d => d.id === r.doctor_id);
      if (!doc) return false;
      return targetDate >= r.start_date && targetDate <= r.end_date;
    });

    const onLeaveDocIds = new Set(onLeaveReqs.map(r => r.doctor_id));
    const currentOnLeave = onLeaveDocIds.size;
    const remainingDoctorsCount = Math.max(0, totalDoctors - currentOnLeave);
    const maxAllowed = dept.max_leave_per_day;

    let isBelowMin = false;
    if (minRequired != null && minRequired > 0 && remainingDoctorsCount < minRequired) {
      isBelowMin = true;
    }
    const isQuotaExceeded = isBelowMin || (maxAllowed && currentOnLeave >= maxAllowed);

    let dayStatus = 'NORMAL';
    if (isQuotaExceeded) {
      dayStatus = 'FULL';
    } else if (
      (minRequired != null && minRequired > 0 && remainingDoctorsCount === minRequired) ||
      (maxAllowed && currentOnLeave === maxAllowed - 1)
    ) {
      dayStatus = 'NEAR_LIMIT';
    }

    const availableDoctors = poolDoctors
      .filter(d => !onLeaveDocIds.has(d.id))
      .map(d => ({
        doctor_id: d.id,
        name: `${d.prefix_th}${d.first_name_th} ${d.last_name_th}`,
        short_name: `${d.prefix_th}${d.first_name_th}`,
        doctor_type: d.doctor_type
      }));

    const onLeaveDoctors = onLeaveReqs.map(r => {
      const doc = poolDoctors.find(d => d.id === r.doctor_id);
      return {
        doctor_id: r.doctor_id,
        name: doc ? `${doc.prefix_th}${doc.first_name_th} ${doc.last_name_th}` : 'แพทย์',
        short_name: doc ? `${doc.prefix_th}${doc.first_name_th}` : 'แพทย์',
        request_no: r.request_no,
        status: r.status
      };
    });

    return {
      date: targetDate,
      total_doctors: totalDoctors,
      current_on_leave: currentOnLeave,
      remaining_doctors_count: remainingDoctorsCount,
      min_staff_required: minRequired,
      max_allowed: maxAllowed,
      is_quota_exceeded: isQuotaExceeded,
      is_below_min: isBelowMin,
      status: dayStatus,
      available_doctors: availableDoctors,
      on_leave_doctors: onLeaveDoctors
    };
  };

  const selectedDayInfo = computeDayAvailability(date);

  // Build full 2-month calendar forecast (1st of current month through last day of next month)
  const nowObj = new Date();
  const firstDayCurMonth = new Date(nowObj.getFullYear(), nowObj.getMonth(), 1);
  const lastDayNextMonth = new Date(nowObj.getFullYear(), nowObj.getMonth() + 2, 0);
  const upcomingDays = [];
  const cursorD = new Date(firstDayCurMonth);
  while (cursorD <= lastDayNextMonth) {
    const yyyy = cursorD.getFullYear();
    const mm = String(cursorD.getMonth() + 1).padStart(2, '0');
    const dd = String(cursorD.getDate()).padStart(2, '0');
    const dStr = `${yyyy}-${mm}-${dd}`;
    upcomingDays.push(computeDayAvailability(dStr));
    cursorD.setDate(cursorD.getDate() + 1);
  }

  res.json({
    department_id: dept.id,
    department_name: dept.name_th,
    specialty_group_id: targetGroup ? targetGroup.id : null,
    specialty_group_name: targetGroup ? targetGroup.name_th : null,
    scope_name: scopeName,
    total_doctors: totalDoctors,
    remaining_doctors_count: selectedDayInfo.remaining_doctors_count,
    max_allowed: dept.max_leave_per_day,
    min_staff_required: minRequired,
    current_on_leave: selectedDayInfo.current_on_leave,
    is_quota_exceeded: selectedDayInfo.is_quota_exceeded,
    is_below_min: selectedDayInfo.is_below_min,
    status: selectedDayInfo.status,
    available_doctors: selectedDayInfo.available_doctors,
    on_leave_doctors: selectedDayInfo.on_leave_doctors,
    upcoming_days: upcomingDays
  });
});

// -------------------------------------------------------------
// LEAVE REQUESTS
// -------------------------------------------------------------
router.get('/leave-requests', (req, res) => {
  const db = getDb();
  const { doctorId, status, departmentId, isEmergency, month, year } = req.query;

  let list = [...db.leave_requests];

  if (doctorId) {
    list = list.filter(r => r.doctor_id === doctorId);
  }
  if (status) {
    list = list.filter(r => r.status === status);
  }
  if (isEmergency !== undefined) {
    const isEmergBool = isEmergency === 'true' || isEmergency === true;
    list = list.filter(r => Boolean(r.is_emergency) === isEmergBool);
  }
  if (departmentId) {
    list = list.filter(r => {
      const doc = db.doctors.find(d => d.id === r.doctor_id);
      return doc && doc.department_id === departmentId;
    });
  }
  if (month && year) {
    const padMonth = String(month).padStart(2, '0');
    const target = `${year}-${padMonth}`;
    list = list.filter(r => r.start_date.startsWith(target) || r.end_date.startsWith(target));
  }

  // Enrich with doctor and leave_type details
  const enriched = list.map(reqItem => {
    const doc = db.doctors.find(d => d.id === reqItem.doctor_id);
    const subDoc = reqItem.substitute_doctor_id ? db.doctors.find(d => d.id === reqItem.substitute_doctor_id) : null;
    const dept = doc ? db.departments.find(dp => dp.id === doc.department_id) : null;
    const leaveType = db.leave_types.find(lt => lt.id === reqItem.leave_type_id);
    const attachments = db.leave_attachments.filter(a => a.request_id === reqItem.id);
    const logs = db.approval_logs.filter(al => al.request_id === reqItem.id);

    return {
      ...reqItem,
      doctor: doc ? {
        id: doc.id,
        employee_id: doc.employee_id,
        name: `${doc.prefix_th}${doc.first_name_th} ${doc.last_name_th}`,
        doctor_type: doc.doctor_type,
        phone: doc.phone,
        department_name: dept ? dept.name_th : '',
        department_id: doc.department_id,
        avatar: doc.avatar
      } : null,
      substitute_doctor: subDoc ? {
        id: subDoc.id,
        employee_id: subDoc.employee_id,
        name: `${subDoc.prefix_th}${subDoc.first_name_th} ${subDoc.last_name_th}`,
        avatar: subDoc.avatar,
        phone: subDoc.phone
      } : null,
      leave_type: leaveType ? {
        id: leaveType.id,
        code: leaveType.code,
        name_th: leaveType.name_th,
        color: leaveType.color
      } : null,
      attachments,
      approval_logs: logs
    };
  });

  // Sort newest first
  enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json(enriched);
});

router.get('/leave-requests/:id', (req, res) => {
  const db = getDb();
  const reqItem = db.leave_requests.find(r => r.id === req.params.id);
  if (!reqItem) return res.status(404).json({ error: 'Leave request not found' });

  const doc = db.doctors.find(d => d.id === reqItem.doctor_id);
  const subDoc = reqItem.substitute_doctor_id ? db.doctors.find(d => d.id === reqItem.substitute_doctor_id) : null;
  const dept = doc ? db.departments.find(dp => dp.id === doc.department_id) : null;
  const leaveType = db.leave_types.find(lt => lt.id === reqItem.leave_type_id);
  const attachments = db.leave_attachments.filter(a => a.request_id === reqItem.id);
  const logs = db.approval_logs.filter(al => al.request_id === reqItem.id);

  res.json({
    ...reqItem,
    doctor: doc ? {
      id: doc.id,
      employee_id: doc.employee_id,
      name: `${doc.prefix_th}${doc.first_name_th} ${doc.last_name_th}`,
      doctor_type: doc.doctor_type,
      phone: doc.phone,
      department_name: dept ? dept.name_th : '',
      department_id: doc.department_id,
      avatar: doc.avatar
    } : null,
    substitute_doctor: subDoc ? {
      id: subDoc.id,
      employee_id: subDoc.employee_id,
      name: `${subDoc.prefix_th}${subDoc.first_name_th} ${subDoc.last_name_th}`,
      avatar: subDoc.avatar,
      phone: subDoc.phone
    } : null,
    leave_type: leaveType,
    attachments,
    approval_logs: logs
  });
});

// SUBMIT LEAVE REQUEST
router.post('/leave-requests', handleUpload, async (req, res) => {
  try {
    const db = getDb();
    const body = req.body || {};
    const {
      doctor_id,
      leave_type_id,
      start_date,
      end_date,
      half_day_type = 'FULL_DAY',
      reason = '',
      upload_later = 'false',
      submitted_by_admin = 'false',
      substitute_doctor_id = null,
      duty_handover_notes = '',
      reimbursement_requested,
      swap_date = null
    } = body;

    if (!doctor_id || !leave_type_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'doctor_id, leave_type_id, start_date, and end_date are required' });
    }

    const doc = db.doctors.find(d => d.id === doctor_id);
    if (!doc) return res.status(404).json({ error: 'Doctor not found' });

    // Attach department name for Flex Messages
    const dept = db.departments.find(dp => dp.id === doc.department_id);
    doc.department_name = dept ? dept.name_th : 'ไม่ระบุแผนก';

    const leaveType = db.leave_types.find(lt => lt.id === leave_type_id);
    if (!leaveType) return res.status(404).json({ error: 'Leave type not found' });

    // Validate Overlap / Duplicate Check
    const overlaps = db.leave_requests.filter(r => 
      r.doctor_id === doctor_id && 
      (r.status === 'PENDING' || r.status === 'APPROVED') &&
      start_date <= r.end_date && end_date >= r.start_date
    );

    if (overlaps.length > 0) {
      // Check half-day edge case (Morning + Afternoon on the same day)
      const isSameDay = start_date === end_date;
      const hasConflict = overlaps.some(r => {
        if (!isSameDay || r.start_date !== r.end_date) return true; // multi-day overlap is always conflict
        if (r.half_day_type === 'FULL_DAY' || half_day_type === 'FULL_DAY') return true;
        if (r.half_day_type === half_day_type) return true; // Both morning or both afternoon
        return false; // One is morning, one is afternoon -> allow
      });

      if (hasConflict) {
        return res.status(400).json({ error: 'คุณมีรายการลาที่ซ้อนทับกับช่วงเวลานี้อยู่ในระบบแล้ว (รออนุมัติ หรือ อนุมัติแล้ว)' });
      }
    }

    // Validate Full-time only check
    if (doc.doctor_type === 'PART_TIME' && leaveType.is_full_time_only) {
      return res.status(400).json({
        error: `แพทย์พาร์ทไทม์ (Part-time) ไม่สามารถยื่น${leaveType.name_th}ได้ มีสิทธิ์เฉพาะ 'ลาไม่รับค่าตอบแทน / งดออกตรวจ'`
      });
    }

    // Calculate duration
    let durationDays = 1.0;
    if (half_day_type === 'MORNING' || half_day_type === 'AFTERNOON') {
      durationDays = 0.5;
    } else {
      const holidays = db.holidays || [];
      const shifts = (db.doctor_shifts || []).filter(s =>
        s.doctor_id === doctor_id &&
        s.shift_date >= start_date &&
        s.shift_date <= end_date &&
        s.status === 'SCHEDULED'
      );
      durationDays = calculateDays(start_date, end_date, leaveType.count_mode, holidays, doc, shifts);
    }

    if (durationDays === 0) {
      return res.status(400).json({ error: 'วันที่เลือกตรงกับวันหยุดทั้งหมด (ไม่นับเป็นวันลา)' });
    }

    // Emergency check: start_date is today
    const today = getTodayString();
    const isEmergency = start_date === today;

    // Shift Swap Rule: ลาสลับวันออกตรวจ ลาล่วงหน้าได้แค่เดือนนี้กับเดือนหน้าพอ
    if (leaveType.code === 'SHIFT_SWAP' && submitted_by_admin !== 'true') {
      const nowD = new Date();
      const maxSwapObj = new Date(nowD.getFullYear(), nowD.getMonth() + 2, 0);
      const maxSwapStr = `${maxSwapObj.getFullYear()}-${String(maxSwapObj.getMonth() + 1).padStart(2, '0')}-${String(maxSwapObj.getDate()).padStart(2, '0')}`;
      if (start_date > maxSwapStr || (swap_date && swap_date > maxSwapStr)) {
        return res.status(400).json({
          error: `การลาสลับวันออกตรวจ สามารถเลือกวันหยุดและวันสลับตรวจได้เฉพาะภายในเดือนนี้และเดือนหน้าเท่านั้น (ไม่เกินวันที่ ${maxSwapStr})`
        });
      }
    }

    // 1. Backdate Check (บันทึกก่อนลาเท่านั้น สำหรับประเภทที่ไม่อนุญาตให้บันทึกลาย้อนหลัง)
    if (!leaveType.allows_backdate && start_date < today && submitted_by_admin !== 'true') {
      return res.status(400).json({
        error: `การ${leaveType.name_th}ต้องบันทึกก่อนลาเท่านั้น (ไม่อนุญาตให้บันทึกลาย้อนหลัง)`
      });
    }

    // 2. Advance Notice Days Check (ส่งวันลาล่วงหน้าอย่างน้อย X วัน ตามปฏิทิน)
    const [tY, tM, tD] = today.split('-').map(Number);
    const [sY, sM, sD] = start_date.split('-').map(Number);
    const diffCalendarDays = Math.round((new Date(sY, sM - 1, sD) - new Date(tY, tM - 1, tD)) / 86400000);
    if (leaveType.min_notice_days > 0 && submitted_by_admin !== 'true') {
      if (diffCalendarDays < leaveType.min_notice_days) {
        return res.status(400).json({
          error: `การ${leaveType.name_th}ต้องบันทึกและส่งวันลาล่วงหน้าอย่างน้อย ${leaveType.min_notice_days} วันก่อนวันเริ่มลา`
        });
      }
    }

    // 3. Max Consecutive Days Check (ทั้งในคำขอเดียว และต่อเนื่องกันทั้งในเดือน/คร่อมเดือน)
    if (leaveType.max_days_per_request && submitted_by_admin !== 'true') {
      const maxDays = Number(leaveType.max_days_per_request);
      if (durationDays > maxDays) {
        return res.status(400).json({
          error: `การ${leaveType.name_th} กำหนดให้ลาต่อเนื่องได้ไม่เกิน ${maxDays} วัน (คำขอนี้รวม ${durationDays} วัน)`
        });
      }

      // Check contiguous requests (both within month and across months)
      const sameTypeActiveReqs = db.leave_requests.filter(r =>
        r.doctor_id === doctor_id &&
        r.leave_type_id === leave_type_id &&
        (r.status === 'PENDING' || r.status === 'APPROVED') &&
        r.half_day_type === 'FULL_DAY'
      );
      if (half_day_type === 'FULL_DAY' && sameTypeActiveReqs.length > 0) {
        const intervals = [
          ...sameTypeActiveReqs.map(r => ({ start: r.start_date, end: r.end_date })),
          { start: start_date, end: end_date }
        ].sort((a, b) => a.start.localeCompare(b.start));

        const merged = [];
        for (const item of intervals) {
          if (merged.length === 0) {
            merged.push({ ...item });
          } else {
            const prev = merged[merged.length - 1];
            const prevEndPlus1 = new Date(new Date(prev.end).getTime() + 86400000).toISOString().split('T')[0];
            if (item.start <= prevEndPlus1) {
              if (item.end > prev.end) prev.end = item.end;
            } else {
              merged.push({ ...item });
            }
          }
        }

        const targetMerged = merged.find(m => m.start <= start_date && m.end >= end_date);
        if (targetMerged) {
          const mergedDays = calculateDays(targetMerged.start, targetMerged.end, 'CALENDAR_DAYS');
          if (mergedDays > maxDays) {
            return res.status(400).json({
              error: `การ${leaveType.name_th} ลาต่อเนื่องได้ไม่เกิน ${maxDays} วัน ทั้งในเดือนและคร่อมเดือน (เมื่อรวมกับวันลาที่ต่อเนื่องกันจะเป็น ${mergedDays} วัน)`
            });
          }
        }
      }
    }

    // 4. Max Requests Per Year Check (เช่น ลาฝึกอบรม/ประชุมวิชาการ ใช้ได้ปีละ 1 ครั้ง)
    let reqYear = new Date(start_date).getFullYear();
    const maxReqPerYear = leaveType.max_requests_per_year || (leaveType.code === 'TRAINING' ? 1 : null);
    if (maxReqPerYear && submitted_by_admin !== 'true') {
      const usedTimesThisYear = db.leave_requests.filter(r =>
        r.doctor_id === doctor_id &&
        r.leave_type_id === leave_type_id &&
        (r.status === 'PENDING' || r.status === 'APPROVED') &&
        new Date(r.start_date).getFullYear() === reqYear
      ).length;
      if (usedTimesThisYear >= maxReqPerYear) {
        return res.status(400).json({
          error: `สิทธิ์${leaveType.name_th} ใช้ได้ปีละ ${maxReqPerYear} ครั้งเท่านั้น (ท่านได้ใช้สิทธิ์หรือมีคำขอรออนุมัติในปี ${reqYear} ไปแล้ว)`
        });
      }
    }

    // 5. Minimum Tenure Check (ลาพักร้อน เริ่มใช้งานได้หลังทำงานครบ 6 เดือน เฉพาะ Full-time)
    const minTenureMonths = leaveType.min_tenure_months || (leaveType.code === 'VACATION' ? 6 : 0);
    if (minTenureMonths > 0 && doc.hire_date && submitted_by_admin !== 'true') {
      const hireDate = new Date(doc.hire_date);
      const leaveStart = new Date(start_date);
      const tenureMonths = (leaveStart.getFullYear() - hireDate.getFullYear()) * 12
        + (leaveStart.getMonth() - hireDate.getMonth())
        + (leaveStart.getDate() >= hireDate.getDate() ? 0 : -1);
      if (tenureMonths < minTenureMonths) {
        return res.status(400).json({
          error: `การ${leaveType.name_th} เริ่มใช้งานได้หลังทำงานครบ ${minTenureMonths} เดือน (เฉพาะแพทย์ Full-time)`
        });
      }
    }

    // 6. Minimum Remaining Working Days in Month Check (ลาพักร้อน ต้องมีวันทำงานเหลือไม่น้อยกว่า 15 วัน)
    const minWorkDaysInMonth = leaveType.min_work_days_in_month || (leaveType.code === 'VACATION' ? 15 : 0);
    if (minWorkDaysInMonth > 0 && submitted_by_admin !== 'true') {
      const startObj = new Date(start_date);
      const endObj = new Date(end_date);
      const touchedMonths = new Set();
      const cursor = new Date(startObj.getFullYear(), startObj.getMonth(), 1);
      while (cursor <= endObj) {
        touchedMonths.add(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
        cursor.setMonth(cursor.getMonth() + 1);
      }

      const getLeaveDaysInMonth = (rStartStr, rEndStr, rHalfDay, yearNum, monthIndex) => {
        const mStart = new Date(yearNum, monthIndex, 1);
        const mEnd = new Date(yearNum, monthIndex + 1, 0);
        const [rsY, rsM, rsD] = rStartStr.split('-').map(Number);
        const [reY, reM, reD] = rEndStr.split('-').map(Number);
        const rStart = new Date(rsY, rsM - 1, rsD);
        const rEnd = new Date(reY, reM - 1, reD);
        if (rEnd < mStart || rStart > mEnd) return 0;
        if (rHalfDay === 'MORNING' || rHalfDay === 'AFTERNOON') return 0.5;
        const overlapStart = rStart > mStart ? rStart : mStart;
        const overlapEnd = rEnd < mEnd ? rEnd : mEnd;
        return Math.round((overlapEnd - overlapStart) / 86400000) + 1;
      };

      const activeDoctorReqs = db.leave_requests.filter(r =>
        r.doctor_id === doctor_id &&
        (r.status === 'PENDING' || r.status === 'APPROVED')
      );

      for (const ym of touchedMonths) {
        const [yNum, mNum] = ym.split('-').map(Number);
        const mIdx = mNum - 1;
        const daysInMonth = new Date(yNum, mIdx + 1, 0).getDate();
        let leaveDaysInMonth = getLeaveDaysInMonth(start_date, end_date, half_day_type, yNum, mIdx);
        for (const r of activeDoctorReqs) {
          leaveDaysInMonth += getLeaveDaysInMonth(r.start_date, r.end_date, r.half_day_type, yNum, mIdx);
        }
        const remainingWorkDays = daysInMonth - leaveDaysInMonth;
        if (remainingWorkDays < minWorkDaysInMonth) {
          return res.status(400).json({
            error: `ไม่สามารถยื่น${leaveType.name_th}ได้ เนื่องจากต้องมีวันทำงานเหลือไม่น้อยกว่า ${minWorkDaysInMonth} วันต่อเดือน (ในเดือน ${mNum}/${yNum} จะมีวันทำงานเหลือ ${remainingWorkDays} วัน)`
          });
        }
      }
    }

    // 7. Balance check
    let balanceRecord = db.leave_balances.find(b => b.doctor_id === doctor_id && b.leave_type_id === leave_type_id && b.fiscal_year === reqYear);
    const nonDayQuotaCodes = ['TRAINING', 'PERSONAL', 'SHIFT_SWAP', 'UNPAID'];
    if (balanceRecord) {
      const total = Number(balanceRecord.entitlement_days) + Number(balanceRecord.carried_over_days);
      const remaining = total - Number(balanceRecord.used_days) - Number(balanceRecord.pending_days);
      const enforceDayQuota = !nonDayQuotaCodes.includes(leaveType.code) || total > 0;
      if (enforceDayQuota) {
        if (remaining <= 0) {
          return res.status(400).json({ error: `ไม่สามารถยื่นลาได้ เนื่องจากสิทธิ์${leaveType.name_th}คงเหลือ 0 วัน (โควตาเต็ม)` });
        }
        if (remaining < durationDays) {
          return res.status(400).json({ error: `วันลาคงเหลือไม่พอ (คงเหลือ ${remaining} วัน แต่ต้องการลา ${durationDays} วัน)` });
        }
      }
    }

    // Quota & Minimum Staffing Check
    let isException = false;
    let quotaInfo = null;

    if (dept) {
      let targetGroup = null;
      if (dept.staffing_mode === 'GROUP' && dept.staffing_groups?.length > 0 && doc.specialty_group) {
        targetGroup = dept.staffing_groups.find(g => g.id === doc.specialty_group);
      }
      const minRequired = targetGroup ? targetGroup.min_staff_required : dept.min_staff_required;
      const scopeName = targetGroup ? targetGroup.name_th : dept.name_th;

      const poolDoctors = db.doctors.filter(d => {
        if (d.department_id !== dept.id || d.is_active === false || d.employee_id === 'EMP-KOONG') return false;
        if (targetGroup) return d.specialty_group === targetGroup.id;
        const roles = db.doctor_roles.filter(r => r.doctor_id === d.id).map(r => r.role);
        return roles.includes('DOCTOR') || roles.includes('DEPT_HEAD');
      });
      const totalPoolDoctors = poolDoctors.length;

      // Check across all days in requested range
      let curr = new Date(start_date + 'T00:00:00');
      const endD = new Date((end_date || start_date) + 'T00:00:00');
      let violatedDate = null;
      let violatedRemaining = 0;
      let isBelowMinStaff = false;
      let maxOnLeaveCount = 0;

      while (curr <= endD) {
        const yyyy = curr.getFullYear();
        const mm = String(curr.getMonth() + 1).padStart(2, '0');
        const dd = String(curr.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const onLeavePoolDocIds = new Set(
          db.leave_requests
            .filter(r => (r.status === 'APPROVED' || r.status === 'PENDING') && dateStr >= r.start_date && dateStr <= r.end_date)
            .map(r => r.doctor_id)
            .filter(id => poolDoctors.some(d => d.id === id) && id !== doctor_id)
        );

        const onLeaveCount = onLeavePoolDocIds.size;
        if (onLeaveCount > maxOnLeaveCount) maxOnLeaveCount = onLeaveCount;

        const remainingAfterThisLeave = Math.max(0, totalPoolDoctors - (onLeaveCount + 1));
        if (minRequired != null && minRequired > 0 && remainingAfterThisLeave < minRequired) {
          isBelowMinStaff = true;
          violatedDate = dateStr;
          violatedRemaining = remainingAfterThisLeave;
          break;
        }

        curr.setDate(curr.getDate() + 1);
      }

      isException = isBelowMinStaff || Boolean(dept.max_leave_per_day && maxOnLeaveCount >= dept.max_leave_per_day);
      quotaInfo = {
        dept_name: dept.name_th,
        scope_name: scopeName,
        max_allowed: dept.max_leave_per_day,
        min_staff_required: minRequired,
        current_on_leave: maxOnLeaveCount,
        is_quota_exceeded: isException,
        is_below_min: isBelowMinStaff
      };

      if (isException && submitted_by_admin !== 'true') {
        if (isBelowMinStaff) {
          return res.status(400).json({
            error: `ไม่สามารถยื่นลาได้ เนื่องจากแพทย์${scopeName}จะเหลือเพียง ${violatedRemaining} ท่าน ซึ่งต่ำกว่าเกณฑ์ขั้นต่ำ (${minRequired} ท่าน ในวันที่ ${violatedDate}) กรุณาติดต่อฝ่ายการแพทย์ คุณธัญญธร / พี่กุ้ง (โทร. 089-470-9256) เพื่อพิจารณาบันทึกเป็นกรณีพิเศษ`
          });
        }
        if (dept.max_leave_per_day && maxOnLeaveCount >= dept.max_leave_per_day && !isEmergency) {
          return res.status(400).json({
            error: `โควตาแพทย์ลาของแผนก${dept.name_th}ในวันที่เลือกเต็มแล้ว (${maxOnLeaveCount}/${dept.max_leave_per_day} ท่าน) ไม่สามารถยื่นลาได้`
          });
        }
      }
    }

    // Shift Collision Check (Feature #26)
    const conflictingShifts = (db.doctor_shifts || []).filter(s =>
      s.doctor_id === doctor_id &&
      s.status === 'SCHEDULED' &&
      s.shift_date >= start_date &&
      s.shift_date <= end_date
    );
    const hasShiftConflict = conflictingShifts.length > 0;
    let substituteDoctorName = null;
    if (substitute_doctor_id) {
      const subDoc = db.doctors.find(d => d.id === substitute_doctor_id);
      if (subDoc) {
        substituteDoctorName = `${subDoc.prefix_th}${subDoc.first_name_th} ${subDoc.last_name_th}`;
      }
    }

    // Generate Request Number (Format: LV-YYYY-NNNNN)
    const currentYear = new Date().getFullYear();
    const countThisYear = db.leave_requests.filter(r => r.request_no && r.request_no.includes(`LV-${currentYear}`)).length + 1;
    const requestNo = `LV-${currentYear}-${String(countThisYear).padStart(5, '0')}`;

    const isUploadLater = upload_later === 'true' || upload_later === true;

    // Attachment Requirement Validation (Threshold Rule)
    const isAttachmentMandatory = Boolean(
      leaveType.requires_attachment &&
      (!leaveType.attachment_threshold_days || durationDays > Number(leaveType.attachment_threshold_days))
    );
    const hasFiles = req.files && req.files.length > 0;
    if (isAttachmentMandatory && !hasFiles && !isUploadLater && submitted_by_admin !== 'true') {
      let docRequiredMsg = `การ${leaveType.name_th} (${durationDays} วัน) จำเป็นต้องแนบเอกสารประกอบตามระเบียบ กรุณาแนบไฟล์ หรือเลือกส่งเอกสารตามหลัง`;
      if (leaveType.code === 'SICK') {
        docRequiredMsg = `การลาป่วยตั้งแต่ 3 วันขึ้นไป (${durationDays} วัน) ต้องแนบใบรับรองแพทย์ หรือเลือกแนบเอกสารตามหลัง`;
      } else if (leaveType.code === 'PERSONAL') {
        docRequiredMsg = `การลากิจ (ครอบครัวเสียชีวิต) ต้องแนบใบมรณบัตร หรือเลือกส่งให้เจ้าหน้าที่หลังจบงาน`;
      } else if (leaveType.code === 'UNPAID') {
        docRequiredMsg = `การลาไม่รับค่าตอบแทน ต้องแนบจดหมายเรียนถึงผู้อำนวยการแจ้งถึงเหตุผล`;
      }
      return res.status(400).json({ error: docRequiredMsg });
    }

    const deadlineDays = Number(leaveType?.attachment_deadline_days) || 3;
    const attachmentDueDate = isUploadLater
      ? new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Check if applicant is a Department Head
    const applicantRoles = (db.doctor_roles || [])
      .filter(r => r.doctor_id === doctor_id)
      .map(r => r.role);
    const isDeptHead = applicantRoles.includes('DEPT_HEAD');
    const totalSteps = isDeptHead ? 1 : 2;

    const parsedReimbursement = reimbursement_requested === 'true' || reimbursement_requested === true
      ? true
      : (reimbursement_requested === 'false' || reimbursement_requested === false ? false : null);

    const newRequest = {
        id: uuidv4(),
        request_no: requestNo,
        doctor_id,
        leave_type_id,
        start_date,
        end_date,
        duration_days: durationDays,
        half_day_type,
        reason: sanitizeInput(reason),
        is_emergency: isEmergency,
        is_exception: isException,
        submitted_by_admin: submitted_by_admin === 'true',
        upload_later: isUploadLater,
        attachment_due_date: attachmentDueDate,
        substitute_doctor_id: substitute_doctor_id || null,
        substitute_doctor_name: substituteDoctorName,
        duty_handover_notes: duty_handover_notes ? sanitizeInput(duty_handover_notes) : null,
        reimbursement_requested: parsedReimbursement,
        swap_date: swap_date ? sanitizeInput(swap_date) : null,
        has_shift_conflict: hasShiftConflict,
        status: 'PENDING',
        current_step: 1,
        total_steps: totalSteps,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

    // Automatically cover conflicting shifts if substitute doctor provided
    if (hasShiftConflict && substitute_doctor_id) {
      conflictingShifts.forEach(shift => {
        shift.status = 'COVERED';
        shift.substitute_doctor_id = substitute_doctor_id;
        shift.leave_request_id = newRequest.id;
        shift.notes = `${shift.notes ? shift.notes + ' | ' : ''}มีผู้ปฏิบัติหน้าที่แทนเนื่องจากลา (${requestNo})`;
      });
    }

    // Save attachments if uploaded
    if (req.files && req.files.length > 0) {
      req.files.forEach(f => {
        db.leave_attachments.push({
          id: uuidv4(),
          request_id: newRequest.id,
          file_name: f.originalname,
          storage_path: `/uploads/${f.filename}`,
          file_size_bytes: f.size,
          mime_type: f.mimetype,
          uploaded_at: new Date().toISOString()
        });
      });
    }

    // Sync Balance: increment pending_days
    if (balanceRecord) {
      balanceRecord.pending_days = Number(balanceRecord.pending_days) + durationDays;
      balanceRecord.updated_at = new Date().toISOString();
    } else {
      // Create empty balance record if not existing
      balanceRecord = {
        id: uuidv4(),
        doctor_id,
        leave_type_id,
        fiscal_year: reqYear,
        entitlement_days: 0,
        carried_over_days: 0,
        used_days: 0,
        pending_days: durationDays,
        updated_at: new Date().toISOString()
      };
      db.leave_balances.push(balanceRecord);
    }

    db.leave_requests.push(newRequest);

    // Audit Log
    db.audit_logs.push({
      id: uuidv4(),
      table_name: 'leave_requests',
      record_id: newRequest.id,
      action: 'INSERT',
      actor_id: doctor_id,
      new_data: { request_no: requestNo, status: 'PENDING', is_emergency: isEmergency, is_exception: isException, total_steps: totalSteps },
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });

    saveStore();

    // -------------------------------------------------------------
    // LINE NOTIFICATIONS (1-on-1 Flex Messages)
    // -------------------------------------------------------------
    const appUrl = process.env.APP_URL || 'http://localhost:5173';

    // 1. Send confirmation to Doctor
    const doctorTargetLineId = doc.line_user_id || process.env.TEST_LINE_USER_ID;
    if (doctorTargetLineId) {
      const docFlex = buildDoctorSubmittedFlex(newRequest, doc, leaveType);
      await sendLinePushMessage(doctorTargetLineId, docFlex);
    }

    let lineQuotaError = false;

    // 2. Find Approver and send 1-on-1 Flex Message
    // If regular doctor: Step 1 = Department Head
    // If Dept Head: Step 1 = นพ.ปริวรรธน์ ระเด่น
    const route = db.approval_routes.find(r => r.doctor_id === doctor_id && r.step_order === 1);
    const defaultApproverId = isDeptHead 
      ? 'c0000000-0000-0000-0000-000000000099' // Dr. Pariwat
      : 'c0000000-0000-0000-0000-000000000011'; // Head of Dept (Dr. Thanwa for Med)
    const approverId = route ? route.approver_id : defaultApproverId; 
    const approver = db.doctors.find(d => d.id === approverId);
    const approverTargetLineId = approver?.line_user_id || process.env.TEST_LINE_USER_ID;

    if (approverTargetLineId) {
      const stepToSend = isDeptHead ? 2 : 1;
      const prevName = isDeptHead ? 'ยื่นตรง (หัวหน้าแผนก)' : '';
      const approverFlex = buildApproverRequestFlex(newRequest, doc, leaveType, quotaInfo, appUrl, stepToSend, prevName);
      const resPush = await sendLinePushMessage(approverTargetLineId, approverFlex);
      if (resPush.isQuotaError) {
        lineQuotaError = true;
      }
    }

    // 3. Notify P'Koong (Medical Admin) - "พี่ต้องทราบด้วย"
    const koong = db.doctors.find(d => d.employee_id === 'EMP-KOONG');
    const koongTargetLineId = koong?.line_user_id || process.env.TEST_LINE_USER_ID;
    if (koongTargetLineId) {
      if (isEmergency) {
        const emergFlex = buildEmergencyAlertFlex(newRequest, doc, leaveType, koong?.phone || '076-361888');
        await sendLinePushMessage(koongTargetLineId, emergFlex);
      } else {
        const adminNotifyFlex = buildMedicalAdminNotificationFlex(newRequest, doc, leaveType, 'SUBMITTED', doc.department_name);
        await sendLinePushMessage(koongTargetLineId, adminNotifyFlex);
      }
    }

    res.status(201).json({
      message: 'ยื่นใบลาสำเร็จ ระบบส่งแจ้งเตือนเข้า LINE เรียบร้อยแล้ว',
      request: newRequest,
      quota_warning: isException ? 'คำขอของท่านเกินโควตาประจำวันของแผนก และถูกบันทึกเป็นคำขอข้อยกเว้นพิเศษ' : null,
      is_emergency: isEmergency,
      line_quota_error: lineQuotaError
    });
  } catch (err) {
    console.error('Leave submission error:', err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// CANCEL LEAVE REQUEST
// -------------------------------------------------------------
router.post('/leave-requests/:id/cancel', async (req, res) => {
  try {
    const db = getDb();
    const request = db.leave_requests.find(r => r.id === req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const { doctor_id, reason } = req.body;
    
    // Check permission: doctor himself or Admin
    const actorDoc = db.doctors.find(d => d.id === doctor_id);
    const isAdmin = actorDoc?.roles?.includes('ADMIN') || actorDoc?.roles?.includes('MEDICAL_ADMIN');
    if (request.doctor_id !== doctor_id && !isAdmin) {
      return res.status(403).json({ error: 'คุณไม่มีสิทธิ์ยกเลิกคำขอนี้' });
    }

    if (request.status === 'CANCELLED') {
      return res.status(400).json({ error: 'คำขอนี้ถูกยกเลิกไปแล้ว' });
    }

    const prevStatus = request.status;
    request.status = 'CANCELLED';
    request.cancelled_at = new Date().toISOString();
    request.cancelled_reason = reason ? sanitizeInput(reason) : (isAdmin ? 'ฝ่ายการแพทย์ยกเลิกคำขอ' : 'แพทย์ยกเลิกคำขอด้วยตนเอง');
    request.updated_at = new Date().toISOString();

    // Revert covered shifts back to SCHEDULED
    if (db.doctor_shifts) {
      db.doctor_shifts.forEach(s => {
        if (s.leave_request_id === request.id) {
          s.status = 'SCHEDULED';
          s.substitute_doctor_id = null;
          s.leave_request_id = null;
        }
      });
    }

    // Restore balance if it's deducted from quota
    const leaveType = db.leave_types.find(lt => lt.id === request.leave_type_id);
    if (leaveType && leaveType.deducts_from_quota) {
      const reqYear = new Date(request.start_date).getFullYear();
      const balance = db.leave_balances.find(b => 
        b.doctor_id === request.doctor_id && 
        b.leave_type_id === leaveType.id && 
        b.fiscal_year === reqYear
      );
      if (balance) {
        if (prevStatus === 'PENDING') {
          balance.pending_days = Math.max(0, Number(balance.pending_days) - Number(request.duration_days));
        } else if (prevStatus === 'APPROVED') {
          balance.used_days = Math.max(0, Number(balance.used_days) - Number(request.duration_days));
        }
        balance.updated_at = new Date().toISOString();
      }
    }

    const log = {
      id: uuidv4(),
      request_id: request.id,
      step_order: request.current_step,
      action: 'CANCEL',
      approver_id: doctor_id || request.doctor_id,
      comments: request.cancelled_reason,
      acted_at: new Date().toISOString()
    };
    db.approval_logs.push(log);

    db.audit_logs.push({
      id: uuidv4(),
      table_name: 'leave_requests',
      record_id: request.id,
      action: 'CANCEL',
      actor_id: doctor_id || request.doctor_id,
      new_data: { status: 'CANCELLED', reason: request.cancelled_reason },
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });

    saveStore();

    // Send Cancel Notification to Approver
    const doc = db.doctors.find(d => d.id === request.doctor_id);
    const route = db.approval_routes.find(r => r.doctor_id === request.doctor_id && r.step_order === 1);
    const defaultApproverId = 'c0000000-0000-0000-0000-000000000002'; // Dr. Paravee default
    const approverId = route ? route.approver_id : defaultApproverId; 
    const approver = db.doctors.find(d => d.id === approverId);

    const cancelTargetLineId = approver?.line_user_id || process.env.TEST_LINE_USER_ID;
    if (cancelTargetLineId) {
      const flex = buildCancelAlertFlex(request, doc, leaveType);
      await sendLinePushMessage(cancelTargetLineId, flex);
    }

    res.json({ success: true, message: 'ยกเลิกคำขอลาและคืนสิทธิ์เรียบร้อยแล้ว', request });
  } catch (err) {
    console.error('Cancel Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -------------------------------------------------------------
// POST /leave-requests/:id/attachments - Late Attachment Upload
// -------------------------------------------------------------
router.post('/leave-requests/:id/attachments', handleUpload, async (req, res) => {
  try {
    const db = getDb();
    const request = db.leave_requests.find(r => r.id === req.params.id);
    if (!request) return res.status(404).json({ error: 'ไม่พบใบลาที่ระบุ' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'กรุณาเลือกไฟล์เอกสารที่ต้องการแนบ' });
    }

    const added = [];
    req.files.forEach(f => {
      const att = {
        id: uuidv4(),
        request_id: request.id,
        file_name: f.originalname,
        storage_path: `/uploads/${f.filename}`,
        file_size_bytes: f.size,
        mime_type: f.mimetype,
        uploaded_at: new Date().toISOString()
      };
      db.leave_attachments.push(att);
      added.push(att);
    });

    request.upload_later = false;
    request.updated_at = new Date().toISOString();

    // Audit Log
    db.audit_logs.push({
      id: uuidv4(),
      table_name: 'leave_attachments',
      record_id: request.id,
      action: 'LATE_ATTACHMENT_UPLOAD',
      actor_id: request.doctor_id,
      new_data: { file_count: added.length, files: added.map(a => a.file_name) },
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });

    saveStore();
    res.json({ success: true, message: 'แนบเอกสารย้อนหลังสำเร็จ', attachments: added, request });
  } catch (err) {
    console.error('Late Attachment Upload Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// APPROVAL ACTIONS & MULTI-STEP FLOW ENGINE
// -------------------------------------------------------------

/**
 * Universal Approval Processor for both Web/LIFF and LINE 1-Click
 * Flow: Doctor >> Step 1: Head of Department >> Step 2: Dr. Pariwat (Asst Director)
 * P'Koong (Medical Admin) is notified at every milestone ("พี่ต้องทราบด้วย")
 * Requesting doctor is notified of progress and final decision
 */
export async function processLeaveApproval(reqItem, approverLineUserId = null, replyToken = null, sourceComment = 'อนุมัติผ่านระบบ', specificApproverId = null) {
  const db = getDb();
  const doc = db.doctors.find(d => d.id === reqItem.doctor_id);
  const lt = db.leave_types.find(t => t.id === reqItem.leave_type_id);
  const currentStep = reqItem.current_step || 1;
  const totalSteps = reqItem.total_steps || 2;

  // Already fully approved
  if (reqItem.status === 'APPROVED') {
    const receiptFlex = buildApproverReceiptFlex(reqItem, doc || {}, lt || {}, true);
    if (replyToken) {
      await sendLineReplyMessage(replyToken, receiptFlex);
    } else if (approverLineUserId) {
      await sendLinePushMessage(approverLineUserId, receiptFlex);
    }
    return { success: true, message: 'ใบลาได้รับการอนุมัติเรียบร้อยแล้ว', request: reqItem, alreadyApproved: true };
  }

  if (reqItem.status !== 'PENDING') {
    const errText = `⚠️ ใบลาเลขที่ ${reqItem.request_no} อยู่ในสถานะ "${reqItem.status}" จึงไม่สามารถอนุมัติได้`;
    if (replyToken) {
      await sendLineReplyMessage(replyToken, { type: 'text', text: errText });
    } else if (approverLineUserId) {
      await sendLinePushMessage(approverLineUserId, { type: 'text', text: errText });
    }
    return { success: false, error: errText };
  }

  // Identify Approver Profile
  let approver = null;
  if (specificApproverId) {
    approver = db.doctors.find(d => d.id === specificApproverId);
  } else if (approverLineUserId) {
    approver = db.doctors.find(d => d.line_user_id === approverLineUserId);
  }

  if (!approver) {
    if (currentStep === 1) {
      const route = db.approval_routes.find(r => r.doctor_id === reqItem.doctor_id && r.step_order === 1);
      approver = route ? db.doctors.find(d => d.id === route.approver_id) : db.doctors.find(d => d.id === 'c0000000-0000-0000-0000-000000000011');
    } else {
      approver = db.doctors.find(d => d.id === 'c0000000-0000-0000-0000-000000000099'); // Dr. Pariwat
    }
  }

  const approverName = approver ? `${approver.prefix_th}${approver.first_name_th} ${approver.last_name_th}` : 'ผู้อนุมัติ';
  const approverId = approver ? approver.id : 'c0000000-0000-0000-0000-000000000099';

  // --- CASE A: STEP 1 APPROVAL (หัวหน้าแพทย์อนุมัติ ส่งต่อ นพ.ปริวรรธน์ ระเด่น) ---
  if (currentStep === 1 && totalSteps === 2) {
    reqItem.current_step = 2;
    reqItem.updated_at = new Date().toISOString();

    // 1. Record Step 1 Approval Log
    db.approval_logs.push({
      id: uuidv4(),
      request_id: reqItem.id,
      step_order: 1,
      approver_id: approverId,
      action: 'APPROVED',
      comments: sourceComment || 'อนุมัติขั้นที่ 1 เรียบร้อย (ส่งต่อ นพ.ปริวรรธน์ ระเด่น)',
      acted_at: new Date().toISOString()
    });

    db.audit_logs.push({
      id: uuidv4(),
      table_name: 'leave_requests',
      record_id: reqItem.id,
      action: 'UPDATE',
      actor_id: approverId,
      new_data: { current_step: 2, step_1_approver: approverName, comments: sourceComment },
      ip_address: '127.0.0.1',
      created_at: new Date().toISOString()
    });

    saveStore();

    // 2. Reply receipt back to Step 1 approver
    if (replyToken) {
      await sendLineReplyMessage(replyToken, {
        type: 'text',
        text: `✅ บันทึกการอนุมัติขั้นที่ 1 เรียบร้อยแล้ว (${approverName})\nระบบได้ส่งต่อคำขอไปยัง นพ.ปริวรรธน์ ระเด่น (ผู้ช่วย ผอ.รพ.) เพื่อพิจารณาอนุมัติขั้นสุดท้ายแล้ว`
      });
    }

    // 3. Push 1-Click Approve Flex to Step 2 Approver (นพ.ปริวรรธน์ ระเด่น)
    const step2Approver = db.doctors.find(d => d.id === 'c0000000-0000-0000-0000-000000000099');
    const step2LineId = step2Approver?.line_user_id || process.env.TEST_LINE_USER_ID;
    if (step2LineId) {
      const appUrl = process.env.APP_URL || 'http://localhost:5173';
      const step2Flex = buildApproverRequestFlex(reqItem, doc || {}, lt || {}, null, appUrl, 2, approverName);
      await sendLinePushMessage(step2LineId, step2Flex);
    }

    // 4. Notify Doctor: Step 1 passed! Waiting for Step 2
    const docTargetLineId = doc?.line_user_id || process.env.TEST_LINE_USER_ID;
    if (docTargetLineId) {
      const step1DocFlex = buildDoctorStep1ApprovedFlex(reqItem, doc || {}, lt || {}, approverName);
      await sendLinePushMessage(docTargetLineId, step1DocFlex);
    }

    // 5. Notify P'Koong (Medical Admin) - "พี่ต้องทราบด้วย"
    const koong = db.doctors.find(d => d.employee_id === 'EMP-KOONG');
    const koongTargetLineId = koong?.line_user_id || process.env.TEST_LINE_USER_ID;
    if (koongTargetLineId) {
      const koongFlex = buildMedicalAdminNotificationFlex(reqItem, doc || {}, lt || {}, 'STEP1_APPROVED', approverName, sourceComment);
      await sendLinePushMessage(koongTargetLineId, koongFlex);
    }

    return {
      success: true,
      message: `อนุมัติขั้นที่ 1 สำเร็จ (${approverName}) ส่งต่อไปยัง นพ.ปริวรรธน์ ระเด่น เรียบร้อยแล้ว`,
      request: reqItem,
      next_step: 2
    };
  }

  // --- CASE B: STEP 2 / FINAL APPROVAL (นพ.ปริวรรธน์ ระเด่น อนุมัติสมบูรณ์) ---
  reqItem.status = 'APPROVED';
  reqItem.updated_at = new Date().toISOString();

  // Deduct leave balance: pending -> used
  const reqYear = new Date(reqItem.start_date).getFullYear();
  const balance = db.leave_balances.find(b => b.doctor_id === reqItem.doctor_id && b.leave_type_id === reqItem.leave_type_id && b.fiscal_year === reqYear);
  if (balance) {
    balance.pending_days = Math.max(0, Number(balance.pending_days) - Number(reqItem.duration_days));
    balance.used_days = Number(balance.used_days) + Number(reqItem.duration_days);
    balance.updated_at = new Date().toISOString();
  }

  // Record Step 2 Approval Log
  db.approval_logs.push({
    id: uuidv4(),
    request_id: reqItem.id,
    step_order: totalSteps,
    approver_id: approverId,
    action: 'APPROVED',
    comments: sourceComment || 'อนุมัติขั้นสุดท้ายเรียบร้อย',
    acted_at: new Date().toISOString()
  });

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'leave_requests',
    record_id: reqItem.id,
    action: 'UPDATE',
    actor_id: approverId,
    new_data: { status: 'APPROVED', approver_id: approverId, comments: sourceComment },
    ip_address: '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();

  // 1. Reply Confirmation Receipt back to Approver via Reply Message
  if (replyToken) {
    const receiptFlex = buildApproverReceiptFlex(reqItem, doc || {}, lt || {}, false);
    await sendLineReplyMessage(replyToken, receiptFlex);
  }

  // 2. Push final notification to Doctor: Approved!
  const webhookDocTargetId = doc?.line_user_id || process.env.TEST_LINE_USER_ID;
  if (webhookDocTargetId) {
    const finalApproverTitle = 'นพ.ปริวรรธน์ ระเด่น (ผู้ช่วยผู้อำนวยการ รพ.)';
    const flex = buildLeaveDecisionFlex(reqItem, doc || {}, lt || {}, 'APPROVED', finalApproverTitle, sourceComment);
    await sendLinePushMessage(webhookDocTargetId, flex);
  }

  // 3. Push notification to P'Koong (Medical Admin): Complete!
  const koong = db.doctors.find(d => d.employee_id === 'EMP-KOONG');
  const koongTargetLineId = koong?.line_user_id || process.env.TEST_LINE_USER_ID;
  if (koongTargetLineId) {
    const koongFlex = buildMedicalAdminNotificationFlex(reqItem, doc || {}, lt || {}, 'FINAL_APPROVED', approverName, sourceComment);
    await sendLinePushMessage(koongTargetLineId, koongFlex);
  }

  return {
    success: true,
    message: 'อนุมัติใบลาขั้นสุดท้ายสำเร็จ โดย นพ.ปริวรรธน์ ระเด่น (ผู้ช่วยผู้อำนวยการ รพ.)',
    request: reqItem
  };
}

// POST /api/leave-requests/:id/approve
router.post('/leave-requests/:id/approve', async (req, res) => {
  try {
    const db = getDb();
    const reqItem = db.leave_requests.find(r => r.id === req.params.id);
    if (!reqItem) return res.status(404).json({ error: 'Leave request not found' });

    const { approver_id, comments = '' } = req.body;
    const cleanComments = sanitizeInput(comments);
    const actorId = approver_id || (reqItem.current_step === 2 ? 'c0000000-0000-0000-0000-000000000099' : 'c0000000-0000-0000-0000-000000000011');

    const result = await processLeaveApproval(reqItem, null, null, cleanComments, actorId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error('Approval error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leave-requests/:id/reject
router.post('/leave-requests/:id/reject', async (req, res) => {
  try {
    const db = getDb();
    const reqItem = db.leave_requests.find(r => r.id === req.params.id);
    if (!reqItem) return res.status(404).json({ error: 'Leave request not found' });

    const { approver_id, comments = 'ติดภารกิจออกตรวจ / ไม่ตรงเงื่อนไข' } = req.body;
    const cleanComments = sanitizeInput(comments);
    const actorId = approver_id || (reqItem.current_step === 2 ? 'c0000000-0000-0000-0000-000000000099' : 'c0000000-0000-0000-0000-000000000011');
    const approver = db.doctors.find(d => d.id === actorId);

    // Update status
    reqItem.status = 'REJECTED';
    reqItem.updated_at = new Date().toISOString();

    // Sync Balance: restore pending
    const reqYear = new Date(reqItem.start_date).getFullYear();
    const balance = db.leave_balances.find(b => b.doctor_id === reqItem.doctor_id && b.leave_type_id === reqItem.leave_type_id && b.fiscal_year === reqYear);
    if (balance) {
      balance.pending_days = Math.max(0, Number(balance.pending_days) - Number(reqItem.duration_days));
      balance.updated_at = new Date().toISOString();
    }

    // Add Approval Log
    db.approval_logs.push({
      id: uuidv4(),
      request_id: reqItem.id,
      step_order: reqItem.current_step || 1,
      approver_id: actorId,
      action: 'REJECTED',
      comments: cleanComments,
      acted_at: new Date().toISOString()
    });

    // Add Audit Log
    db.audit_logs.push({
      id: uuidv4(),
      table_name: 'leave_requests',
      record_id: reqItem.id,
      action: 'UPDATE',
      actor_id: actorId,
      new_data: { status: 'REJECTED', approver_id: actorId, comments: cleanComments },
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });

    saveStore();

    // Send 1-on-1 Flex Message to Doctor
    const doc = db.doctors.find(d => d.id === reqItem.doctor_id);
    const leaveType = db.leave_types.find(lt => lt.id === reqItem.leave_type_id);
    const rejectTargetLineId = doc?.line_user_id || process.env.TEST_LINE_USER_ID;
    const approverName = approver ? `${approver.prefix_th}${approver.first_name_th} ${approver.last_name_th}` : 'ผู้อนุมัติ';
    
    if (rejectTargetLineId) {
      const decisionFlex = buildLeaveDecisionFlex(
        reqItem,
        doc,
        leaveType,
        'REJECTED',
        approverName,
        cleanComments
      );
      await sendLinePushMessage(rejectTargetLineId, decisionFlex);
    }

    // Notify P'Koong (Medical Admin) - "พี่ต้องทราบด้วย"
    const koong = db.doctors.find(d => d.employee_id === 'EMP-KOONG');
    const koongTargetLineId = koong?.line_user_id || process.env.TEST_LINE_USER_ID;
    if (koongTargetLineId) {
      const koongFlex = buildMedicalAdminNotificationFlex(reqItem, doc || {}, leaveType || {}, 'REJECTED', approverName, cleanComments);
      await sendLinePushMessage(koongTargetLineId, koongFlex);
    }

    res.json({ message: 'บันทึกไม่อนุมัติสำเร็จ ระบบส่งแจ้งเตือนแพทย์เรียบร้อยแล้ว', request: reqItem });
  } catch (err) {
    console.error('Reject error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/leave-requests/:id/override', async (req, res) => {
  try {
    const db = getDb();
    const reqItem = db.leave_requests.find(r => r.id === req.params.id);
    if (!reqItem) return res.status(404).json({ error: 'Leave request not found' });

    const { admin_id, reason = 'อนุมัติแทนกรณีฉุกเฉิน/หัวหน้าแผนกติดภารกิจ' } = req.body;
    const actorId = admin_id || 'c0000000-0000-0000-0000-000000000001'; // P'Koong
    const koong = db.doctors.find(d => d.id === actorId);

    reqItem.status = 'APPROVED';
    reqItem.updated_at = new Date().toISOString();

    const reqYear = new Date(reqItem.start_date).getFullYear();
    const balance = db.leave_balances.find(b => b.doctor_id === reqItem.doctor_id && b.leave_type_id === reqItem.leave_type_id && b.fiscal_year === reqYear);
    if (balance) {
      balance.pending_days = Math.max(0, Number(balance.pending_days) - Number(reqItem.duration_days));
      balance.used_days = Number(balance.used_days) + Number(reqItem.duration_days);
      balance.updated_at = new Date().toISOString();
    }

    db.approval_logs.push({
      id: uuidv4(),
      request_id: reqItem.id,
      step_order: reqItem.current_step,
      approver_id: actorId,
      action: 'OVERRIDDEN',
      comments: `[Override โดยฝ่ายการแพทย์]: ${reason}`,
      acted_at: new Date().toISOString()
    });

    db.audit_logs.push({
      id: uuidv4(),
      table_name: 'leave_requests',
      record_id: reqItem.id,
      action: 'OVERRIDE_APPROVE',
      actor_id: actorId,
      new_data: { status: 'APPROVED', action: 'OVERRIDDEN', reason },
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });

    saveStore();

    // Send 1-on-1 Flex Message to Doctor
    const doc = db.doctors.find(d => d.id === reqItem.doctor_id);
    const leaveType = db.leave_types.find(lt => lt.id === reqItem.leave_type_id);
    const overrideTargetLineId = doc?.line_user_id || process.env.TEST_LINE_USER_ID;
    if (overrideTargetLineId) {
      const coordinator = db.contact_settings?.coordinator_name || 'เจ้าหน้าที่ฝ่ายการแพทย์';
      const decisionFlex = buildLeaveDecisionFlex(
        reqItem,
        doc,
        leaveType,
        'APPROVED',
        `${coordinator} อนุมัติแทน (ฝ่ายการแพทย์)`,
        `อนุมัติแทนกรณีฉุกเฉิน: ${reason}`
      );
      await sendLinePushMessage(overrideTargetLineId, decisionFlex);
    }

    res.json({ message: 'อนุมัติแทน (Override) สำเร็จ', request: reqItem });
  } catch (err) {
    console.error('Override error:', err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// DASHBOARD STATS (P'Koong Medical Admin)
// -------------------------------------------------------------
router.get('/stats/dashboard', (req, res) => {
  const db = getDb();
  const today = getTodayString();

  const pendingRequests = db.leave_requests.filter(r => r.status === 'PENDING');
  const emergencyRequestsToday = db.leave_requests.filter(r => r.is_emergency && r.start_date === today);
  
  const onLeaveToday = db.leave_requests.filter(r => {
    return (r.status === 'APPROVED' || r.status === 'PENDING') && today >= r.start_date && today <= r.end_date;
  });

  const departmentStats = db.departments.map(dept => {
    const deptDoctors = db.doctors.filter(d => d.department_id === dept.id);
    const onLeave = onLeaveToday.filter(r => {
      const doc = db.doctors.find(d => d.id === r.doctor_id);
      return doc && doc.department_id === dept.id;
    });

    return {
      department_id: dept.id,
      code: dept.code,
      name_th: dept.name_th,
      doctor_count: deptDoctors.length,
      max_leave_per_day: dept.max_leave_per_day,
      min_staff_required: dept.min_staff_required,
      on_leave_today_count: onLeave.length,
      is_quota_full: onLeave.length >= dept.max_leave_per_day
    };
  });

  res.json({
    pending_count: pendingRequests.length,
    emergency_today_count: emergencyRequestsToday.length,
    on_leave_today_count: onLeaveToday.length,
    departments: departmentStats,
    emergency_leaves: emergencyRequestsToday.map(r => {
      const doc = db.doctors.find(d => d.id === r.doctor_id);
      const lt = db.leave_types.find(t => t.id === r.leave_type_id);
      return {
        ...r,
        doctor_name: doc ? `${doc.prefix_th}${doc.first_name_th} ${doc.last_name_th}` : '',
        doctor_phone: doc ? doc.phone : '',
        leave_type_name: lt ? lt.name_th : ''
      };
    })
  });
});

// -------------------------------------------------------------
// LINE WEBHOOK & SIMULATOR
// -------------------------------------------------------------
export const recentWebhookEvents = [];

router.get('/line/webhook-logs', (req, res) => {
  res.json({
    count: recentWebhookEvents.length,
    events: recentWebhookEvents
  });
});

router.post('/line/webhook', async (req, res) => {
  try {
    // 1. Verify LINE Signature
    const signature = req.headers['x-line-signature'];
    const channelSecret = process.env.LINE_CHANNEL_SECRET;

    if (channelSecret && signature) {
      const bodyData = req.rawBody ? req.rawBody : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      const hash = crypto.createHmac('SHA256', channelSecret).update(bodyData).digest('base64');
      
      if (hash !== signature) {
        console.warn('⚠️ Webhook signature mismatch:', { received: signature, computed: hash });
        if (process.env.STRICT_LINE_SIGNATURE === 'true') {
          return res.status(401).send('Unauthorized: Invalid signature');
        }
      }
    }

    const events = req.body.events || [];
    const db = getDb();

    // Log incoming webhook event for live inspection & debugging
    recentWebhookEvents.unshift({
      time: new Date().toISOString(),
      eventCount: events.length,
      events: events.map(e => ({
        type: e.type,
        source: e.source,
        message: e.message ? { type: e.message.type, text: e.message.text } : null,
        postback: e.postback ? { data: e.postback.data } : null
      }))
    });
    if (recentWebhookEvents.length > 30) recentWebhookEvents.pop();

    // Helper function to reliably reply via Reply Token OR fallback to Push Message if token is expired/invalid
    const replyOrPush = async (replyToken, lineUserId, flexOrMsg) => {
      let sent = false;
      if (replyToken) {
        try {
          const res = await sendLineReplyMessage(replyToken, flexOrMsg);
          if (res && res.success) sent = true;
        } catch (e) {
          console.warn('[Reply Error, falling back to push]', e);
        }
      }
      if (!sent && lineUserId) {
        try {
          await sendLinePushMessage(lineUserId, flexOrMsg);
        } catch (e) {
          console.error('[Push Fallback Error]', e);
        }
      }
    };

    // Webhook event loop uses the outer 2-step processLeaveApproval engine

    for (const event of events) {
      // 1. Follow Event (Doctor adds bot as friend or unblocks)
      if (event.type === 'follow') {
        const lineUserId = event.source && event.source.userId;
        let doc = null;
        if (lineUserId) {
          doc = db.doctors.find(d => d.line_user_id === lineUserId);
        }
        const docName = doc ? `${doc.prefix_th}${doc.first_name_th} ${doc.last_name_th}` : '';
        const welcomeFlex = buildWelcomeFlex(docName);
        if (event.replyToken) {
          await sendLineReplyMessage(event.replyToken, welcomeFlex);
        } else if (lineUserId) {
          await sendLinePushMessage(lineUserId, welcomeFlex);
        }
      }

      // 2. Text Message Event (Doctor types keyword or taps Rich Menu)
      if (event.type === 'message' && event.message && event.message.type === 'text') {
        const text = (event.message.text || '').trim();
        const lineUserId = event.source && event.source.userId;
        let doc = null;
        if (lineUserId) {
          doc = db.doctors.find(d => d.line_user_id === lineUserId);
        }

        // A. Quick Approval via Text: "อนุมัติใบลา LV-XXXX-XXXXX" or "อนุมัติ LV-XXXX-XXXXX"
        const approveMatch = text.match(/(?:อนุมัติใบลา|อนุมัติ)\s*(LV-\d{4}-\d{5})/i);
        if (approveMatch) {
          const reqNo = approveMatch[1].toUpperCase();
          const reqItem = db.leave_requests.find(r => r.request_no === reqNo);
          if (reqItem) {
            await processLeaveApproval(reqItem, lineUserId, event.replyToken, 'อนุมัติผ่านข้อความ LINE');
            continue;
          } else {
            if (event.replyToken) {
              await sendLineReplyMessage(event.replyToken, {
                type: 'text',
                text: `❌ ไม่พบข้อมูลใบลาเลขที่ ${reqNo} ในระบบ`
              });
            }
            continue;
          }
        }

        // B. Contact Medical Affairs / Emergency Hotline Card
        if (
          text.includes('ติดต่อ') ||
          text.includes('ฝ่ายการแพทย์') ||
          text.includes('ฉุกเฉิน') ||
          text.includes('กุ้ง') ||
          text.includes('สายด่วน') ||
          text.includes('เบอร์') ||
          text.includes('โทร')
        ) {
          const contactFlex = buildContactCardFlex(db.contact_settings || defaultContactSettings);
          if (event.replyToken) {
            await sendLineReplyMessage(event.replyToken, contactFlex);
          } else if (lineUserId) {
            await sendLinePushMessage(lineUserId, contactFlex);
          }
        }
        // C. Welcome / Leave Menu Card
        else if (text.includes('ลา') || text.includes('เมนู') || text.includes('สวัสดี') || text.includes('help')) {
          const docName = doc ? `${doc.prefix_th}${doc.first_name_th} ${doc.last_name_th}` : '';
          const welcomeFlex = buildWelcomeFlex(docName);
          if (event.replyToken) {
            await sendLineReplyMessage(event.replyToken, welcomeFlex);
          }
        }
      }

      // 3. Postback Event (Tapping Flex Message Action Button)
      if (event.type === 'postback') {
        const params = new URLSearchParams(event.postback.data || '');
        const action = params.get('action');
        const requestId = params.get('id');
        const reqNo = params.get('reqNo');
        const lineUserId = event.source && event.source.userId;

        if (action === 'approve') {
          const reqItem = db.leave_requests.find(r => (requestId && r.id === requestId) || (reqNo && r.request_no === reqNo));
          if (reqItem) {
            await processLeaveApproval(reqItem, lineUserId, event.replyToken, 'อนุมัติผ่าน LINE 1-Click');
          } else if (event.replyToken) {
            await sendLineReplyMessage(event.replyToken, {
              type: 'text',
              text: '❌ ไม่พบข้อมูลคำขอใบลาที่ระบุในระบบ'
            });
          }
        }
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send(err.message);
  }
});

router.get('/line/simulator/messages', (req, res) => {
  res.json(simulatedLineMessages);
});

router.post('/line/simulator/clear', (req, res) => {
  simulatedLineMessages.length = 0;
  res.json({ message: 'Cleared simulated messages' });
});

// -------------------------------------------------------------
// AUDIT LOGS
// -------------------------------------------------------------
router.get('/audit-logs', (req, res) => {
  const db = getDb();
  const sorted = [...db.audit_logs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  const enriched = sorted.map(log => {
    const actor = db.doctors.find(d => d.id === log.actor_id);
    return {
      ...log,
      actor_name: actor ? `${actor.prefix_th}${actor.first_name_th} ${actor.last_name_th}` : 'System'
    };
  });

  res.json(enriched.slice(0, 100));
});

// -------------------------------------------------------------
// HOLIDAYS MANAGEMENT (PHASE 4)
// -------------------------------------------------------------

// GET /api/holidays - List holidays, optionally filtered by year
router.get('/holidays', (req, res) => {
  const db = getDb();
  if (!db.holidays) db.holidays = [];
  
  const { year, activeOnly } = req.query;
  let list = [...db.holidays];
  
  if (year) {
    list = list.filter(h => h.holiday_date.startsWith(`${year}-`));
  }
  
  if (activeOnly === 'true') {
    list = list.filter(h => h.is_active);
  }
  
  list.sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
  res.json(list);
});

// POST /api/holidays - Create new holiday
router.post('/holidays', (req, res) => {
  const db = getDb();
  if (!db.holidays) db.holidays = [];
  
  const { holiday_date, name_th, is_active = true, actor_id } = req.body;
  
  if (!holiday_date || !name_th) {
    return res.status(400).json({ error: 'กรุณาระบุวันที่และชื่อวันหยุด' });
  }
  
  if (!/^\d{4}-\d{2}-\d{2}$/.test(holiday_date)) {
    return res.status(400).json({ error: 'รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)' });
  }
  
  const exists = db.holidays.find(h => h.holiday_date === holiday_date);
  if (exists) {
    return res.status(400).json({ error: `วันที่ ${holiday_date} มีในระบบแล้ว (${exists.name_th})` });
  }
  
  const newHoliday = {
    id: uuidv4(),
    holiday_date,
    name_th: name_th.trim(),
    is_active: Boolean(is_active)
  };
  
  db.holidays.push(newHoliday);
  
  // Audit log
  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'holidays',
    record_id: newHoliday.id,
    action: 'INSERT',
    actor_id: actor_id || null,
    new_data: newHoliday,
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });
  
  saveStore();
  res.status(201).json(newHoliday);
});

// PUT /api/holidays/:id - Update holiday
router.put('/holidays/:id', (req, res) => {
  const db = getDb();
  if (!db.holidays) db.holidays = [];
  
  const { id } = req.params;
  const { holiday_date, name_th, is_active, actor_id } = req.body;
  
  const index = db.holidays.findIndex(h => h.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'ไม่พบข้อมูลวันหยุดที่ระบุ' });
  }
  
  const oldData = { ...db.holidays[index] };
  
  if (holiday_date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(holiday_date)) {
      return res.status(400).json({ error: 'รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)' });
    }
    const duplicate = db.holidays.find(h => h.holiday_date === holiday_date && h.id !== id);
    if (duplicate) {
      return res.status(400).json({ error: `วันที่ ${holiday_date} มีในระบบแล้ว (${duplicate.name_th})` });
    }
    db.holidays[index].holiday_date = holiday_date;
  }
  
  if (name_th !== undefined) {
    db.holidays[index].name_th = name_th.trim();
  }
  
  if (is_active !== undefined) {
    db.holidays[index].is_active = Boolean(is_active);
  }
  
  // Audit log
  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'holidays',
    record_id: id,
    action: 'UPDATE',
    actor_id: actor_id || null,
    old_data: oldData,
    new_data: db.holidays[index],
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });
  
  saveStore();
  res.json(db.holidays[index]);
});

// DELETE /api/holidays/:id - Remove holiday
router.delete('/holidays/:id', (req, res) => {
  const db = getDb();
  if (!db.holidays) db.holidays = [];
  
  const { id } = req.params;
  const index = db.holidays.findIndex(h => h.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'ไม่พบข้อมูลวันหยุดที่ระบุ' });
  }
  
  const deletedItem = db.holidays[index];
  db.holidays.splice(index, 1);
  
  // Audit log
  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'holidays',
    record_id: id,
    action: 'DELETE',
    actor_id: req.body?.actor_id || null,
    old_data: deletedItem,
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });
  
  saveStore();
  res.json({ message: 'ลบข้อมูลวันหยุดสำเร็จ', id });
});

// POST /api/holidays/seed-year - Seed standard Thai holidays for a given year
router.post('/holidays/seed-year', (req, res) => {
  const db = getDb();
  if (!db.holidays) db.holidays = [];
  
  const targetYear = parseInt(req.body.year, 10) || new Date().getFullYear();
  
  const standardHolidays = [
    { date: `${targetYear}-01-01`, name: 'วันขึ้นปีใหม่' },
    { date: `${targetYear}-02-24`, name: 'วันมาฆบูชา' },
    { date: `${targetYear}-04-06`, name: 'วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช และวันที่ระลึกมหาจักรีบรมราชวงศ์ (วันจักรี)' },
    { date: `${targetYear}-04-13`, name: 'วันสงกรานต์' },
    { date: `${targetYear}-04-14`, name: 'วันสงกรานต์' },
    { date: `${targetYear}-04-15`, name: 'วันสงกรานต์' },
    { date: `${targetYear}-05-01`, name: 'วันแรงงานแห่งชาติ' },
    { date: `${targetYear}-05-04`, name: 'วันฉัตรมงคล' },
    { date: `${targetYear}-05-22`, name: 'วันวิสาขบูชา' },
    { date: `${targetYear}-06-03`, name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี' },
    { date: `${targetYear}-07-20`, name: 'วันอาสาฬหบูชา' },
    { date: `${targetYear}-07-21`, name: 'วันเข้าพรรษา' },
    { date: `${targetYear}-07-28`, name: 'วันพระบรมราชสมภพพระบาทสมเด็จพระวชิรเกล้าเจ้าอยู่หัว (ร.10)' },
    { date: `${targetYear}-08-12`, name: 'วันแม่แห่งชาติ (วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง)' },
    { date: `${targetYear}-10-13`, name: 'วันนวมินทรมหาราช (วันคล้ายวันสวรรคต ร.9)' },
    { date: `${targetYear}-10-23`, name: 'วันปิยมหาราช' },
    { date: `${targetYear}-12-05`, name: 'วันพ่อแห่งชาติ (วันคล้ายวันพระบรมราชสมภพ ร.9)' },
    { date: `${targetYear}-12-10`, name: 'วันรัฐธรรมนูญ' },
    { date: `${targetYear}-12-31`, name: 'วันสิ้นปี' }
  ];
  
  let addedCount = 0;
  for (const item of standardHolidays) {
    const exists = db.holidays.some(h => h.holiday_date === item.date);
    if (!exists) {
      db.holidays.push({
        id: uuidv4(),
        holiday_date: item.date,
        name_th: item.name,
        is_active: true
      });
      addedCount++;
    }
  }
  
  if (addedCount > 0) {
    db.audit_logs.push({
      id: uuidv4(),
      table_name: 'holidays',
      record_id: 'batch-seed',
      action: 'INSERT',
      actor_id: req.body?.actor_id || null,
      new_data: { note: `Imported standard holidays for year ${targetYear}`, addedCount },
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });
    saveStore();
  }
  
  res.json({
    message: `เพิ่มวันหยุดมาตรฐานประจำปี ${targetYear} สำเร็จ (${addedCount} วันใหม่)`,
    addedCount,
    total: db.holidays.filter(h => h.holiday_date.startsWith(`${targetYear}-`)).length
  });
});

// POST /api/calculate-duration - Preview duration calculation with holidays & shift breakdown
router.post('/calculate-duration', (req, res) => {
  const db = getDb();
  const { start_date, end_date, half_day_type, leave_type_id, doctor_id } = req.body;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'กรุณาระบุวันเริ่มต้นและสิ้นสุด' });
  }

  const leaveType = db.leave_types.find(lt => lt.id === leave_type_id);
  const countMode = leaveType ? leaveType.count_mode : 'CALENDAR_DAYS';
  const holidays = (db.holidays || []).filter(h => h.is_active);
  const doctor = doctor_id ? db.doctors.find(d => d.id === doctor_id) : null;
  const shifts = (db.doctor_shifts || []).filter(s =>
    (!doctor_id || s.doctor_id === doctor_id) &&
    s.shift_date >= start_date &&
    s.shift_date <= end_date &&
    s.status === 'SCHEDULED'
  );

  if (half_day_type === 'MORNING' || half_day_type === 'AFTERNOON') {
    return res.json({
      duration_days: 0.5,
      count_mode: countMode,
      holidays_in_range: [],
      shifts_in_range: shifts,
      weekend_shifts_count: 0,
      working_pattern: doctor?.working_pattern || (doctor?.doctor_type === 'PART_TIME' ? 'SHIFT_BASED' : 'OFFICE_HOURS')
    });
  }

  const duration_days = calculateDays(start_date, end_date);

  // Find holidays and shifts that fall within this range
  const holidaySet = new Set(holidays.map(h => h.holiday_date));
  const holidaysInRange = [];
  const shiftsInRange = [];

  const start = new Date(start_date);
  const end = new Date(end_date);
  const current = new Date(start);

  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const date = String(current.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${date}`;

    if (holidaySet.has(dateStr)) {
      const hObj = holidays.find(h => h.holiday_date === dateStr);
      if (hObj) holidaysInRange.push(hObj);
    }

    const sObj = shifts.find(s => s.shift_date === dateStr);
    if (sObj) {
      shiftsInRange.push(sObj);
    }

    current.setDate(current.getDate() + 1);
  }

  res.json({
    duration_days,
    count_mode: 'CALENDAR_DAYS',
    holidays_in_range: holidaysInRange,
    shifts_in_range: shiftsInRange,
    weekend_shifts_count: 0
  });
});

// -------------------------------------------------------------
// TENURE LEAVE CALCULATION (PHASE 4 - ITEM 22)
// -------------------------------------------------------------

function calculateTenure(hireDateStr, asOfDate = new Date()) {
  if (!hireDateStr) return { years: 0, months: 0, days: 0, formatted: 'ไม่ระบุวันเริ่มงาน' };
  const hire = new Date(hireDateStr);
  const target = new Date(asOfDate);
  if (hire > target) return { years: 0, months: 0, days: 0, formatted: '0 เดือน (เริ่มงานในอนาคต)' };

  let years = target.getFullYear() - hire.getFullYear();
  let months = target.getMonth() - hire.getMonth();
  let days = target.getDate() - hire.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(target.getFullYear(), target.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  let formatted = '';
  if (years > 0) formatted += `${years} ปี `;
  formatted += `${months} เดือน`;
  if (years === 0 && months === 0) formatted = `${days} วัน`;

  return { years, months, days, formatted: formatted.trim() };
}

function calculateVacationEntitlement(doctor, tenure, rules, targetYear, settings) {
  if (doctor.doctor_type === 'PART_TIME' && !settings?.allow_part_time) {
    return { entitlement: 0, rule_applied: 'แพทย์พาร์ทไทม์ (ไม่มีสิทธิ์ลาพักร้อน)' };
  }

  const exactYears = tenure.years + (tenure.months / 12);
  const sortedRules = [...rules].sort((a, b) => a.min_years - b.min_years);
  const matchedRule = sortedRules.find(r => exactYears >= r.min_years && exactYears < r.max_years)
    || sortedRules[sortedRules.length - 1];

  if (!matchedRule) {
    return { entitlement: 20.0, rule_applied: 'เกณฑ์มาตรฐาน 20 วัน/ปี (หลังทำงานครบ 6 เดือน)' };
  }

  // First year prorated calculation
  if (matchedRule.min_years === 0 && matchedRule.prorate_monthly > 0) {
    const hire = new Date(doctor.hire_date);
    if (hire.getFullYear() === targetYear) {
      const workedMonths = Math.max(1, 12 - hire.getMonth());
      const prorated = Math.min(matchedRule.entitlement_days, Math.round(workedMonths * matchedRule.prorate_monthly * 2) / 2);
      return {
        entitlement: prorated,
        rule_applied: `ปีแรก สะสมตามสัดส่วน ${workedMonths} เดือน (${prorated} วัน)`
      };
    }
  }

  return {
    entitlement: matchedRule.entitlement_days,
    rule_applied: matchedRule.description
  };
}

// GET /api/tenure/rules - Get tenure rules and settings
router.get('/tenure/rules', (req, res) => {
  const db = getDb();
  res.json({
    rules: db.tenure_rules || [],
    settings: db.tenure_settings || { max_carry_over_days: 5.0, allow_part_time: false }
  });
});

// PUT /api/tenure/rules - Update tenure rules and settings
router.put('/tenure/rules', (req, res) => {
  const db = getDb();
  const { rules, settings, actor_id } = req.body;

  if (rules && Array.isArray(rules)) {
    db.tenure_rules = rules;
  }
  if (settings) {
    db.tenure_settings = { ...db.tenure_settings, ...settings };
  }

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'tenure_rules',
    record_id: 'settings',
    action: 'UPDATE',
    actor_id: actor_id || null,
    new_data: { rules: db.tenure_rules, settings: db.tenure_settings },
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json({ message: 'บันทึกเกณฑ์การคำนวณอายุงานสำเร็จ', rules: db.tenure_rules, settings: db.tenure_settings });
});

// GET /api/settings/contact - Get Medical Affairs contact settings
router.get('/settings/contact', (req, res) => {
  const db = getDb();
  const defaultContact = {
    department_name: 'ฝ่ายการแพทย์ / HR (Medical Affairs)',
    coordinator_name: 'คุณธัญญธร ตันติกุล (พี่กุ้ง)',
    phone_emergency: '076-361-888',
    phone_ext: '1234',
    phone_hotline: '089-470-9256',
    email: 'medical_affairs@bsi.hospital',
    location: 'อาคาร A ชั้น 3 ฝ่ายการแพทย์ โรงพยาบาลกรุงเทพศิริโรจน์',
    notify_line: true
  };
  res.json(db.contact_settings || defaultContact);
});

// PUT /api/settings/contact - Update Medical Affairs contact settings
router.put('/settings/contact', (req, res) => {
  const db = getDb();
  const { department_name, coordinator_name, phone_emergency, phone_ext, phone_hotline, email, location, notify_line, actor_id } = req.body;

  db.contact_settings = {
    ...db.contact_settings,
    department_name: department_name || db.contact_settings?.department_name || 'ฝ่ายการแพทย์ (Medical Affairs)',
    coordinator_name: coordinator_name || db.contact_settings?.coordinator_name || 'คุณสิริมาศ',
    phone_emergency: phone_emergency || db.contact_settings?.phone_emergency || '076-361-888',
    phone_ext: phone_ext !== undefined ? phone_ext : (db.contact_settings?.phone_ext || ''),
    phone_hotline: phone_hotline !== undefined ? phone_hotline : (db.contact_settings?.phone_hotline || ''),
    email: email !== undefined ? email : (db.contact_settings?.email || ''),
    location: location !== undefined ? location : (db.contact_settings?.location || ''),
    notify_line: notify_line !== undefined ? notify_line : true
  };

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'contact_settings',
    record_id: 'settings',
    action: 'UPDATE',
    actor_id: actor_id || null,
    new_data: db.contact_settings,
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json({ message: 'บันทึกข้อมูลติดต่อฝ่ายการแพทย์สำเร็จ', settings: db.contact_settings });
});

// PUT /api/doctors/:id/hire-date - Update doctor's hire date
router.put('/doctors/:id/hire-date', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { hire_date, actor_id } = req.body;

  const doctor = db.doctors.find(d => d.id === id);
  if (!doctor) {
    return res.status(404).json({ error: 'ไม่พบข้อมูลแพทย์' });
  }

  if (!hire_date || !/^\d{4}-\d{2}-\d{2}$/.test(hire_date)) {
    return res.status(400).json({ error: 'รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)' });
  }

  const oldDate = doctor.hire_date;
  doctor.hire_date = hire_date;

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'doctors',
    record_id: id,
    action: 'UPDATE',
    actor_id: actor_id || null,
    old_data: { hire_date: oldDate },
    new_data: { hire_date },
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json({ message: 'บันทึกวันเริ่มงานสำเร็จ', doctor });
});

// PUT /api/doctors/:id/working-pattern - Update doctor's working schedule pattern (OFFICE_HOURS vs SHIFT_BASED)
router.put('/doctors/:id/working-pattern', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { working_pattern, actor_id } = req.body;

  const doctor = db.doctors.find(d => d.id === id);
  if (!doctor) {
    return res.status(404).json({ error: 'ไม่พบข้อมูลแพทย์' });
  }

  const validPatterns = ['OFFICE_HOURS', 'SHIFT_BASED'];
  if (!validPatterns.includes(working_pattern)) {
    return res.status(400).json({ error: 'รูปแบบการทำงานไม่ถูกต้อง (ต้องเป็น OFFICE_HOURS หรือ SHIFT_BASED)' });
  }

  const oldPattern = doctor.working_pattern || (doctor.doctor_type === 'PART_TIME' ? 'SHIFT_BASED' : 'OFFICE_HOURS');
  doctor.working_pattern = working_pattern;

  if (!db.audit_logs) db.audit_logs = [];
  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'doctors',
    record_id: id,
    action: 'UPDATE',
    actor_id: actor_id || null,
    old_data: { working_pattern: oldPattern },
    new_data: { working_pattern },
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json({ message: 'บันทึกรูปแบบการทำงานสำเร็จ', doctor });
});

// GET /api/tenure/preview - Preview vacation leave calculation based on tenure for a given year
router.get('/tenure/preview', (req, res) => {
  const db = getDb();
  const targetYear = parseInt(req.query.year, 10) || new Date().getFullYear();
  const rules = db.tenure_rules || [];
  const settings = db.tenure_settings || { max_carry_over_days: 5.0, allow_part_time: false };
  const vacationType = db.leave_types.find(lt => lt.code === 'VACATION') || db.leave_types[0];

  const asOfDate = new Date(`${targetYear}-12-31`);
  const prevYear = targetYear - 1;

  const previewList = db.doctors.map(doctor => {
    const tenure = calculateTenure(doctor.hire_date, asOfDate);
    const { entitlement, rule_applied } = calculateVacationEntitlement(doctor, tenure, rules, targetYear, settings);

    const currentBalance = db.leave_balances.find(
      b => b.doctor_id === doctor.id && b.leave_type_id === vacationType.id && b.fiscal_year === targetYear
    );

    const prevBalance = db.leave_balances.find(
      b => b.doctor_id === doctor.id && b.leave_type_id === vacationType.id && b.fiscal_year === prevYear
    );

    let proposedCarryOver = 0;
    if (prevBalance) {
      const remainingPrev = (prevBalance.entitlement_days + prevBalance.carried_over_days) - (prevBalance.used_days + prevBalance.pending_days);
      if (remainingPrev > 0) {
        proposedCarryOver = Math.min(remainingPrev, settings.max_carry_over_days);
      }
    }

    const dept = db.departments.find(d => d.id === doctor.department_id);

    return {
      doctor_id: doctor.id,
      employee_id: doctor.employee_id,
      doctor_name: `${doctor.prefix_th}${doctor.first_name_th} ${doctor.last_name_th}`,
      doctor_type: doctor.doctor_type,
      department_name: dept?.name_th || 'ไม่ระบุ',
      hire_date: doctor.hire_date || null,
      tenure,
      calculated_entitlement: entitlement,
      rule_applied,
      current_entitlement: currentBalance ? currentBalance.entitlement_days : null,
      current_carried_over: currentBalance ? currentBalance.carried_over_days : 0,
      proposed_carried_over: proposedCarryOver,
      has_change: currentBalance ? currentBalance.entitlement_days !== entitlement : true
    };
  });

  res.json({
    year: targetYear,
    preview: previewList,
    total_doctors: previewList.length,
    rules,
    settings
  });
});

// POST /api/tenure/apply - Batch apply calculated vacation entitlements into leave_balances
router.post('/tenure/apply', (req, res) => {
  const db = getDb();
  const targetYear = parseInt(req.body.year, 10) || new Date().getFullYear();
  const applyCarryOver = req.body.apply_carry_over !== false;
  const actorId = req.body.actor_id || null;

  const rules = db.tenure_rules || [];
  const settings = db.tenure_settings || { max_carry_over_days: 5.0, allow_part_time: false };
  const vacationType = db.leave_types.find(lt => lt.code === 'VACATION') || db.leave_types[0];

  const asOfDate = new Date(`${targetYear}-12-31`);
  const prevYear = targetYear - 1;
  let updatedCount = 0;
  let insertedCount = 0;

  db.doctors.forEach(doctor => {
    const tenure = calculateTenure(doctor.hire_date, asOfDate);
    const { entitlement } = calculateVacationEntitlement(doctor, tenure, rules, targetYear, settings);

    let proposedCarryOver = 0;
    if (applyCarryOver) {
      const prevBalance = db.leave_balances.find(
        b => b.doctor_id === doctor.id && b.leave_type_id === vacationType.id && b.fiscal_year === prevYear
      );
      if (prevBalance) {
        const remainingPrev = (prevBalance.entitlement_days + prevBalance.carried_over_days) - (prevBalance.used_days + prevBalance.pending_days);
        if (remainingPrev > 0) {
          proposedCarryOver = Math.min(remainingPrev, settings.max_carry_over_days);
        }
      }
    }

    const existingIndex = db.leave_balances.findIndex(
      b => b.doctor_id === doctor.id && b.leave_type_id === vacationType.id && b.fiscal_year === targetYear
    );

    if (existingIndex !== -1) {
      db.leave_balances[existingIndex].entitlement_days = entitlement;
      if (applyCarryOver) {
        db.leave_balances[existingIndex].carried_over_days = proposedCarryOver;
      }
      db.leave_balances[existingIndex].updated_at = new Date().toISOString();
      updatedCount++;
    } else {
      db.leave_balances.push({
        id: uuidv4(),
        doctor_id: doctor.id,
        leave_type_id: vacationType.id,
        fiscal_year: targetYear,
        entitlement_days: entitlement,
        carried_over_days: applyCarryOver ? proposedCarryOver : 0,
        used_days: 0,
        pending_days: 0,
        updated_at: new Date().toISOString()
      });
      insertedCount++;
    }
  });

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'leave_balances',
    record_id: `batch-tenure-${targetYear}`,
    action: 'UPDATE',
    actor_id: actorId,
    new_data: { note: `Applied tenure vacation entitlements for year ${targetYear}`, updatedCount, insertedCount },
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json({
    message: `ประมวลผลสิทธิ์วันลาพักผ่อนประจำปี ${targetYear} สำเร็จ (${insertedCount} เพิ่มใหม่, ${updatedCount} ปรับปรุง)`,
    year: targetYear,
    updatedCount,
    insertedCount
  });
});

// -------------------------------------------------------------
// APPROVAL ROUTES MANAGEMENT (PHASE 4 - ITEM 24)
// -------------------------------------------------------------

// GET /api/approval-routes - List all approval routes with doctor & approver info
router.get('/approval-routes', (req, res) => {
  const db = getDb();
  if (!db.approval_routes) db.approval_routes = [];

  const enriched = db.approval_routes.map(route => {
    const doctor = db.doctors.find(d => d.id === route.doctor_id);
    const approver = db.doctors.find(d => d.id === route.approver_id);
    const dept = doctor ? db.departments.find(dp => dp.id === doctor.department_id) : null;

    return {
      ...route,
      doctor_name: doctor ? `${doctor.prefix_th}${doctor.first_name_th} ${doctor.last_name_th}` : 'ไม่ระบุ',
      doctor_employee_id: doctor?.employee_id || '-',
      department_name: dept?.name_th || 'ไม่ระบุ',
      approver_name: approver ? `${approver.prefix_th}${approver.first_name_th} ${approver.last_name_th}` : 'ไม่ระบุ',
      approver_employee_id: approver?.employee_id || '-'
    };
  });

  res.json(enriched);
});

// POST /api/approval-routes - Create or update an approval route
router.post('/approval-routes', (req, res) => {
  const db = getDb();
  if (!db.approval_routes) db.approval_routes = [];

  const { doctor_id, step_order = 1, approver_id, is_active = true, actor_id } = req.body;

  if (!doctor_id || !approver_id) {
    return res.status(400).json({ error: 'กรุณาระบุแพทย์และผู้อนุมัติ' });
  }

  if (doctor_id === approver_id) {
    return res.status(400).json({ error: 'แพทย์ไม่สามารถเป็นผู้อนุมัติตนเองได้' });
  }

  const existingIndex = db.approval_routes.findIndex(
    r => r.doctor_id === doctor_id && r.step_order === Number(step_order)
  );

  let result;
  if (existingIndex !== -1) {
    db.approval_routes[existingIndex].approver_id = approver_id;
    db.approval_routes[existingIndex].is_active = Boolean(is_active);
    result = db.approval_routes[existingIndex];
  } else {
    result = {
      id: uuidv4(),
      doctor_id,
      step_order: Number(step_order),
      approver_id,
      is_active: Boolean(is_active),
      created_at: new Date().toISOString()
    };
    db.approval_routes.push(result);
  }

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'approval_routes',
    record_id: result.id,
    action: existingIndex !== -1 ? 'UPDATE' : 'INSERT',
    actor_id: actor_id || null,
    new_data: result,
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.status(201).json(result);
});

// PUT /api/approval-routes/:id - Update approval route
router.put('/approval-routes/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { approver_id, step_order, is_active, actor_id } = req.body;

  const index = db.approval_routes.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'ไม่พบสายอนุมัติที่ระบุ' });
  }

  if (approver_id) {
    if (db.approval_routes[index].doctor_id === approver_id) {
      return res.status(400).json({ error: 'แพทย์ไม่สามารถเป็นผู้อนุมัติตนเองได้' });
    }
    db.approval_routes[index].approver_id = approver_id;
  }
  if (step_order !== undefined) {
    db.approval_routes[index].step_order = Number(step_order);
  }
  if (is_active !== undefined) {
    db.approval_routes[index].is_active = Boolean(is_active);
  }

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'approval_routes',
    record_id: id,
    action: 'UPDATE',
    actor_id: actor_id || null,
    new_data: db.approval_routes[index],
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json(db.approval_routes[index]);
});

// DELETE /api/approval-routes/:id - Delete approval route
router.delete('/approval-routes/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const index = db.approval_routes.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'ไม่พบสายอนุมัติที่ระบุ' });
  }

  const deleted = db.approval_routes[index];
  db.approval_routes.splice(index, 1);

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'approval_routes',
    record_id: id,
    action: 'DELETE',
    actor_id: req.body?.actor_id || null,
    old_data: deleted,
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json({ message: 'ลบสายอนุมัติสำเร็จ', id });
});

// POST /api/approval-routes/batch-department - Assign approver for all doctors in a department
router.post('/approval-routes/batch-department', (req, res) => {
  const db = getDb();
  const { department_id, approver_id, step_order = 1, actor_id } = req.body;

  if (!department_id || !approver_id) {
    return res.status(400).json({ error: 'กรุณาระบุแผนกและผู้อนุมัติ' });
  }

  const deptDoctors = db.doctors.filter(d => d.department_id === department_id && d.id !== approver_id);
  let count = 0;

  deptDoctors.forEach(doc => {
    const existing = db.approval_routes.find(
      r => r.doctor_id === doc.id && r.step_order === Number(step_order)
    );
    if (existing) {
      existing.approver_id = approver_id;
      existing.is_active = true;
    } else {
      db.approval_routes.push({
        id: uuidv4(),
        doctor_id: doc.id,
        step_order: Number(step_order),
        approver_id,
        is_active: true,
        created_at: new Date().toISOString()
      });
    }
    count++;
  });

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'approval_routes',
    record_id: `batch-dept-${department_id}`,
    action: 'UPDATE',
    actor_id: actor_id || null,
    new_data: { department_id, approver_id, assigned_count: count },
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json({ message: `กำหนดผู้อนุมัติให้แพทย์ในแผนกเรียบร้อย (${count} ท่าน)`, count });
});

// -------------------------------------------------------------
// SHIFT & SCHEDULE MANAGEMENT (Feature #26)
// -------------------------------------------------------------

const SHIFT_TYPE_MAP = {
  OPD_MORNING: {
    label: 'OPD เช้า',
    full_label: 'ตรวจผู้ป่วยนอกรอบเช้า (08:00 - 12:00)',
    color: '#0284c7',
    start_time: '08:00',
    end_time: '12:00',
    is_mandatory_handover: false
  },
  OPD_AFTERNOON: {
    label: 'OPD บ่าย',
    full_label: 'ตรวจผู้ป่วยนอกรอบบ่าย (13:00 - 17:00)',
    color: '#0ea5e9',
    start_time: '13:00',
    end_time: '17:00',
    is_mandatory_handover: false
  },
  IPD_ROUND: {
    label: 'Ward Round',
    full_label: 'ตรวจเยี่ยมผู้ป่วยใน (09:00 - 13:00)',
    color: '#8b5cf6',
    start_time: '09:00',
    end_time: '13:00',
    is_mandatory_handover: true
  },
  ER_DUTY: {
    label: 'เวร ER',
    full_label: 'เวรแพทย์ห้องฉุกเฉิน (08:00 - 20:00)',
    color: '#ef4444',
    start_time: '08:00',
    end_time: '20:00',
    is_mandatory_handover: true
  },
  NIGHT_DUTY: {
    label: 'เวรดึก',
    full_label: 'เวรดึกประจำโรงพยาบาล (20:00 - 08:00)',
    color: '#6366f1',
    start_time: '20:00',
    end_time: '08:00',
    is_mandatory_handover: true
  },
  ON_CALL: {
    label: 'On-Call',
    full_label: 'เวรแพทย์ให้คำปรึกษาทางโทรศัพท์ (24 ชม.)',
    color: '#10b981',
    start_time: '08:00',
    end_time: '08:00',
    is_mandatory_handover: true
  }
};

// GET /api/shifts - List shifts with filters and conflict enrichment
router.get('/shifts', (req, res) => {
  const db = getDb();
  const { department_id, doctor_id, month, year, start_date, end_date, status } = req.query;

  let shifts = db.doctor_shifts || [];

  if (department_id) {
    shifts = shifts.filter(s => s.department_id === department_id);
  }
  if (doctor_id) {
    shifts = shifts.filter(s => s.doctor_id === doctor_id);
  }
  if (status) {
    shifts = shifts.filter(s => s.status === status);
  }
  if (month && year) {
    const padMonth = String(month).padStart(2, '0');
    const target = `${year}-${padMonth}`;
    shifts = shifts.filter(s => s.shift_date && s.shift_date.startsWith(target));
  }
  if (start_date && end_date) {
    shifts = shifts.filter(s => s.shift_date >= start_date && s.shift_date <= end_date);
  }

  // Enrich with doctor, department, substitute, and conflict status
  const enriched = shifts.map(shift => {
    const doc = db.doctors.find(d => d.id === shift.doctor_id);
    const subDoc = shift.substitute_doctor_id ? db.doctors.find(d => d.id === shift.substitute_doctor_id) : null;
    const dept = db.departments.find(dp => dp.id === shift.department_id);
    const typeMeta = SHIFT_TYPE_MAP[shift.shift_type] || {
      label: shift.shift_type,
      full_label: shift.shift_type,
      color: '#64748b',
      is_mandatory_handover: false
    };

    // Check if doctor has active leave request on this shift date
    const leaveConflict = (db.leave_requests || []).find(r => 
      r.doctor_id === shift.doctor_id &&
      (r.status === 'PENDING' || r.status === 'APPROVED') &&
      shift.shift_date >= r.start_date &&
      shift.shift_date <= r.end_date
    );

    return {
      ...shift,
      shift_type_meta: typeMeta,
      doctor: doc ? {
        id: doc.id,
        name: `${doc.prefix_th}${doc.first_name_th} ${doc.last_name_th}`,
        employee_id: doc.employee_id,
        doctor_type: doc.doctor_type,
        avatar: doc.avatar
      } : null,
      substitute_doctor: subDoc ? {
        id: subDoc.id,
        name: `${subDoc.prefix_th}${subDoc.first_name_th} ${subDoc.last_name_th}`,
        employee_id: subDoc.employee_id,
        avatar: subDoc.avatar
      } : null,
      department: dept ? {
        id: dept.id,
        code: dept.code,
        name_th: dept.name_th
      } : null,
      has_leave_conflict: Boolean(leaveConflict),
      conflict_leave: leaveConflict ? {
        id: leaveConflict.id,
        request_no: leaveConflict.request_no,
        status: leaveConflict.status,
        duration_days: leaveConflict.duration_days
      } : null
    };
  });

  enriched.sort((a, b) => a.shift_date.localeCompare(b.shift_date));
  res.json(enriched);
});

// GET /api/shifts/check-conflict - Real-time collision detection before leave submission
router.get('/shifts/check-conflict', (req, res) => {
  const db = getDb();
  const { doctor_id, start_date, end_date, half_day_type = 'FULL_DAY' } = req.query;

  if (!doctor_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'doctor_id, start_date, and end_date are required' });
  }

  const shifts = (db.doctor_shifts || []).filter(s =>
    s.doctor_id === doctor_id &&
    s.status === 'SCHEDULED' &&
    s.shift_date >= start_date &&
    s.shift_date <= end_date
  );

  const conflicts = shifts.map(s => {
    const meta = SHIFT_TYPE_MAP[s.shift_type] || {};
    return {
      id: s.id,
      shift_date: s.shift_date,
      shift_type: s.shift_type,
      shift_label: meta.label || s.shift_type,
      full_label: meta.full_label || s.shift_type,
      time: `${s.start_time || '08:00'} - ${s.end_time || '16:00'}`,
      is_mandatory_handover: Boolean(meta.is_mandatory_handover),
      notes: s.notes
    };
  });

  const requiresSubstitute = conflicts.some(c => c.is_mandatory_handover);

  res.json({
    has_conflict: conflicts.length > 0,
    conflict_count: conflicts.length,
    conflicts,
    requires_substitute: requiresSubstitute,
    message: conflicts.length > 0
      ? `ตรวจพบตารางเวร ${conflicts.length} รายการตรงกับช่วงวันลา${requiresSubstitute ? ' (จำเป็นต้องระบุแพทย์รับเวรแทน)' : ''}`
      : 'ไม่พบตารางเวรตรงกับช่วงวันลา'
  });
});

// POST /api/shifts - Create single shift
router.post('/shifts', (req, res) => {
  const db = getDb();
  const {
    doctor_id,
    shift_date,
    shift_type,
    department_id,
    start_time,
    end_time,
    notes = '',
    actor_id
  } = req.body;

  if (!doctor_id || !shift_date || !shift_type) {
    return res.status(400).json({ error: 'กรุณาระบุแพทย์, วันที่ และประเภทเวร' });
  }

  const doc = db.doctors.find(d => d.id === doctor_id);
  const deptId = department_id || (doc ? doc.department_id : null);
  const meta = SHIFT_TYPE_MAP[shift_type] || {};

  const newShift = {
    id: uuidv4(),
    doctor_id,
    shift_date,
    shift_type,
    department_id: deptId,
    start_time: start_time || meta.start_time || '08:00',
    end_time: end_time || meta.end_time || '16:00',
    status: 'SCHEDULED',
    substitute_doctor_id: null,
    notes: notes.trim(),
    created_at: new Date().toISOString()
  };

  if (!db.doctor_shifts) db.doctor_shifts = [];
  db.doctor_shifts.push(newShift);

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'doctor_shifts',
    record_id: newShift.id,
    action: 'INSERT',
    actor_id: actor_id || null,
    new_data: newShift,
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.status(201).json(newShift);
});

// PUT /api/shifts/:id - Update shift
router.put('/shifts/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const index = (db.doctor_shifts || []).findIndex(s => s.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'ไม่พบตารางเวรที่ระบุ' });
  }

  const oldData = { ...db.doctor_shifts[index] };
  const updates = req.body;

  if (updates.doctor_id) db.doctor_shifts[index].doctor_id = updates.doctor_id;
  if (updates.shift_date) db.doctor_shifts[index].shift_date = updates.shift_date;
  if (updates.shift_type) db.doctor_shifts[index].shift_type = updates.shift_type;
  if (updates.start_time) db.doctor_shifts[index].start_time = updates.start_time;
  if (updates.end_time) db.doctor_shifts[index].end_time = updates.end_time;
  if (updates.status) db.doctor_shifts[index].status = updates.status;
  if (updates.substitute_doctor_id !== undefined) db.doctor_shifts[index].substitute_doctor_id = updates.substitute_doctor_id;
  if (updates.notes !== undefined) db.doctor_shifts[index].notes = updates.notes;

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'doctor_shifts',
    record_id: id,
    action: 'UPDATE',
    actor_id: updates.actor_id || null,
    old_data: oldData,
    new_data: db.doctor_shifts[index],
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json(db.doctor_shifts[index]);
});

// DELETE /api/shifts/:id - Delete shift
router.delete('/shifts/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const index = (db.doctor_shifts || []).findIndex(s => s.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'ไม่พบตารางเวรที่ระบุ' });
  }

  const removed = db.doctor_shifts.splice(index, 1)[0];

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'doctor_shifts',
    record_id: id,
    action: 'DELETE',
    actor_id: req.body?.actor_id || null,
    old_data: removed,
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json({ message: 'ลบรายการเวรสำเร็จ', id });
});

// POST /api/shifts/swap - Shift swap between two doctors
router.post('/shifts/swap', (req, res) => {
  const db = getDb();
  const { shift_id, target_doctor_id, reason = '', actor_id } = req.body;

  if (!shift_id || !target_doctor_id) {
    return res.status(400).json({ error: 'กรุณาระบุเวรที่ต้องการแลกและแพทย์ผู้รับเวร' });
  }

  const shift = (db.doctor_shifts || []).find(s => s.id === shift_id);
  if (!shift) {
    return res.status(404).json({ error: 'ไม่พบรายการเวรที่ระบุ' });
  }

  const oldDocId = shift.doctor_id;
  shift.doctor_id = target_doctor_id;
  shift.status = 'SWAPPED';
  shift.notes = `${shift.notes ? shift.notes + ' | ' : ''}แลกเวรจากเดิม: ${reason || 'ตามข้อตกลง'}`;

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'doctor_shifts',
    record_id: shift.id,
    action: 'SWAP',
    actor_id: actor_id || null,
    old_data: { doctor_id: oldDocId },
    new_data: { doctor_id: target_doctor_id, reason },
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json({ message: 'บันทึกการแลกเวรสำเร็จ', shift });
});

// POST /api/shifts/batch-monthly - Auto-generate department duty roster for whole month
router.post('/shifts/batch-monthly', (req, res) => {
  const db = getDb();
  const { department_id, year, month, actor_id, overwrite = false } = req.body;

  if (!department_id || !year || !month) {
    return res.status(400).json({ error: 'กรุณาระบุแผนก, ปี และเดือน' });
  }

  const deptDoctors = db.doctors.filter(d => d.department_id === department_id && d.is_active);
  if (deptDoctors.length === 0) {
    return res.status(400).json({ error: 'ไม่พบแพทย์ที่สังกัดแผนกนี้' });
  }

  const numYear = Number(year);
  const numMonth = Number(month);
  const daysInMonth = new Date(numYear, numMonth, 0).getDate();
  const padMonth = String(numMonth).padStart(2, '0');

  if (!db.doctor_shifts) db.doctor_shifts = [];

  // If overwrite, remove existing shifts for this department and month
  if (overwrite) {
    const targetPrefix = `${numYear}-${padMonth}`;
    db.doctor_shifts = db.doctor_shifts.filter(
      s => !(s.department_id === department_id && s.shift_date.startsWith(targetPrefix))
    );
  }

  let createdCount = 0;
  const shiftTypes = ['OPD_MORNING', 'OPD_AFTERNOON', 'IPD_ROUND', 'ER_DUTY', 'ON_CALL'];

  for (let day = 1; day <= daysInMonth; day++) {
    const padDay = String(day).padStart(2, '0');
    const dateStr = `${numYear}-${padMonth}-${padDay}`;
    const dateObj = new Date(numYear, numMonth - 1, day);
    const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Distribute duties among doctors
    deptDoctors.forEach((doc, docIdx) => {
      // Rotate duty pattern
      const dutyIndex = (day + docIdx) % shiftTypes.length;
      const typeKey = shiftTypes[dutyIndex];
      const meta = SHIFT_TYPE_MAP[typeKey];

      // Check if shift already exists for this doctor and date
      const exists = db.doctor_shifts.some(
        s => s.doctor_id === doc.id && s.shift_date === dateStr && s.shift_type === typeKey
      );

      if (!exists) {
        db.doctor_shifts.push({
          id: uuidv4(),
          doctor_id: doc.id,
          shift_date: dateStr,
          shift_type: typeKey,
          department_id,
          start_time: isWeekend && typeKey === 'ER_DUTY' ? '08:00' : meta.start_time,
          end_time: isWeekend && typeKey === 'ER_DUTY' ? '20:00' : meta.end_time,
          status: 'SCHEDULED',
          substitute_doctor_id: null,
          notes: isWeekend ? 'เวรวันหยุดสุดสัปดาห์' : 'ตารางเวรประจำวันตามรอบ',
          created_at: new Date().toISOString()
        });
        createdCount++;
      }
    });
  }

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'doctor_shifts',
    record_id: `batch-${department_id}-${numYear}-${padMonth}`,
    action: 'BATCH_GENERATE',
    actor_id: actor_id || null,
    new_data: { department_id, year: numYear, month: numMonth, created_count: createdCount },
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json({
    message: `สร้างตารางเวรประจำเดือน ${padMonth}/${numYear} เรียบร้อยแล้ว (${createdCount} รายการ)`,
    created_count: createdCount
  });
});

// -------------------------------------------------------------
// SETTINGS: MEDICAL AFFAIRS CONTACT & EMERGENCY
// -------------------------------------------------------------
router.get('/settings/contact', (req, res) => {
  const db = getDb();
  res.json(db.contact_settings || defaultContactSettings);
});

router.put('/settings/contact', (req, res) => {
  try {
    const db = getDb();
    db.contact_settings = {
      ...(db.contact_settings || defaultContactSettings),
      ...req.body,
      updated_at: new Date().toISOString()
    };
    saveStore();
    res.json({ message: 'บันทึกข้อมูลติดต่อฝ่ายการแพทย์เรียบร้อย', contact_settings: db.contact_settings });
  } catch (err) {
    console.error('Error saving contact settings:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
