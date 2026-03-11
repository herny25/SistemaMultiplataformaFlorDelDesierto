const { withGradleProperties } = require('expo/config-plugins');
const baseConfig = require('./app.json');

module.exports = withGradleProperties(baseConfig.expo, config => {
  // Aumentar memoria JVM para compilar todos los módulos de Expo sin OutOfMemoryError
  const idx = config.modResults.findIndex(p => p.key === 'org.gradle.jvmargs');
  const entry = {
    type: 'property',
    key: 'org.gradle.jvmargs',
    value: '-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8',
  };
  if (idx >= 0) {
    config.modResults[idx] = entry;
  } else {
    config.modResults.push(entry);
  }
  return config;
});
