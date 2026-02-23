import { supabase } from '../supabaseClient';

/* ── Solo-parent type labels (match GeneralTab select values) ─────────── */
const SOLO_PARENT_TYPE_LABELS = {
  unmarried: 'Unmarried',
  separated: 'Separated',
  legally_separated: 'Legally separated',
  widow: 'Widow',
  incarcerated: 'Spouse incarcerated',
  disability: 'Spouse with disability',
  others: 'Others',
};

/* ── PhilHealth type labels ───────────────────────────────────────────── */
const PHILHEALTH_TYPE_LABELS = {
  formal: 'Formal Economy',
  informal: 'Informal Economy',
  indigent: 'Indigent',
  sponsored: 'Sponsored',
};

/* ── High-risk reason flags ───────────────────────────────────────────── */
const HIGH_RISK_REASON_FLAGS = [
  ['has_hypertension', 'Hypertension'],
  ['has_advanced_maternal_age', 'Advanced Maternal Age'],
  ['has_multiple_gestation', 'Multiple Gestation'],
  ['has_multiple_miscarriages', 'History of Multiple Miscarriages'],
  ['has_high_bmi', 'Obesity'],
];

/* Lab type → statistics reason label mapping */
const LAB_REASON_LABELS = {
  CBC: 'Anemia',
  'Gestational Diabetes': 'Gestational Diabetes',
  Syphilis: 'Syphilis',
  HIV: 'HIV',
  'Hep B': 'Hepatitis B',
};

/* ── Birth-registration field candidates ──────────────────────────────── */
const BIRTH_REGISTRATION_FIELDS = [
  'birth_registered',
  'birth_registration_status',
  'is_birth_registered',
  'newborn_registered',
  'is_newborn_registered',
];

/* ── Helpers ──────────────────────────────────────────────────────────── */

function toBoolean(value) {
  if (value === true || value === false) return value;
  const text = String(value || '').trim().toLowerCase();
  return ['true', 'yes', '1', 'y'].includes(text);
}

function percent(numerator, denominator) {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

function isTeenage(record) {
  const age = Number(record?.age);
  return Number.isFinite(age) && age >= 10 && age <= 19;
}

function recordEntry(record) {
  const last = String(record?.last_name || '').trim();
  const first = String(record?.first_name || '').trim();
  const middle = String(record?.middle_name || '').trim();
  const parts = [last, first, middle].filter(Boolean);
  return {
    id: record?.id,
    name: parts.length ? parts.join(', ') : `Record #${record?.id || '?'}`,
    contact_no: record?.contact_no || '',
    barangay: record?.barangay || '',
  };
}

function getSortedPrenatalVisits(record) {
  const visits = Array.isArray(record?.prenatal_visits) ? [...record.prenatal_visits] : [];
  return visits;
}

function getBirthRegistrationStatus(record) {
  const raw = BIRTH_REGISTRATION_FIELDS
    .map((field) => record?.[field])
    .find((value) => value !== undefined && value !== null && String(value).trim() !== '');

  if (raw === undefined || raw === null) return 'Unknown';
  if (toBoolean(raw)) return 'Registered';
  if (raw === false || raw === 0) return 'Not Registered';

  const text = String(raw).trim().toLowerCase();
  if (['registered', 'complete', 'completed', 'yes'].includes(text)) return 'Registered';
  if (['unregistered', 'not registered', 'no', 'pending', 'false', '0'].includes(text)) return 'Not Registered';
  return 'Unknown';
}

function collectRiskReasons(record) {
  const reasons = [];
  for (const [key, label] of HIGH_RISK_REASON_FLAGS) {
    if (toBoolean(record?.[key])) reasons.push(label);
  }
  // Derive individual lab reasons from lab_logs
  const labLogs = Array.isArray(record?.lab_logs) ? record.lab_logs : [];
  const addedLabReasons = new Set();
  for (const log of labLogs) {
    const isBad = log.result === 'With Anemia' || log.result === 'Positive';
    if (isBad && log.type && LAB_REASON_LABELS[log.type] && !addedLabReasons.has(log.type)) {
      reasons.push(LAB_REASON_LABELS[log.type]);
      addedLabReasons.add(log.type);
    }
  }
  const customReason = String(record?.high_risk_reason || '').trim();
  if (customReason) reasons.push(customReason);
  if (!reasons.length) reasons.push('Unspecified');
  return reasons;
}

function has4PncCompleted(record) {
  const allFour = [record?.pnc_date_1, record?.pnc_date_2, record?.pnc_date_3, record?.pnc_date_4].every(Boolean);
  if (allFour) return true;
  const flag = record?.is_4pnc_completed;
  if (flag === 'Yes' || flag === true || flag === 'true') return true;
  return false;
}

function has8AncCompleted(record) {
  const visits = getSortedPrenatalVisits(record);
  if (visits.length >= 8) return true;
  if (toBoolean(record?.is_8anc_completed)) return true;
  return false;
}

/** Push a record entry { id, name } into a Map<string, Array> bucket */
function pushEntry(map, key, record) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(recordEntry(record));
}

