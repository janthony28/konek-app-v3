import { useEffect, useState } from 'react';
import { ActionIcon, Alert, Divider, Grid, Group, Loader, Modal, Paper, ScrollArea, Stack, Table, Text, ThemeIcon, Title, Tooltip as MantineTooltip } from '@mantine/core';
import { BarChart3, Baby, Download, Edit2, HeartPulse, PieChart as PieChartIcon, Shield, UserCheck } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchStatisticsData } from '../../services/statisticsService';
import { exportChartToExcel } from '../../lib/statisticsExport';

/* ── Color palette ────────────────────────────────────────────────────── */
const COLORS = {
  green: '#0ca678',
  orange: '#f08c00',
  blue: '#228be6',
  red: '#fa5252',
  purple: '#845ef7',
  teal: '#12b886',
  pink: '#e64980',
  gray: '#868e96',
};

const PIE_YES_NO = [COLORS.green, COLORS.orange];
const PIE_3WAY = [COLORS.green, COLORS.blue, COLORS.orange];
const PIE_COMPLETION = [COLORS.teal, COLORS.red];

/* ── Reusable chart wrapper ───────────────────────────────────────────── */
function ChartPaper({ title, subtitle, icon, children, height = 320, onExport }) {
  return (
    <Paper withBorder radius="md" p="md" h="100%">
      <Group justify="space-between" mb="xs">
        <div>
          <Text fw={700}>{title}</Text>
          {subtitle ? <Text size="xs" c="dimmed">{subtitle}</Text> : null}
        </div>
        <Group gap={6}>
          {onExport && (
            <MantineTooltip label="Export to Excel" position="left" withArrow>
              <ActionIcon variant="light" color="teal" size="sm" onClick={onExport}>
                <Download size={14} />
              </ActionIcon>
            </MantineTooltip>
          )}
          <ThemeIcon variant="light" color="teal">
            {icon}
          </ThemeIcon>
        </Group>
      </Group>
      <div style={{ width: '100%', height }}>{children}</div>
    </Paper>
  );
}

/* ── Tooltip styling ──────────────────────────────────────────────────── */
function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.96)',
    border: '1px solid #dee2e6',
    borderRadius: 8,
    padding: '10px 14px',
    boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
    fontSize: 13,
  };
}

/** Tooltip for pie with sub-breakdown for a target slice */
function SubBreakdownTooltip({ active, payload, breakdownMap, targetSliceName }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const name = entry.name;
  const value = entry.value;

  return (
    <div style={tooltipStyle()}>
      <Text size="sm" fw={600} mb={4}>{name}</Text>
      <Text size="sm">{value} record{value !== 1 ? 's' : ''}</Text>
      {name === targetSliceName && breakdownMap && Object.keys(breakdownMap).length > 0 && (
        <div style={{ marginTop: 8, borderTop: '1px solid #e9ecef', paddingTop: 6 }}>
          <Text size="xs" fw={600} c="dimmed" mb={2}>Breakdown:</Text>
          {Object.entries(breakdownMap)
            .sort(([, a], [, b]) => b - a)
            .map(([label, count]) => (
              <Group key={label} justify="space-between" gap="xs">
                <Text size="xs">{label}</Text>
                <Text size="xs" fw={600}>{count}</Text>
              </Group>
            ))}
        </div>
      )}
      <Text size="xs" c="dimmed" mt={6} fs="italic">Click to view records</Text>
    </div>
  );
}

/** Simple pie tooltip */
function SimplePieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div style={tooltipStyle()}>
      <Text size="sm" fw={600} mb={2}>{entry.name}</Text>
      <Text size="sm">{entry.value} record{entry.value !== 1 ? 's' : ''}</Text>
      <Text size="xs" c="dimmed" mt={6} fs="italic">Click to view records</Text>
    </div>
  );
}

/** Percentage label on pie slices */
function renderPercentLabel({ percent: pct }) {
  if (!pct) return null;
  return `${(pct * 100).toFixed(0)}%`;
}

/* ══════════════════════════════════════════════════════════════════════ */

