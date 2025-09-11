'use client'

import { useState, useEffect } from 'react'
import { ProofOfAttendance } from '@/lib/events'
import Image from 'next/image'

interface UserPOACollectionProps {
  userAddress: string
}

export default function UserPOACollection({ userAddress }: UserPOACollectionProps) {
  const [poas, setPoas] = useState<ProofOfAttendance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPOA, setSelectedPOA] = useState<ProofOfAttendance | null>(null)

  useEffect(() => {
    loadUserPOAs()
  }, [userAddress])

  const loadUserPOAs = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/poa/user/${userAddress}`)
      
      if (!response.ok) {
        if (response.status === 500) {
          // Database not set up yet
          setError('POA database not configured yet. Please set up the database tables first.')
          return
        }
        throw new Error('Failed to fetch POAs')
      }

      const data = await response.json()
      setPoas(data)
    } catch (error) {
      console.error('Error loading user POAs:', error)
      setError('Failed to load your POA collection. Please check if the database is set up.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClaimPOA = async (poa: ProofOfAttendance) => {
    if (!poa.event?.id) return

    try {
      const response = await fetch(`/api/events/${poa.event.id}/poa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'claim',
          attendeeAddress: userAddress,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to claim POA')
      }

      // Refresh POAs
      await loadUserPOAs()
    } catch (error) {
      console.error('Error claiming POA:', error)
      setError(error instanceof Error ? error.message : 'Failed to claim POA')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">My POA Collection</h2>
            <p className="text-white/70 mt-1">
              Your proof of attendance tokens from events you've attended
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-400">{poas.length}</div>
            <div className="text-white/70 text-sm">POAs Collected</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <h3 className="text-yellow-200 font-semibold mb-2">Database Setup Required</h3>
              <p className="text-yellow-200/80 mb-3">{error}</p>
              <div className="bg-yellow-500/10 rounded-lg p-3">
                <p className="text-yellow-200/90 text-sm mb-2">
                  <strong>To fix this:</strong>
                </p>
                <ol className="text-yellow-200/80 text-sm space-y-1 list-decimal list-inside">
                  <li>Go to your Supabase Dashboard</li>
                  <li>Open SQL Editor</li>
                  <li>Run the script from <code className="bg-yellow-500/20 px-1 rounded">setup-poa-database.sql</code></li>
                  <li>Refresh this page</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POA Grid */}
      {poas.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4">🎫</div>
          <h3 className="text-xl font-semibold text-white mb-2">No POAs Yet</h3>
          <p className="text-white/70">
            Attend events and check in to start collecting proof of attendance tokens!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {poas.map((poa) => (
            <div
              key={poa.id}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 hover:bg-white/15 
                       transition-all duration-200 cursor-pointer"
              onClick={() => setSelectedPOA(poa)}
            >
              {/* POA Image */}
              <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                {poa.poaImageUrl ? (
                  <Image
                    src={poa.poaImageUrl}
                    alt={poa.poaTitle || 'POA'}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-4xl">🎫</div>
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    poa.status === 'issued' ? 'bg-green-500/80 text-white' :
                    poa.status === 'claimed' ? 'bg-blue-500/80 text-white' :
                    'bg-yellow-500/80 text-white'
                  }`}>
                    {poa.status === 'issued' ? '✨ Available' :
                     poa.status === 'claimed' ? '🎯 Claimed' :
                     '⏳ Pending'}
                  </span>
                </div>

                {/* POA Type Badge */}
                <div className="absolute top-3 left-3">
                  <span className="px-2 py-1 bg-purple-500/80 text-white text-xs rounded-full">
                    {poa.poaType === 'digital' ? '💻' :
                     poa.poaType === 'nft' ? '🎨' :
                     '🎨💻'}
                  </span>
                </div>
              </div>

              {/* POA Details */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-white truncate">
                    {poa.poaTitle || 'Proof of Attendance'}
                  </h3>
                  {poa.event && (
                    <p className="text-white/70 text-sm">
                      {poa.event.title} • {formatDate(poa.event.date)}
                    </p>
                  )}
                </div>

                {poa.poaDescription && (
                  <p className="text-white/60 text-sm line-clamp-2">
                    {poa.poaDescription}
                  </p>
                )}

                {/* Action Button */}
                {poa.status === 'issued' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleClaimPOA(poa)
                    }}
                    className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white 
                             rounded-lg transition-colors"
                  >
                    Claim POA
                  </button>
                )}

                {poa.nftTxHash && (
                  <a
                    href={`https://basescan.org/tx/${poa.nftTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="block w-full py-2 bg-green-500 hover:bg-green-600 text-white 
                             rounded-lg transition-colors text-center"
                  >
                    View on Basescan
                  </a>
                )}

                {/* Timestamps */}
                <div className="text-xs text-white/50 space-y-1">
                  {poa.checkedInAt && (
                    <div>Checked in: {formatDate(poa.checkedInAt)}</div>
                  )}
                  {poa.issuedAt && (
                    <div>Issued: {formatDate(poa.issuedAt)}</div>
                  )}
                  {poa.claimedAt && (
                    <div>Claimed: {formatDate(poa.claimedAt)}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* POA Detail Modal */}
      {selectedPOA && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">POA Details</h3>
              <button
                onClick={() => setSelectedPOA(null)}
                className="text-white/70 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* POA Image */}
            <div className="relative w-full h-64 mb-6 rounded-lg overflow-hidden bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              {selectedPOA.poaImageUrl ? (
                <Image
                  src={selectedPOA.poaImageUrl}
                  alt={selectedPOA.poaTitle || 'POA'}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-6xl">🎫</div>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold text-white">
                  {selectedPOA.poaTitle}
                </h4>
                {selectedPOA.poaDescription && (
                  <p className="text-white/70 mt-1">{selectedPOA.poaDescription}</p>
                )}
              </div>

              {selectedPOA.event && (
                <div>
                  <h5 className="text-sm font-medium text-white/80 mb-2">Event Details</h5>
                  <div className="bg-white/5 rounded-lg p-3 space-y-1">
                    <div className="text-white">{selectedPOA.event.title}</div>
                    <div className="text-white/70 text-sm">
                      📅 {formatDate(selectedPOA.event.date)} at {selectedPOA.event.time}
                    </div>
                    <div className="text-white/70 text-sm">
                      📍 {selectedPOA.event.location}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h5 className="text-sm font-medium text-white/80 mb-2">POA Information</h5>
                <div className="bg-white/5 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/70">Status:</span>
                    <span className={`${
                      selectedPOA.status === 'issued' ? 'text-green-400' :
                      selectedPOA.status === 'claimed' ? 'text-blue-400' :
                      'text-yellow-400'
                    }`}>
                      {selectedPOA.status.charAt(0).toUpperCase() + selectedPOA.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Type:</span>
                    <span className="text-white">
                      {selectedPOA.poaType === 'digital' ? 'Digital' :
                       selectedPOA.poaType === 'nft' ? 'NFT' :
                       'Digital + NFT'}
                    </span>
                  </div>
                  {selectedPOA.checkedInAt && (
                    <div className="flex justify-between">
                      <span className="text-white/70">Checked In:</span>
                      <span className="text-white">{formatDate(selectedPOA.checkedInAt)}</span>
                    </div>
                  )}
                  {selectedPOA.issuedAt && (
                    <div className="flex justify-between">
                      <span className="text-white/70">Issued:</span>
                      <span className="text-white">{formatDate(selectedPOA.issuedAt)}</span>
                    </div>
                  )}
                  {selectedPOA.claimedAt && (
                    <div className="flex justify-between">
                      <span className="text-white/70">Claimed:</span>
                      <span className="text-white">{formatDate(selectedPOA.claimedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {selectedPOA.status === 'issued' && (
                  <button
                    onClick={() => {
                      handleClaimPOA(selectedPOA)
                      setSelectedPOA(null)
                    }}
                    className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white 
                             rounded-lg transition-colors"
                  >
                    Claim POA
                  </button>
                )}
                
                {selectedPOA.nftTxHash && (
                  <a
                    href={`https://basescan.org/tx/${selectedPOA.nftTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white 
                             rounded-lg transition-colors text-center"
                  >
                    View NFT
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
