echo "Setting up the project..."

echo "Setting up Android SDK..."
sudo apt-get install android-sdk
export ANDROID_HOME=/usr/lib/android-sdk
sudo apt install sdkmanager

echo "Setting up Android..."
cordova platform add android

echo "Setting up cordova plugins..."
cordova plugin add cordova-plugin-buildinfo
cordova plugin add cordova-plugin-device
cordova plugin add cordova-plugin-file
cordova plugin add https://github.com/7HR4IZ3/nodejs-mobile-cordova

PLATFORM_FILES='.DS_Store'
PLUGINS_DIR="../../src/plugins"

for plugin in $(ls $PLUGINS_DIR); do
  if [[ " ${PLATFORM_FILES[@]} " =~ " $plugin " ]] || [[ $plugin == .* ]]; then
    continue
  fi
  cordova plugin add "$PLUGINS_DIR/$plugin"
done

cordova prepare
sdkmanager "build-tools;30.0.3"
mkdir -p www/css/build www/js/build