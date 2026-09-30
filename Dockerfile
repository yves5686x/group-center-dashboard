# syntax=docker/dockerfile:1

########################################
# 阶段 1：构建
# - 用 pnpm 而非 bun：项目同时存在 bun.lockb / pnpm-lock.yaml / package-lock.json
#   三份 lockfile，CI/镜像里必须锁定一个包管理器，否则装出来的依赖不确定。
#   这里选 pnpm，与 .umirc.ts 的 npmClient: 'pnpm' 保持一致。
# - Mako 的 Rust 二进制通过 @umijs/mako-linux-{x64,arm64}-{gnu,musl} 四个
#   optionalDependencies 分发，node:*-alpine 走 musl、debian 走 gnu，
#   两者都覆盖到了，跨架构也能构建。
########################################
FROM node:22-bookworm-slim AS builder

# corepack 提供 pnpm，避免依赖全局安装
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 只拷锁文件 + 包描述，利用 Docker 层缓存：
# 只要依赖没变，这一步就不会失效，比先拷全量再 install 快很多。
# 注意 .npmrc 已在 .dockerignore 中排除（里面配的是国内镜像源，
# GitHub Actions runner 在境外走它反而更慢），所以这里不再 COPY。
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# 依赖装完再拷源码，改业务代码只会让最后一层失效
COPY . .

# 构建期不需要后端地址：生产环境前端与后端同源，由 nginx 反代。
# 若确实要构建期注入，改为 ARG 后在这里 ENV。
ENV GROUP_CENTER_URL=""
# 关掉 umi 的 dev proxy，它只在 dev 有意义
ENV ENABLE_PROXY=false
ENV DISABLE_PROXY=true

RUN pnpm run build


########################################
# 阶段 2：运行时
# - 纯静态 SPA，nginx 足够，不需要 node 运行时
# - 以非 root 运行
########################################
FROM nginx:1.27-alpine AS runner

# 使用官方镜像的模板机制：启动时对 templates/*.template 执行 envsubst，
# 注入 BACKEND_URL。只替换这一个变量，避免误伤 nginx 自己的 $host/$uri。
# 必须带 scheme（http://host:port），模板里不再补前缀。
ENV BACKEND_URL="http://backend:8080"
# 单引号避免 Docker 把 $ 当变量展开，BuildKit 的 UndefinedVar 检查也不会
# 再报 undefined variable '$$'（写成 "$$" 虽然结果相同，但会触发该告警）
ENV NGINX_ENVSUBST_FILTER='^BACKEND_URL$'

# 整体替换官方主配置：pid 与各级 temp 目录都显式指向非 root 可写的位置，
# 不再依赖 sed 改官方配置（其内容随版本变化，匹配不到还会静默通过）。
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# entrypoint 启动时要把 templates/ 渲染进 /etc/nginx/conf.d，该目录必须可写
COPY --from=builder /app/dist /usr/share/nginx/html

RUN mkdir -p /tmp/client_temp /tmp/proxy_temp /tmp/fastcgi_temp \
             /tmp/uwsgi_temp /tmp/scgi_temp \
    && chmod 1777 /tmp \
    && chown -R 101:101 /usr/share/nginx/html /etc/nginx/conf.d \
    && nginx -t \
    # 构建期以 root 跑 nginx -t 可能留下 root 属主的 pid 文件，
    # 运行期 uid 101 就写不掉了，这里清掉
    && rm -f /tmp/nginx.pid

USER 101

# 8080 而非 80：非 root 无法绑定特权端口，见 nginx.conf.template 注释
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1

# pid 等已在 nginx.conf 中指定，不在 -g 里重复追加
CMD ["nginx", "-g", "daemon off;"]
