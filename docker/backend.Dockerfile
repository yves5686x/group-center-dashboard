# syntax=docker/dockerfile:1
# 构建当前后端源码，不依赖手动生成的 group-center-docker.jar。
FROM ghcr.io/graalvm/jdk-community:25 AS builder
WORKDIR /build
COPY gradlew build.gradle.kts settings.gradle.kts ./
COPY gradle ./gradle
COPY src ./src
RUN chmod +x gradlew
RUN --mount=type=cache,target=/root/.gradle ./gradlew bootJar --no-daemon \
    && find build/libs -maxdepth 1 -name '*.jar' ! -name '*-plain.jar' -exec cp {} /build/app.jar \;

FROM ghcr.io/graalvm/jdk-community:25
RUN microdnf install -y curl python3 git bash tzdata iputils \
    && microdnf clean all
WORKDIR /app
COPY --from=builder /build/app.jar /app/app.jar
COPY Scripts /app/Scripts
ENV TZ=Asia/Shanghai
EXPOSE 15090
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
