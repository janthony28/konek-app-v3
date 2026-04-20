import { useState } from 'react';
import { Paper, Box, Stack, Group, Grid, Input, NumberInput, TextInput, Table, Button, ActionIcon, Text, Modal, Badge } from '@mantine/core';
import { ArrowLeft, ArrowRight, Trash, Pencil, Plus } from 'lucide-react';
import { formatDate } from '../../../lib/formatters';

const isEditing = (editingVisitIndex) => editingVisitIndex != null;

/** Classify BP as High if systolic >= 140 OR diastolic >= 90 */
function getBpStatus(systolic, diastolic) {
  const s = Number(systolic);
  const d = Number(diastolic);
  if (!s && !d) return '';
  if (s >= 140 || d >= 90) return 'High';
  return 'Normal';
}

export default function PrenatalTab({ formData, setFormData, newVisit, setNewVisit, handleVisitDateChange, handleBMIChange, addVisitToList, removeVisit, editingVisitIndex, startEditVisit, cancelEditVisit, nextTab, prevTab }) {
  const editing = isEditing(editingVisitIndex);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleAddClick = () => {
    if (editing) {
      addVisitToList();
    } else {
      setConfirmOpen(true);
    }
  };

  const handleConfirmYes = () => {
    setConfirmOpen(false);
    addVisitToList();
  };

  const bpStatus = getBpStatus(newVisit.bp_systolic, newVisit.bp_diastolic);

  return (
    <>
      <style>{`
        @keyframes prenatal-edit-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.35); }
          50% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
        }
      `}</style>
      <Paper
        withBorder
        radius="md"
        overflow="hidden"
        mb="md"
        style={{
          borderLeft: editing ? '4px solid var(--mantine-color-green-6)' : undefined,
          backgroundColor: editing ? 'var(--mantine-color-green-0)' : undefined,
          animation: editing ? 'prenatal-edit-pulse 1.2s ease-out 2' : undefined,
        }}
      >
        <Box
          bg={editing ? 'green.1' : 'blue.1'}
          p="xs"
          style={{ borderBottom: '1px solid #dee2e6' }}
        >
          <Text size="sm" fw={700} c={editing ? 'green.8' : 'blue.9'} align="center">
            {editing ? `Editing visit ${editingVisitIndex + 1} of ${formData.prenatal_visits.length} — change values above, then click Update Visit` : 'Prenatal Visit'}
          </Text>
        </Box>
        <Stack p="sm">
          <Group grow>
            <Input.Wrapper label="Visit Date" withAsterisk> <Input type="date" max={new Date().toISOString().split('T')[0]} value={newVisit.date || ''} onChange={handleVisitDateChange} /> </Input.Wrapper>
            <TextInput label="AOG" readOnly value={newVisit.aog} placeholder="Auto" />
            <TextInput label="Trimester" readOnly value={newVisit.trimester} placeholder="Auto" />
          </Group>
          <Grid>
            <Grid.Col span={3}> <NumberInput label="Ht (cm)" value={newVisit.height} onChange={(val) => handleBMIChange('height', val)} /> </Grid.Col>
            <Grid.Col span={3}> <NumberInput label="Wt (kg)" value={newVisit.weight} onChange={(val) => handleBMIChange('weight', val)} /> </Grid.Col>
            <Grid.Col span={3}> <TextInput label="BMI" readOnly value={newVisit.bmi} /> </Grid.Col>
            <Grid.Col span={3}> <TextInput label="Category" readOnly value={newVisit.bmi_category} /> </Grid.Col>
          </Grid>
          <Grid align="end">
            <Grid.Col span={3}>
              <NumberInput
                label="Systolic (mmHg)"
                placeholder="e.g. 120"
                value={newVisit.bp_systolic}
                onChange={(val) => setNewVisit({ ...newVisit, bp_systolic: val })}
                min={0}
                max={300}
              />
            </Grid.Col>
            <Grid.Col span={0.3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingBottom: 8 }}>
              <Text size="lg" fw={700} c="dimmed">/</Text>
            </Grid.Col>
            <Grid.Col span={3}>
              <NumberInput
                label="Diastolic (mmHg)"
                placeholder="e.g. 80"
                value={newVisit.bp_diastolic}
                onChange={(val) => setNewVisit({ ...newVisit, bp_diastolic: val })}
                min={0}
                max={200}
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <Input.Wrapper label="BP Status">
                {bpStatus ? (
                  <Badge
                    size="lg"
                    radius="sm"
                    color={bpStatus === 'High' ? 'red' : 'green'}
                    variant="light"
                    fullWidth
                    style={{ marginTop: 4 }}
                  >
                    {bpStatus === 'High' ? '⚠ HIGH BP' : '✓ Normal'}
                  </Badge>
                ) : (
                  <Text size="sm" c="dimmed" mt={4}>—</Text>
                )}
              </Input.Wrapper>
            </Grid.Col>
          </Grid>
          <Group gap="xs">
            <Button
              flex={1}
              variant={editing ? 'outline' : 'filled'}
              color={editing ? 'green' : 'green'}
              size="md"
              leftSection={!editing && <Plus size={16} />}
              onClick={handleAddClick}
            >
              {editing ? `Update Visit (${editingVisitIndex + 1} of ${formData.prenatal_visits.length})` : 'Add Visit'}
            </Button>
            {editing && <Button variant="subtle" color="gray" size="md" onClick={cancelEditVisit}>Cancel</Button>}
          </Group>

          <Modal opened={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm" centered size="sm" withCloseButton={false}>
            <Text size="sm" fw={500} mb="md">Add this visit?</Text>
            <Group justify="flex-end" gap="sm">
              <Button variant="default" onClick={() => setConfirmOpen(false)}>No</Button>
              <Button color="green" onClick={handleConfirmYes}>Yes</Button>
            </Group>
          </Modal>
        </Stack>
      </Paper>
      <Paper withBorder radius="md" overflow="hidden">
        <Box bg="blue.1" p="xs" style={{ borderBottom: '1px solid #dee2e6' }}>
          <Text size="sm" fw={700} c="blue.9" align="center">Visit History ({formData.prenatal_visits.length})</Text>
        </Box>
        <Box p="sm">
          <Box style={{ overflowX: 'auto' }}>
            <Table striped withTableBorder>
              <Table.Thead><Table.Tr><Table.Th>Date</Table.Th><Table.Th>AOG</Table.Th><Table.Th>Trimester</Table.Th><Table.Th>BMI</Table.Th><Table.Th>BP</Table.Th><Table.Th>Action</Table.Th></Table.Tr></Table.Thead>
              <Table.Tbody>
                {formData.prenatal_visits.map((v, i) => {
                  const visitBp = getBpStatus(v.bp_systolic, v.bp_diastolic);
                  return (
                    <Table.Tr key={i} bg={i === editingVisitIndex ? 'green.0' : undefined} style={i === editingVisitIndex ? { borderLeft: '3px solid var(--mantine-color-green-6)' } : undefined}>
                      <Table.Td>{formatDate(v.date)}</Table.Td>
                      <Table.Td>{v.aog}</Table.Td>
                      <Table.Td>{v.trimester || '—'}</Table.Td>
                      <Table.Td>{v.bmi ?? '—'}</Table.Td>
                      <Table.Td>
                        {v.bp_systolic || v.bp_diastolic ? (
                          <Badge size="sm" color={visitBp === 'High' ? 'red' : 'green'} variant="light">
                            {v.bp_systolic || '—'}/{v.bp_diastolic || '—'}
                          </Badge>
                        ) : '—'}
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon color="blue" size="sm" variant="light" onClick={() => startEditVisit(i)} title="Edit"><Pencil size={14} /></ActionIcon>
                          <ActionIcon color="red" size="sm" onClick={() => removeVisit(i)} title="Delete"><Trash size={14} /></ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Box>
          <Box mt="sm" p="xs" style={{ borderTop: '1px solid #dee2e6' }}>
            <Text size="xs" fw={600} c="dimmed" mb={4}>Completed?</Text>
            <Text size="sm" fw={500} c={formData.prenatal_visits.length >= 8 ? 'green' : 'dimmed'}>{formData.prenatal_visits.length >= 8 ? 'Yes' : 'No'}</Text>
          </Box>
        </Box>
      </Paper>
      <Group justify="space-between" mt="md">
        <Button variant="default" leftSection={<ArrowLeft size={16} />} onClick={() => prevTab('general')}>Previous</Button>
        <Button rightSection={<ArrowRight size={16} />} onClick={() => nextTab('immunization')}>Next Section</Button>
      </Group>
    </>
  );
}
