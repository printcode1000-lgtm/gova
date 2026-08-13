# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Capacitor's Android library supplies its own consumer rules for Plugin
# subclasses and @PluginMethod entry points. Keep only the runtime metadata
# those reflection-based bridges need; broad package-wide keep rules would
# disable most of R8's size and performance benefits.
-keepattributes RuntimeVisibleAnnotations,RuntimeInvisibleAnnotations,AnnotationDefault
-keepattributes Signature,InnerClasses,EnclosingMethod

# JavaScript bridge entry points are invoked by WebView rather than by direct
# Java calls, so their annotated methods must remain available to reflection.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# The application-owned Firebase message handler.
#
# It is instantiated by the framework from its manifest <service> declaration,
# never by a direct Java call. AGP already keeps manifest-declared components,
# so this rule is a guard against that entry disappearing in a future merge
# rather than the only thing holding the class in — losing it would mean every
# background push is dropped in silence, which no test that runs without a
# device would notice. Narrow on purpose: one class, not a package.
-keep class hgh.asol.app.AsolPushMessagingService { *; }

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile
