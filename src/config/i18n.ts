/**
 * Internationalization (i18n) configurations.
 * Default is Japanese only (multilingualEnabled: false).
 * Can be restored/toggled globally via VITE_ENABLE_MULTILINGUAL="true"
 * or by modifying I18N_CONFIG.multilingualEnabled.
 */
export const I18N_CONFIG = {
  multilingualEnabled:
    typeof import.meta !== 'undefined' &&
    typeof import.meta.env !== 'undefined' &&
    import.meta.env.VITE_ENABLE_MULTILINGUAL === 'true',
};
