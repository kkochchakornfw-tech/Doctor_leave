import dotenv from 'dotenv';
dotenv.config();

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';

// Store recent sent messages in memory for the Live LINE Simulator / Inspector
export const simulatedLineMessages = [];

export const isLineConfigured = Boolean(LINE_CHANNEL_ACCESS_TOKEN && LINE_CHANNEL_ACCESS_TOKEN.length > 20);

/**
 * Send push message to LINE User (or record in simulator if token is not set)
 */
export async function sendLinePushMessage(toLineUserId, messages) {
  // === TARGET LINE USER ID RESOLUTION ===
  // If doctor/approver has their own LINE User ID, send directly to them!
  // If not linked or dummy placeholder, fallback to TEST_LINE_USER_ID.
  const isValidLineId = (id) => typeof id === 'string' && /^U[0-9a-f]{32}$/i.test(id);
  const overrideId = process.env.TEST_LINE_USER_ID;
  
  let targetId = toLineUserId;
  if (!isValidLineId(targetId) && isValidLineId(overrideId)) {
    targetId = overrideId;
  }

  const payload = {
    to: targetId,
    messages: Array.isArray(messages) ? messages : [messages],
    sentAt: new Date().toISOString(),
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    originalTo: toLineUserId // Keep track of who it was supposed to go to
  };

  // Record into simulator log
  simulatedLineMessages.unshift(payload);
  if (simulatedLineMessages.length > 50) {
    simulatedLineMessages.pop();
  }

  if (!isLineConfigured || !isValidLineId(targetId)) {
    console.log(`[LINE SIMULATOR] 📱 Sent 1-on-1 Message to ${targetId || 'UNKNOWN'}:`, JSON.stringify(messages, null, 2));
    return { success: true, simulated: true, payload };
  }

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: targetId,
        messages: Array.isArray(messages) ? messages : [messages],
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[LINE API Error]', res.status, data);
      const isQuotaError = res.status === 429 || (data.message && data.message.includes('quota'));
      return { success: false, error: data, simulated: false, isQuotaError };
    }

    console.log(`[LINE API] 🚀 Successfully pushed message to ${toLineUserId}`);
    return { success: true, data, simulated: false, isQuotaError: false };
  } catch (err) {
    console.error('[LINE Network Error]', err);
    return { success: false, error: err.message, simulated: false };
  }
}

/**
 * Reply to LINE user using replyToken (Free - zero quota usage)
 */
export async function sendLineReplyMessage(replyToken, messages) {
  if (!replyToken) return { success: false, error: 'No replyToken' };

  const payload = {
    replyToken,
    messages: Array.isArray(messages) ? messages : [messages]
  };

  if (!isLineConfigured) {
    console.log(`[LINE SIMULATOR] 📱 Reply Message:`, JSON.stringify(messages, null, 2));
    return { success: true, simulated: true };
  }

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[LINE Reply API Error]', res.status, data);
      return { success: false, error: data };
    }
    return { success: true, data };
  } catch (err) {
    console.error('[LINE Reply Network Error]', err);
    return { success: false, error: err.message };
  }
}

/**
 * 1. Flex Message: แจ้งแพทย์เมื่อยื่นใบลาสำเร็จ (1-on-1 Doctor Submission Confirmation)
 */
