import { createContext, useContext, useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Platform,
  View,
} from 'react-native';

const isAndroid = Platform.OS === 'android';

// Edge-to-edge Android does not resize the window for the keyboard, so without
// a behavior the keyboard sits over the content. Use this in place of React
// Native's own view, inside Modals too.
//
// On Android RN also runs its keyboardDidHide event through the show path, with
// a screenY taken from the visible area's height: what comes out is a leftover
// gap the height of the system bars. Switching the view off while the keyboard
// is down drops that padding.
export default function KeyboardAvoidingView(props) {
  const [keyboardUp, setKeyboardUp] = useState(() => Keyboard.isVisible());

  useEffect(() => {
    if (!isAndroid) return undefined;
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardUp(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return <RNKeyboardAvoidingView behavior="padding" enabled={!isAndroid || keyboardUp} {...props} />;
}

const ScreenTopContext = createContext(0);

// Wraps the app's Stack and reports how far down the window it starts: the safe
// area plus whatever the layout puts above it (TopBar, grace banner, or neither
// on the forced password change). Read from layout, in the same units as the
// insets, because measureInWindow on edge-to-edge Android is relative to the
// visible frame rather than the window.
export function ScreenBody({ style, children }) {
  const [top, setTop] = useState(0);
  return (
    <ScreenTopContext.Provider value={top}>
      <View style={style} onLayout={(e) => setTop(e.nativeEvent.layout.y)}>
        {children}
      </View>
    </ScreenTopContext.Provider>
  );
}

// keyboardVerticalOffset for a screen in the Stack. The view measures itself
// against its parent, so what sits above that parent has to be added back.
// Not needed in a Modal or outside the (app) layout: those start at the top of
// the window.
export const useScreenKeyboardOffset = () => useContext(ScreenTopContext);
