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

    // Apply category filter
    if (filters.categories.length > 0) {
      // For now, we'll use a simple category matching based on group title/description
      // In a real app, you might have a dedicated category field
      const groupText = `${group.title} ${group.description}`.toLowerCase();
      const hasMatchingCategory = filters.categories.some(category => {
        switch (category) {
          case 'bible-study':
            return groupText.includes('bible') || groupText.includes('study');
          case 'prayer':
            return groupText.includes('prayer');
          case 'youth':
            return groupText.includes('youth') || groupText.includes('young');
          case 'womens':
            return groupText.includes('women') || groupText.includes('ladies');
          case 'mens':
            return groupText.includes('men') || groupText.includes('guys');
          case 'small-group':
            return groupText.includes('small') || groupText.includes('cell');
          case 'fellowship':
            return groupText.includes('fellowship') || groupText.includes('social');
          case 'discipleship':
            return groupText.includes('discipleship') || groupText.includes('mentoring');
          default:
            return false;
        }
      });
      
      if (!hasMatchingCategory) {
        return false;
      }
    }

    // Apply search query filter
    if (filters.searchQuery.trim().length > 0) {
      const searchTerm = filters.searchQuery.toLowerCase().trim();
      const searchableText = `${group.title} ${group.description}`.toLowerCase();
      
      if (!searchableText.includes(searchTerm)) {
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
  if (filters.categories.length > 0) count++;
  if (filters.searchQuery.trim().length > 0) count++;
  
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
  
  if (filters.categories.length > 0) {
    if (filters.categories.length === 1) {
      const categoryLabels: Record<string, string> = {
        'bible-study': 'Bible Study',
        'prayer': 'Prayer',
        'youth': 'Youth',
        'womens': 'Women\'s',
        'mens': 'Men\'s',
        'small-group': 'Small Group',
        'fellowship': 'Fellowship',
        'discipleship': 'Discipleship',
      };
      descriptions.push(categoryLabels[filters.categories[0]] || filters.categories[0]);
    } else {
      descriptions.push(`${filters.categories.length} types`);
    }
  }
  
  if (descriptions.length === 0) {
    return 'All groups';
  }
  
  return descriptions.join(', ');
};