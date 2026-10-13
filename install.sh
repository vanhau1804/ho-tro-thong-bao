#!/bin/sh
# Cài đặt Theo dõi học tập trên máy Linux / Pi Desktop (cần Docker)
set -e
echo "=== Cài đặt Theo dõi học tập ==="

if ! docker info >/dev/null 2>&1; then
  echo "Docker chưa chạy. Hãy bật Docker rồi chạy lại: sh install.sh"
  exit 1
fi

# Xoá container cũ nếu có (dữ liệu vẫn được giữ trong volume)
docker rm -f theo-doi-hoc-tap >/dev/null 2>&1 || true

echo "Đang build image..."
docker build -t theo-doi-hoc-tap .

echo "Đang chạy ứng dụng..."
docker run -d --name theo-doi-hoc-tap -p 8787:8787 -v theo-doi-hoc-tap-data:/app/data --restart unless-stopped theo-doi-hoc-tap

echo ""
echo "Đã cài xong. Mở trình duyệt vào http://localhost:8787"
