/**
 * MoonTVPlus Activation Layer - Startup Script
 * This script replaces the original start.js and adds activation code verification.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ACTIVATION_FILE = path.join(__dirname, 'activation.json');
const ACTIVATION_PAGE = path.join(__dirname, 'activation-page.html');
const MOONTV_START = path.join(__dirname, '..', 'start.js');

// Activation API endpoint
const ACTIVATION_API_URL = process.env.ACTIVATION_API_URL || 'https://9ay.kdns.fr';

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
    // Try to get a unique device identifier
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
      // Check if code is valid and not already bound to another device
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
 * Create activation HTTP server
 */
function createActivationServer() {
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

    // Serve activation page
    if (url.pathname === '/' || url.pathname === '/activate') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      const html = fs.readFileSync(ACTIVATION_PAGE, 'utf8');
      res.end(html);
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
            // Save activation
            const activationData = {
              activated: true,
              code: result.code,
              deviceId: getDeviceId(),
              activatedAt: new Date().toISOString(),
              apiUrl: ACTIVATION_API_URL,
            };

            saveActivation(activationData);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: 'Activation successful! Restarting application...',
            }));

            // Restart the app after a short delay
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
      const activation = checkActivation();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        activated: !!activation,
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

  // Check activation status
  const activation = checkActivation();

  if (activation) {
    console.log('[Activation] App is already activated. Starting MoonTVPlus...');
    console.log('');

    // Start the original MoonTVPlus app
    try {
      require(MOONTV_START);
    } catch (err) {
      console.error('[Activation] Failed to start MoonTVPlus:', err.message);
      console.log('[Activation] Starting activation server as fallback...');
      startActivationServer();
    }
  } else {
    console.log('[Activation] App is not activated. Starting activation server...');
    console.log('');
    startActivationServer();
  }
}

function startActivationServer() {
  const server = createActivationServer();
  const port = process.env.PORT || 3000;

  server.listen(port, '0.0.0.0', () => {
    console.log(`[Activation] Activation server running on http://0.0.0.0:${port}`);
    console.log(`[Activation] Please open this URL in your browser to activate`);
    console.log('');
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Activation] Shutting down...');
    server.close();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('[Activation] Shutting down...');
    server.close();
    process.exit(0);
  });
}

// Start the app
main().catch(err => {
  console.error('[Activation] Fatal error:', err.message);
  process.exit(1);
});
