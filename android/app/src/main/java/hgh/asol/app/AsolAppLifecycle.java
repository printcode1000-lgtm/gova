package hgh.asol.app;

/**
 * Whether the ASOL Activity is currently in front of the user.
 *
 * The push service needs this to decide who posts the banner: while the app is
 * resumed the WebView presents it — which is the behaviour foreground pushes
 * have always had, including the dismissed-notification check and the
 * data-only suppression — and while it is not, the native service posts.
 * Without the distinction a foreground push would ring twice.
 *
 * Deliberately a plain static rather than a lifecycle observer: the value is
 * read from a Firebase worker thread in a process that may have no Activity at
 * all, and a fresh process starts with the correct answer, {@code false}.
 */
public final class AsolAppLifecycle {
    private static volatile boolean foreground = false;

    private AsolAppLifecycle() {}

    public static void setForeground(boolean value) {
        foreground = value;
    }

    public static boolean isForeground() {
        return foreground;
    }
}
