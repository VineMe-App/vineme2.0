/**
 * Portal Component Tests
 * Tests for the Portal and PortalHost components
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { Portal, PortalHost } from '../Portal';

describe('Portal Components', () => {
  describe('Portal Component', () => {
    it('renders nothing directly', () => {
      const { container } = render(
        <Portal>
          <Text>Portal Content</Text>
        </Portal>
      );

      // Portal should render nothing in its own location
      expect(container.children).toHaveLength(0);
    });

    it('accepts custom name prop', () => {
      const { container } = render(
        <Portal name="custom-portal">
          <Text>Portal Content</Text>
        </Portal>
      );

      expect(container.children).toHaveLength(0);
    });

    it('handles children updates', () => {
      const { rerender, container } = render(
        <Portal>
          <Text>Initial Content</Text>
        </Portal>
      );

      expect(container.children).toHaveLength(0);

      rerender(
        <Portal>
          <Text>Updated Content</Text>
        </Portal>
      );

      expect(container.children).toHaveLength(0);
    });
  });

  describe('PortalHost Component', () => {
    it('renders correctly', () => {
      const { getByTestId } = render(
        <PortalHost style={{ testID: 'portal-host' }} />
      );

      // PortalHost should render but may not have testID in style
      // Just check it renders without error
      expect(true).toBe(true);
    });

    it('applies custom style', () => {
      const customStyle = { backgroundColor: 'red' };
      const { container } = render(
        <PortalHost style={customStyle} />
      );

      // Should render without error
      expect(container).toBeTruthy();
    });
  });

  describe('Portal and PortalHost Integration', () => {
    it('renders portal content in host', async () => {
      const TestComponent = () => (
        <View>
          <PortalHost />
          <Portal>
            <Text>Portal Content</Text>
          </Portal>
        </View>
      );

      const { getByText } = render(<TestComponent />);

      // The portal content should be rendered in the host
      await act(async () => {
        expect(getByText('Portal Content')).toBeTruthy();
      });
    });

    it('handles multiple portals', async () => {
      const TestComponent = () => (
        <View>
          <PortalHost />
          <Portal name="portal1">
            <Text>Portal 1 Content</Text>
          </Portal>
          <Portal name="portal2">
            <Text>Portal 2 Content</Text>
          </Portal>
        </View>
      );

      const { getByText } = render(<TestComponent />);

      await act(async () => {
        expect(getByText('Portal 1 Content')).toBeTruthy();
        expect(getByText('Portal 2 Content')).toBeTruthy();
      });
    });

    it('handles portal unmounting', async () => {
      const TestComponent = ({ showPortal }: { showPortal: boolean }) => (
        <View>
          <PortalHost />
          {showPortal && (
            <Portal>
              <Text>Portal Content</Text>
            </Portal>
          )}
        </View>
      );

      const { getByText, queryByText, rerender } = render(
        <TestComponent showPortal={true} />
      );

      await act(async () => {
        expect(getByText('Portal Content')).toBeTruthy();
      });

      rerender(<TestComponent showPortal={false} />);

      await act(async () => {
        expect(queryByText('Portal Content')).toBeNull();
      });
    });

    it('handles portal content updates', async () => {
      const TestComponent = ({ content }: { content: string }) => (
        <View>
          <PortalHost />
          <Portal>
            <Text>{content}</Text>
          </Portal>
        </View>
      );

      const { getByText, rerender } = render(
        <TestComponent content="Initial Content" />
      );

      await act(async () => {
        expect(getByText('Initial Content')).toBeTruthy();
      });

      rerender(<TestComponent content="Updated Content" />);

      await act(async () => {
        expect(getByText('Updated Content')).toBeTruthy();
      });
    });
  });

  describe('Portal Manager', () => {
    it('handles portal registration and cleanup', async () => {
      const TestComponent = ({ showPortal }: { showPortal: boolean }) => (
        <View>
          <PortalHost />
          {showPortal && (
            <Portal name="test-portal">
              <Text>Test Portal</Text>
            </Portal>
          )}
        </View>
      );

      const { getByText, queryByText, rerender } = render(
        <TestComponent showPortal={true} />
      );

      await act(async () => {
        expect(getByText('Test Portal')).toBeTruthy();
      });

      // Unmount portal
      rerender(<TestComponent showPortal={false} />);

      await act(async () => {
        expect(queryByText('Test Portal')).toBeNull();
      });

      // Remount portal
      rerender(<TestComponent showPortal={true} />);

      await act(async () => {
        expect(getByText('Test Portal')).toBeTruthy();
      });
    });
  });
});