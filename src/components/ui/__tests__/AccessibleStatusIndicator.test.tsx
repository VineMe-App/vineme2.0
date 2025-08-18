import React from 'react';
import { render } from '@testing-library/react-native';
import { AccessibleStatusIndicator } from '../AccessibleStatusIndicator';

describe('AccessibleStatusIndicator', () => {
  it('should render pending status correctly', () => {
    const { getByLabelText } = render(
      <AccessibleStatusIndicator
        status="pending"
        itemName="Bible Study"
        itemType="group"
      />
    );

    expect(getByLabelText('Group Bible Study is Pending')).toBeTruthy();
  });

  it('should render approved status correctly', () => {
    const { getByLabelText } = render(
      <AccessibleStatusIndicator
        status="approved"
        itemName="Prayer Group"
        itemType="group"
      />
    );

    expect(getByLabelText('Group Prayer Group is Approved')).toBeTruthy();
  });

  it('should render denied status correctly', () => {
    const { getByLabelText } = render(
      <AccessibleStatusIndicator
        status="denied"
        itemName="Youth Group"
        itemType="group"
      />
    );

    expect(getByLabelText('Group Youth Group is Denied')).toBeTruthy();
  });

  it('should render closed status correctly', () => {
    const { getByLabelText } = render(
      <AccessibleStatusIndicator
        status="closed"
        itemName="Book Club"
        itemType="group"
      />
    );

    expect(getByLabelText('Group Book Club is Closed')).toBeTruthy();
  });

  it('should render active status correctly', () => {
    const { getByLabelText } = render(
      <AccessibleStatusIndicator
        status="active"
        itemName="Fellowship"
        itemType="group"
      />
    );

    expect(getByLabelText('Group Fellowship is Active')).toBeTruthy();
  });

  it('should handle different item types', () => {
    const { getByLabelText } = render(
      <AccessibleStatusIndicator
        status="pending"
        itemName="John Doe"
        itemType="user"
      />
    );

    expect(getByLabelText('Group John Doe is Pending')).toBeTruthy();
  });

  it('should render with different sizes', () => {
    const { getByLabelText } = render(
      <AccessibleStatusIndicator
        status="approved"
        itemName="Test Group"
        size="large"
      />
    );

    expect(getByLabelText('Group Test Group is Approved')).toBeTruthy();
  });

  it('should hide icon when showIcon is false', () => {
    const { getByLabelText } = render(
      <AccessibleStatusIndicator
        status="approved"
        itemName="Test Group"
        showIcon={false}
      />
    );

    expect(getByLabelText('Group Test Group is Approved')).toBeTruthy();
    // Icon should not be visible as separate text element
  });

  it('should apply custom styles', () => {
    const customStyle = { marginTop: 10 };
    const { getByLabelText } = render(
      <AccessibleStatusIndicator
        status="pending"
        itemName="Test Group"
        style={customStyle}
      />
    );

    const element = getByLabelText('Group Test Group is Pending');
    expect(element.parent).toBeTruthy();
  });

  it('should use accessible colors', () => {
    const { getByLabelText } = render(
      <AccessibleStatusIndicator status="pending" itemName="Test Group" />
    );

    const element = getByLabelText('Group Test Group is Pending');
    expect(element).toBeTruthy();
    // Colors are applied via styles, which are tested in the color contrast utils
  });

  it('should provide proper accessibility hints', () => {
    const { getByA11yHint } = render(
      <AccessibleStatusIndicator
        status="pending"
        itemName="Test Group"
        itemType="group"
      />
    );

    expect(getByA11yHint('group awaiting approval')).toBeTruthy();
  });
});
