import { useEffect, useState } from 'react';

/**
 * Hook to calculate and return the height of the fixed header
 * Returns the height in pixels for use as padding-top on main content
 */
export function useHeaderHeight() {
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

  return headerHeight;
}