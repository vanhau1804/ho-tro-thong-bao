FROM node:18-alpine

WORKDIR /app

# Ứng dụng không có thư viện bên ngoài nên chỉ cần copy mã nguồn
COPY package.json server.js ./
COPY public ./public

# Dữ liệu và token bot được lưu ở đây, mount volume để không mất khi cập nhật
ENV DATA_DIR=/app/data
ENV PORT=8787
VOLUME ["/app/data"]

EXPOSE 8787

CMD ["node", "server.js"]
