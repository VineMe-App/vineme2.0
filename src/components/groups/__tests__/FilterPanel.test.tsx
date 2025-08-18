import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { FilterPanel } from '../FilterPanel';
import { useGroupFiltersStore } from '../../../stores/groupFilters';

// Mock the store
jest.mock('../../../stores/groupFilters');

const mockUseGroupFiltersStore = useGroupFiltersStore as jest.MockedFunction<
  typeof useGroupFiltersStore
>;

describe('FilterPanel', () => {
  const mockSetMeetingDays = jest.fn();
  const mockSetCategories = jest.fn();
  const mockSetSearchQuery = jest.fn();
  const mockClearFilters = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseGroupFiltersStore.mockReturnValue({
      filters: {
        meetingDays: [],
        categories: [],
        searchQuery: '',
      },
      setMeetingDays: mockSetMeetingDays,
      setCategories: mockSetCategories,
      setSearchQuery: mockSetSearchQuery,
      clearFilters: mockClearFilters,
      resetFilters: jest.fn(),
    });
  });

  it('renders correctly when visible', () => {
    const { getByText } = render(
      <FilterPanel isVisible={true} onClose={jest.fn()} />
    );

    expect(getByText('Filter Groups')).toBeTruthy();
    expect(getByText('Search')).toBeTruthy();
    expect(getByText('Meeting Days')).toBeTruthy();
    expect(getByText('Group Types')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <FilterPanel isVisible={false} onClose={jest.fn()} />
    );

    expect(queryByText('Filter Groups')).toBeNull();
  });

  it('calls onClose when close button is pressed', () => {
    const mockOnClose = jest.fn();
    const { getByText } = render(
      <FilterPanel isVisible={true} onClose={mockOnClose} />
    );

    fireEvent.press(getByText('✕'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('updates search query when search input changes', async () => {
    const { getByPlaceholderText, getByText } = render(
      <FilterPanel isVisible={true} onClose={jest.fn()} />
    );

    const searchInput = getByPlaceholderText(
      'Search group titles and descriptions...'
    );
    fireEvent.changeText(searchInput, 'bible study');

    const searchButton = getByText('🔍');
    fireEvent.press(searchButton);

    expect(mockSetSearchQuery).toHaveBeenCalledWith('bible study');
  });

  it('toggles meeting days when checkboxes are pressed', () => {
    const { getByText } = render(
      <FilterPanel isVisible={true} onClose={jest.fn()} />
    );

    fireEvent.press(getByText('Sunday'));
    expect(mockSetMeetingDays).toHaveBeenCalledWith(['Sunday']);
  });

  it('toggles categories when checkboxes are pressed', () => {
    const { getByText } = render(
      <FilterPanel isVisible={true} onClose={jest.fn()} />
    );

    fireEvent.press(getByText('Bible Study'));
    expect(mockSetCategories).toHaveBeenCalledWith(['bible-study']);
  });

  it('shows clear filters button when filters are active', () => {
    mockUseGroupFiltersStore.mockReturnValue({
      filters: {
        meetingDays: ['Sunday'],
        categories: ['bible-study'],
        searchQuery: 'test',
      },
      setMeetingDays: mockSetMeetingDays,
      setCategories: mockSetCategories,
      setSearchQuery: mockSetSearchQuery,
      clearFilters: mockClearFilters,
      resetFilters: jest.fn(),
    });

    const { getByText } = render(
      <FilterPanel isVisible={true} onClose={jest.fn()} />
    );

    expect(getByText('Clear All Filters')).toBeTruthy();
  });

  it('calls clearFilters when clear button is pressed', () => {
    mockUseGroupFiltersStore.mockReturnValue({
      filters: {
        meetingDays: ['Sunday'],
        categories: [],
        searchQuery: '',
      },
      setMeetingDays: mockSetMeetingDays,
      setCategories: mockSetCategories,
      setSearchQuery: mockSetSearchQuery,
      clearFilters: mockClearFilters,
      resetFilters: jest.fn(),
    });

    const { getByText } = render(
      <FilterPanel isVisible={true} onClose={jest.fn()} />
    );

    fireEvent.press(getByText('Clear All Filters'));
    expect(mockClearFilters).toHaveBeenCalled();
  });
});
