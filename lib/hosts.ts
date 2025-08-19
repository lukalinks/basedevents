import { supabase } from './supabaseClient'

export interface Host {
  id: string
  address: string
  name?: string
  avatarUrl?: string
  bio?: string
  createdAt: string
}

// Create or update host profile
export async function createOrUpdateHost(hostData: Omit<Host, 'id' | 'createdAt'>): Promise<Host> {
  const { data, error } = await supabase
    .from('hosts')
    .upsert({
      address: hostData.address,
      name: hostData.name,
      avatar_url: hostData.avatarUrl,
      bio: hostData.bio
    }, {
      onConflict: 'address'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating/updating host:', error)
    throw error
  }

  return transformHostFromDB(data)
}

// Get host by address
export async function getHostByAddress(address: string): Promise<Host | null> {
  if (!address) return null; // Guard against empty or undefined address
  const { data, error } = await supabase
    .from('hosts')
    .select('*')
    .eq('address', address)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Host not found
    }
    console.error('Error fetching host:', error)
    throw error
  }

  return transformHostFromDB(data)
}

// Update host profile (same as createOrUpdateHost but more explicit naming)
export async function updateHostProfile(address: string, updates: Partial<Pick<Host, 'name' | 'avatarUrl' | 'bio'>>): Promise<Host> {
  const existingHost = await getHostByAddress(address);
  
  const updatedData = {
    address,
    name: updates.name !== undefined ? updates.name : existingHost?.name,
    avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : existingHost?.avatarUrl,
    bio: updates.bio !== undefined ? updates.bio : existingHost?.bio,
  };

  return createOrUpdateHost(updatedData);
}

// Get all hosts with their stats
export async function getHostsWithStats(): Promise<Array<Host & { eventCount: number; signupCount: number }>> {
  const { data, error } = await supabase
    .from('host_stats')
    .select('*')
    .order('total_events', { ascending: false })

  if (error) {
    console.error('Error fetching host stats:', error)
    throw error
  }

  return data.map(host => ({
    id: host.id || '',
    address: host.address,
    name: host.name,
    avatarUrl: host.avatar_url,
    bio: host.bio,
    createdAt: host.created_at,
    eventCount: host.total_events || 0,
    signupCount: host.total_signups || 0
  }))
}

// Transform database row to Host interface
function transformHostFromDB(dbHost: any): Host {
  return {
    id: dbHost.id,
    address: dbHost.address,
    name: dbHost.name,
    avatarUrl: dbHost.avatar_url,
    bio: dbHost.bio,
    createdAt: dbHost.created_at
  }
}
