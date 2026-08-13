# Keep rules that apply to the `debugR8` testing variant only.
#
# Instrumented tests run on a device against R8-shrunk, obfuscated code — that
# is the whole point of testing `debugR8` rather than `debug`. But the test APK
# references a few app types by their original names, and R8 renames them in
# the app. Without these keeps the suite fails with NoClassDefFoundError while
# the app itself works perfectly: a false alarm that costs far more than the
# handful of bytes the keeps cost.
#
# This file is deliberately NOT applied to `release`. The shipped package keeps
# nothing it does not need, so the testing variant differs from release by
# exactly these names and nothing else.

# Notification channel identifiers and the custom sound URI the notification
# tests assert against.
-keep class hgh.asol.app.AsolNotificationChannels { *; }

# Resource identifiers the tests resolve (the packaged notification sound and
# the status bar icon).
-keep class hgh.asol.app.R$raw { *; }
-keep class hgh.asol.app.R$drawable { *; }
