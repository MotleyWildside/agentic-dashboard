import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { PluginLogo } from '../components/PluginLogo.tsx';
import type { PluginInfo } from '../types.ts';

export interface AddWidgetDialogProps {
  open: boolean;
  plugins: PluginInfo[];
  onClose: () => void;
  onAdd: (plugin: PluginInfo) => void;
}

export function AddWidgetDialog({ open, plugins, onClose, onAdd }: AddWidgetDialogProps) {
  const theme = useTheme();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6">Add widget</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
          Choose a plugin type for the dashboard
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ display: 'grid', gap: 1.25 }}>
          {plugins.map((plugin) => (
            <Button
              key={plugin.id}
              variant="outlined"
              onClick={() => onAdd(plugin)}
              sx={{
                minHeight: 58,
                px: 1.5,
                justifyContent: 'flex-start',
                borderColor: theme.dashboard.palette.border,
                bgcolor: alpha(theme.dashboard.palette.elevated, 0.34),
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
                <PluginLogo plugin={plugin} />
                <Box sx={{ textAlign: 'left', minWidth: 0 }}>
                  <Typography sx={{ color: 'text.primary', fontWeight: 800, lineHeight: 1.2 }}>
                    {plugin.name}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', fontFamily: theme.dashboard.fontMono, fontSize: 11 }}>
                    {plugin.id}
                  </Typography>
                </Box>
              </Stack>
            </Button>
          ))}
          {!plugins.length && (
            <Box sx={{ p: 2, border: `1px dashed ${theme.dashboard.palette.border}`, borderRadius: `${theme.dashboard.radius.md}px`, color: 'text.secondary' }}>
              No plugins registered
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