export function buildDoctorSubmittedFlex(request, doctor, leaveType) {
  const periodText = request.half_day_type === 'MORNING' ? ' (ครึ่งวันเช้า)' :
                     request.half_day_type === 'AFTERNOON' ? ' (ครึ่งวันบ่าย)' : ' (เต็มวัน)';
  const dateText = request.start_date === request.end_date
    ? `${request.start_date}${periodText}`
    : `${request.start_date} ถึง ${request.end_date} (${request.duration_days} วัน)`;

  return {
    type: 'flex',
    altText: `ยื่นใบลาสำเร็จ: ${leaveType.name_th} (${dateText})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#006699',
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: 'โรงพยาบาลกรุงเทพสิริโรจน์',
            color: '#b0d9f0',
            size: 'xs',
            weight: 'bold'
          },
          {
            type: 'text',
            text: '✅ ยื่นใบลาสำเร็จ (รออนุมัติ)',
            color: '#ffffff',
            size: 'lg',
            weight: 'bold',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'เลขที่ใบลา:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: request.request_no || '-', size: 'sm', weight: 'bold', color: '#0f172a', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ประเภทการลา:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: leaveType.name_th, size: 'sm', weight: 'bold', color: '#006699', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'วันที่ลา:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: dateText, size: 'sm', weight: 'bold', color: '#0f172a', flex: 5, wrap: true }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'เหตุผล:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: request.reason || 'ไม่ระบุ', size: 'sm', color: '#334155', flex: 5, wrap: true }
            ]
          },
          request.reimbursement_requested !== null && request.reimbursement_requested !== undefined ? {
            type: 'box',
            layout: 'horizontal',
            margin: 'xs',
            contents: [
              { type: 'text', text: 'เบิกค่าใช้จ่าย:', size: 'xs', color: '#64748b', flex: 3 },
              { type: 'text', text: request.reimbursement_requested ? 'ต้องการเบิก' : 'ไม่เบิก', size: 'xs', weight: 'bold', color: request.reimbursement_requested ? '#059669' : '#64748b', flex: 5 }
            ]
          } : { type: 'filler' },
          request.swap_date ? {
            type: 'box',
            layout: 'horizontal',
            margin: 'xs',
            contents: [
              { type: 'text', text: 'วันสลับออกตรวจ:', size: 'xs', color: '#64748b', flex: 3 },
              { type: 'text', text: request.swap_date, size: 'xs', weight: 'bold', color: '#059669', flex: 5 }
            ]
          } : { type: 'filler' },
          request.substitute_doctor_name ? {
            type: 'box',
            layout: 'horizontal',
            margin: 'xs',
            contents: [
              { type: 'text', text: 'แพทย์รับเวรแทน:', size: 'xs', color: '#64748b', flex: 3 },
              { type: 'text', text: request.substitute_doctor_name, size: 'xs', weight: 'bold', color: '#0284c7', flex: 5, wrap: true }
            ]
          } : { type: 'filler' },
          request.is_emergency ? {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#fef2f2',
            cornerRadius: '8px',
            paddingAll: '10px',
            margin: 'sm',
            contents: [
              {
                type: 'text',
                text: '🚨 ลาฉุกเฉินวันเดียวกัน: กรุณาโทรแจ้งฝ่ายการแพทย์ทันที',
                size: 'xs',
                color: '#dc2626',
                weight: 'bold',
                wrap: true
              }
            ]
          } : { type: 'filler' },
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#f8fafc',
            cornerRadius: '8px',
            paddingAll: '8px',
            margin: 'xs',
            contents: [
              {
                type: 'text',
                text: '🔄 สายอนุมัติ: หัวหน้าแพทย์ >> นพ.ปริวรรธน์ ระเด่น (ผช.ผอ.รพ.)',
                size: 'xxs',
                color: '#64748b'
              }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: 'ระบบส่งแจ้งเตือนไปยังหัวหน้าแพทย์เพื่อพิจารณาขั้นที่ 1 เรียบร้อยแล้ว',
            size: 'xs',
            color: '#006699',
            align: 'center',
            weight: 'bold'
          }
        ]
      }
    }
  };
}

/**
 * 2. Flex Message: ส่งถึงผู้อนุมัติ (Step 1: หัวหน้าแพทย์ หรือ Step 2: นพ.ปริวรรธน์ ระเด่น) มีปุ่ม 1-click Approve
 */
export function buildApproverRequestFlex(request, doctor, leaveType, quotaInfo, appUrl, stepOrder = 1, prevApproverName = '') {
  const periodText = request.half_day_type === 'MORNING' ? ' (ครึ่งวันเช้า)' :
                     request.half_day_type === 'AFTERNOON' ? ' (ครึ่งวันบ่าย)' : ' (เต็มวัน)';
  const dateText = request.start_date === request.end_date
    ? `${request.start_date}${periodText}`
    : `${request.start_date} ถึง ${request.end_date} (${request.duration_days} วัน)`;

  const quotaColor = quotaInfo?.is_quota_exceeded ? '#ef4444' : '#10b981';
  const quotaText = quotaInfo 
    ? `ลาแล้ว ${quotaInfo.current_on_leave}/${quotaInfo.max_allowed} ท่าน ${quotaInfo.is_quota_exceeded ? '(⚠️ เกินโควตา)' : '(ปกติ)'}`
    : 'ปกติ';

  const isStep2 = stepOrder === 2;
  const headerTitle = request.is_emergency
    ? (isStep2 ? '🚨 ขออนุมัติลาฉุกเฉิน (ขั้นที่ 2 - ผช.ผอ.รพ.)' : '🚨 ขออนุมัติลาฉุกเฉิน (ขั้นที่ 1 - หัวหน้าแพทย์)')
    : (isStep2 ? '📋 ขออนุมัติการลา (ขั้นที่ 2 - ผช.ผอ.รพ.)' : '📋 ขออนุมัติการลา (ขั้นที่ 1 - หัวหน้าแพทย์)');

  return {
    type: 'flex',
    altText: `[ขออนุมัติลา ${isStep2 ? 'ขั้นสุดท้าย' : 'ขั้นที่ 1'}] ${doctor.prefix_th}${doctor.first_name_th} ${doctor.last_name_th} (${leaveType.name_th})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: request.is_emergency ? '#dc2626' : (isStep2 ? '#1e3a8a' : '#006699'),
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: 'โรงพยาบาลกรุงเทพสิริโรจน์',
            color: '#e0f2fe',
            size: 'xs',
            weight: 'bold'
          },
          {
            type: 'text',
            text: headerTitle,
            color: '#ffffff',
            size: 'lg',
            weight: 'bold',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'แพทย์:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: `${doctor.prefix_th}${doctor.first_name_th} ${doctor.last_name_th}`, size: 'sm', weight: 'bold', color: '#0f172a', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'แผนก:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: doctor.department_name || 'ไม่ระบุ', size: 'sm', weight: 'bold', color: '#334155', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ประเภท:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: `${leaveType.name_th} (${doctor.doctor_type === 'FULL_TIME' ? 'FT' : 'PT'})`, size: 'sm', weight: 'bold', color: '#006699', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'วันที่ลา:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: dateText, size: 'sm', weight: 'bold', color: '#0f172a', flex: 5, wrap: true }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'เหตุผล:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: request.reason || 'ไม่ระบุ', size: 'sm', color: '#334155', flex: 5, wrap: true }
            ]
          },
          request.reimbursement_requested !== null && request.reimbursement_requested !== undefined ? {
            type: 'box',
            layout: 'horizontal',
            margin: 'xs',
            contents: [
              { type: 'text', text: 'เบิกค่าใช้จ่าย:', size: 'xs', color: '#64748b', flex: 3 },
              { type: 'text', text: request.reimbursement_requested ? 'ต้องการเบิก' : 'ไม่เบิก', size: 'xs', weight: 'bold', color: request.reimbursement_requested ? '#059669' : '#64748b', flex: 5 }
            ]
          } : { type: 'filler' },
          request.swap_date ? {
            type: 'box',
            layout: 'horizontal',
            margin: 'xs',
            contents: [
              { type: 'text', text: 'วันสลับออกตรวจ:', size: 'xs', color: '#64748b', flex: 3 },
              { type: 'text', text: request.swap_date, size: 'xs', weight: 'bold', color: '#059669', flex: 5 }
            ]
          } : { type: 'filler' },
          isStep2 ? {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#f0fdf4',
            cornerRadius: '8px',
            paddingAll: '8px',
            margin: 'xs',
            contents: [
              {
                type: 'text',
                text: `✅ ผ่านขั้นที่ 1 โดย: ${prevApproverName || 'หัวหน้าแพทย์ประจำแผนก'}`,
                size: 'xs',
                color: '#166534',
                weight: 'bold'
              },
              {
                type: 'text',
                text: 'รอการพิจารณาอนุมัติขั้นสุดท้ายจาก นพ.ปริวรรธน์ ระเด่น',
                size: 'xxs',
                color: '#15803d',
                margin: 'xs'
              }
            ]
          } : {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#eff6ff',
            cornerRadius: '8px',
            paddingAll: '8px',
            margin: 'xs',
            contents: [
              {
                type: 'text',
                text: '📌 ขั้นที่ 1: หัวหน้าแพทย์พิจารณา (อนุมัติแล้วจะส่งต่อ ผช.ผอ.รพ.)',
                size: 'xs',
                color: '#1e40af',
                weight: 'bold'
              }
            ]
          },
          request.substitute_doctor_name ? {
            type: 'box',
            layout: 'horizontal',
            margin: 'xs',
            contents: [
              { type: 'text', text: 'แพทย์รับเวรแทน:', size: 'xs', color: '#64748b', flex: 3 },
              { type: 'text', text: request.substitute_doctor_name, size: 'xs', weight: 'bold', color: '#0284c7', flex: 5, wrap: true }
            ]
          } : { type: 'filler' },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'xs',
            contents: [
              { type: 'text', text: 'โควตาแผนก:', size: 'xs', color: '#64748b', flex: 3 },
              { type: 'text', text: quotaText, size: 'xs', weight: 'bold', color: quotaColor, flex: 5 }
            ]
          },
          request.is_exception ? {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#fffbeb',
            cornerRadius: '8px',
            paddingAll: '8px',
            margin: 'xs',
            contents: [
              {
                type: 'text',
                text: '⚠️ คำขอข้อยกเว้นพิเศษ (เนื่องจากโควตาเต็ม)',
                size: 'xs',
                color: '#b45309',
                weight: 'bold'
              }
            ]
          } : { type: 'filler' }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            color: '#059669', // Emerald
            action: {
              type: 'postback',
              label: isStep2 ? '✅ อนุมัติขั้นสุดท้าย (1-Click)' : '✅ อนุมัติขั้นที่ 1 (1-Click)',
              data: `action=approve&id=${request.id}&reqNo=${request.request_no}&step=${stepOrder}`,
              displayText: isStep2 ? `อนุมัติใบลา ${request.request_no} ขั้นสุดท้าย` : `อนุมัติใบลา ${request.request_no} ขั้นที่ 1`
            }
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            color: '#dc2626',
            action: {
              type: 'uri',
              label: '❌ ระบุเหตุผล / ไม่อนุมัติ',
              uri: `https://liff.line.me/${process.env.VITE_LIFF_ID || process.env.LIFF_ID || '2011832574-WtcSrDre'}/approver?id=${request.id}&action=reject`
            }
          }
        ]
      }
    }
  };
}

