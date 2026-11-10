import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  Grid,
  Group,
  Loader,
  Modal,
  Paper,
  Progress,
  RingProgress,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
  Tooltip as MantineTooltip,
} from '@mantine/core';
import {
  Activity,
  AlertTriangle,
  Baby,
  BarChart3,
  CheckCircle2,
  Download,
  Edit2,
  FilterX,
  HeartPulse,
  PieChart as PieChartIcon,
  RefreshCw,
  Shield,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { buildMaternalStatistics, fetchStatisticsData } from '../../services/statisticsService';
import { exportChartToExcel } from '../../lib/statisticsExport';
import { BATANGAS_BARANGAYS } from '../../lib/constants';

/* ── Color palette ────────────────────────────────────────────────────── */
const COLORS = {
  green: '#0ca678',
  orange: '#f08c00',
  blue: '#228be6',
  red: '#fa5252',
  purple: '#845ef7',
  teal: '#12b886',
  pink: '#e64980',
  gray: '#adb5bd',
  lightTrack: '#f1f3f5',
};

const RISK_BAR_SHADES = ['#e03131', '#f03e3e', '#fa5252', '#ff6b6b', '#ff8787', '#ffa8a8'];
const PIE_YES_NO = [COLORS.green, COLORS.orange];
const PIE_3WAY = [COLORS.green, COLORS.blue, COLORS.orange];
const PIE_COMPLETION = [COLORS.teal, '#ffe3e3'];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [
  { value: '', label: 'All years' },
  ...Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map((y) => ({
    value: String(y),
    label: String(y),
  })),
];

/* ── Reusable chart wrapper ───────────────────────────────────────────── */
function ChartPaper({ title, subtitle, icon, color = 'teal', children, height = 310, onExport }) {
  return (
    <Paper
      withBorder
      radius="md"
      p="md"
      h="100%"
      style={{
        transition: 'box-shadow 150ms ease, transform 150ms ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <Group justify="space-between" mb="xs" wrap="nowrap">
        <div>
          <Text fw={700} size="sm">{title}</Text>
          {subtitle ? <Text size="xs" c="dimmed">{subtitle}</Text> : null}
        </div>
        <Group gap={6} wrap="nowrap">
          {onExport && (
            <MantineTooltip label="Export to Excel" position="left" withArrow>
              <ActionIcon variant="light" color="teal" size="sm" onClick={onExport}>
                <Download size={14} />
              </ActionIcon>
            </MantineTooltip>
          )}
          <ThemeIcon variant="light" color={color} radius="md">
            {icon}
          </ThemeIcon>
        </Group>
      </Group>
      <div style={{ width: '100%', height, position: 'relative' }}>{children}</div>
    </Paper>
  );
}

/* ── Donut chart with center KPI overlay ──────────────────────────────── */
function DonutChartWithCenter({
  data,
  colors,
  onSliceClick,
  tooltipContent,
  centerValue,
  centerLabel,
  centerColor = '#212529',
}) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: '44%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <Text fw={800} size="xl" lh={1.1} style={{ color: centerColor }}>
          {centerValue}
        </Text>
        {centerLabel && (
          <Text size="10px" fw={600} c="dimmed" tt="uppercase" mt={2}>
            {centerLabel}
          </Text>
        )}
      </div>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="44%"
            innerRadius={56}
            outerRadius={86}
            paddingAngle={3}
            cornerRadius={6}
            onClick={onSliceClick}
            style={{ cursor: 'pointer', outline: 'none' }}
          >
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={colors[i % colors.length]} stroke="none" />
            ))}
          </Pie>
          <Tooltip content={tooltipContent || <SimplePieTooltip />} />
          <Legend verticalAlign="bottom" height={32} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Semi-circle radial gauge for completion targets ──────────────────── */
