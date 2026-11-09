import cron from 'node-cron';
import { getDb, saveStore } from './db.js';
import { sendLinePushMessage } from './line.js';

// Build a simple text-based Flex or Bubble for reminder
export function buildReminderFlex(request, doc, leaveType, hours) {
  const flex = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `แจ้งเตือนค้างอนุมัติ (${hours} ชม.)`,
          weight: "bold",
          size: "lg",
          color: "#ffffff"
        },
        {
          type: "text",
          text: "โปรดพิจารณาอนุมัติใบลา",
          size: "xs",
          color: "#ffffffcc"
        }
      ],
      backgroundColor: "#f59e0b", // Amber 500
      paddingAll: "20px"
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `ใบลาของ ${doc.prefix_th}${doc.first_name_th} ${doc.last_name_th} รอการอนุมัติมานานกว่า ${hours} ชั่วโมงแล้วครับ`,
          size: "sm",
          color: "#475569",
          wrap: true,
          margin: "sm"
        },
        {
          type: "button",
          style: "primary",
          color: "#006699",
          margin: "xl",
          action: {
            type: "uri",
            label: "เปิดศูนย์อนุมัติ",
            uri: `https://liff.line.me/${process.env.VITE_LIFF_ID || process.env.LIFF_ID || '2012494812-wDotvhLS'}/approver`
          }
        }
      ]
    }
  };
  return [{ type: 'flex', altText: `แจ้งเตือนใบลาค้างอนุมัติ ${hours} ชม.`, contents: flex }];
}

// Build Flex for Late Attachment Reminder
export function buildAttachmentReminderFlex(request, doc, leaveType, status) {
  const isDue = status === 'DUE';
  const liffId = process.env.VITE_LIFF_ID || process.env.LIFF_ID || '2012494812-wDotvhLS';
  const flex = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: isDue ? "⚠️ ครบกำหนดแนบเอกสาร" : "⏰ เตือนแนบเอกสารประกอบ",
          weight: "bold",
          size: "lg",
          color: "#ffffff"
        },
        {
          type: "text",
          text: isDue ? "กรุณาแนบเอกสารย้อนหลังทันที" : "เหลือเวลาอีก 24 ชั่วโมง",
          size: "xs",
          color: "#ffffffcc"
        }
      ],
      backgroundColor: isDue ? "#e11d48" : "#f59e0b",
      paddingAll: "20px"
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `สวัสดีครับ ${doc.prefix_th}${doc.first_name_th} ใบลาเลขที่ ${request.request_no} (${leaveType.name_th}) ของท่านถึงกำหนดแนบเอกสารประกอบแล้วครับ`,
          size: "sm",
          color: "#334155",
          wrap: true
        },
        {
          type: "box",
          layout: "vertical",
          margin: "md",
          spacing: "xs",
          contents: [
            {
              type: "text",
              text: `• วันที่ลา: ${request.start_date}${request.end_date !== request.start_date ? ' ถึง ' + request.end_date : ''}`,
              size: "xs",
              color: "#64748b"
            },
            {
              type: "text",
              text: `• เอกสาร: ${leaveType.code === 'PERSONAL' ? 'ใบมรณบัตร' : leaveType.code === 'UNPAID' ? 'จดหมายเรียนถึงผู้อำนวยการ' : leaveType.code === 'SICK' ? 'ใบรับรองแพทย์' : 'ใบรับรองแพทย์ / หนังสือเชิญ'}`,
              size: "xs",
              color: "#64748b"
            }
          ]
        },
        {
          type: "button",
          style: "primary",
          color: "#006699",
          margin: "xl",
          action: {
            type: "uri",
            label: "📎 แนบเอกสารทันที",
            uri: `https://liff.line.me/${liffId}/history?uploadId=${request.id}`
          }
        }
      ]
    }
  };
  return [{ type: 'flex', altText: `แจ้งเตือนแนบเอกสารประกอบ ${request.request_no}`, contents: flex }];
}

export function initCronJobs() {
  console.log('⏰ Initializing Auto-Reminder Cron Jobs...');

  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Checking for pending leave requests and attachments...');
    const db = getDb();
    const now = new Date();
    let updated = false;

    for (const req of db.leave_requests) {
      const doc = db.doctors.find(d => d.id === req.doctor_id);
      const leaveType = db.leave_types.find(lt => lt.id === req.leave_type_id);
      if (!doc || !leaveType) continue;

      // 1. Check Pending Approval Reminders (48h & 24h)
      if (req.status === 'PENDING') {
        const createdDate = new Date(req.created_at);
        const hoursDiff = (now - createdDate) / (1000 * 60 * 60);

        const currentStep = req.current_step || 1;
        const route = db.approval_routes.find(r => r.doctor_id === req.doctor_id && r.step_order === currentStep);
        const defaultApproverId = currentStep === 2 ? 'c0000000-0000-0000-0000-000000000099' : 'c0000000-0000-0000-0000-000000000011';
        const approverId = route ? route.approver_id : defaultApproverId;
        const approver = db.doctors.find(d => d.id === approverId);

        if (approver && approver.line_user_id) {
          if (hoursDiff >= 48 && !req.reminder_sent_48) {
            req.reminder_sent_48 = true;
            updated = true;
            console.log(`[Cron] Sending 48hr reminder for Request ${req.request_no}`);
            const flex = buildReminderFlex(req, doc, leaveType, 48);
            await sendLinePushMessage(approver.line_user_id, flex).catch(console.error);
          } else if (hoursDiff >= 24 && hoursDiff < 48 && !req.reminder_sent_24) {
            req.reminder_sent_24 = true;
            updated = true;
            console.log(`[Cron] Sending 24hr reminder for Request ${req.request_no}`);
            const flex = buildReminderFlex(req, doc, leaveType, 24);
            await sendLinePushMessage(approver.line_user_id, flex).catch(console.error);
          }
        }
      }

      // 2. Check Late Attachment Reminders (upload_later === true)
      if (req.upload_later && req.status !== 'REJECTED' && req.status !== 'CANCELLED') {
        const deadlineDays = Number(leaveType.attachment_deadline_days) || 3;
        const dueDate = req.attachment_due_date
          ? new Date(req.attachment_due_date)
          : new Date(new Date(req.created_at).getTime() + deadlineDays * 86400000);
        const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);

        if (doc.line_user_id) {
          if (hoursUntilDue <= 24 && hoursUntilDue > 0 && !req.attachment_reminder_sent_24) {
            req.attachment_reminder_sent_24 = true;
            updated = true;
            console.log(`[Cron] Sending approaching attachment reminder for ${req.request_no}`);
            const flex = buildAttachmentReminderFlex(req, doc, leaveType, 'APPROACHING');
            await sendLinePushMessage(doc.line_user_id, flex).catch(console.error);
          } else if (hoursUntilDue <= 0 && !req.attachment_reminder_sent_due) {
            req.attachment_reminder_sent_due = true;
            updated = true;
            console.log(`[Cron] Sending due attachment reminder for ${req.request_no}`);
            const flex = buildAttachmentReminderFlex(req, doc, leaveType, 'DUE');
            await sendLinePushMessage(doc.line_user_id, flex).catch(console.error);
          }
        }
      }
    }

    if (updated) {
      saveStore();
    }
  });
}