/**
 * 3. Flex Message: แจ้งแพทย์เมื่อคำขอได้รับการอนุมัติ / ไม่อนุมัติ
 */
export function buildLeaveDecisionFlex(request, doctor, leaveType, action, approverName, comments) {
  const isApproved = action === 'APPROVED';
  const headerBg = isApproved ? '#059669' : '#dc2626';
  const statusTitle = isApproved ? '🎉 ใบลาได้รับการอนุมัติ' : '❌ ใบลาไม่ได้รับการอนุมัติ';

  return {
    type: 'flex',
    altText: `${statusTitle}: ${leaveType.name_th} (${request.request_no})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: headerBg,
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: 'โรงพยาบาลกรุงเทพสิริโรจน์',
            color: '#ffffff',
            size: 'xs',
            weight: 'bold'
          },
          {
            type: 'text',
            text: statusTitle,
            color: '#ffffff',
            size: 'lg',
            weight: 'bold',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'เลขที่ใบลา:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: request.request_no, size: 'sm', weight: 'bold', color: '#0f172a', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ประเภท:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: leaveType.name_th, size: 'sm', weight: 'bold', color: '#006699', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'วันที่:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: `${request.start_date} (${request.duration_days} วัน)`, size: 'sm', color: '#0f172a', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ผู้อนุมัติ:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: approverName || 'หัวหน้าแผนก', size: 'sm', weight: 'bold', color: '#334155', flex: 5 }
            ]
          },
          comments ? {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'เหตุผล/หมายเหตุ:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: comments, size: 'sm', color: '#dc2626', flex: 5, wrap: true }
            ]
          } : { type: 'filler' }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: isApproved ? 'ขอบคุณที่ปฏิบัติตามระเบียบการลาของ รพ.' : 'หากมีข้อสงสัย โปรดติดต่อฝ่ายการแพทย์',
            size: 'xs',
            color: '#94a3b8',
            align: 'center'
          }
        ]
      }
    }
  };
}

/**
 * 3.0 Flex Message: แจ้งแพทย์เมื่อหัวหน้าแพทย์อนุมัติขั้นที่ 1 แล้ว (กำลังส่งต่อ นพ.ปริวรรธน์ ระเด่น)
 */
export function buildDoctorStep1ApprovedFlex(request, doctor, leaveType, approverName) {
  const periodText = request.half_day_type === 'MORNING' ? ' (ครึ่งวันเช้า)' :
                     request.half_day_type === 'AFTERNOON' ? ' (ครึ่งวันบ่าย)' : ' (เต็มวัน)';
  const dateText = request.start_date === request.end_date
    ? `${request.start_date}${periodText}`
    : `${request.start_date} ถึง ${request.end_date} (${request.duration_days} วัน)`;

  return {
    type: 'flex',
    altText: `[ผลการพิจารณาขั้นที่ 1] ใบลา ${request.request_no} ผ่านการอนุมัติแล้ว`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0284c7', // Sky Blue
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: 'โรงพยาบาลกรุงเทพสิริโรจน์',
            color: '#e0f2fe',
            size: 'xs',
            weight: 'bold'
          },
          {
            type: 'text',
            text: '✅ ผ่านการอนุมัติขั้นที่ 1 แล้ว',
            color: '#ffffff',
            size: 'lg',
            weight: 'bold',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'เลขที่ใบลา:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: request.request_no, size: 'sm', weight: 'bold', color: '#0f172a', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ประเภทการลา:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: leaveType.name_th, size: 'sm', weight: 'bold', color: '#006699', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'วันที่ลา:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: dateText, size: 'sm', color: '#0f172a', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ผู้อนุมัติขั้นที่ 1:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: approverName || 'หัวหน้าแพทย์ประจำแผนก', size: 'sm', weight: 'bold', color: '#0369a1', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#eff6ff',
            cornerRadius: '8px',
            paddingAll: '10px',
            margin: 'sm',
            contents: [
              {
                type: 'text',
                text: '⏳ อยู่ระหว่างรอการพิจารณาขั้นสุดท้าย (ขั้นที่ 2)',
                size: 'xs',
                color: '#1e40af',
                weight: 'bold'
              },
              {
                type: 'text',
                text: 'ระบบได้ส่งต่อคำขอไปยัง นพ.ปริวรรธน์ ระเด่น (ผู้ช่วยผู้อำนวยการ รพ.) เพื่อพิจารณาอนุมัติขั้นสุดท้ายแล้ว',
                size: 'xxs',
                color: '#3b82f6',
                margin: 'xs',
                wrap: true
              }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'ระบบจะส่งข้อความแจ้งเตือนผลการอนุมัติขั้นสุดท้ายให้ท่านทราบทันที',
            size: 'xs',
            color: '#94a3b8',
            align: 'center'
          }
        ]
      }
    }
  };
}

/**
 * 3.01 Flex Message: แจ้งเตือนพี่กุ้ง ฝ่ายการแพทย์ ให้ทราบทุกขั้นตอน ("พี่ต้องทราบด้วย")
 */
export function buildMedicalAdminNotificationFlex(request, doctor, leaveType, eventType, actorName = '', comments = '') {
  let title = '📌 มีการยื่นขอลาใหม่';
  let badgeColor = '#0284c7';
  let subtitle = 'รอหัวหน้าแพทย์พิจารณา (ขั้นที่ 1)';

  if (eventType === 'STEP1_APPROVED') {
    title = '📌 อนุมัติขั้นที่ 1 แล้ว';
    badgeColor = '#0d9488';
    subtitle = `อนุมัติโดย: ${actorName} >> ส่งต่อ นพ.ปริวรรธน์ ระเด่น`;
  } else if (eventType === 'FINAL_APPROVED') {
    title = '✅ อนุมัติสมบูรณ์แล้ว';
    badgeColor = '#059669';
    subtitle = `อนุมัติขั้นสุดท้ายโดย: นพ.ปริวรรธน์ ระเด่น (ผช.ผอ.รพ.)`;
  } else if (eventType === 'REJECTED') {
    title = '❌ ไม่อนุมัติคำขอลา';
    badgeColor = '#dc2626';
    subtitle = `ไม่อนุมัติโดย: ${actorName}`;
  }

  return {
    type: 'flex',
    altText: `[ฝ่ายการแพทย์] ${title}: ${doctor.prefix_th}${doctor.first_name_th} (${request.request_no})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: badgeColor,
        paddingAll: '14px',
        contents: [
          {
            type: 'text',
            text: 'ฝ่ายการแพทย์ (Medical Affairs)',
            color: '#ffffff',
            size: 'xxs',
            weight: 'bold'
          },
          {
            type: 'text',
            text: title,
            color: '#ffffff',
            size: 'md',
            weight: 'bold',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'แพทย์:', size: 'xs', color: '#64748b', flex: 3 },
              { type: 'text', text: `${doctor.prefix_th}${doctor.first_name_th} ${doctor.last_name_th}`, size: 'xs', weight: 'bold', color: '#0f172a', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'แผนก:', size: 'xs', color: '#64748b', flex: 3 },
              { type: 'text', text: doctor.department_name || 'ไม่ระบุ', size: 'xs', color: '#334155', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'เลขที่:', size: 'xs', color: '#64748b', flex: 3 },
              { type: 'text', text: request.request_no, size: 'xs', weight: 'bold', color: '#006699', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ประเภท:', size: 'xs', color: '#64748b', flex: 3 },
              { type: 'text', text: `${leaveType.name_th} (${request.duration_days} วัน)`, size: 'xs', color: '#0f172a', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ช่วงวันที่:', size: 'xs', color: '#64748b', flex: 3 },
              { type: 'text', text: `${request.start_date} ถึง ${request.end_date}`, size: 'xs', color: '#0f172a', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#f8fafc',
            cornerRadius: '6px',
            paddingAll: '8px',
            margin: 'xs',
            contents: [
              {
                type: 'text',
                text: subtitle,
                size: 'xxs',
                color: '#475569',
                wrap: true
              },
              comments ? {
                type: 'text',
                text: `หมายเหตุ: ${comments}`,
                size: 'xxs',
                color: '#dc2626',
                margin: 'xs',
                wrap: true
              } : { type: 'filler' }
            ]
          }
        ]
      }
    }
  };
}

