'use client'

import { useState, useEffect } from 'react'
import { getUserDisplayInfo } from '../../lib/basenames'

interface UserDisplayProps {
  address: string
  profileName?: string
  profileAvatar?: string
  showAvatar?: boolean
  showBaseBadge?: boolean
  avatarSize?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function UserDisplay({ 
  address, 
  profileName, 
  profileAvatar, 
  showAvatar = true, 
  showBaseBadge = true,
  avatarSize = 'md',
  className = ''
}: UserDisplayProps) {
  const [userInfo, setUserInfo] = useState<{
    displayName: string;
    avatar: string | null;
    isBaseName: boolean;
    baseName?: string;
    address: string;
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const info = await getUserDisplayInfo(address, profileName, profileAvatar)
        setUserInfo(info)
      } catch (error) {
        console.debug('Error loading user display info:', error)
        // Fallback to basic info
        setUserInfo({
          displayName: profileName || `${address.slice(0, 6)}...${address.slice(-4)}`,
          avatar: profileAvatar || null,
          isBaseName: false,
          address
        })
      } finally {
        setLoading(false)
      }
    }

    if (address) {
      loadUserInfo()
    } else {
      setLoading(false)
    }
  }, [address, profileName, profileAvatar])

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showAvatar && (
          <div className={`bg-gray-200 rounded-full animate-pulse ${
            avatarSize === 'sm' ? 'w-6 h-6' : 
            avatarSize === 'lg' ? 'w-12 h-12' : 'w-8 h-8'
          }`} />
        )}
        <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
      </div>
    )
  }

  if (!userInfo) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showAvatar && (
          <div className={`bg-[var(--app-gray)] rounded-full flex items-center justify-center text-white font-bold ${
            avatarSize === 'sm' ? 'w-6 h-6 text-xs' : 
            avatarSize === 'lg' ? 'w-12 h-12 text-lg' : 'w-8 h-8 text-sm'
          }`}>
            ?
          </div>
        )}
        <span className="text-[var(--app-foreground-muted)]">Unknown</span>
      </div>
    )
  }

  const avatarSizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-lg'
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showAvatar && (
        userInfo.avatar ? (
          <img 
            src={userInfo.avatar} 
            alt={`${userInfo.displayName} avatar`}
            className={`rounded-full object-cover ${avatarSizeClasses[avatarSize]}`}
          />
        ) : (
          <div className={`bg-gradient-to-br from-[var(--app-accent)] to-[var(--app-accent)]/80 rounded-full flex items-center justify-center text-white font-bold ${avatarSizeClasses[avatarSize]}`}>
            {userInfo.displayName.charAt(0).toUpperCase()}
          </div>
        )
      )}
      
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-medium text-[var(--app-foreground)] truncate">
          {userInfo.displayName}
        </span>
        
        {showBaseBadge && userInfo.isBaseName && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex-shrink-0">
            <svg className="w-2.5 h-2.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Base
          </span>
        )}
      </div>
    </div>
  )
}

// Hook version for more advanced use cases
export function useUserDisplay(address: string, profileName?: string, profileAvatar?: string) {
  const [userInfo, setUserInfo] = useState<{
    displayName: string;
    avatar: string | null;
    isBaseName: boolean;
    baseName?: string;
    address: string;
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadUserInfo = async () => {
      if (!address) {
        setLoading(false)
        return
      }

      try {
        setError(null)
        const info = await getUserDisplayInfo(address, profileName, profileAvatar)
        setUserInfo(info)
      } catch (err) {
        console.debug('Error loading user display info:', err)
        setError(err instanceof Error ? err.message : 'Failed to load user info')
        // Fallback to basic info
        setUserInfo({
          displayName: profileName || `${address.slice(0, 6)}...${address.slice(-4)}`,
          avatar: profileAvatar || null,
          isBaseName: false,
          address
        })
      } finally {
        setLoading(false)
      }
    }

    loadUserInfo()
  }, [address, profileName, profileAvatar])

  return { userInfo, loading, error }
}
