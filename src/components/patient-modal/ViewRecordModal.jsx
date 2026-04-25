import { Modal, Paper, Box, Stack, Group, Grid, Text, Badge, Button, Progress, Table, Divider, ThemeIcon, ScrollArea } from '@mantine/core';
import { Edit, User, Phone, MapPin, Baby, Stethoscope, Syringe, Pill, TestTube, Clock, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { formatDate } from '../../lib/formatters';
import { getAgeGroup, calculateAOGData, calculateEDC } from '../../lib/patientHelpers';

/* ── helpers ─────────────────────────────────────────────────────── */

function getBpStatus(systolic, diastolic) {
  const s = Number(systolic);
  const d = Number(diastolic);
  if (!s && !d) return '';
  if (s >= 140 || d >= 90) return 'High';
  return 'Normal';
}

/** Render a key-value pair as a clean label */
function Field({ label, value, color, fw = 500, span }) {
  return (
    <Grid.Col span={span || { base: 12, xs: 6, sm: 4 }}>
      <Text size="xs" c="dimmed" fw={600} mb={2}>{label}</Text>
      <Text size="sm" fw={fw} c={color || (value ? 'dark' : 'dimmed')}>{value || '—'}</Text>
    </Grid.Col>
  );
}

function YesNoBadge({ value, yesLabel = 'Yes', noLabel = 'No' }) {
  if (value === true || value === 'Yes') return <Badge size="sm" color="green" variant="light">{yesLabel}</Badge>;
  if (value === false || value === 'No') return <Badge size="sm" color="gray" variant="light">{noLabel}</Badge>;
  return <Text size="sm" c="dimmed">—</Text>;
}

function SectionHeader({ title, icon: Icon, color = 'blue' }) {
  return (
    <Box bg={`${color}.0`} p="xs" style={{ borderBottom: '1px solid #dee2e6' }}>
      <Group gap="xs" justify="center">
        {Icon && <Icon size={16} />}
        <Text size="sm" fw={700} c={`${color}.9`}>{title}</Text>
      </Group>
    </Box>
  );
}

/* ── main component ──────────────────────────────────────────────── */

export default function ViewRecordModal({ patient, opened, onClose, onEdit }) {
  if (!patient) return null;

  const p = patient;
  const fullName = `${p.last_name || ''}, ${p.first_name || ''} ${p.middle_name || ''}`.trim();
  const ageGroup = getAgeGroup(p.age);
  const { aog: currentAOG } = p.lmp ? calculateAOGData(p.lmp, new Date().toISOString().split('T')[0]) : { aog: '' };

  const prenatalVisits = p.prenatal_visits || [];
  const supplementsIfa = p.supplements_ifa || [];
  const supplementsMms = p.supplements_mms || [];
  const supplementsCalcium = p.supplements_calcium || [];
  const labLogs = p.lab_logs || [];
  const postpartumLogs = p.postpartum_logs || [];
  const pncDates = [p.pnc_date_1, p.pnc_date_2, p.pnc_date_3, p.pnc_date_4].filter(Boolean);
  const babyDetails = Array.isArray(p.baby_details) ? p.baby_details : [];

  const totalIFA = supplementsIfa.reduce((s, i) => s + (Number(i.count) || 0), 0);
  const totalMMS = supplementsMms.reduce((s, i) => s + (Number(i.count) || 0), 0);
  const totalCalcium = supplementsCalcium.reduce((s, i) => s + (Number(i.count) || 0), 0);
  const totalPostpartum = postpartumLogs.reduce((s, i) => s + (Number(i.count) || 0), 0);
  const ifaProgress = Math.min((totalIFA / 180) * 100, 100);
  const postpartumProgress = Math.min((totalPostpartum / 90) * 100, 100);

  const hasLabPositive = labLogs.some(l => ['With Anemia', 'Positive', 'With UTI'].includes(l.result));
  const isHighRisk = p.is_high_risk || p.manual_risk || hasLabPositive;

  // Immunization
  const tdDoses = [p.td1, p.td2, p.td3, p.td4, p.td5].filter(Boolean).length;
  const isFim = p.td_completed_previously || tdDoses >= 5;

  // Transfer info
  const transferLabel = p.is_transfer && p.transfer_type
    ? p.transfer_type === 'Trans-In'
      ? `Trans-In${p.transfer_from ? ` from ${p.transfer_from}` : ''}`
      : `Trans-Out${p.transfer_to ? ` to ${p.transfer_to}` : ''}`
    : null;

  /* ── Membership labels ─────────────────────────────────────────── */
  const membershipBadges = [];
  if (p.philhealth_status && p.philhealth_status !== 'Not a member') {
    membershipBadges.push({ label: `PhilHealth (${p.philhealth_status}${p.philhealth_type ? ` — ${p.philhealth_type}` : ''})`, color: 'blue' });
  }
  if (p.is_4ps_member === true) membershipBadges.push({ label: '4Ps Member', color: 'teal' });
  if (p.is_solo_parent === true) membershipBadges.push({ label: 'Solo Parent', color: 'orange' });
  if (p.sss_member === true) membershipBadges.push({ label: 'SSS', color: 'green' });
  if (p.gsis_member === true) membershipBadges.push({ label: 'GSIS', color: 'green' });

  // Risk factors
  const riskFactors = [];
  if (p.has_hypertension) riskFactors.push('Hypertension');
  if (p.has_advanced_maternal_age) riskFactors.push('Advanced Maternal Age');
  if (p.has_multiple_gestation) riskFactors.push('Multiple Gestation');
  if (p.has_multiple_miscarriages) riskFactors.push('Multiple Miscarriages');
  if (p.has_obesity) riskFactors.push('Obesity');
  if (p.high_risk_reason) riskFactors.push(p.high_risk_reason);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <ThemeIcon color={isHighRisk ? 'red' : 'teal'} variant="light" size="lg" radius="md">
            <User size={20} />
          </ThemeIcon>
          <div>
            <Text size="lg" fw={800} style={{ letterSpacing: '-0.01em' }}>View Record</Text>
            <Text size="xs" c="dimmed">Patient Summary</Text>
          </div>
        </Group>
      }
      fullScreen
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
    >
      <ScrollArea offsetScrollbars>
        {/* ═══ PATIENT SUMMARY HEADER ═══ */}
        <Paper
          radius="lg"
          p="lg"
          mb="lg"
          style={{
            background: isHighRisk
              ? 'linear-gradient(135deg, #fff5f5 0%, #ffe3e3 100%)'
              : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: `2px solid ${isHighRisk ? '#fca5a5' : '#86efac'}`,
          }}
        >
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Stack gap="sm">
              <Group gap="sm" align="center">
                <Text size="xl" fw={900} style={{ letterSpacing: '-0.02em' }}>{fullName}</Text>
                <Badge size="lg" color={isHighRisk ? 'red' : 'green'} variant="filled" radius="md">
                  {isHighRisk ? 'HIGH RISK' : 'NORMAL'}
                </Badge>
                {transferLabel && (
                  <Badge size="md" color="violet" variant="light" radius="md" leftSection={<ArrowRightLeft size={12} />}>
                    {transferLabel}
                  </Badge>
                )}
              </Group>
              <Group gap="lg" wrap="wrap">
                <Group gap={4}>
                  <Text size="sm" c="dimmed">Age:</Text>
                  <Text size="sm" fw={600}>{p.age || '—'}</Text>
                  {ageGroup && <Text size="xs" c="dimmed">({ageGroup})</Text>}
                </Group>
                <Group gap={4}>
                  <MapPin size={14} style={{ opacity: 0.5 }} />
                  <Text size="sm" fw={500}>{p.address || '—'}</Text>
                </Group>
                {p.contact_no && (
                  <Group gap={4}>
                    <Phone size={14} style={{ opacity: 0.5 }} />
                    <Text size="sm" fw={500}>{p.contact_no}</Text>
                  </Group>
                )}
              </Group>

              {/* Membership badges */}
              {membershipBadges.length > 0 && (
                <Group gap={6}>
                  {membershipBadges.map((b, i) => (
                    <Badge key={i} size="sm" variant="light" color={b.color}>{b.label}</Badge>
                  ))}
                </Group>
              )}

              {/* Risk factors */}
              {isHighRisk && riskFactors.length > 0 && (
                <Group gap={6}>
                  <AlertTriangle size={14} color="red" />
                  <Text size="xs" fw={600} c="red.7">Risk factors: {riskFactors.join(', ')}</Text>
                </Group>
              )}

              {/* Civil status / email */}
              <Group gap="lg">
                {p.civil_status && <Text size="xs" c="dimmed">Civil Status: <Text span fw={600} c="dark">{p.civil_status}</Text></Text>}
                {p.email_address && <Text size="xs" c="dimmed">Email: <Text span fw={500} c="dark">{p.email_address}</Text></Text>}
              </Group>
            </Stack>

            <Paper p="sm" radius="md" withBorder style={{ minWidth: 260, background: 'rgba(255,255,255,0.7)' }}>
              <Grid gutter="xs">
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed" fw={600}>LMP</Text>
                  <Text size="sm" fw={700}>{formatDate(p.lmp) || '—'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed" fw={600}>EDC</Text>
                  <Text size="sm" fw={700} c="teal">{formatDate(p.edc) || '—'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed" fw={600}>AOG</Text>
                  <Text size="sm" fw={700} c="blue">{currentAOG || '—'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed" fw={600}>Registered</Text>
                  <Text size="sm" fw={500}>{formatDate(p.date_of_registration) || '—'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed" fw={600}>Gravida</Text>
                  <Text size="sm" fw={700}>G{p.gravida ?? '—'}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed" fw={600}>Parity</Text>
                  <Text size="sm" fw={700}>P{p.parity ?? '—'}</Text>
                </Grid.Col>
              </Grid>
            </Paper>
          </Group>
        </Paper>

        {/* ═══ DATA SECTIONS ═══ */}
        <Stack gap="md">

              {/* ── Prenatal Checkup ── */}
              <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
                <SectionHeader title={`Prenatal Checkups (${prenatalVisits.length}/8 ANC)`} icon={Stethoscope} color="teal" />
                <Box p="sm">
                  <Group gap="sm" mb="sm">
                    <Badge color={prenatalVisits.length >= 8 ? 'green' : 'gray'} variant="light" size="lg">
                      {prenatalVisits.length >= 8 ? '✓ 8ANC Completed' : `${prenatalVisits.length} of 8 visits`}
                    </Badge>
                  </Group>
                  {prenatalVisits.length > 0 ? (
                    <Box style={{ overflowX: 'auto' }}>
                      <Table striped withTableBorder fontSize="xs">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>#</Table.Th>
                            <Table.Th>Date</Table.Th>
                            <Table.Th>AOG</Table.Th>
                            <Table.Th>Trimester</Table.Th>
                            <Table.Th>Ht/Wt</Table.Th>
                            <Table.Th>BMI</Table.Th>
                            <Table.Th>BP</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {prenatalVisits.map((v, i) => {
                            const bp = getBpStatus(v.bp_systolic, v.bp_diastolic);
                            return (
                              <Table.Tr key={i}>
                                <Table.Td fw={600}>{i + 1}</Table.Td>
                                <Table.Td>{formatDate(v.date)}</Table.Td>
                                <Table.Td>{v.aog || '—'}</Table.Td>
                                <Table.Td>{v.trimester || '—'}</Table.Td>
                                <Table.Td>{v.height || v.weight ? `${v.height || '—'}cm / ${v.weight || '—'}kg` : '—'}</Table.Td>
                                <Table.Td>{v.bmi ? `${v.bmi} (${v.bmi_category || ''})` : '—'}</Table.Td>
                                <Table.Td>
                                  {v.bp_systolic || v.bp_diastolic ? (
                                    <Badge size="sm" color={bp === 'High' ? 'red' : 'green'} variant="light">
                                      {v.bp_systolic || '—'}/{v.bp_diastolic || '—'}
                                    </Badge>
                                  ) : '—'}
                                </Table.Td>
                              </Table.Tr>
                            );
                          })}
                        </Table.Tbody>
                      </Table>
                    </Box>
                  ) : (
                    <Text size="sm" c="dimmed" ta="center" py="xs">No prenatal visits recorded</Text>
                  )}
                </Box>
              </Paper>

              {/* ── Immunization Status ── */}
              <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
                <SectionHeader title="Immunization Status" icon={Syringe} color="indigo" />
                <Box p="sm">
                  <Grid>
                    <Grid.Col span={4}>
                      <Text size="xs" c="dimmed" fw={600}>Td Doses</Text>
                      <Text size="xl" fw={900}>{p.td_completed_previously ? 'Prev.' : tdDoses}</Text>
                    </Grid.Col>
                    <Grid.Col span={4}>
                      <Text size="xs" c="dimmed" fw={600}>FIM</Text>
                      <Badge size="lg" color={isFim ? 'green' : 'gray'} variant="light">
                        {isFim ? 'Yes' : 'No'}
                      </Badge>
                    </Grid.Col>
                    <Grid.Col span={4}>
                      <Text size="xs" c="dimmed" fw={600}>Deworming</Text>
                      <YesNoBadge value={p.is_deworming_given} />
                      {p.is_deworming_given && p.deworming_date && (
                        <Text size="xs" c="dimmed" mt={2}>{formatDate(p.deworming_date)}</Text>
                      )}
                    </Grid.Col>
                  </Grid>
                  {!p.td_completed_previously && tdDoses > 0 && (
                    <Box mt="sm">
                      <Text size="xs" c="dimmed" fw={600} mb={4}>Td Dates</Text>
                      <Group gap="xs">
                        {[p.td1, p.td2, p.td3, p.td4, p.td5].map((d, i) => d && (
                          <Badge key={i} size="sm" variant="light" color="indigo">Td{i + 1}: {formatDate(d)}</Badge>
                        ))}
                      </Group>
                    </Box>
                  )}
                </Box>
              </Paper>

              {/* ── Supplementation ── */}
              <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
                <SectionHeader title="Prenatal Supplementation" icon={Pill} color="blue" />
                <Box p="sm">
                  <Grid gutter="md">
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <Paper withBorder p="xs" radius="sm">
                        <Text size="xs" fw={700} c="blue.7" mb={4}>IFA</Text>
                        <Text size="sm" fw={600}>{totalIFA} / 180 tablets</Text>
                        <Progress value={ifaProgress} color={totalIFA >= 180 ? 'green' : 'blue'} size="sm" radius="xl" mt={4} />
                        {totalIFA >= 180 && <Badge size="xs" color="green" mt={4}>COMPLETED</Badge>}
                        {p.ifa_frequency && <Text size="xs" c="dimmed" mt={4}>Freq: {p.ifa_frequency}{p.ifa_frequency === 'Others' && p.ifa_frequency_other ? ` (${p.ifa_frequency_other})` : ''}</Text>}
                      </Paper>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <Paper withBorder p="xs" radius="sm">
                        <Text size="xs" fw={700} c="cyan.7" mb={4}>MMS</Text>
                        <Text size="sm" fw={600}>{totalMMS} tablets</Text>
                        <Text size="xs" c="dimmed" mt={4}>Completed: {p.mms_completed ? 'Yes' : 'No'}</Text>
                        {p.mms_frequency && <Text size="xs" c="dimmed" mt={2}>Freq: {p.mms_frequency}{p.mms_frequency === 'Others' && p.mms_frequency_other ? ` (${p.mms_frequency_other})` : ''}</Text>}
                      </Paper>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <Paper withBorder p="xs" radius="sm">
                        <Text size="xs" fw={700} c="orange.7" mb={4}>Calcium Carbonate</Text>
                        <Text size="sm" fw={600}>{totalCalcium} tablets</Text>
                        <Text size="xs" c="dimmed" mt={4}>Completed: {p.calcium_carbonate_completed ? 'Yes' : 'No'}</Text>
                        {p.cc_frequency && <Text size="xs" c="dimmed" mt={2}>Freq: {p.cc_frequency}{p.cc_frequency === 'Others' && p.cc_frequency_other ? ` (${p.cc_frequency_other})` : ''}</Text>}
                      </Paper>
                    </Grid.Col>
                  </Grid>
                </Box>
              </Paper>

              {/* ── Laboratory Screenings ── */}
              <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
                <SectionHeader title={`Laboratory Results (${labLogs.length})`} icon={TestTube} color="grape" />
                <Box p="sm">
                  {labLogs.length > 0 ? (
                    <Box style={{ overflowX: 'auto' }}>
                      <Table striped withTableBorder fontSize="xs">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Test</Table.Th>
                            <Table.Th>Date</Table.Th>
                            <Table.Th>Result</Table.Th>
                            <Table.Th>Details</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {[...labLogs].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((log, i) => {
                            const isBad = ['Positive', 'With Anemia', 'With UTI'].includes(log.result);
                            const details = [];
                            if (log.type === 'CBC' && log.hemoglobin) details.push(`Hgb: ${log.hemoglobin} g/dL`);
                            if (log.type === 'Urinalysis' && log.remarks) details.push(log.remarks);
                            return (
                              <Table.Tr key={i} bg={isBad ? 'red.0' : undefined}>
                                <Table.Td fw={500}>{log.type}</Table.Td>
                                <Table.Td>{formatDate(log.date)}</Table.Td>
                                <Table.Td>
                                  <Badge size="sm" color={isBad ? 'red' : 'gray'}>{log.result}</Badge>
                                </Table.Td>
                                <Table.Td c="dimmed">{details.join(', ') || '—'}</Table.Td>
                              </Table.Tr>
                            );
                          })}
                        </Table.Tbody>
                      </Table>
                    </Box>
                  ) : (
                    <Text size="sm" c="dimmed" ta="center" py="xs">No lab results recorded</Text>
                  )}
                </Box>
              </Paper>

              {/* ── Delivery & Birth ── */}
              <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
                <SectionHeader title="Labor, Delivery & Birth Outcomes" icon={Baby} color="pink" />
                <Box p="sm">
                  {p.delivery_outcome ? (
                    <>
                      <Grid gutter="xs" mb="sm">
                        <Field label="Outcome" value={
                          { FT: 'Full Term', PT: 'Pre-term', FD: 'Fetal Death', AB: 'Abortion' }[p.delivery_outcome] || p.delivery_outcome
                        } color={['FD', 'AB'].includes(p.delivery_outcome) ? 'red' : 'green'} fw={700} />
                        <Field label="Delivery Mode" value={
                          { CS: 'Cesarean Section', VD: 'Vaginal Delivery', CVCD: 'Combined Vaginal-Cesarean' }[p.delivery_mode] || p.delivery_mode || '—'
                        } />
                        <Field label="Date Terminated" value={formatDate(p.delivery_date)} />
                        <Field label="Attendant" value={p.delivery_attendant || '—'} />
                        <Field label="Place" value={p.delivery_place || '—'} />
                        <Field label="Facility Type" value={p.delivery_facility_type || '—'} />
                        {p.delivery_place === 'Lying In' && p.lying_in_clinic_name && (
                          <Field label="Lying In Clinic" value={p.lying_in_clinic_name} />
                        )}
                        <Field label="BEmONC/CEmONC" value={p.delivery_place_capable || '—'} />
                        <Field label="Place of Birth" value={p.place_of_birth || '—'} />
                        {p.place_of_birth === 'Outside Batangas City' && p.place_of_birth_specify && (
                          <Field label="Specify Area" value={p.place_of_birth_specify} />
                        )}
                        {p.pregnancy_outcome_remarks && (
                          <Field label="Remarks" value={p.pregnancy_outcome_remarks} span={{ base: 12 }} />
                        )}
                      </Grid>

                      {/* Baby details */}
                      {babyDetails.length > 0 && (
                        <>
                          <Text size="xs" fw={700} c="dimmed" mb={4}>Baby Details ({babyDetails.length})</Text>
                          <Box style={{ overflowX: 'auto' }}>
                            <Table striped withTableBorder fontSize="xs">
                              <Table.Thead>
                                <Table.Tr>
                                  <Table.Th>#</Table.Th>
                                  <Table.Th>Date</Table.Th>
                                  <Table.Th>Time</Table.Th>
                                  <Table.Th>Weight</Table.Th>
                                  <Table.Th>Category</Table.Th>
                                  <Table.Th>Sex</Table.Th>
                                  <Table.Th>Status</Table.Th>
                                </Table.Tr>
                              </Table.Thead>
                              <Table.Tbody>
                                {babyDetails.map((baby, i) => (
                                  <Table.Tr key={i}>
                                    <Table.Td fw={600}>Baby {i + 1}</Table.Td>
                                    <Table.Td>{formatDate(baby.delivery_date) || '—'}</Table.Td>
                                    <Table.Td>{baby.delivery_time || '—'}</Table.Td>
                                    <Table.Td>{baby.weight ? `${baby.weight}g` : '—'}</Table.Td>
                                    <Table.Td>
                                      {baby.category && (
                                        <Badge size="xs" color={baby.category === 'Low' ? 'red' : 'green'} variant="light">{baby.category}</Badge>
                                      )}
                                    </Table.Td>
                                    <Table.Td>{baby.sex || '—'}</Table.Td>
                                    <Table.Td>
                                      <Text size="xs" fw={600} c={baby.status === 'Fetal Death' ? 'red' : 'green'}>{baby.status || 'Live Birth'}</Text>
                                    </Table.Td>
                                  </Table.Tr>
                                ))}
                              </Table.Tbody>
                            </Table>
                          </Box>
                        </>
                      )}

                      {/* Birth registration */}
                      {p.birth_registered != null && (
                        <Group mt="sm" gap="md">
                          <Text size="xs" c="dimmed" fw={600}>Birth Registered:</Text>
                          <YesNoBadge value={p.birth_registered} />
                          {p.birth_registered && p.birth_registration_date && (
                            <Text size="xs" c="dimmed">{formatDate(p.birth_registration_date)}</Text>
                          )}
                        </Group>
                      )}
                    </>
                  ) : (
                    <Text size="sm" c="dimmed" ta="center" py="xs">No delivery recorded</Text>
                  )}
                </Box>
              </Paper>

              {/* ── Postnatal Care ── */}
              <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
                <SectionHeader title="Postnatal Care & Postpartum Supplementation" icon={Clock} color="violet" />
                <Box p="sm">
                  <Grid gutter="md">
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Text size="xs" fw={700} c="dimmed" mb={4}>4PNC Contacts ({pncDates.length}/4)</Text>
                      <Badge color={pncDates.length >= 4 ? 'green' : 'gray'} variant="light" size="md" mb="xs">
                        {pncDates.length >= 4 ? '✓ 4PNC Completed' : `${pncDates.length} of 4`}
                      </Badge>
                      {pncDates.length > 0 ? (
                        <Stack gap={4}>
                          {pncDates.map((d, i) => (
                            <Text key={i} size="xs"><Text span fw={600}>Contact {i + 1}:</Text> {formatDate(d)}</Text>
                          ))}
                        </Stack>
                      ) : (
                        <Text size="xs" c="dimmed">No PNC contacts recorded</Text>
                      )}
                      {p.pnc_remarks && <Text size="xs" c="dimmed" mt="xs">Remarks: {p.pnc_remarks}</Text>}
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Text size="xs" fw={700} c="dimmed" mb={4}>Postpartum IFA ({totalPostpartum}/90)</Text>
                      <Progress value={postpartumProgress} color={postpartumProgress >= 100 ? 'green' : 'blue'} size="sm" radius="xl" mb={4} />
                      {postpartumProgress >= 100 && <Badge size="xs" color="green" mb={4}>COMPLETED</Badge>}
                      {p.postpartum_ifa_completed_date && (
                        <Text size="xs" c="dimmed">Completed: {formatDate(p.postpartum_ifa_completed_date)}</Text>
                      )}
                      <Divider my="xs" />
                      <Group gap="xl">
                        <Box>
                          <Text size="xs" fw={700} c="dimmed">Vit. A</Text>
                          <YesNoBadge value={!!(p.vit_a_completed_date && String(p.vit_a_completed_date).trim())} />
                          {p.vit_a_completed_date && <Text size="xs" c="dimmed">{formatDate(p.vit_a_completed_date)}</Text>}
                        </Box>
                      </Group>
                    </Grid.Col>
                  </Grid>
                </Box>
              </Paper>

        </Stack>

        {/* ═══ EDIT BUTTON ═══ */}
        <Button
          fullWidth
          mt="lg"
          mb="md"
          size="lg"
          color="blue"
          variant="filled"
          leftSection={<Edit size={20} />}
          onClick={() => {
            onClose();
            if (onEdit) onEdit(p);
          }}
          style={{
            fontWeight: 700,
            boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.25)',
          }}
        >
          Edit this Record
        </Button>
      </ScrollArea>
    </Modal>
  );
}
