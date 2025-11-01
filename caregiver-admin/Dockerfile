FROM node:18-slim

WORKDIR /app

# Copy package files and install (include dev deps for vite dev server)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
