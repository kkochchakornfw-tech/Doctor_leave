import { supabase, isSupabaseConfigured } from './db.js';

let isCloudReachable = null; // null = unprobed, true = online, false = offline
let lastReachabilityCheck = 0;
const HEALTH_CHECK_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes cooldown when offline

/**
 * Checks if Supabase Cloud is reachable without spamming failed requests
 */
export async function checkSupabaseHealth() {
  if (!isSupabaseConfigured || !supabase) return false;

  const now = Date.now();
  // If recently probed as unreachable, stay in local offline mode during cooldown
  if (isCloudReachable === false && (now - lastReachabilityCheck < HEALTH_CHECK_COOLDOWN_MS)) {
    return false;
  }

  try {
    const { error } = await supabase.from('departments').select('id').limit(1);
    lastReachabilityCheck = Date.now();

    if (error) {
      if (isCloudReachable !== false) {
        console.warn(`[SUPABASE] ⚠️ Cloud connection unreachable (${error.message || 'fetch failed'}). System running smoothly in Local Storage mode (store.json).`);
      }
      isCloudReachable = false;
      return false;
    }

    if (isCloudReachable === false) {
      console.log('[SUPABASE] ✅ Supabase Cloud connection restored. Cloud sync re-enabled.');
    }
    isCloudReachable = true;
    return true;
  } catch (err) {
    lastReachabilityCheck = Date.now();
    if (isCloudReachable !== false) {
      console.warn(`[SUPABASE] ⚠️ Cloud connection error (${err.message}). System running smoothly in Local Storage mode (store.json).`);
    }
    isCloudReachable = false;
    return false;
  }
}

const SUPABASE_COLUMNS = {
  departments: new Set([
    'id', 'code', 'name_th', 'name_en', 'min_staff_required', 'max_leave_per_day', 'is_active', 'created_at'
  ]),
  doctors: new Set([
    'id', 'employee_id', 'license_no', 'line_user_id', 'prefix_th', 'first_name_th', 'last_name_th',
    'first_name_en', 'last_name_en', 'email', 'phone', 'doctor_type', 'department_id', 'avatar',
    'is_active', 'created_at', 'updated_at'
  ]),
  doctor_roles: new Set([
    'id', 'doctor_id', 'role', 'created_at'
  ]),
  approval_routes: new Set([
    'id', 'doctor_id', 'step_order', 'approver_id', 'is_active'
  ]),
  leave_types: new Set([
    'id', 'code', 'name_th', 'name_en', 'count_mode', 'allows_half_day', 'requires_attachment',
    'attachment_threshold_days', 'min_notice_days', 'max_days_per_request', 'allows_backdate',
    'is_full_time_only', 'sort_order', 'is_active', 'color'
  ]),
  leave_balances: new Set([
    'id', 'doctor_id', 'leave_type_id', 'fiscal_year', 'entitlement_days', 'carried_over_days',
    'used_days', 'pending_days', 'updated_at'
  ]),
  leave_requests: new Set([
    'id', 'request_no', 'doctor_id', 'leave_type_id', 'start_date', 'end_date', 'duration_days',
    'half_day_type', 'reason', 'is_emergency', 'is_exception', 'upload_later', 'status',
    'current_step', 'total_steps', 'idempotency_key', 'cancelled_at', 'cancelled_reason',
    'created_at', 'updated_at'
  ]),
  leave_attachments: new Set([
    'id', 'request_id', 'file_name', 'storage_path', 'file_size_bytes', 'mime_type', 'uploaded_at'
  ]),
  approval_logs: new Set([
    'id', 'request_id', 'approver_id', 'step_order', 'action', 'comments', 'acted_at'
  ]),
  audit_logs: new Set([
    'id', 'table_name', 'record_id', 'action', 'actor_id', 'old_data', 'new_data', 'ip_address', 'created_at'
  ]),
  holidays: new Set([
    'id', 'holiday_date', 'name_th', 'is_active'
  ])
};

