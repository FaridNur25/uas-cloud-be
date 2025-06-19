# Gunakan image Node.js
FROM node:18-alpine

# Install dependencies yang diperlukan
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Buat direktori kerja
WORKDIR /app

# Salin file package.json dan install dependency
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Buat direktori uploads
RUN mkdir -p uploads

# Salin semua file ke container
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Port default Cloud Run
EXPOSE 8080

# Jalankan server
CMD ["node", "index.js"]