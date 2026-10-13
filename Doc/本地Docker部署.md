# 前后端本地 Docker 部署

## 当前验证状态

2026-10-07：已提供联合 Compose 和后端源码构建文件；本机未找到 Docker CLI、Docker Desktop、OrbStack、Colima，尚未执行容器构建和启动，不能视为已部署成功。

## 启动

两个仓库需保持当前相邻目录结构。安装并启动 [Docker Desktop for Mac](https://docs.docker.com/desktop/setup/install/mac-install/)（选择匹配芯片的版本），然后在终端执行：

```bash
cd /Users/yves/code/web/group-center-dashboard
cp .env.docker.example .env.docker.local
```

编辑 `.env.docker.local`，填入实际数据库密码，核对数据库用户名、JDBC URL 和 Agent 地址。最好使用专门的测试账号或数据库副本，不将真实凭据提交 Git。含 `$` 或 `#` 的值用单引号包围。数据库必须已经有当前后端需要的表，本方案不会自动建表。

```bash
docker compose --env-file .env.docker.local -f docker-compose.local.yml config --quiet
docker compose --env-file .env.docker.local -f docker-compose.local.yml up -d --build
docker compose --env-file .env.docker.local -f docker-compose.local.yml ps
docker compose --env-file .env.docker.local -f docker-compose.local.yml logs --tail=100 backend web
```

打开 http://localhost:8080。前端通过容器内部 `backend:15090` 同源代理到后端，不启用 Mock。可打开 http://localhost:15090/version 检查后端。默认仅绑定本机回环地址，不对局域网开放。

第一次构建需要联网下载镜像、Gradle、Java 和前端依赖，可能花数分钟；后续构建会利用缓存。不要用原来的单前端 Compose 命令替代上述命令。

## 真实数据从哪里来

| 功能 | 必须具备的数据来源 |
| --- | --- |
| 机器列表、站点导航 | 后端 `Config/Machine/real.yaml`、`Config/Dashboard/Site/real.yaml` |
| GPU、磁盘实时状态 | 机器配置中的 apiUrl，加上容器能访问的真实 Agent 入口 |
| 历史任务、统计 | 指定 MySQL 中已有的任务记录；部署本身不会生成历史数据 |
| 心跳在线状态 | 客户端将心跳上报到这个本地后端；读取 Agent 不等于收到心跳 |
| 用户选择 | 在 `LOCAL_USER_CONFIG` 指定真实用户 YAML 路径（容器内路径） |

本轮非 Docker 实测：真实 Agent 已返回部分磁盘数据，但当前连接的库中任务查询为 0，用户未配置。Docker 部署不会自动解决这些空数据。若新建本地 MySQL，它初始也是空的；需要经授权导入数据库副本，或让真实客户端开始向本地服务上报。

Mac 上的数据库或 Agent 地址应使用 `host.docker.internal`，而不是容器中的 `127.0.0.1`。远端数据库/Agent 则使用其实际可达地址，VPN 在 Mac 上连通不代表 Docker 容器一定连通，需要启动后查看日志验证。[Docker 网络说明](https://docs.docker.com/desktop/features/networking/networking-how-tos/)

当前机器 YAML 的 host 为本地地址，不能用它的 Ping 结果证明远端机器在线；需按实际地址调整。配置目录只读挂载，修改后重启 backend 重新加载。

## 测试隔离与已知问题

禁用 SQL 自动初始化、Bot 群配置和周期报告，并不加载生产 FileEnv。机器/用户 YAML 内的 webhook 开关仍须保持关闭，避免测试触发真实告警。当前机器配置的通知开关已检查为关闭；换配置后需重新检查。数据库连接不是强制只读，测试订阅等写操作会写入所连接的库；只查阅请使用只读账号，完整功能测试请用副本库。

实测尚有功能问题：GPU 看板显示无机器，但真实接口返回 7 台 `isGpu=true` 的机器；磁盘看板把后端并发限流跳过拉取误显示成“机器不可达”。这是功能问题，不是 Docker 的数据连接问题，本次部署配置没有修改业务逻辑。

## 更新、停止和排障

修改源码后重新执行 `up -d --build`；仅修改环境或配置后执行 `up -d --force-recreate`。

```bash
docker compose --env-file .env.docker.local -f docker-compose.local.yml down
```

`down` 不删除数据库数据（本方案使用外部数据库），也不删除日志/缓存卷。无需 `down -v`。

如果端口占用，修改 `.env.docker.local` 中的 WEB_PORT/BACKEND_PORT。若 backend 不健康，先看其日志中的数据库连通性、缺表和配置读取信息；前端等待后端健康是预期行为。`/version` 健康检查只说明 HTTP 服务可响应，不保证 Agent 连通或业务数据完整。