/**
 * 3.1 Flex Message: ใบเสร็จ / ยืนยันการอนุมัติส่งกลับหาผู้อนุมัติ (Approver Receipt / Feedback)
 */
export function buildApproverReceiptFlex(request, doctor, leaveType, isAlready = false) {
  const periodText = request.half_day_type === 'MORNING' ? ' (ครึ่งวันเช้า)' :
                     request.half_day_type === 'AFTERNOON' ? ' (ครึ่งวันบ่าย)' : ' (เต็มวัน)';
  const dateText = request.start_date === request.end_date
    ? `${request.start_date}${periodText}`
    : `${request.start_date} ถึง ${request.end_date} (${request.duration_days} วัน)`;

  return {
    type: 'flex',
    altText: isAlready 
      ? `[แจ้งสถานะ] ใบลา ${request.request_no} ได้รับการอนุมัติไปแล้ว` 
      : `[อนุมัติสำเร็จ] ใบลา ${request.request_no} ได้รับการอนุมัติเรียบร้อยแล้ว`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#059669', // Emerald
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: 'โรงพยาบาลกรุงเทพสิริโรจน์',
            color: '#d1fae5',
            size: 'xs',
            weight: 'bold'
          },
          {
            type: 'text',
            text: isAlready ? 'ℹ️ ใบลาได้รับการอนุมัติแล้ว' : '✅ บันทึกการอนุมัติเรียบร้อยแล้ว',
            color: '#ffffff',
            size: 'lg',
            weight: 'bold',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'เลขที่ใบลา:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: request.request_no, size: 'sm', weight: 'bold', color: '#0f172a', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'แพทย์ผู้ขอลา:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: `${doctor.prefix_th}${doctor.first_name_th} ${doctor.last_name_th}`, size: 'sm', weight: 'bold', color: '#0f172a', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ประเภท:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: `${leaveType?.name_th || 'ลาป่วย'} (${doctor.doctor_type === 'FULL_TIME' ? 'FT' : 'PT'})`, size: 'sm', weight: 'bold', color: '#006699', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'วันที่ลา:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: dateText, size: 'sm', color: '#334155', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#f0fdf4',
            cornerRadius: '8px',
            paddingAll: '10px',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: isAlready 
                  ? 'ใบลาใบนี้ได้รับการบันทึกอนุมัติไปเรียบร้อยแล้วก่อนหน้านี้'
                  : 'ระบบได้ส่งการแจ้งเตือนผลการอนุมัติไปยังแพทย์ผู้ยื่นคำขอเรียบร้อยแล้ว',
                size: 'xs',
                color: '#15803d',
                wrap: true
              }
            ]
          }
        ]
      }
    }
  };
}

