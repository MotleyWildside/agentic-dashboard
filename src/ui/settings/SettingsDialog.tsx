import React from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { MetricChip } from '../components/MetricChip.tsx';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { PromptLabel } from '../components/PromptLabel.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import type { ThemeApi } from '../../../shared/types.ts';
import type { ThemeState } from '../types.ts';

export interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  themeApi: ThemeApi;
  themeState: ThemeState;
  refreshThemes: () => Promise<void>;
}

export function SettingsDialog({ open, onClose, themeApi, themeState, refreshThemes }: SettingsDialogProps) {
  const theme = useTheme();
  const [error, setError] = React.useState('');
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function selectTheme(themeId: string) {
    await themeApi.setSelected(themeId);
    await refreshThemes();
  }

  async function importFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const text = await file.text();
    try {
      const result = await themeApi.importTheme(text);
      if (!result.ok) {
        setError((result.errors || ['Invalid theme configuration']).join(' '));
        return;
      }
      setError('');
      await refreshThemes();
    } catch (err) {
      setError((err as Error)?.message || 'Invalid theme configuration');
    }
  }

  async function exportTheme() {
    const result = await themeApi.exportTheme(themeState.selectedThemeId);
    if (!result.ok) return;
    const blob = new Blob([result.jsonText!], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${themeState.selectedThemeId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function resetTheme() {
    await themeApi.reset();
    setError('');
    await refreshThemes();
  }

  async function deleteTheme(themeId: string) {
    await themeApi.deleteCustom(themeId);
    await refreshThemes();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6">Settings</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
              Appearance
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.1fr' }, gap: 2.5, mt: 1 }}>
            <Box>
              <PromptLabel>themes.available</PromptLabel>
              <List sx={{ mt: 1, border: `1px solid ${theme.dashboard.palette.border}`, borderRadius: `${theme.dashboard.radius.md}px`, overflow: 'hidden' }}>
                {themeState.themes.map(({ theme: pack, source }) => (
                  <ListItemButton
                    key={pack.id}
                    selected={pack.id === themeState.selectedThemeId}
                    onClick={() => selectTheme(pack.id)}
                    sx={{ borderBottom: `1px solid ${theme.dashboard.palette.border}`, '&:last-child': { borderBottom: 0 } }}
                  >
                    <ListItemText
                      primary={pack.name}
                      secondary={`${source === 'built-in' ? 'Built-in' : 'Custom'} · ${pack.mode} · v${pack.version || '1.0.0'}`}
                      // MUI v9 removed these props from the typings; passed through
                      // unchanged from the JSX version to preserve behavior exactly.
                      {...({ primaryTypographyProps: { fontWeight: 700 }, secondaryTypographyProps: { fontFamily: theme.dashboard.fontMono, fontSize: 11 } } as any)}
                    />
                    {source !== 'built-in' && (
                      <Tooltip title="Delete custom theme">
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteTheme(pack.id);
                          }}
                        >
                          <DeleteOutlineOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </ListItemButton>
                ))}
              </List>
            </Box>
            <Box>
              <PromptLabel>theme.preview</PromptLabel>
              <Box
                sx={{
                  mt: 1,
                  p: 2,
                  border: `1px solid ${theme.dashboard.palette.border}`,
                  borderRadius: `${theme.dashboard.radius.md}px`,
                  bgcolor: alpha(theme.dashboard.palette.elevated, 0.52),
                  display: 'grid',
                  gap: 1.5,
                }}
              >
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {['running', 'waiting', 'idle', 'error'].map((status) => <StatusBadge key={status} status={status} />)}
                </Stack>
                <Divider />
                <MetricChip label="accent" value={themeState.activePack.palette.accent} />
                <ProgressBar value={58} />
                {error && <Alert severity="error">{error}</Alert>}
                {!error && (
                  <Alert severity="info" sx={{ bgcolor: alpha(theme.palette.info.main, 0.08) }}>
                    Invalid theme JSON will be rejected here instead of crashing the renderer.
                  </Alert>
                )}
              </Box>
            </Box>
          </Box>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importFile} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button startIcon={<UploadFileOutlinedIcon />} variant="outlined" onClick={() => fileRef.current?.click()}>Import JSON</Button>
        <Button startIcon={<DownloadOutlinedIcon />} variant="outlined" onClick={exportTheme}>Export</Button>
        <Button startIcon={<RestartAltOutlinedIcon />} variant="outlined" onClick={resetTheme}>Reset</Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} variant="contained">Done</Button>
      </DialogActions>
    </Dialog>
  );
}
