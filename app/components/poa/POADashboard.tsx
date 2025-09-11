'use client'

import { useState, useEffect } from 'react'
import { Event, ProofOfAttendance } from '@/lib/events'

interface POAStats {
  totalRegistrations: number
  totalCheckedIn: number
  totalPOAsIssued: number
  totalPOAsClaimed: number
  checkInRate: number
  claimRate: number
}

interface POADashboardProps {
  event: Event
  userAddress?: string
}

export default function POADashboard({ event, userAddress }: POADashboardProps) {
  const [stats, setStats] = useState<POAStats | null>(null)
  const [poas, setPoas] = useState<ProofOfAttendance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [event.id])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Load stats and POAs in parallel
      const [statsResponse, poasResponse] = await Promise.all([
        fetch(`/api/events/${event.id}/poa?stats=true`),
        fetch(`/api/events/${event.id}/poa`)
      ])

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      if (poasResponse.ok) {
        const poasData = await poasResponse.json()
        setPoas(poasData)
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setError('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleIssuePOA = async (attendeeAddress: string) => {
    if (!userAddress) return

    try {
      const response = await fetch(`/api/events/${event.id}/poa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'issue',
          attendeeAddress,
          checkedInBy: userAddress,
          poaType: 'digital', // Can be made configurable
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to issue POA')
      }

      // Refresh data
      await loadDashboardData()

    } catch (error) {
      console.error('Error issuing POA:', error)
      setError(error instanceof Error ? error.message : 'Failed to issue POA')
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6">POA Statistics</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{stats.totalRegistrations}</div>
              <div className="text-white/70 text-sm">Registered</div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-400">{stats.totalCheckedIn}</div>
              <div className="text-white/70 text-sm">Checked In</div>
              <div className="text-blue-300 text-xs">{stats.checkInRate.toFixed(1)}%</div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">{stats.totalPOAsIssued}</div>
              <div className="text-white/70 text-sm">POAs Issued</div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-400">{stats.totalPOAsClaimed}</div>
              <div className="text-white/70 text-sm">POAs Claimed</div>
              <div className="text-purple-300 text-xs">{stats.claimRate.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {/* POA Management */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Proof of Attendance Records</h3>
          <div className="text-sm text-white/70">
            {poas.length} total POAs
          </div>
        </div>

        {poas.length === 0 ? (
          <div className="text-center py-8 text-white/60">
            No POAs issued yet. Check in attendees to start issuing POAs.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="max-h-96 overflow-y-auto space-y-2">
              {poas.map((poa) => (
                <div
                  key={poa.id}
                  className="p-4 bg-white/5 border border-white/20 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">
                        {poa.attendeeName || 'Unknown Attendee'}
                      </div>
                      <div className="text-white/60 text-sm font-mono">
                        {poa.attendeeAddress.slice(0, 6)}...{poa.attendeeAddress.slice(-4)}
                      </div>
                      {poa.checkedInAt && (
                        <div className="text-white/50 text-xs">
                          Checked in: {new Date(poa.checkedInAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {/* Status Badge */}
                      <span className={`px-2 py-1 text-xs rounded ${
                        poa.status === 'pending' ? 'bg-yellow-500/20 text-yellow-200' :
                        poa.status === 'issued' ? 'bg-green-500/20 text-green-200' :
                        poa.status === 'claimed' ? 'bg-blue-500/20 text-blue-200' :
                        'bg-gray-500/20 text-gray-200'
                      }`}>
                        {poa.status.charAt(0).toUpperCase() + poa.status.slice(1)}
                      </span>

                      {/* POA Type */}
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-200 text-xs rounded">
                        {poa.poaType === 'digital' ? '💻 Digital' :
                         poa.poaType === 'nft' ? '🎨 NFT' :
                         '🎨💻 Both'}
                      </span>

                      {/* Actions */}
                      {poa.status === 'pending' && userAddress && (
                        <button
                          onClick={() => handleIssuePOA(poa.attendeeAddress)}
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded transition-colors"
                        >
                          Issue POA
                        </button>
                      )}

                      {poa.nftTxHash && (
                        <a
                          href={`https://basescan.org/tx/${poa.nftTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors"
                        >
                          View NFT
                        </a>
                      )}
                    </div>
                  </div>

                  {/* POA Details */}
                  {poa.poaTitle && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="text-white/80 text-sm font-medium">{poa.poaTitle}</div>
                      {poa.poaDescription && (
                        <div className="text-white/60 text-sm mt-1">{poa.poaDescription}</div>
                      )}
                    </div>
                  )}

                  {/* Check-in Details */}
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/50">
                    {poa.checkInMethod && (
                      <span>Method: {poa.checkInMethod.replace('_', ' ')}</span>
                    )}
                    {poa.checkInLocation && (
                      <span>Location: {poa.checkInLocation}</span>
                    )}
                    {poa.checkedInBy && (
                      <span>By: {poa.checkedInBy.slice(0, 6)}...{poa.checkedInBy.slice(-4)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
