import { getDb, saveStore, initStore } from './db.js';
import { v4 as uuidv4 } from 'uuid';

export async function generateMockData() {
  await initStore();
  const db = getDb();
  const currentYear = new Date().getFullYear();

  const getOffsetDate = (offsetDays) => {
    const d = new Date(Date.now() + offsetDays * 86400000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getOffsetDate(0);
  const tomorrowStr = getOffsetDate(1);
  const in2DaysStr = getOffsetDate(2);
  const in3DaysStr = getOffsetDate(3);
  const in5DaysStr = getOffsetDate(5);
  const in6DaysStr = getOffsetDate(6);
  const in10DaysStr = getOffsetDate(10);
  const past3DaysStr = getOffsetDate(-3);
  const past5DaysStr = getOffsetDate(-5);
  const past7DaysStr = getOffsetDate(-7);
  const past14DaysStr = getOffsetDate(-14);
  const past13DaysStr = getOffsetDate(-13);

  // Dynamic Lookup for Leave Type IDs from database
  const getType = (code) => {
    const match = db.leave_types.find(lt => lt.code === code);
    return match ? match.id : null;
  };

  const vacationId = getType('VACATION') || '11111111-1111-1111-1111-111111111111';
  const sickId = getType('SICK') || '22222222-2222-2222-2222-222222222222';
  const personalId = getType('PERSONAL') || '33333333-3333-3333-3333-333333333333';
  const trainingId = getType('TRAINING') || '44444444-4444-4444-4444-444444444444';
  const unpaidId = getType('UNPAID') || '55555555-5555-5555-5555-555555555555';

  // 1. Doctor Shifts (ตารางเวรที่หลากหลายและสอดคล้องกับระบบ Hybrid)
  const doctor_shifts = [
    {
      id: '00000000-0000-0000-0000-000000002001',
      doctor_id: 'c0000000-0000-0000-0000-000000000003', // นพ. ชาติชาย
      shift_date: todayStr,
      shift_type: 'OPD_MORNING',
      department_id: 'd1111111-1111-1111-1111-111111111111',
      start_time: '08:00',
      end_time: '12:00',
      status: 'SCHEDULED',
      substitute_doctor_id: null,
      notes: 'ตรวจผู้ป่วยนอกอายุรกรรมทั่วไป คลินิก 1'
    },
    {
      id: '00000000-0000-0000-0000-000000002002',
      doctor_id: 'c0000000-0000-0000-0000-000000000003', // นพ. ชาติชาย
      shift_date: tomorrowStr,
      shift_type: 'ER_DUTY',
      department_id: 'd1111111-1111-1111-1111-111111111111',
      start_time: '08:00',
      end_time: '20:00',
      status: 'SCHEDULED',
      substitute_doctor_id: null,
      notes: 'เวรแพทย์ฉุกเฉินชั้น 1 (Emergency Department)'
    },
    {
      id: '00000000-0000-0000-0000-000000002003',
      doctor_id: 'c0000000-0000-0000-0000-000000000003', // นพ. ชาติชาย
      shift_date: in2DaysStr,
      shift_type: 'OPD_AFTERNOON',
      department_id: 'd1111111-1111-1111-1111-111111111111',
      start_time: '13:00',
      end_time: '17:00',
      status: 'SCHEDULED',
      substitute_doctor_id: 'c0000000-0000-0000-0000-000000000002',
      notes: 'ตรวจผู้ป่วยนอกคลินิกความดันโลหิตสูง (นพ.ปารวี รับเวรแทนช่วงลาครึ่งวัน)'
    },
    {
      id: '00000000-0000-0000-0000-000000002004',
      doctor_id: 'c0000000-0000-0000-0000-000000000003', // นพ. ชาติชาย
      shift_date: in5DaysStr,
      shift_type: 'NIGHT_DUTY',
      department_id: 'd1111111-1111-1111-1111-111111111111',
      start_time: '20:00',
      end_time: '08:00',
      status: 'SCHEDULED',
      substitute_doctor_id: 'c0000000-0000-0000-0000-000000000002',
      notes: 'เวรดึกประจำตึกอายุรกรรม (มีเวรแทนช่วงลาพักผ่อน)'
    },
    {
      id: '00000000-0000-0000-0000-000000002005',
      doctor_id: 'c0000000-0000-0000-0000-000000000002', // นพ. ปารวี (Head)
      shift_date: todayStr,
      shift_type: 'IPD_ROUND',
      department_id: 'd1111111-1111-1111-1111-111111111111',
      start_time: '09:00',
      end_time: '13:00',
      status: 'SCHEDULED',
      substitute_doctor_id: null,
      notes: 'ตรวจเยี่ยมผู้ป่วยใน Ward 5 & CCU'
    },
    {
      id: '00000000-0000-0000-0000-000000002006',
      doctor_id: 'c0000000-0000-0000-0000-000000000002', // นพ. ปารวี (Head)
      shift_date: tomorrowStr,
      shift_type: 'OPD_AFTERNOON',
      department_id: 'd1111111-1111-1111-1111-111111111111',
      start_time: '13:00',
      end_time: '17:00',
      status: 'SCHEDULED',
      substitute_doctor_id: null,
      notes: 'ตรวจผู้ป่วยนอกเฉพาะทางโรคหัวใจ'
    },
    {
      id: '00000000-0000-0000-0000-000000002007',
      doctor_id: 'c0000000-0000-0000-0000-000000000004', // พญ. กันต์ธีรา (PT)
      shift_date: todayStr,
      shift_type: 'OPD_MORNING',
      department_id: 'd1111111-1111-1111-1111-111111111111',
      start_time: '08:00',
      end_time: '12:00',
      status: 'SCHEDULED',
      substitute_doctor_id: null,
      notes: 'คลินิกเบาหวานและต่อมไร้ท่อ (ขอลาป่วยฉุกเฉิน)'
    },
    {
      id: '00000000-0000-0000-0000-000000002008',
      doctor_id: 'c0000000-0000-0000-0000-000000000004', // พญ. กันต์ธีรา (PT)
      shift_date: in3DaysStr,
      shift_type: 'ON_CALL',
      department_id: 'd1111111-1111-1111-1111-111111111111',
      start_time: '08:00',
      end_time: '20:00',
      status: 'SCHEDULED',
      substitute_doctor_id: null,
      notes: 'แพทย์เวรให้คำปรึกษาทางโทรศัพท์'
    }
  ];

  // 2. Realistic Leave Requests (คำขอลา 7 รายการ ครอบคลุมทุกสถานะ)
  const leave_requests = [
    // Req 1: PENDING - นพ. ชาติชาย ขอลาพักผ่อน 2 วันสัปดาห์หน้า
    {
      id: '88888888-8888-8888-8888-888888888801',
      request_no: `LV-${currentYear}-00001`,
      doctor_id: 'c0000000-0000-0000-0000-000000000003', // นพ. ชาติชาย
      leave_type_id: vacationId,
      start_date: in5DaysStr,
      end_date: in6DaysStr,
      duration_days: 2.0,
      half_day_type: 'FULL_DAY',
      reason: 'ลาพักผ่อนประจำปี พาครอบครัวไปตรวจสุขภาพและพักผ่อนต่างจังหวัด',
      substitute_doctor_id: 'c0000000-0000-0000-0000-000000000002', // นพ. ปารวี
      is_emergency: false,
      is_exception: false,
      upload_later: false,
      status: 'PENDING',
      current_step: 1,
      total_steps: 1,
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 4).toISOString()
    },
    // Req 2: PENDING - พญ. กันต์ธีรา ลาป่วยฉุกเฉินวันนี้ (Emergency + Upload Later)
    {
      id: '88888888-8888-8888-8888-888888888802',
      request_no: `LV-${currentYear}-00002`,
      doctor_id: 'c0000000-0000-0000-0000-000000000004', // พญ. กันต์ธีรา
      leave_type_id: sickId,
      start_date: todayStr,
      end_date: todayStr,
      duration_days: 1.0,
      half_day_type: 'FULL_DAY',
      reason: 'มีไข้สูง 38.5 องศา เจ็บคอ ปวดเมื่อยตัว มีอาการเฉียบพลันช่วงเช้า ไม่สามารถออกตรวจได้',
      substitute_doctor_id: 'c0000000-0000-0000-0000-000000000002', // นพ. ปารวี
      is_emergency: true,
      is_exception: false,
      upload_later: true,
      status: 'PENDING',
      current_step: 1,
      total_steps: 1,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    // Req 3: APPROVED - นพ. ปารวี ลาฝึกอบรมประชุมวิชาการ 3 วัน (ผ่านการอนุมัติแล้ว)
    {
      id: '88888888-8888-8888-8888-888888888803',
      request_no: `LV-${currentYear}-00003`,
      doctor_id: 'c0000000-0000-0000-0000-000000000002', // นพ. ปารวี
      leave_type_id: trainingId,
      start_date: past7DaysStr,
      end_date: past5DaysStr,
      duration_days: 3.0,
      half_day_type: 'FULL_DAY',
      reason: 'เข้าร่วมประชุมวิชาการประจำปี สมาคมแพทย์โรคหัวใจแห่งประเทศไทย ประจำปี 2569 ณ โรงแรมเซ็นทารา แกรนด์ กทม.',
      substitute_doctor_id: 'c0000000-0000-0000-0000-000000000003', // นพ. ชาติชาย
      reimbursement_requested: true,
      is_emergency: false,
      is_exception: false,
      upload_later: false,
      status: 'APPROVED',
      current_step: 1,
      total_steps: 1,
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 8).toISOString()
    },
    // Req 4: APPROVED - นพ. ปารวี ลาพักผ่อน 2 วัน (ผ่านการอนุมัติแล้ว)
    {
      id: '88888888-8888-8888-8888-888888888804',
      request_no: `LV-${currentYear}-00004`,
      doctor_id: 'c0000000-0000-0000-0000-000000000002', // นพ. ปารวี
      leave_type_id: vacationId,
      start_date: past14DaysStr,
      end_date: past13DaysStr,
      duration_days: 2.0,
      half_day_type: 'FULL_DAY',
      reason: 'ลาพักผ่อนประจำปี',
      substitute_doctor_id: 'c0000000-0000-0000-0000-000000000003', // นพ. ชาติชาย
      is_emergency: false,
      is_exception: false,
      upload_later: false,
      status: 'APPROVED',
      current_step: 1,
      total_steps: 1,
      created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 16).toISOString()
    },
    // Req 5: REJECTED - นพ. ชาติชาย ลากิจ (ถูกปฏิเสธเนื่องจากหมอไม่พอ)
    {
      id: '88888888-8888-8888-8888-888888888805',
      request_no: `LV-${currentYear}-00005`,
      doctor_id: 'c0000000-0000-0000-0000-000000000003', // นพ. ชาติชาย
      leave_type_id: personalId,
      start_date: past3DaysStr,
      end_date: past3DaysStr,
      duration_days: 1.0,
      half_day_type: 'FULL_DAY',
      reason: 'ทำธุระส่วนตัวต่ออายุใบขับขี่และจัดการเอกสารที่ดินราชการ',
      substitute_doctor_id: null,
      is_emergency: false,
      is_exception: false,
      upload_later: false,
      status: 'REJECTED',
      current_step: 1,
      total_steps: 1,
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 4).toISOString()
    },
    // Req 6: CANCELLED - พญ. กันต์ธีรา ขอยกเลิกเอง
    {
      id: '88888888-8888-8888-8888-888888888806',
      request_no: `LV-${currentYear}-00006`,
      doctor_id: 'c0000000-0000-0000-0000-000000000004', // พญ. กันต์ธีรา
      leave_type_id: unpaidId,
      start_date: in10DaysStr,
      end_date: in10DaysStr,
      duration_days: 1.0,
      half_day_type: 'FULL_DAY',
      reason: 'ติดภารกิจบรรยายพิเศษภายนอกโรงพยาบาล',
      substitute_doctor_id: null,
      is_emergency: false,
      is_exception: false,
      upload_later: false,
      status: 'CANCELLED',
      cancelled_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      cancelled_reason: 'ขอยกเลิกเนื่องจากมหาวิทยาลัยเลื่อนกำหนดการบรรยายออกไปเป็นเดือนหน้า',
      current_step: 1,
      total_steps: 1,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    // Req 7: PENDING - นพ. ชาติชาย ขอลาครึ่งวันบ่าย
    {
      id: '88888888-8888-8888-8888-888888888807',
      request_no: `LV-${currentYear}-00007`,
      doctor_id: 'c0000000-0000-0000-0000-000000000003', // นพ. ชาติชาย
      leave_type_id: vacationId,
      start_date: in2DaysStr,
      end_date: in2DaysStr,
      duration_days: 0.5,
      half_day_type: 'AFTERNOON',
      reason: 'ไปร่วมงานประชุมผู้ปกครองโรงเรียนบุตรช่วงบ่าย',
      substitute_doctor_id: 'c0000000-0000-0000-0000-000000000002', // นพ. ปารวี
      is_emergency: false,
      is_exception: false,
      upload_later: false,
      status: 'PENDING',
      current_step: 1,
      total_steps: 1,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString()
    }
  ];

  // 3. Approval Logs (ประวัติการอนุมัติสำหรับ Req 3, 4, 5)
  const approval_logs = [
    {
      id: '99999999-9999-9999-9999-999999999901',
      request_id: '88888888-8888-8888-8888-888888888803', // Req 3 (อบรม)
      step_order: 1,
      approver_id: 'c0000000-0000-0000-0000-000000000002', // นพ. ปารวี
      action: 'APPROVED',
      comments: 'อนุมัติให้เข้าร่วมประชุมวิชาการเพื่อพัฒนาทักษะ จัดแพทย์เวรตรวจแทนเรียบร้อยแล้ว',
      acted_at: new Date(Date.now() - 86400000 * 8).toISOString(),
      created_at: new Date(Date.now() - 86400000 * 8).toISOString()
    },
    {
      id: '99999999-9999-9999-9999-999999999902',
      request_id: '88888888-8888-8888-8888-888888888804', // Req 4 (พักผ่อน นพ.ปารวี)
      step_order: 1,
      approver_id: 'c0000000-0000-0000-0000-000000000001', // คุณสิริมาศ ฝ่ายการแพทย์
      action: 'APPROVED',
      comments: 'อนุมัติการลาพักผ่อนประจำปีค่ะ',
      acted_at: new Date(Date.now() - 86400000 * 16).toISOString(),
      created_at: new Date(Date.now() - 86400000 * 16).toISOString()
    },
    {
      id: '99999999-9999-9999-9999-999999999903',
      request_id: '88888888-8888-8888-8888-888888888805', // Req 5 (ลากิจ นพ.ชาติชาย)
      step_order: 1,
      approver_id: 'c0000000-0000-0000-0000-000000000002', // นพ. ปารวี
      action: 'REJECTED',
      comments: 'ไม่อนุมัติ เนื่องจากวันดังกล่าวมีแพทย์ออกตรวจไม่ครบตามเกณฑ์ขั้นต่ำ (min staff 5 ท่าน) โปรดเลื่อนวันทำการครับ',
      acted_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      created_at: new Date(Date.now() - 86400000 * 4).toISOString()
    }
  ];

  // 4. Synchronized Leave Balances (คำนวณยอดตรงกับคำขอลาข้างต้น)
  const updateOrCreateBalance = (docId, ltId, entitlement, carriedOver, used, pending) => {
    const existing = db.leave_balances?.find(b => b.doctor_id === docId && b.leave_type_id === ltId && b.fiscal_year === currentYear);
    return {
      id: existing?.id || uuidv4(),
      doctor_id: docId,
      leave_type_id: ltId,
      fiscal_year: currentYear,
      entitlement_days: entitlement,
      carried_over_days: carriedOver,
      used_days: used,
      pending_days: pending,
      updated_at: new Date().toISOString()
    };
  };

  const leave_balances = [
    // --- Dr. Chartchai (FT) ---
    // พักร้อน: สิทธิ์ 20 วัน, ใช้ไป 0, รอดำเนินการ 2.5 วัน (Req 1: 2.0 วัน + Req 7: 0.5 วัน)
    updateOrCreateBalance('c0000000-0000-0000-0000-000000000003', vacationId, 20.0, 0.0, 0.0, 2.5),
    // ลาป่วย: สิทธิ์ 30 วัน, ใช้ไป 0, รอ 0
    updateOrCreateBalance('c0000000-0000-0000-0000-000000000003', sickId, 30.0, 0.0, 0.0, 0.0),
    // ลากิจ (ครอบครัวเสียชีวิต): สิทธิ์ตามเกณฑ์, ใช้ไป 0, รอ 0 (Req 5 ถูก Reject ไม่ตัดยอด)
    updateOrCreateBalance('c0000000-0000-0000-0000-000000000003', personalId, 0.0, 0.0, 0.0, 0.0),
    // ฝึกอบรม: ใช้ได้ 1 ครั้ง/ปี, ใช้ไป 0, รอ 0
    updateOrCreateBalance('c0000000-0000-0000-0000-000000000003', trainingId, 0.0, 0.0, 0.0, 0.0),

    // --- Dr. Paravee (FT - Head) ---
    // พักร้อน: สิทธิ์ 20 วัน, ใช้ไป 2.0 วัน (Req 4 Approved), รอ 0
    updateOrCreateBalance('c0000000-0000-0000-0000-000000000002', vacationId, 20.0, 0.0, 2.0, 0.0),
    // ป่วย: สิทธิ์ 30 วัน, ใช้ไป 0, รอ 0
    updateOrCreateBalance('c0000000-0000-0000-0000-000000000002', sickId, 30.0, 0.0, 0.0, 0.0),
    // ฝึกอบรม: ใช้ไป 3.0 วัน (Req 3 Approved)
    updateOrCreateBalance('c0000000-0000-0000-0000-000000000002', trainingId, 0.0, 0.0, 3.0, 0.0),

    // --- Dr. Kantheera (PT) ---
    // ป่วย: สิทธิ์ 30 วัน, ใช้ไป 0, รอดำเนินการ 1.0 วัน (Req 2 ป่วยฉุกเฉิน Pending)
    updateOrCreateBalance('c0000000-0000-0000-0000-000000000004', sickId, 30.0, 0.0, 0.0, 1.0)
  ];

  // 5. Audit Logs
  const audit_logs = leave_requests.map((r, index) => ({
    id: `aaaaaaaa-aaaa-aaaa-aaaa-${String(index + 1).padStart(12, '0')}`,
    table_name: 'leave_requests',
    record_id: r.id,
    action: r.status === 'APPROVED' ? 'APPROVE' : r.status === 'REJECTED' ? 'REJECT' : 'INSERT',
    actor_id: r.doctor_id,
    new_data: { request_no: r.request_no, status: r.status, duration_days: r.duration_days },
    ip_address: '127.0.0.1',
    created_at: r.created_at
  }));

  // Apply to DB in-memory
  db.doctor_shifts = doctor_shifts;
  db.leave_requests = leave_requests;
  db.approval_logs = approval_logs;
  db.leave_balances = leave_balances;
  db.audit_logs = audit_logs;

  // Persist to the configured store
  saveStore();

  return {
    success: true,
    message: 'Generated mock test data successfully',
    summary: {
      requests: leave_requests.length,
      shifts: doctor_shifts.length,
      approval_logs: approval_logs.length,
      balances: leave_balances.length
    }
  };
}

if (process.argv[1]?.endsWith('seed_mock_data.js')) {
  generateMockData().then((res) => {
    console.log('✅ Mock Data Generated:', res);
    process.exit(0);
  }).catch((err) => {
    console.error('❌ Error generating mock data:', err);
    process.exit(1);
  });
}
