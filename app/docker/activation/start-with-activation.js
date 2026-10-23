/**
 * MoonTVPlus Activation Layer - Startup Script
 * This script replaces the original start.js and adds activation code verification.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG_FILE = path.join(__dirname, 'config.json');
const ACTIVATION_FILE = path.join(__dirname, 'activation.json');
const ACTIVATION_PAGE = path.join(__dirname, 'activation-page.html');
const INSTALL_WIZARD = path.join(__dirname, 'install-wizard.html');
const MOONTV_START = path.join(__dirname, '..', 'start.js');

// Activation API endpoint
const ACTIVATION_API_URL = process.env.ACTIVATION_API_URL || 'https://9ay.kdns.fr';

/**
 * Load configuration
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('[Config] Error reading config file:', err.message);
  }
  return null;
}

/**
 * Save configuration
 */
function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  console.log('[Config] Configuration saved successfully');
}

/**
 * Check if the app is activated
 */
function checkActivation() {
  try {
    if (fs.existsSync(ACTIVATION_FILE)) {
      const data = JSON.parse(fs.readFileSync(ACTIVATION_FILE, 'utf8'));
      if (data.activated && data.code && data.activatedAt) {
        console.log('[Activation] App is activated with code:', data.code);
        console.log('[Activation] Activated at:', data.activatedAt);
        console.log('[Activation] Device ID:', data.deviceId || 'N/A');
        return data;
      }
    }
  } catch (err) {
    console.error('[Activation] Error reading activation file:', err.message);
  }
  return null;
}

/**
 * Save activation data
 */
