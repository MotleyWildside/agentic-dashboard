import React from 'react';
import { Box, Typography } from '@mui/material';
import { WidgetShell } from './WidgetShell.tsx';

interface Props {
  title: string;
  editMode?: boolean;
  onRemove?: () => void;
  children: React.ReactNode;
}

interface State {
  message: string | null;
}

/**
 * Per-widget error boundary (ADR-0006): the client-side mirror of the server's
 * errorAgentState / registry failure isolation. A renderer that throws shows an
 * ERROR card in its own tile; the rest of the dashboard keeps rendering.
 */
export class WidgetErrorBoundary extends React.Component<Props, State> {
  state: State = { message: null };

  static getDerivedStateFromError(err: unknown): State {
    return { message: String((err as any)?.message || err) };
  }

  render() {
    if (this.state.message == null) return this.props.children;
    return (
      <WidgetShell title={this.props.title} subtitle="render error" editMode={this.props.editMode} onRemove={this.props.onRemove}>
        <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', p: 2 }}>
          <Typography sx={{ color: 'error.main', fontFamily: 'monospace', fontSize: 12, textAlign: 'center', wordBreak: 'break-word' }}>
            {this.state.message}
          </Typography>
        </Box>
      </WidgetShell>
    );
  }
}
