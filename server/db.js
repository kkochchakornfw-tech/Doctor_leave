import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  departments as masterDepartments,
  doctors as masterDoctors,
  doctor_roles as masterDoctorRoles,
  approval_routes as masterApprovalRoutes
} from './hospital_flow_data.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

// Check Supabase connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey && supabaseUrl.startsWith('http'));

export let supabase = null;
if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('📡 Supabase Client configured for:', supabaseUrl);
  } catch (err) {
    console.warn('⚠️ Supabase init failed, falling back to local database engine:', err.message);
  }
}

// Initial Seed Data matching D:\supabase_schema.sql
const getInitialSeedData = () => {
  const departments = masterDepartments;

  const leave_types = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      code: 'VACATION',
      name_th: 'ลาพักร้อน',
      name_en: 'Annual Leave',
      count_mode: 'CALENDAR_DAYS',
      allows_half_day: true,
      requires_attachment: false,
      attachment_threshold_days: 0,
      attachment_deadline_days: 0,
      min_notice_days: 7,
      max_days_per_request: 10,
      min_tenure_months: 6,
      min_work_days_in_month: 15,
      allows_backdate: false,
      is_full_time_only: true,
      sort_order: 1,
      is_active: true,
      color: '#0ea5e9'
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      code: 'SICK',
      name_th: 'ลาป่วย',
      name_en: 'Sick Leave',
      count_mode: 'CALENDAR_DAYS',
      allows_half_day: true,
      requires_attachment: true,
      attachment_threshold_days: 2.0,
      attachment_deadline_days: 3,
      min_notice_days: 0,
      max_days_per_request: null,
      allows_backdate: true,
      is_full_time_only: false,
      sort_order: 2,
      is_active: true,
      color: '#ef4444'
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      code: 'PERSONAL',
      name_th: 'ลากิจ (ครอบครัวเสียชีวิต)',
      name_en: 'Bereavement / Personal Leave',
      count_mode: 'CALENDAR_DAYS',
      allows_half_day: true,
      requires_attachment: true,
      attachment_threshold_days: 0,
      attachment_deadline_days: 7,
      min_notice_days: 0,
      max_days_per_request: null,
      allows_backdate: true,
      is_full_time_only: false,
      sort_order: 3,
      is_active: true,
      color: '#f59e0b'
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      code: 'TRAINING',
      name_th: 'ลาฝึกอบรม/ประชุมวิชาการ',
      name_en: 'Training / Conference',
      count_mode: 'CALENDAR_DAYS',
      allows_half_day: false,
      requires_attachment: true,
      attachment_threshold_days: 0,
      attachment_deadline_days: 14,
      min_notice_days: 7,
      max_days_per_request: null,
      max_requests_per_year: 1,
      has_reimbursement_option: true,
      allows_backdate: false,
      is_full_time_only: false,
      sort_order: 4,
      is_active: true,
      color: '#8b5cf6'
    },
    {
      id: '55555555-5555-5555-5555-555555555555',
      code: 'UNPAID',
      name_th: 'ลาไม่รับค่าตอบแทน',
      name_en: 'Leave Without Pay',
      count_mode: 'CALENDAR_DAYS',
      allows_half_day: true,
      requires_attachment: true,
      attachment_threshold_days: 0,
      attachment_deadline_days: 3,
      min_notice_days: 0,
      max_days_per_request: 30,
      allows_backdate: false,
      is_full_time_only: false,
      sort_order: 5,
      is_active: true,
      color: '#64748b'
    },
    {
      id: '66666666-6666-6666-6666-666666666666',
      code: 'ORDINATION',
      name_th: 'ลาอุปสมบท',
      name_en: 'Ordination Leave',
      count_mode: 'CALENDAR_DAYS',
      allows_half_day: false,
      requires_attachment: true,
      attachment_threshold_days: 0,
      attachment_deadline_days: 30,
      min_notice_days: 30,
      max_days_per_request: 120,
      allows_backdate: false,
      is_full_time_only: true,
      sort_order: 6,
      is_active: true,
      color: '#d97706'
    },
    {
      id: '77777777-7777-7777-7777-777777777777',
      code: 'MATERNITY',
      name_th: 'ลาคลอดบุตร',
      name_en: 'Maternity Leave',
      count_mode: 'CALENDAR_DAYS',
      allows_half_day: false,
      requires_attachment: true,
      attachment_threshold_days: 0,
      attachment_deadline_days: 30,
      min_notice_days: 0,
      max_days_per_request: 90,
      allows_backdate: true,
      is_full_time_only: true,
      sort_order: 7,
      is_active: true,
      color: '#ec4899'
    },
    {
      id: '88888888-8888-8888-8888-888888888889',
      code: 'SHIFT_SWAP',
      name_th: 'ลาสลับวันออกตรวจ',
      name_en: 'Clinic Schedule Swap Leave',
      count_mode: 'CALENDAR_DAYS',
      allows_half_day: true,
      requires_attachment: false,
      attachment_threshold_days: 0,
      attachment_deadline_days: 3,
      min_notice_days: 0,
      max_days_per_request: null,
      allows_backdate: false,
      is_full_time_only: false,
      sort_order: 8,
      is_active: true,
      color: '#10b981'
    }
  ];

  const doctors = masterDoctors;
  const doctor_roles = masterDoctorRoles;
  const approval_routes = masterApprovalRoutes;

  const currentYear = new Date().getFullYear();

  // Dynamic initial balances for all doctors
  const leave_balances = [];
  doctors.forEach(doc => {
    leave_types.forEach(lt => {
      let entitlement = 0;
      if (lt.code === 'VACATION') entitlement = doc.doctor_type === 'PART_TIME' ? 0 : 20;
      else if (lt.code === 'SICK') entitlement = 30;
      else if (lt.code === 'ORDINATION') entitlement = 120;
      else if (lt.code === 'MATERNITY') entitlement = 90;
      else if (lt.code === 'UNPAID') entitlement = 30;

      leave_balances.push({
        id: `bal-${doc.id.slice(0, 8)}-${lt.code.toLowerCase()}-${currentYear}`,
        doctor_id: doc.id,
        leave_type_id: lt.id,
        fiscal_year: currentYear,
        entitlement_days: entitlement,
        carried_over_days: 0,
        used_days: 0,
        pending_days: 0,
        updated_at: new Date().toISOString()
      });
    });
  });

  // Clean Slate: No pending/stale leave requests
  const leave_requests = [];

  const holidays = [
    { id: '00000000-0000-0000-0000-000000001013', holiday_date: `${currentYear}-01-01`, name_th: 'วันขึ้นปีใหม่', is_active: true },
    { id: '00000000-0000-0000-0000-000000001014', holiday_date: `${currentYear}-04-13`, name_th: 'วันสงกรานต์', is_active: true },
    { id: '00000000-0000-0000-0000-000000001015', holiday_date: `${currentYear}-05-01`, name_th: 'วันแรงงานแห่งชาติ', is_active: true },
    { id: '00000000-0000-0000-0000-000000001016', holiday_date: `${currentYear}-12-05`, name_th: 'วันคล้ายวันพระบรมราชสมภพ ร.9', is_active: true }
  ];

  const approval_logs = [];
  const audit_logs = [];
  const leave_attachments = [];

  const tenure_rules = [
    { id: '1', min_years: 0, max_years: 0.5, entitlement_days: 0.0, prorate_monthly: 0, description: 'ทำงานไม่ถึง 6 เดือน (ยังไม่สามารถใช้สิทธิ์ลาพักร้อนได้)' },
    { id: '2', min_years: 0.5, max_years: 99, entitlement_days: 20.0, prorate_monthly: 0, description: 'ทำงานครบ 6 เดือนขึ้นไป เฉพาะ Full-time (สิทธิ์ 20 วัน/ปี คำนวณตามปฏิทิน)' }
  ];

  const tenure_settings = {
    max_carry_over_days: 5.0,
    allow_part_time: false,
    fiscal_year_start_month: 1
  };

  const contact_settings = {
    coordinator_name: 'คุณธัญญธร ตันติกุล (พี่กุ้ง)',
    phone_hotline: '089-470-9256',
    phone_emergency: '089-470-9256',
    notify_line: true
  };

  const doctor_shifts = [];

  return {
    departments,
    leave_types,
    doctors,
    doctor_roles,
    approval_routes,
    leave_balances,
    leave_requests,
    leave_attachments,
    approval_logs,
    audit_logs,
    holidays,
    tenure_rules,
    tenure_settings,
    contact_settings,
    doctor_shifts
  };
};

