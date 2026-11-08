import React from 'react';
import { createRoot } from 'react-dom/client';
import FigFoxPresentationPage from './FigFoxPresentationPage';
createRoot(document.getElementById('root')!).render(<React.StrictMode><FigFoxPresentationPage offline /></React.StrictMode>);