/**
 * 4. Flex Message: แจ้งเตือนพี่กุ้งกรณีลาฉุกเฉิน (Emergency Alert to P'Koong)
 */
export function buildEmergencyAlertFlex(request, doctor, leaveType, koongPhone) {
  return {
    type: 'flex',
    altText: `🚨 ด่วน! แพทย์แจ้งลาฉุกเฉิน: ${doctor.prefix_th}${doctor.first_name_th} (${doctor.phone})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#b91c1c',
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: '🚨 แจ้งเตือนฝ่ายการแพทย์ (ด่วนที่สุด)',
            color: '#fee2e2',
            size: 'xs',
            weight: 'bold'
          },
          {
            type: 'text',
            text: 'แพทย์แจ้งลาฉุกเฉินวันนี้',
            color: '#ffffff',
            size: 'lg',
            weight: 'bold',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: `${doctor.prefix_th}${doctor.first_name_th} ${doctor.last_name_th}`,
            size: 'md',
            weight: 'bold',
            color: '#0f172a'
          },
          {
            type: 'text',
            text: `${doctor.department_name || 'ไม่ระบุแผนก'} (${doctor.doctor_type === 'FULL_TIME' ? 'แพทย์ประจำ' : 'แพทย์พาร์ทไทม์'})`,
            size: 'sm',
            color: '#475569'
          },
          {
            type: 'separator',
            margin: 'sm'
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'sm',
            contents: [
              { type: 'text', text: 'ประเภท:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: leaveType.name_th, size: 'sm', weight: 'bold', color: '#dc2626', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'เหตุผล:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: request.reason || 'ไม่ระบุ', size: 'sm', color: '#1e293b', flex: 5, wrap: true }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'เบอร์แพทย์:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: doctor.phone || '-', size: 'sm', weight: 'bold', color: '#0369a1', flex: 5 }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            color: '#0284c7',
            action: {
              type: 'uri',
              label: '📞 โทรหาแพทย์ทันที',
              uri: `tel:${doctor.phone || '0822223344'}`
            }
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'uri',
              label: '🖥️ เปิด Admin Dashboard',
              uri: `https://liff.line.me/${process.env.VITE_LIFF_ID || process.env.LIFF_ID || '2011832574-WtcSrDre'}/admin`
            }
          }
        ]
      }
    }
  };
}

