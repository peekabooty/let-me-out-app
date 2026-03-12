import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { Theme } from '@repo/types';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { queryClient } from './lib/query-client';
import { router } from './router';
import { useThemeStore } from './store/theme.store';
import { getThemeFromStorage } from './themes/theme-definitions';
import './styles.css';

const initialTheme = getThemeFromStorage() ?? Theme.LIGHT;
useThemeStore.getState().initTheme(initialTheme);

const container = document.querySelector('#root');

if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);
