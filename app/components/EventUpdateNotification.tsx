'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';

interface EventUpdateNotificationProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  attendeeAddresses: string[];
  onUpdateSent?: (results: any) => void;
}

export default function EventUpdateNotification({
  eventId,
  eventTitle,
  eventDate,
  attendeeAddresses,
  onUpdateSent
}: EventUpdateNotificationProps) {
  const { address } = useAccount();
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateType, setUpdateType] = useState<'general' | 'schedule' | 'location' | 'important'>('general');
  const [targetAttendees, setTargetAttendees] = useState<'all' | 'specific'>('all');
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSendUpdate = async () => {
    if (!updateMessage.trim()) {
      setError('Please enter an update message');
      return;
    }

    if (targetAttendees === 'specific' && selectedAttendees.length === 0) {
      setError('Please select at least one attendee');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/events/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          eventTitle,
          eventDate,
          attendeeAddresses,
          updateMessage: updateMessage.trim(),
          updateType,
          targetAttendees: targetAttendees === 'specific' ? selectedAttendees : 'all'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data);
        setUpdateMessage('');
        onUpdateSent?.(data);
      } else {
        setError(data.error || 'Failed to send update');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error sending update:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttendeeToggle = (attendeeAddress: string) => {
    setSelectedAttendees(prev => 
      prev.includes(attendeeAddress)
        ? prev.filter(addr => addr !== attendeeAddress)
        : [...prev, attendeeAddress]
    );
  };

  const getUpdateTypeIcon = (type: string) => {
    switch (type) {
      case 'schedule': return '🕒';
      case 'location': return '📍';
      case 'important': return '⚠️';
      default: return '📢';
    }
  };

  const getUpdateTypeColor = (type: string) => {
    switch (type) {
      case 'schedule': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'location': return 'text-green-600 bg-green-50 border-green-200';
      case 'important': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Send Event Update
        </h3>
        <p className="text-sm text-gray-600">
          Notify attendees about changes or updates to your event
        </p>
      </div>

      {/* Update Type Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Update Type
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(['general', 'schedule', 'location', 'important'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setUpdateType(type)}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                updateType === type
                  ? getUpdateTypeColor(type)
                  : 'text-gray-500 bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{getUpdateTypeIcon(type)}</span>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Target Attendees Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Attendees
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="all"
              checked={targetAttendees === 'all'}
              onChange={(e) => setTargetAttendees(e.target.value as 'all' | 'specific')}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">
              All Attendees ({attendeeAddresses.length})
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="specific"
              checked={targetAttendees === 'specific'}
              onChange={(e) => setTargetAttendees(e.target.value as 'all' | 'specific')}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">
              Specific Attendees
            </span>
          </label>
        </div>
      </div>

      {/* Specific Attendees Selection */}
      {targetAttendees === 'specific' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Attendees
          </label>
          <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
            {attendeeAddresses.map((address) => (
              <label key={address} className="flex items-center p-2 hover:bg-gray-50 rounded">
                <input
                  type="checkbox"
                  checked={selectedAttendees.includes(address)}
                  onChange={() => handleAttendeeToggle(address)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Update Message */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Update Message
        </label>
        <textarea
          value={updateMessage}
          onChange={(e) => setUpdateMessage(e.target.value)}
          placeholder="Enter your update message here..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          rows={4}
          maxLength={500}
        />
        <div className="text-xs text-gray-500 mt-1 text-right">
          {updateMessage.length}/500 characters
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Send Button */}
      <button
        onClick={handleSendUpdate}
        disabled={isLoading || !updateMessage.trim()}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Sending...' : 'Send Update'}
      </button>

      {/* Results Display */}
      {results && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">Update Sent Successfully!</h4>
          <div className="text-sm text-green-700">
            <p>Total recipients: {results.summary.total}</p>
            <p>Successful: {results.summary.successful}</p>
            <p>Failed: {results.summary.failed}</p>
            <p>Success rate: {results.summary.successRate}</p>
          </div>
          
          {results.results.some((r: any) => !r.success) && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-green-700">
                View Failed Deliveries
              </summary>
              <div className="mt-2 text-xs">
                {results.results
                  .filter((r: any) => !r.success)
                  .map((r: any, i: number) => (
                    <div key={i} className="text-red-600">
                      {r.address.slice(0, 6)}...{r.address.slice(-4)}: {r.reason}
                    </div>
                  ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}