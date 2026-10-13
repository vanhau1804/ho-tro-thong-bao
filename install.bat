@echo off
setlocal
echo === Cai dat Theo doi hoc tap ===

docker version >nul 2>&1
if errorlevel 1 (
  echo Docker chua chay. Hay mo Docker Desktop, doi no san sang roi chay lai file nay.
  pause
  exit /b 1
)

rem Xoa container cu neu co (du lieu van duoc giu trong volume)
docker rm -f theo-doi-hoc-tap >nul 2>&1

echo Dang build image...
docker build -t theo-doi-hoc-tap .
if errorlevel 1 (
  echo Build loi. Chep noi dung loi o tren gui cho nguoi cai dat.
  pause
  exit /b 1
)

echo Dang chay ung dung...
docker run -d --name theo-doi-hoc-tap -p 8787:8787 -v theo-doi-hoc-tap-data:/app/data --restart unless-stopped theo-doi-hoc-tap
if errorlevel 1 (
  echo Chay loi. Chep noi dung loi o tren gui cho nguoi cai dat.
  pause
  exit /b 1
)

echo.
echo Da cai xong. Dang mo http://localhost:8787 tren trinh duyet.
start http://localhost:8787
pause
