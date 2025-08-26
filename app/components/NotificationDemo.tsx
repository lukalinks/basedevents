'use client';

import React, { useState } from 'react';
import { Button, Icon } from './DemoComponents';
import { EventUpdateNotification } from './EventUpdateNotification';

export default function NotificationDemo() {
  const [showDemo, setShowDemo] = useState(false);
  const [demoResults, setDemoResults] = useState<any>(null);

  const demoEvent = {
    id: 'demo-event-123',
    title: 'Demo Event - Notification Testing',
    date: 'Dec 25, 2024',
    attendees: [
      '0x1234567890123456789012345678901234567890',
      '0x2345678901234567890123456789012345678901',
      '0x3456789012345678901234567890123456789012'
    ]
  };

  const handleDemoUpdate = async (results: any) => {
    setDemoResults(results);
    console.log('Demo update results:', results);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Notification System Demo</h2>
            <p className="text-gray-600 mt-1">Test the real-time notification features</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowDemo(!showDemo)}
            className="text-blue-600 hover:bg-blue-50"
          >
            {showDemo ? 'Hide Demo' : 'Show Demo'}
          </Button>
        </div>
      </div>

      {showDemo && (
        <div className="p-6 space-y-6">
          {/* Demo Event Info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Icon name="calendar" size="sm" className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">{demoEvent.title}</h3>
                <p className="text-blue-700 text-sm">{demoEvent.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                {demoEvent.attendees.length} demo attendees
              </span>
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                Demo Event ID: {demoEvent.id}
              </span>
            </div>
          </div>

          {/* Notification Demo */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Event Update Notifications</h3>
            <p className="text-sm text-gray-600 mb-4">
              This demo allows you to test the notification system with sample data. 
              The notifications will be sent to demo attendee addresses.
            </p>
            
            <EventUpdateNotification
              eventId={demoEvent.id}
              eventTitle={demoEvent.title}
              eventDate={demoEvent.date}
              attendeeAddresses={demoEvent.attendees}
              onUpdateSent={handleDemoUpdate}
            />
          </div>

          {/* Demo Results */}
          {demoResults && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="font-medium text-green-800 mb-3">Demo Results</h4>
              <div className="space-y-2 text-sm text-green-700">
                <div className="flex justify-between">
                  <span>Total recipients:</span>
                  <span className="font-medium">{demoResults.summary.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Successful deliveries:</span>
                  <span className="font-medium">{demoResults.summary.successful}</span>
                </div>
                <div className="flex justify-between">
                  <span>Failed deliveries:</span>
                  <span className="font-medium">{demoResults.summary.failed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Success rate:</span>
                  <span className="font-medium">{demoResults.summary.successRate}</span>
                </div>
              </div>
              
              {demoResults.results.some((r: any) => !r.success) && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-green-700">
                    View Failed Deliveries
                  </summary>
                  <div className="mt-2 text-xs space-y-1">
                    {demoResults.results
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

          {/* Feature Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Update Types</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• General announcements</li>
                <li>• Schedule changes</li>
                <li>• Location updates</li>
                <li>• Important notifications</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Targeting Options</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• All attendees</li>
                <li>• Specific individuals</li>
                <li>• Bulk messaging</li>
                <li>• Custom audiences</li>
              </ul>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">How It Works</h4>
            <div className="text-sm text-blue-700 space-y-2">
              <p>1. <strong>Compose Message:</strong> Write your update message and select the type</p>
              <p>2. <strong>Choose Audience:</strong> Target all attendees or select specific individuals</p>
              <p>3. <strong>Send Notifications:</strong> System automatically resolves wallet addresses to Farcaster IDs</p>
              <p>4. <strong>Real-time Delivery:</strong> Attendees receive instant push notifications via Farcaster</p>
              <p>5. <strong>Track Results:</strong> Monitor delivery success rates and handle failures</p>
            </div>
          </div>

          {/* Testing Notes */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <h4 className="font-medium text-yellow-900 mb-2">Testing Notes</h4>
            <div className="text-sm text-yellow-700 space-y-2">
              <p>• This demo uses sample attendee addresses for testing</p>
              <p>• Notifications are sent to the Farcaster network</p>
              <p>• Success rates depend on Farcaster account availability</p>
              <p>• Check your Farcaster app for received notifications</p>
              <p>• Monitor browser console for detailed results</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}