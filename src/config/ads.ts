/**
 * Advertising display configurations.
 * Default is disabled (false). Can be toggled globally via VITE_ENABLE_ADS="true"
 * or by modifying ADS_CONFIG.enabled.
 */
export const ADS_CONFIG = {
  enabled:
    typeof import.meta !== 'undefined' &&
    typeof import.meta.env !== 'undefined' &&
    import.meta.env.VITE_ENABLE_ADS === 'true',
};
