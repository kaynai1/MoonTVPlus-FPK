# MoonTVPlus FPK 包（GHCR 镜像版）

MoonTVPlus 影视聚合平台的飞牛 fnOS 应用包，使用 GitHub Container Registry (GHCR) 托管 Docker 镜像。

## 🌟 版本特点

### 本版本（GHCR 镜像版）⭐ 推荐
- ✅ **FPK 文件小巧**（< 10MB）
- ✅ **自动构建和发布**（GitHub Actions）
- ✅ **更新方便**（推送新标签即可）
- ✅ **标准 Docker 工作流**
- ✅ **支持多版本管理**
- ⚠️ **需要网络访问 GitHub**

### 其他版本
- **标准版** (`moontvplus-fpk/`) - 基础版本，需手动构建镜像
- **镜像内嵌版** (`moontvplus-fpk-embedded/`) - 镜像打包在 FPK 内，无需网络

## 📋 功能特性

- 🎬 **影视聚合**：支持多源搜索和播放
- 🎵 **音乐播放**：在线音乐播放和管理
-  **漫画阅读**：在线漫画浏览
- 🔄 **多端同步**：观看记录多设备同步
- 🔐 **激活码授权**：需要激活码才能使用

## 🚀 快速开始

### 1. 推送镜像到 GHCR

```bash
# 克隆项目
git clone https://github.com/mtvpls/MoonTVPlus-FPK.git
cd MoonTVPlus-FPK/moontvplus-fpk-ghcr

# 构建 Docker 镜像
cd app/docker
docker build -t ghcr.io/mtvpls/moontvplus-fpk:latest .

# 登录 GHCR
echo $GHCR_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# 推送镜像
docker push ghcr.io/mtvpls/moontvplus-fpk:latest
```

### 2. 构建 FPK 包

```bash
# 返回项目根目录
cd ../..

# 安装 fnpack（如未安装）
# 从 https://developer.fnnas.com/ 下载

# 构建 FPK
fnpack build
```

### 3. 安装到 fnOS

```bash
# 方法一：应用中心手动安装
# 上传 moontvplus.fpk 到应用中心

# 方法二：命令行安装
appcenter-cli install-local moontvplus.fpk
```

## 🤖 自动构建（推荐）

### 设置 GitHub Actions

1. **Fork 或创建仓库**
   ```bash
   # 创建新仓库
   gh repo create mtvpls/MoonTVPlus-FPK --public
   ```

2. **推送代码**
   ```bash
   git add .
   git commit -m "Initial commit: MoonTVPlus FPK with GHCR"
   git push -u origin main
   ```

3. **创建 Release 标签**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

4. **自动构建**
   - GitHub Actions 会自动构建 Docker 镜像
   - 推送到 `ghcr.io/mtvpls/moontvplus-fpk:v1.0.0`
   - 同时构建 FPK 包并上传到 Release

### 工作流说明

```yaml
触发条件:
  - 推送到 main/master 分支
  - 创建标签 (v*)
  - 手动触发

执行步骤:
  1. 克隆 MoonTVPlus 源码
  2. 构建 Docker 镜像（多平台支持）
  3. 推送到 GHCR
  4. 构建 FPK 包（仅标签触发）
  5. 上传 FPK 到 GitHub Release
```

## 📦 镜像标签策略

| 标签 | 说明 | 示例 |
|------|------|------|
| `latest` | 最新稳定版 | `ghcr.io/mtvpls/moontvplus-fpk:latest` |
| `v1.0` | 次版本号 | `ghcr.io/mtvpls/moontvplus-fpk:v1.0` |
| `v1.0.0` | 完整版本号 | `ghcr.io/mtvpls/moontvplus-fpk:v1.0.0` |
| `sha-abc123` | 提交哈希 | `ghcr.io/mtvpls/moontvplus-fpk:sha-abc1234` |

## 🔐 激活说明

安装完成后，首次访问应用会显示激活页面。

### 获取激活码

1. 访问管理后台：https://9ay.kdns.fr
2. 登录管理员账号（密码：xq926454）
3. 生成新的激活码
4. 将激活码提供给用户

### 激活步骤

1. 打开应用（默认端口 3000）
2. 在激活页面输入激活码
3. 点击「验证并激活」
4. 激活成功后应用自动重启

### 激活码格式

```
MTV-XXXX-XXXX-XXXX
```

例如：`MTV-XALH-T4BS-NXDN`

## ⚙️ 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| PORT | 应用端口 | 3000 |
| ACTIVATION_API_URL | 激活码验证 API | https://9ay.kdns.fr |
| TZ | 时区 | Asia/Shanghai |

### 数据目录

- `/var/apps/moontvplus/shares/moontvplus/data` - 应用数据（数据库等）
- `/var/apps/moontvplus/shares/moontvplus/activation` - 激活信息

## 📁 目录结构

