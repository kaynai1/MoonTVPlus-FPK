# MoonTVPlus FPK - GitHub 推送指南

## 📦 仓库信息

- **仓库地址**: https://github.com/kaynai1/MoonTVPlus-FPK
- **GHCR 镜像**: `ghcr.io/kaynai1/moontvplus-fpk:latest`
- **状态**: 仓库已创建，等待推送代码

## 🚀 推送代码到 GitHub

由于网络连接问题，请手动执行以下步骤：

### 方法一：使用 Git 命令行

```bash
# 1. 进入项目目录
cd E:/qcode/moontvplus-fpk-ghcr

# 2. 添加远程仓库（已配置）
git remote set-url origin https://github.com/kaynai1/MoonTVPlus-FPK.git

# 3. 推送代码
git push -u origin main

# 如果提示认证，使用你的 GitHub Token:
# 用户名：kaynai1
# 密码：[REMOVED]
```

### 方法二：使用 GitHub Desktop

1. 打开 GitHub Desktop
2. File → Add Local Repository → 选择 `E:\qcode\moontvplus-fpk-ghcr`
3. 点击 "Publish repository"
4. 取消勾选 "Keep this code private"（已经是公开仓库）
5. 点击 "Publish Repository"

### 方法三：直接上传（备选）

如果 Git 推送仍然失败：
1. 访问 https://github.com/kaynai1/MoonTVPlus-FPK
2. 点击 "uploading an existing file"
3. 拖拽所有文件到页面
4. 点击 "Commit changes"

## 🐳 推送 Docker 镜像到 GHCR

### 前置条件

1. **安装 Docker**
   - Windows: Docker Desktop
   - macOS: Docker Desktop
   - Linux: `sudo apt install docker.io`

2. **登录 GHCR**

```bash
# 使用 GitHub Token 登录
echo [REMOVED] | docker login ghcr.io -u kaynai1 --password-stdin
```

### 构建并推送镜像

```bash
# 1. 进入项目目录
cd E:/qcode/moontvplus-fpk-ghcr

# 2. 克隆 MoonTVPlus 源码到 app/docker/
cd app/docker
git clone --depth 1 https://github.com/mtvpls/MoonTVPlus.git .
cd ../..

# 3. 构建 Docker 镜像
cd app/docker
docker build -t ghcr.io/kaynai1/moontvplus-fpk:latest .

# 4. 推送镜像
docker push ghcr.io/kaynai1/moontvplus-fpk:latest

# 5. 推送版本标签（可选）
docker tag ghcr.io/kaynai1/moontvplus-fpk:latest ghcr.io/kaynai1/moontvplus-fpk:v1.0.0
docker push ghcr.io/kaynai1/moontvplus-fpk:v1.0.0
```

### 使用自动化脚本

```bash
# 运行推送脚本（会自动完成上述所有步骤）
cd E:/qcode/moontvplus-fpk-ghcr
./push-to-ghcr.sh
```

## 🤖 设置 GitHub Actions 自动构建

### 1. 启用 Actions

1. 访问 https://github.com/kaynai1/MoonTVPlus-FPK/actions
2. 点击 "I understand my workflows, go ahead and enable them"

### 2. 配置 Permissions

1. 访问 https://github.com/kaynai1/MoonTVPlus-FPK/settings/actions
2. 找到 "Workflow permissions"
3. 选择 "Read and write permissions"
4. 勾选 "Allow GitHub Actions to create and approve pull requests"
5. 点击 "Save"

### 3. 触发自动构建

```bash
# 创建版本标签触发自动构建和 FPK 打包
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions 会自动：
1. 构建 Docker 镜像
2. 推送到 GHCR
3. 构建 FPK 包
4. 上传 FPK 到 Release

## 📋 完整操作流程

```bash
# 1. 推送代码
cd E:/qcode/moontvplus-fpk-ghcr
git push -u origin main

# 2. 登录 GHCR
echo [REMOVED] | docker login ghcr.io -u kaynai1 --password-stdin

# 3. 推送 Docker 镜像
./push-to-ghcr.sh

# 4. 创建 Release 标签
git tag v1.0.0
git push origin v1.0.0

# 5. 等待 GitHub Actions 完成
# 访问 https://github.com/kaynai1/MoonTVPlus-FPK/actions
```

##  安全提示

**重要**: 你的 GitHub Token (`[REMOVED]`) 具有仓库访问权限。

建议：
1. ✅ 不要将 Token 提交到代码仓库
2. ✅ 使用完后可以在 GitHub 上撤销
3. ✅ 考虑使用 GitHub Actions 的 secrets 存储 Token
4. ✅ 定期轮换 Token

撤销 Token: https://github.com/settings/tokens

## 📊 镜像访问

推送成功后，镜像可以通过以下方式访问：

- **GHCR 页面**: https://github.com/kaynai1/MoonTVPlus-FPK/pkgs/container/moontvplus-fpk
- **拉取命令**: `docker pull ghcr.io/kaynai1/moontvplus-fpk:latest`
- **公开访问**: 仓库已设为公开，任何人都可以拉取镜像

## ❓ 常见问题

### Q: Git 推送失败怎么办？

A: 尝试以下方法：
1. 检查网络连接
2. 使用代理：`git config --global http.proxy http://127.0.0.1:7897`
3. 使用 GitHub Desktop
4. 直接上传文件到 GitHub

### Q: Docker 推送失败怎么办？

A: 检查：
1. 是否已登录 GHCR
2. Token 是否有 `write:packages` 权限
3. 镜像名称是否正确
4. 网络连接是否正常

### Q: GitHub Actions 没有触发？

A: 检查：
1. Actions 是否已启用
2. Workflow permissions 是否正确
3. 查看 Actions 日志排查问题

## 📝 下一步

1. ✅ 推送代码到 GitHub
2. ✅ 推送 Docker 镜像到 GHCR
3. ✅ 创建 Release 标签
4.  在 fnOS 上测试安装
5. ⏳ 分发 FPK 给用户

## 📞 支持

如有问题，请访问：
- 仓库：https://github.com/kaynai1/MoonTVPlus-FPK
- Issues: https://github.com/kaynai1/MoonTVPlus-FPK/issues
