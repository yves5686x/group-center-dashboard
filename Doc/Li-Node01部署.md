# Li-Node01 现有 nginx 部署

日常流程优先在飞牛测试发布镜像，再从同一份前端发布镜像导出生产 dist。镜像导出入口位于配置仓库 `Docker/Server/group-center-dashboard/docker-compose.yml`，不需要服务器上的前端源码；步骤见 `li-group-config/docs/fnos-to-li-node01.md`。本文后续的源码构建入口保留作为可选方式。

服务器前端仓库在 `/home/important/Data/Web/group-center-dashboard`。nginx 容器挂载整个仓库目录，站点根目录为其中的 `dist`，监听宿主机 `80`。 `g.329509.xyz`、`329509.xyz`、`www.329509.xyz`、`gpu.329509.xyz` 使用同一站点。

`docker-compose.li-node01.yml` 适配这套现有部署：只构建并导出静态文件，没有新增前端监听端口，不与 nginx 的 `80/443` 争用。普通 `docker-compose.yml`、本地联调和飞牛 Compose 继续保留。

## 构建和导出

先在安装 Docker 的构建机器、前端仓库根目录执行：

```bash
docker compose -f docker-compose.li-node01.yml config --quiet
docker compose -f docker-compose.li-node01.yml build assets
```

使用 Dockerfile 的 `builder` 阶段生成产物，镜像名为 `group-center-dashboard-assets:li-node01`。前端 `GROUP_CENTER_URL` 固定为空，关闭开发代理，浏览器通过当前站点的 `/api/`、`/web/`、`/version` 请求后端。本机 `.env` 中的 `localhost:15090` 不进入构建上下文。构建并不写入服务器网站目录。若在本机构建，需另行传输镜像或产物。

后续在服务器执行导出之前，先备份现有 `dist`，并确保新版后端已部署。导出默认写入原网站目录：

```bash
docker compose -f docker-compose.li-node01.yml run --rm --no-deps assets
```

若只要在本机构建和检查，使用已有本地输出目录：

```bash
mkdir -p ./preview-dist
DASHBOARD_DIST_DIR="$PWD/preview-dist" \
  docker compose -f docker-compose.li-node01.yml run --rm --no-deps assets
```

目录必须已存在，路径错误会停止。导出会覆盖同名文件，保留其他旧文件，并将目录设为 755、文件设为 644，使 nginx 能读取。文件逐个复制，发布期间并非原子切换；建议在维护窗口完成，并保留备份便于回退。 `preview-dist` 内容是验证用产物，不应提交到 Git。

nginx 的静态文件更新不要求重建容器；若同时更新代理配置，部署时另行执行 `nginx -t` 和 reload。本次没有更新远程产物或重载服务。配置仓库中 `/api/`、`/web/` 已补上关闭缓冲和 300 秒读取超时，与容器内的前端 nginx 模板保持一致。

## 版本与限制

2026-10-13 核对的远程源码为前端 `1.8.13`，本地为 `1.8.15`。远程 `dist/index.html` 的修改时间早于本次核对，源码版本不等于已验证的产物版本。当前后端 `/version` 为 `1.8.8`，前端新版依赖新版后端的实时聚合接口，部署时应先更新后端，再导出前端。

本次完成 Compose 解析、导出命令语法检查以及候选站点的服务器 nginx 语法检查。本机没有 Docker 服务；完整前端构建尝试因依赖下载源 DNS 失败而中止，未证明新镜像构建成功或新版前后端联调成功。完整差异见 `li-group-config/docs/li-node01-deployment-audit.md`。
