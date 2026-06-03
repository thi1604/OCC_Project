// simulation.js
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { likePostOCC, viewPostOCC } from './occ.js';
import { likePostLocking, viewPostLocking } from './locking.js';
dotenv.config();

const POST_ID = "post_hot_1";
const TOTAL_REQUESTS = 1000; // Giả lập 1000 thao tác cùng ập vào

async function runSimulation(type, env) {
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  const collection = client.db('occ-project').collection('post_stats');

  
  // RESET dữ liệu bài viết về trạng thái ban đầu trước mỗi lượt test để đảm bảo công bằng
  await collection.updateOne(
    { _id: POST_ID },
    { $set: { likeCount: 0, viewCount: 0, version: 1, isLocked: false } }
  );

  // Cấu hình tỷ lệ: Môi trường Read-Heavy chỉ có 5% Like, Write-Heavy có tới 90% Like
  let likeRatio = env === 'Read-Heavy' ? 0.05 : 0.90;
  let tasks = [];

  // Tạo ra danh sách 1000 tác vụ ngẫu nhiên dựa trên tỷ lệ cấu hình
  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    const isLike = Math.random() < likeRatio; // Vòng quay may mắn quyết định hành động
    if (type === 'OCC') {
      tasks.push(isLike ? likePostOCC(collection, POST_ID) : viewPostOCC(collection, POST_ID));
    } else {
      tasks.push(isLike ? likePostLocking(collection, POST_ID) : viewPostLocking(collection, POST_ID));
    }
  }

  // BẤM GIỜ VÀ KÍCH HOẠT ĐỒNG THỜI
  const start = Date.now();
  const results = await Promise.all(tasks); // 1000 request cùng "bắn" vào MongoDB Atlas
  const duration = Date.now() - start;

  // TỔNG HỢP SỐ LIỆU (METRICS)
  const totalAborts = results.reduce((acc, cur) => acc + cur.aborts, 0);
  const totalSuccess = results.filter(r => r.success).length;

  console.log(`[${type} - ${env}]`);
  console.log(`   + Thời gian hoàn thành: ${duration} ms`);
  console.log(`   + Tổng số lần Abort/Retry: ${totalAborts}`);
  console.log(`   + Số request thành công: ${totalSuccess}/${TOTAL_REQUESTS}\n`);

  await client.close();
}

async function main() {
  console.log("🚀 BẮT ĐẦU CHẠY GIẢ LẬP ĐỒ ÁN...\n");

  console.log("=== THỬ NGHIỆM 1: MÔI TRƯỜNG READ-HEAVY (ÍT XUNG ĐỘT) ===");
  await runSimulation('OCC', 'Read-Heavy');
  await runSimulation('Locking', 'Read-Heavy');

  console.log("=== THỬ NGHIỆM 2: MÔI TRƯỜNG WRITE-HEAVY (XUNG ĐỘT CAO) ===");
  await runSimulation('OCC', 'Write-Heavy');
  await runSimulation('Locking', 'Write-Heavy');
}

main();