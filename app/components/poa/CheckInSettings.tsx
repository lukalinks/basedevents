'use client'

import { useState, useEffect } from 'react'
import { Event, EventCheckInSettings, POATemplate } from '@/lib/events'

interface CheckInSettingsProps {
  event: Event
  onSettingsUpdate?: (settings: EventCheckInSettings) => void
}

export default function CheckInSettings({ event, onSettingsUpdate }: CheckInSettingsProps) {
  const [settings, setSettings] = useState<EventCheckInSettings | null>(null)
  const [templates, setTemplates] = useState<POATemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    checkInEnabled: true,
    checkInWindowStart: '',
    checkInWindowEnd: '',
    requireGeolocation: false,
    allowedCheckInRadius: 100,
    eventLatitude: 0,
    eventLongitude: 0,
    autoIssuePoa: true,
    poaTemplateTitle: '',
    poaTemplateDescription: '',
    poaTemplateImageUrl: '',
    enableNftPoa: false,
    nftContractAddress: '',
    nftBaseUri: '',
    nftCollectionName: '',
    nftCollectionSymbol: '',
  })

  // Load existing settings and templates
  useEffect(() => {
    loadSettings()
    loadTemplates()
  }, [event.id])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/events/${event.id}/checkin-settings`)
      if (response.ok) {
        const data = await response.json()
        if (data) {
          setSettings(data)
          setFormData({
            checkInEnabled: data.checkInEnabled,
            checkInWindowStart: data.checkInWindowStart ? 
              new Date(data.checkInWindowStart).toISOString().slice(0, 16) : '',
            checkInWindowEnd: data.checkInWindowEnd ? 
              new Date(data.checkInWindowEnd).toISOString().slice(0, 16) : '',
            requireGeolocation: data.requireGeolocation,
            allowedCheckInRadius: data.allowedCheckInRadius,
            eventLatitude: data.eventLatitude || 0,
            eventLongitude: data.eventLongitude || 0,
            autoIssuePoa: data.autoIssuePoa,
            poaTemplateTitle: data.poaTemplateTitle || `${event.title} - Proof of Attendance`,
            poaTemplateDescription: data.poaTemplateDescription || `You attended ${event.title} on ${event.date}`,
            poaTemplateImageUrl: data.poaTemplateImageUrl || event.imageUrl || '',
            enableNftPoa: data.enableNftPoa,
            nftContractAddress: data.nftContractAddress || '',
            nftBaseUri: data.nftBaseUri || '',
            nftCollectionName: data.nftCollectionName || event.title,
            nftCollectionSymbol: data.nftCollectionSymbol || 'POA',
          })
        } else {
          // Set defaults for new settings
          setFormData(prev => ({
            ...prev,
            poaTemplateTitle: `${event.title} - Proof of Attendance`,
            poaTemplateDescription: `You attended ${event.title} on ${event.date}`,
            poaTemplateImageUrl: event.imageUrl || '',
            nftCollectionName: event.title,
          }))
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setError('Failed to load check-in settings')
    } finally {
      setIsLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      const response = await fetch(`/api/poa/templates?public=true`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleTemplateSelect = (template: POATemplate) => {
    setFormData(prev => ({
      ...prev,
      poaTemplateTitle: template.name,
      poaTemplateDescription: template.description || '',
      poaTemplateImageUrl: template.templateImageUrl || '',
    }))
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)

      const payload = {
        ...formData,
        checkInWindowStart: formData.checkInWindowStart ? 
          new Date(formData.checkInWindowStart).toISOString() : null,
        checkInWindowEnd: formData.checkInWindowEnd ? 
          new Date(formData.checkInWindowEnd).toISOString() : null,
      }

      const response = await fetch(`/api/events/${event.id}/checkin-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }

      const updatedSettings = await response.json()
      setSettings(updatedSettings)
      onSettingsUpdate?.(updatedSettings)

    } catch (error) {
      console.error('Error saving settings:', error)
      setError(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">Check-in & POA Settings</h3>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 
                   text-white rounded-lg transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {/* Basic Check-in Settings */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">Check-in Configuration</h4>
        
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="checkInEnabled"
            checked={formData.checkInEnabled}
            onChange={(e) => handleInputChange('checkInEnabled', e.target.checked)}
            className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
          />
          <label htmlFor="checkInEnabled" className="text-white">
            Enable check-in for this event
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Check-in Opens
            </label>
            <input
              type="datetime-local"
              value={formData.checkInWindowStart}
              onChange={(e) => handleInputChange('checkInWindowStart', e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                       text-white placeholder-white/60 focus:outline-none focus:ring-2 
                       focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Check-in Closes
            </label>
            <input
              type="datetime-local"
              value={formData.checkInWindowEnd}
              onChange={(e) => handleInputChange('checkInWindowEnd', e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                       text-white placeholder-white/60 focus:outline-none focus:ring-2 
                       focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="requireGeolocation"
            checked={formData.requireGeolocation}
            onChange={(e) => handleInputChange('requireGeolocation', e.target.checked)}
            className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
          />
          <label htmlFor="requireGeolocation" className="text-white">
            Require attendees to be at event location to check in
          </label>
        </div>

        {formData.requireGeolocation && (
          <div className="ml-7 space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Allowed Check-in Radius (meters)
              </label>
              <input
                type="number"
                min="10"
                max="1000"
                value={formData.allowedCheckInRadius}
                onChange={(e) => handleInputChange('allowedCheckInRadius', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                         text-white placeholder-white/60 focus:outline-none focus:ring-2 
                         focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Event Latitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.eventLatitude}
                  onChange={(e) => handleInputChange('eventLatitude', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                           text-white placeholder-white/60 focus:outline-none focus:ring-2 
                           focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Event Longitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.eventLongitude}
                  onChange={(e) => handleInputChange('eventLongitude', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                           text-white placeholder-white/60 focus:outline-none focus:ring-2 
                           focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* POA Settings */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">Proof of Attendance (POA) Settings</h4>
        
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="autoIssuePoa"
            checked={formData.autoIssuePoa}
            onChange={(e) => handleInputChange('autoIssuePoa', e.target.checked)}
            className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
          />
          <label htmlFor="autoIssuePoa" className="text-white">
            Automatically issue POA after check-in
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            POA Title
          </label>
          <input
            type="text"
            value={formData.poaTemplateTitle}
            onChange={(e) => handleInputChange('poaTemplateTitle', e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                     text-white placeholder-white/60 focus:outline-none focus:ring-2 
                     focus:ring-blue-500"
            placeholder="e.g., Web3 Meetup - Proof of Attendance"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            POA Description
          </label>
          <textarea
            value={formData.poaTemplateDescription}
            onChange={(e) => handleInputChange('poaTemplateDescription', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                     text-white placeholder-white/60 focus:outline-none focus:ring-2 
                     focus:ring-blue-500"
            placeholder="Description of what this POA represents"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            POA Image URL
          </label>
          <input
            type="url"
            value={formData.poaTemplateImageUrl}
            onChange={(e) => handleInputChange('poaTemplateImageUrl', e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                     text-white placeholder-white/60 focus:outline-none focus:ring-2 
                     focus:ring-blue-500"
            placeholder="Image URL for the POA"
          />
        </div>

        {/* Template Selection */}
        {templates.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Use Template (Optional)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.slice(0, 6).map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="p-3 bg-white/5 hover:bg-white/10 border border-white/20 
                           rounded-lg text-left transition-colors"
                >
                  <div className="text-sm font-medium text-white">{template.name}</div>
                  <div className="text-xs text-white/60 mt-1">{template.category}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* NFT POA Settings */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">NFT POA Settings</h4>
        
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="enableNftPoa"
            checked={formData.enableNftPoa}
            onChange={(e) => handleInputChange('enableNftPoa', e.target.checked)}
            className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
          />
          <label htmlFor="enableNftPoa" className="text-white">
            Enable NFT POA minting
          </label>
        </div>

        {formData.enableNftPoa && (
          <div className="ml-7 space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                NFT Contract Address
              </label>
              <input
                type="text"
                value={formData.nftContractAddress}
                onChange={(e) => handleInputChange('nftContractAddress', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                         text-white placeholder-white/60 focus:outline-none focus:ring-2 
                         focus:ring-blue-500"
                placeholder="0x..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Collection Name
                </label>
                <input
                  type="text"
                  value={formData.nftCollectionName}
                  onChange={(e) => handleInputChange('nftCollectionName', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                           text-white placeholder-white/60 focus:outline-none focus:ring-2 
                           focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Collection Symbol
                </label>
                <input
                  type="text"
                  value={formData.nftCollectionSymbol}
                  onChange={(e) => handleInputChange('nftCollectionSymbol', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                           text-white placeholder-white/60 focus:outline-none focus:ring-2 
                           focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Base URI for NFT Metadata
              </label>
              <input
                type="url"
                value={formData.nftBaseUri}
                onChange={(e) => handleInputChange('nftBaseUri', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                         text-white placeholder-white/60 focus:outline-none focus:ring-2 
                         focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