// ------------------------------------------------------------------
// 6. CANCEL ALERT FLEX MESSAGE
// ------------------------------------------------------------------
export function buildCancelAlertFlex(request, doc, leaveType) {
  const flex = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "แจ้งเตือนยกเลิกการลา",
          weight: "bold",
          size: "lg",
          color: "#ffffff"
        },
        {
          type: "text",
          text: `โดย ${doc.prefix_th}${doc.first_name_th} ${doc.last_name_th}`,
          size: "xs",
          color: "#ffffffcc"
        }
      ],
      backgroundColor: "#ef4444", // Rose 500
      paddingAll: "20px"
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "แพทย์ได้ทำการยกเลิกคำขอลาด้วยตนเอง",
          size: "sm",
          color: "#475569",
          wrap: true,
          weight: "bold",
          margin: "sm"
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "เลขที่",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 2
                },
                {
                  type: "text",
                  text: request.request_no,
                  wrap: true,
                  color: "#333333",
                  size: "sm",
                  flex: 5,
                  weight: "bold"
                }
              ]
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "ประเภท",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 2
                },
                {
                  type: "text",
                  text: leaveType.name_th,
                  wrap: true,
                  color: "#333333",
                  size: "sm",
                  flex: 5
                }
              ]
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "วันที่",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 2
                },
                {
                  type: "text",
                  text: request.start_date === request.end_date 
                          ? request.start_date 
                          : `${request.start_date} - ${request.end_date}`,
                  wrap: true,
                  color: "#333333",
                  size: "sm",
                  flex: 5
                }
              ]
            }
          ]
        }
      ]
    }
  };

  return {
    type: "flex",
    altText: `ยกเลิกการลา: ${doc.first_name_th}`,
    contents: flex
  };
}

