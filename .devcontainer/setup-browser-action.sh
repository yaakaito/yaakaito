#!/bin/zsh

# マルチアーキテクチャを有効にする
sudo dpkg --add-architecture amd64

# リポジトリを修正（Debianの場合）
echo 'deb [arch=arm64] http://deb.debian.org/debian bookworm main contrib non-free non-free-firmware
deb [arch=arm64] http://deb.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
deb [arch=arm64] http://deb.debian.org/debian bookworm-updates main contrib non-free non-free-firmware
deb [arch=amd64] http://deb.debian.org/debian bookworm main contrib non-free non-free-firmware
deb [arch=amd64] http://deb.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
deb [arch=amd64] http://deb.debian.org/debian bookworm-updates main contrib non-free non-free-firmware' | sudo tee /etc/apt/sources.list

# リポジトリを更新しライブラリをインストール
sudo apt update
sudo apt install -y \
        ca-certificates:amd64 \
        fonts-ipafont-gothic:amd64 \
        fonts-liberation:amd64 \
        libasound2:amd64 \
        libatk-bridge2.0-0:amd64 \
        libatk1.0-0:amd64 \
        libc6:amd64 \
        libcairo2:amd64 \
        libcups2:amd64 \
        libdbus-1-3:amd64 \
        libexpat1:amd64 \
        libfontconfig1:amd64 \
        libgbm1:amd64 \
        libgcc1:amd64 \
        libglib2.0-0:amd64 \
        libgtk-3-0:amd64 \
        libnspr4:amd64 \
        libnss3:amd64 \
        libpango-1.0-0:amd64 \
        libpangocairo-1.0-0:amd64 \
        libstdc++6:amd64 \
        libx11-6:amd64 \
        libx11-xcb1:amd64 \
        libxcb1:amd64 \
        libxcomposite1:amd64 \
        libxcursor1:amd64 \
        libxdamage1:amd64 \
        libxext6:amd64 \
        libxfixes3:amd64 \
        libxi6:amd64 \
        libxrandr2:amd64 \
        libxrender1:amd64 \
        libxss1:amd64 \
        libxtst6:amd64 \
        lsb-release:amd64 \
        wget:amd64 \
        xdg-utils:amd64
