// Master Hospital Flow Data for Bangkok Hospital Siriroj (BSI)
// Based on Approval Flow from P'Koong (ฝ่ายการแพทย์)

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
    staffing_groups: [
      { id: 'SURG_GEN', name_th: 'ศัลยกรรมทั่วไป', min_staff_required: 2 },
      { id: 'SURG_ORTHO', name_th: 'ศัลยกรรมกระดูกและข้อ', min_staff_required: 2 },
      { id: 'SURG_REHAB', name_th: 'เวชศาสตร์ฟื้นฟู', min_staff_required: null }
    ],
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
    staffing_groups: [
      { id: 'EYE', name_th: 'จักษุ (EYE)', min_staff_required: 1 },
      { id: 'ENT', name_th: 'โสต ศอ นาสิก (ENT)', min_staff_required: 1 }
    ],
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
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'd7777777-7777-7777-7777-777777777777',
    code: 'ER_OUTREACH',
    name_th: 'Emergency & Outreach Clinic',
    name_en: 'Emergency & Outreach Clinic',
    min_staff_required: null,
    max_leave_per_day: 2,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'd8888888-8888-8888-8888-888888888888',
    code: 'HEALTH_PROMO',
    name_th: 'HealthPromotion',
    name_en: 'Health Promotion',
    min_staff_required: null,
    max_leave_per_day: 1,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'd9999999-9999-9999-9999-999999999999',
    code: 'ANES',
    name_th: 'วิสัญญี',
    name_en: 'Anesthesiology',
    min_staff_required: null,
    max_leave_per_day: 2,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    code: 'PPSI_SKIN',
    name_th: 'PPSI + Skin',
    name_en: 'PPSI & Skin',
    min_staff_required: null,
    max_leave_per_day: 2,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'd0000000-0000-0000-0000-000000000000',
    code: 'EXEC',
    name_th: 'ฝ่ายบริหารการแพทย์ (ผู้บริหาร)',
    name_en: 'Medical Administration & Executive',
    min_staff_required: null,
    max_leave_per_day: 1,
    is_active: true,
    created_at: new Date().toISOString()
  }
];

