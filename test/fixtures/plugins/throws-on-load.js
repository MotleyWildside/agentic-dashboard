// A plugin whose module fails to evaluate must not break the other plugins.
throw new Error('broken plugin module');
