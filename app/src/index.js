import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { SocketProvider } from './SocketContext.js';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
    <SocketProvider>
        <App />
    </SocketProvider>
);
