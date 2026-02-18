import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { parseOthers } from './patientHelpers';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Export maternal patients to FHSIS M1 format (aggregated indicators).
 * @param {Array} patients - List of maternal records (typically filtered by report month)
 * @param {{ reportYear?: number, reportMonth?: number, reportBarangay?: string }} options - Optional report period and barangay for header/filename
 */
export async function exportToExcel(patients, options = {}) {
  const { reportYear, reportMonth, reportBarangay } = options;
  const dateLabel =
    reportYear != null && reportMonth != null
      ? `${reportYear}-${String(reportMonth).padStart(2, '0')}`
      : new Date().toISOString().split('T')[0];
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('FHSIS M1');

  /* ── colour palette ─────────────────────────────────────────────── */
  const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

  const greenDark = fill('FF22C55E');   // section headers
  const greenLight = fill('FFF0FDF4');   // section header tint (title row 2)
  const slateDark = fill('FF334155');   // table column headers
  const zebraFill = fill('FFF9FAFB');   // alternating data rows

  const softBorder = {
    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  };

  const whiteFont = { color: { argb: 'FFFFFFFF' }, bold: true };
  const styles = {
    sectionHeader: { fill: greenDark, font: { ...whiteFont, size: 11 }, alignment: { horizontal: 'center', vertical: 'middle' } },
    tableHeader: { fill: slateDark, font: { ...whiteFont, size: 10 }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true } },
    normalCell: { font: { size: 10 }, border: softBorder, alignment: { vertical: 'middle', wrapText: true } },
    centeredCell: { font: { size: 10 }, border: softBorder, alignment: { horizontal: 'center', vertical: 'middle' } },
  };

  const colCount = 21;
  sheet.columns = Array.from({ length: colCount }, () => ({ width: 10 }));
  sheet.getColumn(1).width = 50;
  sheet.getColumn(2).width = 14;
  sheet.getColumn(3).width = 14;
  sheet.getColumn(8).width = 50;
  sheet.getColumn(14).width = 50;

  const initCounts = () => ({ '10-14': 0, '15-19': 0, '20-49': 0, total: 0 });
  const data = {
    visits4: initCounts(), bmiNormal: initCounts(), bmiLow: initCounts(), bmiHigh: initCounts(),
    td2plusFirst: initCounts(), td2plusRepeat: initCounts(), iron: initCounts(), calcium: initCounts(),
    deworming: initCounts(), syphilis_screen: initCounts(), syphilis_positive: initCounts(),
    hepB_screen: initCounts(), hepB_positive: initCounts(), hiv_screen: initCounts(),
    anemia_screen: initCounts(), anemia_positive: initCounts(), gd_screen: initCounts(), gd_positive: initCounts(),
    deliveries: initCounts(), liveBirths: initCounts(),
    lb_normal: initCounts(), lb_low_m: initCounts(), lb_low_f: initCounts(), lb_unknown_m: initCounts(), lb_unknown_f: initCounts(),
    attendant_md: initCounts(), attendant_rn: initCounts(), attendant_mw: initCounts(),
    facility_public: initCounts(), facility_private: initCounts(), non_facility: initCounts(),
    del_vaginal: initCounts(), del_cs: initCounts(),
    outcome_ft: initCounts(), outcome_pt: initCounts(), outcome_fd: initCounts(), outcome_ab: initCounts(),
    pnc2: initCounts(), pnc4: initCounts(), postpartum_ifa: initCounts(), vit_a: initCounts(), hypertension: initCounts(),
    anc4_delivery: initCounts(), anc1st_tri: initCounts(), first_birth: initCounts(), grand_multigravida: initCounts(),
  };

  function getLab(p) {
    const logs = p.lab_logs || [];
    return {
      syphilis_screened: !!logs.find((l) => l.type === 'Syphilis') || !!p.lab_syphilis_result,
      syphilis_positive: (logs.find((l) => l.type === 'Syphilis')?.result === 'Positive') || (p.lab_syphilis_result === 'Reactive'),
      hepb_screened: !!logs.find((l) => l.type === 'Hep B') || !!p.lab_hepb_result,
      hepb_positive: (logs.find((l) => l.type === 'Hep B')?.result === 'Positive') || (p.lab_hepb_result === 'Reactive'),
      hiv_screened: !!logs.find((l) => l.type === 'HIV') || !!p.lab_hiv_result,
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

      if ((p.prenatal_visits || []).length >= 4) inc('visits4');
      const visits = p.prenatal_visits || [];
      const firstTri = [...visits].reverse().find((v) => v.trimester === '1st Trimester');
      if (firstTri) {
        if (firstTri.bmi_category === 'NORMAL') inc('bmiNormal');
        if (firstTri.bmi_category === 'LOW') inc('bmiLow');
        if (firstTri.bmi_category === 'HIGH') inc('bmiHigh');
      }

      const gravida = parseInt(p.gravida || 0, 10);
      const hasTd2 = !!p.td2;
      const hasTd3Plus = !!(p.td3 || p.td4 || p.td5);
      if (gravida === 1 && hasTd2) inc('td2plusFirst');
      if (gravida >= 2 && hasTd3Plus) inc('td2plusRepeat');

      const totalIFA = (p.supplements_ifa || []).reduce((s, i) => s + (Number(i.count) || 0), 0);
      if (totalIFA >= 180) inc('iron');
      if (p.is_high_risk && (p.calcium_carbonate_completed === true || p.calcium_carbonate_completed === 'true' || p.calcium_carbonate_completed === 'Yes')) {
        inc('calcium');
      }

      if (p.is_deworming_given) inc('deworming');
      const lab = getLab(p);
      if (lab.syphilis_screened) inc('syphilis_screen');
      if (lab.syphilis_positive) inc('syphilis_positive');
      if (lab.hepb_screened) inc('hepB_screen');
      if (lab.hepb_positive) inc('hepB_positive');
      if (lab.hiv_screened) inc('hiv_screen');
      if (lab.cbc_screened) inc('anemia_screen');
      if (lab.cbc_positive) inc('anemia_positive');
      if (lab.gd_screened) inc('gd_screen');
      if (lab.gd_positive) inc('gd_positive');

      if (p.delivery_date) {
        inc('deliveries');
        const isLiveBirth = ['FT', 'PT'].includes(p.delivery_outcome);
        const babies = isLiveBirth && Array.isArray(p.baby_details) && p.baby_details.length > 0
          ? p.baby_details
          : isLiveBirth ? [{ category: p.birth_weight_category || '', sex: p.birth_sex || '' }] : [];
        for (let i = 0; i < babies.length; i++) inc('liveBirths');
        babies.forEach((b) => {
          const cat = (b.category === 'Normal' || b.category === 'Low') ? b.category : 'Unknown';
          const sex = b.sex === 'Male' ? 'Male' : (b.sex === 'Female' ? 'Female' : null);
          if (cat === 'Normal') inc('lb_normal');
          if (cat === 'Low' && sex === 'Male') inc('lb_low_m');
          if (cat === 'Low' && sex === 'Female') inc('lb_low_f');
          if (cat === 'Unknown' && sex === 'Male') inc('lb_unknown_m');
          if (cat === 'Unknown' && sex === 'Female') inc('lb_unknown_f');
        });
        if (p.delivery_attendant === 'MD') inc('attendant_md');
        if (p.delivery_attendant === 'RN') inc('attendant_rn');
        if (p.delivery_attendant === 'MW') inc('attendant_mw');
        if (p.delivery_facility_type === 'Public') inc('facility_public');
        if (p.delivery_facility_type === 'Private') inc('facility_private');
        if (p.delivery_place === 'Others') inc('non_facility');
        if (p.delivery_mode === 'VD') inc('del_vaginal');
        if (p.delivery_mode === 'CS') inc('del_cs');
        if (p.delivery_outcome === 'FT') inc('outcome_ft');
        if (p.delivery_outcome === 'PT') inc('outcome_pt');
        if (p.delivery_outcome === 'FD') inc('outcome_fd');
        if (p.delivery_outcome === 'AB') inc('outcome_ab');
        if ((p.prenatal_visits || []).length >= 4) inc('anc4_delivery');
        const has1stTriVisit = (p.prenatal_visits || []).some((v) => v.trimester === '1st Trimester');
        if (has1stTriVisit) inc('anc1st_tri');
        if (gravida === 1) inc('first_birth');
        if (gravida >= 5) inc('grand_multigravida');
      }

      const pncDates = [p.pnc_date_1, p.pnc_date_2, p.pnc_date_3, p.pnc_date_4].filter(Boolean).length;
      if (pncDates >= 2) inc('pnc2');
      if (pncDates >= 4 || p.is_4pnc_completed === 'Yes' || p.is_4pnc_completed === 'true' || p.is_4pnc_completed === true) inc('pnc4');
      if ((p.postpartum_ifa_count || 0) >= 90 || p.is_postpartum_ifa_completed === 'Yes' || p.is_postpartum_ifa_completed === 'true' || p.is_postpartum_ifa_completed === true) inc('postpartum_ifa');
      if (p.vit_a_completed_date || p.is_vit_a_completed === 'Yes' || p.is_vit_a_completed === 'true' || p.is_vit_a_completed === true) inc('vit_a');
      if (p.has_hypertension) inc('hypertension');
    } catch (err) {
      console.error('Error processing patient for FHSIS:', p, err);
    }
  });

  const num = (key, g) => {
    const d = data[key];
    if (!d) return '';
    const v = g ? d[g] : d.total;
    return v !== undefined && v !== null ? v : '';
  };

  /* ── Title banner ──────────────────────────────────────────────── */
  const monthLabel =
    reportYear != null && reportMonth >= 1 && reportMonth <= 12
      ? `${MONTH_NAMES[reportMonth - 1]} ${reportYear}`
      : new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  const cityLabel = 'Batangas City';
  const barangayLabel = reportBarangay && String(reportBarangay).trim() ? reportBarangay : 'All';

  // Row 1: Title
  sheet.mergeCells(1, 1, 1, colCount);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = 'FHSIS M1 — MATERNAL CARE REPORT';
  titleCell.fill = greenDark;
  titleCell.font = { ...whiteFont, size: 14 };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 32;

  // Row 2: Subtitle
  sheet.mergeCells(2, 1, 2, colCount);
  const subCell = sheet.getCell(2, 1);
  subCell.value = `${monthLabel}   |   ${cityLabel}   |   Barangay: ${barangayLabel}`;
  subCell.fill = greenLight;
  subCell.font = { bold: true, size: 10, color: { argb: 'FF16A34A' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 22;

  // Row 3: Generated timestamp
  sheet.mergeCells(3, 1, 3, colCount);
  const genCell = sheet.getCell(3, 1);
  genCell.value = `Generated: ${new Date().toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' })}`;
  genCell.font = { color: { argb: 'FF6B7280' }, italic: true, size: 9 };
  genCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(3).height = 18;

  // Row 4: Spacer
  sheet.getRow(4).height = 6;

  let r = 5;

  const setHeader = (row, startCol, label) => {
    const c = sheet.getRow(row).getCell(startCol);
    c.value = label;
    c.fill = styles.tableHeader.fill;
    c.font = styles.tableHeader.font;
    c.alignment = styles.tableHeader.alignment;
  };
  const setData = (row, startCol, k) => {
    [0, 1, 2, 3].forEach((i, idx) => {
      const col = startCol + idx;
      const cell = sheet.getRow(row).getCell(col);
      cell.value = num(k, ['10-14', '15-19', '20-49', 'total'][i]);
      cell.style = styles.centeredCell;
    });
  };

  sheet.mergeCells(r, 1, r, colCount);
  sheet.getCell(r, 1).value = 'Indicators'; sheet.getCell(r, 1).fill = styles.tableHeader.fill; sheet.getCell(r, 1).font = styles.tableHeader.font;
  r++;
  sheet.getCell(r, 1).value = 'Indicators'; sheet.getCell(r, 1).fill = styles.tableHeader.fill; sheet.getCell(r, 1).font = styles.tableHeader.font;
  sheet.getCell(r, 2).value = 'Age Group'; sheet.getCell(r, 2).fill = styles.tableHeader.fill; sheet.getCell(r, 2).font = styles.tableHeader.font;
  sheet.getCell(r, 3).value = ''; sheet.getCell(r, 3).fill = styles.tableHeader.fill;
  sheet.getCell(r, 4).value = ''; sheet.getCell(r, 4).fill = styles.tableHeader.fill;
  sheet.getCell(r, 5).value = 'Total'; sheet.getCell(r, 5).fill = styles.tableHeader.fill; sheet.getCell(r, 5).font = styles.tableHeader.font;
  sheet.getCell(r, 6).value = 'Remarks'; sheet.getCell(r, 6).fill = styles.tableHeader.fill; sheet.getCell(r, 6).font = styles.tableHeader.font;
  sheet.getCell(r, 7).value = ''; sheet.getCell(r, 7).fill = styles.tableHeader.fill;
  sheet.getCell(r, 8).value = 'Indicators'; sheet.getCell(r, 8).fill = styles.tableHeader.fill; sheet.getCell(r, 8).font = styles.tableHeader.font;
  sheet.getCell(r, 9).value = 'Age Group'; sheet.getCell(r, 9).fill = styles.tableHeader.fill; sheet.getCell(r, 9).font = styles.tableHeader.font;
  sheet.getCell(r, 10).value = ''; sheet.getCell(r, 10).fill = styles.tableHeader.fill;
  sheet.getCell(r, 11).value = ''; sheet.getCell(r, 11).fill = styles.tableHeader.fill;
  sheet.getCell(r, 12).value = 'Total'; sheet.getCell(r, 12).fill = styles.tableHeader.fill; sheet.getCell(r, 12).font = styles.tableHeader.font;
  sheet.getCell(r, 13).value = 'Remarks'; sheet.getCell(r, 13).fill = styles.tableHeader.fill; sheet.getCell(r, 13).font = styles.tableHeader.font;
  sheet.getCell(r, 14).value = 'Indicators'; sheet.getCell(r, 14).fill = styles.tableHeader.fill; sheet.getCell(r, 14).font = styles.tableHeader.font;
  sheet.getCell(r, 15).value = 'Age Group'; sheet.getCell(r, 15).fill = styles.tableHeader.fill; sheet.getCell(r, 15).font = styles.tableHeader.font;
  sheet.getCell(r, 16).value = ''; sheet.getCell(r, 16).fill = styles.tableHeader.fill;
  sheet.getCell(r, 17).value = ''; sheet.getCell(r, 17).fill = styles.tableHeader.fill;
  sheet.getCell(r, 18).value = 'Total'; sheet.getCell(r, 18).fill = styles.tableHeader.fill; sheet.getCell(r, 18).font = styles.tableHeader.font;
  sheet.getCell(r, 19).value = 'Remarks'; sheet.getCell(r, 19).fill = styles.tableHeader.fill; sheet.getCell(r, 19).font = styles.tableHeader.font;
  r++;
  sheet.getCell(r, 1).value = ''; sheet.getCell(r, 1).fill = styles.tableHeader.fill;
  [2, 3, 4].forEach((c, i) => { sheet.getCell(r, c).value = ['10-14', '15-19', '20-49'][i]; sheet.getCell(r, c).fill = styles.tableHeader.fill; sheet.getCell(r, c).font = styles.tableHeader.font; });
  sheet.getCell(r, 5).value = 'Total'; sheet.getCell(r, 5).fill = styles.tableHeader.fill; sheet.getCell(r, 5).font = styles.tableHeader.font;
  sheet.getCell(r, 6).value = ''; sheet.getCell(r, 6).fill = styles.tableHeader.fill;
  sheet.getCell(r, 7).value = ''; sheet.getCell(r, 7).fill = styles.tableHeader.fill;
  sheet.getCell(r, 8).value = ''; sheet.getCell(r, 8).fill = styles.tableHeader.fill;
  [9, 10, 11].forEach((c, i) => { sheet.getCell(r, c).value = ['10-14', '15-19', '20-49'][i]; sheet.getCell(r, c).fill = styles.tableHeader.fill; sheet.getCell(r, c).font = styles.tableHeader.font; });
  sheet.getCell(r, 12).value = 'Total'; sheet.getCell(r, 12).fill = styles.tableHeader.fill; sheet.getCell(r, 12).font = styles.tableHeader.font;
  sheet.getCell(r, 13).value = ''; sheet.getCell(r, 13).fill = styles.tableHeader.fill;
  sheet.getCell(r, 14).value = ''; sheet.getCell(r, 14).fill = styles.tableHeader.fill;
  [15, 16, 17].forEach((c, i) => { sheet.getCell(r, c).value = ['10-14', '15-19', '20-49'][i]; sheet.getCell(r, c).fill = styles.tableHeader.fill; sheet.getCell(r, c).font = styles.tableHeader.font; });
  sheet.getCell(r, 18).value = 'Total'; sheet.getCell(r, 18).fill = styles.tableHeader.fill; sheet.getCell(r, 18).font = styles.tableHeader.font;
  sheet.getCell(r, 19).value = ''; sheet.getCell(r, 19).fill = styles.tableHeader.fill;
  r++;

  const section = (title) => {
    sheet.mergeCells(r, 1, r, colCount);
    sheet.getCell(r, 1).value = title;
    sheet.getCell(r, 1).fill = styles.sectionHeader.fill;
    sheet.getCell(r, 1).font = styles.sectionHeader.font;
    sheet.getCell(r, 1).alignment = styles.sectionHeader.alignment;
    r++;
  };

  const row3 = (l1, k1, l2, k2, l3, k3) => {
    const row = sheet.getRow(r);
    row.getCell(1).value = l1; row.getCell(1).style = styles.normalCell;
    if (k1) setData(r, 2, k1); else[2, 3, 4, 5].forEach((c) => { row.getCell(c).value = ''; row.getCell(c).style = styles.centeredCell; });
    row.getCell(6).value = ''; row.getCell(6).style = styles.normalCell;
    row.getCell(7).value = '';
    row.getCell(8).value = l2 || ''; row.getCell(8).style = styles.normalCell;
    if (k2) setData(r, 9, k2); else[9, 10, 11, 12].forEach((c) => { row.getCell(c).value = ''; row.getCell(c).style = styles.centeredCell; });
    row.getCell(13).value = ''; row.getCell(13).style = styles.normalCell;
    row.getCell(14).value = l3 || ''; row.getCell(14).style = styles.normalCell;
    if (k3) setData(r, 15, k3); else[15, 16, 17, 18].forEach((c) => { row.getCell(c).value = ''; row.getCell(c).style = styles.centeredCell; });
    row.getCell(19).value = ''; row.getCell(19).style = styles.normalCell;
    r++;
  };

  const row1 = (label, c2, c3, c4, c5) => {
    const row = sheet.getRow(r);
    row.getCell(1).value = label; row.getCell(1).style = styles.normalCell;
    [2, 3, 4, 5].forEach((c, i) => { row.getCell(c).value = [c2, c3, c4, c5][i] ?? ''; row.getCell(c).style = styles.centeredCell; });
    row.getCell(6).value = ''; row.getCell(6).style = styles.normalCell;
    row.getCell(7).value = '';
    row.getCell(8).value = ''; row.getCell(8).style = styles.normalCell;
    [9, 10, 11, 12].forEach((c) => { row.getCell(c).value = ''; row.getCell(c).style = styles.centeredCell; });
    row.getCell(13).value = ''; row.getCell(13).style = styles.normalCell;
    row.getCell(14).value = ''; row.getCell(14).style = styles.normalCell;
    [15, 16, 17, 18].forEach((c) => { row.getCell(c).value = ''; row.getCell(c).style = styles.centeredCell; });
    row.getCell(19).value = ''; row.getCell(19).style = styles.normalCell;
    r++;
  };

  section('Prenatal Care');

  row3('1. Pregnant women with at least 4 pre-natal check-ups', 'visits4', '4. Pregnant women for the 2nd or more times given at least 3 doses of Td vaccination (Td2 Plus)', 'td2plusRepeat', '9. Pregnant women tested positive for syphilis', 'syphilis_positive');
  row3('2. No. of pregnant women assessed of their nutritional status during the 1st trimester', null, '5. Pregnant women who completed the dose of iron with folic acid supplementation', 'iron', '10. Pregnant women screened for Hepatitis B', 'hepB_screen');
  row3('   a. Pregnant women seen in the 1st trimester who have normal BMI', 'bmiNormal', '6. Pregnant women who completed doses of calcium carbonate supplementation', 'calcium', '11. Pregnant women tested positive for Hepatitis B', 'hepB_positive');
  row3('   b. Pregnant women seen in the 1st trimester who have low BMI', 'bmiLow', '', null, '12. Pregnant women screened for HIV', 'hiv_screen');
  row3('   c. Pregnant women seen in the 1st trimester who have high BMI', 'bmiHigh', '7. Pregnant women given one dose of deworming tablet', 'deworming', '13. Pregnant women tested for CBC (Hgb and Hct count)', 'anemia_screen');
  row3('3. Pregnant women for the first time given at least 2 doses of Td vaccination', 'td2plusFirst', '8. Pregnant women screened for syphilis', 'syphilis_screen', '14. Pregnant women tested for CBC (Hgb and Hct) diagnosed with anemia', 'anemia_positive');
  row3('', null, '', null, '15. Pregnant women screened for gestational diabetes', 'gd_screen');
  row3('', null, '', null, '16. Pregnant women tested positive for gestational diabetes', 'gd_positive');

  section('Intrapartum Care and Delivery Outcome');

  // Helper to fill empty right-side columns (14-19) with consistent styling
  const fillRight = (rw) => {
    rw.getCell(14).value = ''; rw.getCell(14).style = styles.normalCell;
    [15, 16, 17, 18].forEach((c) => { rw.getCell(c).value = ''; rw.getCell(c).style = styles.centeredCell; });
    rw.getCell(19).value = ''; rw.getCell(19).style = styles.normalCell;
  };
  // Helper to set middle column label + data on a row
  const setMiddle = (rw, rowNum, label, key) => {
    rw.getCell(7).value = '';
    rw.getCell(8).value = label || ''; rw.getCell(8).style = styles.normalCell;
    if (key) { setData(rowNum, 9, key); } else { [9, 10, 11, 12].forEach((c) => { rw.getCell(c).value = ''; rw.getCell(c).style = styles.centeredCell; }); }
    rw.getCell(13).value = ''; rw.getCell(13).style = styles.normalCell;
  };

  row3('18. Number of deliveries', 'deliveries', '21. Number of health facility-based deliveries', null, '', null);
  row3('19. Number of live births', 'liveBirths', '   a. Number of deliveries in public health facility', 'facility_public', '', null);
  // 19a. Normal birth weight (total only) + 21b. Private facility
  {
    const rw = sheet.getRow(r);
    rw.getCell(1).value = '   a. Number of live births with normal birth weight (total)'; rw.getCell(1).style = styles.normalCell;
    rw.getCell(2).value = data.lb_normal?.total ?? 0; rw.getCell(2).style = styles.centeredCell;
    rw.getCell(3).value = ''; rw.getCell(3).style = styles.centeredCell;
    rw.getCell(4).value = ''; rw.getCell(4).style = styles.centeredCell;
    rw.getCell(5).value = ''; rw.getCell(5).style = styles.centeredCell;
    rw.getCell(6).value = ''; rw.getCell(6).style = styles.normalCell;
    setMiddle(rw, r, '   b. Number of deliveries in private health facility', 'facility_private');
    fillRight(rw);
    r++;
  }
  // 19b. Low birth weight – sub-header (Male / Female totals) + 22. Non-facility
  {
    const rw = sheet.getRow(r);
    rw.getCell(1).value = '   b. Number of live births with low birth weight'; rw.getCell(1).style = styles.normalCell;
    rw.getCell(2).value = 'Male (total)'; rw.getCell(2).style = styles.centeredCell;
    rw.getCell(3).value = 'Female (total)'; rw.getCell(3).style = styles.centeredCell;
    rw.getCell(4).value = ''; rw.getCell(4).style = styles.centeredCell;
    rw.getCell(5).value = ''; rw.getCell(5).style = styles.centeredCell;
    rw.getCell(6).value = ''; rw.getCell(6).style = styles.normalCell;
    setMiddle(rw, r, '22. Number of non-facility-based deliveries', 'non_facility');
    fillRight(rw);
    r++;
  }
  // 19b. Low birth weight – data (Male total / Female total) + 23. Type of Delivery header
  {
    const rw = sheet.getRow(r);
    rw.getCell(1).value = ''; rw.getCell(1).style = styles.normalCell;
    rw.getCell(2).value = data.lb_low_m?.total ?? 0; rw.getCell(2).style = styles.centeredCell;
    rw.getCell(3).value = data.lb_low_f?.total ?? 0; rw.getCell(3).style = styles.centeredCell;
    rw.getCell(4).value = ''; rw.getCell(4).style = styles.centeredCell;
    rw.getCell(5).value = ''; rw.getCell(5).style = styles.centeredCell;
    rw.getCell(6).value = ''; rw.getCell(6).style = styles.normalCell;
    setMiddle(rw, r, '23. Type of Delivery', null);
    fillRight(rw);
    r++;
  }
  // 19c. Unknown birth weight – total only (no sex / age breakdown) + 23a. Vaginal
  {
    const rw = sheet.getRow(r);
    rw.getCell(1).value = '   c. Number of live births with unknown birth weight (total)'; rw.getCell(1).style = styles.normalCell;
    rw.getCell(2).value = (data.lb_unknown_m?.total ?? 0) + (data.lb_unknown_f?.total ?? 0); rw.getCell(2).style = styles.centeredCell;
    rw.getCell(3).value = ''; rw.getCell(3).style = styles.centeredCell;
    rw.getCell(4).value = ''; rw.getCell(4).style = styles.centeredCell;
    rw.getCell(5).value = ''; rw.getCell(5).style = styles.centeredCell;
    rw.getCell(6).value = ''; rw.getCell(6).style = styles.normalCell;
    setMiddle(rw, r, '   a. Number of vaginal deliveries', 'del_vaginal');
    fillRight(rw);
    r++;
  }
  // (blank left) + 23b. Cesarean
  {
    const rw = sheet.getRow(r);
    rw.getCell(1).value = ''; rw.getCell(1).style = styles.normalCell;
    [2, 3, 4, 5].forEach((c) => { rw.getCell(c).value = ''; rw.getCell(c).style = styles.centeredCell; });
    rw.getCell(6).value = ''; rw.getCell(6).style = styles.normalCell;
    setMiddle(rw, r, '   b. Number of deliveries by cesarean section', 'del_cs');
    fillRight(rw);
    r++;
  }
  row3('20. Number of deliveries attended by skilled health professionals', null, '24. Pregnancy Outcome', null, '', null);
  row3('   a. Number of deliveries attended by a doctor', 'attendant_md', '   a. Number of full-term births', 'outcome_ft', '', null);
  row3('   b. Number of deliveries attended by a nurse', 'attendant_rn', '   b. Number of pre-term births', 'outcome_pt', '', null);
  row3('   c. Number of deliveries attended by midwives', 'attendant_mw', '   c. Number of fetal deaths', 'outcome_fd', '', null);
  row3('', null, '   d. Number of abortion/miscarriage', 'outcome_ab', '', null);

  section('Postpartum and Newborn Care');

  row3('25. Number of postpartum women together with their newborn who completed at least 2 postpartum check-ups', 'pnc2', '', null, '', null);
  row3('26. Number of postpartum women who completed iron with folic acid supplementation', 'postpartum_ifa', '', null, '', null);
  row3('27. Number of postpartum women with Vitamin A supplementation', 'vit_a', '', null, '', null);
  row3('28. No. of pregnant women who are diagnosed with hypertension', 'hypertension', '', null, '', null);
  row3('29a. No. of deliveries with 4 ANC', 'anc4_delivery', '', null, '', null);
  row3('29b. No. of deliveries with 1 ANC during 1st trimester', 'anc1st_tri', '', null, '', null);
  row3('30. No. of women who gave birth for the 1st time', 'first_birth', '', null, '', null);
  row3('31. No. of women who gave birth who are Grand Multigravida (G5 and above)', 'grand_multigravida', '', null, '', null);

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
    { header: 'GDM\nScreen Date', key: 'gdmDate', width: 14, group: 'lab' },
    { header: 'GDM Result\n1=pos, 0=neg', key: 'gdmResult', width: 14, group: 'lab' },
    // Delivery Information (45-58)
    { header: 'Date Terminated\n(mm/dd/yy)', key: 'deliveryDate', width: 16, group: 'delivery' },
    { header: 'Outcome\nFT=Full term,\nPT=Pre-term,\nFD=Fetal death,\nAB=Abortion', key: 'deliveryOutcome', width: 18, group: 'delivery' },
    { header: 'Delivery Type\nCS=Cesarean,\nVD=Vaginal', key: 'deliveryMode', width: 16, group: 'delivery' },
    { header: 'Birth Weight\n(grams, Baby 1)', key: 'birthWeight', width: 16, group: 'delivery' },
    { header: 'Birth Wt. Category\nA=Normal,\nB=Low, C=Unknown', key: 'birthWeightCat', width: 18, group: 'delivery' },
    { header: 'Sex of Baby 1\n(M/F)', key: 'birthSex', width: 12, group: 'delivery' },
    { header: 'Place of Delivery\n(health facility)', key: 'deliveryPlace', width: 22, group: 'delivery' },
    { header: 'Facility Type\n(Public/Private)', key: 'facilityType', width: 16, group: 'delivery' },
    { header: 'BEmONC/CEmONC\nCapable?\n(Yes/No)', key: 'facilityCapable', width: 16, group: 'delivery' },
    { header: 'Non-Health Facility\n(Home/Others)', key: 'nonHealthFacility', width: 20, group: 'delivery' },
    { header: 'Non-Health Facility\nPlace (specify)', key: 'nonHealthPlace', width: 20, group: 'delivery' },
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

    const isSyphilisPos = syphilis?.result === 'Positive' || p.lab_syphilis_result === 'Reactive';
    const isHivPos = hiv?.result === 'Positive' || p.lab_hiv_result === 'Reactive';
    const isHepbPos = hepb?.result === 'Positive' || p.lab_hepb_result === 'Reactive';
    const isCbcAnemia = cbc?.result === 'With Anemia' || p.lab_cbc_result === 'With Anemia';
    const isGdmPos = gdm?.result === 'Positive' || p.lab_diabetes_result === 'Positive';

    const is4PncCompleted = p.is_4pnc_completed === 'Yes' || p.is_4pnc_completed === true || p.is_4pnc_completed === 'true';

    const babyDetails = Array.isArray(p.baby_details) && p.baby_details.length > 0 ? p.baby_details : [];
    const firstBaby = babyDetails[0] || {};

    const rowValues = {
      no: idx + 1,
      dateReg: p.date_of_registration || p.date_registered || '',
      fullName,
      address,
      contactNo: p.contact_no || '',
      email: p.email_address || '',
      age: Number.isNaN(ageNum) ? '' : ageNum,
      ageGroup: getAgeGroup(ageNum),
      civilStatus: p.civil_status || '',
      soloParent: p.is_solo_parent === true ? 1 : (p.is_solo_parent === false ? 0 : ''),
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
      gdmDate: gdm?.date || '',
      gdmResult: isGdmPos ? 1 : (gdm ? 0 : ''),
      deliveryDate: p.delivery_date || '',
      deliveryOutcome: p.delivery_outcome || '',
      deliveryMode: p.delivery_mode || '',
      birthWeight: firstBaby.weight || p.birth_weight || '',
      birthWeightCat: firstBaby.category || p.birth_weight_category || '',
      birthSex: (firstBaby.sex || p.birth_sex || '').startsWith('M') ? 'M' : (firstBaby.sex || p.birth_sex || '').startsWith('F') ? 'F' : '',
      deliveryPlace: p.delivery_place || '',
      facilityType: p.delivery_facility_type || '',
      facilityCapable: p.delivery_place_capable || '',
      nonHealthFacility: p.delivery_non_health_facility === 'Others' ? 'Others' : (p.delivery_non_health_facility || ''),
      nonHealthPlace: p.delivery_non_health_place || '',
      attendant: (() => { const parsed = parseOthers(p.delivery_attendant); return parsed.main || ''; })(),
      attendantSpecify: (() => { const parsed = parseOthers(p.delivery_attendant); return parsed.specify || ''; })(),
      deliveryTime: p.delivery_time || '',
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

    row.height = 18;
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
