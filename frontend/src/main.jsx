/**
 * @file main.jsx
 * @description Application entry point. Bootstraps the React application, attaches global CSS styles,
 * and wraps the root App component with React.StrictMode and React Router's BrowserRouter.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Mount the root React component tree into the DOM element with ID 'root'
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Enables client-side routing across the application */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

