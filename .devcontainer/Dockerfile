FROM node:24

# Instalar gh CLI via repositorio APT oficial de GitHub.
# La instalación se realiza durante el build de la imagen (como root),
# de forma que el contenedor arranca y opera siempre como el usuario node.
RUN apt-get update && \
    apt-get install -y curl gpg nano && \
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
        | gpg --dearmor -o /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
        | tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && \
    apt-get install -y gh && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Instalar pnpm globalmente y preparar el directorio de store bajo el home
# del usuario node, para que pnpm pueda escribir sin necesitar permisos de root.
ENV PNPM_HOME=/home/node/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN npm install -g pnpm && \
    mkdir -p /home/node/.local/share/pnpm && \
    chown -R node:node /home/node/.local

USER node