// 2. Doctors: Executive (ผช.ผอ.), Medical Admin (พี่กุ้ง), 11 Dept Heads, and Staff Doctors
export const doctors = [
  // นพ.ปริวรรธน์ ระเด่น - ผู้ช่วยผู้อำนวยการ รพ.
  {
    id: 'c0000000-0000-0000-0000-000000000099',
    employee_id: 'EXEC-PARIWAT',
    license_no: 'ว. 28914',
    line_user_id: 'U_DR_PARIWAT_EXEC',
    prefix_th: 'นพ.',
    first_name_th: 'ปริวรรธน์',
    last_name_th: 'ระเด่น',
    position: 'ผู้ช่วยผู้อำนวยการโรงพยาบาล',
    doctor_type: 'FULL_TIME',
    department_id: 'd0000000-0000-0000-0000-000000000000',
    phone: '081-9990001',
    email: 'pariwat.r@bsi.hospital',
    hire_date: '2015-03-01',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  },
  // คุณสิริมาศ (พี่กุ้ง) ฝ่ายการแพทย์
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    employee_id: 'EMP-KOONG',
    license_no: null,
    line_user_id: 'U_KOONG_LINE_ADMIN',
    prefix_th: 'คุณ',
    first_name_th: 'สิริมาศ (พี่กุ้ง)',
    last_name_th: 'ฝ่ายการแพทย์',
    position: 'หัวหน้างานฝ่ายการแพทย์ (Admin)',
    doctor_type: 'FULL_TIME',
    department_id: 'd0000000-0000-0000-0000-000000000000',
    phone: '076-361888',
    email: 'koong_med@bsi.hospital',
    hire_date: '2018-05-01',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  },
  // 1. หัวหน้าแผนกอายุรกรรม: นพ.ธันวา ธีรัตพชรากุล
  {
    id: 'c0000000-0000-0000-0000-000000000011',
    employee_id: 'HEAD-MED',
    license_no: 'ว. 31245',
    line_user_id: 'U_DR_THANWA_HEAD',
    prefix_th: 'นพ.',
    first_name_th: 'ธันวา',
    last_name_th: 'ธีรัตพชรากุล',
    position: 'หัวหน้าแผนกอายุรกรรม',
    doctor_type: 'FULL_TIME',
    department_id: 'd1111111-1111-1111-1111-111111111111',
    phone: '081-1110011',
    email: 'thanwa.t@bsi.hospital',
    hire_date: '2019-01-10',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  },
  // 2. หัวหน้าแผนกกุมาร: นพ.ปานรวี มีมารยาตร์
  {
    id: 'c0000000-0000-0000-0000-000000000012',
    employee_id: 'HEAD-PED',
    license_no: 'ว. 34567',
    line_user_id: 'U_DR_PANRAWEE_HEAD',
    prefix_th: 'นพ.',
    first_name_th: 'ปานรวี',
    last_name_th: 'มีมารยาตร์',
    position: 'หัวหน้าแผนกกุมาร',
    doctor_type: 'FULL_TIME',
    department_id: 'd2222222-2222-2222-2222-222222222222',
    phone: '081-1110012',
    email: 'panrawee.m@bsi.hospital',
    hire_date: '2020-01-15',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  },
  // 3. หัวหน้าแผนกศัลยกรรมทั่วไป ศัลยกรรมกระดูก เวชศาสตร์ฟื้นฟู: นพ.ศุษณะ สกุลพิพัฒน์
  {
    id: 'c0000000-0000-0000-0000-000000000013',
    employee_id: 'HEAD-SURG',
    license_no: 'ว. 36789',
    line_user_id: 'U_DR_SUTSANA_HEAD',
    prefix_th: 'นพ.',
    first_name_th: 'ศุษณะ',
    last_name_th: 'สกุลพิพัฒน์',
    position: 'หัวหน้าแผนกศัลยกรรมทั่วไป ศัลยกรรมกระดูก เวชศาสตร์ฟื้นฟู',
    doctor_type: 'FULL_TIME',
    department_id: 'd3333333-3333-3333-3333-333333333333',
    specialty_group: 'SURG_GEN',
    phone: '081-1110013',
    email: 'sutsana.s@bsi.hospital',
    hire_date: '2019-06-01',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  },
  // 4. หัวหน้าแผนกทันตกรรม: ทพ.นันทภพ ทองเทพ
  {
    id: 'c0000000-0000-0000-0000-000000000014',
    employee_id: 'HEAD-DENT',
    license_no: 'ทว. 12890',
    line_user_id: 'U_DR_NANTHAPHOP_HEAD',
    prefix_th: 'ทพ.',
    first_name_th: 'นันทภพ',
    last_name_th: 'ทองเทพ',
    position: 'หัวหน้าแผนกทันตกรรม',
    doctor_type: 'FULL_TIME',
    department_id: 'd4444444-4444-4444-4444-444444444444',
    phone: '081-1110014',
    email: 'nanthaphop.t@bsi.hospital',
    hire_date: '2021-02-15',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  },
  // 5. หัวหน้าแผนก Eye ENT: นพ.เฉลิมวิทย์ ภูริจิตราวงศ์
  {
    id: 'c0000000-0000-0000-0000-000000000015',
    employee_id: 'HEAD-EYEENT',
    license_no: 'ว. 39012',
    line_user_id: 'U_DR_CHALERMVIT_HEAD',
    prefix_th: 'นพ.',
    first_name_th: 'เฉลิมวิทย์',
    last_name_th: 'ภูริจิตราวงศ์',
    position: 'หัวหน้าแผนก Eye ENT (จักษุแพทย์)',
    doctor_type: 'FULL_TIME',
    department_id: 'd5555555-5555-5555-5555-555555555555',
    specialty_group: 'EYE',
    phone: '081-1110015',
    email: 'chalermvit.p@bsi.hospital',
    hire_date: '2018-09-01',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1594824813583-0570b240186c?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  },
  // 6. หัวหน้าแผนกรังสี และ รังสีรักษา: พญ.วลัยวรรณ กิตติธรกุล
  {
    id: 'c0000000-0000-0000-0000-000000000016',
    employee_id: 'HEAD-RAD',
    license_no: 'ว. 41234',
    line_user_id: 'U_DR_WALAIWAN_HEAD',
    prefix_th: 'พญ.',
    first_name_th: 'วลัยวรรณ',
    last_name_th: 'กิตติธรกุล',
    position: 'หัวหน้าแผนกรังสี และ รังสีรักษา',
    doctor_type: 'FULL_TIME',
    department_id: 'd6666666-6666-6666-6666-666666666666',
    phone: '081-1110016',
    email: 'walaiwan.k@bsi.hospital',
    hire_date: '2017-11-15',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  },
  // 7. หัวหน้าแผนก Emergency & Outreach Clinic: นพ.สุขสันต์ คำนวณศิลป์
  {
    id: 'c0000000-0000-0000-0000-000000000017',
    employee_id: 'HEAD-ER',
    license_no: 'ว. 43456',
    line_user_id: 'U_DR_SUKSAN_HEAD',
    prefix_th: 'นพ.',
    first_name_th: 'สุขสันต์',
    last_name_th: 'คำนวณศิลป์',
    position: 'หัวหน้าแผนก Emergency & Outreach Clinic',
    doctor_type: 'FULL_TIME',
    department_id: 'd7777777-7777-7777-7777-777777777777',
    phone: '081-1110017',
    email: 'suksan.k@bsi.hospital',
    hire_date: '2019-04-01',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  },
  // 8. หัวหน้าแผนก HealthPromotion: นพ.ชัยวัฒน์ สวนยา
  {
    id: 'c0000000-0000-0000-0000-000000000018',
    employee_id: 'HEAD-HP',
    license_no: 'ว. 45678',
    line_user_id: 'U_DR_CHAIWAT_HEAD',
    prefix_th: 'นพ.',
    first_name_th: 'ชัยวัฒน์',
    last_name_th: 'สวนยา',
    position: 'หัวหน้าแผนก HealthPromotion',
    doctor_type: 'FULL_TIME',
    department_id: 'd8888888-8888-8888-8888-888888888888',
    phone: '081-1110018',
    email: 'chaiwat.s@bsi.hospital',
    hire_date: '2020-08-01',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  },
  // 9. หัวหน้าแผนกวิสัญญี: นพ.วีระ จิตตปาลกุล
  {
    id: 'c0000000-0000-0000-0000-000000000019',
    employee_id: 'HEAD-ANES',
    license_no: 'ว. 47890',
    line_user_id: 'U_DR_WEERA_HEAD',
    prefix_th: 'นพ.',
    first_name_th: 'วีระ',
    last_name_th: 'จิตตปาลกุล',
    position: 'หัวหน้าแผนกวิสัญญี',
    doctor_type: 'FULL_TIME',
    department_id: 'd9999999-9999-9999-9999-999999999999',
    phone: '081-1110019',
    email: 'weera.c@bsi.hospital',
    hire_date: '2016-10-01',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  },
  // 10. หัวหน้าแผนก PPSI + Skin: นพ.สงวน คุณาพร
  {
    id: 'c0000000-0000-0000-0000-000000000020',
    employee_id: 'HEAD-PPSI',
    license_no: 'ว. 50123',
    line_user_id: 'U_DR_SANGUAN_HEAD',
    prefix_th: 'นพ.',
    first_name_th: 'สงวน',
    last_name_th: 'คุณาพร',
    position: 'หัวหน้าแผนก PPSI + Skin',
    doctor_type: 'FULL_TIME',
    department_id: 'daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    phone: '081-1110020',
    email: 'sanguan.k@bsi.hospital',
    hire_date: '2014-05-15',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  },
  // 11. หัวหน้าแผนกสูตินรีเวช: นพ.มานพ จันทนพันธ์
  {
    id: 'c0000000-0000-0000-0000-000000000030',
    employee_id: 'HEAD-OBGYN',
    license_no: 'ว. 51234',
    line_user_id: 'U_DR_MANOP_HEAD',
    prefix_th: 'นพ.',
    first_name_th: 'มานพ',
    last_name_th: 'จันทนพันธ์',
    position: 'หัวหน้าแผนกสูตินรีเวช',
    doctor_type: 'FULL_TIME',
    department_id: 'dbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    phone: '081-3334455',
    email: 'manop.c@bsi.hospital',
    hire_date: '2016-03-01',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  },
  // Staff Doctor: นพ.ชาติชาย วิสัยทัศน์ (อายุรกรรม)
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    employee_id: 'DOC-002',
    license_no: 'ว. 48921',
    line_user_id: 'U_DR_CHARTCHAI',
    prefix_th: 'นพ.',
    first_name_th: 'ชาติชาย',
    last_name_th: 'วิสัยทัศน์',
    position: 'อายุรแพทย์ประจำโรงพยาบาล',
    doctor_type: 'FULL_TIME',
    department_id: 'd1111111-1111-1111-1111-111111111111',
    phone: '082-2223344',
    email: 'chartchai.v@bsi.hospital',
    hire_date: '2023-06-01',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  },
  // Staff Doctor: พญ.กันต์ธีรา พิทักษ์ชีพ (อายุรกรรม Part-Time)
  {
    id: 'c0000000-0000-0000-0000-000000000004',
    employee_id: 'DOC-003',
    license_no: 'ว. 56214',
    line_user_id: 'U_DR_KANTHEERA_PT',
    prefix_th: 'พญ.',
    first_name_th: 'กันต์ธีรา',
    last_name_th: 'พิทักษ์ชีพ',
    position: 'แพทย์พาร์ทไทม์คลินิกต่อมไร้ท่อ',
    doctor_type: 'PART_TIME',
    department_id: 'd1111111-1111-1111-1111-111111111111',
    phone: '083-3334455',
    email: 'kantheera.p@bsi.hospital',
    hire_date: '2025-11-01',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1594824813583-0570b240186c?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  },
  // Staff Doctor: พญ.สิรินดา วาณิชย์สุขสมบัติ (กุมาร)
  {
    id: 'c0000000-0000-0000-0000-000000000021',
    employee_id: 'DOC-PED-01',
    license_no: 'ว. 58123',
    line_user_id: 'U_DR_SIRINDA_PED',
    prefix_th: 'พญ.',
    first_name_th: 'สิรินดา',
    last_name_th: 'วาณิชย์สุขสมบัติ',
    position: 'กุมารแพทย์ประจำ',
    doctor_type: 'FULL_TIME',
    department_id: 'd2222222-2222-2222-2222-222222222222',
    phone: '084-4445566',
    email: 'sirinda.v@bsi.hospital',
    hire_date: '2022-04-01',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  },
  // Staff Doctor: นพ.กิตติศักดิ์ เจริญผล (ศัลยกรรมกระดูกและข้อ)
  {
    id: 'c0000000-0000-0000-0000-000000000022',
    employee_id: 'DOC-SURG-01',
    license_no: 'ว. 59234',
    line_user_id: 'U_DR_KITTISAK_SURG',
    prefix_th: 'นพ.',
    first_name_th: 'กิตติศักดิ์',
    last_name_th: 'เจริญผล',
    position: 'ศัลยแพทย์กระดูกและข้อ',
    doctor_type: 'FULL_TIME',
    department_id: 'd3333333-3333-3333-3333-333333333333',
    specialty_group: 'SURG_ORTHO',
    phone: '085-5556677',
    email: 'kittisak.c@bsi.hospital',
    hire_date: '2021-08-15',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  },
  // Staff Doctor: นพ.ธีรภัทร อัศวโภคิน (ศัลยกรรมทั่วไป)
  {
    id: 'c0000000-0000-0000-0000-000000000023',
    employee_id: 'DOC-SURG-GEN',
    license_no: 'ว. 60124',
    line_user_id: 'U_DR_THEERAPHAT_SURG',
    prefix_th: 'นพ.',
    first_name_th: 'ธีรภัทร',
    last_name_th: 'อัศวโภคิน',
    position: 'ศัลยแพทย์ทั่วไป',
    doctor_type: 'FULL_TIME',
    department_id: 'd3333333-3333-3333-3333-333333333333',
    specialty_group: 'SURG_GEN',
    phone: '086-6667788',
    email: 'theeraphat.a@bsi.hospital',
    hire_date: '2022-09-01',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  },
  // Staff Doctor: พญ.ปิยะดา รุ่งเรืองกิจ (หู คอ จมูก ENT)
  {
    id: 'c0000000-0000-0000-0000-000000000024',
    employee_id: 'DOC-ENT-01',
    license_no: 'ว. 61235',
    line_user_id: 'U_DR_PIYADA_ENT',
    prefix_th: 'พญ.',
    first_name_th: 'ปิยะดา',
    last_name_th: 'รุ่งเรืองกิจ',
    position: 'แพทย์ผู้เชี่ยวชาญโสต ศอ นาสิก (ENT)',
    doctor_type: 'FULL_TIME',
    department_id: 'd5555555-5555-5555-5555-555555555555',
    specialty_group: 'ENT',
    phone: '087-7778899',
    email: 'piyada.r@bsi.hospital',
    hire_date: '2023-01-15',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1594824813583-0570b240186c?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  },
  // Staff Doctor: พญ.ทิพย์สุดา มงคลเวช (สูตินรีเวช)
  {
    id: 'c0000000-0000-0000-0000-000000000031',
    employee_id: 'DOC-OBGYN-01',
    license_no: 'ว. 62346',
    line_user_id: 'U_DR_THIPSUDA_OBGYN',
    prefix_th: 'พญ.',
    first_name_th: 'ทิพย์สุดา',
    last_name_th: 'มงคลเวช',
    position: 'สูตินรีแพทย์ประจำ',
    doctor_type: 'FULL_TIME',
    department_id: 'dbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    phone: '088-8889900',
    email: 'thipsuda.m@bsi.hospital',
    hire_date: '2023-05-01',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  }
];

