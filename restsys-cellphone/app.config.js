const {
  withGradleProperties,
  withAndroidManifest,
  withDangerousMod,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');
const baseConfig = require('./app.json');

// Plugin 1: Aumentar memoria JVM
function withJvmMemory(config) {
  return withGradleProperties(config, cfg => {
    const idx = cfg.modResults.findIndex(p => p.key === 'org.gradle.jvmargs');
    const entry = {
      type: 'property',
      key: 'org.gradle.jvmargs',
      value: '-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8',
    };
    if (idx >= 0) {
      cfg.modResults[idx] = entry;
    } else {
      cfg.modResults.push(entry);
    }
    return cfg;
  });
}

// Plugin 2: Crear network_security_config.xml que permite HTTP (cleartext)
function withCleartextNetwork(config) {
  // Crear el archivo XML
  config = withDangerousMod(config, [
    'android',
    async cfg => {
      const resDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      fs.mkdirSync(resDir, { recursive: true });
      fs.writeFileSync(
        path.join(resDir, 'network_security_config.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>`
      );
      return cfg;
    },
  ]);

  // Referenciar el XML desde AndroidManifest
  config = withAndroidManifest(config, cfg => {
    const app = cfg.modResults.manifest.application[0];
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    app.$['android:usesCleartextTraffic'] = 'true';
    return cfg;
  });

  return config;
}

// Componer ambos plugins
let finalConfig = withJvmMemory(baseConfig.expo);
finalConfig = withCleartextNetwork(finalConfig);

module.exports = finalConfig;
