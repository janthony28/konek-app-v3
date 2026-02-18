import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Export a single chart's data to an Excel file.
 *
 * @param {Object}   opts
 * @param {string}   opts.chartTitle  — e.g. "Solo Parent", "High Risk Pregnancy Rate"
 * @param {Array<{label:string, count:number, records:Array<{id:string,name:string}>}>} opts.categories
 * @param {string}   [opts.filename]  — override auto-generated filename
 */
export async function exportChartToExcel({ chartTitle, categories = [], filename }) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Konek App';
    wb.created = new Date();

    const ws = wb.addWorksheet(chartTitle.substring(0, 31)); // Excel sheet name max 31 chars

    /* ── Column widths ──────────────────────────────────────────────────── */
    ws.columns = [
        { width: 6 },   // A — row number
        { width: 40 },  // B — label / name
        { width: 14 },  // C — count
        { width: 14 },  // D — percentage
    ];

    /* ── Style helpers ──────────────────────────────────────────────────── */
    const TEAL = '0CA678';
    const WHITE = 'FFFFFF';
    const LIGHT_GRAY = 'F8F9FA';
    const MED_GRAY = 'DEE2E6';

    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
    const headerFont = { bold: true, color: { argb: WHITE }, size: 12 };
    const subHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E9ECEF' } };
    const subHeaderFont = { bold: true, size: 11 };
    const thinBorder = {
        top: { style: 'thin', color: { argb: MED_GRAY } },
        bottom: { style: 'thin', color: { argb: MED_GRAY } },
        left: { style: 'thin', color: { argb: MED_GRAY } },
        right: { style: 'thin', color: { argb: MED_GRAY } },
    };

    /* ── Title row ──────────────────────────────────────────────────────── */
    const titleRow = ws.addRow([null, chartTitle]);
    ws.mergeCells(titleRow.number, 2, titleRow.number, 4);
    titleRow.getCell(2).font = { bold: true, size: 14, color: { argb: TEAL } };
    titleRow.height = 28;

    /* ── Export date ─────────────────────────────────────────────────────── */
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-PH', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
    const dateRow = ws.addRow([null, `Exported: ${dateStr}`]);
    dateRow.getCell(2).font = { italic: true, size: 10, color: { argb: '868E96' } };

    ws.addRow([]); // spacer

    /* ── Summary table ──────────────────────────────────────────────────── */
    const totalCount = categories.reduce((sum, c) => sum + c.count, 0);

    // Header
    const summaryHeaderRow = ws.addRow([null, 'Category', 'Count', 'Percentage']);
    for (let col = 2; col <= 4; col++) {
        const cell = summaryHeaderRow.getCell(col);
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = thinBorder;
    }
    summaryHeaderRow.height = 24;

    // Data rows
    categories.forEach((cat, idx) => {
        const pct = totalCount > 0 ? ((cat.count / totalCount) * 100).toFixed(1) + '%' : '0%';
        const row = ws.addRow([null, cat.label, cat.count, pct]);
        const bg = idx % 2 === 0 ? LIGHT_GRAY : WHITE;
        for (let col = 2; col <= 4; col++) {
            const cell = row.getCell(col);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            cell.border = thinBorder;
            cell.alignment = { vertical: 'middle', horizontal: col >= 3 ? 'center' : 'left' };
        }
    });

    // Total row
    const totalRow = ws.addRow([null, 'Total', totalCount, '100%']);
    for (let col = 2; col <= 4; col++) {
        const cell = totalRow.getCell(col);
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E9ECEF' } };
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle', horizontal: col >= 3 ? 'center' : 'left' };
    }

    ws.addRow([]); // spacer
    ws.addRow([]); // spacer

    /* ── Categorised record lists ───────────────────────────────────────── */
    const recordsTitle = ws.addRow([null, 'Record Names by Category']);
    ws.mergeCells(recordsTitle.number, 2, recordsTitle.number, 4);
    recordsTitle.getCell(2).font = { bold: true, size: 12, color: { argb: TEAL } };
    recordsTitle.height = 24;

    ws.addRow([]); // spacer

    for (const cat of categories) {
        // Category sub-header
        const catHeader = ws.addRow([null, `${cat.label}  (${cat.count})`]);
        ws.mergeCells(catHeader.number, 2, catHeader.number, 4);
        catHeader.getCell(2).fill = subHeaderFill;
        catHeader.getCell(2).font = subHeaderFont;
        catHeader.getCell(2).border = thinBorder;
        catHeader.height = 22;

        if (!cat.records || cat.records.length === 0) {
            const emptyRow = ws.addRow([null, '  (no records)']);
            emptyRow.getCell(2).font = { italic: true, color: { argb: '868E96' }, size: 10 };
        } else {
            cat.records.forEach((rec, i) => {
                const details = [rec.barangay ? `📍 ${rec.barangay}` : '', rec.contact_no ? `📞 ${rec.contact_no}` : ''].filter(Boolean).join('  ');
                const suffix = details ? ` — ${details}` : '';
                const row = ws.addRow([null, `  ${i + 1}. ${rec.name}${suffix}`]);
                row.getCell(2).font = { size: 10 };
                row.getCell(2).alignment = { wrapText: true };
            });
        }

        ws.addRow([]); // spacer between categories
    }

    /* ── Save ────────────────────────────────────────────────────────────── */
    const safeName = (filename || chartTitle)
        .replace(/[^a-zA-Z0-9 _-]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 60);

    const dateTag = now.toISOString().slice(0, 10);
    const finalName = `${safeName}_${dateTag}.xlsx`;

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), finalName);
}
