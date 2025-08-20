"use client";

import { useState, useEffect } from "react";
import { Icon } from "../DemoComponents";
import { EventRegistration, getEventRegistrations } from "@/lib/events";
import { getUserDisplayInfo } from "@/lib/basenames";

// Attendee List for Event Hosts
export function EventAttendeesList({ 
  eventId, 
  isHost 
}: { 
  eventId: string
  isHost: boolean
}) {
  const [registrations, setRegistrations] = useState<EventRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userDisplayInfo, setUserDisplayInfo] = useState<Record<string, {
    displayName: string;
    avatar: string | null;
    isBaseName: boolean;
    baseName?: string;
    address: string;
  }>>({})
  const [loadingDisplayInfo, setLoadingDisplayInfo] = useState(false)

  useEffect(() => {
    const loadRegistrations = async () => {
      if (!isHost) return
      
      try {
        setLoading(true)
        const data = await getEventRegistrations(eventId)
        const confirmedRegistrations = data.filter(reg => reg.status === 'confirmed')
        setRegistrations(confirmedRegistrations)
        
        // Load display info for all attendees
        await loadUserDisplayInfo(confirmedRegistrations)
      } catch (err) {
        console.error('Error loading registrations:', err)
        setError('Failed to load attendee list')
      } finally {
        setLoading(false)
      }
    }

    loadRegistrations()
  }, [eventId, isHost])

  const loadUserDisplayInfo = async (registrations: EventRegistration[]) => {
    if (registrations.length === 0) return
    
    setLoadingDisplayInfo(true)
    const displayInfo: Record<string, any> = {}
    
    try {
      // Load display info for each unique wallet address
      const uniqueAddresses = [...new Set(registrations.map(reg => reg.userAddress))]
      
      for (const address of uniqueAddresses) {
        try {
          const info = await getUserDisplayInfo(address)
          displayInfo[address] = info
        } catch (error) {
          console.warn('Failed to load display info for', address, error)
          // Fallback to address only
          displayInfo[address] = {
            displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
            avatar: null,
            isBaseName: false,
            address
          }
        }
      }
      
      setUserDisplayInfo(displayInfo)
    } catch (error) {
      console.error('Error loading user display info:', error)
    } finally {
      setLoadingDisplayInfo(false)
    }
  }

  if (!isHost) {
    return (
      <div className="p-4 text-center text-[var(--app-foreground-muted)]">
        Only event hosts can view attendee details.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full"></div>
        <p className="mt-2 text-[var(--app-foreground-muted)]">Loading attendees...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        {error}
      </div>
    )
  }

  if (registrations.length === 0) {
    return (
      <div className="p-4 text-center text-[var(--app-foreground-muted)]">
        No attendees registered yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">
        Registered Attendees ({registrations.length})
      </h3>
      
      <div className="space-y-3">
        {registrations.map((registration, index) => {
          const displayInfo = userDisplayInfo[registration.userAddress]
          
          return (
            <div 
              key={registration.id}
              className="bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--app-gray)] flex items-center justify-center">
                      {displayInfo?.avatar ? (
                        <img 
                          src={displayInfo.avatar} 
                          alt={displayInfo.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-[var(--app-accent)] rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {registration.userName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold text-[var(--app-foreground)]">
                          {registration.userName}
                        </span>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          #{index + 1}
                        </span>
                      </div>
                      
                      {/* Wallet Address / Base Name */}
                      <div className="flex items-center space-x-2 text-sm">
                        <Icon name="users" size="sm" />
                        <span className="font-mono text-[var(--app-foreground-muted)]">
                          {loadingDisplayInfo ? (
                            <span className="animate-pulse">Loading...</span>
                          ) : displayInfo ? (
                            <>
                              {displayInfo.isBaseName && displayInfo.baseName ? (
                                <>
                                  <span className="text-[var(--app-accent)] font-semibold">{displayInfo.baseName}</span>
                                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full border border-blue-200">
                                    <svg className="w-3 h-3 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Base
                                  </span>
                                </>
                              ) : (
                                <span>{displayInfo.displayName}</span>
                              )}
                            </>
                          ) : (
                            <span>{registration.userAddress.slice(0, 6)}...{registration.userAddress.slice(-4)}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-sm text-[var(--app-foreground-muted)] ml-12">
                    <div className="flex items-center space-x-2">
                      <Icon name="mail" size="sm" />
                      <span>{registration.userEmail}</span>
                    </div>
                    
                    {registration.userPhone && (
                      <div className="flex items-center space-x-2">
                        <Icon name="phone" size="sm" />
                        <span>{registration.userPhone}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <Icon name="calendar" size="sm" />
                      <span>Registered: {new Date(registration.registeredAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {registration.userBio && (
                    <div className="mt-3 ml-12 p-2 bg-[var(--app-background)] rounded text-sm">
                      <strong>Bio:</strong> {registration.userBio}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
