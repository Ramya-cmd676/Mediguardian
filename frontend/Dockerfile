FROM node:18-slim

WORKDIR /app

# Install Expo CLI globally
RUN npm install -g expo-cli

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Expo development ports
EXPOSE 19000 19001 19002

# Start Expo in LAN mode (more reliable than tunnel)
CMD ["npx", "expo", "start", "--lan"]
