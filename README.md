# MoonTVPlus 飞牛 fnOS 应用包

把 [MoonTVPlus](https://github.com/mtvpls/MoonTVPlus) 打包成 fnOS 可直接安装的 `.fpk`，并在外层加了一道激活码授权。

## 下载

在 [Releases](../../releases) 页面下载，每个版本提供两个包：

| 文件 | 说明 |
| --- | --- |
| `moontvplus_<版本>_online.fpk` | 在线版（约 200 KB），安装时拉取官方镜像 `ghcr.io/mtvpls/moontvplus`（307 MB） |
| `moontvplus_<版本>_offline.fpk` | 离线版（约 300 MB），镜像已内嵌，安装过程不联网 |

镜像不自己构建：直接用官方的 `ghcr.io/mtvpls/moontvplus:latest`，激活层以只读挂载方式叠加，上游镜像完全不动。
拉取顺序为 `ghcr.nju.edu.cn` → `ghcr.m.daocloud.io` → `ghcr.io`，前两个是国内镜像源。

## 安装

1. 飞牛 OS → 应用中心 → 手动安装 → 选择 `.fpk`
2. 安装向导中填写访问端口（默认 3000，可修改）
3. 打开应用，首次访问进入初始化页面：
   - 设置管理员用户名 / 密码（即 MoonTVPlus 站长账号）
   - 输入激活码 `MTV-XXXX-XXXX-XXXX`
4. 约 10 秒后应用就绪

端口后续可在「应用中心 → MoonTVPlus → 设置」中修改。

## 激活机制

- 激活码由管理后台 <https://9ay.kdns.fr> 生成，一个激活码绑定一台设备
- 设备标识保存在应用数据目录的 `device.json`，重装并删除数据会生成新标识
- 激活状态在 `activation.json`；每次启动会向授权服务器校验一次，吊销后下次重启即失效
- 授权服务器不可达时按已激活继续运行（避免断网导致无法使用），恢复联网后自动校验
- 换设备：在管理后台对该激活码「解绑」后重新激活

## 目录结构

```
manifest              fnOS 应用清单（platform=x86, checksum=md5(app.tgz)）
MoonTVPlus.sc         端口转发配置
config/               privilege（运行用户）、resource（数据共享/端口/docker 项目）
ui/                   桌面入口与图标
wizard/config         安装向导字段（端口）
cmd/                  生命周期脚本
  common              通用框架（官方模板）
  installer           入口脚本共用的初始化
  service-setup       安装/升级/卸载/改配置时的 docker compose 操作
  main                start/stop/status
app/docker/           docker-compose.yaml、激活层（镜像用官方的）
build-fpk.sh          本地构建 FPK（不依赖 fnpack）
```

FPK 本质是 gzip tar：根目录放 `manifest` 等文件，`app.tgz`（内含 `docker/` 和 `ui/`）再打包一次，`manifest` 里的 `checksum` 是 `app.tgz` 的 MD5。

## 本地构建

```bash
./build-fpk.sh online          # 在线版
./build-fpk.sh offline         # 离线版，需先准备 moontvplus-image.tar
```

离线版镜像准备：

```bash
docker pull ghcr.io/mtvpls/moontvplus:latest
docker save ghcr.io/mtvpls/moontvplus:latest -o moontvplus-image.tar
```

## 发布

推送 `v*` 标签即可触发 `.github/workflows/docker-build.yml`：

1. 构建在线版 / 离线版 FPK（离线版会先导出官方镜像）
2. 上传到对应的 GitHub Release

激活层通过 `/app/activation` 只读挂载进官方镜像，并用 `command` 覆盖启动命令，上游镜像与代码均不改动。
