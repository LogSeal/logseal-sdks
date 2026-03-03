export const DEFAULT_BASE_URL = 'https://api.logseal.dev';
export const DEFAULT_PAGE_SIZE = 25;

export const CSS_VAR_PREFIX = '--logseal';

export const CSS_VARS = {
  colorPrimary: `${CSS_VAR_PREFIX}-color-primary`,
  colorPrimaryHover: `${CSS_VAR_PREFIX}-color-primary-hover`,
  colorBg: `${CSS_VAR_PREFIX}-color-bg`,
  colorBgSecondary: `${CSS_VAR_PREFIX}-color-bg-secondary`,
  colorBorder: `${CSS_VAR_PREFIX}-color-border`,
  colorText: `${CSS_VAR_PREFIX}-color-text`,
  colorTextSecondary: `${CSS_VAR_PREFIX}-color-text-secondary`,
  colorTextMuted: `${CSS_VAR_PREFIX}-color-text-muted`,
  colorError: `${CSS_VAR_PREFIX}-color-error`,
  colorErrorBg: `${CSS_VAR_PREFIX}-color-error-bg`,
  fontFamily: `${CSS_VAR_PREFIX}-font-family`,
  fontFamilyMono: `${CSS_VAR_PREFIX}-font-family-mono`,
  fontSizeXs: `${CSS_VAR_PREFIX}-font-size-xs`,
  fontSizeSm: `${CSS_VAR_PREFIX}-font-size-sm`,
  fontSizeMd: `${CSS_VAR_PREFIX}-font-size-md`,
  fontSizeLg: `${CSS_VAR_PREFIX}-font-size-lg`,
  lineHeight: `${CSS_VAR_PREFIX}-line-height`,
  borderRadius: `${CSS_VAR_PREFIX}-border-radius`,
  borderRadiusLg: `${CSS_VAR_PREFIX}-border-radius-lg`,
  spacing: `${CSS_VAR_PREFIX}-spacing`,
  spacingSm: `${CSS_VAR_PREFIX}-spacing-sm`,
  spacingLg: `${CSS_VAR_PREFIX}-spacing-lg`,
  rowHoverBg: `${CSS_VAR_PREFIX}-row-hover-bg`,
  rowActiveBg: `${CSS_VAR_PREFIX}-row-active-bg`,
  shadowSm: `${CSS_VAR_PREFIX}-shadow-sm`,
  shadowMd: `${CSS_VAR_PREFIX}-shadow-md`,
  transitionSpeed: `${CSS_VAR_PREFIX}-transition-speed`,
} as const;

export const BEM_PREFIX = 'logseal';
