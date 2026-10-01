// REST base URL — includes the /api prefix the backend mounts every route under.
// (Mobile has no socket client; anything needing the bare origin should strip /api.)
export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:4001/api';
