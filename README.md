# Group-Center-Dashboard

## Getting Started

![Screenshot](Doc/docs/assets/screenshot.png)

![Screenshot Detail](Doc/docs/assets/screenshot_detail.png)

## Notices

You can use `pnpm` and `WebPack` on Windows.

`Mako` is only for macOS and Linux.

## Install Environment

### HomeBrew

#### Install HomeBrew

https://brew.sh/

#### Mirrors

https://mirrors.tuna.tsinghua.edu.cn/help/homebrew/

#### Install Software

```bash
brew install node pnpm
```

### Node Config

#### Change Mirrors via nrm

```bash
npm i -g nrm
nrm use taobao
```

#### Check Update

```bash
npm i -g npm-check-updates
ncu -u
```

## pnpm

项目统一使用 `pnpm`（与 `.umirc.ts` 的 `npmClient` 一致），仓库里只保留 `pnpm-lock.yaml` 一份 lockfile。

### Install Package

```bash
pnpm install
```

CI 与镜像里用 `--frozen-lockfile`，lockfile 与 `package.json` 不一致时直接失败：

```bash
pnpm install --frozen-lockfile
```

### Run

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

## Docker

产物是纯静态 SPA，镜像用 nginx 托管，多阶段构建后以非 root 运行。

```bash
docker build -t group-center-dashboard .
docker run -d -p 8080:80 -e BACKEND_URL=http://你的后端地址:15090 group-center-dashboard
```

`BACKEND_URL` 在容器启动时注入，nginx 把 `/api`、`/web`、`/version` 反代到后端（与 `config/config.proxy.ts` 的 dev 代理规则一致）。

本地联调：

```bash
docker compose up --build
```

镜像里 **mock 不生效**（mock 只在 dev server 启用），后端没起的话页面能打开但没有数据。

### 发布镜像

推送 `v*` tag 会触发 GitHub Actions（`.github/workflows/release.yml`），构建镜像推到 GHCR，并自动创建 GitHub Release：

```bash
# 先把版本号同步到 package.json，再打 tag
git tag v1.8.15
git push origin dev --tags
```

工作流会校验 tag 与 `package.json` 的版本是否一致，不一致直接失败。

拉取：

```bash
docker pull ghcr.io/yves5686x/group-center-dashboard:1.8.15
```

GHCR 包是公开的，但匿名拉取有速率限制；需要登录时：

```bash
echo "$GITHUB_TOKEN" | docker login ghcr.io -u yves5686x --password-stdin
```

## Create Project

### Alibaba Umi

### Mako

Use `mako` for umi on macOS/Linux

```bash
npx umi config set mako {}
```

## Issues

### ERR_PNPM_OUTDATED_LOCKFILE

`package.json` 改了依赖但没重新生成 `pnpm-lock.yaml`。补一次即可：

```bash
pnpm install
```

## Ref

https://umijs.org/

https://ant-design.antgroup.com/index-cn

https://makojs.dev/zh-CN

`@umijs/max` 模板项目，更多功能参考 [Umi Max 简介](https://umijs.org/docs/max/introduce)