function saveActivation(data) {
  fs.writeFileSync(ACTIVATION_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log('[Activation] Activation saved successfully');
}

/**
 * Generate a device ID
 */
function getDeviceId() {
  try {
    const os = require('os');
    const hostname = os.hostname();
    const platform = os.platform();
    return `fnos-${hostname}-${platform}`;
  } catch {
    return `fnos-${Date.now()}`;
  }
}

/**
 * Verify activation code with the admin API
 */
async function verifyActivationCode(code) {
  const deviceId = getDeviceId();

  try {
    const response = await fetch(`${ACTIVATION_API_URL}/api/admin/lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: code.trim(),
        deviceId: deviceId,
      }),
    });

    if (!response.ok) {
      return { success: false, message: 'API request failed' };
    }

    const data = await response.json();

    if (data.success && data.code) {
      if (data.code.status === 'unused' || data.code.deviceId === deviceId) {
        return {
          success: true,
          code: data.code.code,
          message: 'Activation successful',
        };
      } else if (data.code.status === 'bound') {
        return {
          success: false,
          message: 'This activation code is already bound to another device',
        };
      } else if (data.code.status === 'revoked') {
        return {
          success: false,
          message: 'This activation code has been revoked',
        };
      } else {
        return {
          success: false,
          message: 'Invalid activation code',
        };
      }
    } else {
      return {
        success: false,
        message: data.message || 'Invalid activation code',
      };
    }
  } catch (err) {
    console.error('[Activation] Verification error:', err.message);
    return {
      success: false,
      message: 'Failed to connect to activation server. Please check your network.',
    };
  }
}

/**
 * Create HTTP server
 */
function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Serve installation wizard (first time)
    const config = loadConfig();
    if (!config && (url.pathname === '/' || url.pathname === '/install')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      const html = fs.readFileSync(INSTALL_WIZARD, 'utf8');
      res.end(html);
      return;
    }

    // Serve activation page (if not activated)
    const activation = checkActivation();
    if (!activation && (url.pathname === '/' || url.pathname === '/activate')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      const html = fs.readFileSync(ACTIVATION_PAGE, 'utf8');
      res.end(html);
      return;
    }

    // Handle installation config API
    if (url.pathname === '/api/install/config' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const configData = JSON.parse(body);

          // Validate
          if (!configData.port || configData.port < 1024 || configData.port > 65535) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Invalid port number' }));
            return;
          }

          if (!configData.username || !configData.password) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Username and password are required' }));
            return;
          }

          // Save configuration
          const config = {
            port: configData.port,
            username: configData.username,
            password: configData.password,
            createdAt: new Date().toISOString(),
          };

          saveConfig(config);

          // Handle activation code if provided
          if (configData.activationCode) {
            const result = await verifyActivationCode(configData.activationCode);

            if (result.success) {
              const activationData = {
                activated: true,
                code: result.code,
                deviceId: getDeviceId(),
                activatedAt: new Date().toISOString(),
                apiUrl: ACTIVATION_API_URL,
              };

              saveActivation(activationData);
              config.activated = true;
              saveConfig(config);
            }
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: 'Configuration saved successfully',
          }));

          // Restart the app after a short delay
          setTimeout(() => {
            console.log('[Config] Restarting application with new configuration...');
            process.exit(0);
          }, 2000);

        } catch (err) {
          console.error('[Config] API error:', err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Internal server error' }));
        }
      });

      return;
    }

    // Handle activation API
    if (url.pathname === '/api/activate' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const { code } = JSON.parse(body);

          if (!code || typeof code !== 'string') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Please enter an activation code' }));
            return;
          }

          console.log('[Activation] Verifying code:', code);

          const result = await verifyActivationCode(code);

          if (result.success) {
            const activationData = {
              activated: true,
              code: result.code,
              deviceId: getDeviceId(),
              activatedAt: new Date().toISOString(),
              apiUrl: ACTIVATION_API_URL,
            };

            saveActivation(activationData);

            // Update config
            const config = loadConfig() || {};
            config.activated = true;
            saveConfig(config);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: 'Activation successful! Restarting application...',
            }));

            setTimeout(() => {
              console.log('[Activation] Restarting application...');
              process.exit(0);
            }, 2000);
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: result.message }));
          }
        } catch (err) {
          console.error('[Activation] API error:', err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Internal server error' }));
        }
      });

      return;
    }

    // Handle status check
    if (url.pathname === '/api/status') {
      const config = loadConfig();
      const activation = checkActivation();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        configured: !!config,
        activated: !!activation,
        port: config?.port || 3000,
        code: activation?.code || null,
        activatedAt: activation?.activatedAt || null,
      }));
      return;
    }

    // 404 for other routes
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });
}

/**
 * Main startup logic
 */
async function main() {
  console.log('===========================================');
  console.log('  MoonTVPlus with Activation Layer');
  console.log('===========================================');
  console.log('');

  const config = loadConfig();
  const activation = checkActivation();

  if (!config) {
    // First time - show installation wizard
    console.log('[Config] First time setup. Starting installation wizard...');
    console.log('');
    startServer();
  } else if (!activation) {
    // Configured but not activated
    console.log('[Activation] App is configured but not activated.');
    console.log('[Activation] Starting activation server...');
    console.log('');
    startServer();
  } else {
    // Fully configured and activated
    console.log('[Config] Configuration loaded:');
    console.log('  Port:', config.port);
    console.log('  Username:', config.username);
    console.log('');
    console.log('[Activation] App is activated. Starting MoonTVPlus...');
    console.log('');

    // Set environment variables from config
    process.env.PORT = config.port;

    // Start the original MoonTVPlus app
    try {
      require(MOONTV_START);
    } catch (err) {
      console.error('[Activation] Failed to start MoonTVPlus:', err.message);
      console.log('[Activation] Starting activation server as fallback...');
      startServer();
    }
  }
}

function startServer() {
  const server = createServer();
  const config = loadConfig();
  const port = config?.port || process.env.PORT || 3000;

  server.listen(port, '0.0.0.0', () => {
    console.log(`[Server] Running on http://0.0.0.0:${port}`);

    if (!config) {
      console.log('[Server] Please complete the installation wizard');
    } else if (!checkActivation()) {
      console.log('[Server] Please activate the application');
    }

    console.log('');
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Server] Shutting down...');
    server.close();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('[Server] Shutting down...');
    server.close();
    process.exit(0);
  });
}

// Start the app
main().catch(err => {
  console.error('[Fatal error]:', err.message);
  process.exit(1);
});
