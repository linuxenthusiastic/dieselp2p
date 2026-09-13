import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App';
import { AuthProvider } from './hooks/useAuth';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster position="top-right" richColors closeButton toastOptions={{ style: { fontFamily: 'inherit' } }} />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
