/**
 * Theme Context
 * React Context for theme management
 */

import React, { createContext } from 'react';
import { ThemeContextValue } from '../themes/types';

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

ThemeContext.displayName = 'ThemeContext';