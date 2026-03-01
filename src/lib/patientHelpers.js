/** Parse date string (YYYY-MM-DD or ISO) to Date; returns null if invalid. */
function parseVisitDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Get the chronologically latest prenatal visit (by date). Handles unsorted arrays. */
export function getLatestPrenatalVisit(prenatalVisits) {
  if (!Array.isArray(prenatalVisits) || prenatalVisits.length === 0) return null;
  let latest = null;
  let latestTime = -1;
  for (const visit of prenatalVisits) {
    if (!visit || !visit.date) continue;
    const d = parseVisitDate(visit.date);
    if (!d) continue;
    const t = d.getTime();
    if (t > latestTime) {
      latestTime = t;
      latest = visit;
    }
  }
  return latest;
}

/** True if patient has no delivery and (no visits or last visit not in current month/year). */
export function isPatientDue(p) {
  const name = `${p.last_name}, ${p.first_name}`;

  if (p.delivery_date || p.delivery_outcome) {
    console.log(`[DUE-CHECK] ${name}: SKIPPED — has delivery (date: ${p.delivery_date}, outcome: ${p.delivery_outcome})`);
    return false;
  }

  if (!p.lmp) {
    console.log(`[DUE-CHECK] ${name}: SKIPPED — no LMP`);
    return false;
  }

  const today = new Date();
  const currentAOG = getRawWeeksAOG(p.lmp, today.toISOString());
  if (currentAOG === null) {
    console.log(`[DUE-CHECK] ${name}: SKIPPED — could not compute AOG (LMP: ${p.lmp})`);
    return false;
  }

  const lastVisit = getLatestPrenatalVisit(p.prenatal_visits);

  const SCHEDULE = [
    { min: 8, max: 13 },   // Contact 1
    { min: 14, max: 20 },  // Contact 2
    { min: 21, max: 27 },  // Contact 3
    { min: 28, max: 30 },  // Contact 4
    { min: 31, max: 34 },  // Contact 5
    { min: 35, max: 35 },  // Contact 6
    { min: 36, max: 36 },  // Contact 7
    { min: 37, max: 40 }   // Contact 8
  ];

  let targetWindow = SCHEDULE[0]; // default expected for ANC 1

  if (lastVisit && lastVisit.date) {
    const lastVisitAOG = getRawWeeksAOG(p.lmp, lastVisit.date);
    if (lastVisitAOG !== null) {
      // Find the milestone window the last visit fell into
      const currentMilestoneIndex = SCHEDULE.findIndex(w => lastVisitAOG <= w.max);

      if (currentMilestoneIndex !== -1) {
        // Find next expected milestone
        const nextMilestoneIndex = currentMilestoneIndex + 1;
        if (nextMilestoneIndex < SCHEDULE.length) {
          targetWindow = SCHEDULE[nextMilestoneIndex];
        } else {
          // Passed 40 weeks, expect weekly visits or delivery
          targetWindow = { min: lastVisitAOG + 1, max: lastVisitAOG + 1 };
        }
      } else {
        targetWindow = { min: lastVisitAOG + 1, max: lastVisitAOG + 1 };
      }
    }
    console.log(`[DUE-CHECK] ${name}: LMP=${p.lmp}, currentAOG=${currentAOG}wks, lastVisitDate=${lastVisit.date}, lastVisitAOG=${getRawWeeksAOG(p.lmp, lastVisit.date)}wks, targetWindow=${targetWindow.min}-${targetWindow.max}, result=${currentAOG >= targetWindow.min ? 'DUE' : 'NOT DUE'}`);
  } else {
    console.log(`[DUE-CHECK] ${name}: LMP=${p.lmp}, currentAOG=${currentAOG}wks, NO VISITS, targetWindow=${targetWindow.min}-${targetWindow.max}, result=${currentAOG >= targetWindow.min ? 'DUE' : 'NOT DUE'}`);
  }

  // Due / Overdue if current AOG has exactly reached the start of the target window (or gone beyond it)
  // Which correctly flags patients who are in their active recommended visit window as well as those who missed it.
  return currentAOG >= targetWindow.min;
}

/**
 * Get the latest PNC contact date from the flat pnc_date_1..4 fields.
 * @returns {string|null} The latest date string, or null if none.
 */
export function getLatestPncDate(p) {
  const dates = [p.pnc_date_1, p.pnc_date_2, p.pnc_date_3, p.pnc_date_4].filter(Boolean);
  if (dates.length === 0) return null;
  return dates.sort().pop();
}

/**
 * True if patient has a live-birth delivery but is overdue for their next PNC contact.
 *
 * 4PNC schedule (days after delivery_date):
 *   Contact 1 — within 24 hours (≥ 1 day overdue)
 *   Contact 2 — day 3            (≥ 3 days)
 *   Contact 3 — 7–14 days        (≥ 7 days)
 *   Contact 4 — 6 weeks          (≥ 42 days)
 */
