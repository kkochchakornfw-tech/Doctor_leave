// Master Hospital Flow Data for Bangkok Hospital Siriroj (BSI)
// Based on Approval Flow from P'Koong (ฝ่ายการแพทย์) and BSI Doctors Master Data

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const currentYear = new Date().getFullYear();

// 1. All 11 Departments as specified by P'Koong + Executive Admin
export const departments = [
  {
    id: 'd1111111-1111-1111-1111-111111111111',
    code: 'MED',
    name_th: 'อายุรกรรม',
    name_en: 'Internal Medicine',
    min_staff_required: 5,
    max_leave_per_day: 3,
    staffing_mode: 'DEPARTMENT',
    staffing_groups: [
      { id: 'MED_GEN', name_th: 'อายุรกรรมทั่วไป', min_staff_required: 4 },
      { id: 'MED_KIDNEY', name_th: 'อายุรกรรมโรคไต', min_staff_required: 1 },
      { id: 'MED_HEART', name_th: 'อายุรกรรมหัวใจ', min_staff_required: 1 }
    ],
    head_doctor_id: 'c0000000-0000-0000-0000-000000000011', // นพ.ธันวา
    final_approver_id: 'c0000000-0000-0000-0000-000000000099', // นพ.ปริวรรธน์
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'd2222222-2222-2222-2222-222222222222',
    code: 'PED',
    name_th: 'กุมาร',
    name_en: 'Pediatrics',
    min_staff_required: 4,
    max_leave_per_day: 2,
    staffing_mode: 'DEPARTMENT',
    staffing_groups: [],
    head_doctor_id: 'c0000000-0000-0000-0000-000000000012', // นพ.ปานรวี
    final_approver_id: 'c0000000-0000-0000-0000-000000000099',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'dbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    code: 'OBGYN',
    name_th: 'สูตินรีเวช',
    name_en: 'Obstetrics & Gynecology',
    min_staff_required: 2,
    max_leave_per_day: 1,
    staffing_mode: 'DEPARTMENT',
    staffing_groups: [],
    head_doctor_id: 'c0000000-0000-0000-0000-000000000030', // นพ.มานพ
    final_approver_id: 'c0000000-0000-0000-0000-000000000099',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'd3333333-3333-3333-3333-333333333333',
    code: 'SURG_ORTHO_REHAB',
    name_th: 'ศัลยกรรมทั่วไป ศัลยกรรมกระดูก เวชศาสตร์ฟื้นฟู',
    name_en: 'Surgery, Orthopedics & Rehabilitation',
    min_staff_required: 4,
    max_leave_per_day: 2,
    staffing_mode: 'GROUP',
    staffing_groups: [
      { id: 'SURG_GEN', name_th: 'ศัลยกรรมทั่วไป', min_staff_required: 2 },
      { id: 'SURG_ORTHO', name_th: 'ศัลยกรรมกระดูกและข้อ', min_staff_required: 2 },
      { id: 'SURG_REHAB', name_th: 'เวชศาสตร์ฟื้นฟู', min_staff_required: 0 }
    ],
    head_doctor_id: 'c0000000-0000-0000-0000-000000000013', // นพ.ศุษณะ
    final_approver_id: 'c0000000-0000-0000-0000-000000000099',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'd4444444-4444-4444-4444-444444444444',
    code: 'DENT',
    name_th: 'ทันตกรรม',
    name_en: 'Dentistry',
    min_staff_required: 2,
    max_leave_per_day: 2,
    staffing_mode: 'DEPARTMENT',
    staffing_groups: [],
    head_doctor_id: 'c0000000-0000-0000-0000-000000000014', // ทพ.นันทภพ
    final_approver_id: 'c0000000-0000-0000-0000-000000000099',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'd5555555-5555-5555-5555-555555555555',
    code: 'EYE_ENT',
    name_th: 'Eye ENT',
    name_en: 'Eye & ENT',
    min_staff_required: 2,
    max_leave_per_day: 1,
    staffing_mode: 'GROUP',
    staffing_groups: [
      { id: 'EYE', name_th: 'จักษุ (EYE)', min_staff_required: 1 },
      { id: 'ENT', name_th: 'โสต ศอ นาสิก (ENT)', min_staff_required: 1 }
    ],
    head_doctor_id: 'c0000000-0000-0000-0000-000000000015', // นพ.เฉลิมวิทย์
    final_approver_id: 'c0000000-0000-0000-0000-000000000099',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'd6666666-6666-6666-6666-666666666666',
    code: 'RAD',
    name_th: 'รังสี และ รังสีรักษา',
    name_en: 'Radiology & Radiation Oncology',
    min_staff_required: 2,
    max_leave_per_day: 1,
    staffing_mode: 'DEPARTMENT',
    staffing_groups: [],
    head_doctor_id: 'c0000000-0000-0000-0000-000000000016', // พญ.วลัยวรรณ
    final_approver_id: 'c0000000-0000-0000-0000-000000000099',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'd7777777-7777-7777-7777-777777777777',
    code: 'ER_OUTREACH',
    name_th: 'Emergency & Outreach Clinic',
    name_en: 'Emergency & Outreach Clinic',
    min_staff_required: 0,
    max_leave_per_day: 2,
    staffing_mode: 'DEPARTMENT',
    staffing_groups: [],
    head_doctor_id: 'c0000000-0000-0000-0000-000000000017', // นพ.สุขสันต์
    final_approver_id: 'c0000000-0000-0000-0000-000000000099',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'd8888888-8888-8888-8888-888888888888',
    code: 'HEALTH_PROMO',
    name_th: 'HealthPromotion',
    name_en: 'Health Promotion',
    min_staff_required: 0,
    max_leave_per_day: 1,
    staffing_mode: 'DEPARTMENT',
    staffing_groups: [],
    head_doctor_id: 'c0000000-0000-0000-0000-000000000018', // นพ.ชัยวัฒน์
    final_approver_id: 'c0000000-0000-0000-0000-000000000099',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'd9999999-9999-9999-9999-999999999999',
    code: 'ANES',
    name_th: 'วิสัญญี',
    name_en: 'Anesthesiology',
    min_staff_required: 0,
    max_leave_per_day: 2,
    staffing_mode: 'DEPARTMENT',
    staffing_groups: [],
    head_doctor_id: 'c0000000-0000-0000-0000-000000000019', // นพ.วีระ
    final_approver_id: 'c0000000-0000-0000-0000-000000000099',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    code: 'PPSI_SKIN',
    name_th: 'PPSI + Skin',
    name_en: 'PPSI & Skin',
    min_staff_required: 0,
    max_leave_per_day: 2,
    staffing_mode: 'DEPARTMENT',
    staffing_groups: [],
    head_doctor_id: 'c0000000-0000-0000-0000-000000000020', // นพ.สงวน
    final_approver_id: 'c0000000-0000-0000-0000-000000000099',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'd0000000-0000-0000-0000-000000000000',
    code: 'EXEC',
    name_th: 'ฝ่ายบริหารการแพทย์ (ผู้บริหาร)',
    name_en: 'Medical Administration & Executive',
    min_staff_required: 0,
    max_leave_per_day: 1,
    staffing_mode: 'DEPARTMENT',
    staffing_groups: [],
    head_doctor_id: 'c0000000-0000-0000-0000-000000000099',
    final_approver_id: 'c0000000-0000-0000-0000-000000000099',
    is_active: true,
    created_at: new Date().toISOString()
  }
];

