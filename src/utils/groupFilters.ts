import type { GroupWithDetails } from '../types/database';
import type { GroupFilters } from '../stores/groupFilters';

/**
 * Apply filters to a list of groups
 */
export const applyGroupFilters = (
  groups: GroupWithDetails[],
  filters: GroupFilters
): GroupWithDetails[] => {
  if (!groups || groups.length === 0) {
    return [];
  }

  return groups.filter((group) => {
    // Apply meeting day filter
    if (filters.meetingDays.length > 0) {
      if (!filters.meetingDays.includes(group.meeting_day)) {
        return false;
      }
    }

    // Apply search query filter
    if (filters.searchQuery.trim().length > 0) {
      const searchTerm = filters.searchQuery.toLowerCase().trim();
      const searchableText =
        `${group.title} ${group.description}`.toLowerCase();

      if (!searchableText.includes(searchTerm)) {
        return false;
      }
    }

    // Apply hideFullGroups filter
    if (filters.hideFullGroups) {
      if (group.at_capacity === true) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Get a summary of active filters for display
 */
export const getActiveFiltersCount = (filters: GroupFilters): number => {
  let count = 0;

  if (filters.meetingDays.length > 0) count++;
  if (filters.searchQuery.trim().length > 0) count++;
  if (filters.onlyWithFriends) count++;
  if (filters.hideFullGroups) count++;
  if (filters.onlyMyChurch) count++;

  return count;
};

/**
 * Get a human-readable description of active filters
 */
export const getActiveFiltersDescription = (filters: GroupFilters): string => {
  const descriptions: string[] = [];

  if (filters.searchQuery.trim().length > 0) {
    descriptions.push(`"${filters.searchQuery}"`);
  }

  if (filters.meetingDays.length > 0) {
    if (filters.meetingDays.length === 1) {
      descriptions.push(`${filters.meetingDays[0]}s`);
    } else {
      descriptions.push(`${filters.meetingDays.length} days`);
    }
  }

  if (descriptions.length === 0) {
    return 'All groups';
  }

  return descriptions.join(', ');
};