/* ── Main aggregator ──────────────────────────────────────────────────── */

export function buildMaternalStatistics(records) {
  const safeRecords = Array.isArray(records) ? records : [];
  const totalRecords = safeRecords.length;

  // ── General Data counters + record lists ──
  let soloYes = 0, soloNo = 0, soloUnknown = 0;
  const soloByType = {};
  const soloEntries = new Map();
  const soloTypeEntries = new Map();

  let phMember = 0, phDependent = 0, phNotMember = 0, phUnknown = 0;
  const phByType = {};
  const phEntries = new Map();
  const phTypeEntries = new Map();

  let sssYes = 0, sssNo = 0, sssUnknown = 0;
  const sssEntries = new Map();

  let gsisYes = 0, gsisNo = 0, gsisUnknown = 0;
  const gsisEntries = new Map();

  let birthRegistered = 0, birthNotRegistered = 0, birthUnknown = 0;
  const birthRegEntries = new Map();

  // ── Pregnancy Related counters + record lists ──
  let anc8Completed = 0;
  const ancEntries = new Map();

  let pnc4Completed = 0;
  const pncEntries = new Map();

  let highRiskCount = 0;
  const riskReasons = new Map();
  const riskReasonEntries = new Map();
  const highRiskEntries = new Map();

  let teenageCount = 0;
  const teenageEntries = [];

  for (const record of safeRecords) {
    /* ─ Solo Parent ─ */
    if (record.is_solo_parent === true) {
      soloYes += 1;
      pushEntry(soloEntries, 'Yes', record);
      const spType = String(record.solo_parent_type || '').trim().toLowerCase();
      if (spType) {
        const label = SOLO_PARENT_TYPE_LABELS[spType] || spType;
        soloByType[label] = (soloByType[label] || 0) + 1;
        pushEntry(soloTypeEntries, label, record);
      }
    } else if (record.is_solo_parent === false) {
      soloNo += 1;
      pushEntry(soloEntries, 'No', record);
    } else {
      soloUnknown += 1;
      pushEntry(soloEntries, 'Unknown', record);
    }

    /* ─ PhilHealth ─ */
    const phStatus = String(record.philhealth_status || '').trim();
    if (phStatus === 'Member') {
      phMember += 1;
      pushEntry(phEntries, 'Member', record);
      const phType = String(record.philhealth_type || '').trim().toLowerCase();
      if (phType) {
        const label = PHILHEALTH_TYPE_LABELS[phType] || phType;
        phByType[label] = (phByType[label] || 0) + 1;
        pushEntry(phTypeEntries, label, record);
      }
    } else if (phStatus === 'Dependent') {
      phDependent += 1;
      pushEntry(phEntries, 'Dependent', record);
    } else if (phStatus === 'Not a member') {
      phNotMember += 1;
      pushEntry(phEntries, 'Not a Member', record);
    } else {
      phUnknown += 1;
      pushEntry(phEntries, 'Unknown', record);
    }

    /* ─ SSS ─ */
    if (record.sss_member === true) { sssYes += 1; pushEntry(sssEntries, 'Member', record); }
    else if (record.sss_member === false) { sssNo += 1; pushEntry(sssEntries, 'Not Member', record); }
    else { sssUnknown += 1; pushEntry(sssEntries, 'Unknown', record); }

    /* ─ GSIS ─ */
    if (record.gsis_member === true) { gsisYes += 1; pushEntry(gsisEntries, 'Member', record); }
    else if (record.gsis_member === false) { gsisNo += 1; pushEntry(gsisEntries, 'Not Member', record); }
    else { gsisUnknown += 1; pushEntry(gsisEntries, 'Unknown', record); }

    /* ─ Birth Registration ─ */
    const regStatus = getBirthRegistrationStatus(record);
    if (regStatus === 'Registered') { birthRegistered += 1; pushEntry(birthRegEntries, 'Registered', record); }
    else if (regStatus === 'Not Registered') { birthNotRegistered += 1; pushEntry(birthRegEntries, 'Not Registered', record); }
    else { birthUnknown += 1; pushEntry(birthRegEntries, 'Unknown', record); }

    /* ─ 8 ANC Completion ─ */
    if (has8AncCompleted(record)) { anc8Completed += 1; pushEntry(ancEntries, 'Completed', record); }
    else { pushEntry(ancEntries, 'Not Completed', record); }

    /* ─ 4 PNC Completion ─ */
    if (has4PncCompleted(record)) { pnc4Completed += 1; pushEntry(pncEntries, 'Completed', record); }
    else { pushEntry(pncEntries, 'Not Completed', record); }

    /* ─ High Risk ─ */
    if (toBoolean(record?.is_high_risk)) {
      highRiskCount += 1;
      pushEntry(highRiskEntries, 'High Risk', record);
      for (const reason of collectRiskReasons(record)) {
        riskReasons.set(reason, (riskReasons.get(reason) || 0) + 1);
        pushEntry(riskReasonEntries, reason, record);
      }
    } else {
      pushEntry(highRiskEntries, 'Normal', record);
    }

    /* ─ Teenage Pregnancy ─ */
    if (isTeenage(record)) {
      teenageCount += 1;
      teenageEntries.push(recordEntry(record));
    }
  }

  const mapToObj = (m) => Object.fromEntries(m.entries());

  const topRiskFactors = [...riskReasons.entries()]
    .map(([reason, count]) => ({ reason, count, records: riskReasonEntries.get(reason) || [] }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));

  return {
    generatedAt: new Date().toISOString(),
    totals: { mothers: totalRecords },
    generalData: {
      soloParent: {
        yes: soloYes, no: soloNo, unknown: soloUnknown,
        byType: soloByType,
        records: mapToObj(soloEntries),
        typeRecords: mapToObj(soloTypeEntries),
      },
      philhealth: {
        member: phMember, dependent: phDependent, notMember: phNotMember, unknown: phUnknown,
        byType: phByType,
        records: mapToObj(phEntries),
        typeRecords: mapToObj(phTypeEntries),
      },
      sss: { member: sssYes, notMember: sssNo, unknown: sssUnknown, records: mapToObj(sssEntries) },
      gsis: { member: gsisYes, notMember: gsisNo, unknown: gsisUnknown, records: mapToObj(gsisEntries) },
      birthRegistration: {
        registered: birthRegistered, notRegistered: birthNotRegistered, unknown: birthUnknown,
        records: mapToObj(birthRegEntries),
      },
    },
    pregnancyRelated: {
      ancCompletion: {
        completed: anc8Completed,
        notCompleted: Math.max(totalRecords - anc8Completed, 0),
        records: mapToObj(ancEntries),
      },
      postpartumCompletion: {
        completed: pnc4Completed,
        notCompleted: Math.max(totalRecords - pnc4Completed, 0),
        records: mapToObj(pncEntries),
      },
      highRisk: {
        rate: percent(highRiskCount, totalRecords),
        total: totalRecords,
        highRiskCount,
        normalCount: Math.max(totalRecords - highRiskCount, 0),
        reasons: topRiskFactors,
        records: mapToObj(highRiskEntries),
      },
      teenagePregnancy: {
        count: teenageCount,
        total: totalRecords,
        rate: percent(teenageCount, totalRecords),
        records: teenageEntries,
      },
    },
  };
}

export async function fetchStatisticsData({ isAdmin = false, userId } = {}) {
  let query = supabase.from('maternal_records').select('*');
  if (!isAdmin && userId) query = query.eq('created_by', userId);

  const { data, error } = await query;
  if (error) throw error;
  return buildMaternalStatistics(data || []);
}
