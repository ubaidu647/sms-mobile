// The backend gates each school's plan by client platform (web / android /
// ios) and reads it from this header on every request — login and refresh
// included. A request without it counts as web, so the app must always send it.
export const CLIENT_PLATFORM_HEADER = 'X-Client-Platform';

// React Native's Platform.OS → the value the backend understands. Anything
// that is not a phone OS (e.g. `web` when run through Expo web) is `web`.
export function clientPlatformValue(os) {
  return os === 'android' || os === 'ios' ? os : 'web';
}
