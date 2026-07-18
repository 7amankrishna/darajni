'use client';

import { useEffect, useState } from "react";

export default function HeaderHeightManager() {
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    function updateHeaderHeight() {
      const header = document.querySelector('header');
      if (header) {
        const height = header.offsetHeight;
        setHeaderHeight(height);
      }
    }

    // Initial check
    updateHeaderHeight();

    // Listen for resize events to update header height
    window.addEventListener('resize', updateHeaderHeight);

    // Cleanup
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, []);

  // Apply padding-top to prevent content from being hidden behind fixed header
  // Only apply on mobile screens (under 768px) where header is fixed/sticky and visible
  useEffect(() => {
    function applyHeaderPadding() {
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        // Check if we're on mobile (header is fixed/sticky and visible)
        if (window.innerWidth < 768) {
          mainContent.style.paddingTop = `${headerHeight}px`;
        } else {
          mainContent.style.paddingTop = '0';
        }
      }
    }

    // Apply on mount and when header height changes
    applyHeaderPadding();

    // Listen for resize events
    window.addEventListener('resize', applyHeaderPadding);

    // Cleanup
    return () => window.removeEventListener('resize', applyHeaderPadding);
  }, [headerHeight]);

  // Render nothing, this component only handles side effects
  return null;
}