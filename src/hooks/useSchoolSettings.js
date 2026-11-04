import { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';
import {
  academicYearUser,
  setAcademicYearUser,
  setSchoolAcademicYearStartMonth,
  startMonthFromSettings,
} from '../utils/academicYear';

// One request per signed-in user per app run, shared by every caller.
let loadedFor = null;
let inFlight = null;
const SETTINGS_WAIT_MS = 8000;

function loadFor(userKey) {
  // Signing out clears the active user (clearSession), so the next sign-in —
  // even as the same user — loads afresh.
  if (loadedFor === userKey && inFlight && academicYearUser() === userKey) return inFlight;
  loadedFor = userKey;
  setAcademicYearUser(userKey);
  // Never hold the app on a blank screen for a slow network: after the wait the
  // screens open with the month already known (or the default).
  const giveUp = new Promise((resolve) => {
    setTimeout(resolve, SETTINGS_WAIT_MS);
  });
  const request = apiClient
    .get('/schools/settings')
    .then((res) => {
      if (academicYearUser() !== userKey) return; // signed out / switched user meanwhile
      // The month the API itself uses, so client and server never disagree.
      setSchoolAcademicYearStartMonth(startMonthFromSettings(res.data?.data));
    })
    .catch((err) => {
      // No school (platform admin) → 403: follow the default. Offline / 5xx:
      // keep whatever month is already known.
      if (err?.response?.status === 403 && academicYearUser() === userKey) {
        setSchoolAcademicYearStartMonth(null);
      }
    });
  inFlight = Promise.race([request, giveUp]);
  return inFlight;
}

/**
 * Load the school's academic year start month once the user is signed in,
 * before the screens mount: forms and filters work out "the current academic
 * year" when they open. A failed request falls back to the default month.
 */
export function useSchoolSettings(userKey) {
  const [readyFor, setReadyFor] = useState(null);

  useEffect(() => {
    if (!userKey) return undefined;
    let live = true;
    loadFor(userKey).finally(() => {
      if (live) setReadyFor(userKey);
    });
    return () => {
      live = false;
    };
  }, [userKey]);

  return { ready: !userKey || readyFor === userKey };
}
