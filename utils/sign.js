const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const bundletoolJarUrl = 'https://github.com/google/bundletool/releases/download/1.13.1/bundletool-all-1.13.1.jar';
const bundletoolJarPath = 'bundletool-all-1.13.1.jar';
const keystorePath = 'acode.keystore';

function downloadBundletoolJar() {
  if (!fs.existsSync(bundletoolJarPath)) {
    console.log('Downloading bundletool jar...');
    const file = fs.createWriteStream(bundletoolJarPath);
    https.get(bundletoolJarUrl, response => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('Bundletool jar downloaded.');
        generateKeystore();
      });
    }).on('error', err => {
      console.error('Error downloading bundletool jar:', err);
    });
  } else {
    console.log('Bundletool jar already exists.');
    generateKeystore();
  }
}

function generateKeystore() {
  if (!fs.existsSync(keystorePath)) {
    console.log('Generating keystore...');
    const command = `keytool -genkey -alias acode \
      -keyalg RSA -keystore acode.keystore \
      -dname "CN=Mark Smith, OU=JavaSoft, O=Sun, L=Cupertino, S=California, C=US" \
      -validity 36500 \
      -keysize 4096 \
      -storepass password -keypass password`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Error generating keystore:', error);
      } else {
        console.log('Keystore generated.');
        convertAabToApk();
      }
    });
  } else {
    console.log('Keystore already exists.');
    convertAabToApk();
  }
}

function convertAabToApk() {
  console.log('Converting AAB to APK...');
  const files = fs.readdirSync('.');
  const aabFiles = files.filter(file => file.endsWith('.aab'));
  
  for (const aabFile of aabFiles) {
    const apkFileName = aabFile.replace('.aab', '.apk');
    const command = `java -jar ${bundletoolJarPath} build-apks --bundle=${aabFile} --mode=universal --output=${apkFileName}.apks --ks=${keystorePath} --ks-pass=pass:password --ks-key-alias=acode --key-pass=pass:password`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Error converting AAB to APK:', error);
      } else {
        console.log('AAB converted to APK.');
        extractApk(apkFileName);
      }
    });
  }
}

function extractApk(apkFileName) {
  console.log('Extracting APK...');
  const command = `unzip ${apkFileName}.apks && mv -v universal.apk ${apkFileName}`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Error extracting APK:', error);
    } else {
      console.log('APK extracted successfully.');
      cleanup();
    }
  });
}

function cleanup() {
  console.log('Cleaning up...');
  const command = 'rm -rf *.apks toc.pb';
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Error cleaning up:', error);
    } else {
      console.log('Cleanup completed.');
      listFiles();
    }
  });
}

function listFiles() {
  console.log('Files in directory:');
  fs.readdirSync('.').forEach(file => {
    console.log(`File -> ${file}`);
  });
}

downloadBundletoolJar();