/**
 * Welcome / Greeting Flex Message when doctor adds friend or opens chat
 */
export function buildWelcomeFlex(doctorName = '') {
  return {
    type: 'flex',
    altText: 'ยินดีต้อนรับสู่ระบบ Doctor Leave @ LINE โรงพยาบาลกรุงเทพศิริโรจน์',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#002d74',
        paddingAll: '18px',
        contents: [
          {
            type: 'text',
            text: 'BANGKOK HOSPITAL SIRIROJ',
            color: '#93c5fd',
            size: 'xs',
            weight: 'bold'
          },
          {
            type: 'text',
            text: '🩺 ยินดีต้อนรับสู่ระบบลาแพทย์ BSI',
            color: '#ffffff',
            size: 'md',
            weight: 'bold',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '18px',
        contents: [
          {
            type: 'text',
            text: `สวัสดีครับ/ค่ะ ${doctorName ? doctorName : 'คุณหมอ'}`,
            weight: 'bold',
            size: 'md',
            color: '#0f172a'
          },
          {
            type: 'text',
            text: 'ยินดีต้อนรับสู่ระบบ Doctor Leave @ LINE โรงพยาบาลกรุงเทพศิริโรจน์ คุณหมอสามารถแตะเมนูด้านล่างเพื่อทำรายการได้ทันทีครับ',
            size: 'sm',
            color: '#475569',
            wrap: true
          },
          {
            type: 'separator',
            margin: 'md'
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: '• ยื่นใบลาแพทย์ (ลาพักผ่อน, ป่วย, กิจ, ประชุมวิชาการ)',
                size: 'xs',
                color: '#64748b'
              },
              {
                type: 'text',
                text: '• ตรวจสอบสิทธิ์คงเหลือ & ประวัติการอนุมัติ',
                size: 'xs',
                color: '#64748b'
              },
              {
                type: 'text',
                text: '• ตรวจสอบตารางเวรออกตรวจแพทย์',
                size: 'xs',
                color: '#64748b'
              },
              {
                type: 'text',
                text: '• ติดต่อฝ่ายการแพทย์ ฉุกเฉิน: 076-361-888',
                size: 'xs',
                color: '#64748b'
              }
            ]
          }
        ]
      }
    }
  };
}

