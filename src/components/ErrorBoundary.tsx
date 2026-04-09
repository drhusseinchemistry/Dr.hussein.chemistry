import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h1>ببورە! خەلەتیەک چێبوو.</h1>
          <p>تکایە لاپەڕەی نوێ بکەوە (Refresh).</p>
          <pre style={{ textAlign: 'left', background: '#f4f4f4', padding: '10px', borderRadius: '5px', overflow: 'auto', maxWidth: '100%' }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            دووبارە بارکرن
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
