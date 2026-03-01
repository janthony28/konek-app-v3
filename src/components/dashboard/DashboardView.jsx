import { Grid, Group, Paper, SimpleGrid, Stack, Table, Text, Title, Badge, Box, Button, ThemeIcon } from '@mantine/core';
import { FileText, Activity, Clock, Phone, AlertTriangle, Baby } from 'lucide-react';
import { formatDate } from '../../lib/formatters';
import { isPatientDue, getLatestPrenatalVisit, isPatientPncDue, getLatestPncDate } from '../../lib/patientHelpers';

/** Format ISO timestamp to date (MM/DD/YYYY) for created_at/updated_at */
function formatIsoDate(iso) {
  if (!iso) return '';
  const datePart = typeof iso === 'string' ? iso.split('T')[0] : '';
  return datePart ? formatDate(datePart) : '';
}

export default function DashboardView({ patients = [], currentTime, handleAddClick, onFilterSelect }) {
  const safePatients = Array.isArray(patients) ? patients : [];
  const recentPatients = [...safePatients]
    .sort((a, b) => {
      const ta = new Date(a.updated_at || a.created_at || 0).getTime();
      const tb = new Date(b.updated_at || b.created_at || 0).getTime();
      return tb - ta;
    })
    .slice(0, 5);
  const highRiskCount = safePatients.filter((p) => p.is_high_risk).length;
  const currentMonthName = currentTime.toLocaleString('default', { month: 'long' });

  // Prenatal overdue (8ANC)
  const allDuePrenatal = safePatients.filter((p) => isPatientDue(p));
  const duePrenatal = allDuePrenatal
    .sort((a, b) => {
      const aLatestVisit = getLatestPrenatalVisit(a.prenatal_visits);
      const bLatestVisit = getLatestPrenatalVisit(b.prenatal_visits);
      if (!aLatestVisit && bLatestVisit) return -1;
      if (aLatestVisit && !bLatestVisit) return 1;
      if (!aLatestVisit && !bLatestVisit) return 0;
      const aDate = aLatestVisit?.date ? new Date(aLatestVisit.date).getTime() : 0;
      const bDate = bLatestVisit?.date ? new Date(bLatestVisit.date).getTime() : 0;
      return aDate - bDate;
    })
    .slice(0, 3);

  // Postnatal overdue (4PNC)
  const allDuePostnatal = safePatients.filter((p) => isPatientPncDue(p));
  const duePostnatal = allDuePostnatal
    .sort((a, b) => {
      const aDate = a.delivery_date ? new Date(a.delivery_date).getTime() : 0;
      const bDate = b.delivery_date ? new Date(b.delivery_date).getTime() : 0;
      return aDate - bDate; // Older deliveries first (more overdue)
    })
    .slice(0, 3);

  const emergencyHotlines = [
    { name: '24/7 EBD Emergency Health Hotline', number: '0999-222-6626' },
    { name: "Mayor's Action Center", number: '723-1511' },
    { name: 'Batangas Medical Center', number: '723-0911' },
    { name: 'City Health Office (CHO)', number: '(043) 723 3103' },
  ];

  const cardStyle = {
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
  };
  const hoverStyle = {
    transform: 'translateY(-6px)',
    boxShadow: '0 12px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)',
  };

  return (
    <Stack gap="lg">
      <Grid align="stretch">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper
            className="dashboard-card hover-lift"
            p="xl"
            radius="lg"
            style={{
              height: '100%',
              background: 'linear-gradient(135deg, #e8f5e9 0%, #ffffff 100%)',
              border: '1px solid rgba(34, 177, 76, 0.15)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }}
          >
            <Title order={2} c="#22B14C" mb="xs" style={{ fontWeight: 800 }}>Welcome Back!</Title>
            <Group mt="md" gap="md">
              <ThemeIcon
                color="teal"
                variant="light"
                size="xl"
                radius="md"
                style={{
                  boxShadow: '0 2px 8px rgba(34, 177, 76, 0.2)',
                }}
              >
                <Clock size={22} />
              </ThemeIcon>
              <Text size="xl" fw={700} c="#22B14C" style={{ letterSpacing: '-0.01em' }}>
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                {' | '}
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </Group>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper
            className="dashboard-card hover-lift"
            p="lg"
            radius="lg"
            style={{
              background: 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)',
              border: '2px solid rgba(250, 82, 82, 0.2)',
              boxShadow: '0 4px 6px -1px rgba(250, 82, 82, 0.15), 0 2px 4px -1px rgba(250, 82, 82, 0.1)',
            }}
          >
            <Group mb="xs" gap="xs">
              <ThemeIcon color="red" variant="light" size="sm" radius="md">
                <Phone size={14} />
              </ThemeIcon>
              <Text fw={700} c="red.9" size="xs" style={{ letterSpacing: '0.05em' }}>EMERGENCY HOTLINES</Text>
            </Group>
            <Stack gap={4}>
              {emergencyHotlines.map(({ name, number }) => (
                <Stack key={name} gap={0}>
                  <Text size="xs" fw={600} c="dark.7" style={{ lineHeight: 1.3 }}>
                    {name}
                  </Text>
                  <Text
                    size="xs"
                    fw={400}
                    c="dark.6"
                    component="span"
                    style={{ whiteSpace: 'nowrap', display: 'block', lineHeight: 1.3 }}
                  >
                    {number}
                  </Text>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
        {/* Total Patients */}
        <Paper
          className="dashboard-card"
          shadow="md"
          p="xl"
          radius="lg"
          style={{
            background: 'linear-gradient(135deg, #e8f5e9 0%, #ffffff 100%)',
            borderLeft: '4px solid #22B14C',
            border: '1px solid rgba(34, 177, 76, 0.15)',
            ...cardStyle
          }}
          onClick={() => onFilterSelect('all')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = hoverStyle.transform;
            e.currentTarget.style.boxShadow = hoverStyle.boxShadow;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
          }}
        >
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                Total Patients
              </Text>
              <Text size="2.5rem" fw={800} c="#22B14C" style={{ lineHeight: 1.2, marginTop: '4px' }}>
                {safePatients.length}
              </Text>
            </div>
            <ThemeIcon
              color="teal"
              variant="light"
              size="xl"
              radius="md"
              style={{
                opacity: 0.8,
                boxShadow: '0 2px 8px rgba(34, 177, 76, 0.2)',
              }}
            >
              <FileText size={32} />
            </ThemeIcon>
          </Group>
        </Paper>

        {/* High-Risk Cases */}
        <Paper
          className="dashboard-card"
          shadow="md"
          p="xl"
          radius="lg"
          style={{
            background: 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)',
            borderLeft: '4px solid #fa5252',
            border: '1px solid rgba(250, 82, 82, 0.1)',
            ...cardStyle
          }}
          onClick={() => onFilterSelect('high_risk')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = hoverStyle.transform;
            e.currentTarget.style.boxShadow = hoverStyle.boxShadow;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
          }}
        >
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                High-Risk Cases
              </Text>
              <Text size="2.5rem" fw={800} c="red" style={{ lineHeight: 1.2, marginTop: '4px' }}>
                {highRiskCount}
              </Text>
            </div>
            <ThemeIcon
              color="red"
              variant="light"
              size="xl"
              radius="md"
              style={{
                opacity: 0.8,
                boxShadow: '0 2px 8px rgba(250, 82, 82, 0.2)',
              }}
            >
              <Activity size={32} />
            </ThemeIcon>
          </Group>
        </Paper>

        {/* Prenatal Due/Overdue (8ANC) */}
        <Paper
          className="dashboard-card"
          shadow="md"
          p="xl"
          radius="lg"
          style={{
            background: 'linear-gradient(135deg, #fff9db 0%, #ffffff 100%)',
            borderLeft: '4px solid #fd7e14',
            border: '1px solid rgba(253, 126, 20, 0.1)',
            ...cardStyle
          }}
          onClick={() => onFilterSelect('due_prenatal')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = hoverStyle.transform;
            e.currentTarget.style.boxShadow = hoverStyle.boxShadow;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
          }}
        >
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                Prenatal Due
              </Text>
              <Text size="2.5rem" fw={800} c="orange" style={{ lineHeight: 1.2, marginTop: '4px' }}>
                {allDuePrenatal.length}
              </Text>
            </div>
            <ThemeIcon
              color="orange"
              variant="light"
              size="xl"
              radius="md"
              style={{
                opacity: 0.8,
                boxShadow: '0 2px 8px rgba(253, 126, 20, 0.2)',
              }}
            >
              <Clock size={32} />
            </ThemeIcon>
          </Group>
        </Paper>

        {/* Postnatal Due/Overdue (4PNC) */}
        <Paper
          className="dashboard-card"
          shadow="md"
          p="xl"
          radius="lg"
          style={{
            background: 'linear-gradient(135deg, #e7f5ff 0%, #ffffff 100%)',
            borderLeft: '4px solid #228be6',
            border: '1px solid rgba(34, 139, 230, 0.1)',
            ...cardStyle
          }}
          onClick={() => onFilterSelect('due_postnatal')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = hoverStyle.transform;
            e.currentTarget.style.boxShadow = hoverStyle.boxShadow;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
          }}
        >
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                Postnatal Due
              </Text>
              <Text size="2.5rem" fw={800} c="blue" style={{ lineHeight: 1.2, marginTop: '4px' }}>
                {allDuePostnatal.length}
              </Text>
            </div>
            <ThemeIcon
              color="blue"
              variant="light"
              size="xl"
              radius="md"
              style={{
                opacity: 0.8,
                boxShadow: '0 2px 8px rgba(34, 139, 230, 0.2)',
              }}
            >
              <Baby size={32} />
            </ThemeIcon>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Prenatal & Postnatal upcoming visits — side by side */}
      {(duePrenatal.length > 0 || duePostnatal.length > 0) && (
        <Grid>
          {/* Prenatal */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper
              className="dashboard-card"
              shadow="md"
              p="md"
              radius="lg"
              h="100%"
              style={{
                background: 'linear-gradient(135deg, #fff9db 0%, #ffffff 100%)',
                border: '2px solid rgba(253, 126, 20, 0.2)',
                boxShadow: '0 4px 6px -1px rgba(253, 126, 20, 0.15), 0 2px 4px -1px rgba(253, 126, 20, 0.1)',
              }}
            >
              <Group mb="xs" gap="xs">
                <ThemeIcon color="orange" variant="light" size="md" radius="md">
                  <AlertTriangle size={16} />
                </ThemeIcon>
                <Text fw={700} c="orange.9" size="md">Due for Prenatal Visit ({allDuePrenatal.length})</Text>
              </Group>
              {duePrenatal.length === 0 ? (
                <Text size="xs" c="dimmed" fs="italic" py="sm">No prenatal overdue patients</Text>
              ) : (
                <Stack gap={6}>
                  {duePrenatal.map((p) => {
                    const latestVisit = getLatestPrenatalVisit(p.prenatal_visits);
                    const lastVisitText = latestVisit ? formatDate(latestVisit.date) : 'No visits yet';
                    const ancCount = Array.isArray(p.prenatal_visits) ? p.prenatal_visits.length : 0;
                    return (
                      <Paper
                        key={p.id}
                        withBorder
                        p="xs"
                        bg="white"
                        radius="sm"
                        style={{ border: '1px solid rgba(253, 126, 20, 0.15)' }}
                      >
                        <Group justify="space-between" wrap="nowrap" gap={8}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <Text size="sm" fw={700} c="dark" truncate>{p.last_name}, {p.first_name}</Text>
                            <Text size="xs" c="dimmed" truncate>
                              {p.barangay ? `Brgy: ${p.barangay}` : ''}
                              {p.contact_no ? ` · 📞 ${p.contact_no}` : ''}
                            </Text>
                          </div>
                          <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                            <Badge color="orange" variant="light" size="sm" radius="md" style={{ fontWeight: 600 }}>
                              ANC: {ancCount}/8
                            </Badge>
                            <Badge color="yellow" variant="light" size="sm" radius="md" style={{ fontWeight: 600 }}>
                              Last: {lastVisitText}
                            </Badge>
                          </Group>
                        </Group>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
              <Button variant="subtle" color="orange" fullWidth mt="xs" size="xs" onClick={() => onFilterSelect('due_prenatal')} style={{ fontWeight: 600 }}>
                View All Prenatal Due Patients
              </Button>
            </Paper>
          </Grid.Col>

          {/* Postnatal */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper
              className="dashboard-card"
              shadow="md"
              p="md"
              radius="lg"
              h="100%"
              style={{
                background: 'linear-gradient(135deg, #e7f5ff 0%, #ffffff 100%)',
                border: '2px solid rgba(34, 139, 230, 0.2)',
                boxShadow: '0 4px 6px -1px rgba(34, 139, 230, 0.15), 0 2px 4px -1px rgba(34, 139, 230, 0.1)',
              }}
            >
              <Group mb="xs" gap="xs">
                <ThemeIcon color="blue" variant="light" size="md" radius="md">
                  <Baby size={16} />
                </ThemeIcon>
                <Text fw={700} c="blue.9" size="md">Due for Postnatal Visit ({allDuePostnatal.length})</Text>
              </Group>
              {duePostnatal.length === 0 ? (
                <Text size="xs" c="dimmed" fs="italic" py="sm">No postnatal overdue patients</Text>
              ) : (
                <Stack gap={6}>
                  {duePostnatal.map((p) => {
                    const contactsDone = [p.pnc_date_1, p.pnc_date_2, p.pnc_date_3, p.pnc_date_4].filter(Boolean).length;
                    const lastPnc = getLatestPncDate(p);
                    const lastPncText = lastPnc ? formatDate(lastPnc) : 'No PNC yet';
                    return (
                      <Paper
                        key={p.id}
                        withBorder
                        p="xs"
                        bg="white"
                        radius="sm"
                        style={{ border: '1px solid rgba(34, 139, 230, 0.15)' }}
                      >
                        <Group justify="space-between" wrap="nowrap" gap={8}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <Text size="sm" fw={700} c="dark" truncate>{p.last_name}, {p.first_name}</Text>
                            <Text size="xs" c="dimmed" truncate>
                              {p.barangay ? `Brgy: ${p.barangay}` : ''}
                              {p.contact_no ? ` · 📞 ${p.contact_no}` : ''}
                            </Text>
                          </div>
                          <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                            <Badge color="blue" variant="light" size="sm" radius="md" style={{ fontWeight: 600 }}>
                              PNC: {contactsDone}/4
                            </Badge>
                            <Badge color="cyan" variant="light" size="sm" radius="md" style={{ fontWeight: 600 }}>
                              Last: {lastPncText}
                            </Badge>
                          </Group>
                        </Group>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
              <Button variant="subtle" color="blue" fullWidth mt="xs" size="xs" onClick={() => onFilterSelect('due_postnatal')} style={{ fontWeight: 600 }}>
                View All Postnatal Due Patients
              </Button>
            </Paper>
          </Grid.Col>
        </Grid>
      )}

      <Paper
        className="dashboard-card"
        shadow="md"
        p="lg"
        radius="lg"
        withBorder
        style={{
          border: '1px solid rgba(0, 0, 0, 0.08)',
        }}
      >
        <Group justify="space-between" mb="md">
          <Title order={4} c="dimmed" fw={700}>Recently Added / Modified</Title>
        </Group>
        <Box style={{ overflowX: 'auto', borderRadius: '8px' }}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Barangay</Table.Th>
                <Table.Th>Contact No.</Table.Th>
                <Table.Th>Last Visit</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th>Modified</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recentPatients.map((p) => {
                const latestVisit = getLatestPrenatalVisit(p.prenatal_visits);
                const lastVisitText = latestVisit ? formatDate(latestVisit.date) : '—';
                const createdText = formatIsoDate(p.created_at) || '—';
                const updatedAt = p.updated_at;
                const createdAt = p.created_at;
                const wasModified = updatedAt && createdAt && updatedAt !== createdAt;
                const modifiedText = wasModified ? formatIsoDate(updatedAt) : '—';
                return (
                  <Table.Tr key={p.id}>
                    <Table.Td fw={600}>{p.last_name}, {p.first_name}</Table.Td>
                    <Table.Td>{p.barangay}</Table.Td>
                    <Table.Td c={p.contact_no ? undefined : "dimmed"}>{p.contact_no || '—'}</Table.Td>
                    <Table.Td c="dimmed">{lastVisitText}</Table.Td>
                    <Table.Td c="dimmed">{createdText}</Table.Td>
                    <Table.Td c="dimmed">{modifiedText}</Table.Td>
                    <Table.Td>
                      {p.is_high_risk ? (
                        <Badge color="red" variant="light" radius="md" style={{ fontWeight: 600 }}>
                          High Risk
                        </Badge>
                      ) : (
                        <Badge color="green" variant="light" radius="md" style={{ fontWeight: 600 }}>
                          Normal
                        </Badge>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Box>
        <Button
          variant="subtle"
          color="teal"
          fullWidth
          mt="md"
          onClick={() => onFilterSelect('all')}
          style={{ fontWeight: 600, color: '#22B14C' }}
        >
          View All Records
        </Button>
      </Paper>
    </Stack>
  );
}
