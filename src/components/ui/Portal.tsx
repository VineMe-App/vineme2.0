/**
 * Portal Component
 * Renders children in a portal for proper z-index management and overlay positioning
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';

interface PortalManager {
  mount: (key: string, children: React.ReactNode) => void;
  unmount: (key: string) => void;
  update: (key: string, children: React.ReactNode) => void;
}

interface PortalState {
  [key: string]: React.ReactNode;
}

// Global portal manager
let portalManager: PortalManager | null = null;
let portalUpdateCallback: ((state: PortalState) => void) | null = null;

const createPortalManager = (): PortalManager => {
  const portals: PortalState = {};

  return {
    mount: (key: string, children: React.ReactNode) => {
      portals[key] = children;
      portalUpdateCallback?.(portals);
    },
    unmount: (key: string) => {
      delete portals[key];
      portalUpdateCallback?.(portals);
    },
    update: (key: string, children: React.ReactNode) => {
      if (portals[key]) {
        portals[key] = children;
        portalUpdateCallback?.(portals);
      }
    },
  };
};

export interface PortalProps {
  children: React.ReactNode;
  name?: string;
}

export const Portal: React.FC<PortalProps> = ({ children, name }) => {
  const keyRef = useRef(name || `portal_${Math.random().toString(36).substr(2, 9)}`);
  const key = keyRef.current;

  useEffect(() => {
    if (!portalManager) {
      portalManager = createPortalManager();
    }

    portalManager.mount(key, children);

    return () => {
      portalManager?.unmount(key);
    };
  }, [key, children]);

  useEffect(() => {
    if (portalManager) {
      portalManager.update(key, children);
    }
  }, [key, children]);

  return null;
};

export interface PortalHostProps {
  style?: any;
}

export const PortalHost: React.FC<PortalHostProps> = ({ style }) => {
  const [portals, setPortals] = useState<PortalState>({});

  useEffect(() => {
    if (!portalManager) {
      portalManager = createPortalManager();
    }

    portalUpdateCallback = setPortals;

    return () => {
      portalUpdateCallback = null;
    };
  }, []);

  return (
    <View style={[styles.host, style]} pointerEvents="box-none">
      {Object.keys(portals).map((key) => (
        <View key={key} style={styles.portal} pointerEvents="box-none">
          {portals[key]}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  portal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});