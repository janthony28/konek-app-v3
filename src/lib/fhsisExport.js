import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { parseOthers } from './patientHelpers';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Export maternal patients to FHSIS M1 format (aggregated indicators).
 * @param {Array} patients - List of maternal records (typically filtered by report month)
 * @param {{ reportYear?: number, reportMonth?: number, reportBarangay?: string }} options
 */
export async function exportToExcel(patients, options = {}) {
  const { reportYear, reportMonth, reportBarangay } = options;
  const dateLabel = reportYear != null && reportMonth != null ? `${reportYear}-${String(reportMonth).padStart(2, '0')}` : new Date().toISOString().split('T')[0];
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('FHSIS M1');
  const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
  const sectionFill = fill('FF003366');
  const headerFill = fill('FF1F3864');
  const subTitleFill = fill('FFE0E8F0');
  const softBorder = { top: { style: 'thin', color: { argb: 'FFD1D5DB' } }, left: { style: 'thin', color: { argb: 'FFD1D5DB' } }, bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } }, right: { style: 'thin', color: { argb: 'FFD1D5DB' } } };
  const whiteFont = { color: { argb: 'FFFFFFFF' }, bold: true };
  const COL_COUNT = 12;
  sheet.columns = [{ width: 55 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 14 }, { width: 55 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 14 }];

  /* ── data aggregation ───────────────────────────────────────────── */
  const initCounts = () => ({ '10-14': 0, '15-19': 0, '20-49': 0, total: 0 });
  const data = {
    anc8_delivery: initCounts(), bmiNormal: initCounts(), bmiLow: initCounts(), bmiHigh: initCounts(),
    td2plusFirst: initCounts(), td2plusRepeat: initCounts(),
    iron: initCounts(), mms: initCounts(), calcium: initCounts(), deworming: initCounts(),
    anemia_screen: initCounts(), anemia_positive: initCounts(), gd_screen: initCounts(), gd_positive: initCounts(),
    deliveries: initCounts(), liveBirths: initCounts(),
    lb_normal: initCounts(), lb_normal_m: initCounts(), lb_normal_f: initCounts(),
    lb_low_m: initCounts(), lb_low_f: initCounts(), lb_unknown_m: initCounts(), lb_unknown_f: initCounts(),
    attendant_md: initCounts(), attendant_rn: initCounts(), attendant_mw: initCounts(),
    facility_public: initCounts(), facility_private: initCounts(),
    del_vaginal: initCounts(), del_cs: initCounts(), del_cvcd: initCounts(),
    outcome_ft: initCounts(), outcome_pt: initCounts(), outcome_fd: initCounts(), outcome_ab: initCounts(),
    pnc4: initCounts(), postpartum_ifa: initCounts(), vit_a: initCounts(),
    // Resident / Trans-In / Trans-Out breakdowns
    anc8_resident: initCounts(), anc8_transin: initCounts(),
    tracked_resident: initCounts(), tracked_transin: initCounts(), tracked_transout_anc: initCounts(),
    pnc4_resident: initCounts(), pnc4_transin: initCounts(),
    pnc_due_resident: initCounts(), pnc_due_transin: initCounts(), pnc_due_transout: initCounts(),
  };
  function getLab(p) {
    const logs = p.lab_logs || [];
    return {
      cbc_screened: !!logs.find((l) => l.type === 'CBC') || !!p.lab_cbc_result,
      cbc_positive: (logs.find((l) => l.type === 'CBC')?.result === 'With Anemia') || (p.lab_cbc_result === 'With Anemia'),
      gd_screened: !!logs.find((l) => l.type === 'Gestational Diabetes') || !!p.lab_diabetes_result,
      gd_positive: (logs.find((l) => l.type === 'Gestational Diabetes')?.result === 'Positive') || (p.lab_diabetes_result === 'Positive'),
    };
  }
  patients.forEach((p) => {
    try {
      const age = parseInt(p.age || 0, 10);
      let g = '';
      if (age >= 10 && age <= 14) g = '10-14';
      else if (age >= 15 && age <= 19) g = '15-19';
      else if (age >= 20 && age <= 49) g = '20-49';
      if (!g) return;
      const inc = (key) => { if (data[key]) { data[key][g]++; data[key].total++; } };
      // Transfer status helpers
      const isTransIn = p.is_transfer === true && p.transfer_type === 'Trans-In';
      const isTransOut = p.is_transfer === true && p.transfer_type === 'Trans-Out';
      const isResident = !isTransIn && !isTransOut;
      const visits = p.prenatal_visits || [];
      const firstTri = [...visits].reverse().find((v) => v.trimester === '1st Trimester');
      if (firstTri) {
        if (firstTri.bmi_category === 'NORMAL') inc('bmiNormal');
        if (firstTri.bmi_category === 'LOW') inc('bmiLow');
        if (firstTri.bmi_category === 'HIGH') inc('bmiHigh');
      }
      const gravida = parseInt(p.gravida || 0, 10);
      if (gravida === 1 && !!p.td2) inc('td2plusFirst');
      if (gravida >= 2 && !!(p.td3 || p.td4 || p.td5)) inc('td2plusRepeat');
      const totalIFA = (p.supplements_ifa || []).reduce((s, i) => s + (Number(i.count) || 0), 0);
      if (totalIFA >= 180) inc('iron');
      if (p.mms_completed === true || p.mms_completed === 'true' || p.mms_completed === 'Yes') inc('mms');
      if (p.calcium_carbonate_completed === true || p.calcium_carbonate_completed === 'true' || p.calcium_carbonate_completed === 'Yes') inc('calcium');
      if (p.is_deworming_given) inc('deworming');
      const lab = getLab(p);
      if (lab.cbc_screened) inc('anemia_screen');
      if (lab.cbc_positive) inc('anemia_positive');
      if (lab.gd_screened) inc('gd_screen');
      if (lab.gd_positive) inc('gd_positive');
      // 8ANC resident/trans-in/trans-out tracking
      const ancCount = (p.prenatal_visits || []).length;
      if (isResident) inc('tracked_resident');
      if (isTransIn) inc('tracked_transin');
      if (isTransOut) inc('tracked_transout_anc');
      if (p.delivery_date) {
        inc('deliveries');
        if (ancCount >= 8) {
          inc('anc8_delivery');
          if (isResident) inc('anc8_resident');
          if (isTransIn) inc('anc8_transin');
        }
        const isLiveBirth = ['FT', 'PT'].includes(p.delivery_outcome);
        const babies = isLiveBirth && Array.isArray(p.baby_details) && p.baby_details.length > 0 ? p.baby_details : isLiveBirth ? [{ category: p.birth_weight_category || '', sex: p.birth_sex || '', status: 'Live Birth' }] : [];
        const liveBabies = babies.filter((b) => (b.status || 'Live Birth') === 'Live Birth');
        for (let i = 0; i < liveBabies.length; i++) inc('liveBirths');
        liveBabies.forEach((b) => {
          const cat = (b.category === 'Normal' || b.category === 'Low') ? b.category : 'Unknown';
          const sex = b.sex === 'Male' ? 'Male' : (b.sex === 'Female' ? 'Female' : null);
          if (cat === 'Normal') { inc('lb_normal'); if (sex === 'Male') inc('lb_normal_m'); if (sex === 'Female') inc('lb_normal_f'); }
          if (cat === 'Low' && sex === 'Male') inc('lb_low_m');
          if (cat === 'Low' && sex === 'Female') inc('lb_low_f');
          if (cat === 'Unknown' && sex === 'Male') inc('lb_unknown_m');
          if (cat === 'Unknown' && sex === 'Female') inc('lb_unknown_f');
        });
        if (babies.filter((b) => b.status === 'Fetal Death').length > 0 || p.delivery_outcome === 'FD') inc('outcome_fd');
        if (p.delivery_attendant === 'MD') inc('attendant_md');
        if (p.delivery_attendant === 'RN') inc('attendant_rn');
        if (p.delivery_attendant === 'MW') inc('attendant_mw');
        if (p.delivery_facility_type === 'Public') inc('facility_public');
        if (p.delivery_facility_type === 'Private') inc('facility_private');
        if (p.delivery_mode === 'VD') inc('del_vaginal');
        if (p.delivery_mode === 'CS') inc('del_cs');
        if (p.delivery_mode === 'CVCD') inc('del_cvcd');
        if (p.delivery_outcome === 'FT') inc('outcome_ft');
        if (p.delivery_outcome === 'PT') inc('outcome_pt');
        if (p.delivery_outcome === 'AB') inc('outcome_ab');
      }
      const pncDates = [p.pnc_date_1, p.pnc_date_2, p.pnc_date_3, p.pnc_date_4].filter(Boolean).length;
      const pncContacts = Array.isArray(p.pnc_contacts) ? p.pnc_contacts.length : 0;
      const is4Pnc = pncDates >= 4 || pncContacts >= 4 || p.is_4pnc_completed === 'Yes' || p.is_4pnc_completed === 'true' || p.is_4pnc_completed === true;
      if (is4Pnc) {
        inc('pnc4');
        if (isResident) inc('pnc4_resident');
        if (isTransIn) inc('pnc4_transin');
      }
      // PNC due tracking (all patients with a delivery are due for PNC)
      if (p.delivery_date) {
        if (isResident) inc('pnc_due_resident');
        if (isTransIn) inc('pnc_due_transin');
        if (isTransOut) inc('pnc_due_transout');
      }
      if ((p.postpartum_ifa_count || 0) >= 90 || p.is_postpartum_ifa_completed === 'Yes' || p.is_postpartum_ifa_completed === 'true' || p.is_postpartum_ifa_completed === true) inc('postpartum_ifa');
      if (p.vit_a_completed_date || p.is_vit_a_completed === 'Yes' || p.is_vit_a_completed === 'true' || p.is_vit_a_completed === true) inc('vit_a');
    } catch (err) { console.error('Error processing patient for FHSIS:', p, err); }
  });
  // Compute 1b totals (b1 + b2) for both sections
  const sumKeys = (a, b) => { const result = initCounts(); ['10-14', '15-19', '20-49', 'total'].forEach(g => { result[g] = (data[a]?.[g] || 0) + (data[b]?.[g] || 0); }); return result; };
  data.tracked_total = sumKeys('tracked_resident', 'tracked_transin');
  data.pnc_due_total = sumKeys('pnc_due_resident', 'pnc_due_transin');
  const num = (key, g) => { const d = data[key]; if (!d) return ''; const v = g ? d[g] : d.total; return v !== undefined && v !== null ? v : ''; };

  /* ── layout helpers ─────────────────────────────────────────────── */
  let r = 1;
  const styleRow = (row, isBold) => {
    for (let c = 1; c <= COL_COUNT; c++) {
      const cell = row.getCell(c);
      cell.font = { size: 9, ...(isBold ? { bold: true } : {}) };
      cell.border = softBorder;
      cell.alignment = { vertical: 'middle', wrapText: true };
      if ((c >= 2 && c <= 5) || (c >= 8 && c <= 11)) cell.alignment = { ...cell.alignment, horizontal: 'center' };
    }
  };
  const writeSection = (title) => {
    sheet.mergeCells(r, 1, r, COL_COUNT);
    const c = sheet.getCell(r, 1);
    c.value = title; c.fill = sectionFill; c.font = { ...whiteFont, size: 11 }; c.alignment = { horizontal: 'left', vertical: 'middle' };
    sheet.getRow(r).height = 22; r++;
  };
  const writeColHeaders = () => {
    for (let c = 1; c <= COL_COUNT; c++) { const cell = sheet.getCell(r, c); cell.fill = headerFill; cell.font = { ...whiteFont, size: 9 }; cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; cell.border = softBorder; }
    sheet.getCell(r, 1).value = 'Indicators'; sheet.mergeCells(r, 2, r, 4); sheet.getCell(r, 2).value = 'Age Group'; sheet.getCell(r, 5).value = 'TOTAL'; sheet.getCell(r, 6).value = 'Remarks';
    sheet.getCell(r, 7).value = 'Indicators'; sheet.mergeCells(r, 8, r, 10); sheet.getCell(r, 8).value = 'Age Group'; sheet.getCell(r, 11).value = 'TOTAL'; sheet.getCell(r, 12).value = 'Remarks'; r++;
    for (let c = 1; c <= COL_COUNT; c++) { const cell = sheet.getCell(r, c); cell.fill = headerFill; cell.font = { ...whiteFont, size: 9 }; cell.alignment = { horizontal: 'center', vertical: 'middle' }; cell.border = softBorder; cell.value = ''; }
    sheet.getCell(r, 2).value = '10-14'; sheet.getCell(r, 3).value = '15-19'; sheet.getCell(r, 4).value = '20-49';
    sheet.getCell(r, 8).value = '10-14'; sheet.getCell(r, 9).value = '15-19'; sheet.getCell(r, 10).value = '20-49'; r++;
  };
  const setAgeData = (row, startCol, key) => { if (!key) return; row.getCell(startCol).value = num(key, '10-14'); row.getCell(startCol + 1).value = num(key, '15-19'); row.getCell(startCol + 2).value = num(key, '20-49'); row.getCell(startCol + 3).value = num(key, 'total'); };
  const dual = (lLabel, lKey, rLabel, rKey, bold) => { const row = sheet.getRow(r); row.getCell(1).value = lLabel || ''; setAgeData(row, 2, lKey); row.getCell(7).value = rLabel || ''; setAgeData(row, 8, rKey); styleRow(row, bold); r++; };

  /* ── Title banner ───────────────────────────────────────────────── */
  const monthLabel = reportYear != null && reportMonth >= 1 && reportMonth <= 12 ? `${MONTH_NAMES[reportMonth - 1]} ${reportYear}` : new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  const barangayLabel = reportBarangay && String(reportBarangay).trim() ? reportBarangay : 'All';
  sheet.mergeCells(1, 1, 1, COL_COUNT); const titleCell = sheet.getCell(1, 1); titleCell.value = 'FHSIS M1 — MATERNAL CARE REPORT'; titleCell.fill = sectionFill; titleCell.font = { ...whiteFont, size: 14 }; titleCell.alignment = { horizontal: 'center', vertical: 'middle' }; sheet.getRow(1).height = 32;
  sheet.mergeCells(2, 1, 2, COL_COUNT); const subCell = sheet.getCell(2, 1); subCell.value = `${monthLabel}   |   Batangas City   |   Barangay: ${barangayLabel}`; subCell.fill = subTitleFill; subCell.font = { bold: true, size: 10, color: { argb: 'FF003366' } }; subCell.alignment = { horizontal: 'center', vertical: 'middle' }; sheet.getRow(2).height = 22;
  sheet.mergeCells(3, 1, 3, COL_COUNT); const genCell = sheet.getCell(3, 1); genCell.value = `Generated: ${new Date().toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' })}`; genCell.font = { color: { argb: 'FF6B7280' }, italic: true, size: 9 }; genCell.alignment = { horizontal: 'center', vertical: 'middle' }; sheet.getRow(3).height = 18;
  sheet.getRow(4).height = 6; r = 5;

  /* ═══ SECTION 1 — PRENATAL CARE SERVICES ═══ */
  writeSection('PRENATAL CARE SERVICES');
  writeColHeaders();
  dual('1. 8ANC', null, '4. Prenatal Supplementation', null, true);
  dual('1a. No. of Women who delivered and completed at least 8ANC =(a1+a2)', 'anc8_delivery', '4a. Number of pregnant women who completed the dose of Iron with Folic Acid supplementation', 'iron');
  dual('   a1. No. of Women who delivered and provided 1st to 8th ANC on schedule (Resident)', 'anc8_resident', '4b. No. of pregnant women who completed the dose Multiple Micronutrient Supplementation', 'mms');
  dual('   a2. No. of Women who delivered and completed at least 8ANC / TRANS-IN from other LGUs', 'anc8_transin', '4c. No. of pregnant women who completed this dose of Calcium carbonate', 'calcium');
  dual('1b. No. of Women who delivered and who were tracked during pregnancy =(b1+b2)', 'tracked_total', '', null);
  dual('   b1. No. of Women who delivered and who were tracked during pregnancy (Resident)', 'tracked_resident', '5. Anemia Screening', null, false);
  dual('   b2. No. of TRANS-IN from other LGUs', 'tracked_transin', '5a. No. of pregnant women screened for Anemia', 'anemia_screen');
  dual('   b3. No. of TRANS-OUT (with MOV) before completing 8ANC', 'tracked_transout_anc', '5b. No. of pregnant women diagnosed with Anemia', 'anemia_positive');
  dual('', null, '6. Gestational Diabetes Screening', null, false);
  dual('2. No. of pregnant women assessed for nutritional status during the first trimester', null, '6a. No. of pregnant women screened for Gestational Diabetes Mellitus', 'gd_screen');
  dual('2a. Normal BMI', 'bmiNormal', '6b. No. of pregnant women tested positive for Gestational Diabetes Mellitus', 'gd_positive');
  dual('2b. Low BMI', 'bmiLow', '', null);
  dual('2c. High BMI', 'bmiHigh', '7. Deworming', null, false);
  dual('', null, '7a. No. of pregnant women given one dose of deworming tablet', 'deworming');
  // Sub-section: Td Vaccination (left) + BP Measurement (right)
  writeColHeaders();
  dual('3. Tetanus diphtheria (Td) Containing Vaccination Status', null, '8. BP measurement', null, true);
  dual('3a. Number of women pregnant for the first time given at least 2 doses of Tetanus diphtheria (Td) vaccination', 'td2plusFirst', '8a. No. of pregnant women who had their BP measured during each of their antenatal care visit', null);
  dual('3b. Number of Pregnant Women for the 2nd or more times given at least 3 doses of Td vaccination (Td2 Plus)', 'td2plusRepeat', '8b. 1. No. of pregnant women identified with high BP or danger signs', null);
  dual('', null, '8b. 2. No. of pregnant women with high BP or danger signs who were referred to a higher-level facility', null);

  /* ═══ SECTION 2 — INTRAPARTUM AND NEWBORN CARE ═══ */
  writeSection('INTRAPARTUM AND NEWBORN CARE');
  writeColHeaders();
  dual('1. Total Deliveries', 'deliveries', '5. Delivery by Outcome =(5a+5b+5c)', null, true);
  dual('2. No. of deliveries attended by Skilled Health Professionals (SHP) =(2a+2b+2c)', null, '5a. No. of Full-Term deliveries', 'outcome_ft');
  dual('   2a. Physicians', 'attendant_md', '5b. No. of Pre-Term deliveries', 'outcome_pt');
  dual('   2b. Nurses', 'attendant_rn', '5c. No. of Fetal deaths', 'outcome_fd');
  dual('   2c. Midwives', 'attendant_mw', '5d. No. of abortions/miscarriage (counts only)', 'outcome_ab');
  dual('3. No. of Facility Based Deliveries (FBD) =(3a+3b)', null, '', null, true);
  dual('   3a. Public facility', 'facility_public', '', null);
  dual('   3b. Private facility', 'facility_private', '', null);
  dual('4. Delivery by Type =(4a+4b+4c)', null, '', null, true);
  dual('   4a. No. of Vaginal deliveries', 'del_vaginal', '', null);
  dual('   4b. No. of Cesarean Section', 'del_cs', '', null);
  dual('   4c. No. of Combined Vaginal-Cesarean deliveries', 'del_cvcd', '', null);
  // Livebirths sub-section with Male/Female columns on right side
  {
    const hr = sheet.getRow(r);
    for (let c = 1; c <= 6; c++) { hr.getCell(c).value = ''; hr.getCell(c).fill = headerFill; hr.getCell(c).border = softBorder; }
    [{ c: 7, v: 'Indicators' }, { c: 8, v: '' }, { c: 9, v: 'Male' }, { c: 10, v: 'Female' }, { c: 11, v: 'TOTAL' }, { c: 12, v: 'Remarks' }].forEach(({ c, v }) => {
      hr.getCell(c).value = v; hr.getCell(c).fill = headerFill; hr.getCell(c).font = { ...whiteFont, size: 9 }; hr.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' }; hr.getCell(c).border = softBorder;
    });
    r++;
    const lbRow = (label, mKey, fKey) => {
      const row = sheet.getRow(r);
      for (let c = 1; c <= 6; c++) { row.getCell(c).value = ''; row.getCell(c).border = softBorder; }
      row.getCell(7).value = label; row.getCell(8).value = '';
      row.getCell(9).value = mKey ? (data[mKey]?.total ?? 0) : '';
      row.getCell(10).value = fKey ? (data[fKey]?.total ?? 0) : '';
      row.getCell(11).value = (mKey && fKey) ? (data[mKey]?.total ?? 0) + (data[fKey]?.total ?? 0) : '';
      row.getCell(12).value = ''; styleRow(row); r++;
    };
    const rh = sheet.getRow(r);
    for (let c = 1; c <= 6; c++) { rh.getCell(c).value = ''; rh.getCell(c).border = softBorder; }
    rh.getCell(7).value = '6. No. of Livebirths by birth weight =(6a+6b+6c)';
    for (let c = 8; c <= 12; c++) { rh.getCell(c).value = ''; rh.getCell(c).border = softBorder; }
    styleRow(rh, true); r++;
    lbRow('6a. Normal birth weight', 'lb_normal_m', 'lb_normal_f');
    lbRow('6b. Low birth weight', 'lb_low_m', 'lb_low_f');
    lbRow('6c. Unknown birth weight', 'lb_unknown_m', 'lb_unknown_f');
  }

  /* ═══ SECTION 3 — POSTPARTUM CARE ═══ */
  writeSection('POSTPARTUM CARE');
  writeColHeaders();
  dual('1. 4PNC', null, '2. Postpartum Supplementation', null, true);
  dual('1a. Total No. of women who delivered and completed at least 4PNC =(a1+a2)', 'pnc4', '2a. Number of postpartum women who completed the dose of Iron with Folic Acid Supplementation', 'postpartum_ifa');
  dual('   a1. No. of women who delivered and provided 1st to 4th PNC on schedule (Resident)', 'pnc4_resident', '2b. Number of postpartum women who completed the dose of Vitamin A supplementation', 'vit_a');
  dual('   a2. No. of women delivered and completed at least 4PNC / TRANS-IN from other LGUs', 'pnc4_transin', '', null);
  dual('1b. Total No. of women due for PNC =(b1+b2)', 'pnc_due_total', '3. BP measurement', null, true);
  dual('   b1. No. of women due for PNC (Resident)', 'pnc_due_resident', '3a. No. of postpartum women who had their BP measured during each of their antenatal care visit', null);
  dual('   b2. No. of TRANS-IN from other LGUs due for PNC', 'pnc_due_transin', '3b. No. of postpartum women with high BP or danger signs who were referred to a higher-level facility', null);
  dual('   b3. No. of TRANS-OUT (with MOV) before completing 4PNC', 'pnc_due_transout', '', null);

  sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `FHSIS_Maternal_Report_${dateLabel}.xlsx`);
}

