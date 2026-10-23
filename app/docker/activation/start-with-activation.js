/**
 * MoonTVPlus 激活层
 * 未完成配置/激活时只启动一个轻量 HTTP 服务，完成后才拉起 MoonTVPlus 本体。
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || '/app/.data';
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const ACTIVATION_FILE = path.join(DATA_DIR, 'activation.json');
const DEVICE_FILE = path.join(DATA_DIR, 'device.json');
const INSTALL_WIZARD = path.join(__dirname, 'install-wizard.html');
const ACTIVATION_PAGE = path.join(__dirname, 'activation-page.html');
const MOONTV_START = path.join(__dirname, '..', 'start.js');

const ACTIVATION_API_URL = process.env.ACTIVATION_API_URL || 'https://9ay.kdns.fr';
const APP_PORT = Number(process.env.PORT) || 3000;
const EXTERNAL_PORT = Number(process.env.APP_PORT) || APP_PORT;

let STARTUP_ERROR = null;

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeJson(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    throw new Error(`数据目录不可写（${path.dirname(file)}：${err.code || err.message}），请检查应用数据目录权限`);
  }
}

function loadConfig() {
  return readJson(CONFIG_FILE);
}

function loadActivation() {
  const data = readJson(ACTIVATION_FILE);
  if (data && data.activated && data.code && data.deviceId) return data;
  return null;
}

function getDeviceId() {
  const saved = readJson(DEVICE_FILE);
  if (saved && saved.id) return saved.id;

  const id = 'fnos-' + crypto.randomBytes(8).toString('hex');
  writeJson(DEVICE_FILE, { id, createdAt: new Date().toISOString() });
  return id;
}

async function postJson(pathname, payload) {
  const res = await fetch(`${ACTIVATION_API_URL}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = { ok: false, message: `激活服务器返回异常（HTTP ${res.status}）` };
  }
  return data || { ok: false };
}

async function activateCode(code) {
  let device;
  try {
    device = getDeviceId();
  } catch (err) {
    return { success: false, message: err.message };
  }
  const deviceName = process.env.APP_DEVICE_NAME || os.hostname();

  try {
    const data = await postJson('/api/activate', {
      code: code.trim().toUpperCase(),
      device,
      deviceName,
    });

    if (data.ok) {
      return { success: true, code: data.code || code.trim().toUpperCase(), token: data.token || '' };
    }

    if (data.error === 'already_bound') {
      return { success: false, message: data.message || '该激活码已绑定其他设备' };
    }
    return { success: false, message: data.message || '激活码无效，请检查后重试' };
  } catch (err) {
    console.error('[Activation] activate failed:', err.message);
    return { success: false, message: '无法连接激活服务器，请检查网络后重试' };
  }
}

async function remoteCheck(activation) {
  try {
    const data = await postJson('/api/check', {
      code: activation.code,
      device: activation.deviceId,
    });
    if (typeof data.valid === 'boolean') {
      return { reachable: true, valid: data.valid, message: data.message };
    }
    return { reachable: false, valid: true };
  } catch (err) {
    console.error('[Activation] check failed:', err.message);
    return { reachable: false, valid: true };
  }
}

function heartbeat(activation) {
  const beat = () =>
    postJson('/api/verify', { code: activation.code, device: activation.deviceId }).catch(() => {});
  beat();
  setInterval(beat, 6 * 60 * 60 * 1000).unref();
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) req.destroy();
    });
    req.on('end', () => resolve(body));
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Moontv-Gate': '1',
  });
  res.end(JSON.stringify(payload));
}

function sendPage(res, file) {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'X-Moontv-Gate': '1',
  });
  res.end(fs.readFileSync(file, 'utf8'));
}

// 先把响应真正写回客户端，再退出容器，避免浏览器把「已成功的请求」看成连接失败
function finishThenRestart(res, payload, reason) {
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Moontv-Gate': '1',
  });
  res.end(JSON.stringify(payload), () => {
    setTimeout(() => {
      console.log(`[Gate] ${reason}，重启容器...`);
      process.exit(0);
    }, 800);
  });
}

function peekDeviceId() {
  try {
    return getDeviceId();
  } catch {
    return null;
  }
}

async function handle(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (STARTUP_ERROR && req.method === 'POST') {
      sendJson(res, 400, { success: false, message: STARTUP_ERROR });
      return;
    }

    if (req.method === 'GET' && ['/', '/install', '/activate'].includes(url.pathname)) {
      sendPage(res, loadConfig() ? ACTIVATION_PAGE : INSTALL_WIZARD);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/status') {
      const config = loadConfig();
      const activation = loadActivation();
      sendJson(res, 200, {
        configured: !!config,
        activated: !!activation,
        port: EXTERNAL_PORT,
        code: activation?.code || null,
        activatedAt: activation?.activatedAt || null,
        deviceId: peekDeviceId(),
        error: STARTUP_ERROR,
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/install/config') {
      let payload;
      try {
        payload = JSON.parse(await readBody(req));
      } catch {
        sendJson(res, 400, { success: false, message: '请求格式错误' });
        return;
      }

      const username = String(payload.username || '').trim();
      const password = String(payload.password || '');
      const code = String(payload.code || '').trim();

      if (!username) return sendJson(res, 400, { success: false, message: '请输入管理员用户名' });
      if (password.length < 6) return sendJson(res, 400, { success: false, message: '密码至少 6 位' });
      if (!code) return sendJson(res, 400, { success: false, message: '请输入激活码' });

      const result = await activateCode(code);
      if (!result.success) return sendJson(res, 400, { success: false, message: result.message });

      const deviceId = getDeviceId();
      writeJson(CONFIG_FILE, {
        username,
        password,
        createdAt: new Date().toISOString(),
      });
      writeJson(ACTIVATION_FILE, {
        activated: true,
        code: result.code,
        token: result.token,
        deviceId,
        activatedAt: new Date().toISOString(),
        apiUrl: ACTIVATION_API_URL,
      });

      console.log('[Gate] 配置完成，激活码:', result.code);
      finishThenRestart(res, { success: true, message: '配置完成，正在启动应用...' }, '初始化完成');
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/activate') {
      let payload;
      try {
        payload = JSON.parse(await readBody(req));
      } catch {
        sendJson(res, 400, { success: false, message: '请求格式错误' });
        return;
      }

      const code = String(payload.code || '').trim();
      if (!code) return sendJson(res, 400, { success: false, message: '请输入激活码' });

      const result = await activateCode(code);
      if (!result.success) return sendJson(res, 400, { success: false, message: result.message });

      writeJson(ACTIVATION_FILE, {
        activated: true,
        code: result.code,
        token: result.token,
        deviceId: getDeviceId(),
        activatedAt: new Date().toISOString(),
        apiUrl: ACTIVATION_API_URL,
      });

      console.log('[Gate] 激活成功:', result.code);
      finishThenRestart(res, { success: true, message: '激活成功，正在启动应用...' }, '激活成功');
      return;
    }

    sendJson(res, 404, { ok: false, message: 'Not Found' });
}

function startGate() {
  const server = http.createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      console.error('[Gate] 请求处理失败:', err.message);
      if (!res.headersSent) sendJson(res, 500, { success: false, message: err.message });
    }
  });

  server.listen(APP_PORT, '0.0.0.0', () => {
    console.log(`[Gate] 等待配置/激活，监听 0.0.0.0:${APP_PORT}（外部端口 ${EXTERNAL_PORT}）`);
  });

  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

function startApp(config) {
  process.env.USERNAME = config.username;
  process.env.PASSWORD = config.password;
  process.env.PORT = String(APP_PORT);

  console.log('[App] 配置已就绪，管理员:', config.username);
  console.log('[App] 启动 MoonTVPlus ...');
  require(MOONTV_START);
}

async function main() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.accessSync(DATA_DIR, fs.constants.W_OK);
  } catch (err) {
    STARTUP_ERROR = `数据目录不可用（${DATA_DIR}：${err.code || err.message}），请卸载后重新安装应用`;
    console.error('[Gate] ' + STARTUP_ERROR);
    startGate();
    return;
  }

  const config = loadConfig();
  if (!config) {
    console.log('[Gate] 首次启动，等待安装配置');
    startGate();
    return;
  }

  const activation = loadActivation();
  if (!activation) {
    console.log('[Gate] 尚未激活');
    startGate();
    return;
  }

  const check = await remoteCheck(activation);
  if (check.reachable && !check.valid) {
    console.log('[Gate] 授权已失效:', check.message || '未知原因');
    fs.rmSync(ACTIVATION_FILE, { force: true });
    startGate();
    return;
  }

  if (!check.reachable) {
    console.log('[Gate] 激活服务器暂不可达，按已激活继续离线运行');
  } else {
    console.log('[Gate] 授权校验通过:', activation.code);
  }

  heartbeat(activation);
  startApp(config);
}

main().catch((err) => {
  console.error('[Fatal]', err);
  process.exit(1);
});