// Mapping BSI Hospital Units to 11 Official Leave Departments
const DEPT_MAP = {
  'Medicine Unit': 'd1111111-1111-1111-1111-111111111111',          // อายุรกรรม (MED)
  'Hemodialysis': 'd1111111-1111-1111-1111-111111111111',           // อายุรกรรมโรคไต (MED)
  'Pediatrics': 'd2222222-2222-2222-2222-222222222222',             // กุมาร (PED)
  'Obstetrics & Gynecology': 'dbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',  // สูตินรีเวช (OBGYN)
  'Surgery Unit': 'd3333333-3333-3333-3333-333333333333',           // ศัลยกรรมทั่วไป (SURG)
  'Orthopedic Surgery': 'd3333333-3333-3333-3333-333333333333',     // ศัลยกรรมกระดูกและข้อ (SURG)
  'Rehabilitation': 'd3333333-3333-3333-3333-333333333333',         // เวชศาสตร์ฟื้นฟู (SURG)
  'Dental': 'd4444444-4444-4444-4444-444444444444',                 // ทันตกรรม (DENT)
  'Eye Ear Nose Throat': 'd5555555-5555-5555-5555-555555555555',    // Eye ENT (EYE_ENT)
  'Imaging': 'd6666666-6666-6666-6666-666666666666',                // รังสี และ รังสีรักษา (RAD)
  'Cancer Center': 'd6666666-6666-6666-6666-666666666666',          // รังสี และ รังสีรักษา (RAD)
  'Emergency': 'd7777777-7777-7777-7777-777777777777',              // Emergency & Outreach (ER_OUTREACH)
  'Outreach Clinic': 'd7777777-7777-7777-7777-777777777777',        // Emergency & Outreach (ER_OUTREACH)
  'Health Promotion': 'd8888888-8888-8888-8888-888888888888',       // HealthPromotion (HEALTH_PROMO)
  'Laboratory': 'd8888888-8888-8888-8888-888888888888',             // HealthPromotion (HEALTH_PROMO)
  'Anesthetic': 'd9999999-9999-9999-9999-999999999999',             // วิสัญญี (ANES)
  'Operating Room (PPSI)': 'daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',  // PPSI + Skin (PPSI_SKIN)
  'Skin and Aesthetic': 'daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'      // PPSI + Skin (PPSI_SKIN)
};

// Known Head Doctors & Admin mapping to preserve their roles & IDs
const PRESERVED_ACCOUNTS = {
  'EXEC-PARIWAT': {
    id: 'c0000000-0000-0000-0000-000000000099',
    employee_id: 'EXEC-PARIWAT',
    doctor_code: '002928',
    license: '42559',
    roles: ['DEPT_HEAD', 'ADMIN', 'DOCTOR', 'EXECUTIVE_APPROVER']
  },
  'HEAD-MED': {
    id: 'c0000000-0000-0000-0000-000000000011',
    employee_id: 'HEAD-MED',
    doctor_code: '033989',
    license: '46825',
    roles: ['DEPT_HEAD', 'DOCTOR']
  },
  'HEAD-PED': {
    id: 'c0000000-0000-0000-0000-000000000012',
    employee_id: 'HEAD-PED',
    doctor_code: '000012',
    license: '20682',
    roles: ['DEPT_HEAD', 'DOCTOR']
  },
  'HEAD-SURG': {
    id: 'c0000000-0000-0000-0000-000000000013',
    employee_id: 'HEAD-SURG',
    doctor_code: '002356',
    license: '26964',
    roles: ['DEPT_HEAD', 'DOCTOR']
  },
  'HEAD-DENT': {
    id: 'c0000000-0000-0000-0000-000000000014',
    employee_id: 'HEAD-DENT',
    doctor_code: '099351',
    license: 'ท.14067',
    roles: ['DEPT_HEAD', 'DOCTOR']
  },
  'HEAD-EYEENT': {
    id: 'c0000000-0000-0000-0000-000000000015',
    employee_id: 'HEAD-EYEENT',
    doctor_code: '001496',
    license: '27165',
    roles: ['DEPT_HEAD', 'DOCTOR']
  },
  'HEAD-RAD': {
    id: 'c0000000-0000-0000-0000-000000000016',
    employee_id: 'HEAD-RAD',
    doctor_code: '000010',
    license: '13712',
    roles: ['DEPT_HEAD', 'DOCTOR']
  },
  'HEAD-ER': {
    id: 'c0000000-0000-0000-0000-000000000017',
    employee_id: 'HEAD-ER',
    doctor_code: '099382',
    license: '51618',
    roles: ['DEPT_HEAD', 'DOCTOR']
  },
  'HEAD-HP': {
    id: 'c0000000-0000-0000-0000-000000000018',
    employee_id: 'HEAD-HP',
    doctor_code: '003374',
    license: '46805',
    roles: ['DEPT_HEAD', 'DOCTOR']
  },
  'HEAD-ANES': {
    id: 'c0000000-0000-0000-0000-000000000019',
    employee_id: 'HEAD-ANES',
    doctor_code: '002767',
    license: '30224',
    roles: ['DEPT_HEAD', 'DOCTOR']
  },
  'HEAD-PPSI': {
    id: 'c0000000-0000-0000-0000-000000000020',
    employee_id: 'HEAD-PPSI',
    doctor_code: '003173',
    license: '12287',
    roles: ['DEPT_HEAD', 'DOCTOR']
  },
  'HEAD-OBGYN': {
    id: 'c0000000-0000-0000-0000-000000000030',
    employee_id: 'HEAD-OBGYN',
    doctor_code: '003304',
    license: '28364',
    roles: ['DEPT_HEAD', 'DOCTOR']
  }
};

