// locking.js

// Khởi tạo hàng đợi bằng mảng và cờ trạng thái worker
const likeQueue = [];
let isProcessing = false;

// Hàm Worker: Có nhiệm vụ "gánh" việc xử lý tuần tự từng request trong hàng đợi
async function processQueue(collection) {
  // Nếu worker đang bận làm việc hoặc hàng đợi hết người -> nghỉ ngơi
  if (isProcessing || likeQueue.length === 0) return;

  // Bật cờ bận rộn
  isProcessing = true;

  // Lấy request đầu hàng ra xử lý (FIFO - First In First Out)
  const { postId, resolve } = likeQueue.shift();

  try {
    // VÙNG AN TOÀN (Critical Section): Chỉ duy nhất 1 request được chạy đoạn này tại 1 thời điểm
    const post = await collection.findOne({ _id: postId });
    const newLikeCount = post.likeCount + 1;

    // Giả lập độ trễ mạng cực nhỏ
    await new Promise(resolveTimeout => setTimeout(resolveTimeout, Math.random() * 2));

    // Ghi dữ liệu xuống DB (Không cần cờ isLocked nữa vì tầng Node đã bao thầu tuần tự)
    await collection.updateOne(
      { _id: postId },
      { $set: { likeCount: newLikeCount } }
    );

    // Báo kết quả về cho request đó thành công
    resolve({ success: true, aborts: 0 });

  } catch (error) {
    resolve({ success: false, aborts: 0, error: error.message });
  } finally {
    // Làm xong thì hạ cờ bận xuống và tự động gọi xử lý request tiếp theo
    isProcessing = false;
    processQueue(collection);
  }
}

// Hàm chính được bên ngoài gọi vào
export function likePostLocking(collection, postId) {
  // Trả về một Promise "treo", chỉ hoàn thành khi Worker xử lý xong lượt của nó
  return new Promise((resolve) => {
    // Đẩy thông tin request và cổng nhận kết quả (resolve) vào hàng đợi
    likeQueue.push({ postId, resolve });
    
    // Kích hoạt worker kiểm tra hàng đợi
    processQueue(collection);
  });
}

export async function viewPostLocking(collection, postId) {
  await collection.updateOne({ _id: postId }, { $inc: { viewCount: 1 } });
  return { success: true, aborts: 0 };
}