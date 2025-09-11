'use client'

import { useState } from 'react'
import { ProofOfAttendance, Event } from '@/lib/events'
import Image from 'next/image'

interface POAClaimCardProps {
  poa: ProofOfAttendance
  event: Event
  userAddress: string
  onClaim?: (poa: ProofOfAttendance) => void
}

export default function POAClaimCard({ poa, event, userAddress, onClaim }: POAClaimCardProps) {
  const [isClaiming, setIsClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClaim = async () => {
    try {
      setIsClaiming(true)
      setError(null)

      const response = await fetch(`/api/events/${event.id}/poa`, {
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

      const claimedPOA = await response.json()
      onClaim?.(claimedPOA)

    } catch (error) {
      console.error('Error claiming POA:', error)
      setError(error instanceof Error ? error.message : 'Failed to claim POA')
    } finally {
      setIsClaiming(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="text-4xl mb-2">🎫</div>
        <h2 className="text-2xl font-bold text-white mb-2">Proof of Attendance Available!</h2>
        <p className="text-white/70">
          You have a POA waiting to be claimed for attending {event.title}
        </p>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {/* POA Preview */}
      <div className="bg-white/5 rounded-xl p-4 space-y-4">
        {/* POA Image */}
        <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gradient-to-br from-blue-500/20 to-purple-500/20">
          {poa.poaImageUrl ? (
            <Image
              src={poa.poaImageUrl}
              alt={poa.poaTitle || 'POA'}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-6xl">🎫</div>
            </div>
          )}
          
          {/* POA Type Badge */}
          <div className="absolute top-3 right-3">
            <span className="px-3 py-1 bg-purple-500/80 text-white text-sm rounded-full">
              {poa.poaType === 'digital' ? '💻 Digital POA' :
               poa.poaType === 'nft' ? '🎨 NFT POA' :
               '🎨💻 Digital + NFT POA'}
            </span>
          </div>
        </div>

        {/* POA Details */}
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {poa.poaTitle || 'Proof of Attendance'}
            </h3>
            {poa.poaDescription && (
              <p className="text-white/70 mt-1">{poa.poaDescription}</p>
            )}
          </div>

          {/* Event Details */}
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-white font-medium">{event.title}</div>
            <div className="text-white/70 text-sm mt-1">
              📅 {formatDate(event.date + 'T' + event.time)}
            </div>
            <div className="text-white/70 text-sm">
              📍 {event.location}
            </div>
          </div>

          {/* Check-in Details */}
          {poa.checkedInAt && (
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-sm text-white/80 mb-2">Check-in Details</div>
              <div className="space-y-1 text-xs text-white/60">
                <div>✅ Checked in: {formatDate(poa.checkedInAt)}</div>
                {poa.checkInMethod && (
                  <div>📱 Method: {poa.checkInMethod.replace('_', ' ')}</div>
                )}
                {poa.checkInLocation && (
                  <div>📍 Location: {poa.checkInLocation}</div>
                )}
                {poa.checkedInBy && (
                  <div>👤 Verified by: {poa.checkedInBy.slice(0, 6)}...{poa.checkedInBy.slice(-4)}</div>
                )}
              </div>
            </div>
          )}

          {/* Benefits */}
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-3">
            <div className="text-sm text-white/80 mb-2">🎁 POA Benefits</div>
            <ul className="text-xs text-white/70 space-y-1">
              <li>• Permanent proof of your attendance</li>
              <li>• Collectible digital asset</li>
              <li>• Potential access to future exclusive events</li>
              {poa.poaType === 'nft' || poa.poaType === 'both' ? (
                <li>• Tradeable NFT on Base network</li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>

      {/* Claim Button */}
      {poa.status === 'issued' ? (
        <button
          onClick={handleClaim}
          disabled={isClaiming}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 
                   hover:from-blue-600 hover:to-purple-600 disabled:from-gray-500 
                   disabled:to-gray-500 text-white font-semibold rounded-xl 
                   transition-all duration-200 transform hover:scale-105 
                   disabled:hover:scale-100"
        >
          {isClaiming ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Claiming POA...</span>
            </div>
          ) : (
            '🎯 Claim My POA'
          )}
        </button>
      ) : (
        <div className="text-center py-4">
          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm ${
            poa.status === 'claimed' ? 'bg-green-500/20 text-green-200' :
            poa.status === 'pending' ? 'bg-yellow-500/20 text-yellow-200' :
            'bg-gray-500/20 text-gray-200'
          }`}>
            {poa.status === 'claimed' && '✅ Already Claimed'}
            {poa.status === 'pending' && '⏳ Pending Approval'}
            {poa.status === 'revoked' && '❌ Revoked'}
          </div>
          {poa.claimedAt && (
            <p className="text-white/60 text-sm mt-2">
              Claimed on {formatDate(poa.claimedAt)}
            </p>
          )}
        </div>
      )}

      {/* Additional Actions */}
      {poa.status === 'claimed' && (
        <div className="flex gap-3">
          {poa.nftTxHash && (
            <a
              href={`https://basescan.org/tx/${poa.nftTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white 
                       rounded-lg transition-colors text-center"
            >
              🔗 View on Basescan
            </a>
          )}
          
          <button
            onClick={() => {
              // Add to calendar or share functionality
              const text = `I just received a Proof of Attendance for ${event.title}! 🎫`
              if (navigator.share) {
                navigator.share({ text })
              } else {
                navigator.clipboard.writeText(text)
              }
            }}
            className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white 
                     rounded-lg transition-colors"
          >
            📤 Share
          </button>
        </div>
      )}
    </div>
  )
}
