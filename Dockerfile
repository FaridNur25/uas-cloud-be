# Gunakan image Node.js
FROM node:18

# Install Cloud SQL Proxy
RUN curl -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 \
    && chmod +x cloud_sql_proxy \
    && mv cloud_sql_proxy /usr/local/bin/

# Buat direktori kerja
WORKDIR /app

# Copy package files dan install dependencies
COPY package*.json ./
RUN npm install

# Buat direktori uploads
RUN mkdir -p uploads && chmod 755 uploads

# Copy semua file
COPY . .

# Create startup script
RUN echo '#!/bin/bash\n\
# Start Cloud SQL Proxy in background jika menggunakan proxy\n\
if [ -n "$INSTANCE_CONNECTION_NAME" ]; then\n\
  echo "Starting Cloud SQL Proxy..."\n\
  cloud_sql_proxy -instances=$INSTANCE_CONNECTION_NAME=tcp:5432 &\n\
  sleep 5\n\
fi\n\
\n\
# Start the Node.js application\n\
exec node index.js' > /app/start.sh \
    && chmod +x /app/start.sh

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Run the startup script
CMD ["/app/start.sh"]