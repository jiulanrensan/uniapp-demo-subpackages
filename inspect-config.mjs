// inspect-config.js
import { resolveConfig } from 'vite';

async function outputConfig() {
  const config = await resolveConfig({}, 'serve'); // 'serve' 或 'build'
  console.log(JSON.stringify(config, null, 2));
}

outputConfig().catch(console.error);