# Android R8 Optimization

The permanent `release` build type remains optimized:

- `minifyEnabled true`
- `shrinkResources true`
- `proguard-android-optimize.txt`
- `proguard-rules.pro`

## releaseNoR8

`android/app/build.gradle` also defines `releaseNoR8` using `initWith release`, then disables minification and resource shrinking:

- `minifyEnabled false`
- `shrinkResources false`
- `versionNameSuffix "-nor8"`

هذا build type تشخيصي فقط. suffix `-nor8` يجعل النسخة واضحة، والـ validator يمنع أي publishing lane من الإشارة إلى `ReleaseNoR8` أو `no_r8`.

## Validator Assertions

`npm run android:r8:validate` يؤكد أن release لا يزال يستخدم R8 وresource shrinking، وأن `releaseNoR8` لا يعيد تفعيل minify، وأن lanes التي تنشر إلى Google Play لا تبني no-R8 artifacts.