// 3. Doctor Roles
export const doctor_roles = [
  // นพ.ปริวรรธน์ ระเด่น (ผู้ช่วย ผอ.รพ. / Executive Approver)
  { id: 'b0000000-0000-0000-0000-000000000098', doctor_id: 'c0000000-0000-0000-0000-000000000099', role: 'DEPT_HEAD' },
  { id: 'b0000000-0000-0000-0000-000000000097', doctor_id: 'c0000000-0000-0000-0000-000000000099', role: 'ADMIN' },
  { id: 'b0000000-0000-0000-0000-000000000096', doctor_id: 'c0000000-0000-0000-0000-000000000099', role: 'DOCTOR' },

  // คุณสิริมาศ (พี่กุ้ง)
  { id: 'b0000000-0000-0000-0000-000000000001', doctor_id: 'c0000000-0000-0000-0000-000000000001', role: 'MEDICAL_ADMIN' },
  { id: 'b0000000-0000-0000-0000-000000000002', doctor_id: 'c0000000-0000-0000-0000-000000000001', role: 'ADMIN' },

  // 10 หัวหน้าแพทย์
  { id: 'b0000000-0000-0000-0000-000000000011', doctor_id: 'c0000000-0000-0000-0000-000000000011', role: 'DEPT_HEAD' },
  { id: 'b0000000-0000-0000-0000-000000000111', doctor_id: 'c0000000-0000-0000-0000-000000000011', role: 'DOCTOR' },

  { id: 'b0000000-0000-0000-0000-000000000012', doctor_id: 'c0000000-0000-0000-0000-000000000012', role: 'DEPT_HEAD' },
  { id: 'b0000000-0000-0000-0000-000000000112', doctor_id: 'c0000000-0000-0000-0000-000000000012', role: 'DOCTOR' },

  { id: 'b0000000-0000-0000-0000-000000000013', doctor_id: 'c0000000-0000-0000-0000-000000000013', role: 'DEPT_HEAD' },
  { id: 'b0000000-0000-0000-0000-000000000113', doctor_id: 'c0000000-0000-0000-0000-000000000013', role: 'DOCTOR' },

  { id: 'b0000000-0000-0000-0000-000000000014', doctor_id: 'c0000000-0000-0000-0000-000000000014', role: 'DEPT_HEAD' },
  { id: 'b0000000-0000-0000-0000-000000000114', doctor_id: 'c0000000-0000-0000-0000-000000000014', role: 'DOCTOR' },

  { id: 'b0000000-0000-0000-0000-000000000015', doctor_id: 'c0000000-0000-0000-0000-000000000015', role: 'DEPT_HEAD' },
  { id: 'b0000000-0000-0000-0000-000000000115', doctor_id: 'c0000000-0000-0000-0000-000000000015', role: 'DOCTOR' },

  { id: 'b0000000-0000-0000-0000-000000000016', doctor_id: 'c0000000-0000-0000-0000-000000000016', role: 'DEPT_HEAD' },
  { id: 'b0000000-0000-0000-0000-000000000116', doctor_id: 'c0000000-0000-0000-0000-000000000016', role: 'DOCTOR' },

  { id: 'b0000000-0000-0000-0000-000000000017', doctor_id: 'c0000000-0000-0000-0000-000000000017', role: 'DEPT_HEAD' },
  { id: 'b0000000-0000-0000-0000-000000000117', doctor_id: 'c0000000-0000-0000-0000-000000000017', role: 'DOCTOR' },

  { id: 'b0000000-0000-0000-0000-000000000018', doctor_id: 'c0000000-0000-0000-0000-000000000018', role: 'DEPT_HEAD' },
  { id: 'b0000000-0000-0000-0000-000000000118', doctor_id: 'c0000000-0000-0000-0000-000000000018', role: 'DOCTOR' },

  { id: 'b0000000-0000-0000-0000-000000000019', doctor_id: 'c0000000-0000-0000-0000-000000000019', role: 'DEPT_HEAD' },
  { id: 'b0000000-0000-0000-0000-000000000119', doctor_id: 'c0000000-0000-0000-0000-000000000019', role: 'DOCTOR' },

  { id: 'b0000000-0000-0000-0000-000000000020', doctor_id: 'c0000000-0000-0000-0000-000000000020', role: 'DEPT_HEAD' },
  { id: 'b0000000-0000-0000-0000-000000000120', doctor_id: 'c0000000-0000-0000-0000-000000000020', role: 'DOCTOR' },

  // 11. หัวหน้าแผนกสูตินรีเวช: นพ.มานพ จันทนพันธ์
  { id: 'b0000000-0000-0000-0000-000000000030', doctor_id: 'c0000000-0000-0000-0000-000000000030', role: 'DEPT_HEAD' },
  { id: 'b0000000-0000-0000-0000-000000000130', doctor_id: 'c0000000-0000-0000-0000-000000000030', role: 'DOCTOR' },

  // Staff Doctors
  { id: 'b0000000-0000-0000-0000-000000000003', doctor_id: 'c0000000-0000-0000-0000-000000000003', role: 'DOCTOR' },
  { id: 'b0000000-0000-0000-0000-000000000004', doctor_id: 'c0000000-0000-0000-0000-000000000004', role: 'DOCTOR' },
  { id: 'b0000000-0000-0000-0000-000000000021', doctor_id: 'c0000000-0000-0000-0000-000000000021', role: 'DOCTOR' },
  { id: 'b0000000-0000-0000-0000-000000000022', doctor_id: 'c0000000-0000-0000-0000-000000000022', role: 'DOCTOR' },
  { id: 'b0000000-0000-0000-0000-000000000023', doctor_id: 'c0000000-0000-0000-0000-000000000023', role: 'DOCTOR' },
  { id: 'b0000000-0000-0000-0000-000000000024', doctor_id: 'c0000000-0000-0000-0000-000000000024', role: 'DOCTOR' },
  { id: 'b0000000-0000-0000-0000-000000000031', doctor_id: 'c0000000-0000-0000-0000-000000000031', role: 'DOCTOR' }
];