// Initialize file store if not exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// --- Initialization ---
let db = null;

export const initStore = async () => {
  const { loadStoreFromSupabase } = await import('./supabase_sync.js');
  let fallbackDb = null;
  
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      fallbackDb = JSON.parse(raw);
    } catch (err) {
      console.warn('Error reading store.json, resetting to seed:', err.message);
      fallbackDb = getInitialSeedData();
    }
  } else {
    fallbackDb = getInitialSeedData();
  }

  // Load from Supabase (or use fallback if disconnected)
  db = await loadStoreFromSupabase(fallbackDb);
  
  // Ensure tenure_rules, tenure_settings, contact_settings exist
  const seed = getInitialSeedData();
  if (!db.tenure_rules || db.tenure_rules.some(r => r.entitlement_days === 6 && r.min_years === 1)) {
    db.tenure_rules = seed.tenure_rules;
  }
  if (!db.tenure_settings) db.tenure_settings = seed.tenure_settings;
  if (!db.contact_settings || db.contact_settings.coordinator_name === 'คุณสิริมาศ' || db.contact_settings.phone_emergency === '076-361-888') {
    db.contact_settings = seed.contact_settings;
  }
  if (!db.doctor_shifts) db.doctor_shifts = seed.doctor_shifts;

  // Migrate/sync leave_types with latest policy requirements and deduplicate by code
  if (!db.leave_types) {
    db.leave_types = seed.leave_types;
  } else {
    const seenCodes = new Set();
    db.leave_types = db.leave_types.filter(lt => {
      if (!lt.code || seenCodes.has(lt.code)) return false;
      seenCodes.add(lt.code);
      return true;
    });

    seed.leave_types.forEach(seedLt => {
      const existing = db.leave_types.find(lt => lt.code === seedLt.code || lt.id === seedLt.id);
      if (existing) {
        existing.name_th = seedLt.name_th;
        existing.name_en = seedLt.name_en;
        existing.count_mode = seedLt.count_mode;
        existing.requires_attachment = seedLt.requires_attachment;
        existing.attachment_threshold_days = seedLt.attachment_threshold_days;
        existing.min_notice_days = seedLt.min_notice_days;
        existing.max_days_per_request = seedLt.max_days_per_request;
        existing.allows_backdate = seedLt.allows_backdate;
        existing.is_full_time_only = seedLt.is_full_time_only;
        if (seedLt.max_requests_per_year !== undefined) existing.max_requests_per_year = seedLt.max_requests_per_year;
        if (seedLt.has_reimbursement_option !== undefined) existing.has_reimbursement_option = seedLt.has_reimbursement_option;
        if (seedLt.min_tenure_months !== undefined) existing.min_tenure_months = seedLt.min_tenure_months;
        if (seedLt.min_work_days_in_month !== undefined) existing.min_work_days_in_month = seedLt.min_work_days_in_month;
      } else {
        db.leave_types.push(seedLt);
      }
    });
  }

  // Sync departments with latest master departments (add OBGYN, update min_staff_required, staffing_groups, staffing_mode, head_doctor_id)
  if (!db.departments) {
    db.departments = seed.departments;
  } else {
    seed.departments.forEach(seedDept => {
      const existing = db.departments.find(dp => dp.id === seedDept.id || dp.code === seedDept.code);
      if (existing) {
        if (existing.min_staff_required === undefined || existing.min_staff_required === 0) {
          existing.min_staff_required = seedDept.min_staff_required;
        }
        if (!existing.staffing_mode) {
          existing.staffing_mode = seedDept.staffing_mode || 'DEPARTMENT';
        }
        if ((!existing.staffing_groups || existing.staffing_groups.length === 0) && seedDept.staffing_groups?.length > 0) {
          existing.staffing_groups = seedDept.staffing_groups;
        }
        if (!existing.head_doctor_id && seedDept.head_doctor_id) {
          existing.head_doctor_id = seedDept.head_doctor_id;
        }
        if (!existing.final_approver_id && seedDept.final_approver_id) {
          existing.final_approver_id = seedDept.final_approver_id;
        }
        if (seedDept.name_th) existing.name_th = seedDept.name_th;
      } else {
        db.departments.push(seedDept);
      }
    });
  }

  // Sync doctors with latest seed (update EMP-KOONG real name/phone, add Dr. Manop, Dr. Thipsuda, Dr. Theeraphat, Dr. Piyada, set specialty_group)
  seed.doctors.forEach(seedDoc => {
    const existing = db.doctors.find(d => d.id === seedDoc.id || d.employee_id === seedDoc.employee_id);
    if (existing) {
      if (seedDoc.specialty_group && !existing.specialty_group) existing.specialty_group = seedDoc.specialty_group;
      if (seedDoc.department_id && !existing.department_id) existing.department_id = seedDoc.department_id;
      if (seedDoc.employee_id === 'EMP-KOONG') {
        existing.prefix_th = seedDoc.prefix_th;
        existing.first_name_th = seedDoc.first_name_th;
        existing.last_name_th = seedDoc.last_name_th;
        existing.phone = seedDoc.phone;
        existing.position = seedDoc.position;
        existing.license_no = null;
      }
    } else {
      db.doctors.push(seedDoc);
    }
  });

  // Ensure EMP-KOONG does not have DOCTOR role or approval_routes as applicant
  if (db.doctor_roles) {
    db.doctor_roles = db.doctor_roles.filter(r => !(r.doctor_id === 'c0000000-0000-0000-0000-000000000001' && r.role === 'DOCTOR'));
  }
  if (db.approval_routes) {
    db.approval_routes = db.approval_routes.filter(r => r.doctor_id !== 'c0000000-0000-0000-0000-000000000001');
  }

  // Sync doctor roles
  seed.doctor_roles.forEach(seedRole => {
    const exists = db.doctor_roles.some(r => r.doctor_id === seedRole.doctor_id && r.role === seedRole.role);
    if (!exists) {
      db.doctor_roles.push(seedRole);
    }
  });

  // Sync approval routes
  seed.approval_routes.forEach(seedRoute => {
    const exists = db.approval_routes.some(r => r.doctor_id === seedRoute.doctor_id && r.step_order === seedRoute.step_order);
    if (!exists) {
      db.approval_routes.push(seedRoute);
    }
  });

  // Remove legacy duplicate doctor DOC-001 (นพ.ปารวี c0000000-0000-0000-0000-000000000002) which duplicated HEAD-MED / HEAD-PED
  const legacyParaveeId = 'c0000000-0000-0000-0000-000000000002';
  const realHeadMedId = 'c0000000-0000-0000-0000-000000000011';
  if (db.doctors) {
    db.doctors = db.doctors.filter(d => d.id !== legacyParaveeId);
  }
  if (db.doctor_roles) {
    db.doctor_roles = db.doctor_roles.filter(r => r.doctor_id !== legacyParaveeId);
  }
  if (db.doctor_shifts) {
    db.doctor_shifts.forEach(s => {
      if (s.doctor_id === legacyParaveeId) s.doctor_id = realHeadMedId;
      if (s.substitute_doctor_id === legacyParaveeId) s.substitute_doctor_id = realHeadMedId;
    });
  }
  if (db.leave_requests) {
    db.leave_requests.forEach(r => {
      if (r.doctor_id === legacyParaveeId) r.doctor_id = realHeadMedId;
      if (r.substitute_doctor_id === legacyParaveeId) r.substitute_doctor_id = realHeadMedId;
    });
  }

  // Ensure all doctors have hire_date & up-to-date balances for all leave types
  const currentYear = new Date().getFullYear();
  db.doctors.forEach(d => {
    if (!d.hire_date) {
      const match = seed.doctors.find(sd => sd.id === d.id);
      d.hire_date = match?.hire_date || '2023-01-01';
    }
    db.leave_types.forEach(lt => {
      let bal = db.leave_balances.find(b => b.doctor_id === d.id && b.leave_type_id === lt.id && b.fiscal_year === currentYear);
      let defaultEntitlement = 0;
      if (lt.code === 'VACATION') defaultEntitlement = d.doctor_type === 'PART_TIME' ? 0 : 20;
      else if (lt.code === 'SICK') defaultEntitlement = 30;
      else if (lt.code === 'ORDINATION') defaultEntitlement = 120;
      else if (lt.code === 'MATERNITY') defaultEntitlement = 90;
      else if (lt.code === 'UNPAID') defaultEntitlement = 30;

      if (!bal) {
        db.leave_balances.push({
          id: `bal-${d.id.slice(0, 8)}-${lt.code.toLowerCase()}-${currentYear}`,
          doctor_id: d.id,
          leave_type_id: lt.id,
          fiscal_year: currentYear,
          entitlement_days: defaultEntitlement,
          carried_over_days: 0,
          used_days: 0,
          pending_days: 0,
          updated_at: new Date().toISOString()
        });
      } else {
        if (lt.code === 'VACATION' && d.doctor_type !== 'PART_TIME' && bal.entitlement_days < 20) {
          bal.entitlement_days = 20;
        } else if (lt.code === 'ORDINATION' && bal.entitlement_days === 0) {
          bal.entitlement_days = 120;
        } else if (lt.code === 'MATERNITY' && bal.entitlement_days === 0) {
          bal.entitlement_days = 90;
        } else if (lt.code === 'UNPAID' && bal.entitlement_days === 0) {
          bal.entitlement_days = 30;
        }
      }
    });
  });

  // Save the merged/fetched data back to local store
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
};


export const saveStore = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
    
    // Background sync to Supabase
    if (isSupabaseConfigured && supabase) {
      import('./supabase_sync.js').then(({ syncStoreToSupabase }) => {
        syncStoreToSupabase(db);
      }).catch(err => console.error('Failed to load sync module:', err));
    }
  } catch (err) {
    console.error('Failed to save store.json:', err);
  }
};

export const getDb = () => db;

// Reset Store for testing
export const resetStore = () => {
  db = getInitialSeedData();
  saveStore();
  return db;
};