```
moontvplus-fpk-ghcr/
── manifest                    # FPK 清单
├── ICON.PNG                    # 应用图标
├── README.md                   # 本文档
├── app/
│   ├── docker/
│   │   ├── Dockerfile          # Docker 镜像定义
│   │   ├── docker-compose.yaml # 容器配置（使用 GHCR）
│   │   ├── .dockerignore
│   │   └── activation/         # 激活码系统
│   │       ├── start-with-activation.js
│   │       ├── activation-page.html
│   │       └── activation-utils.js
│   └── ui/
│       └── config
├── cmd/                        # 生命周期脚本
│   ├── main
│   ├── install_init
│   ├── install_callback
│   ├── upgrade_init
│   ├── upgrade_callback
│   ├── uninstall_init
│   ├── uninstall_callback
│   ├── config_init
│   └── config_callback
── config/
│   ├── privilege
│   └── resource
├── wizard/
│   └── install.json
└── .github/
    └── workflows/
        └── docker-build.yml    # GitHub Actions 工作流
```

## 🔄 版本对比

| 特性 | 标准版 | 镜像内嵌版 | GHCR 版 |
|------|--------|-----------|---------|
| **FPK 大小** | 小（< 10MB） | 大（500MB-1GB） | 小（< 10MB） |
| **需要网络** | 是（拉取镜像） | 否 | 是（访问 GitHub） |
| **安装速度** | 慢 | 快 | 中 |
| **更新方式** | 手动构建 | 重新打包 | 推送标签 |
| **自动构建** | ❌ | ❌ | ✅ |
| **版本管理** | 手动 | 手动 | 自动 |
| **推荐场景** | 开发测试 | 离线环境 | **生产环境** ⭐ |

## 🛠️ 开发说明

### 本地测试

```bash
# 1. 构建镜像
cd app/docker
docker build -t moontvplus-test:latest .

# 2. 运行容器
docker run -d \
  --name moontvplus-test \
  -p 3000:3000 \
  -v $(pwd)/data:/app/.data \
  -v $(pwd)/activation:/app/activation \
  moontvplus-test:latest

# 3. 访问应用
# http://localhost:3000

# 4. 停止容器
docker stop moontvplus-test
docker rm moontvplus-test
```

### 修改激活逻辑

编辑以下文件：
- `app/docker/activation/start-with-activation.js` - 激活验证逻辑
- `app/docker/activation/activation-page.html` - 激活页面 UI

### 更新 MoonTVPlus 版本

```bash
# 1. 更新 app/docker/ 中的 MoonTVPlus 源码
cd app/docker
rm -rf *
git clone --depth 1 https://github.com/mtvpls/MoonTVPlus.git .

# 2. 重新构建镜像
docker build -t ghcr.io/mtvpls/moontvplus-fpk:latest .

# 3. 推送新版本
docker push ghcr.io/mtvpls/moontvplus-fpk:latest

# 4. 创建新标签
git tag v1.1.0
git push origin v1.1.0
```

## ❓ 常见问题

### Q: GHCR 和 Docker Hub 有什么区别？

A: GHCR 是 GitHub 官方的容器镜像仓库，与 GitHub 集成更好：
- 免费私有镜像
- 使用 GitHub Token 认证
- 与 GitHub Actions 无缝集成
- 更好的访问控制

### Q: 如何设置 GHCR 认证？

A: 在 fnOS 上：
```bash
# 生成 GitHub Personal Access Token
# Settings → Developer settings → Personal access tokens → Fine-grained tokens
# 权限：packages: read

# 登录 GHCR
echo YOUR_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin
```

### Q: 自动构建失败怎么办？

A: 检查：
1. GitHub Actions 是否启用
2. GITHUB_TOKEN 权限是否正确
3. Dockerfile 是否有语法错误
4. 查看 Actions 日志排查问题

### Q: 如何回滚到旧版本？

A: 修改 `docker-compose.yaml` 中的镜像标签：
```yaml
image: ghcr.io/mtvpls/moontvplus-fpk:v1.0.0  # 指定版本
```

### Q: 激活失败怎么办？

A: 请检查：
1. 激活码是否正确（格式：MTV-XXXX-XXXX-XXXX）
2. 激活码是否已被其他设备使用
3. 网络连接是否正常（需要访问 9ay.kdns.fr）

## 📊 镜像信息

- **仓库**: `ghcr.io/mtvpls/moontvplus-fpk`
- **基础镜像**: `node:24-alpine`
- **架构**: `linux/amd64`
- **大小**: 约 800MB
- **端口**: 3000

## 📝 许可证

本项目基于 [MoonTVPlus](https://github.com/mtvpls/MoonTVPlus) 构建。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

##  支持

如有问题，请访问：
- GitHub: https://github.com/mtvpls/MoonTVPlus
- 管理后台: https://9ay.kdns.fr
- Issues: https://github.com/mtvpls/MoonTVPlus-FPK/issues

##  版本历史

### v1.0.0 (2026-10-23)
- 初始版本
- 集成激活码授权系统
- GitHub Actions 自动构建
- GHCR 镜像托管