function buildMasterHospitalData() {
  const CSV_PATH = path.join(__dirname, 'data', 'bsi_doctors_master.csv');
  const allDoctors = [];
  const allDoctorRoles = [];
  const allApprovalRoutes = [];

  // P'Koong: HR / Medical Admin
  const koong = {
    id: 'c0000000-0000-0000-0000-000000000001',
    employee_id: 'EMP-KOONG',
    license_no: null,
    line_user_id: null,
    prefix_th: 'คุณ',
    first_name_th: 'ธัญญธร',
    last_name_th: 'ตันติกุล (พี่กุ้ง)',
    position: 'HR / ผู้ดูแลระบบ (Admin)',
    doctor_type: 'FULL_TIME',
    department_id: 'd0000000-0000-0000-0000-000000000000',
    phone: '089-470-9256',
    email: 'koong_med@bsi.hospital',
    hire_date: '2018-05-01',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  };
  allDoctors.push(koong);
  allDoctorRoles.push(
    { id: 'b0000000-0000-0000-0000-000000000001', doctor_id: koong.id, role: 'MEDICAL_ADMIN' },
    { id: 'b0000000-0000-0000-0000-000000000002', doctor_id: koong.id, role: 'ADMIN' }
  );

  // Dedicated Test Doctor for User (Fully bound to LINE for easy testing & with full access)
  const testDoctor = {
    id: 'c0000000-0000-0000-0000-000000009999',
    employee_id: 'DOC-TEST',
    doctor_code: 'TEST01',
    license_no: 'ว. 99999',
    line_user_id: null, // Unbound: Ready to test onboarding
    prefix_th: 'นพ.',
    first_name_th: 'ทดสอบ',
    last_name_th: 'ระบบแพทย์',
    position: 'แพทย์ประจำ (บัญชีทดสอบระบบ)',
    doctor_type: 'FULL_TIME',
    department_id: 'd1111111-1111-1111-1111-111111111111', // อายุรกรรม
    specialties: 'อายุรศาสตร์ (Internal Medicine)',
    sub_specialties: 'ทดสอบระบบ',
    phone: '089-999-9999',
    email: 'test.doctor@bsi.hospital',
    hire_date: '2020-01-01',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  };
  allDoctors.push(testDoctor);
  ['DOCTOR', 'DEPT_HEAD', 'APPROVER', 'MEDICAL_ADMIN', 'ADMIN', 'EXECUTIVE_APPROVER'].forEach((role, rIdx) => {
    allDoctorRoles.push({
      id: `role-test-${rIdx}`,
      doctor_id: testDoctor.id,
      role: role
    });
  });
  allApprovalRoutes.push(
    {
      id: 'route-test-1',
      doctor_id: testDoctor.id,
      step_order: 1,
      approver_id: 'c0000000-0000-0000-0000-000000000011', // นพ.ธันวา (อายุรกรรม)
      is_active: true
    },
    {
      id: 'route-test-2',
      doctor_id: testDoctor.id,
      step_order: 2,
      approver_id: 'c0000000-0000-0000-0000-000000000099', // นพ.ปริวรรธน์ (ผช.ผอ.)
      is_active: true
    }
  );

  const deptHeadMap = {};
  departments.forEach(d => {
    deptHeadMap[d.id] = d.head_doctor_id;
  });

  const EXEC_APPROVER_ID = 'c0000000-0000-0000-0000-000000000099';

  if (!fs.existsSync(CSV_PATH)) {
    return { doctors: allDoctors, doctor_roles: allDoctorRoles, approval_routes: allApprovalRoutes };
  }

  const content = fs.readFileSync(CSV_PATH, 'utf8').trim();
  const lines = content.split('\n');
  const rows = lines.slice(1).map(l => l.split(','));
  const processedDoctorCodes = new Set();

  rows.forEach((r, idx) => {
    const doctorCode = r[5]?.trim() || `DOC-${idx + 1}`;
    if (processedDoctorCodes.has(doctorCode)) return;
    processedDoctorCodes.add(doctorCode);

    const licenseNo = r[8]?.trim();
    const prefixTh = r[14]?.trim() || 'นพ.';
    const firstNameTh = r[15]?.trim();
    const lastNameTh = r[16]?.trim();
    const workTypeStr = r[24]?.trim();
    const doctorType = workTypeStr === 'Full-Time' ? 'FULL_TIME' : 'PART_TIME';
    const deptNameCsv = r[28]?.trim();
    const deptId = DEPT_MAP[deptNameCsv] || 'd1111111-1111-1111-1111-111111111111';
    const specialties = r[30]?.trim() || '';
    const subSpecialties = r[31]?.trim() || '';
    const status = r[32]?.trim();
    const isActive = status !== 'Inactive';
    const startDate = r[33]?.trim() || '2020-01-01';

    let preserved = null;
    for (const key of Object.keys(PRESERVED_ACCOUNTS)) {
      const p = PRESERVED_ACCOUNTS[key];
      if (p.doctor_code === doctorCode || (p.license && p.license === licenseNo)) {
        preserved = p;
        break;
      }
    }

    const docId = preserved ? preserved.id : `c0000000-0000-0000-0000-${doctorCode.padStart(12, '0')}`;
    const employeeId = preserved ? preserved.employee_id : `DOC-${doctorCode}`;

    let displayLicense = licenseNo;
    if (licenseNo && !licenseNo.startsWith('ว.') && !licenseNo.startsWith('ท.')) {
      displayLicense = `ว. ${licenseNo}`;
    }

    let position = `${doctorType === 'FULL_TIME' ? 'แพทย์ประจำ' : 'แพทย์พาร์ทไทม์'}`;
    if (specialties) {
      position += ` (${specialties.split('/')[0].split('(')[0].trim()})`;
    }

    const docObj = {
      id: docId,
      employee_id: employeeId,
      doctor_code: doctorCode,
      license_no: displayLicense || null,
      line_user_id: null,
      prefix_th: prefixTh,
      first_name_th: firstNameTh,
      last_name_th: lastNameTh,
      position: preserved?.employee_id === 'EXEC-PARIWAT' ? 'ผู้ช่วยผู้อำนวยการโรงพยาบาล' : position,
      doctor_type: doctorType,
      department_id: preserved?.employee_id === 'EXEC-PARIWAT' ? 'd0000000-0000-0000-0000-000000000000' : deptId,
      specialties: specialties,
      sub_specialties: subSpecialties,
      phone: null,
      email: `${doctorCode.toLowerCase()}@bsi.hospital`,
      hire_date: startDate,
      is_active: isActive,
      avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString()
    };
    allDoctors.push(docObj);

    if (preserved) {
      preserved.roles.forEach((role, rIdx) => {
        allDoctorRoles.push({
          id: `role-${docId.slice(0, 8)}-${rIdx}`,
          doctor_id: docId,
          role: role
        });
      });
    } else {
      allDoctorRoles.push({
        id: `role-${docId.slice(0, 8)}-0`,
        doctor_id: docId,
        role: 'DOCTOR'
      });
    }

    if (preserved?.employee_id === 'EXEC-PARIWAT') {
      // Top executive
    } else if (preserved?.roles?.includes('DEPT_HEAD')) {
      allApprovalRoutes.push({
        id: `route-${docId.slice(0, 8)}-1`,
        doctor_id: docId,
        step_order: 1,
        approver_id: EXEC_APPROVER_ID,
        is_active: true
      });
    } else {
      const headId = deptHeadMap[deptId] || EXEC_APPROVER_ID;
      allApprovalRoutes.push({
        id: `route-${docId.slice(0, 8)}-1`,
        doctor_id: docId,
        step_order: 1,
        approver_id: headId,
        is_active: true
      });
      allApprovalRoutes.push({
        id: `route-${docId.slice(0, 8)}-2`,
        doctor_id: docId,
        step_order: 2,
        approver_id: EXEC_APPROVER_ID,
        is_active: true
      });
    }
  });

  return { doctors: allDoctors, doctor_roles: allDoctorRoles, approval_routes: allApprovalRoutes };
}

const { doctors: builtDoctors, doctor_roles: builtDoctorRoles, approval_routes: builtApprovalRoutes } = buildMasterHospitalData();

export const doctors = builtDoctors;
export const doctor_roles = builtDoctorRoles;
export const approval_routes = builtApprovalRoutes;