export async function loadStoreFromSupabase(fallbackDb) {
  if (!isSupabaseConfigured || !supabase) {
    return fallbackDb;
  }
  
  try {
    console.log('🔄 Checking Supabase Cloud connection...');
    const healthy = await checkSupabaseHealth();
    if (!healthy) {
      return fallbackDb;
    }
    
    console.log('🔄 Fetching latest data from Supabase Cloud...');
    const results = await Promise.all([
      supabase.from('departments').select('*'),
      supabase.from('leave_types').select('*'),
      supabase.from('doctors').select('*'),
      supabase.from('doctor_roles').select('*'),
      supabase.from('approval_routes').select('*'),
      supabase.from('leave_balances').select('*'),
      supabase.from('leave_requests').select('*'),
      supabase.from('leave_attachments').select('*'),
      supabase.from('approval_logs').select('*'),
      supabase.from('audit_logs').select('*'),
      supabase.from('holidays').select('*')
    ]);

    // Check if any critical query had errors
    const anyError = results.find(r => r.error);
    if (anyError) {
      console.warn(`⚠️ Supabase query failed (${anyError.error.message}). Using local storage.`);
      return fallbackDb;
    }

    const [
      { data: departments },
      { data: leave_types },
      { data: doctors },
      { data: doctor_roles },
      { data: approval_routes },
      { data: leave_balances },
      { data: leave_requests },
      { data: leave_attachments },
      { data: approval_logs },
      { data: audit_logs },
      { data: holidays }
    ] = results;

    if (departments && departments.length > 0) {
      console.log('✅ Successfully loaded data from Supabase Cloud');
      // Merge local extra fields on leave_requests (like reimbursement_requested, swap_date, substitute_doctor_id)
      const mergedRequests = (leave_requests || []).map(req => {
        const localReq = fallbackDb?.leave_requests?.find(lr => lr.id === req.id);
        if (localReq) {
          return {
            ...req,
            reimbursement_requested: req.reimbursement_requested ?? localReq.reimbursement_requested,
            swap_date: req.swap_date ?? localReq.swap_date,
            substitute_doctor_id: req.substitute_doctor_id ?? localReq.substitute_doctor_id,
            substitute_doctor_name: req.substitute_doctor_name ?? localReq.substitute_doctor_name,
            duty_handover_notes: req.duty_handover_notes ?? localReq.duty_handover_notes,
            has_shift_conflict: req.has_shift_conflict ?? localReq.has_shift_conflict,
            attachment_due_date: req.attachment_due_date ?? localReq.attachment_due_date,
            submitted_by_admin: req.submitted_by_admin ?? localReq.submitted_by_admin,
            reminder_sent_24: req.reminder_sent_24 ?? localReq.reminder_sent_24,
            reminder_sent_48: req.reminder_sent_48 ?? localReq.reminder_sent_48,
            attachment_reminder_sent_24: req.attachment_reminder_sent_24 ?? localReq.attachment_reminder_sent_24,
            attachment_reminder_sent_due: req.attachment_reminder_sent_due ?? localReq.attachment_reminder_sent_due
          };
        }
        return req;
      });

      // Merge local departments extra fields (like staffing_mode, staffing_groups, head_doctor_id, final_approver_id)
      const mergedDepartments = (departments || []).map(dept => {
        const localDept = fallbackDb?.departments?.find(ld => ld.id === dept.id || ld.code === dept.code);
        return {
          ...dept,
          min_staff_required: localDept?.min_staff_required ?? dept.min_staff_required,
          staffing_mode: localDept?.staffing_mode ?? dept.staffing_mode ?? 'DEPARTMENT',
          staffing_groups: localDept?.staffing_groups ?? dept.staffing_groups ?? [],
          head_doctor_id: localDept?.head_doctor_id ?? dept.head_doctor_id,
          final_approver_id: localDept?.final_approver_id ?? dept.final_approver_id
        };
      });
      // Also preserve any locally added departments not yet in cloud
      (fallbackDb?.departments || []).forEach(ld => {
        if (!mergedDepartments.some(md => md.id === ld.id || md.code === ld.code)) {
          mergedDepartments.push(ld);
        }
      });

      // Merge local doctors extra fields (like specialty_group, position, hire_date)
      const mergedDoctors = (doctors || []).map(doc => {
        const localDoc = fallbackDb?.doctors?.find(ld => ld.id === doc.id || ld.employee_id === doc.employee_id);
        return {
          ...doc,
          position: localDoc?.position ?? doc.position,
          hire_date: localDoc?.hire_date ?? doc.hire_date,
          working_pattern: localDoc?.working_pattern ?? doc.working_pattern,
          specialty_group: localDoc?.specialty_group ?? doc.specialty_group
        };
      });
      (fallbackDb?.doctors || []).forEach(ld => {
        if (!mergedDoctors.some(md => md.id === ld.id || md.employee_id === ld.employee_id)) {
          mergedDoctors.push(ld);
        }
      });

      // Merge doctor roles
      const mergedRoles = [...(doctor_roles || [])];
      (fallbackDb?.doctor_roles || []).forEach(lr => {
        if (!mergedRoles.some(r => r.doctor_id === lr.doctor_id && r.role === lr.role)) {
          mergedRoles.push(lr);
        }
      });

      // Merge approval routes
      const mergedRoutes = [...(approval_routes || [])];
      (fallbackDb?.approval_routes || []).forEach(lr => {
        if (!mergedRoutes.some(r => r.doctor_id === lr.doctor_id && r.step_order === lr.step_order)) {
          mergedRoutes.push(lr);
        }
      });

      // Merge leave balances
      const mergedBalances = [...(leave_balances || [])];
      (fallbackDb?.leave_balances || []).forEach(lb => {
        if (!mergedBalances.some(b => b.doctor_id === lb.doctor_id && b.leave_type_id === lb.leave_type_id && b.fiscal_year === lb.fiscal_year)) {
          mergedBalances.push(lb);
        }
      });

      // Merge local leave_types extra fields (like attachment_deadline_days, max_requests_per_year, etc.)
      const mergedLeaveTypes = (leave_types || []).map(lt => {
        const localLt = fallbackDb?.leave_types?.find(l => l.id === lt.id || l.code === lt.code);
        return {
          ...lt,
          attachment_deadline_days: localLt?.attachment_deadline_days ?? lt.attachment_deadline_days ?? 3,
          max_requests_per_year: localLt?.max_requests_per_year ?? lt.max_requests_per_year,
          has_reimbursement_option: localLt?.has_reimbursement_option ?? lt.has_reimbursement_option,
          min_tenure_months: localLt?.min_tenure_months ?? lt.min_tenure_months,
          min_work_days_in_month: localLt?.min_work_days_in_month ?? lt.min_work_days_in_month
        };
      });

      return {
        departments: mergedDepartments,
        leave_types: mergedLeaveTypes,
        doctors: mergedDoctors,
        doctor_roles: mergedRoles,
        approval_routes: mergedRoutes,
        leave_balances: mergedBalances,
        leave_requests: mergedRequests,
        leave_attachments: leave_attachments || [],
        approval_logs: approval_logs || [],
        audit_logs: audit_logs || [],
        holidays: holidays || []
      };
    } else {
      console.log('ℹ️ Supabase tables are empty. Proceeding with local initial seed data.');
      return fallbackDb;
    }
  } catch (err) {
    console.warn('⚠️ Could not load from Supabase Cloud:', err.message, '- Using local storage.');
    return fallbackDb;
  }
}

