import { Linking } from 'react-native';
import Toast from 'react-native-toast-message';
import { isSafeUrl } from './safeUrl';

/** Open `url` in the OS only if it is https://; otherwise tell the user why not. */
export function openSafeUrl(url) {
  if (!isSafeUrl(url)) {
    Toast.show({ type: 'error', text1: "Can't open link", text2: 'Only https links are allowed.' });
    return;
  }
  Linking.openURL(url.trim()).catch(() => {});
}
