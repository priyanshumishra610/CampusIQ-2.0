'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Panel } from './auth';
import Cookies from 'js-cookie';
import { applyPanelTheme } from './panelResolver';

interface PanelContextType {
  currentPanel: Panel | null;
  setCurrentPanel: (panel: Panel | null) => void;
  availablePanels: Panel[];
  setAvailablePanels: (panels: Panel[]) => void;
}

const PanelContext = createContext<PanelContextType | undefined>(undefined);

export function PanelProvider({ children }: { children: React.ReactNode }) {
  const [currentPanel, setCurrentPanelState] = useState<Panel | null>(null);
  const [availablePanels, setAvailablePanels] = useState<Panel[]>([]);

  // Load panel from cookie on mount
  useEffect(() => {
    const savedPanelId = Cookies.get('current_panel_id');
    if (savedPanelId && availablePanels.length > 0) {
      const panel = availablePanels.find(p => p.id === savedPanelId);
      if (panel) {
        setCurrentPanelState(panel);
      }
    } else if (availablePanels.length > 0) {
      // Use default panel
      const defaultPanel = availablePanels.find(p => p.isDefault) || availablePanels[0];
      if (defaultPanel) {
        setCurrentPanelState(defaultPanel);
      }
    }
  }, [availablePanels]);

  // Apply theme when panel changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      applyPanelTheme(currentPanel);
    }
  }, [currentPanel]);

  const setCurrentPanel = (panel: Panel | null) => {
    setCurrentPanelState(panel);
    if (panel) {
      Cookies.set('current_panel_id', panel.id, { expires: 7 });
      applyPanelTheme(panel);
    } else {
      Cookies.remove('current_panel_id');
      applyPanelTheme(null);
    }
  };

  return (
    <PanelContext.Provider value={{ currentPanel, setCurrentPanel, availablePanels, setAvailablePanels }}>
      {children}
    </PanelContext.Provider>
  );
}

export function usePanel() {
  const context = useContext(PanelContext);
  if (context === undefined) {
    throw new Error('usePanel must be used within a PanelProvider');
  }
  return context;
}