// 4. Approval Routes:
// Flow: แพทย์ผู้ขอลา >> Step 1: หัวหน้าแพทย์ >> Step 2: นพ.ปริวรรธน์ ระเด่น (ผช.ผอ.รพ.)
// กรณีหัวหน้าแพทย์ขอลาเอง >> Step 1: นพ.ปริวรรธน์ ระเด่น โดยตรง
export const approval_routes = [
  // --- แผนกอายุรกรรม ---
  // นพ.ชาติชาย (Step 1: นพ.ธันวา, Step 2: นพ.ปริวรรธน์)
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    doctor_id: 'c0000000-0000-0000-0000-000000000003',
    step_order: 1,
    approver_id: 'c0000000-0000-0000-0000-000000000011', // นพ.ธันวา
    is_active: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    doctor_id: 'c0000000-0000-0000-0000-000000000003',
    step_order: 2,
    approver_id: 'c0000000-0000-0000-0000-000000000099', // นพ.ปริวรรธน์
    is_active: true
  },
  // พญ.กันต์ธีรา (Step 1: นพ.ธันวา, Step 2: นพ.ปริวรรธน์)
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    doctor_id: 'c0000000-0000-0000-0000-000000000004',
    step_order: 1,
    approver_id: 'c0000000-0000-0000-0000-000000000011', // นพ.ธันวา
    is_active: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    doctor_id: 'c0000000-0000-0000-0000-000000000004',
    step_order: 2,
    approver_id: 'c0000000-0000-0000-0000-000000000099', // นพ.ปริวรรธน์
    is_active: true
  },

  // --- แผนกกุมาร ---
  // พญ.สิรินดา (Step 1: นพ.ปานรวี, Step 2: นพ.ปริวรรธน์)
  {
    id: 'a0000000-0000-0000-0000-000000000005',
    doctor_id: 'c0000000-0000-0000-0000-000000000021',
    step_order: 1,
    approver_id: 'c0000000-0000-0000-0000-000000000012', // นพ.ปานรวี
    is_active: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000006',
    doctor_id: 'c0000000-0000-0000-0000-000000000021',
    step_order: 2,
    approver_id: 'c0000000-0000-0000-0000-000000000099', // นพ.ปริวรรธน์
    is_active: true
  },

  // --- แผนกศัลยกรรมทั่วไปฯ ---
  // นพ.กิตติศักดิ์ (Step 1: นพ.ศุษณะ, Step 2: นพ.ปริวรรธน์)
  {
    id: 'a0000000-0000-0000-0000-000000000007',
    doctor_id: 'c0000000-0000-0000-0000-000000000022',
    step_order: 1,
    approver_id: 'c0000000-0000-0000-0000-000000000013', // นพ.ศุษณะ
    is_active: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000008',
    doctor_id: 'c0000000-0000-0000-0000-000000000022',
    step_order: 2,
    approver_id: 'c0000000-0000-0000-0000-000000000099', // นพ.ปริวรรธน์
    is_active: true
  },
  // นพ.ธีรภัทร (Step 1: นพ.ศุษณะ, Step 2: นพ.ปริวรรธน์)
  {
    id: 'a0000000-0000-0000-0000-000000000023',
    doctor_id: 'c0000000-0000-0000-0000-000000000023',
    step_order: 1,
    approver_id: 'c0000000-0000-0000-0000-000000000013', // นพ.ศุษณะ
    is_active: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000024',
    doctor_id: 'c0000000-0000-0000-0000-000000000023',
    step_order: 2,
    approver_id: 'c0000000-0000-0000-0000-000000000099', // นพ.ปริวรรธน์
    is_active: true
  },

  // --- แผนก Eye ENT ---
  // พญ.ปิยะดา (Step 1: นพ.เฉลิมวิทย์, Step 2: นพ.ปริวรรธน์)
  {
    id: 'a0000000-0000-0000-0000-000000000025',
    doctor_id: 'c0000000-0000-0000-0000-000000000024',
    step_order: 1,
    approver_id: 'c0000000-0000-0000-0000-000000000015', // นพ.เฉลิมวิทย์
    is_active: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000026',
    doctor_id: 'c0000000-0000-0000-0000-000000000024',
    step_order: 2,
    approver_id: 'c0000000-0000-0000-0000-000000000099', // นพ.ปริวรรธน์
    is_active: true
  },

  // --- แผนกสูตินรีเวช ---
  // พญ.ทิพย์สุดา (Step 1: นพ.มานพ, Step 2: นพ.ปริวรรธน์)
  {
    id: 'a0000000-0000-0000-0000-000000000031',
    doctor_id: 'c0000000-0000-0000-0000-000000000031',
    step_order: 1,
    approver_id: 'c0000000-0000-0000-0000-000000000030', // นพ.มานพ
    is_active: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000032',
    doctor_id: 'c0000000-0000-0000-0000-000000000031',
    step_order: 2,
    approver_id: 'c0000000-0000-0000-0000-000000000099', // นพ.ปริวรรธน์
    is_active: true
  },

  // --- หัวหน้าแพทย์ทั้ง 11 ท่าน ยื่นใบลาเอง -> วิ่งตรงหา นพ.ปริวรรธน์ ระเด่น (1 Step) ---
  {
    id: 'a0000000-0000-0000-0000-000000000011',
    doctor_id: 'c0000000-0000-0000-0000-000000000011', // นพ.ธันวา
    step_order: 1,
    approver_id: 'c0000000-0000-0000-0000-000000000099',
    is_active: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000012',
    doctor_id: 'c0000000-0000-0000-0000-000000000012', // นพ.ปานรวี
    step_order: 1,
    approver_id: 'c0000000-0000-0000-0000-000000000099',
    is_active: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000013',
    doctor_id: 'c0000000-0000-0000-0000-000000000013', // นพ.ศุษณะ
    step_order: 1,
    approver_id: 'c0000000-0000-0000-0000-000000000099',
    is_active: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000014',
    doctor_id: 'c0000000-0000-0000-0000-000000000014', // ทพ.นันทภพ
    step_order: 1,
    approver_id: 'c0000000-0000-0000-0000-000000000099',
    is_active: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000015',
    doctor_id: 'c0000000-0000-0000-0000-000000000015', // นพ.เฉลิมวิทย์
    step_order: 1,
    approver_id: 'c0000000-0000-0000-0000-000000000099',
    is_active: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000016',
    doctor_id: 'c0000000-0000-0000-0000-000000000016', // พญ.วลัยวรรณ
    step_order: 1,
    approver_id: 'c0000000-0000-0000-0000-000000000099',
    is_active: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000017',
    doctor_id: 'c0000000-0000-0000-0000-000000000017', // นพ.สุขสันต์
    step_order: 1,
    approver_id: 'c0000000-0000-0000-0000-000000000099',
    is_active: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000018',
    doctor_id: 'c0000000-0000-0000-0000-000000000018', // นพ.ชัยวัฒน์
    step_order: 1,
    approver_id: 'c0000000-0000-0000-0000-000000000099',
    is_active: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000019',
    doctor_id: 'c0000000-0000-0000-0000-000000000019', // นพ.วีระ
    step_order: 1,
    approver_id: 'c0000000-0000-0000-0000-000000000099',
    is_active: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000020',
    doctor_id: 'c0000000-0000-0000-0000-000000000020', // นพ.สงวน
    step_order: 1,
    approver_id: 'c0000000-0000-0000-0000-000000000099',
    is_active: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000030',
    doctor_id: 'c0000000-0000-0000-0000-000000000030', // นพ.มานพ (สูตินรีเวช)
    step_order: 1,
    approver_id: 'c0000000-0000-0000-0000-000000000099',
    is_active: true
  }
];