/**
 * Export Maternal Target Client List (TCL) as a professionally styled Excel workbook.
 *
 * Features:
 * - Title banner with report period and generation timestamp
 * - Color-coded grouped column headers (10 section groups)
 * - Alternating row fills (zebra stripes) for readability
 * - Freeze panes (title/header rows + name column)
 * - Auto-filter on the column header row
 * - Landscape print settings with repeated header rows
 *
 * @param {Array} patients - List of maternal records
 * @param {{ reportYear?: number, reportMonth?: number, reportBarangay?: string }} options
 */
export async function exportMaternalTcl(patients, options = {}) {
  const { reportYear, reportMonth, reportBarangay } = options;
  const dateLabel =
    reportYear != null && reportMonth != null
      ? `${reportYear}-${String(reportMonth).padStart(2, '0')}`
      : new Date().toISOString().split('T')[0];

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Maternal TCL');

  /* ── colour palette ─────────────────────────────────────────────── */
  const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

  // Title / banner
  const tealDark = fill('FF0D9488');
  const tealLight = fill('FFE6FAF8');

  // Group header fills (row 5 – darker) & column header fills (row 6 – lighter tint)
  const groups = {
    patient: { dark: fill('FF475569'), light: fill('FFE2E8F0'), label: 'Patient Information' },
    demo: { dark: fill('FF7E22CE'), light: fill('FFF3E8FF'), label: 'Demographics' },
    pregnancy: { dark: fill('FFDB2777'), light: fill('FFFCE7F3'), label: 'Pregnancy Details' },
    anc: { dark: fill('FFD97706'), light: fill('FFFFFBEB'), label: 'Prenatal Visits (ANC)' },
    nutrition: { dark: fill('FFEA580C'), light: fill('FFFFF7ED'), label: 'Nutritional Status' },
    immun: { dark: fill('FF0891B2'), light: fill('FFECFEFF'), label: 'Immunization (Td)' },
    deworm: { dark: fill('FF65A30D'), light: fill('FFF7FEE7'), label: 'Deworming' },
    lab: { dark: fill('FF4338CA'), light: fill('FFEEF2FF'), label: 'Laboratory Screening' },
    delivery: { dark: fill('FFE11D48'), light: fill('FFFFF1F2'), label: 'Delivery Information' },
    postpartum: { dark: fill('FF059669'), light: fill('FFECFDF5'), label: 'Postpartum Care' },
  };

  const whiteFont = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
  const whiteFontSm = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };
  const dimFont = { color: { argb: 'FF6B7280' }, italic: true, size: 9 };
  const headerFont = { bold: true, size: 9 };
  const dataFont = { size: 9 };
  const zebraFill = fill('FFF9FAFB');

  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  };

  /* ── column definitions ─────────────────────────────────────────── */
  // Each entry: { header, key, width, group }
  const COL_DEFS = [
    // Patient Information (1-6)
    { header: 'No.', key: 'no', width: 6, group: 'patient' },
    { header: 'Date of Registration\n(mm/dd/yy)', key: 'dateReg', width: 18, group: 'patient' },
    { header: 'Full Name\n(Last, First, MI)', key: 'fullName', width: 30, group: 'patient' },
    { header: 'Complete Address', key: 'address', width: 30, group: 'patient' },
    { header: 'Contact No.', key: 'contactNo', width: 16, group: 'patient' },
    { header: 'Email', key: 'email', width: 24, group: 'patient' },
    // Demographics (7-13)
    { header: 'Age (years)', key: 'age', width: 9, group: 'demo' },
    { header: 'Age Group\nA=10-14, B=15-19,\nC=20-49 y.o.', key: 'ageGroup', width: 14, group: 'demo' },
    { header: 'Civil Status', key: 'civilStatus', width: 14, group: 'demo' },
    { header: 'Solo Parent\n1=Yes, 0=No', key: 'soloParent', width: 12, group: 'demo' },
    { header: '4Ps Member\n1=Yes, 0=No', key: 'fourPsMember', width: 12, group: 'demo' },
    { header: 'PhilHealth Member\nM=Member,\nD=Dependent,\nN=Not a member', key: 'philhealthMember', width: 18, group: 'demo' },
    { header: 'SSS Member\n1=Yes, 0=No', key: 'sssMember', width: 12, group: 'demo' },
    { header: 'GSIS Member\n1=Yes, 0=No', key: 'gsisMember', width: 12, group: 'demo' },
    // Pregnancy Details (14-17)
    { header: 'LMP\n(mm/dd/yy)', key: 'lmp', width: 13, group: 'pregnancy' },
    { header: 'Gravida', key: 'gravida', width: 8, group: 'pregnancy' },
    { header: 'Parity', key: 'parity', width: 8, group: 'pregnancy' },
    { header: 'EDD\n(mm/dd/yy)', key: 'edd', width: 13, group: 'pregnancy' },
    // ANC Visits (18-25)
    { header: 'ANC 1', key: 'anc1', width: 12, group: 'anc' },
    { header: 'ANC 2', key: 'anc2', width: 12, group: 'anc' },
    { header: 'ANC 3', key: 'anc3', width: 12, group: 'anc' },
    { header: 'ANC 4', key: 'anc4', width: 12, group: 'anc' },
    { header: 'ANC 5', key: 'anc5', width: 12, group: 'anc' },
    { header: 'ANC 6', key: 'anc6', width: 12, group: 'anc' },
    { header: 'ANC 7', key: 'anc7', width: 12, group: 'anc' },
    { header: 'ANC 8', key: 'anc8', width: 12, group: 'anc' },
    // Nutritional Status (26-27)
    { header: 'BMI\n(1st Trimester)', key: 'bmi1', width: 14, group: 'nutrition' },
    { header: 'BMI Category\n(1st Trimester)\nLow <18.5,\nNormal 18.5-22.9,\nHigh ≥23', key: 'bmiCat1', width: 18, group: 'nutrition' },
    // Immunization (28-32)
    { header: 'Td1', key: 'td1', width: 11, group: 'immun' },
    { header: 'Td2', key: 'td2', width: 11, group: 'immun' },
    { header: 'Td3', key: 'td3', width: 11, group: 'immun' },
    { header: 'Td4', key: 'td4', width: 11, group: 'immun' },
    { header: 'Td5', key: 'td5', width: 11, group: 'immun' },
    // Deworming (33-34)
    { header: 'Deworming Given?\n1=Yes, 0=No', key: 'dewormingGiven', width: 14, group: 'deworm' },
    { header: 'Deworming Date', key: 'dewormingDate', width: 14, group: 'deworm' },
    // Laboratory Screening (35-44)
    { header: 'Syphilis\nScreen Date', key: 'syphilisDate', width: 14, group: 'lab' },
    { header: 'Syphilis Result\n1=pos, 0=neg', key: 'syphilisResult', width: 14, group: 'lab' },
    { header: 'HIV\nScreen Date', key: 'hivDate', width: 14, group: 'lab' },
    { header: 'HIV Result\n1=reactive, 0=neg', key: 'hivResult', width: 16, group: 'lab' },
    { header: 'Hep B\nScreen Date', key: 'hepbDate', width: 14, group: 'lab' },
    { header: 'Hep B Result\n1=reactive, 0=neg', key: 'hepbResult', width: 16, group: 'lab' },
    { header: 'CBC Date', key: 'cbcDate', width: 14, group: 'lab' },
    { header: 'CBC Result\n1=with anemia,\n0=without', key: 'cbcResult', width: 16, group: 'lab' },
    { header: 'CBC Hemoglobin\n(g/dL)', key: 'cbcHemoglobin', width: 16, group: 'lab' },
    { header: 'GDM\nScreen Date', key: 'gdmDate', width: 14, group: 'lab' },
    { header: 'GDM Result\n1=pos, 0=neg', key: 'gdmResult', width: 14, group: 'lab' },
    { header: 'Urinalysis\nScreen Date', key: 'urinalysisDate', width: 14, group: 'lab' },
    { header: 'Urinalysis Result\n1=with UTI,\n0=no UTI', key: 'urinalysisResult', width: 16, group: 'lab' },
    { header: 'Urinalysis\nRemarks', key: 'urinalysisRemarks', width: 20, group: 'lab' },
    // Delivery Information (45-58)
    { header: 'Date Terminated\n(mm/dd/yy)', key: 'deliveryDate', width: 16, group: 'delivery' },
    { header: 'Outcome\nFT=Full term,\nPT=Pre-term,\nFD=Fetal death,\nAB=Abortion', key: 'deliveryOutcome', width: 18, group: 'delivery' },
    { header: 'Delivery Type\nCS=Cesarean,\nVD=Vaginal', key: 'deliveryMode', width: 16, group: 'delivery' },
    { header: 'Birth Weight\n(grams, Baby 1)', key: 'birthWeight', width: 16, group: 'delivery' },
    { header: 'Birth Wt. Category\nA=Normal,\nB=Low, C=Unknown', key: 'birthWeightCat', width: 18, group: 'delivery' },
    { header: 'Sex of Baby 1\n(M/F)', key: 'birthSex', width: 12, group: 'delivery' },
    { header: 'Place of Delivery\n(health facility)', key: 'deliveryPlace', width: 22, group: 'delivery' },
    { header: 'Lying In\nClinic Name', key: 'lyingInClinicName', width: 22, group: 'delivery' },
    { header: 'Facility Type\n(Public/Private)', key: 'facilityType', width: 16, group: 'delivery' },
    { header: 'BEmONC/CEmONC\nCapable?\n(Yes/No)', key: 'facilityCapable', width: 16, group: 'delivery' },
    { header: 'Non-Health Facility\n(Home/Others)', key: 'nonHealthFacility', width: 20, group: 'delivery' },
    { header: 'Non-Health Facility\nPlace (specify)', key: 'nonHealthPlace', width: 20, group: 'delivery' },
    { header: 'Place of Birth', key: 'placeOfBirth', width: 22, group: 'delivery' },
    { header: 'Place of Birth\n(specify)', key: 'placeOfBirthSpecify', width: 22, group: 'delivery' },
    { header: 'Birth Attendant\n(MD/RN/MW/Others)', key: 'attendant', width: 20, group: 'delivery' },
    { header: 'Birth Attendant\n(specify, if Others)', key: 'attendantSpecify', width: 20, group: 'delivery' },
    { header: 'Time of Delivery', key: 'deliveryTime', width: 14, group: 'delivery' },
    // Postpartum Care (59-66)
    { header: 'PNC 1', key: 'pnc1', width: 12, group: 'postpartum' },
    { header: 'PNC 2', key: 'pnc2', width: 12, group: 'postpartum' },
    { header: 'PNC 3', key: 'pnc3', width: 12, group: 'postpartum' },
    { header: 'PNC 4', key: 'pnc4', width: 12, group: 'postpartum' },
    { header: 'Completed 4PNC?\n1=Yes, 0=No', key: 'pncCompleted', width: 14, group: 'postpartum' },
    { header: 'Postpartum IFA\nTotal Tabs', key: 'ppIfaCount', width: 16, group: 'postpartum' },
    { header: 'Postpartum IFA\nCompleted Date', key: 'ppIfaDate', width: 18, group: 'postpartum' },
    { header: 'Vitamin A\nCompleted Date', key: 'vitADate', width: 18, group: 'postpartum' },
  ];

  const totalCols = COL_DEFS.length;

  // Apply column widths (no header values yet; we build rows manually)
  sheet.columns = COL_DEFS.map((c) => ({ key: c.key, width: c.width }));

  /* ── Row 1: Title banner ───────────────────────────────────────── */
  const monthLabel =
    reportYear != null && reportMonth >= 1 && reportMonth <= 12
      ? `${MONTH_NAMES[reportMonth - 1]} ${reportYear}`
      : new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  const barangayLabel = reportBarangay && String(reportBarangay).trim() ? reportBarangay : 'All';

  sheet.mergeCells(1, 1, 1, totalCols);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = 'MATERNAL TARGET CLIENT LIST';
  titleCell.fill = tealDark;
  titleCell.font = { ...whiteFont, size: 14 };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 32;

  /* ── Row 2: Subtitle (period + barangay) ───────────────────────── */
  sheet.mergeCells(2, 1, 2, totalCols);
  const subCell = sheet.getCell(2, 1);
  subCell.value = `Report Period: ${monthLabel}   |   Barangay: ${barangayLabel}`;
  subCell.fill = tealLight;
  subCell.font = { bold: true, size: 10, color: { argb: 'FF0D9488' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 22;

  /* ── Row 3: Generated timestamp ────────────────────────────────── */
  sheet.mergeCells(3, 1, 3, totalCols);
  const genCell = sheet.getCell(3, 1);
  genCell.value = `Generated: ${new Date().toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' })}`;
  genCell.font = dimFont;
  genCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(3).height = 18;

  /* ── Row 4: Spacer ─────────────────────────────────────────────── */
  sheet.getRow(4).height = 6;

  /* ── Row 5: Group headers (merged, coloured) ───────────────────── */
  // Compute contiguous group spans
  const groupSpans = [];
  let spanStart = 0;
  for (let i = 0; i < COL_DEFS.length; i++) {
    if (i === 0 || COL_DEFS[i].group !== COL_DEFS[i - 1].group) {
      if (i > 0) groupSpans[groupSpans.length - 1].end = i; // exclusive
      groupSpans.push({ group: COL_DEFS[i].group, start: i });
    }
  }
  groupSpans[groupSpans.length - 1].end = COL_DEFS.length;

  const groupRow = sheet.getRow(5);
  groupRow.height = 22;
  groupSpans.forEach(({ group, start, end }) => {
    const colStart = start + 1; // 1-indexed
    const colEnd = end;         // 1-indexed (inclusive)
    if (colEnd > colStart) sheet.mergeCells(5, colStart, 5, colEnd);
    const cell = sheet.getCell(5, colStart);
    cell.value = groups[group].label;
    cell.fill = groups[group].dark;
    cell.font = whiteFontSm;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  });

  /* ── Row 6: Individual column headers ──────────────────────────── */
  const hdrRow = sheet.getRow(6);
  hdrRow.height = 64;
  COL_DEFS.forEach((col, i) => {
    const cell = hdrRow.getCell(i + 1);
    cell.value = col.header;
    cell.fill = groups[col.group].light;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });

  /* ── Data rows ─────────────────────────────────────────────────── */
  const getAgeGroup = (age) => {
    if (age >= 10 && age <= 14) return 'A';
    if (age >= 15 && age <= 19) return 'B';
    if (age >= 20 && age <= 49) return 'C';
    return '';
  };

  const getLabEntry = (logs, type) => {
    if (!Array.isArray(logs)) return null;
    return logs.find((l) => l && l.type === type) || null;
  };

  const DATA_START_ROW = 7;

  (patients || []).forEach((p, idx) => {
    const ageNum = Number(p.age || 0);

    const baseName = [p.last_name, p.first_name].filter(Boolean).join(', ');
    const middle = p.middle_name || p.middle_initial || '';
    const fullName = middle ? `${baseName} ${middle}` : baseName;
    const address = [p.address, p.sitio, p.barangay, p.city_municipality, p.province].filter(Boolean).join(', ');

    // Helper to uppercase string values for report consistency
    const up = (v) => (typeof v === 'string' ? v.toUpperCase() : (v ?? ''));

    const visits = Array.isArray(p.prenatal_visits) ? [...p.prenatal_visits] : [];
    visits.sort((a, b) => String(a?.date || '').localeCompare(String(b?.date || '')));
    const visitDates = visits.map((v) => v?.date || '');
    const firstTrimesterVisits = visits.filter((v) => v?.trimester === '1st Trimester');
    const firstTrimesterVisit = firstTrimesterVisits.length ? firstTrimesterVisits[firstTrimesterVisits.length - 1] : {};

    const labLogs = p.lab_logs || [];
    const syphilis = getLabEntry(labLogs, 'Syphilis');
    const hiv = getLabEntry(labLogs, 'HIV');
    const hepb = getLabEntry(labLogs, 'Hep B');
    const cbc = getLabEntry(labLogs, 'CBC');
    const gdm = getLabEntry(labLogs, 'Gestational Diabetes');
    const urinalysis = getLabEntry(labLogs, 'Urinalysis');

    const isSyphilisPos = syphilis?.result === 'Positive' || p.lab_syphilis_result === 'Reactive';
    const isHivPos = hiv?.result === 'Positive' || p.lab_hiv_result === 'Reactive';
    const isHepbPos = hepb?.result === 'Positive' || p.lab_hepb_result === 'Reactive';
    const isCbcAnemia = cbc?.result === 'With Anemia' || p.lab_cbc_result === 'With Anemia';
    const isGdmPos = gdm?.result === 'Positive' || p.lab_diabetes_result === 'Positive';
    const isUrinalysisUti = urinalysis?.result === 'With UTI';

    const is4PncCompleted = p.is_4pnc_completed === 'Yes' || p.is_4pnc_completed === true || p.is_4pnc_completed === 'true';

    const babyDetails = Array.isArray(p.baby_details) && p.baby_details.length > 0 ? p.baby_details : [];
    const firstBaby = babyDetails[0] || {};

    const rowValues = {
      no: idx + 1,
      dateReg: p.date_of_registration || p.date_registered || '',
      fullName: up(fullName),
      address: up(address),
      contactNo: p.contact_no || '',
      email: p.email_address || '',
      age: Number.isNaN(ageNum) ? '' : ageNum,
      ageGroup: getAgeGroup(ageNum),
      civilStatus: p.civil_status || '',
      soloParent: p.is_solo_parent === true ? 1 : (p.is_solo_parent === false ? 0 : ''),
      fourPsMember: p.is_4ps_member === true ? 1 : (p.is_4ps_member === false ? 0 : ''),
      philhealthMember: (() => {
        const s = String(p.philhealth_status || '').trim();
        if (s === 'Member') return 'M';
        if (s === 'Dependent') return 'D';
        if (s === 'Not a member') return 'N';
        return '';
      })(),
      sssMember: p.sss_member === true ? 1 : (p.sss_member === false ? 0 : ''),
      gsisMember: p.gsis_member === true ? 1 : (p.gsis_member === false ? 0 : ''),
      lmp: p.lmp || '',
      gravida: p.gravida || '',
      parity: (p.parity === 0 || p.parity === '0') ? 0 : (p.parity ?? ''),
      edd: p.edc || p.edd || '',
      anc1: visitDates[0] || '', anc2: visitDates[1] || '', anc3: visitDates[2] || '', anc4: visitDates[3] || '',
      anc5: visitDates[4] || '', anc6: visitDates[5] || '', anc7: visitDates[6] || '', anc8: visitDates[7] || '',
      bmi1: firstTrimesterVisit.bmi || '',
      bmiCat1: firstTrimesterVisit.bmi_category || '',
      td1: p.td1 || '', td2: p.td2 || '', td3: p.td3 || '', td4: p.td4 || '', td5: p.td5 || '',
      dewormingGiven: p.is_deworming_given ? 1 : 0,
      dewormingDate: p.deworming_date || '',
      syphilisDate: syphilis?.date || '',
      syphilisResult: isSyphilisPos ? 1 : (syphilis ? 0 : ''),
      hivDate: hiv?.date || '',
      hivResult: isHivPos ? 1 : (hiv ? 0 : ''),
      hepbDate: hepb?.date || '',
      hepbResult: isHepbPos ? 1 : (hepb ? 0 : ''),
      cbcDate: cbc?.date || '',
      cbcResult: isCbcAnemia ? 1 : (cbc ? 0 : ''),
      cbcHemoglobin: cbc?.hemoglobin || '',
      gdmDate: gdm?.date || '',
      gdmResult: isGdmPos ? 1 : (gdm ? 0 : ''),
      urinalysisDate: urinalysis?.date || '',
      urinalysisResult: isUrinalysisUti ? 1 : (urinalysis ? 0 : ''),
      urinalysisRemarks: up(urinalysis?.remarks || ''),
      deliveryDate: firstBaby.delivery_date || p.delivery_date || '',
      deliveryOutcome: p.delivery_outcome || '',
      deliveryMode: p.delivery_mode || '',
      birthWeight: firstBaby.weight || p.birth_weight || '',
      birthWeightCat: firstBaby.category || p.birth_weight_category || '',
      birthSex: (firstBaby.sex || p.birth_sex || '').startsWith('M') ? 'M' : (firstBaby.sex || p.birth_sex || '').startsWith('F') ? 'F' : '',
      deliveryPlace: p.delivery_place || '',
      lyingInClinicName: up(p.lying_in_clinic_name || ''),
      facilityType: p.delivery_facility_type || '',
      facilityCapable: p.delivery_place_capable || '',
      nonHealthFacility: p.delivery_non_health_facility === 'Others' ? 'Others' : (p.delivery_non_health_facility || ''),
      nonHealthPlace: up(p.delivery_non_health_place || ''),
      placeOfBirth: p.place_of_birth || '',
      placeOfBirthSpecify: up(p.place_of_birth_specify || ''),
      attendant: (() => { const parsed = parseOthers(p.delivery_attendant); return parsed.main || ''; })(),
      attendantSpecify: up((() => { const parsed = parseOthers(p.delivery_attendant); return parsed.specify || ''; })()),
      deliveryTime: firstBaby.delivery_time || p.delivery_time || '',
      pnc1: p.pnc_date_1 || '', pnc2: p.pnc_date_2 || '', pnc3: p.pnc_date_3 || '', pnc4: p.pnc_date_4 || '',
      pncCompleted: is4PncCompleted ? 1 : 0,
      ppIfaCount: p.postpartum_ifa_count || 0,
      ppIfaDate: p.postpartum_ifa_completed_date || '',
      vitADate: p.vit_a_completed_date || '',
    };

    // Build an array of cell values in column order
    const row = sheet.addRow(COL_DEFS.map((c) => rowValues[c.key] ?? ''));
    const rowNum = row.number;
    const isEven = idx % 2 === 1;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = dataFont;
      cell.border = thinBorder;
      cell.alignment = { vertical: 'middle', wrapText: true, horizontal: 'center' };
      if (isEven) cell.fill = zebraFill;
    });

    // Left-align text-heavy columns: fullName (3), address (4)
    const leftAlignCols = [3, 4];
    leftAlignCols.forEach((c) => {
      const cell = row.getCell(c);
      cell.alignment = { ...cell.alignment, horizontal: 'left' };
    });
  });

  /* ── Freeze panes ──────────────────────────────────────────────── */
  // Freeze first 6 rows (title + headers) and first 3 columns (No., Date, Name)
  sheet.views = [{ state: 'frozen', xSplit: 3, ySplit: 6, topLeftCell: 'D7', activeCell: 'D7' }];

  /* ── Auto-filter on the column header row (row 6) ──────────────── */
  sheet.autoFilter = {
    from: { row: 6, column: 1 },
    to: { row: 6, column: totalCols },
  };

  /* ── Print settings ────────────────────────────────────────────── */
  sheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9, // A4
    printTitlesRow: '5:6',
  };

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Maternal_TCL_${dateLabel}.xlsx`);
}