export default function StatisticsView({ isAdmin, userId, onEditRecord }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  // Modal state for record list
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalRecords, setModalRecords] = useState([]); // Array of { id, name }

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchStatisticsData({ isAdmin, userId });
        if (!mounted) return;
        setStats(data);
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || 'Failed to load statistics.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [isAdmin, userId]);

  /** Open the record list modal */
  function showRecords(title, records) {
    const list = Array.isArray(records) ? records : [];
    setModalTitle(title);
    setModalRecords(list);
    setModalOpen(true);
  }

  /** Handle edit button click — closes modal first then triggers edit */
  function handleEdit(recordEntry) {
    if (!onEditRecord || !recordEntry?.id) return;
    setModalOpen(false);
    // Small delay for modal close animation
    setTimeout(() => onEditRecord(recordEntry.id), 150);
  }

  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader color="teal" />
      </Group>
    );
  }

  if (error) {
    return (
      <Alert color="red" title="Unable to load statistics">
        {error}
      </Alert>
    );
  }

  const gd = stats?.generalData || {};
  const pr = stats?.pregnancyRelated || {};

  /* ── Build pie data arrays ──────────────────────────────────────────── */

  // Solo Parent
  const soloParentData = [
    { name: 'Yes', value: gd.soloParent?.yes || 0 },
    { name: 'No', value: gd.soloParent?.no || 0 },
  ];
  if (gd.soloParent?.unknown) soloParentData.push({ name: 'Unknown', value: gd.soloParent.unknown });
  const soloColors = gd.soloParent?.unknown ? [COLORS.green, COLORS.orange, COLORS.gray] : PIE_YES_NO;

  // PhilHealth
  const philhealthData = [
    { name: 'Member', value: gd.philhealth?.member || 0 },
    { name: 'Dependent', value: gd.philhealth?.dependent || 0 },
    { name: 'Not a Member', value: gd.philhealth?.notMember || 0 },
  ];
  if (gd.philhealth?.unknown) philhealthData.push({ name: 'Unknown', value: gd.philhealth.unknown });
  const phColors = gd.philhealth?.unknown
    ? [COLORS.green, COLORS.blue, COLORS.orange, COLORS.gray]
    : PIE_3WAY;

  // SSS
  const sssData = [
    { name: 'Member', value: gd.sss?.member || 0 },
    { name: 'Not Member', value: gd.sss?.notMember || 0 },
  ];
  if (gd.sss?.unknown) sssData.push({ name: 'Unknown', value: gd.sss.unknown });
  const sssColors = gd.sss?.unknown ? [COLORS.green, COLORS.orange, COLORS.gray] : PIE_YES_NO;

  // GSIS
  const gsisData = [
    { name: 'Member', value: gd.gsis?.member || 0 },
    { name: 'Not Member', value: gd.gsis?.notMember || 0 },
  ];
  if (gd.gsis?.unknown) gsisData.push({ name: 'Unknown', value: gd.gsis.unknown });
  const gsisColors = gd.gsis?.unknown ? [COLORS.green, COLORS.orange, COLORS.gray] : PIE_YES_NO;

  // Birth Registration
  const birthRegData = [
    { name: 'Registered', value: gd.birthRegistration?.registered || 0 },
    { name: 'Not Registered', value: gd.birthRegistration?.notRegistered || 0 },
  ];
  if (gd.birthRegistration?.unknown) birthRegData.push({ name: 'Unknown', value: gd.birthRegistration.unknown });
  const birthRegColors = gd.birthRegistration?.unknown ? [COLORS.green, COLORS.red, COLORS.gray] : [COLORS.green, COLORS.red];

  // 8 ANC Completion
  const ancData = [
    { name: 'Completed', value: pr.ancCompletion?.completed || 0 },
    { name: 'Not Completed', value: pr.ancCompletion?.notCompleted || 0 },
  ];

  // 4 PNC Completion
  const pncData = [
    { name: 'Completed', value: pr.postpartumCompletion?.completed || 0 },
    { name: 'Not Completed', value: pr.postpartumCompletion?.notCompleted || 0 },
  ];

  // High Risk (pie chart)
  const highRiskPieData = [
    { name: 'High Risk', value: pr.highRisk?.highRiskCount || 0 },
    { name: 'Normal', value: pr.highRisk?.normalCount || 0 },
  ];

  const riskReasons = pr.highRisk?.reasons || [];

  // Teenage pregnancy
  const teenageCount = pr.teenagePregnancy?.count || 0;
  const teenageRate = pr.teenagePregnancy?.rate || 0;
  const teenageTotal = pr.teenagePregnancy?.total || 0;

  /* ── Click handlers ─────────────────────────────────────────────────── */

  function onPieClick(recordsObj, chartLabel) {
    return (_data) => {
      const sliceName = _data?.name || _data?.payload?.name;
      if (!sliceName) return;
      const records = recordsObj?.[sliceName] || [];
      showRecords(`${chartLabel} — ${sliceName}`, records);
    };
  }

  function onBarClick(chartLabel) {
    return (data) => {
      if (!data) return;
      const reason = data.reason || data.name;
      const records = data.records || [];
      showRecords(`${chartLabel} — ${reason}`, records);
    };
  }

  /* ── Export helpers ─────────────────────────────────────────────────── */

  /** Build categories array from a records-object (keys → labels) */
  function categoriesFromRecords(recordsObj) {
    return Object.entries(recordsObj || {}).map(([label, recs]) => ({
      label,
      count: Array.isArray(recs) ? recs.length : 0,
      records: Array.isArray(recs) ? recs : [],
    }));
  }

  function handleExport(chartTitle, recordsObj) {
    exportChartToExcel({ chartTitle, categories: categoriesFromRecords(recordsObj) });
  }

  function handleBarExport(chartTitle, reasons) {
    const cats = (reasons || []).map((r) => ({
      label: r.reason,
      count: r.count,
      records: r.records || [],
    }));
    exportChartToExcel({ chartTitle, categories: cats });
  }

  function handleTeenageExport() {
    const recs = pr.teenagePregnancy?.records || [];
    exportChartToExcel({
      chartTitle: 'Teenage Pregnancy Cases',
      categories: [{ label: 'Teenage (Age 10–19)', count: recs.length, records: recs }],
    });
  }

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <Stack gap="lg">
      <div>
        <Title order={3}>Statistics Dashboard</Title>
        <Text c="dimmed" size="sm">
          Aggregated from {stats?.totals?.mothers || 0} maternal record{(stats?.totals?.mothers || 0) !== 1 ? 's' : ''}.
          <Text span size="xs" c="dimmed" ml={8} fs="italic">Click any slice or bar to view the matching records.</Text>
        </Text>
      </div>

      {/* ═══════ RECORD LIST MODAL ═══════ */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={<Text fw={700} size="md">{modalTitle}</Text>}
        size="lg"
        centered
      >
        {modalRecords.length === 0 ? (
          <Text c="dimmed" size="sm" py="md">No records found.</Text>
        ) : (
          <>
            <Text size="xs" c="dimmed" mb="xs">{modalRecords.length} record{modalRecords.length !== 1 ? 's' : ''}</Text>
            <Divider mb="xs" />
            <ScrollArea.Autosize mah={400}>
              <Table striped highlightOnHover withTableBorder withColumnBorders style={{ fontSize: '0.85rem' }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 40 }}>#</Table.Th>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Barangay</Table.Th>
                    <Table.Th>Contact No.</Table.Th>
                    {onEditRecord && <Table.Th style={{ width: 50 }}></Table.Th>}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {modalRecords.map((entry, i) => (
                    <Table.Tr key={`${entry.id || entry.name}-${i}`}>
                      <Table.Td>{i + 1}</Table.Td>
                      <Table.Td fw={600}>{entry.name}</Table.Td>
                      <Table.Td>{entry.barangay || <Text span size="xs" c="dimmed" fs="italic">—</Text>}</Table.Td>
                      <Table.Td>{entry.contact_no || <Text span size="xs" c="dimmed" fs="italic">—</Text>}</Table.Td>
                      {onEditRecord && entry.id && (
                        <Table.Td>
                          <MantineTooltip label="View / Edit record" position="left" withArrow>
                            <ActionIcon
                              variant="light"
                              color="blue"
                              size="sm"
                              onClick={() => handleEdit(entry)}
                            >
                              <Edit2 size={14} />
                            </ActionIcon>
                          </MantineTooltip>
                        </Table.Td>
                      )}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea.Autosize>
          </>
        )}
      </Modal>

      {/* ════════════ SECTION 1: GENERAL DATA STATISTICS ════════════ */}
      <Title order={4}>General Data Statistics</Title>
      <Grid>
        {/* ── Solo Parent ── */}
        <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
          <ChartPaper title="Solo Parent" subtitle="Hover on Yes for type breakdown" icon={<UserCheck size={16} />} onExport={() => handleExport('Solo Parent', gd.soloParent?.records)}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={soloParentData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={renderPercentLabel}
                  onClick={onPieClick(gd.soloParent?.records, 'Solo Parent')}
                  style={{ cursor: 'pointer' }}
                >
                  {soloParentData.map((entry, i) => (
                    <Cell key={entry.name} fill={soloColors[i % soloColors.length]} />
                  ))}
                </Pie>
                <Tooltip content={<SubBreakdownTooltip breakdownMap={gd.soloParent?.byType} targetSliceName="Yes" />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartPaper>
        </Grid.Col>

        {/* ── PhilHealth ── */}
        <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
          <ChartPaper title="PhilHealth Member" subtitle="Hover on Member for type breakdown" icon={<Shield size={16} />} onExport={() => handleExport('PhilHealth Member', gd.philhealth?.records)}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={philhealthData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={renderPercentLabel}
                  onClick={onPieClick(gd.philhealth?.records, 'PhilHealth')}
                  style={{ cursor: 'pointer' }}
                >
                  {philhealthData.map((entry, i) => (
                    <Cell key={entry.name} fill={phColors[i % phColors.length]} />
                  ))}
                </Pie>
                <Tooltip content={<SubBreakdownTooltip breakdownMap={gd.philhealth?.byType} targetSliceName="Member" />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartPaper>
        </Grid.Col>

        {/* ── SSS Member ── */}
        <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
          <ChartPaper title="SSS Member" subtitle="Member vs Not Member" icon={<Shield size={16} />} onExport={() => handleExport('SSS Member', gd.sss?.records)}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={sssData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={renderPercentLabel}
                  onClick={onPieClick(gd.sss?.records, 'SSS')}
                  style={{ cursor: 'pointer' }}
                >
                  {sssData.map((entry, i) => (
                    <Cell key={entry.name} fill={sssColors[i % sssColors.length]} />
                  ))}
                </Pie>
                <Tooltip content={<SimplePieTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartPaper>
        </Grid.Col>

        {/* ── GSIS Member ── */}
        <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
          <ChartPaper title="GSIS Member" subtitle="Member vs Not Member" icon={<Shield size={16} />} onExport={() => handleExport('GSIS Member', gd.gsis?.records)}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={gsisData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={renderPercentLabel}
                  onClick={onPieClick(gd.gsis?.records, 'GSIS')}
                  style={{ cursor: 'pointer' }}
                >
                  {gsisData.map((entry, i) => (
                    <Cell key={entry.name} fill={gsisColors[i % gsisColors.length]} />
                  ))}
                </Pie>
                <Tooltip content={<SimplePieTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartPaper>
        </Grid.Col>

        {/* ── Birth Registration Status ── */}
        <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
          <ChartPaper title="Birth Registration Status" subtitle="Registered vs Not Registered" icon={<PieChartIcon size={16} />} onExport={() => handleExport('Birth Registration Status', gd.birthRegistration?.records)}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={birthRegData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={renderPercentLabel}
                  onClick={onPieClick(gd.birthRegistration?.records, 'Birth Registration')}
                  style={{ cursor: 'pointer' }}
                >
                  {birthRegData.map((entry, i) => (
                    <Cell key={entry.name} fill={birthRegColors[i % birthRegColors.length]} />
                  ))}
                </Pie>
                <Tooltip content={<SimplePieTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartPaper>
        </Grid.Col>
      </Grid>

      {/* ════════════ SECTION 2: PREGNANCY RELATED STATISTICS ════════════ */}
      <Title order={4}>Pregnancy Related Statistics</Title>
      <Grid>
        {/* ── Completion of 8 ANC ── */}
        <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
          <ChartPaper title="Completion of 8 ANC" subtitle="Completed vs Not Completed" icon={<PieChartIcon size={16} />} onExport={() => handleExport('Completion of 8 ANC', pr.ancCompletion?.records)}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={ancData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={renderPercentLabel}
                  onClick={onPieClick(pr.ancCompletion?.records, '8 ANC Completion')}
                  style={{ cursor: 'pointer' }}
                >
                  {ancData.map((entry, i) => (
                    <Cell key={entry.name} fill={PIE_COMPLETION[i % PIE_COMPLETION.length]} />
                  ))}
                </Pie>
                <Tooltip content={<SimplePieTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartPaper>
        </Grid.Col>

        {/* ── Completed Postpartum Visit (4 PNC) ── */}
        <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
          <ChartPaper title="Completed Postpartum Visit" subtitle="4 PNC — Completed vs Not Completed" icon={<PieChartIcon size={16} />} onExport={() => handleExport('Completed Postpartum Visit (4 PNC)', pr.postpartumCompletion?.records)}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pncData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={renderPercentLabel}
                  onClick={onPieClick(pr.postpartumCompletion?.records, '4 PNC Completion')}
                  style={{ cursor: 'pointer' }}
                >
                  {pncData.map((entry, i) => (
                    <Cell key={entry.name} fill={PIE_COMPLETION[i % PIE_COMPLETION.length]} />
                  ))}
                </Pie>
                <Tooltip content={<SimplePieTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartPaper>
        </Grid.Col>

        {/* ── High Risk Pregnancy Rate (pie chart) ── */}
        <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
          <ChartPaper
            title="High Risk Pregnancy Rate"
            subtitle={`${pr.highRisk?.rate || 0}% classified as high risk`}
            icon={<HeartPulse size={16} />}
            onExport={() => handleExport('High Risk Pregnancy Rate', pr.highRisk?.records)}
          >
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={highRiskPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={renderPercentLabel}
                  onClick={onPieClick(pr.highRisk?.records, 'High Risk')}
                  style={{ cursor: 'pointer' }}
                >
                  <Cell fill={COLORS.red} />
                  <Cell fill={COLORS.green} />
                </Pie>
                <Tooltip content={<SimplePieTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartPaper>
        </Grid.Col>

        {/* ── Reasons of High Risk Pregnancy (bar graph) ── */}
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <ChartPaper title="Reasons of High Risk Pregnancy" subtitle="Click a bar to view records" icon={<BarChart3 size={16} />} onExport={() => handleBarExport('Reasons of High Risk Pregnancy', riskReasons)}>
            {riskReasons.length === 0 ? (
              <Group justify="center" align="center" h="100%">
                <Text c="dimmed" size="sm">No high risk cases recorded yet.</Text>
              </Group>
            ) : (
              <ResponsiveContainer>
                <BarChart data={riskReasons}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="reason" hide />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={tooltipStyle()}>
                          <Text size="sm" fw={600} mb={2}>{d.reason}</Text>
                          <Text size="sm">{d.count} case{d.count !== 1 ? 's' : ''}</Text>
                          <Text size="xs" c="dimmed" mt={6} fs="italic">Click to view records</Text>
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="count"
                    name="Cases"
                    fill={COLORS.red}
                    radius={[6, 6, 0, 0]}
                    onClick={onBarClick('High Risk Reason')}
                    style={{ cursor: 'pointer' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartPaper>
        </Grid.Col>

        {/* ── Teenage Pregnancy Cases ── */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <ChartPaper title="Teenage Pregnancy Cases" subtitle="Mothers aged 10–19" icon={<Baby size={16} />} onExport={handleTeenageExport}>
            <Stack
              align="center"
              justify="center"
              h="100%"
              gap="md"
              style={{ cursor: 'pointer' }}
              onClick={() => showRecords('Teenage Pregnancy Cases', pr.teenagePregnancy?.records || [])}
            >
              <div style={{ textAlign: 'center' }}>
                <Text size="4rem" fw={800} c="orange" lh={1}>{teenageCount}</Text>
                <Text size="md" c="dimmed" mt={4}>case{teenageCount !== 1 ? 's' : ''}</Text>
              </div>
              <Paper withBorder radius="md" p="sm" bg="orange.0" w="100%" maw={220}>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Rate</Text>
                  <Text size="sm" fw={700} c="orange">{teenageRate}%</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Out of</Text>
                  <Text size="sm" fw={600}>{teenageTotal} total</Text>
                </Group>
              </Paper>
              <Text size="xs" c="dimmed" fs="italic">Click to view records</Text>
            </Stack>
          </ChartPaper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
