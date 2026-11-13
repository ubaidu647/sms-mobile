import { useEffect, useRef } from 'react';
import { Modal } from 'react-native';
import Toast from 'react-native-toast-message';
import { toastConfig, toastDefaults } from './ToastConfig';
import { createToastTracker } from '../utils/toastTracker';

const tracker = createToastTracker(Toast.show);
Toast.show = tracker.show;

function ModalToast() {
  const openedAt = useRef(Date.now()).current;

  // A passive cleanup runs after the library has dropped this instance, so the
  // toast lands on the Toast beneath: the root's, or an outer modal's.
  useEffect(
    () => () => {
      const params = tracker.liveSince(openedAt);
      if (params) Toast.show(params);
    },
    [openedAt],
  );

  return <Toast config={toastConfig} {...toastDefaults} />;
}

// A native Modal is its own window (iOS view controller, Android Dialog), above
// the root <Toast>. Use this for any modal that can raise a toast while open,
// or the error appears behind it. The library sends Toast.show to the Toast
// mounted last and falls back to the previous one on unmount.
export default function ToastModal({ children, ...props }) {
  return (
    <Modal {...props}>
      {children}
      <ModalToast />
    </Modal>
  );
}
