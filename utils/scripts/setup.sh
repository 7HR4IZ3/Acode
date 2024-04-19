echo "Setting up the project..."

npm install
sudo apt-get install android-sdk
export ANDROID_HOME=/usr/lib/android-sdk
sudo apt install sdkmanager
cordova platform add android@10
cordova plugin add cordova-plugin-buildinfo
cordova plugin add cordova-plugin-device
cordova plugin add cordova-plugin-file

PLATFORM_FILES='.DS_Store'
PLUGINS_DIR="../src/plugins"

for plugin in $(ls $PLUGINS_DIR); do
  if [[ " ${PLATFORM_FILES[@]} " =~ " $plugin " ]] || [[ $plugin == .* ]]; then
    continue
  fi
  cordova plugin add "$PLUGINS_DIR/$plugin"
done
cordova prepare
sdkmanager "build-tools;30.0.3"
mkdir -p www/css/build www/js/build