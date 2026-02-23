import { useState, useEffect } from 'react';
import { Paper, Title, Table, Text, Box, MultiSelect, Button, Group, ActionIcon, Badge, Loader, Stack, ThemeIcon } from '@mantine/core';
import { Save, Users, RefreshCw } from 'lucide-react';
import { fetchAdminUserList, upsertUserProfile } from '../../services/userProfileService';
import { BATANGAS_BARANGAYS_LIST } from '../../lib/constants';
import { notifications } from '@mantine/notifications';

export default function UserManagementView() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);

    // We maintain a local state for the assigned barangays so we can edit before saving
    const [assignments, setAssignments] = useState({});

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await fetchAdminUserList();
            setUsers(data || []);

            const newAssignments = {};
            (data || []).forEach(u => {
                newAssignments[u.id] = u.assigned_barangays || [];
            });
            setAssignments(newAssignments);
        } catch (error) {
            notifications.show({ title: 'Error', message: 'Failed to load users', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const handleAssignmentChange = (userId, values) => {
        setAssignments(prev => ({ ...prev, [userId]: values }));
    };

    const handleSave = async (userId) => {
        setSavingId(userId);
        try {
            const newBarangays = assignments[userId] || [];
            // If we don't have the user's email here because they only exist in records (no profile yet),
            // we might just save their ID and the new barangays. 
            // In a real app, we'd also preserve their email if we had it. The service just needs to upsert.
            const existingUser = users.find(u => u.id === userId);
            const email = existingUser?.email || null; // Might be null if no profile yet

            await upsertUserProfile(userId, newBarangays, email);
            notifications.show({ title: 'Success', message: 'User assignments updated', color: 'teal' });

            // Update local state to reflect it has a profile now
            setUsers(users.map(u => u.id === userId ? { ...u, hasProfile: true, assigned_barangays: newBarangays } : u));
        } catch (error) {
            notifications.show({ title: 'Error', message: 'Failed to save assignments', color: 'red' });
        } finally {
            setSavingId(null);
        }
    };

    if (loading) {
        return (
            <Box style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <Loader color="teal" />
            </Box>
        );
    }

    return (
        <Box p="md">
            <Paper shadow="sm" radius="md" p="xl" withBorder style={{ borderColor: 'rgba(34, 177, 76, 0.2)' }}>
                <Group justify="space-between" mb="xl">
                    <Group>
                        <ThemeIcon size={40} radius="md" color="teal" variant="light">
                            <Users size={24} />
                        </ThemeIcon>
                        <Title order={2} style={{ color: '#2c3e50' }}>Manage Users</Title>
                    </Group>
                    <Button
                        variant="light"
                        color="teal"
                        leftSection={<RefreshCw size={16} />}
                        onClick={loadUsers}
                    >
                        Refresh
                    </Button>
                </Group>

                <Text c="dimmed" mb="lg">
                    Assign specific barangays to user accounts. Users will only see records and options for their assigned barangays. The admin account always sees all barangays.
                </Text>

                <Box style={{ overflowX: 'auto' }}>
                    <Table striped highlightOnHover verticalSpacing="md">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>User Details</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th style={{ width: '50%' }}>Assigned Barangays</Table.Th>
                                <Table.Th style={{ width: '100px' }}>Actions</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {users.length === 0 ? (
                                <Table.Tr>
                                    <Table.Td colSpan={4} align="center">
                                        <Text c="dimmed" py="xl">No non-admin users found. Users will appear here once they log in or create records.</Text>
                                    </Table.Td>
                                </Table.Tr>
                            ) : (
                                users.map((user) => (
                                    <Table.Tr key={user.id}>
                                        <Table.Td>
                                            <Stack gap={4}>
                                                {user.email ? (
                                                    <Text fw={600} size="sm">{user.email}</Text>
                                                ) : (
                                                    <Text fw={600} size="sm" c="dimmed" fs="italic">Email unknown (legacy user)</Text>
                                                )}
                                                <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>ID: {user.id}</Text>
                                            </Stack>
                                        </Table.Td>
                                        <Table.Td>
                                            {user.email === 'admin@konek.ph' ? (
                                                <Badge color="blue" variant="light">Admin (All Access)</Badge>
                                            ) : user.hasProfile ? (
                                                <Badge color="teal" variant="light">Profile Active</Badge>
                                            ) : (
                                                <Badge color="orange" variant="light">No Profile Yet</Badge>
                                            )}
                                        </Table.Td>
                                        <Table.Td>
                                            {user.email === 'admin@konek.ph' ? (
                                                <Text size="sm" c="dimmed" fs="italic">Has access to all barangays inherently.</Text>
                                            ) : (
                                                <MultiSelect
                                                    data={BATANGAS_BARANGAYS_LIST}
                                                    value={assignments[user.id] || []}
                                                    onChange={(val) => handleAssignmentChange(user.id, val)}
                                                    placeholder="Select barangays to assign..."
                                                    searchable
                                                    clearable
                                                    maxDropdownHeight={300}
                                                    hidePickedOptions
                                                />
                                            )}
                                        </Table.Td>
                                        <Table.Td>
                                            {user.email !== 'admin@konek.ph' && (
                                                <Button
                                                    size="sm"
                                                    color="teal"
                                                    variant="light"
                                                    leftSection={<Save size={16} />}
                                                    loading={savingId === user.id}
                                                    onClick={() => handleSave(user.id)}
                                                    disabled={
                                                        JSON.stringify(assignments[user.id] || []) === JSON.stringify(user.assigned_barangays || [])
                                                    }
                                                >
                                                    Save
                                                </Button>
                                            )}
                                        </Table.Td>
                                    </Table.Tr>
                                ))
                            )}
                        </Table.Tbody>
                    </Table>
                </Box>
            </Paper>
        </Box>
    );
}
