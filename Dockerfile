FROM node:22-bookworm
ENV DEBIAN_FRONTEND=noninteractive ANDROID_SDK_ROOT=/opt/android-sdk ANDROID_HOME=/opt/android-sdk
RUN apt-get update && apt-get install -y --no-install-recommends \
  openjdk-17-jdk gradle python3 python3-pip libreoffice pandoc poppler-utils chromium unzip zip curl ca-certificates git \
  && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /opt/android-sdk/cmdline-tools && curl -fsSL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o /tmp/sdk.zip \
  && unzip -q /tmp/sdk.zip -d /opt/android-sdk/cmdline-tools \
  && mv /opt/android-sdk/cmdline-tools/cmdline-tools /opt/android-sdk/cmdline-tools/latest \
  && rm /tmp/sdk.zip \
  && yes | /opt/android-sdk/cmdline-tools/latest/bin/sdkmanager --licenses >/dev/null || true \
  && /opt/android-sdk/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p /app/storage
EXPOSE 8080
CMD ["sh","-c","node server/src/workers/worker.js & node server/src/index.js"]
