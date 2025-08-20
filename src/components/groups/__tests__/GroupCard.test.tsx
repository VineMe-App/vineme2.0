import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { GroupCard } from '../GroupCard';
import { Group } from '@/types';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockGroup: Group = {
  id: 'group-1',
  title: 'Young Adults Bible Study',
  description: 'A weekly Bible study for young adults',
  meeting_day: 'Wednesday',
  meeting_time: '19:00',
  location: { address: '123 Church St', room: 'Room A' },
  whatsapp_link: 'https://chat.whatsapp.com/test',
  image_url: 'https://example.com/group.jpg',
  service_id: 'service-1',
  church_id: ['church-1'],
  status: 'approved',
  created_at: '2024-01-01T00:00:00Z',
  member_count: 12,
  service: {
    id: 'service-1',
    name: 'Evening Service',
    time: '18:00',
    day: 'Sunday',
  },
  church: {
    id: 'church-1',
    name: 'First Baptist Church',
    address: '123 Main St',
  },
};

describe('GroupCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render group information correctly', () => {
    render(<GroupCard group={mockGroup} />);

    expect(screen.getByText('Young Adults Bible Study')).toBeTruthy();
    expect(
      screen.getByText('A weekly Bible study for young adults')
    ).toBeTruthy();
    expect(screen.getByText('Wednesday at 7:00 PM')).toBeTruthy();
    expect(screen.getByText('12 members')).toBeTruthy();
  });

  it('should navigate to group detail when pressed', () => {
    render(<GroupCard group={mockGroup} />);

    const card = screen.getByTestId('group-card-group-1');
    fireEvent.press(card);

    expect(mockPush).toHaveBeenCalledWith('/group/group-1');
  });

  it('should display location when available', () => {
    render(<GroupCard group={mockGroup} />);

    expect(screen.getByText('123 Church St, Room A')).toBeTruthy();
  });

  it('should handle singular member count', () => {
    const groupWithOneMember = { ...mockGroup, member_count: 1 };
    render(<GroupCard group={groupWithOneMember} />);

    expect(screen.getByText('1 member')).toBeTruthy();
  });

  it('should handle zero member count', () => {
    const groupWithNoMembers = { ...mockGroup, member_count: 0 };
    render(<GroupCard group={groupWithNoMembers} />);

    expect(screen.getByText('0 members')).toBeTruthy();
  });

  it('should display service information when available', () => {
    render(<GroupCard group={mockGroup} />);

    expect(screen.getByText('Evening Service')).toBeTruthy();
  });
});
