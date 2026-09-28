import './instrument.js'; // MUST be first — installs Sentry before Express loads
import { createApp } from './app.js';
import { env } from './env.js';

createApp().listen(env.PORT, () => {
  console.log(`orders-api listening on http://localhost:${env.PORT}`);
});
