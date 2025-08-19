'use client'

import { useState, useEffect } from 'react'
import { Host } from '../../lib/hosts'
import ProfileForm from './ProfileForm'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  userAddress: string
  onProfileUpdated?: (profile: Host) => void
}

export default function ProfileModal({ 
  isOpen, 
  onClose, 
  userAddress, 
  onProfileUpdated 
}: ProfileModalProps) {
  const [profile, setProfile] = useState<Host | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && userAddress) {
      fetchProfile()
    }
  }, [isOpen, userAddress])

  const fetchProfile = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/profile?address=${encodeURIComponent(userAddress)}`)
      
      if (response.status === 404) {
        // Profile doesn't exist yet, that's okay
        setProfile(null)
      } else if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch profile')
      } else {
        const { profile } = await response.json()
        setProfile(profile)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setError(error instanceof Error ? error.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = (updatedProfile: Host) => {
    setProfile(updatedProfile)
    onProfileUpdated?.(updatedProfile)
    onClose()
  }

  const handleCancel = () => {
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-[var(--app-background)] border-2 border-[var(--app-card-border)] rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-scale-in">
        <div className="sticky top-0 bg-gradient-to-r from-[var(--app-card-bg)] to-[var(--app-card-bg)]/95 backdrop-blur-lg border-b border-[var(--app-card-border)] p-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-[var(--app-foreground)]">
                Profile Settings
              </h2>
              <p className="text-sm text-[var(--app-foreground-muted)] mt-1">
                Customize your profile information
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--app-gray)] hover:bg-[var(--app-gray-dark)] text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] transition-all duration-200 text-xl font-bold"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <div className="p-6">
            {/* Content */}
            {error ? (
              <div className="text-center py-12">
                <div className="text-red-500 mb-6">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-xl font-semibold text-[var(--app-foreground)] mb-2">Error loading profile</p>
                  <p className="text-sm text-[var(--app-foreground-muted)]">{error}</p>
                </div>
                <button
                  onClick={fetchProfile}
                  className="px-6 py-3 bg-[var(--app-accent)] text-white rounded-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] transition-all font-medium"
                >
                  Try Again
                </button>
              </div>
            ) : loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--app-accent)] border-t-transparent mx-auto mb-6"></div>
                <p className="text-[var(--app-foreground-muted)] text-lg">Loading profile...</p>
              </div>
            ) : (
              <ProfileForm
                userAddress={userAddress}
                initialProfile={profile}
                onSave={handleSave}
                onCancel={handleCancel}
                isLoading={loading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