export async function syncStoreToSupabase(db) {
  if (!isSupabaseConfigured || !supabase) return;

  const healthy = await checkSupabaseHealth();
  if (!healthy) return; // Skip silently while cloud is unreachable

  try {
    const safeUpsert = async (table, data) => {
      if (!data || data.length === 0) return;
      
      const validCols = SUPABASE_COLUMNS[table];
      const sanitized = data.map(record => {
        if (!record || typeof record !== 'object') return record;
        
        let out = {};
        if (validCols) {
          for (const key of Object.keys(record)) {
            if (validCols.has(key)) {
              out[key] = record[key];
            }
          }
        } else {
          out = { ...record };
        }

        if (table === 'departments') {
          out.min_staff_required = (out.min_staff_required !== null && out.min_staff_required !== undefined)
            ? Number(out.min_staff_required)
            : 0;
          out.max_leave_per_day = (out.max_leave_per_day !== null && out.max_leave_per_day !== undefined)
            ? Number(out.max_leave_per_day)
            : 1;
        }

        if (table === 'approval_logs' && !out.acted_at) {
          out.acted_at = record.created_at || new Date().toISOString();
        }

        return out;
      });

      const options = {};
      if (table === 'leave_balances') {
        options.onConflict = 'doctor_id,leave_type_id,fiscal_year';
      } else if (table === 'doctor_roles') {
        options.onConflict = 'doctor_id,role';
      }

      const { error } = await supabase.from(table).upsert(sanitized, options);
      if (error) {
        throw new Error(`[${table}]: ${error.message}`);
      }
    };

    const tablesToSync = [
      ['departments', db.departments],
      ['leave_types', db.leave_types],
      ['doctors', db.doctors],
      ['doctor_roles', db.doctor_roles],
      ['approval_routes', db.approval_routes],
      ['leave_balances', db.leave_balances],
      ['leave_requests', db.leave_requests],
      ['leave_attachments', db.leave_attachments],
      ['approval_logs', db.approval_logs],
      ['audit_logs', db.audit_logs],
      ['holidays', db.holidays]
    ];

    for (const [table, data] of tablesToSync) {
      await safeUpsert(table, data);
    }
  } catch (err) {
    // If connection drops during sync, mark offline and backoff
    isCloudReachable = false;
    lastReachabilityCheck = Date.now();
    console.warn(`[SUPABASE] ⚠️ Cloud sync paused (${err.message}). Local storage updated successfully.`);
  }
}
