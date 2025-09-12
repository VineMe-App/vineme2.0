import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { EventCard } from '../EventCard';
import { Event } from '@/types';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockEvent: Event = {
  id: 'event-1',
  title: 'Bible Study',
  description: 'Weekly Bible study session',
  church_id: 'church-1',
  host_id: 'user-1',
  category: 'study',
  start_date: '2024-01-15T19:00:00Z',
  end_date: '2024-01-15T21:00:00Z',
  location: { address: '123 Church St', city: 'Springfield' },
  image_url: 'https://example.com/image.jpg',
  price: null,
  requires_ticket: false,
  is_public: true,
  created_at: '2024-01-01T00:00:00Z',
  host: {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar_url: null,
  },
  category_info: {
    id: 'cat-1',
    name: 'Bible Study',
    description: 'Study sessions',
  },
};

describe('EventCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render event information correctly', () => {
    render(<EventCard event={mockEvent} />);

    expect(screen.getByText('Bible Study')).toBeTruthy();
    expect(screen.getByText('Weekly Bible study session')).toBeTruthy();
    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('Jan 15, 2024')).toBeTruthy();
    expect(screen.getByText('7:00 PM')).toBeTruthy();
  });

  it('should navigate to event detail when pressed', () => {
    render(<EventCard event={mockEvent} />);

    const card = screen.getByTestId('event-card-event-1');
    fireEvent.press(card);

    expect(mockPush).toHaveBeenCalledWith('/event/event-1');
  });

  it('should display location when available', () => {
    render(<EventCard event={mockEvent} />);

    expect(screen.getByText('123 Church St, Springfield')).toBeTruthy();
  });

  it('should handle events without end date', () => {
    const eventWithoutEndDate = { ...mockEvent, end_date: null };
    render(<EventCard event={eventWithoutEndDate} />);

    expect(screen.getByText('7:00 PM')).toBeTruthy();
  });

  it('should display price when event has cost', () => {
    const paidEvent = { ...mockEvent, price: 25.0 };
    render(<EventCard event={paidEvent} />);

    expect(screen.getByText('$25.00')).toBeTruthy();
  });

  it('should show free when price is 0', () => {
    const freeEvent = { ...mockEvent, price: 0 };
    render(<EventCard event={freeEvent} />);

    expect(screen.getByText('Free')).toBeTruthy();
  });
});
