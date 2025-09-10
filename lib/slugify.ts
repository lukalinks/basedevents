/**
 * Generate a URL-friendly slug from a string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove special characters except hyphens
    .replace(/[^\w\-]+/g, '')
    // Replace multiple hyphens with single hyphen
    .replace(/\-\-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate a unique slug for an event
 * Format: event-title-eventId (first 8 chars for uniqueness)
 */
export function generateEventSlug(title: string, eventId: string): string {
  const baseSlug = slugify(title);
  const shortId = eventId.substring(0, 8);
  return `${baseSlug}-${shortId}`;
}

/**
 * Extract event ID from a slug
 * Assumes format: event-title-eventId (first 8 chars of UUID)
 * Returns the short ID that needs to be matched with database
 */
export function extractEventIdFromSlug(slug: string): string {
  // Get the last part after the last hyphen (should be the short ID)
  const parts = slug.split('-');
  const shortId = parts[parts.length - 1];
  
  // If it looks like a short ID (8 chars alphanumeric), return it
  if (shortId.length === 8 && /^[0-9a-f]{8}$/i.test(shortId)) {
    return shortId;
  }
  
  // Fallback: treat the whole slug as an ID (for backward compatibility)
  return slug;
}

/**
 * Check if a string is a UUID
 */
export function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
