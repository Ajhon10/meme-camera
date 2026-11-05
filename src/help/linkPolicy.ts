export const helpLinks = [
  'https://support.google.com/meet/answer/9302964?hl=en',
  'https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0060612',
  'https://support.microsoft.com/en-us/teams/notifications-settings/manage-your-device-settings-in-microsoft-teams',
] as const
export function isHelpLink(value: unknown): value is string {
  return typeof value === 'string' && helpLinks.some((url) => url === value)
}
