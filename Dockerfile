# Use Node.js LTS version
FROM node:20-slim

# Install system dependencies for Baileys/Sharp (if needed later)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy app source
COPY . .

# Start the bot
CMD [ "npm", "start" ]
