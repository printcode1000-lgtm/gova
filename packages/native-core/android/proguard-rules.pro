# Consumer Proguard rules for @asol/native-core

-keepattributes RuntimeVisibleAnnotations,RuntimeInvisibleAnnotations,AnnotationDefault
-keepattributes Signature,InnerClasses,EnclosingMethod

-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class hgh.asol.app.AsolPushMessagingService { *; }
-keep class hgh.asol.app.AsolNotificationInboxPlugin { *; }
-keep class hgh.asol.app.ShareReceivePlugin { *; }
-keep class hgh.asol.app.BackgroundDownloadPlugin { *; }
-keep class hgh.asol.app.StorageCapacityPlugin { *; }
-keep class hgh.asol.app.AppSettingsPlugin { *; }
-keep class hgh.asol.app.AsolVerificationSmsPlugin { *; }
# WorkManager instantiates workers reflectively, and the result receiver is named
# in the manifest; R8 must not rename or remove either.
-keep class hgh.asol.app.AsolVerificationSmsWorker { *; }
-keep class hgh.asol.app.AsolVerificationSmsStatusWorker { *; }
-keep class hgh.asol.app.AsolVerificationSmsResultReceiver { *; }
