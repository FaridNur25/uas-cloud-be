# Gunakan image Node.js
FROM node:18

# Buat direktori kerja
WORKDIR /app

# Salin file package.json dan install dependency
COPY package*.json ./
RUN npm install

# Salin semua file ke container
COPY . .

# Port default Cloud Run
EXPOSE 8080

# Jalankan server
CMD ["node", "index.js"]
