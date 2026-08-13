# R8 rules for the **instrumentation APK**, not for the app.
#
# When the variant under test is minified, AGP minifies the test APK too — it
# has to, because the test code links against the obfuscated app. That drags
# the AndroidX test libraries through R8, and they carry optional references
# that only resolve when extra artifacts are on the classpath:
# `androidx.test.core.view.ViewCapture` reaches for
# `androidx.concurrent.futures.SuspendToFutureAdapter`, which ships with the
# coroutines-futures artifact this project does not use. R8 treats the missing
# class as a hard error and the build stops.
#
# Warning about it is right for a shipped package and wrong here: nothing in
# this APK reaches that code path, and the APK never leaves a test device.
#
# Note the asymmetry with `proguard-rules-testable-app.pro`: that file adds
# keeps to the **app** so tests can reach a few app types by name. This one
# governs the test APK alone. Neither is applied to `release`.

-dontwarn androidx.concurrent.futures.**
-dontwarn androidx.test.**
-dontwarn org.junit.**
-dontwarn org.hamcrest.**

# The runner discovers test classes and their annotated methods reflectively,
# so nothing here can be reached by static analysis. Shrinking the suite away
# would produce a green run that executed nothing.
-keep class androidx.test.** { *; }
-keep class org.junit.** { *; }
-keep @org.junit.runner.RunWith class * { *; }
-keepclassmembers class * {
    @org.junit.Test <methods>;
    @org.junit.Before <methods>;
    @org.junit.After <methods>;
    @org.junit.BeforeClass <methods>;
    @org.junit.AfterClass <methods>;
}
-keep class hgh.asol.app.**InstrumentedTest { *; }
