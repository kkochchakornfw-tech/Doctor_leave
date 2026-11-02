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
            submitted_by_admin: req.submitted_by_admin ?? localReq.submitted_by_admin
          };
        }
        return req;
      });

      // Merge local departments extra fields (like staffing_groups)
      const mergedDepartments = (departments || []).map(dept => {
        const localDept = fallbackDb?.departments?.find(ld => ld.id === dept.id || ld.code === dept.code);
        return {
          ...dept,
          min_staff_required: dept.min_staff_required ?? localDept?.min_staff_required,
          staffing_groups: dept.staffing_groups ?? localDept?.staffing_groups
        };
      });

      // Merge local doctors extra fields (like specialty_group)
      const mergedDoctors = (doctors || []).map(doc => {
        const localDoc = fallbackDb?.doctors?.find(ld => ld.id === doc.id || ld.employee_id === doc.employee_id);
        return {
          ...doc,
          specialty_group: doc.specialty_group ?? localDoc?.specialty_group
        };
      });

      return {
        departments: mergedDepartments,
        leave_types: leave_types || [],
        doctors: mergedDoctors,
        doctor_roles: doctor_roles || [],
        approval_routes: approval_routes || [],
        leave_balances: leave_balances || [],
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
      
      const sanitized = data.map(record => {
        if (!record || typeof record !== 'object') return record;
        if (table === 'departments') {
          const { staffing_groups, doctor_count, on_leave_today_count, available_doctors_today, is_quota_exceeded_today, ...rest } = record;
          return {
            ...rest,
            min_staff_required: (record.min_staff_required !== null && record.min_staff_required !== undefined) ? Number(record.min_staff_required) : 0
          };
        }
        if (table === 'doctors') {
          const { hire_date, working_pattern, specialty_group, ...rest } = record;
          return rest;
        }
        if (table === 'leave_types') {
          const {
            max_requests_per_year, has_reimbursement_option,
            min_tenure_months, min_work_days_in_month, ...rest
          } = record;
          return rest;
        }
        if (table === 'leave_requests') {
          const { 
            reminder_sent_24, reminder_sent_48, 
            attachment_reminder_sent_24, attachment_reminder_sent_due,
            substitute_doctor_id, reimbursement_requested, swap_date,
            submitted_by_admin, ...rest 
          } = record;
          return rest;
        }
        if (table === 'approval_logs') {
          const { created_at, ...rest } = record;
          return {
            ...rest,
            acted_at: record.acted_at || created_at || new Date().toISOString()
          };
        }
        return record;
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
