# Distributed Concurrency Control: OCC vs. App-Level Pessimistic Queue

Hệ thống thực nghiệm và so sánh hiệu năng giữa **OCC (Versioning)** và **Application-Level Pessimistic Queue** trên mô hình dữ liệu tập trung (Hotspot Record) kết nối **MongoDB Atlas**, dựa theo lý thuyết của giáo sư **M. Tamer Özsu & Patrick Valduriez**.

---

## Kiến trúc Hệ thống (3-Node Topology)
* **Node A (Client Emulator):** Giả lập đa luồng sinh 1,000 requests đồng thời.
* **Node B (App Server):** Lớp middleware xử lý thuật toán kiểm soát đồng thời (RAM Queue / OCC).
* **Node C (Storage Node):** Cụm cơ sở dữ liệu đám mây **MongoDB Atlas Replica Set**.

---

## Kịch bản Kiểm thử
* **Read-Heavy (5% Ghi / 95% Đọc):** Xung đột thấp ($P(\text{Conflict}) \rightarrow 0$).
* **Write-Heavy (90% Ghi / 10% Đọc):** Xung đột cực cao ($P(\text{Conflict}) \rightarrow 1$) tập trung vào 1 bản ghi duy nhất.

---

## Cài đặt nhanh

1. **Cài đặt thư viện phụ thuộc:**
   npm install

2. **Khởi tạo dữ liệu mẫu**
  node seed.js

3. **Chạy kiểm thử hiệu năng giữa 2 thuật toán OCC và Locking**
  node simulation.js
