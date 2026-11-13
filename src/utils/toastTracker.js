/**
 * Wraps a toast `show` to remember the toast on screen, for ToastModal: a Toast
 * mounted in a modal dies with it, and a form's success toast fires in the same
 * tick as the close, so that toast must be shown again on the Toast underneath.
 * `show` is where it has to be read: on Android the modal is unmounted in the
 * same render, and the instance never gets to render it.
 */
export function createToastTracker(show, now = Date.now) {
  let live = null;
  return {
    show(params) {
      const record = { params, shownAt: now() };
      live = record;
      show({
        ...params,
        onHide: () => {
          if (live === record) live = null;
          params?.onHide?.();
        },
      });
    },
    /** The params of the toast still on screen, if shown at or after `time`. */
    liveSince(time) {
      return live && live.shownAt >= time ? live.params : null;
    },
  };
}
