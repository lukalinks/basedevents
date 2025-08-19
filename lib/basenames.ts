import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

// Base network public client for ENS resolution
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

// Cache to store resolved names to avoid repeated API calls
const nameCache = new Map<string, string | null>()
const avatarCache = new Map<string, string | null>()

/**
 * Resolve a Base name (ENS) from a wallet address
 * @param address - The wallet address to resolve
 * @returns The Base name if found, null otherwise
 */
export async function getBaseName(address: string): Promise<string | null> {
  if (!address) return null
  
  const normalizedAddress = address.toLowerCase()
  
  // Check cache first
  if (nameCache.has(normalizedAddress)) {
    return nameCache.get(normalizedAddress) || null
  }
  
  try {
    // Use viem's built-in ENS resolution for Base network
    const ensName = await publicClient.getEnsName({
      address: address as `0x${string}`,
    })
    
    // Cache the result (including null results to avoid repeated failed lookups)
    nameCache.set(normalizedAddress, ensName)
    
    return ensName
  } catch (error) {
    console.debug('Failed to resolve Base name for address:', address, error)
    // Cache null result to avoid repeated failed lookups
    nameCache.set(normalizedAddress, null)
    return null
  }
}

/**
 * Get the avatar for a Base name
 * @param baseName - The Base name (e.g., "username.base.eth")
 * @returns The avatar URL if found, null otherwise
 */
export async function getBaseNameAvatar(baseName: string): Promise<string | null> {
  if (!baseName) return null
  
  // Check cache first
  if (avatarCache.has(baseName)) {
    return avatarCache.get(baseName) || null
  }
  
  try {
    const avatar = await publicClient.getEnsAvatar({
      name: baseName,
    })
    
    // Cache the result
    avatarCache.set(baseName, avatar)
    
    return avatar
  } catch (error) {
    console.debug('Failed to resolve Base name avatar for:', baseName, error)
    // Cache null result
    avatarCache.set(baseName, null)
    return null
  }
}

/**
 * Get display name for a user - prioritizes Base name over custom profile name
 * @param address - The wallet address
 * @param profileName - The custom profile name from the database
 * @returns The best display name available
 */
export async function getDisplayName(address: string, profileName?: string): Promise<{
  displayName: string
  isBaseName: boolean
  baseName?: string
}> {
  if (!address) {
    return {
      displayName: profileName || 'Anonymous',
      isBaseName: false
    }
  }
  
  try {
    const baseName = await getBaseName(address)
    
    if (baseName) {
      return {
        displayName: baseName,
        isBaseName: true,
        baseName: baseName
      }
    }
    
    // Fall back to profile name or formatted address
    if (profileName) {
      return {
        displayName: profileName,
        isBaseName: false
      }
    }
    
    // Format address as fallback
    const formattedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`
    return {
      displayName: formattedAddress,
      isBaseName: false
    }
  } catch (error) {
    console.debug('Error getting display name:', error)
    
    // Fallback to profile name or formatted address
    if (profileName) {
      return {
        displayName: profileName,
        isBaseName: false
      }
    }
    
    const formattedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`
    return {
      displayName: formattedAddress,
      isBaseName: false
    }
  }
}

/**
 * Get comprehensive user info including Base name and avatar
 * @param address - The wallet address
 * @param profileName - The custom profile name from database
 * @param profileAvatar - The custom avatar URL from database
 * @returns Complete user display information
 */
export async function getUserDisplayInfo(
  address: string, 
  profileName?: string, 
  profileAvatar?: string
): Promise<{
  displayName: string
  avatar: string | null
  isBaseName: boolean
  baseName?: string
  address: string
}> {
  if (!address) {
    return {
      displayName: profileName || 'Anonymous',
      avatar: profileAvatar || null,
      isBaseName: false,
      address: ''
    }
  }
  
  try {
    const baseName = await getBaseName(address)
    let avatar = profileAvatar || null
    
    if (baseName) {
      // If user has a Base name, try to get the Base name avatar
      const baseAvatar = await getBaseNameAvatar(baseName)
      // Prioritize Base name avatar over profile avatar
      avatar = baseAvatar || profileAvatar || null
      
      return {
        displayName: baseName,
        avatar,
        isBaseName: true,
        baseName,
        address
      }
    }
    
    // No Base name, use profile info
    const displayName = profileName || `${address.slice(0, 6)}...${address.slice(-4)}`
    
    return {
      displayName,
      avatar,
      isBaseName: false,
      address
    }
  } catch (error) {
    console.debug('Error getting user display info:', error)
    
    // Fallback to profile info
    const displayName = profileName || `${address.slice(0, 6)}...${address.slice(-4)}`
    
    return {
      displayName,
      avatar: profileAvatar || null,
      isBaseName: false,
      address
    }
  }
}

/**
 * Clear the name resolution cache (useful for testing or forced refresh)
 */
export function clearBaseNameCache(): void {
  nameCache.clear()
  avatarCache.clear()
}

/**
 * Preload Base names for multiple addresses (useful for lists)
 * @param addresses - Array of addresses to preload
 */
export async function preloadBaseNames(addresses: string[]): Promise<void> {
  const promises = addresses
    .filter(addr => addr && !nameCache.has(addr.toLowerCase()))
    .map(addr => getBaseName(addr))
  
  try {
    await Promise.all(promises)
  } catch (error) {
    console.debug('Error preloading Base names:', error)
  }
}
