import { QueryClient } from '@tanstack/react-query';

// A 4xx (forbidden, not found, bad request…) will not change on retry, so fail
// immediately and let the screen show the error; anything else gets the usual
// few retries.
const retryUnless4xx = (failureCount, err) => {
  const status = err?.response?.status ?? err?.status;
  if (status >= 400 && status < 500) return false;
  return failureCount < 3;
};

// The app-wide QueryClient. Lives in its own module (not inside app/_layout.js)
// so logout paths — including the forced logout in the API interceptor — can
// clear it and never show one account's cached data to the next.
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: retryUnless4xx } },
});
