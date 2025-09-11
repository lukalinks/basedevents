'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { 
  ProofOfAttendance, 
  EventCheckInSettings, 
  checkInAttendee, 
  claimPOA, 
  getEventPOAForAttendee,
  getEventCheckInSettings,
  createOrUpdateCheckInSettings
} from '@/lib/events'
import { Event } from '@/lib/events'

interface POAFrameInterfaceProps {
  event: Event
  userAddress?: string
  isCreator?: boolean
}

export default function POAFrameInterface({ event, userAddress, isCreator = false }: POAFrameInterfaceProps) {
  const [userPOA, setUserPOA] = useState<ProofOfAttendance | null>(null)
  const [checkInSettings, setCheckInSettings] = useState<EventCheckInSettings | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string>('')
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [attendeeAddress, setAttendeeAddress] = useState('')

  useEffect(() => {
    loadPOAData()
  }, [event.id, userAddress])

  const loadPOAData = async () => {
    if (!userAddress) return

    try {
      setIsLoading(true)
      
      // Load user's POA for this event
      const poa = await getEventPOAForAttendee(event.id, userAddress)
      setUserPOA(poa)

      // Load check-in settings if creator
      if (isCreator) {
        const settings = await getEventCheckInSettings(event.id)
        setCheckInSettings(settings)
      }
    } catch (error) {
      console.error('Error loading POA data:', error)
      setMessage('Error loading POA data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckIn = async () => {
    if (!attendeeAddress || !isCreator) return

    try {
      setIsLoading(true)
      setMessage('Checking in attendee...')

      const poa = await checkInAttendee(event.id, attendeeAddress, {
        method: 'manual',
        location: null
      })

      setMessage(`✅ Successfully checked in ${attendeeAddress}! POA created.`)
      setAttendeeAddress('')
      
      // Reload POA data
      await loadPOAData()
    } catch (error) {
      console.error('Check-in error:', error)
      setMessage(`❌ Check-in failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClaimPOA = async () => {
    if (!userPOA || !userAddress) return

    try {
      setIsLoading(true)
      setMessage('Claiming POA...')

      const updatedPOA = await claimPOA(userPOA.id, userAddress)
      setUserPOA(updatedPOA)
      setMessage('🎉 POA claimed successfully!')
    } catch (error) {
      console.error('Claim error:', error)
      setMessage(`❌ Claim failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetupPOA = async () => {
    if (!isCreator) return

    try {
      setIsLoading(true)
      setMessage('Setting up POA system...')

      await createOrUpdateCheckInSettings(event.id, {
        check_in_enabled: true,
        check_in_start_time: new Date().toISOString(),
        check_in_end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        require_geolocation: false,
        geolocation_radius: 100,
        auto_issue_poa: true,
        poa_title: `${event.title} - Proof of Attendance`,
        poa_description: `Proof that you attended ${event.title} on ${new Date(event.startTime).toLocaleDateString()}`,
        poa_image_url: event.imageUrl || '/logo.png',
        nft_contract_address: null,
        poa_template_id: null
      })

      setMessage('✅ POA system configured! Attendees can now be checked in.')
      await loadPOAData()
    } catch (error) {
      console.error('Setup error:', error)
      setMessage(`❌ Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state
  if (isLoading && !message) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    )
  }

  // Show message if any
  if (message) {
    return (
      <div className="p-4">
        <div className={`p-3 rounded-lg mb-4 ${
          message.includes('✅') || message.includes('🎉') 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : message.includes('❌')
            ? 'bg-red-100 text-red-800 border border-red-200'
            : 'bg-blue-100 text-blue-800 border border-blue-200'
        }`}>
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={() => setMessage('')}
          className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Continue
        </button>
      </div>
    )
  }

  // Event creator interface
  if (isCreator) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-2">🎫 POA Management</h3>
          <p className="text-sm text-gray-600">Manage Proof of Attendance for your event</p>
        </div>

        {!checkInSettings ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">
              POA system not configured yet. Set it up to enable attendee check-ins.
            </p>
            <button
              onClick={handleSetupPOA}
              disabled={isLoading}
              className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
            >
              🚀 Setup POA System
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800 font-medium">✅ POA System Active</p>
              <p className="text-xs text-green-600">Check-ins are enabled for this event</p>
            </div>

            <button
              onClick={() => setShowCheckIn(!showCheckIn)}
              className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {showCheckIn ? 'Hide' : 'Show'} Check-in Form
            </button>

            {showCheckIn && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Attendee Address
                  </label>
                  <input
                    type="text"
                    value={attendeeAddress}
                    onChange={(e) => setAttendeeAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleCheckIn}
                  disabled={!attendeeAddress || isLoading}
                  className="w-full py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50"
                >
                  ✅ Check In Attendee
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Attendee interface
  if (!userPOA) {
    return (
      <div className="p-4 text-center">
        <div className="text-4xl mb-3">🎫</div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No POA Yet</h3>
        <p className="text-sm text-gray-600 mb-4">
          You don't have a Proof of Attendance for this event yet. 
          {isCreator ? ' Check in attendees to create POAs.' : ' Wait for the organizer to check you in.'}
        </p>
      </div>
    )
  }

  // Show POA status
  return (
    <div className="p-4">
      <div className="text-center mb-4">
        <div className="text-4xl mb-2">🎫</div>
        <h3 className="text-lg font-bold text-gray-900">Your POA</h3>
        <p className="text-sm text-gray-600">{event.title}</p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="text-center">
          <div className="text-2xl mb-2">🎯</div>
          <h4 className="font-bold text-gray-900 mb-1">{userPOA.poa_title}</h4>
          <p className="text-sm text-gray-600 mb-3">{userPOA.poa_description}</p>
          
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
            <span>Checked in: {new Date(userPOA.checked_in_at).toLocaleDateString()}</span>
            <span>•</span>
            <span className={`px-2 py-1 rounded-full ${
              userPOA.status === 'claimed' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {userPOA.status === 'claimed' ? '✅ Claimed' : '⏳ Pending Claim'}
            </span>
          </div>
        </div>
      </div>

      {userPOA.status === 'issued' && (
        <button
          onClick={handleClaimPOA}
          disabled={isLoading}
          className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 disabled:opacity-50"
        >
          🎉 Claim My POA
        </button>
      )}

      {userPOA.status === 'claimed' && (
        <div className="text-center">
          <div className="bg-green-100 text-green-800 rounded-lg p-3 mb-3">
            <p className="text-sm font-medium">🎉 POA Successfully Claimed!</p>
            <p className="text-xs">This POA is now part of your collection</p>
          </div>
          <button
            onClick={() => window.open('/profile', '_blank')}
            className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            View My Collection
          </button>
        </div>
      )}
    </div>
  )
}
