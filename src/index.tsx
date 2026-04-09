import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const debug = (msg: string) => {
  console.log(msg);
  if ((window as any).debug) (window as any).debug(msg);
};

debug("index.tsx starting...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
debug("React mount initiated.");
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);