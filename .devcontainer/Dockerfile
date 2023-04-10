ARG VARIANT=bullseye
FROM --platform=linux/amd64 mcr.microsoft.com/vscode/devcontainers/base:0-${VARIANT}

ENV DENO_INSTALL=/deno
RUN mkdir -p /deno \
    && curl -fsSL https://deno.land/x/install/install.sh | sh \
    && chown -R vscode /deno
RUN curl -fsSL https://deb.nodesource.com/setup_19.x | bash - \
    && apt-get install -y nodejs
RUN corepack enable

USER vscode
# RUN curl -fsSL https://fnm.vercel.app/install | bash
RUN echo 'export DENO_INSTALL="/deno"' >> ~/.bashrc
RUN echo 'export PATH="$DENO_INSTALL/bin:$PATH"' >> ~/.bashrc
RUN corepack prepare pnpm@8.2.0 --activate

# RUN echo 'export PATH="/home/vscode/.local/share/fnm:$PATH"' >> ~/.bashrc
# RUN echo 'eval "`fnm env  --use-on-cd`"' >> ~/.bashrc
