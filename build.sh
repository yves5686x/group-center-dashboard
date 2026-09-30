#!/usr/bin/env bash

set -e

# 项目统一使用 pnpm（与 .umirc.ts 的 npmClient 一致）。
# 用 --frozen-lockfile 让 lockfile 与 package.json 不一致时直接失败，
# 避免 CI / 镜像里装出与本地不同的依赖。
pnpm install --frozen-lockfile
pnpm run build
