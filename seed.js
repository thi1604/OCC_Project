// seed.js
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const client = new MongoClient(process.env.MONGO_URL);
  try {
    await client.connect();
    const db = client.db('occ-project');
    const collection = db.collection('post_stats');

    // 1. Dọn dẹp dữ liệu cũ
    await collection.deleteMany({});

    // 2. Tạo một bài viết thử nghiệm gốc
    await collection.insertOne({
      _id: "post_hot_1",
      likeCount: 0,
      viewCount: 0,
      version: 1,      // Dùng cho thuật toán OCC
      isLocked: false  // Dùng cho thuật toán Locking
    });

    console.log("👉 Đã khởi tạo dữ liệu mẫu thành công!");
  } finally {
    await client.close();
  }
}
run();