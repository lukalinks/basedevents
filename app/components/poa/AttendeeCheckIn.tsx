'use client'

import { useState, useEffect } from 'react'
import { Event, EventRegistration, ProofOfAttendance } from '@/lib/events'
import { QRCodeSVG } from 'qrcode.react'

interface AttendeeCheckInProps {
  event: Event
  eventRegistrations: EventRegistration[]
  userAddress?: string
  onCheckInComplete?: (poa: ProofOfAttendance) => void
}

export default function AttendeeCheckIn({ 
  event, 
  eventRegistrations, 
  userAddress,
  onCheckInComplete 
}: AttendeeCheckInProps) {
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([])
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [checkInMethod, setCheckInMethod] = useState<'manual' | 'qr_code' | 'geolocation'>('manual')
  const [location, setLocation] = useState<{ latitude?: number; longitude?: number }>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Filter registrations based on search
  const filteredRegistrations = eventRegistrations.filter(reg =>
    reg.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.userAddress.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get current location for geolocation check-in
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setError(null)
      },
      (error) => {
        setError('Unable to get your location: ' + error.message)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  // Handle individual check-in
  const handleCheckIn = async (attendeeAddress: string, attendeeName?: string) => {
    if (!userAddress) {
      setError('You must be connected to check in attendees')
      return
    }

    try {
      setIsCheckingIn(true)
      setError(null)

      const payload = {
        action: 'checkin',
        attendeeAddress,
        checkedInBy: userAddress,
        method: checkInMethod,
        location: `${event.location}`,
        attendeeName,
        latitude: location.latitude,
        longitude: location.longitude,
      }

      const response = await fetch(`/api/events/${event.id}/poa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to check in attendee')
      }

      const poa = await response.json()
      setSuccess(`Successfully checked in ${attendeeName || attendeeAddress}`)
      onCheckInComplete?.(poa)

      // Remove from selected attendees
      setSelectedAttendees(prev => prev.filter(addr => addr !== attendeeAddress))

    } catch (error) {
      console.error('Error checking in attendee:', error)
      setError(error instanceof Error ? error.message : 'Failed to check in attendee')
    } finally {
      setIsCheckingIn(false)
    }
  }

  // Handle batch check-in
  const handleBatchCheckIn = async () => {
    if (!userAddress) {
      setError('You must be connected to check in attendees')
      return
    }

    if (selectedAttendees.length === 0) {
      setError('Please select attendees to check in')
      return
    }

    try {
      setIsCheckingIn(true)
      setError(null)

      const payload = {
        action: 'batch-checkin',
        attendeeAddresses: selectedAttendees,
        checkedInBy: userAddress,
        method: checkInMethod,
        location: `${event.location}`,
        latitude: location.latitude,
        longitude: location.longitude,
      }

      const response = await fetch(`/api/events/${event.id}/poa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to batch check in attendees')
      }

      const poas = await response.json()
      setSuccess(`Successfully checked in ${poas.length} attendees`)
      setSelectedAttendees([])

      // Call completion handler for each POA
      poas.forEach((poa: ProofOfAttendance) => {
        onCheckInComplete?.(poa)
      })

    } catch (error) {
      console.error('Error batch checking in attendees:', error)
      setError(error instanceof Error ? error.message : 'Failed to batch check in attendees')
    } finally {
      setIsCheckingIn(false)
    }
  }

  // Toggle attendee selection
  const toggleAttendeeSelection = (address: string) => {
    setSelectedAttendees(prev => 
      prev.includes(address) 
        ? prev.filter(addr => addr !== address)
        : [...prev, address]
    )
  }

  // Select all filtered attendees
  const selectAllFiltered = () => {
    const allAddresses = filteredRegistrations.map(reg => reg.userAddress)
    setSelectedAttendees(allAddresses)
  }

  // Clear selection
  const clearSelection = () => {
    setSelectedAttendees([])
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">Attendee Check-in</h3>
        <div className="text-sm text-white/70">
          {eventRegistrations.length} registered • {selectedAttendees.length} selected
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
          <p className="text-green-200">{success}</p>
        </div>
      )}

      {/* Check-in Method Selection */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">Check-in Method</h4>
        <div className="flex flex-wrap gap-3">
          {(['manual', 'qr_code', 'geolocation'] as const).map((method) => (
            <button
              key={method}
              onClick={() => setCheckInMethod(method)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                checkInMethod === method
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {method === 'manual' && '👥 Manual'}
              {method === 'qr_code' && '📱 QR Code'}
              {method === 'geolocation' && '📍 Location'}
            </button>
          ))}
        </div>

        {checkInMethod === 'geolocation' && (
          <div className="space-y-2">
            <button
              onClick={getCurrentLocation}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Get Current Location
            </button>
            {location.latitude && location.longitude && (
              <p className="text-sm text-white/70">
                Location: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </p>
            )}
          </div>
        )}

        {checkInMethod === 'qr_code' && (
          <div className="bg-white p-4 rounded-lg">
            <div className="text-center">
              <QRCodeSVG 
                value={`${window.location.origin}/events/${event.id}/checkin`}
                size={200}
                level="M"
                includeMargin={true}
              />
              <p className="text-sm text-gray-600 mt-2">
                Scan this QR code for quick check-in
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="Search attendees by name, email, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                     text-white placeholder-white/60 focus:outline-none focus:ring-2 
                     focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={selectAllFiltered}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Select All ({filteredRegistrations.length})
          </button>
          <button
            onClick={clearSelection}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Clear Selection
          </button>
          {selectedAttendees.length > 0 && (
            <button
              onClick={handleBatchCheckIn}
              disabled={isCheckingIn}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 
                       text-white rounded-lg transition-colors"
            >
              {isCheckingIn ? 'Checking in...' : `Check in ${selectedAttendees.length} Selected`}
            </button>
          )}
        </div>
      </div>

      {/* Attendee List */}
      <div className="space-y-3">
        <h4 className="text-lg font-medium text-white">
          Registered Attendees ({filteredRegistrations.length})
        </h4>
        
        <div className="max-h-96 overflow-y-auto space-y-2">
          {filteredRegistrations.map((registration) => (
            <div
              key={registration.id}
              className={`p-4 rounded-lg border transition-colors ${
                selectedAttendees.includes(registration.userAddress)
                  ? 'bg-blue-500/20 border-blue-500/50'
                  : 'bg-white/5 border-white/20 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedAttendees.includes(registration.userAddress)}
                    onChange={() => toggleAttendeeSelection(registration.userAddress)}
                    className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-white font-medium">{registration.userName}</div>
                    <div className="text-white/60 text-sm">{registration.userEmail}</div>
                    <div className="text-white/40 text-xs font-mono">
                      {registration.userAddress.slice(0, 6)}...{registration.userAddress.slice(-4)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {registration.status === 'confirmed' && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-200 text-xs rounded">
                      Registered
                    </span>
                  )}
                  <button
                    onClick={() => handleCheckIn(registration.userAddress, registration.userName)}
                    disabled={isCheckingIn}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 
                             text-white text-sm rounded transition-colors"
                  >
                    {isCheckingIn ? '...' : 'Check In'}
                  </button>
                </div>
              </div>
              
              {registration.userPhone && (
                <div className="text-white/60 text-sm mt-1">📞 {registration.userPhone}</div>
              )}
              {registration.userBio && (
                <div className="text-white/60 text-sm mt-1">💬 {registration.userBio}</div>
              )}
            </div>
          ))}
        </div>

        {filteredRegistrations.length === 0 && (
          <div className="text-center py-8 text-white/60">
            {searchTerm ? 'No attendees match your search.' : 'No registered attendees yet.'}
          </div>
        )}
      </div>
    </div>
  )
}
