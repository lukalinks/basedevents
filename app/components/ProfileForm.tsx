'use client'

import { useState, useEffect } from 'react'
import { Host } from '../../lib/hosts'

interface ProfileFormProps {
  userAddress: string
  initialProfile?: Host | null
  onSave: (profile: Host) => void
  onCancel: () => void
  isLoading?: boolean
}

export default function ProfileForm({ 
  userAddress, 
  initialProfile, 
  onSave, 
  onCancel, 
  isLoading = false 
}: ProfileFormProps) {
  const [formData, setFormData] = useState({
    name: initialProfile?.name || '',
    bio: initialProfile?.bio || '',
    avatarUrl: initialProfile?.avatarUrl || ''
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialProfile) {
      setFormData({
        name: initialProfile.name || '',
        bio: initialProfile.bio || '',
        avatarUrl: initialProfile.avatarUrl || ''
      })
    }
  }, [initialProfile])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long'
    }
    
    if (formData.name.trim().length > 100) {
      newErrors.name = 'Name must be less than 100 characters'
    }
    
    if (formData.bio.trim().length > 500) {
      newErrors.bio = 'Bio must be less than 500 characters'
    }
    
    if (formData.avatarUrl && !isValidUrl(formData.avatarUrl)) {
      newErrors.avatarUrl = 'Please enter a valid URL'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidUrl = (string: string) => {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setSaving(true)
    
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: userAddress,
          name: formData.name.trim() || null,
          bio: formData.bio.trim() || null,
          avatarUrl: formData.avatarUrl.trim() || null,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }
      
      const { profile } = await response.json()
      onSave(profile)
    } catch (error) {
      console.error('Error updating profile:', error)
      setErrors({ 
        submit: error instanceof Error ? error.message : 'Failed to update profile' 
      })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Preview */}
        {formData.avatarUrl && (
          <div className="flex justify-center mb-4">
            <div className="relative">
              <img 
                src={formData.avatarUrl} 
                alt="Avatar preview" 
                className="w-20 h-20 rounded-full object-cover border-4 border-[var(--app-card-border)]"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
        )}

        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[var(--app-foreground)] mb-2">
            Display Name
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full px-4 py-3 border rounded-xl bg-[var(--app-card-bg)] border-[var(--app-card-border)] text-[var(--app-foreground)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent transition-all ${
              errors.name ? 'border-red-500 focus:ring-red-500' : ''
            }`}
            placeholder="Enter your display name"
            disabled={saving || isLoading}
          />
          {errors.name && (
            <p className="mt-2 text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        {/* Avatar URL Field */}
        <div>
          <label htmlFor="avatarUrl" className="block text-sm font-medium text-[var(--app-foreground)] mb-2">
            Avatar URL (optional)
          </label>
          <input
            type="url"
            id="avatarUrl"
            value={formData.avatarUrl}
            onChange={(e) => handleInputChange('avatarUrl', e.target.value)}
            className={`w-full px-4 py-3 border rounded-xl bg-[var(--app-card-bg)] border-[var(--app-card-border)] text-[var(--app-foreground)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent transition-all ${
              errors.avatarUrl ? 'border-red-500 focus:ring-red-500' : ''
            }`}
            placeholder="https://example.com/your-avatar.jpg"
            disabled={saving || isLoading}
          />
          {errors.avatarUrl && (
            <p className="mt-2 text-sm text-red-500">{errors.avatarUrl}</p>
          )}
        </div>

        {/* Bio Field */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-[var(--app-foreground)] mb-2">
            Bio (optional)
          </label>
          <textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            rows={4}
            className={`w-full px-4 py-3 border rounded-xl bg-[var(--app-card-bg)] border-[var(--app-card-border)] text-[var(--app-foreground)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent transition-all resize-none ${
              errors.bio ? 'border-red-500 focus:ring-red-500' : ''
            }`}
            placeholder="Tell us about yourself..."
            disabled={saving || isLoading}
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-sm text-[var(--app-foreground-muted)]">
              {formData.bio.length}/500 characters
            </p>
            {errors.bio && (
              <p className="text-sm text-red-500">{errors.bio}</p>
            )}
          </div>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-4 pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-3 text-[var(--app-foreground-muted)] bg-[var(--app-gray)] border border-[var(--app-card-border)] rounded-xl hover:bg-[var(--app-gray-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] transition-all font-medium"
            disabled={saving || isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-[var(--app-accent)] text-white rounded-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            disabled={saving || isLoading}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </span>
            ) : (
              'Save Profile'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
