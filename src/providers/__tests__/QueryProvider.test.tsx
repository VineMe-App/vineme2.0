import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { QueryProvider } from '../QueryProvider';

// Test component that uses React Query
const TestComponent = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['test'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return 'test data';
    },
  });

  if (isLoading) return <Text>Loading...</Text>;
  if (error) return <Text>Error occurred</Text>;
  return <Text>{data}</Text>;
};

const TestComponentWithError = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['test-error'],
    queryFn: async () => {
      throw new Error('Test error');
    },
    retry: false,
  });

  if (isLoading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error.message}</Text>;
  return <Text>{data}</Text>;
};

describe('QueryProvider', () => {
  it('should provide React Query context to children', async () => {
    render(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>
    );

    // Should show loading initially
    expect(screen.getByText('Loading...')).toBeTruthy();

    // Should show data after loading
    await waitFor(() => {
      expect(screen.getByText('test data')).toBeTruthy();
    });
  });

  it('should handle query errors', async () => {
    render(
      <QueryProvider>
        <TestComponentWithError />
      </QueryProvider>
    );

    // Should show loading initially
    expect(screen.getByText('Loading...')).toBeTruthy();

    // Should show error after failed query
    await waitFor(() => {
      expect(screen.getByText('Error: Test error')).toBeTruthy();
    });
  });

  it('should render children without React Query usage', () => {
    const SimpleComponent = () => <Text>Simple component</Text>;

    render(
      <QueryProvider>
        <SimpleComponent />
      </QueryProvider>
    );

    expect(screen.getByText('Simple component')).toBeTruthy();
  });

  it('should handle multiple queries simultaneously', async () => {
    const MultiQueryComponent = () => {
      const query1 = useQuery({
        queryKey: ['query1'],
        queryFn: async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'data1';
        },
      });

      const query2 = useQuery({
        queryKey: ['query2'],
        queryFn: async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'data2';
        },
      });

      if (query1.isLoading || query2.isLoading) {
        return <Text>Loading queries...</Text>;
      }

      return (
        <>
          <Text>{query1.data}</Text>
          <Text>{query2.data}</Text>
        </>
      );
    };

    render(
      <QueryProvider>
        <MultiQueryComponent />
      </QueryProvider>
    );

    expect(screen.getByText('Loading queries...')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('data1')).toBeTruthy();
      expect(screen.getByText('data2')).toBeTruthy();
    });
  });
});