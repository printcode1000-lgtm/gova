# Project-specific R8 / ProGuard rules.

# Capacitor reflection metadata.
-keepattributes RuntimeVisibleAnnotations,RuntimeInvisibleAnnotations,AnnotationDefault
-keepattributes Signature,InnerClasses,EnclosingMethod

# JavaScript bridge entry points are invoked by WebView reflection.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# WorkManager/Room instantiate generated database implementations reflectively.
# Preserve WorkManager's generated database and the Room hierarchy under R8.
-keep class androidx.work.impl.WorkDatabase { *; }
-keep class androidx.work.impl.WorkDatabase_Impl { *; }
-keep class * extends androidx.room.RoomDatabase { *; }
-keepclassmembers class * extends androidx.room.RoomDatabase {
    <init>(...);
}

# Application-owned Firebase message handler, instantiated from the manifest.
-keep class hgh.asol.app.AsolPushMessagingService { *; }