function CompletionGaugeChart({
  completed,
  notCompleted,
  rate,
  accentColor = COLORS.teal,
  onSliceClick,
}) {
  const data = [
    { name: 'Completed', value: completed },
    { name: 'Not Completed', value: notCompleted },
  ];
  const total = completed + notCompleted;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: '56%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <Text fw={800} size="2rem" lh={1} style={{ color: accentColor }}>
          {rate}%
        </Text>
        <Text size="xs" c="dimmed" fw={600} mt={4}>
          {completed} of {total} mothers
        </Text>
      </div>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="64%"
            startAngle={180}
            endAngle={0}
            innerRadius={68}
            outerRadius={98}
            paddingAngle={2}
            cornerRadius={8}
            onClick={onSliceClick}
            style={{ cursor: 'pointer', outline: 'none' }}
          >
            <Cell fill={accentColor} stroke="none" />
            <Cell fill={COLORS.lightTrack} stroke="none" />
          </Pie>
          <Tooltip content={<SimplePieTooltip />} />
          <Legend verticalAlign="bottom" height={32} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Tooltip styling ──────────────────────────────────────────────────── */
function tooltipStyle() {
  return {
    backgroundColor: 'rgba(255,255,255,0.97)',
    border: '1px solid #dee2e6',
    borderRadius: 8,
    padding: '10px 14px',
    boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
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

/** Extract year from a record's registration date, LMP, or created_at */
function getRecordYear(record) {
  const candidates = [
    record?.date_of_registration,
    record?.date_registered,
    record?.lmp,
    record?.created_at,
  ];
  for (const c of candidates) {
    if (!c) continue;
    const m = String(c).match(/^(\d{4})/);
    if (m) return m[1];
  }
  return '';
}

/** Helper to calculate a rounded percentage */
function pctOf(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

/* ══════════════════════════════════════════════════════════════════════ */

export default function StatisticsView({ isAdmin, userId, allowedBarangays = [], onEditRecord }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [rawRecords, setRawRecords] = useState([]);

  // Filters
  const [selectedBarangay, setSelectedBarangay] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Modal state for record list
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalRecords, setModalRecords] = useState([]); // Array of { id, name }

  const barangayOptions = useMemo(
    () => [
      { value: '', label: 'All barangays' },
      ...(allowedBarangays.length > 0
        ? allowedBarangays.map((b) => ({ value: b, label: b }))
        : BATANGAS_BARANGAYS),
    ],
    [allowedBarangays]
  );

  async function loadStats({ showLoader = true } = {}) {
    if (showLoader) setLoading(true);
    setError('');
    try {
      const data = await fetchStatisticsData({ isAdmin, userId });
      setRawRecords(data?.rawRecords || []);
    } catch (err) {
      setError(err?.message || 'Failed to load statistics.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, [isAdmin, userId]);

  const filteredRecords = useMemo(() => {
    return rawRecords.filter((r) => {
      if (selectedBarangay && r.barangay !== selectedBarangay) return false;
      if (selectedYear && getRecordYear(r) !== selectedYear) return false;
      return true;
    });
  }, [rawRecords, selectedBarangay, selectedYear]);

  const stats = useMemo(() => buildMaternalStatistics(filteredRecords), [filteredRecords]);

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

  const totalMothers = stats?.totals?.mothers || 0;
  const gd = stats?.generalData || {};
  const pr = stats?.pregnancyRelated || {};

  /* ── Build chart data arrays ────────────────────────────────────────── */

  // Solo Parent
  const soloParentData = [
    { name: 'Yes', value: gd.soloParent?.yes || 0 },
    { name: 'No', value: gd.soloParent?.no || 0 },
  ];
  if (gd.soloParent?.unknown) soloParentData.push({ name: 'Unknown', value: gd.soloParent.unknown });
  const soloColors = gd.soloParent?.unknown ? [COLORS.green, COLORS.orange, COLORS.gray] : PIE_YES_NO;

  // 4Ps Member
  const fourPsData = [
    { name: 'Yes', value: gd.fourPs?.yes || 0 },
    { name: 'No', value: gd.fourPs?.no || 0 },
  ];
  if (gd.fourPs?.unknown) fourPsData.push({ name: 'Unknown', value: gd.fourPs.unknown });
  const fourPsColors = gd.fourPs?.unknown ? [COLORS.green, COLORS.orange, COLORS.gray] : PIE_YES_NO;

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
  const phCoveredCount = (gd.philhealth?.member || 0) + (gd.philhealth?.dependent || 0);

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

  // High Risk (donut chart)
  const highRiskPieData = [
    { name: 'High Risk', value: pr.highRisk?.highRiskCount || 0 },
    { name: 'Normal', value: pr.highRisk?.normalCount || 0 },
  ];

  const riskReasons = pr.highRisk?.reasons || [];

  // Teenage pregnancy
  const teenageCount = pr.teenagePregnancy?.count || 0;
  const teenageRate = pr.teenagePregnancy?.rate || 0;
  const teenageTotal = pr.teenagePregnancy?.total || 0;

  // Coverage comparison rows
  const coverageOverview = [
    {
      label: 'PhilHealth Covered (Member / Dependent)',
      count: phCoveredCount,
      pct: pctOf(phCoveredCount, totalMothers),
      color: 'teal',
      onClick: () =>
        showRecords('PhilHealth — Member & Dependent', [
          ...(gd.philhealth?.records?.Member || []),
          ...(gd.philhealth?.records?.Dependent || []),
        ]),
    },
    {
      label: '4Ps Beneficiaries',
      count: gd.fourPs?.yes || 0,
      pct: pctOf(gd.fourPs?.yes || 0, totalMothers),
      color: 'blue',
      onClick: () => showRecords('4Ps Member — Yes', gd.fourPs?.records?.Yes || []),
    },
    {
      label: 'SSS Members',
      count: gd.sss?.member || 0,
      pct: pctOf(gd.sss?.member || 0, totalMothers),
      color: 'indigo',
      onClick: () => showRecords('SSS — Member', gd.sss?.records?.Member || []),
    },
    {
      label: 'GSIS Members',
      count: gd.gsis?.member || 0,
      pct: pctOf(gd.gsis?.member || 0, totalMothers),
      color: 'violet',
      onClick: () => showRecords('GSIS — Member', gd.gsis?.records?.Member || []),
    },
    {
      label: 'Solo Parents',
      count: gd.soloParent?.yes || 0,
      pct: pctOf(gd.soloParent?.yes || 0, totalMothers),
      color: 'orange',
      onClick: () => showRecords('Solo Parent — Yes', gd.soloParent?.records?.Yes || []),
    },
  ];

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
      const payload = data?.payload || data;
      const reason = payload.reason || payload.name;
      const records = payload.records || [];
      if (reason) showRecords(`${chartLabel} — ${reason}`, records);
    };
  }

  /* ── Export helpers ─────────────────────────────────────────────────── */

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

  const hasFilters = Boolean(selectedBarangay || selectedYear);

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <Stack gap="lg">
      {/* ═══════ HEADER + FILTERS ═══════ */}
      <Paper withBorder radius="md" p="md" bg="white">
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <div>
            <Group gap="sm">
              <Title order={3}>Statistics Dashboard</Title>
              <Badge variant="light" color="teal" size="lg">
                {totalMothers} Mother{totalMothers !== 1 ? 's' : ''}
              </Badge>
              <Button
                variant="light"
                color="teal"
                size="compact-sm"
                radius="md"
                loading={refreshing}
                leftSection={<RefreshCw size={14} />}
                onClick={async () => {
                  setRefreshing(true);
                  try {
                    await loadStats({ showLoader: false });
                  } finally {
                    setRefreshing(false);
                  }
                }}
              >
                Refresh
              </Button>
            </Group>
            <Text c="dimmed" size="xs" mt={4}>
              Click any chart segment, bar, or summary card to inspect and edit matching patient records.
            </Text>
          </div>

          <Group gap="sm" align="flex-end" wrap="wrap">
            <Select
              label="Barangay"
              placeholder="All barangays"
              data={barangayOptions}
              value={selectedBarangay}
              onChange={(v) => setSelectedBarangay(v ?? '')}
              clearable
              size="xs"
              w={190}
            />
            <Select
              label="Year"
              placeholder="All years"
              data={YEAR_OPTIONS}
              value={selectedYear}
              onChange={(v) => setSelectedYear(v ?? '')}
              clearable
              size="xs"
              w={130}
            />
            {hasFilters && (
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                leftSection={<FilterX size={14} />}
                onClick={() => {
                  setSelectedBarangay('');
                  setSelectedYear('');
                }}
              >
                Reset
              </Button>
            )}
          </Group>
        </Group>
      </Paper>

      {/* ═══════ TOP KPI SUMMARY STRIP ═══════ */}
      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">
        <Paper
          withBorder
          radius="md"
          p="md"
          style={{ borderLeft: `4px solid ${COLORS.teal}` }}
        >
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Total Tracked Mothers
              </Text>
              <Text size="2rem" fw={800} lh={1.1} mt={4}>
                {totalMothers}
              </Text>
              <Text size="xs" c="dimmed" mt={6}>
                {selectedBarangay || 'All Barangays'} • {selectedYear || 'All Years'}
              </Text>
            </div>
            <ThemeIcon size="lg" radius="md" variant="light" color="teal">
              <Users size={20} />
            </ThemeIcon>
          </Group>
        </Paper>

        <Paper
          withBorder
          radius="md"
          p="md"
          style={{ borderLeft: `4px solid ${COLORS.red}`, cursor: 'pointer' }}
          onClick={() => showRecords('High Risk — High Risk', pr.highRisk?.records?.['High Risk'] || [])}
        >
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                High Risk Rate
              </Text>
              <Group align="baseline" gap={6} mt={4}>
                <Text size="2rem" fw={800} lh={1.1} c="red">
                  {pr.highRisk?.rate || 0}%
                </Text>
                <Text size="xs" c="dimmed" fw={600}>
                  ({pr.highRisk?.highRiskCount || 0} cases)
                </Text>
              </Group>
              <Progress value={pr.highRisk?.rate || 0} color="red" size="sm" radius="xl" mt={10} />
            </div>
            <ThemeIcon size="lg" radius="md" variant="light" color="red">
              <AlertTriangle size={20} />
            </ThemeIcon>
          </Group>
        </Paper>

        <Paper
          withBorder
          radius="md"
          p="md"
          style={{ borderLeft: `4px solid ${COLORS.teal}`, cursor: 'pointer' }}
          onClick={() => showRecords('8 ANC Completion — Completed', pr.ancCompletion?.records?.Completed || [])}
        >
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                8 ANC Completion
              </Text>
              <Group align="baseline" gap={6} mt={4}>
                <Text size="2rem" fw={800} lh={1.1} c="teal">
                  {pr.ancCompletion?.rate || 0}%
                </Text>
                <Text size="xs" c="dimmed" fw={600}>
                  ({pr.ancCompletion?.completed || 0}/{totalMothers})
                </Text>
              </Group>
              <Progress value={pr.ancCompletion?.rate || 0} color="teal" size="sm" radius="xl" mt={10} />
            </div>
            <ThemeIcon size="lg" radius="md" variant="light" color="teal">
              <CheckCircle2 size={20} />
            </ThemeIcon>
          </Group>
        </Paper>

        <Paper
          withBorder
          radius="md"
          p="md"
          style={{ borderLeft: `4px solid ${COLORS.blue}`, cursor: 'pointer' }}
          onClick={() => showRecords('4 PNC Completion — Completed', pr.postpartumCompletion?.records?.Completed || [])}
        >
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                4 PNC Completion
              </Text>
              <Group align="baseline" gap={6} mt={4}>
                <Text size="2rem" fw={800} lh={1.1} c="blue">
                  {pr.postpartumCompletion?.rate || 0}%
                </Text>
                <Text size="xs" c="dimmed" fw={600}>
                  ({pr.postpartumCompletion?.completed || 0}/{totalMothers})
                </Text>
              </Group>
              <Progress value={pr.postpartumCompletion?.rate || 0} color="blue" size="sm" radius="xl" mt={10} />
            </div>
            <ThemeIcon size="lg" radius="md" variant="light" color="blue">
              <Activity size={20} />
            </ThemeIcon>
          </Group>
        </Paper>
      </SimpleGrid>

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

      {/* ════════════ SECTION 1: PREGNANCY RELATED STATISTICS ════════════ */}
      <Title order={4}>Pregnancy & Clinical Outcomes</Title>
      <Grid>
        {/* ── Completion of 8 ANC (Radial Gauge) ── */}
        <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
          <ChartPaper
            title="Completion of 8 ANC"
            subtitle="Target prenatal visits completion"
            icon={<CheckCircle2 size={16} />}
            color="teal"
            onExport={() => handleExport('Completion of 8 ANC', pr.ancCompletion?.records)}
          >
            <CompletionGaugeChart
              completed={pr.ancCompletion?.completed || 0}
              notCompleted={pr.ancCompletion?.notCompleted || 0}
              rate={pr.ancCompletion?.rate || 0}
              accentColor={COLORS.teal}
              onSliceClick={onPieClick(pr.ancCompletion?.records, '8 ANC Completion')}
            />
          </ChartPaper>
        </Grid.Col>

        {/* ── Completed Postpartum Visit (4 PNC Radial Gauge) ── */}
        <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
          <ChartPaper
            title="Completed Postpartum Visit"
            subtitle="4 PNC contacts completion"
            icon={<Activity size={16} />}
            color="blue"
            onExport={() => handleExport('Completed Postpartum Visit (4 PNC)', pr.postpartumCompletion?.records)}
          >
            <CompletionGaugeChart
              completed={pr.postpartumCompletion?.completed || 0}
              notCompleted={pr.postpartumCompletion?.notCompleted || 0}
              rate={pr.postpartumCompletion?.rate || 0}
              accentColor={COLORS.blue}
              onSliceClick={onPieClick(pr.postpartumCompletion?.records, '4 PNC Completion')}
            />
          </ChartPaper>
        </Grid.Col>

        {/* ── High Risk Pregnancy Rate (Donut chart) ── */}
        <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
          <ChartPaper
            title="High Risk Pregnancy Rate"
            subtitle={`${pr.highRisk?.highRiskCount || 0} of ${totalMothers} classified as high risk`}
            icon={<HeartPulse size={16} />}
            color="red"
            onExport={() => handleExport('High Risk Pregnancy Rate', pr.highRisk?.records)}
          >
            <DonutChartWithCenter
              data={highRiskPieData}
              colors={[COLORS.red, COLORS.green]}
              onSliceClick={onPieClick(pr.highRisk?.records, 'High Risk')}
              centerValue={`${pr.highRisk?.rate || 0}%`}
              centerLabel="High Risk"
              centerColor={COLORS.red}
            />
          </ChartPaper>
        </Grid.Col>

        {/* ── Reasons of High Risk Pregnancy (Horizontal Ranked Bar Chart) ── */}
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <ChartPaper
            title="Reasons of High Risk Pregnancy"
            subtitle="Ranked by number of cases — click any bar to view records"
            icon={<BarChart3 size={16} />}
            color="red"
            height={Math.max(310, riskReasons.length * 42 + 60)}
            onExport={() => handleBarExport('Reasons of High Risk Pregnancy', riskReasons)}
          >
            {riskReasons.length === 0 ? (
              <Group justify="center" align="center" h="100%">
                <Text c="dimmed" size="sm">No high risk cases recorded yet.</Text>
              </Group>
            ) : (
              <ResponsiveContainer>
                <BarChart
                  data={riskReasons}
                  layout="vertical"
                  margin={{ top: 8, right: 38, left: 12, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="reason"
                    width={175}
                    tick={{ fontSize: 12, fontWeight: 600, fill: '#343a40' }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={tooltipStyle()}>
                          <Text size="sm" fw={700} mb={2}>{d.reason}</Text>
                          <Text size="sm">{d.count} case{d.count !== 1 ? 's' : ''}</Text>
                          <Text size="xs" c="dimmed" mt={6} fs="italic">Click to view records</Text>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="count"
                    name="Cases"
                    radius={[0, 6, 6, 0]}
                    barSize={24}
                    onClick={onBarClick('High Risk Reason')}
                    style={{ cursor: 'pointer' }}
                  >
                    {riskReasons.map((entry, idx) => (
                      <Cell
                        key={entry.reason}
                        fill={RISK_BAR_SHADES[Math.min(idx, RISK_BAR_SHADES.length - 1)]}
                      />
                    ))}
                    <LabelList
                      dataKey="count"
                      position="right"
                      style={{ fontSize: 12, fontWeight: 700, fill: '#c92a2a' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartPaper>
        </Grid.Col>

        {/* ── Teenage Pregnancy Cases ── */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <ChartPaper
            title="Teenage Pregnancy Cases"
            subtitle="Mothers aged 10–19 years"
            icon={<Baby size={16} />}
            color="orange"
            onExport={handleTeenageExport}
          >
            <Stack
              align="center"
              justify="center"
              h="100%"
              gap="sm"
              style={{ cursor: 'pointer' }}
              onClick={() => showRecords('Teenage Pregnancy Cases', pr.teenagePregnancy?.records || [])}
            >
              <RingProgress
                size={150}
                thickness={14}
                roundCaps
                sections={[{ value: teenageRate, color: 'orange' }]}
                label={
                  <div style={{ textAlign: 'center' }}>
                    <Text size="2.2rem" fw={800} c="orange" lh={1}>
                      {teenageCount}
                    </Text>
                    <Text size="xs" c="dimmed" fw={600} mt={2}>
                      case{teenageCount !== 1 ? 's' : ''}
                    </Text>
                  </div>
                }
              />
              <Paper withBorder radius="md" p="sm" bg="orange.0" w="100%" maw={230}>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed" fw={600}>Share of Mothers</Text>
                  <Text size="sm" fw={800} c="orange">{teenageRate}%</Text>
                </Group>
                <Group justify="space-between" mt={4}>
                  <Text size="xs" c="dimmed" fw={600}>Total Evaluated</Text>
                  <Text size="xs" fw={700}>{teenageTotal} mothers</Text>
                </Group>
              </Paper>
              <Text size="xs" c="dimmed" fs="italic">Click to view records</Text>
            </Stack>
          </ChartPaper>
        </Grid.Col>
      </Grid>

      {/* ════════════ SECTION 2: GENERAL DATA & DEMOGRAPHICS ════════════ */}
      <Title order={4} mt="xs">Demographics & Benefits Coverage</Title>

      {/* ── Quick Comparison Bar Card for Benefits & Social Indicators ── */}
      <Paper withBorder radius="md" p="md">
        <Group justify="space-between" mb="sm">
          <div>
            <Text fw={700} size="sm">Social & Government Benefits Snapshot</Text>
            <Text size="xs" c="dimmed">Click any bar to view mothers in that group</Text>
          </div>
          <ThemeIcon variant="light" color="teal" radius="md">
            <Shield size={16} />
          </ThemeIcon>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="md">
          {coverageOverview.map((item) => (
            <Box
              key={item.label}
              p="xs"
              style={{
                borderRadius: 8,
                border: '1px solid #e9ecef',
                cursor: 'pointer',
              }}
              onClick={item.onClick}
            >
              <Group justify="space-between" mb={4} wrap="nowrap">
                <Text size="xs" fw={600} lineClamp={1} title={item.label}>
                  {item.label}
                </Text>
                <Badge size="sm" variant="light" color={item.color}>
                  {item.pct}%
                </Badge>
              </Group>
              <Progress value={item.pct} color={item.color} size="md" radius="xl" />
              <Text size="xs" c="dimmed" mt={4}>
                {item.count} of {totalMothers} mothers
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </Paper>

      <Grid>
        {/* ── PhilHealth ── */}
        <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
          <ChartPaper
            title="PhilHealth Status"
            subtitle="Hover on Member for type breakdown"
            icon={<Shield size={16} />}
            onExport={() => handleExport('PhilHealth Member', gd.philhealth?.records)}
          >
            <DonutChartWithCenter
              data={philhealthData}
              colors={phColors}
              onSliceClick={onPieClick(gd.philhealth?.records, 'PhilHealth')}
              tooltipContent={<SubBreakdownTooltip breakdownMap={gd.philhealth?.byType} targetSliceName="Member" />}
              centerValue={`${pctOf(phCoveredCount, totalMothers)}%`}
              centerLabel="Covered"
              centerColor={COLORS.green}
            />
          </ChartPaper>
        </Grid.Col>

        {/* ── 4Ps Member ── */}
        <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
          <ChartPaper
            title="4Ps Member"
            subtitle="Pantawid Pamilya beneficiary status"
            icon={<UserCheck size={16} />}
            onExport={() => handleExport('4Ps Member', gd.fourPs?.records)}
          >
            <DonutChartWithCenter
              data={fourPsData}
              colors={fourPsColors}
              onSliceClick={onPieClick(gd.fourPs?.records, '4Ps Member')}
              centerValue={`${pctOf(gd.fourPs?.yes || 0, totalMothers)}%`}
              centerLabel="4Ps Yes"
              centerColor={COLORS.green}
            />
          </ChartPaper>
        </Grid.Col>

        {/* ── Solo Parent ── */}
        <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
          <ChartPaper
            title="Solo Parent"
            subtitle="Solo parent status distribution"
            icon={<UserCheck size={16} />}
            onExport={() => handleExport('Solo Parent', gd.soloParent?.records)}
          >
            <DonutChartWithCenter
              data={soloParentData}
              colors={soloColors}
              onSliceClick={onPieClick(gd.soloParent?.records, 'Solo Parent')}
              centerValue={`${pctOf(gd.soloParent?.yes || 0, totalMothers)}%`}
              centerLabel="Solo Parent"
              centerColor={COLORS.green}
            />
          </ChartPaper>
        </Grid.Col>

        {/* ── SSS Member ── */}
        <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
          <ChartPaper
            title="SSS Member"
            subtitle="Social Security System membership"
            icon={<Shield size={16} />}
            onExport={() => handleExport('SSS Member', gd.sss?.records)}
          >
            <DonutChartWithCenter
              data={sssData}
              colors={sssColors}
              onSliceClick={onPieClick(gd.sss?.records, 'SSS')}
              centerValue={`${pctOf(gd.sss?.member || 0, totalMothers)}%`}
              centerLabel="Member"
              centerColor={COLORS.green}
            />
          </ChartPaper>
        </Grid.Col>

        {/* ── GSIS Member ── */}
        <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
          <ChartPaper
            title="GSIS Member"
            subtitle="Government Service Insurance membership"
            icon={<Shield size={16} />}
            onExport={() => handleExport('GSIS Member', gd.gsis?.records)}
          >
            <DonutChartWithCenter
              data={gsisData}
              colors={gsisColors}
              onSliceClick={onPieClick(gd.gsis?.records, 'GSIS')}
              centerValue={`${pctOf(gd.gsis?.member || 0, totalMothers)}%`}
              centerLabel="Member"
              centerColor={COLORS.green}
            />
          </ChartPaper>
        </Grid.Col>

        {/* ── Birth Registration Status ── */}
        <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
          <ChartPaper
            title="Birth Registration Status"
            subtitle="Newborn civil registration status"
            icon={<PieChartIcon size={16} />}
            onExport={() => handleExport('Birth Registration Status', gd.birthRegistration?.records)}
          >
            <DonutChartWithCenter
              data={birthRegData}
              colors={birthRegColors}
              onSliceClick={onPieClick(gd.birthRegistration?.records, 'Birth Registration')}
              centerValue={`${pctOf(gd.birthRegistration?.registered || 0, totalMothers)}%`}
              centerLabel="Registered"
              centerColor={COLORS.green}
            />
          </ChartPaper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
