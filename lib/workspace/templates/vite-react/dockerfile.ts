export function createDockerfile(containerPort: number) {
  return `FROM node:20-alpine
WORKDIR /workspace
COPY package*.json ./
RUN npm install
COPY . .
RUN chmod +x .appdesigner/runtime/*.sh
ENV PORT=${containerPort}
EXPOSE ${containerPort}
CMD ["sh", "./.appdesigner/runtime/container-entrypoint.sh"]
`;
}
