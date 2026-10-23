# MoonTVPlus FPK - 完整部署指南

##  两个版本

### 1. 在线版（GHCR 镜像）⭐ 推荐
- **文件**: `moontvplus-fpk-ghcr.fpk`
- **大小**: < 10MB
- **特点**: 安装时从 GitHub 拉取镜像，需要网络
- **适合**: 网络良好的环境

### 2. 离线版（镜像内嵌）
- **文件**: `moontvplus-fpk-embedded.fpk`
- **大小**: 约 800MB-1GB
- **特点**: 镜像已打包，无需网络
- **适合**: 离线环境或网络受限

---

## 🚀 快速开始

### 步骤 1: 下载 FPK 文件

从 GitHub Releases 下载：
```
https://github.com/kaynai1/MoonTVPlus-FPK/releases
```

### 步骤 2: 安装到 fnOS

**方法一：应用中心安装**
1. 打开 fnOS 应用中心
2. 点击「手动安装」
3. 上传下载的 `.fpk` 文件
4. 等待安装完成

**方法二：命令行安装**
```bash
appcenter-cli install-local moontvplus-fpk.fpk
```

### 步骤 3: 初始配置

安装完成后，访问应用（默认端口 3000）：
```
http://你的fnOS IP:3000
```

会看到安装配置向导，需要配置：

1. **端口配置**
   - 默认：3000
   - 范围：1024-65535
   - 示例：3000, 8080, 9000

2. **管理员账号**
   - 用户名：默认 admin
   - 密码：至少 6 位
   - 用于登录管理后台

3. **激活码**（可选）
   - 格式：MTV-XXXX-XXXX-XXXX
   - 可以稍后在应用内激活
   - 管理后台：https://9ay.kdns.fr

### 步骤 4: 完成安装

点击「完成安装」后，应用会自动重启并加载配置。

---

##  配置说明

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 应用端口 | 3000 |
| ACTIVATION_API_URL | 激活码验证 API | https://9ay.kdns.fr |
| TZ | 时区 | Asia/Shanghai |

### 数据目录

- `/var/apps/moontvplus/shares/moontvplus/data` - 应用数据
- `/var/apps/moontvplus/shares/moontvplus/activation` - 激活信息

### 配置文件

安装后会在 activation 目录生成：
- `config.json` - 应用配置（端口、账号等）
- `activation.json` - 激活信息

---

## 🔐 激活码说明

### 获取激活码

1. 访问管理后台：https://9ay.kdns.fr
2. 登录（密码：xq926454）
3. 生成新的激活码
4. 格式：`MTV-XXXX-XXXX-XXXX`

### 激活方式

**方式一：安装时激活**
在安装向导的第三步输入激活码

**方式二：安装后激活**
1. 访问应用
2. 点击「激活」
3. 输入激活码
4. 点击「验证并激活」

### 激活码规则

- 每个激活码只能绑定一台设备
- 激活码没有有效期
- 管理员可以吊销激活码
- 换设备需要先在管理后台解绑

---

## 🛠️ 高级配置

### 修改端口

编辑配置文件：
```bash
# SSH 登录到 fnOS
nano /var/apps/moontvplus/shares/moontvplus/activation/config.json
```

修改 `port` 字段，然后重启应用：
```bash
docker restart moontvplus
```

### 修改账号密码

同样编辑 `config.json`：
```json
{
  "port": 3000,
  "username": "newadmin",
  "password": "newpassword123"
}
```

### 查看日志

```bash
docker logs moontvplus
docker logs -f moontvplus  # 实时日志
```

### 备份数据

```bash
# 备份到本地
cp -r /var/apps/moontvplus/shares/moontvplus/data ./backup

# 恢复
cp -r ./backup /var/apps/moontvplus/shares/moontvplus/data
```

---

## ❓ 常见问题

### Q: 安装后无法访问？

A: 检查：
1. 端口是否正确（默认 3000）
2. 防火墙是否放行
3. 容器是否正常运行：`docker ps | grep moontvplus`

### Q: 激活失败？

A: 检查：
1. 激活码格式是否正确
2. 激活码是否已被使用
3. 网络是否能访问 9ay.kdns.fr

### Q: 如何重置配置？

A: 删除配置文件：
```bash
rm /var/apps/moontvplus/shares/moontvplus/activation/config.json
rm /var/apps/moontvplus/shares/moontvplus/activation/activation.json
docker restart moontvplus
```

### Q: 如何更新版本？

A: 
1. 下载新版 FPK
2. 卸载旧版
3. 安装新版
4. 数据会保留（在 data 目录）

---

## 📊 版本对比

| 特性 | 在线版 | 离线版 |
|------|--------|--------|
| **文件大小** | < 10MB | ~800MB |
| **需要网络** | ✅ 是 | ❌ 否 |
| **安装速度** | 中（需拉取镜像） | 快（本地加载） |
| **更新方式** | 拉取新镜像 | 重新安装 FPK |
| **推荐场景** | 网络良好 | 离线环境 |

---

## 🔗 相关链接

- **GitHub 仓库**: https://github.com/kaynai1/MoonTVPlus-FPK
- **管理后台**: https://9ay.kdns.fr
- **MoonTVPlus 原版**: https://github.com/mtvpls/MoonTVPlus
- **问题反馈**: https://github.com/kaynai1/MoonTVPlus-FPK/issues

---

## 📝 版本历史

### v1.0.0 (2026-10-24)
- ✅ 初始版本
- ✅ 激活码授权系统
- ✅ 安装配置向导
- ✅ 支持端口和账号配置
- ✅ 在线版和离线版
