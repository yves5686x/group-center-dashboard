# 飞牛：先测试前后端

本阶段仅发布和测试前后端。独立 li-group-config 仓库的发布与生产部署留到后续。

## 本次测试版本

| 服务 | 镜像                                                   |
| ---- | ------------------------------------------------------ |
| 后端 | `ghcr.io/yves5686x/group-center:1.8.10-rc.1`           |
| 前端 | `ghcr.io/yves5686x/group-center-dashboard:1.8.16-rc.1` |

两个都是测试版，只有对应 GitHub Actions 成功并发布镜像后才能拉取。测试版本不会替换稳定版本的 `latest`、`1.8` 或 `1` 标签。后端包含旧 1.8.9 标签之后的实时查询修复；前端包含本次 Docker 入口适配。

## 使用哪个文件

- GitHub 上的 `docker-compose.fnos.yml` 是可公开的模板，需要自行填写飞牛测试库密码。
- 本地 `docker-compose.fnos.private.yml` 已保留现有测试数据库密码，可直接上传飞牛。这个文件被 Git 和 Docker 构建上下文忽略，不能提交或公开分享。

Compose 只启动 backend、web 两个服务，直接拉取发布镜像，不要求源码或 Dockerfile。数据库继续连接用户确认的专用测试库 `172.22.22.1:3306/group_center`，不新建 MySQL。Agent 入口继续为 `http://g.329509.xyz`。

## 飞牛界面操作

1. 等待前后端测试版镜像发布成功。
2. 在飞牛 Docker 的 Compose 管理中打开现有测试项目。
3. 用本地 private 文件替换该项目的 Compose 内容；公开模板则先填数据库密码。
4. 拉取新镜像并重新创建项目容器。保留原项目名称和已有数据卷。
5. 确认 backend 为 healthy、web 正常运行，打开 `http://飞牛内网IP:8080`。

若已有项目使用其他前端端口，保留原端口映射；默认仍为 `8080:8080`。后端不额外发布宿主机 15090，由前端内部代理到 `backend:15090`。

使用终端时，将 private 文件保存为项目原来的 `docker-compose.fnos.yml`，执行：

```bash
docker compose -f docker-compose.fnos.yml pull
docker compose -f docker-compose.fnos.yml up -d --force-recreate
docker compose -f docker-compose.fnos.yml ps
docker compose -f docker-compose.fnos.yml logs --tail=100 backend web
```

核对后端实际版本：

```bash
docker compose -f docker-compose.fnos.yml exec -T backend \
  python3 -c 'import urllib.request; print(urllib.request.urlopen("http://127.0.0.1:15090/version", timeout=5).read().decode())'
```

应返回 `1.8.10-rc.1`。首页、导航、7 台 GPU 实时数据、历史任务和统计页面均应能正常访问，刷新 `/gpu-dashboard` 等页面不应报 404。最后重启容器检查数据和设置是否仍在。

## 与服务器同步了哪些内容

7 台 GPU 的名称、真实 host、apiUrl、位置及 6 组完整导航站点，取自 2026-10-13 已与服务器核对的业务配置，内嵌在 Compose 中；不需要单独上传配置仓库。前端与后端版本升级为本次候选版本，生产服务器目前仍运行旧版本。

飞牛仍使用专用测试数据库，生产通知、Bot 密钥、生产 FileEnv 和用户资料没有复制进去。内嵌机器 webhook、日报/周报等通知和心跳告警均关闭。高级管理用户列表可能为空，因为生产用户配置没有加载。数据记录和统计来自飞牛测试库，实时 GPU 数据来自原有 Agent。生产客户端没有改为向飞牛发送心跳，所以不能把飞牛心跳状态视为生产状态。

## 配置更新与问题定位

内嵌机器和站点配置在每次启动时写入后端配置卷。替换 Compose 后必须重新创建 backend，单纯拉镜像不会改变已运行容器的环境变量。保留 `backend-config`、`backend-cache`、`backend-logs` 卷，不需要删除原卷。自动建表继续关闭，当前库需已有应用所需表；若日志显示缺表，应在测试库补齐对应结构。

- 拉取失败：确认测试版 GitHub Actions 已成功，镜像地址和标签完全一致。
- backend 不健康：查看 backend 日志，核对测试库密码、数据库连通性及表结构。
- 页面正常但 GPU 数据为空：查看后端日志和 `http://g.329509.xyz/gpu/<机器>/gpu_count`。
- 页面显示旧版本：重新创建容器并强制刷新浏览器。

测试通过后记录两个镜像摘要，作为后续生产更新依据。本阶段没有更新生产服务器。
