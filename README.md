# Theo dõi học tập

Ứng dụng giúp phụ huynh theo dõi thời khoá biểu, việc học, việc hằng ngày và thói quen của con. Ứng dụng nhắc việc qua Telegram.

## Cài đặt nhanh

Cần cài sẵn **Docker** (Docker Desktop trên Windows, Docker Engine trên Linux / Pi Desktop).

- **Windows:** nhấp đúp file `install.bat`.
- **Linux / Pi Desktop:** mở terminal trong thư mục này và chạy `sh install.sh`.

Khi cài xong, mở trình duyệt vào **http://localhost:8787**.

Không cần cài Node.js hay thư viện nào khác.

## Cài đặt thủ công bằng Docker

```
docker build -t theo-doi-hoc-tap .
docker run -d --name theo-doi-hoc-tap -p 8787:8787 -v theo-doi-hoc-tap-data:/app/data --restart unless-stopped theo-doi-hoc-tap
```

Dữ liệu được giữ trong volume `theo-doi-hoc-tap-data`, nên khi cập nhật hoặc chạy lại ứng dụng dữ liệu vẫn còn.

Các lệnh hay dùng:
```
docker stop theo-doi-hoc-tap        # tắt
docker start theo-doi-hoc-tap       # bật lại
docker logs -f theo-doi-hoc-tap     # xem nhật ký
```

## Cập nhật phiên bản mới

Chạy lại `install.bat` (Windows) hoặc `sh install.sh` (Linux). Script sẽ build lại và chạy phiên bản mới; dữ liệu cũ vẫn được giữ.

## Kết nối Telegram (không bắt buộc)

1. Trong Telegram, mở `@BotFather`, gửi `/newbot`, đặt tên và lấy token bot.
2. Trong ứng dụng, ở cuối tab **Việc của tôi**, dán token vào ô token rồi bấm **Lưu token**.
3. Phụ huynh mở bot vừa tạo trong Telegram và bấm **Start**.
4. Quay lại ứng dụng, bấm **Lấy mã kết nối**, rồi bấm **Gửi thử** để kiểm tra.

Đến giờ nhắc đã cài (mặc định 19:00), ứng dụng gửi một tin gồm việc còn lại hôm nay, tiết học ngày mai, đồ dùng cần chuẩn bị và việc hạn ngày mai. Việc sắp đến hạn trong 60 phút tới cũng được báo riêng.

## Lưu ý

- Máy đang chạy ứng dụng phải bật thì mới gửi được nhắc việc qua Telegram.
- Dữ liệu và token bot được lưu trong volume Docker trên máy này. Không chia sẻ dữ liệu này cho người khác.

## Cấu trúc thư mục

- `server.js`: máy chủ nhỏ, lưu dữ liệu và gửi nhắc việc.
- `public/index.html`: giao diện ứng dụng.
- `Dockerfile`, `.dockerignore`: cấu hình đóng gói Docker.
- `install.bat`, `install.sh`: script cài đặt tự động.
- `package.json`: thông tin và lệnh chạy không dùng Docker (`npm start`, cần Node.js 18 trở lên).
