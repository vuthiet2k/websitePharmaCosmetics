#!/usr/bin/env bash
# Script khởi tạo môi trường Python cho PHARMA COSMETICS LOCAL AI
set -e

echo "=== ĐANG KHỞI TẠO MÔI TRƯỜNG PHARMA COSMETIC AI ==="

if ! command -v python3 &> /dev/null; then
    echo "[LỖI] Chưa cài đặt Python3. Vui lòng cài đặt Python 3.10+."
    exit 1
fi

if [ ! -d "venv" ]; then
    echo "1. Tạo môi trường ảo virtualenv (venv)..."
    python3 -m venv venv
fi

echo "2. Kích hoạt môi trường ảo..."
source venv/bin/activate

echo "3. Cài đặt các thư viện cần thiết..."
pip install --upgrade pip
pip install -r requirements.txt

echo "=== HOÀN TẤT CÀI ĐẶT MÔI TRƯỜNG! ==="
echo "Khởi động server bằng lệnh: bash scripts/run_local.sh"

