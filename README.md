# Theo dõi học tập

Ứng dụng giúp phụ huynh theo dõi thời khoá biểu, việc học và đồ dùng cần mang của con. Ứng dụng nhắc việc qua Telegram mỗi ngày.

## Yêu cầu
- Docker (Docker Desktop hoặc Docker Engine), chạy cùng Pi Desktop.
- Một tài khoản Telegram để tạo bot nhắc việc.

## Chạy bằng Docker (khuyên dùng)
1. Mở terminal trong thư mục ứng dụng và chạy:
   ```
   docker build -t theo-doi-hoc-tap .
   docker run -d --name theo-doi-hoc-tap -p 8787:8787 -v theo-doi-hoc-tap-data:/app/data --restart unless-stopped theo-doi-hoc-tap
   ```
2. Mở trình duyệt vào `http://localhost:8787`.
3. Dữ liệu được giữ trong volume `theo-doi-hoc-tap-data`, nên khi chạy lại hoặc cập nhật ứng dụng vẫn còn.

## Chạy không dùng Docker
Cần Node.js 18 trở lên. Chạy `npm start` trong thư mục ứng dụng.

## Cài đặt và chạy
1. Giải nén thư mục này.
2. Mở terminal trong thư mục vừa giải nén và chạy:
   ```
   npm start
   ```
3. Mở trình duyệt vào `http://localhost:8787`.

Ứng dụng không cần cài thêm thư viện nào, không cần kết nối máy chủ bên ngoài.

## Kết nối Telegram
1. Trong Telegram, mở `@BotFather`, gửi `/newbot`, đặt tên và lấy token bot.
2. Vào tab **Hồ sơ**, dán token vào ô "Token bot", bấm **Lưu token**.
3. Phụ huynh mở bot vừa tạo trong Telegram và bấm **Start**.
4. Quay lại ứng dụng, bấm **Lấy mã kết nối**, rồi bấm **Gửi thử** để kiểm tra.

Đến giờ nhắc đã cài (mặc định 19:00), ứng dụng gửi một tin gồm việc còn lại hôm nay, tiết học ngày mai, đồ dùng cần chuẩn bị và việc hạn ngày mai.

## Lưu ý
- Máy đang chạy ứng dụng phải bật thì mới gửi được nhắc việc.
- Dữ liệu và token bot được lưu trong file `data.json` trên máy này. Không chia sẻ file này cho người khác.

## Cấu trúc thư mục
- `server.js`: máy chủ nhỏ chạy trên máy, lưu dữ liệu và gửi nhắc việc.
- `public/index.html`: giao diện ứng dụng.
- `package.json`: thông tin và lệnh chạy.
