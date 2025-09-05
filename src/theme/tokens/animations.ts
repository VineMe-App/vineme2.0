/**
 * Animation configuration tokens for the theme system
 * Provides consistent timing, easing, and animation values
 */

export interface AnimationConfig {
  duration: {
    fast: number;
    normal: number;
    slow: number;
    extraSlow: number;
  };
  easing: {
    linear: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
    spring: string;
  };
  timing: {
    spinner: number;
    skeleton: number;
    progress: number;
    fade: number;
    slide: number;
  };
}

export const animations: AnimationConfig = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
    extraSlow: 1000,
  },
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  timing: {
    spinner: 1000,
    skeleton: 1500,
    progress: 300,
    fade: 200,
    slide: 250,
  },
};