export function createDockerfile(containerPort: number) {
  return `FROM node:20-alpine
WORKDIR /workspace
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE ${containerPort}
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "${containerPort}"]
`;
}
