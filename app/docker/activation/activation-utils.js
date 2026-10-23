#!/usr/bin/env node

/**
 * MoonTVPlus Activation Utility
 * 用于本地测试和管理激活码
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const ACTIVATION_FILE = path.join(__dirname, 'activation.json');
const ACTIVATION_API_URL = process.env.ACTIVATION_API_URL || 'https://9ay.kdns.fr';

const args = process.argv.slice(2);
const command = args[0];

function showHelp() {
  console.log(`
MoonTVPlus 激活码管理工具

用法:
  node activation-utils.js <command> [options]

命令:
  status              查看当前激活状态
  activate <code>     使用激活码激活
  deactivate          取消激活（清除本地激活信息）
  verify <code>       验证激活码（不保存）
  help                显示帮助信息

示例:
  node activation-utils.js status
  node activation-utils.js activate MTV-XXXX-XXXX-XXXX
  node activation-utils.js verify MTV-XXXX-XXXX-XXXX
  node activation-utils.js deactivate

环境变量:
  ACTIVATION_API_URL  激活码验证 API 地址 (默认: https://9ay.kdns.fr)
`);
}

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

function checkActivation() {
  try {
    if (fs.existsSync(ACTIVATION_FILE)) {
      const data = JSON.parse(fs.readFileSync(ACTIVATION_FILE, 'utf8'));
      if (data.activated && data.code && data.activatedAt) {
        return data;
      }
    }
  } catch (err) {
    console.error('读取激活文件失败:', err.message);
  }
  return null;
}

function saveActivation(data) {
  fs.writeFileSync(ACTIVATION_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log('✓ 激活信息已保存');
}

function clearActivation() {
  if (fs.existsSync(ACTIVATION_FILE)) {
    fs.unlinkSync(ACTIVATION_FILE);
    console.log('✓ 激活信息已清除');
  } else {
    console.log('ℹ 没有找到激活信息');
  }
}

async function verifyCode(code) {
  const deviceId = getDeviceId();

  try {
    console.log('正在验证激活码...');
    console.log(`设备 ID: ${deviceId}`);
    console.log(`API 地址: ${ACTIVATION_API_URL}`);
    console.log('');

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
      console.error(`✗ API 请求失败 (HTTP ${response.status})`);
      return null;
    }

    const data = await response.json();

    if (data.success && data.code) {
      const codeInfo = data.code;
      console.log('✓ 激活码验证成功');
      console.log('');
      console.log('激活码信息:');
      console.log(`  代码: ${codeInfo.code}`);
      console.log(`  状态: ${codeInfo.status}`);
      console.log(`  创建时间: ${codeInfo.createdAt || 'N/A'}`);

      if (codeInfo.deviceId) {
        console.log(`  绑定设备: ${codeInfo.deviceId}`);
      }

      if (codeInfo.activatedAt) {
        console.log(`  激活时间: ${codeInfo.activatedAt}`);
      }

      return codeInfo;
    } else {
      console.error(`✗ 验证失败: ${data.message || '未知错误'}`);
      return null;
    }
  } catch (err) {
    console.error(`✗ 验证失败: ${err.message}`);
    console.log('');
    console.log('可能的原因:');
    console.log('  1. 网络连接问题');
    console.log('  2. API 地址不可达');
    console.log('  3. 激活码格式错误');
    return null;
  }
}

async function activate(code) {
  console.log('========================================');
  console.log('  MoonTVPlus 激活工具');
  console.log('========================================');
  console.log('');

  // Check if already activated
  const current = checkActivation();
  if (current) {
    console.log('⚠ 当前已激活');
    console.log(`  激活码: ${current.code}`);
    console.log(`  激活时间: ${current.activatedAt}`);
    console.log('');
    console.log('如需重新激活，请先运行: node activation-utils.js deactivate');
    console.log('');
    return;
  }

  // Verify the code
  const codeInfo = await verifyCode(code);

  if (!codeInfo) {
    console.log('');
    console.log('激活失败');
    return;
  }

  // Check if code can be activated
  if (codeInfo.status === 'bound' && codeInfo.deviceId !== getDeviceId()) {
    console.log('');
    console.log('✗ 该激活码已绑定到其他设备');
    return;
  }

  if (codeInfo.status === 'revoked') {
    console.log('');
    console.log('✗ 该激活码已被吊销');
    return;
  }

  // Save activation
  console.log('');
  console.log('正在保存激活信息...');

  const activationData = {
    activated: true,
    code: codeInfo.code,
    deviceId: getDeviceId(),
    activatedAt: new Date().toISOString(),
    apiUrl: ACTIVATION_API_URL,
  };

  saveActivation(activationData);

  console.log('');
  console.log('========================================');
  console.log('  ✓ 激活成功！');
  console.log('========================================');
  console.log('');
  console.log('激活码: ' + codeInfo.code);
  console.log('设备 ID: ' + getDeviceId());
  console.log('激活时间: ' + activationData.activatedAt);
  console.log('');
  console.log('现在可以启动 MoonTVPlus 应用了。');
  console.log('');
}

function showStatus() {
  console.log('========================================');
  console.log('  MoonTVPlus 激活状态');
  console.log('========================================');
  console.log('');

  const activation = checkActivation();

  if (activation) {
    console.log('状态: ✓ 已激活');
    console.log('');
    console.log('激活码: ' + activation.code);
    console.log('设备 ID: ' + (activation.deviceId || 'N/A'));
    console.log('激活时间: ' + activation.activatedAt);
    console.log('API 地址: ' + (activation.apiUrl || ACTIVATION_API_URL));
  } else {
    console.log('状态: ✗ 未激活');
    console.log('');
    console.log('请使用以下命令激活:');
    console.log('  node activation-utils.js activate <激活码>');
  }

  console.log('');
}

async function main() {
  switch (command) {
    case 'status':
      showStatus();
      break;

    case 'activate':
      if (!args[1]) {
        console.error('错误: 请提供激活码');
        console.log('用法: node activation-utils.js activate <激活码>');
        process.exit(1);
      }
      await activate(args[1]);
      break;

    case 'deactivate':
      console.log('正在清除激活信息...');
      clearActivation();
      console.log('');
      console.log('✓ 已取消激活');
      console.log('');
      break;

    case 'verify':
      if (!args[1]) {
        console.error('错误: 请提供激活码');
        console.log('用法: node activation-utils.js verify <激活码>');
        process.exit(1);
      }
      await verifyCode(args[1]);
      break;

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    default:
      if (command) {
        console.error(`未知命令: ${command}`);
        console.log('');
      }
      showHelp();
      process.exit(command ? 1 : 0);
  }
}

main().catch(err => {
  console.error('错误:', err.message);
  process.exit(1);
});
