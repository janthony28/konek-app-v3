import { supabase } from '../supabaseClient';

export async function fetchUserProfile(userId) {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('assigned_barangays')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        // PGRST116 is no rows returned, which is fine if they have no profile yet
        console.error('Error fetching user profile:', error);
        return [];
    }

    return data?.assigned_barangays || [];
}

export async function fetchAllProfiles() {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*');

    if (error) {
        console.error('Error fetching all profiles:', error);
        return [];
    }

    return data || [];
}

export async function upsertUserProfile(userId, assignedBarangays, email = null) {
    const payload = { user_id: userId, assigned_barangays: assignedBarangays };
    if (email) {
        payload.email = email;
    }

    const { data, error } = await supabase
        .from('user_profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();

    if (error) {
        console.error('Error upserting user profile:', error);
        throw error;
    }

    return data;
}

export async function ensureUserProfileExists(userId, email) {
    // Try to fetch first
    const { data, error } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('user_id', userId)
        .single();

    if (error && error.code === 'PGRST116') {
        // Doesn't exist, create it with empty barangays and set the email
        await upsertUserProfile(userId, [], email);
    } else if (data && data.email !== email) {
        // Update the email if it changed or was missing
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('assigned_barangays')
            .eq('user_id', userId)
            .single();
        await upsertUserProfile(userId, profile?.assigned_barangays || [], email);
    }
}

export async function fetchAdminUserList() {
    // 1. Get all profiles
    const profiles = await fetchAllProfiles();

    // 2. Get all distinct created_by from records to find users who might not have a profile yet
    const { data: recordsData, error: recordsError } = await supabase
        .from('maternal_records')
        .select('created_by');

    if (recordsError) {
        console.error('Error fetching records for user list:', recordsError);
        // Ignore error and just continue with profiles we found
    }

    // Create a map of known user IDs.
    const userIds = new Set();
    profiles.forEach(p => userIds.add(p.user_id));
    (recordsData || []).forEach(r => {
        if (r.created_by) userIds.add(r.created_by);
    });

    const users = Array.from(userIds).map(id => {
        const profile = profiles.find(p => p.user_id === id);
        return {
            id,
            email: profile ? profile.email : null,
            assigned_barangays: profile ? profile.assigned_barangays : [],
            hasProfile: !!profile
        };
    });

    return users;
}
