"use client";

// Re-export all event components from the modular structure
export {
  EnhancedEventForm,
  EnhancedEventList,
  EnhancedEventDetailsModal,
  EventRegistrationForm,
  EventAttendeesList,
  UserNFTTicketsCollection,
  ConfirmationModal,
  MyEventsPage,
	EnhancedEventCard,
} from "./events";

// Legacy exports for backward compatibility
export { EnhancedEventForm as EventForm } from "./events";
export { EnhancedEventList as EventList } from "./events";
export { EnhancedEventDetailsModal as EventDetailsModal } from "./events"; 
