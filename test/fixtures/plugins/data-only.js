// A custom-widget plugin: no collect(), but collectData() — must load (ADR-0006).
export default {
  id: 'data-only',
  name: 'Data Only',
  icon: '◈',
  widgetType: 'custom',
  collectData: async () => ({ ok: true }),
};
