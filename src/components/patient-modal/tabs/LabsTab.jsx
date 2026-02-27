import { Paper, Box, Stack, Group, Input, Select, Button, Table, ActionIcon, Text, Badge, TextInput } from '@mantine/core';
import { ArrowLeft, ArrowRight, Plus, Trash, Pencil } from 'lucide-react';
import { formatDate } from '../../../lib/formatters';

export default function LabsTab({ formData, setFormData, newLab, setNewLab, addLabLog, removeLabLog, editingLabIndex, startEditLabLog, cancelEditLabLog, nextTab, prevTab }) {
  const labLogs = formData.lab_logs || [];
  const labCount = labLogs.length;

  const getResultOptions = (type) => {
    if (type === 'CBC') return ['With Anemia', 'Without Anemia', 'Prefer not to say'];
    if (type === 'Urinalysis') return ['With UTI', 'No UTI', 'Prefer not to say'];
    return ['Positive', 'Negative', 'Prefer not to say'];
  };

  return (
    <>
      <Paper withBorder radius="md" overflow="hidden" style={editingLabIndex != null ? { borderLeft: '4px solid var(--mantine-color-green-6)', backgroundColor: 'var(--mantine-color-green-0)' } : undefined}>
        <Box bg={editingLabIndex != null ? 'green.1' : 'blue.1'} p="xs" style={{ borderBottom: '1px solid #dee2e6' }}>
          <Text size="sm" fw={700} c={editingLabIndex != null ? 'green.8' : 'blue.9'} align="center">
            {editingLabIndex != null ? `Editing result ${editingLabIndex + 1} of ${labCount}` : 'Laboratory Test Results'}
          </Text>
        </Box>
        <Stack p="sm">
          <Group align="end">
            <Select label="Test Type" data={['CBC', 'Urinalysis', 'Gestational Diabetes', 'Syphilis', 'HIV', 'Hep B']} value={newLab.type} onChange={(v) => setNewLab({ ...newLab, type: v, date: '', result: '', hemoglobin: '', remarks: '' })} style={{ width: 200 }} />
            <Input.Wrapper label="Date"><Input type="date" max={new Date().toISOString().split('T')[0]} value={newLab.date} onChange={(e) => setNewLab({ ...newLab, date: e.target.value })} /></Input.Wrapper>
            <Select
              key={newLab.type}
              label="Result"
              placeholder="Select result"
              data={getResultOptions(newLab.type)}
              value={newLab.result || null}
              onChange={(v) => setNewLab({ ...newLab, result: v ?? '' })}
            />
          </Group>
          {newLab.type === 'CBC' && (
            <TextInput
              label="Hemoglobin (g/dL)"
              placeholder="e.g. 12.5"
              value={newLab.hemoglobin || ''}
              onChange={(e) => setNewLab({ ...newLab, hemoglobin: e.target.value })}
              style={{ maxWidth: 200 }}
            />
          )}
          {newLab.type === 'Urinalysis' && (
            <TextInput
              label="Remarks"
              placeholder="Enter remarks"
              value={newLab.remarks || ''}
              onChange={(e) => setNewLab({ ...newLab, remarks: e.target.value })}
              style={{ maxWidth: 400 }}
            />
          )}
          <Group gap="xs">
            <Button onClick={addLabLog} leftSection={<Plus size={16} />}>{editingLabIndex != null ? `Update Result (${editingLabIndex + 1} of ${labCount})` : 'Add Result'}</Button>
            {editingLabIndex != null && <Button variant="subtle" color="gray" onClick={cancelEditLabLog}>Cancel</Button>}
          </Group>
          <Table striped withTableBorder>
            <Table.Thead><Table.Tr><Table.Th>Test</Table.Th><Table.Th>Date</Table.Th><Table.Th>Result</Table.Th><Table.Th>Details</Table.Th><Table.Th></Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>
              {[...(formData.lab_logs || [])]
                .map((log, originalIndex) => ({ log, originalIndex }))
                .sort((a, b) => (b.log.date || '').localeCompare(a.log.date || ''))
                .map(({ log, originalIndex }) => {
                  const isBad = ['Positive', 'With Anemia', 'With UTI'].includes(log.result);
                  const isEditingRow = originalIndex === editingLabIndex;
                  const details = [];
                  if (log.type === 'CBC' && log.hemoglobin) details.push(`Hgb: ${log.hemoglobin} g/dL`);
                  if (log.type === 'Urinalysis' && log.remarks) details.push(log.remarks);
                  return (
                    <Table.Tr key={originalIndex} bg={isEditingRow ? 'green.0' : isBad ? 'red.1' : undefined} style={isEditingRow ? { borderLeft: '3px solid var(--mantine-color-green-6)' } : undefined}>
                      <Table.Td fw={500}>{log.type}</Table.Td>
                      <Table.Td>{formatDate(log.date)}</Table.Td>
                      <Table.Td>
                        {isBad ? <Badge color="red">{log.result}</Badge> : <Badge color="gray">{log.result}</Badge>}
                      </Table.Td>
                      <Table.Td c="dimmed" size="sm">{details.join(', ') || '—'}</Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon color="blue" size="sm" variant="light" onClick={() => startEditLabLog(originalIndex)} title="Edit"><Pencil size={14} /></ActionIcon>
                          <ActionIcon color="red" size="sm" onClick={() => removeLabLog(originalIndex)} title="Delete"><Trash size={14} /></ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              {labLogs.length === 0 && <Table.Tr><Table.Td colSpan={5} align="center" c="dimmed">No lab results added yet.</Table.Td></Table.Tr>}
            </Table.Tbody>
          </Table>
        </Stack>
      </Paper>
      <Group justify="space-between" mt="md">
        <Button variant="default" leftSection={<ArrowLeft size={16} />} onClick={() => prevTab('supplementation')}>Previous</Button>
        <Button rightSection={<ArrowRight size={16} />} onClick={() => nextTab('delivery')}>Next Section</Button>
      </Group>
    </>
  );
}