/**
 * Contact Info Flex Message for Quadrant 4 / Emergency Contact
 */
export function buildContactCardFlex(settings = {}) {
  const deptName = settings.department_name || 'ฝ่ายการแพทย์ (Medical Affairs)';
  const coordinator = settings.coordinator_name || 'เจ้าหน้าที่ฝ่ายการแพทย์';
  const phoneEmergency = settings.phone_emergency || '076-361-888';
  const phoneExt = settings.phone_ext ? ` ต่อ ${settings.phone_ext}` : '';
  const phoneHotline = settings.phone_hotline || '081-999-8888';
  const location = settings.location || 'อาคาร A ชั้น 3 ฝ่ายการแพทย์ รพ.กรุงเทพศิริโรจน์';
  const cleanDialNumber = (phoneHotline || phoneEmergency).replace(/[^0-9]/g, '');

  return {
    type: 'flex',
    altText: `📞 ติดต่อ${deptName}: โทร ${phoneEmergency}${phoneExt} หรือสายด่วน ${phoneHotline}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#002d74',
        paddingAll: '18px',
        contents: [
          {
            type: 'text',
            text: 'BANGKOK HOSPITAL SIRIROJ',
            color: '#93c5fd',
            size: 'xs',
            weight: 'bold'
          },
          {
            type: 'text',
            text: '📞 ช่องทางติดต่อฝ่ายการแพทย์',
            color: '#ffffff',
            size: 'md',
            weight: 'bold',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '18px',
        contents: [
          {
            type: 'text',
            text: deptName,
            weight: 'bold',
            size: 'md',
            color: '#006699'
          },
          {
            type: 'text',
            text: `ผู้ประสานงาน: ${coordinator}`,
            size: 'xs',
            color: '#64748b'
          },
          {
            type: 'separator',
            margin: 'sm'
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'sm',
            contents: [
              { type: 'text', text: 'เบอร์หลัก รพ.:', size: 'xs', color: '#64748b', flex: 4 },
              { type: 'text', text: `${phoneEmergency}${phoneExt}`, size: 'xs', weight: 'bold', color: '#0f172a', flex: 6 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'สายด่วน 24 ชม.:', size: 'xs', color: '#64748b', flex: 4 },
              { type: 'text', text: phoneHotline, size: 'xs', weight: 'bold', color: '#e11d48', flex: 6 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'สถานที่ติดต่อ:', size: 'xs', color: '#64748b', flex: 4 },
              { type: 'text', text: location, size: 'xs', color: '#334155', flex: 6, wrap: true }
            ]
          },
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#fff1f2',
            cornerRadius: '8px',
            paddingAll: '10px',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: '🚨 กรณีลาฉุกเฉินเช้าวันเดียวกัน กรุณาโทรแจ้งฝ่ายการแพทย์ทันทีเพื่อประสานงานปิดตารางตรวจ',
                size: 'xxs',
                color: '#be123c',
                weight: 'bold',
                wrap: true
              }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#006699',
            height: 'sm',
            action: {
              type: 'uri',
              label: `📞 โทรออกสายด่วน (${phoneHotline})`,
              uri: `tel:${cleanDialNumber}`
            }
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'uri',
              label: '🩺 ยื่นใบลาผ่านระบบ (LIFF)',
              uri: `https://liff.line.me/${process.env.VITE_LIFF_ID || '2011832574-WtcSrDre'}`
            }
          }
        ]
      }
    }
  };
}