export function isPatientPncDue(p) {
  const name = `${p.last_name}, ${p.first_name}`;

  // Must have a delivery date and a live-birth outcome (FT or PT)
  if (!p.delivery_date) {
    console.log(`[PNC-DUE] ${name}: SKIPPED — no delivery date`);
    return false;
  }
  const outcome = p.delivery_outcome;
  if (outcome !== 'FT' && outcome !== 'PT') {
    console.log(`[PNC-DUE] ${name}: SKIPPED — outcome is ${outcome}, not live birth`);
    return false;
  }

  // Count recorded PNC contacts (from flat fields stored in DB)
  const pncDates = [p.pnc_date_1, p.pnc_date_2, p.pnc_date_3, p.pnc_date_4].filter(Boolean);
  const contactsDone = pncDates.length;

  if (contactsDone >= 4) {
    console.log(`[PNC-DUE] ${name}: SKIPPED — 4PNC complete (${contactsDone} contacts)`);
    return false;
  }

  // Calculate days since delivery
  const deliveryDate = new Date(p.delivery_date);
  if (Number.isNaN(deliveryDate.getTime())) {
    console.log(`[PNC-DUE] ${name}: SKIPPED — invalid delivery date`);
    return false;
  }

  const today = new Date();
  const daysSinceDelivery = Math.floor((today - deliveryDate) / (1000 * 60 * 60 * 24));

  // Determine how many contacts should have happened by now
  const PNC_THRESHOLDS = [1, 3, 7, 42]; // days when each contact becomes due
  let expectedContacts = 0;
  for (const threshold of PNC_THRESHOLDS) {
    if (daysSinceDelivery >= threshold) expectedContacts++;
  }

  const isDue = contactsDone < expectedContacts;
  console.log(`[PNC-DUE] ${name}: deliveryDate=${p.delivery_date}, daysSince=${daysSinceDelivery}, contactsDone=${contactsDone}, expected=${expectedContacts}, result=${isDue ? 'DUE' : 'NOT DUE'}`);
  return isDue;
}

export function getAgeGroup(age) {
  if (!age) return '';
  if (age >= 1 && age <= 9) return '1-9 y.o';
  if (age >= 10 && age <= 14) return '10-14 y.o';
  if (age >= 15 && age <= 19) return '15-19 y.o';
  if (age >= 20 && age <= 49) return '20-49 y.o';
  return 'Out of range';
}

export function calculateEDC(lmpDate) {
  if (!lmpDate) return '';
  const date = new Date(lmpDate);
  date.setDate(date.getDate() + 280);
  return date.toISOString().split('T')[0];
}

/** Maximum AOG in weeks (post-term cap per standard practice). */
const MAX_AOG_WEEKS = 43;

export function calculateAOGData(lmp, visitDate) {
  if (!lmp || !visitDate) return { aog: '', trimester: '' };
  const start = new Date(lmp);
  const end = new Date(visitDate);
  if (end - start < 0) return { aog: 'Invalid', trimester: '' };
  const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  let weeks = Math.floor(diffDays / 7);
  const days = diffDays % 7;
  if (weeks > MAX_AOG_WEEKS) {
    weeks = MAX_AOG_WEEKS;
  }
  let trim = '1st Trimester';
  if (weeks > 13) trim = '2nd Trimester';
  if (weeks > 27) trim = '3rd Trimester';
  return { aog: `${weeks} weeks ${days} days`, trimester: trim };
}

/**
 * Gestational age in whole weeks at a given date (from LMP).
 * Used for FHSIS outcome rules: AB < 20w, PT 20–<37w, FT ≥ 37w.
 * @param {string} lmp - Last menstrual period (YYYY-MM-DD)
 * @param {string} date - Date of delivery/termination (YYYY-MM-DD)
 * @returns {number|null} Weeks, or null if invalid/missing
 */
export function getWeeksAOG(lmp, date) {
  if (!lmp || !date) return null;
  const start = new Date(lmp);
  const end = new Date(date);
  if (end - start < 0) return null;
  const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(diffDays / 7);
  return weeks > MAX_AOG_WEEKS ? MAX_AOG_WEEKS : weeks;
}

/**
 * Raw gestational age in whole weeks (no cap). Use for validation (e.g. reject visit date when > 43 weeks).
 * @returns {number|null} Weeks, or null if invalid/missing
 */
export function getRawWeeksAOG(lmp, date) {
  if (!lmp || !date) return null;
  const start = new Date(lmp);
  const end = new Date(date);
  if (end - start < 0) return null;
  const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7);
}

/** Parse "Others: xxx" into { main: 'Others', specify: 'xxx' } */
export function parseOthers(val) {
  if (!val || typeof val !== 'string') return { main: '', specify: '' };
  if (val.startsWith('Others: ')) return { main: 'Others', specify: val.replace('Others: ', '') };
  return { main: val, specify: '' };
}
