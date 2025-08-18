import {
  applyGroupFilters,
  getActiveFiltersCount,
  getActiveFiltersDescription,
} from '../groupFilters';
import type { GroupWithDetails } from '../../types/database';
import type { GroupFilters } from '../../stores/groupFilters';

const mockGroups: GroupWithDetails[] = [
  {
    id: '1',
    title: 'Sunday Bible Study',
    description: 'Weekly Bible study group focusing on scripture',
    meeting_day: 'Sunday',
    meeting_time: '10:00 AM',
    location: { address: '123 Main St' },
    service_id: 'service1',
    church_id: 'church1',
    status: 'approved',
    created_at: '2024-01-01',
  },
  {
    id: '2',
    title: 'Wednesday Prayer Group',
    description: 'Midweek prayer and fellowship',
    meeting_day: 'Wednesday',
    meeting_time: '7:00 PM',
    location: { address: '456 Oak Ave' },
    service_id: 'service1',
    church_id: 'church1',
    status: 'approved',
    created_at: '2024-01-01',
  },
  {
    id: '3',
    title: 'Youth Fellowship',
    description: 'Young adults fellowship and discussion',
    meeting_day: 'Friday',
    meeting_time: '6:00 PM',
    location: { address: '789 Pine St' },
    service_id: 'service1',
    church_id: 'church1',
    status: 'approved',
    created_at: '2024-01-01',
  },
  {
    id: '4',
    title: "Women's Ministry",
    description: 'Ladies Bible study and support group',
    meeting_day: 'Tuesday',
    meeting_time: '9:00 AM',
    location: { address: '321 Elm St' },
    service_id: 'service1',
    church_id: 'church1',
    status: 'approved',
    created_at: '2024-01-01',
  },
];

describe('groupFilters', () => {
  describe('applyGroupFilters', () => {
    it('returns all groups when no filters are applied', () => {
      const filters: GroupFilters = {
        meetingDays: [],
        categories: [],
        searchQuery: '',
      };

      const result = applyGroupFilters(mockGroups, filters);
      expect(result).toHaveLength(4);
    });

    it('filters by meeting day', () => {
      const filters: GroupFilters = {
        meetingDays: ['Sunday'],
        categories: [],
        searchQuery: '',
      };

      const result = applyGroupFilters(mockGroups, filters);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Sunday Bible Study');
    });

    it('filters by multiple meeting days', () => {
      const filters: GroupFilters = {
        meetingDays: ['Sunday', 'Wednesday'],
        categories: [],
        searchQuery: '',
      };

      const result = applyGroupFilters(mockGroups, filters);
      expect(result).toHaveLength(2);
      expect(result.map((g) => g.title)).toContain('Sunday Bible Study');
      expect(result.map((g) => g.title)).toContain('Wednesday Prayer Group');
    });

    it('filters by category', () => {
      const filters: GroupFilters = {
        meetingDays: [],
        categories: ['bible-study'],
        searchQuery: '',
      };

      const result = applyGroupFilters(mockGroups, filters);
      expect(result).toHaveLength(2); // Sunday Bible Study and Women's Ministry
    });

    it('filters by search query', () => {
      const filters: GroupFilters = {
        meetingDays: [],
        categories: [],
        searchQuery: 'prayer',
      };

      const result = applyGroupFilters(mockGroups, filters);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Wednesday Prayer Group');
    });

    it('applies multiple filters together', () => {
      const filters: GroupFilters = {
        meetingDays: ['Sunday', 'Tuesday'],
        categories: ['bible-study'],
        searchQuery: 'weekly',
      };

      const result = applyGroupFilters(mockGroups, filters);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Sunday Bible Study');
    });

    it('returns empty array when no groups match filters', () => {
      const filters: GroupFilters = {
        meetingDays: ['Monday'],
        categories: [],
        searchQuery: '',
      };

      const result = applyGroupFilters(mockGroups, filters);
      expect(result).toHaveLength(0);
    });

    it('handles empty groups array', () => {
      const filters: GroupFilters = {
        meetingDays: ['Sunday'],
        categories: [],
        searchQuery: '',
      };

      const result = applyGroupFilters([], filters);
      expect(result).toHaveLength(0);
    });
  });

  describe('getActiveFiltersCount', () => {
    it('returns 0 when no filters are active', () => {
      const filters: GroupFilters = {
        meetingDays: [],
        categories: [],
        searchQuery: '',
      };

      expect(getActiveFiltersCount(filters)).toBe(0);
    });

    it('counts meeting days filter', () => {
      const filters: GroupFilters = {
        meetingDays: ['Sunday'],
        categories: [],
        searchQuery: '',
      };

      expect(getActiveFiltersCount(filters)).toBe(1);
    });

    it('counts categories filter', () => {
      const filters: GroupFilters = {
        meetingDays: [],
        categories: ['bible-study'],
        searchQuery: '',
      };

      expect(getActiveFiltersCount(filters)).toBe(1);
    });

    it('counts search query filter', () => {
      const filters: GroupFilters = {
        meetingDays: [],
        categories: [],
        searchQuery: 'test',
      };

      expect(getActiveFiltersCount(filters)).toBe(1);
    });

    it('counts multiple active filters', () => {
      const filters: GroupFilters = {
        meetingDays: ['Sunday'],
        categories: ['bible-study'],
        searchQuery: 'test',
      };

      expect(getActiveFiltersCount(filters)).toBe(3);
    });

    it('ignores whitespace-only search query', () => {
      const filters: GroupFilters = {
        meetingDays: [],
        categories: [],
        searchQuery: '   ',
      };

      expect(getActiveFiltersCount(filters)).toBe(0);
    });
  });

  describe('getActiveFiltersDescription', () => {
    it('returns "All groups" when no filters are active', () => {
      const filters: GroupFilters = {
        meetingDays: [],
        categories: [],
        searchQuery: '',
      };

      expect(getActiveFiltersDescription(filters)).toBe('All groups');
    });

    it('describes search query', () => {
      const filters: GroupFilters = {
        meetingDays: [],
        categories: [],
        searchQuery: 'bible study',
      };

      expect(getActiveFiltersDescription(filters)).toBe('"bible study"');
    });

    it('describes single meeting day', () => {
      const filters: GroupFilters = {
        meetingDays: ['Sunday'],
        categories: [],
        searchQuery: '',
      };

      expect(getActiveFiltersDescription(filters)).toBe('Sundays');
    });

    it('describes multiple meeting days', () => {
      const filters: GroupFilters = {
        meetingDays: ['Sunday', 'Wednesday'],
        categories: [],
        searchQuery: '',
      };

      expect(getActiveFiltersDescription(filters)).toBe('2 days');
    });

    it('describes single category', () => {
      const filters: GroupFilters = {
        meetingDays: [],
        categories: ['bible-study'],
        searchQuery: '',
      };

      expect(getActiveFiltersDescription(filters)).toBe('Bible Study');
    });

    it('describes multiple categories', () => {
      const filters: GroupFilters = {
        meetingDays: [],
        categories: ['bible-study', 'prayer'],
        searchQuery: '',
      };

      expect(getActiveFiltersDescription(filters)).toBe('2 types');
    });

    it('combines multiple filter descriptions', () => {
      const filters: GroupFilters = {
        meetingDays: ['Sunday'],
        categories: ['bible-study'],
        searchQuery: 'test',
      };

      expect(getActiveFiltersDescription(filters)).toBe(
        '"test", Sundays, Bible Study'
      );
    });
  });
});
