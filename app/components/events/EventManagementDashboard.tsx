'use client';

import React, { useState } from 'react';
import { Button, Icon } from '../DemoComponents';
import { Event } from '@/lib/events';
import { EventUpdateNotification } from '../EventUpdateNotification';

interface EventManagementDashboardProps {
  events: Event[];
  userAddress: string;
  onEditEvent?: (event: Event) => void;
  onDeleteEvent?: (eventId: string) => void;
  onCancelEvent?: (eventId: string) => void;
  onDownloadCSV?: (eventId: string, eventTitle: string) => void;
}

export default function EventManagementDashboard({
  events,
  userAddress,
  onEditEvent,
  onDeleteEvent,
  onCancelEvent,
  onDownloadCSV
}: EventManagementDashboardProps) {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'notifications' | 'analytics'>('overview');

  // Filter events by status
  const activeEvents = events.filter(event => event.status === 'active' || event.status === 'upcoming');
  const cancelledEvents = events.filter(event => event.status === 'cancelled');
  const pastEvents = events.filter(event => event.status === 'past');

  // Calculate statistics
  const totalAttendees = events.reduce((sum, event) => sum + event.attendees.length, 0);
  const averageAttendees = events.length > 0 ? Math.round(totalAttendees / events.length) : 0;
  const eventsWithAttendees = events.filter(event => event.attendees.length > 0).length;

  const handleQuickUpdate = (event: Event) => {
    setSelectedEvent(event);
    setShowUpdateForm(true);
    setActiveTab('notifications');
  };

  const handleUpdateSent = (results: any) => {
    console.log('Update sent successfully:', results);
    // Optionally show success message or refresh data
    setShowUpdateForm(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Event Management Dashboard</h2>
            <p className="text-gray-600 mt-1">Manage your events and communicate with attendees</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {events.length} event{events.length !== 1 ? 's' : ''} • {totalAttendees} total attendees
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'notifications'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Analytics
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Events</p>
                    <p className="text-2xl font-bold text-blue-900">{events.length}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Icon name="calendar" size="sm" className="text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Active Events</p>
                    <p className="text-2xl font-bold text-green-900">{activeEvents.length}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <Icon name="check" size="sm" className="text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Total Attendees</p>
                    <p className="text-2xl font-bold text-purple-900">{totalAttendees}</p>
                  </div>
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <Icon name="users" size="sm" className="text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Avg. Attendees</p>
                    <p className="text-2xl font-bold text-orange-900">{averageAttendees}</p>
                  </div>
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                    <Icon name="chart" size="sm" className="text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Active Events List */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Events</h3>
              {activeEvents.length > 0 ? (
                <div className="space-y-3">
                  {activeEvents.map((event) => (
                    <div key={event.id} className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{event.title}</h4>
                          <p className="text-sm text-gray-600">{event.date} • {event.location}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                              {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                            </span>
                            {event.maxAttendees && (
                              <span className="text-xs text-gray-600">
                                {event.attendees.length}/{event.maxAttendees} capacity
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickUpdate(event)}
                            className="text-blue-600 hover:bg-blue-50"
                          >
                            <Icon name="message" size="sm" className="mr-1" />
                            Update
                          </Button>
                          {onEditEvent && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEditEvent(event)}
                            >
                              <Icon name="edit" size="sm" className="mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Icon name="calendar" size="sm" className="text-gray-500" />
                  </div>
                  <p className="text-gray-500">No active events</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            {/* Notification Center */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Icon name="message" size="sm" className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">Notification Center</h3>
                  <p className="text-blue-700">Send updates to your event attendees</p>
                </div>
              </div>

              {selectedEvent ? (
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">Update: {selectedEvent.title}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEvent(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <Icon name="x" size="sm" />
                    </Button>
                  </div>
                  <EventUpdateNotification
                    eventId={selectedEvent.id}
                    eventTitle={selectedEvent.title}
                    eventDate={selectedEvent.date}
                    attendeeAddresses={selectedEvent.attendees.map(attendee => attendee)}
                    onUpdateSent={handleUpdateSent}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeEvents.slice(0, 6).map((event) => (
                    <div key={event.id} className="bg-white rounded-lg p-4 border border-blue-200 hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900 truncate">{event.title}</h4>
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                          {event.attendees.length}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{event.date}</p>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleQuickUpdate(event)}
                        className="w-full"
                      >
                        <Icon name="message" size="sm" className="mr-1" />
                        Send Update
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Templates */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Update Templates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Schedule Change</h4>
                  <p className="text-sm text-gray-600 mb-3">Notify attendees about time or date changes</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Could implement template functionality here
                      console.log('Schedule change template');
                    }}
                    className="w-full"
                  >
                    Use Template
                  </Button>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Location Update</h4>
                  <p className="text-sm text-gray-600 mb-3">Inform about venue changes or directions</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Could implement template functionality here
                      console.log('Location update template');
                    }}
                    className="w-full"
                  >
                    Use Template
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Event Performance */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Most Popular Events</h4>
                  {events.length > 0 ? (
                    <div className="space-y-2">
                      {[...events]
                        .sort((a, b) => b.attendees.length - a.attendees.length)
                        .slice(0, 3)
                        .map((event, index) => (
                          <div key={event.id} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 truncate">{event.title}</span>
                            <span className="text-sm font-medium text-blue-600">{event.attendees.length}</span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No events to analyze</p>
                  )}
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Attendance Trends</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Average per event</span>
                      <span className="text-sm font-medium text-green-600">{averageAttendees}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Events with attendees</span>
                      <span className="text-sm font-medium text-blue-600">{eventsWithAttendees}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Event Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active</span>
                      <span className="text-sm font-medium text-green-600">{activeEvents.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Cancelled</span>
                      <span className="text-sm font-medium text-red-600">{cancelledEvents.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Past</span>
                      <span className="text-sm font-medium text-gray-600">{pastEvents.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Icon name="chart" size="sm" className="text-gray-500" />
                  </div>
                  <p className="text-gray-500">Activity tracking coming soon</p>
                  <p className="text-sm text-gray-400 mt-1">Track notification delivery rates and attendee engagement</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}