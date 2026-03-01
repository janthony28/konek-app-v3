import { useState, useMemo } from 'react';
import { Paper, Box, Stack, Group, Grid, Input, Select, TextInput, Checkbox, Text, NumberInput, Button, Table, ActionIcon } from '@mantine/core';
import { ArrowLeft, ArrowRight, Plus, Trash, Pencil } from 'lucide-react';
import { getWeeksAOG } from '../../../lib/patientHelpers';
import { formatDate } from '../../../lib/formatters';

const EMPTY_BABY = { weight: '', category: '', sex: '', delivery_date: '', delivery_time: '', status: 'Live Birth' };

export default function DeliveryTab({ formData, setFormData, formErrors, handleBirthWeightChange, handleBabySexChange, handleBabyFieldChange, addBaby, removeBaby, isAborted, nextTab, prevTab }) {
  const babyDetails = Array.isArray(formData.baby_details) ? formData.baby_details : [];
  const isLiveBirth = formData.delivery_outcome === 'FT' || formData.delivery_outcome === 'PT';

  const pregnancyType = formData.pregnancy_type || '';
  const maxBabies = pregnancyType === 'Singleton' ? 1 : pregnancyType === 'Twins' ? 2 : pregnancyType === 'Multiple' ? 9 : 1;
  const canAddBaby = isLiveBirth && !isAborted && babyDetails.length < maxBabies;

  // Local form state for adding/editing a baby (like newVisit in PrenatalTab)
  const [newBaby, setNewBaby] = useState({ ...EMPTY_BABY });
  const [editingBabyIndex, setEditingBabyIndex] = useState(null);
  const isEditingBaby = editingBabyIndex != null;

  const publicFacilityPlaces = ['BHS/RHU/UHU', 'Govt Hospital', 'Public Infirmary'];
  const isPublicFacilityPlace = publicFacilityPlaces.includes(formData.delivery_place || '');

  const outcomeOptions = useMemo(() => {
    const deliveryDate = (babyDetails[0] && babyDetails[0].delivery_date) || formData.delivery_date || '';
    const weeks = getWeeksAOG(formData.lmp, deliveryDate);
    const base = [
      { value: 'FT', label: 'FT - Full Term' },
      { value: 'PT', label: 'PT - Pre-term' },
      { value: 'FD', label: 'FD - Fetal Death' },
      { value: 'AB', label: 'AB - Abortion' },
    ];
    return base.map((opt) => {
      if (opt.value === 'FD') return { ...opt, disabled: false };
      if (opt.value === 'AB') return { ...opt, disabled: weeks !== null && weeks >= 20 };
      if (opt.value === 'PT') return { ...opt, disabled: weeks === null || weeks < 20 || weeks >= 37 };
      if (opt.value === 'FT') return { ...opt, disabled: weeks === null || weeks < 37 };
      return opt;
    });
  }, [formData.lmp, formData.delivery_date, babyDetails]);

  const handleNewBabyWeight = (val) => {
    let category = '';
    if (val !== '' && val !== undefined && val !== null) { category = val >= 2500 ? 'Normal' : 'Low'; }
    setNewBaby((prev) => ({ ...prev, weight: val, category }));
  };

  const addOrUpdateBaby = () => {
    if (!newBaby.delivery_date) return;

    setFormData((prev) => {
      const existing = Array.isArray(prev.baby_details) ? [...prev.baby_details] : [];

      if (isEditingBaby) {
        existing[editingBabyIndex] = { ...newBaby };
      } else {
        existing.push({ ...newBaby });
      }

      const next = { ...prev, baby_details: existing };
      // Sync legacy fields from Baby 1
      const baby1 = existing[0] || {};
      next.birth_weight = baby1.weight || '';
      next.birth_weight_category = baby1.category || '';
      next.birth_sex = baby1.sex || '';
      next.delivery_date = baby1.delivery_date || prev.delivery_date || '';
      next.delivery_time = baby1.delivery_time || prev.delivery_time || '';
      return next;
    });

    // Pre-fill date/time from Baby 1 for succeeding babies
    setFormData((prev) => {
      const babies = Array.isArray(prev.baby_details) ? prev.baby_details : [];
      const baby1 = babies[0] || {};
      if (babies.length > 0) {
        setNewBaby({ ...EMPTY_BABY, delivery_date: baby1.delivery_date || '', delivery_time: baby1.delivery_time || '' });
      } else {
        setNewBaby({ ...EMPTY_BABY });
      }
      return prev;
    });
    setEditingBabyIndex(null);
  };

  const startEditBaby = (index) => {
    const baby = babyDetails[index] || {};
    setNewBaby({
      weight: baby.weight || '',
      category: baby.category || '',
      sex: baby.sex || '',
      delivery_date: baby.delivery_date || '',
      delivery_time: baby.delivery_time || '',
      status: baby.status || 'Live Birth',
    });
    setEditingBabyIndex(index);
  };

  const cancelEditBaby = () => {
    setNewBaby({ ...EMPTY_BABY });
    setEditingBabyIndex(null);
  };

  const handleRemoveBaby = (index) => {
    removeBaby(index);
    if (editingBabyIndex === index) {
      setNewBaby({ ...EMPTY_BABY });
      setEditingBabyIndex(null);
    }
  };

  return (
    <>
      <style>{`
        @keyframes baby-edit-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.35); }
          50% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
        }
      `}</style>

      <Grid grow>
        <Grid.Col span={6}>
          <Paper withBorder radius="md" overflow="hidden">
            <Box bg="blue.1" p="xs" style={{ borderBottom: '1px solid #dee2e6' }}>
              <Text size="sm" fw={700} c="blue.9" align="center">Pregnancy Outcome</Text>
            </Box>
            <Stack p="sm" gap="xs">
              <Input.Wrapper label="Date Terminated"> <Input type="date" max={new Date().toISOString().split('T')[0]} value={formData.delivery_date || ''} onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })} /> </Input.Wrapper>
              <Select
                label="Outcome"
                placeholder="--"
                data={outcomeOptions}
                value={formData.delivery_outcome || ''}
                onChange={(val) => {
                  if (val === 'FD' || val === 'AB') {
                    setFormData({
                      ...formData,
                      delivery_outcome: val,
                      birth_weight: '', birth_weight_category: '', birth_sex: '',
                      delivery_time: '', delivery_mode: '', delivery_attendant: '',
                      delivery_attendant_specify: '', delivery_place: '',
                      delivery_facility_type: '', delivery_place_specify: '',
                      delivery_non_health_facility: '', delivery_non_health_place: '',
                      delivery_place_capable: '', pregnancy_type: '',
                      pregnancy_multiple_count: '', baby_details: [],
                      lying_in_clinic_name: '', place_of_birth: '', place_of_birth_specify: '',
                    });
                    setNewBaby({ ...EMPTY_BABY });
                    setEditingBabyIndex(null);
                  } else {
                    setFormData({ ...formData, delivery_outcome: val });
                  }
                }}
              />
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={6}>
          <Paper withBorder radius="md" overflow="hidden" h="100%" style={{ opacity: isAborted ? 0.5 : 1 }}>
            <Box bg="blue.1" p="xs" style={{ borderBottom: '1px solid #dee2e6' }}>
              <Text size="sm" fw={700} c="blue.9" align="center">Delivery Type</Text>
            </Box>
            <Stack p="sm">
              <Input.Wrapper error={formErrors?.delivery_mode} description={formErrors?.delivery_mode ? null : undefined} errorProps={{ mt: 'sm' }}>
                <Stack gap="xs">
                  {[
                    { value: 'CS', label: 'CS - Cesarean Section' },
                    { value: 'VD', label: 'VD - Vaginal Delivery' },
                    { value: 'CVCD', label: 'CVCD - Combined Vaginal-Cesarean' },
                    { value: 'Others', label: 'Others (Please Specify)' },
                  ].map(({ value, label }) => (
                    <Checkbox
                      key={value}
                      disabled={isAborted}
                      checked={(formData.delivery_mode || '') === value}
                      label={label}
                      onChange={() => setFormData({ ...formData, delivery_mode: (formData.delivery_mode || '') === value ? '' : value, ...(value !== 'Others' ? { delivery_mode_specify: '' } : {}) })}
                    />
                  ))}
                  {formData.delivery_mode === 'Others' && (
                    <TextInput
                      disabled={isAborted}
                      placeholder="Please specify delivery type..."
                      value={formData.delivery_mode_specify || ''}
                      onChange={(e) => setFormData({ ...formData, delivery_mode_specify: e.target.value.toUpperCase() })}
                    />
                  )}
                </Stack>
              </Input.Wrapper>
              <Select
                label="Pregnancy Type"
                placeholder="Select..."
                data={['Singleton', 'Twins', 'Multiple']}
                value={pregnancyType}
                onChange={(val) => setFormData({ ...formData, pregnancy_type: val || '' })}
              />
              <TextInput label="Remarks" placeholder="..." value={formData.pregnancy_outcome_remarks || ''} onChange={(e) => setFormData({ ...formData, pregnancy_outcome_remarks: e.target.value.toUpperCase() })} />
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* ── Baby Details — Form + Table (like 8ANC visits) ────────────── */}
      <Paper
        withBorder
        radius="md"
        overflow="hidden"
        mt="md"
        style={{
          opacity: isAborted ? 0.5 : 1,
          borderLeft: isEditingBaby ? '4px solid var(--mantine-color-green-6)' : undefined,
          backgroundColor: isEditingBaby ? 'var(--mantine-color-green-0)' : undefined,
          animation: isEditingBaby ? 'baby-edit-pulse 1.2s ease-out 2' : undefined,
        }}
      >
        <Box
          bg={isEditingBaby ? 'green.1' : 'blue.1'}
          p="xs"
          style={{ borderBottom: '1px solid #dee2e6' }}
        >
          <Text size="sm" fw={700} c={isEditingBaby ? 'green.8' : 'blue.9'} align="center">
            {isEditingBaby
              ? `Editing Baby ${editingBabyIndex + 1} of ${babyDetails.length} — change values, then click Update Baby`
              : 'Baby Details'}
          </Text>
        </Box>
        <Stack p="sm" gap="xs">
          {!isLiveBirth && (
            <Text size="xs" c="dimmed" ta="center">Select a live birth outcome (FT or PT) to add babies</Text>
          )}
          {formErrors?.baby_details && isLiveBirth && babyDetails.length === 0 && (
            <Text size="xs" c="red" ta="center" fw={600}>{formErrors.baby_details}</Text>
          )}
          {isLiveBirth && (
            <>
              <Group grow>
                <Input.Wrapper label="Delivery Date" withAsterisk>
                  <Input type="date" max={new Date().toISOString().split('T')[0]} disabled={isAborted} value={newBaby.delivery_date || ''} onChange={(e) => setNewBaby({ ...newBaby, delivery_date: e.target.value })} />
                </Input.Wrapper>
                <Input.Wrapper label="Delivery Time">
                  <input type="time" disabled={isAborted} style={{ width: '100%', padding: '6px', border: '1px solid #ced4da', borderRadius: '4px' }} value={newBaby.delivery_time || ''} onChange={(e) => setNewBaby({ ...newBaby, delivery_time: e.target.value })} />
                </Input.Wrapper>
                <NumberInput disabled={isAborted} label="Weight (g)" placeholder="e.g. 3000" value={newBaby.weight} onChange={handleNewBabyWeight} />
                <TextInput label="Category" readOnly value={newBaby.category || ''} placeholder="Auto" variant="filled" />
                <Input.Wrapper label="Sex">
                  <Group mt={4} gap="xs">
                    <Button size="xs" variant={newBaby.sex === 'Male' ? 'filled' : 'light'} disabled={isAborted} onClick={() => setNewBaby({ ...newBaby, sex: 'Male' })}>M</Button>
                    <Button size="xs" variant={newBaby.sex === 'Female' ? 'filled' : 'light'} disabled={isAborted} onClick={() => setNewBaby({ ...newBaby, sex: 'Female' })}>F</Button>
                  </Group>
                </Input.Wrapper>
              </Group>
              <Group grow>
                <Select
                  label="Status"
                  data={['Live Birth', 'Fetal Death']}
                  value={newBaby.status || 'Live Birth'}
                  onChange={(val) => setNewBaby({ ...newBaby, status: val || 'Live Birth' })}
                  disabled={isAborted}
                />
              </Group>
              <Group gap="xs">
                <Button
                  flex={1}
                  variant={isEditingBaby ? 'outline' : 'filled'}
                  color={isEditingBaby ? 'green' : 'teal'}
                  size="md"
                  leftSection={!isEditingBaby && <Plus size={16} />}
                  disabled={!canAddBaby && !isEditingBaby}
                  onClick={addOrUpdateBaby}
                >
                  {isEditingBaby ? `Update Baby (${editingBabyIndex + 1} of ${babyDetails.length})` : 'Add Baby'}
                </Button>
                {isEditingBaby && <Button variant="subtle" color="gray" size="md" onClick={cancelEditBaby}>Cancel</Button>}
              </Group>
              {!isEditingBaby && babyDetails.length >= maxBabies && (
                <Text size="xs" c="orange" ta="center">Maximum babies reached for {pregnancyType || 'Singleton'} pregnancy ({maxBabies})</Text>
              )}
            </>
          )}
        </Stack>
      </Paper>

      {/* ── Baby List Table ───────────────────────────────────────────── */}
      <Paper withBorder radius="md" overflow="hidden" mt="md" style={{ opacity: isAborted ? 0.5 : 1 }}>
        <Box bg="blue.1" p="xs" style={{ borderBottom: '1px solid #dee2e6' }}>
          <Text size="sm" fw={700} c="blue.9" align="center">Baby List ({babyDetails.length})</Text>
        </Box>
        <Box p="sm">
          <Box style={{ overflowX: 'auto' }}>
            <Table striped withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>#</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Time</Table.Th>
                  <Table.Th>Weight</Table.Th>
                  <Table.Th>Category</Table.Th>
                  <Table.Th>Sex</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Action</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {babyDetails.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={8}>
                      <Text size="sm" c="dimmed" ta="center">No babies added yet.</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
                {babyDetails.map((baby, i) => (
                  <Table.Tr key={i} bg={i === editingBabyIndex ? 'green.0' : undefined} style={i === editingBabyIndex ? { borderLeft: '3px solid var(--mantine-color-green-6)' } : undefined}>
                    <Table.Td>Baby {i + 1}</Table.Td>
                    <Table.Td>{formatDate(baby.delivery_date) || '—'}</Table.Td>
                    <Table.Td>{baby.delivery_time || '—'}</Table.Td>
                    <Table.Td>{baby.weight ? `${baby.weight}g` : '—'}</Table.Td>
                    <Table.Td>{baby.category || '—'}</Table.Td>
                    <Table.Td>{baby.sex || '—'}</Table.Td>
                    <Table.Td><Text size="xs" c={baby.status === 'Fetal Death' ? 'red' : 'green'} fw={600}>{baby.status || 'Live Birth'}</Text></Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon color="blue" size="sm" variant="light" onClick={() => startEditBaby(i)} title="Edit"><Pencil size={14} /></ActionIcon>
                        <ActionIcon color="red" size="sm" onClick={() => handleRemoveBaby(i)} title="Delete"><Trash size={14} /></ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        </Box>
      </Paper>

      {/* ── Birth Attendant + Birth Registration ─────────────────────── */}
      <Grid mt="md">
        <Grid.Col span={6}>
          <Paper withBorder radius="md" overflow="hidden" h="100%" style={{ opacity: isAborted ? 0.5 : 1 }}>
            <Box bg="blue.1" p="xs" style={{ borderBottom: '1px solid #dee2e6' }}>
              <Text size="sm" fw={700} c="blue.9" align="center">Birth Attendant</Text>
            </Box>
            <Stack p="sm">
              <Select disabled={isAborted} placeholder="Select Attendant" data={[{ value: 'MD', label: 'MD - Doctor' }, { value: 'RN', label: 'RN - Nurse' }, { value: 'MW', label: 'MW - Midwife' }, { value: 'Others', label: 'Others' }]} value={formData.delivery_attendant || ''} onChange={(val) => setFormData({ ...formData, delivery_attendant: val })} />
              {formData.delivery_attendant === 'Others' && (<TextInput disabled={isAborted} placeholder="Please specify..." value={formData.delivery_attendant_specify || ''} onChange={(e) => setFormData({ ...formData, delivery_attendant_specify: e.target.value.toUpperCase() })} />)}
            </Stack>
          </Paper>
        </Grid.Col>
        <Grid.Col span={6}>
          <Paper withBorder radius="md" overflow="hidden" h="100%" style={{ opacity: isAborted ? 0.5 : 1 }}>
            <Box bg="blue.1" p="xs" style={{ borderBottom: '1px solid #dee2e6' }}>
              <Text size="sm" fw={700} c="blue.9" align="center">Birth Registration</Text>
            </Box>
            <Stack p="sm" gap="xs">
              <Input.Wrapper label="Birth Registered?">
                <Group mt="xs" gap="md">
                  <Checkbox
                    label="Yes"
                    checked={formData.birth_registered === true}
                    onChange={(e) => {
                      const checked = e.currentTarget.checked;
                      setFormData({
                        ...formData,
                        birth_registered: checked ? true : null,
                        ...(checked ? {} : { birth_registration_date: '' }),
                      });
                    }}
                  />
                  <Checkbox
                    label="No"
                    checked={formData.birth_registered === false}
                    onChange={(e) => {
                      const checked = e.currentTarget.checked;
                      if (checked) {
                        setFormData({ ...formData, birth_registered: false, birth_registration_date: '' });
                      }
                    }}
                  />
                </Group>
              </Input.Wrapper>
              {formData.birth_registered === true && (
                <Input.Wrapper label="Date of registration">
                  <Input type="date" max={new Date().toISOString().split('T')[0]} value={formData.birth_registration_date || ''} onChange={(e) => setFormData({ ...formData, birth_registration_date: e.target.value })} />
                </Input.Wrapper>
              )}
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* ── Place of Delivery ────────────────────────────────────────── */}
      <Paper withBorder radius="md" overflow="hidden" mt="md" style={{ opacity: isAborted ? 0.5 : 1 }}>
        <Box bg="blue.1" p="xs" style={{ borderBottom: '1px solid #dee2e6' }}>
          <Text size="sm" fw={700} c="blue.9" align="center">Place of Delivery</Text>
        </Box>
        <Grid p="sm">
          <Grid.Col span={4}>
            <Stack gap="xs">
              <Select disabled={isAborted} label="Place" placeholder="Select Place..." data={['BHS/RHU/UHU', 'Govt Hospital', 'Public Infirmary', 'Lying In', 'Ambulance', 'Others']} value={formData.delivery_place || ''} onChange={(val) => setFormData({ ...formData, delivery_place: val, ...(publicFacilityPlaces.includes(val || '') ? { delivery_facility_type: 'Public' } : {}), ...(val !== 'Others' ? { delivery_non_health_facility: '', delivery_non_health_place: '' } : {}), ...(val !== 'Lying In' ? { lying_in_clinic_name: '' } : {}) })} />
              {formData.delivery_place === 'Lying In' && (
                <TextInput disabled={isAborted} label="Name of Lying In Clinic" placeholder="Enter clinic name..." value={formData.lying_in_clinic_name || ''} onChange={(e) => setFormData({ ...formData, lying_in_clinic_name: e.target.value.toUpperCase() })} />
              )}
            </Stack>
          </Grid.Col>
          <Grid.Col span={4}>
            <Select disabled={isAborted || isPublicFacilityPlace} label="Facility Type" placeholder="Select Type..." data={['Public', 'Private']} value={isPublicFacilityPlace ? 'Public' : (formData.delivery_facility_type || '')} onChange={(val) => setFormData({ ...formData, delivery_facility_type: val })} />
          </Grid.Col>
          <Grid.Col span={4}>
            <Stack gap="xs">
              <Select disabled={isAborted} label="BEmONC/CEmONC Capable?" placeholder="--" data={['Yes', 'No']} value={formData.delivery_place_capable || ''} onChange={(val) => setFormData({ ...formData, delivery_place_capable: val })} />
              {formData.delivery_place === 'Others' && (
                <>
                  <Select disabled={isAborted} label="Non-Health Facility" placeholder="Select..." data={['Home', 'Others']} value={formData.delivery_non_health_facility || ''} onChange={(val) => setFormData({ ...formData, delivery_non_health_facility: val || '', delivery_non_health_place: val === 'Others' ? (formData.delivery_non_health_place || '') : '' })} />
                  {formData.delivery_non_health_facility === 'Others' && (
                    <TextInput disabled={isAborted} placeholder="Please specify..." value={formData.delivery_non_health_place || ''} onChange={(e) => setFormData({ ...formData, delivery_non_health_place: e.target.value.toUpperCase() })} />
                  )}
                </>
              )}
            </Stack>
          </Grid.Col>
        </Grid>
      </Paper>

      {/* ── Place of Birth ─────────────────────────────────────────────── */}
      <Paper withBorder radius="md" overflow="hidden" mt="md" style={{ opacity: isAborted ? 0.5 : 1 }}>
        <Box bg="blue.1" p="xs" style={{ borderBottom: '1px solid #dee2e6' }}>
          <Text size="sm" fw={700} c="blue.9" align="center">Place of Birth</Text>
        </Box>
        <Stack p="sm" gap="xs">
          <Select disabled={isAborted} label="Place of Birth" placeholder="Select..." data={['Within Batangas City', 'Outside Batangas City']} value={formData.place_of_birth || ''} onChange={(val) => setFormData({ ...formData, place_of_birth: val, ...(val !== 'Outside Batangas City' ? { place_of_birth_specify: '' } : {}) })} />
          {formData.place_of_birth === 'Outside Batangas City' && (
            <TextInput disabled={isAborted} label="Specify Area" placeholder="Enter specific area..." value={formData.place_of_birth_specify || ''} onChange={(e) => setFormData({ ...formData, place_of_birth_specify: e.target.value.toUpperCase() })} />
          )}
        </Stack>
      </Paper>

      <Group justify="space-between" mt="md">
        <Button variant="default" leftSection={<ArrowLeft size={16} />} onClick={() => prevTab('labs')}>Previous</Button>
        <Button rightSection={<ArrowRight size={16} />} onClick={() => nextTab('postnatal')}>Next Section</Button>
      </Group>
    </>
  );
}
