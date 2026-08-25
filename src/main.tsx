import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FamilyProvider } from './store/FamilyProvider';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <FamilyProvider>
        <App />
      </FamilyProvider>
    </ErrorBoundary>
  </StrictMode>,
);
