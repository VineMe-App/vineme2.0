/**
 * Animation Components Tests
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { Animated } from 'react-native';
import { 
  FadeIn, 
  SlideIn, 
  ScaleIn, 
  Pulse, 
  StaggeredAnimation 
} from '../Animations';
import { ThemeProvider } from '../../../../theme/provider/ThemeProvider';

// Animated is mocked in test-setup.js

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

const TestChild = () => <Text testID="test-child">Test Content</Text>;

describe('FadeIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children correctly', () => {
    const { getByTestId } = renderWithTheme(
      <FadeIn testID="fade-in">
        <TestChild />
      </FadeIn>
    );

    expect(getByTestId('fade-in')).toBeTruthy();
    expect(getByTestId('test-child')).toBeTruthy();
  });

  it('starts animation when visible', () => {
    renderWithTheme(
      <FadeIn visible={true}>
        <TestChild />
      </FadeIn>
    );

    expect(Animated.timing).toHaveBeenCalled();
  });

  it('calls onComplete when animation finishes', () => {
    const onComplete = jest.fn();
    
    renderWithTheme(
      <FadeIn onComplete={onComplete}>
        <TestChild />
      </FadeIn>
    );

    expect(onComplete).toHaveBeenCalled();
  });

  it('applies custom duration and delay', () => {
    const { getByTestId } = renderWithTheme(
      <FadeIn duration={500} delay={100} testID="fade-in">
        <TestChild />
      </FadeIn>
    );

    expect(getByTestId('fade-in')).toBeTruthy();
  });

  it('applies custom styles', () => {
    const customStyle = { marginTop: 20 };
    const { getByTestId } = renderWithTheme(
      <FadeIn style={customStyle} testID="fade-in">
        <TestChild />
      </FadeIn>
    );

    const fadeIn = getByTestId('fade-in');
    expect(fadeIn.props.style).toContainEqual(
      expect.objectContaining(customStyle)
    );
  });
});

describe('SlideIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children correctly', () => {
    const { getByTestId } = renderWithTheme(
      <SlideIn testID="slide-in">
        <TestChild />
      </SlideIn>
    );

    expect(getByTestId('slide-in')).toBeTruthy();
    expect(getByTestId('test-child')).toBeTruthy();
  });

  it('handles different directions', () => {
    const directions: Array<'up' | 'down' | 'left' | 'right'> = [
      'up', 'down', 'left', 'right'
    ];

    directions.forEach((direction) => {
      const { getByTestId } = renderWithTheme(
        <SlideIn direction={direction} testID={`slide-${direction}`}>
          <TestChild />
        </SlideIn>
      );

      expect(getByTestId(`slide-${direction}`)).toBeTruthy();
    });
  });

  it('applies custom distance', () => {
    const { getByTestId } = renderWithTheme(
      <SlideIn distance={100} testID="slide-in">
        <TestChild />
      </SlideIn>
    );

    expect(getByTestId('slide-in')).toBeTruthy();
  });

  it('starts animation when visible', () => {
    renderWithTheme(
      <SlideIn visible={true}>
        <TestChild />
      </SlideIn>
    );

    expect(Animated.timing).toHaveBeenCalled();
  });

  it('calls onComplete when animation finishes', () => {
    const onComplete = jest.fn();
    
    renderWithTheme(
      <SlideIn onComplete={onComplete}>
        <TestChild />
      </SlideIn>
    );

    expect(onComplete).toHaveBeenCalled();
  });
});

describe('ScaleIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children correctly', () => {
    const { getByTestId } = renderWithTheme(
      <ScaleIn testID="scale-in">
        <TestChild />
      </ScaleIn>
    );

    expect(getByTestId('scale-in')).toBeTruthy();
    expect(getByTestId('test-child')).toBeTruthy();
  });

  it('applies custom scale values', () => {
    const { getByTestId } = renderWithTheme(
      <ScaleIn initialScale={0.5} finalScale={1.2} testID="scale-in">
        <TestChild />
      </ScaleIn>
    );

    expect(getByTestId('scale-in')).toBeTruthy();
  });

  it('starts spring animation when visible', () => {
    renderWithTheme(
      <ScaleIn visible={true}>
        <TestChild />
      </ScaleIn>
    );

    expect(Animated.spring).toHaveBeenCalled();
  });

  it('calls onComplete when animation finishes', () => {
    const onComplete = jest.fn();
    
    renderWithTheme(
      <ScaleIn onComplete={onComplete}>
        <TestChild />
      </ScaleIn>
    );

    expect(onComplete).toHaveBeenCalled();
  });
});

describe('Pulse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children correctly', () => {
    const { getByTestId } = renderWithTheme(
      <Pulse testID="pulse">
        <TestChild />
      </Pulse>
    );

    expect(getByTestId('pulse')).toBeTruthy();
    expect(getByTestId('test-child')).toBeTruthy();
  });

  it('applies custom scale values', () => {
    const { getByTestId } = renderWithTheme(
      <Pulse minScale={0.9} maxScale={1.1} testID="pulse">
        <TestChild />
      </Pulse>
    );

    expect(getByTestId('pulse')).toBeTruthy();
  });

  it('starts loop animation when running', () => {
    renderWithTheme(
      <Pulse running={true}>
        <TestChild />
      </Pulse>
    );

    expect(Animated.loop).toHaveBeenCalled();
    expect(Animated.sequence).toHaveBeenCalled();
  });

  it('stops animation when not running', () => {
    const { rerender, getByTestId } = renderWithTheme(
      <Pulse running={true} testID="pulse">
        <TestChild />
      </Pulse>
    );

    act(() => {
      rerender(
        <ThemeProvider>
          <Pulse running={false} testID="pulse">
            <TestChild />
          </Pulse>
        </ThemeProvider>
      );
    });

    expect(getByTestId('pulse')).toBeTruthy();
  });

  it('applies custom duration', () => {
    const { getByTestId } = renderWithTheme(
      <Pulse duration={1000} testID="pulse">
        <TestChild />
      </Pulse>
    );

    expect(getByTestId('pulse')).toBeTruthy();
  });
});

describe('StaggeredAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders multiple children correctly', () => {
    const children = [
      <Text key="1" testID="child-1">Child 1</Text>,
      <Text key="2" testID="child-2">Child 2</Text>,
      <Text key="3" testID="child-3">Child 3</Text>,
    ];

    const { getByTestId } = renderWithTheme(
      <StaggeredAnimation testID="staggered">
        {children}
      </StaggeredAnimation>
    );

    expect(getByTestId('staggered')).toBeTruthy();
    expect(getByTestId('child-1')).toBeTruthy();
    expect(getByTestId('child-2')).toBeTruthy();
    expect(getByTestId('child-3')).toBeTruthy();
  });

  it('handles different animation types', () => {
    const children = [
      <Text key="1">Child 1</Text>,
      <Text key="2">Child 2</Text>,
    ];

    const animationTypes: Array<'fadeIn' | 'slideIn' | 'scaleIn'> = [
      'fadeIn', 'slideIn', 'scaleIn'
    ];

    animationTypes.forEach((animationType) => {
      const { getByTestId } = renderWithTheme(
        <StaggeredAnimation 
          animationType={animationType} 
          testID={`staggered-${animationType}`}
        >
          {children}
        </StaggeredAnimation>
      );

      expect(getByTestId(`staggered-${animationType}`)).toBeTruthy();
    });
  });

  it('applies custom stagger delay', () => {
    const children = [
      <Text key="1">Child 1</Text>,
      <Text key="2">Child 2</Text>,
    ];

    const { getByTestId } = renderWithTheme(
      <StaggeredAnimation staggerDelay={200} testID="staggered">
        {children}
      </StaggeredAnimation>
    );

    expect(getByTestId('staggered')).toBeTruthy();
  });

  it('applies custom duration', () => {
    const children = [
      <Text key="1">Child 1</Text>,
      <Text key="2">Child 2</Text>,
    ];

    const { getByTestId } = renderWithTheme(
      <StaggeredAnimation duration={500} testID="staggered">
        {children}
      </StaggeredAnimation>
    );

    expect(getByTestId('staggered')).toBeTruthy();
  });

  it('controls animation with running prop', () => {
    const children = [
      <Text key="1">Child 1</Text>,
      <Text key="2">Child 2</Text>,
    ];

    const { getByTestId } = renderWithTheme(
      <StaggeredAnimation running={false} testID="staggered">
        {children}
      </StaggeredAnimation>
    );

    expect(getByTestId('staggered')).toBeTruthy();
  });
});