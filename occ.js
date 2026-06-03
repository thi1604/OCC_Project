// occ.js
const MAX_RETRIES = 5; // Giới hạn tối đa 5 lần thử lại để chống tràn bộ nhớ

export async function likePostOCC(collection, postId) {
  let attempts = 0;
  let aborts = 0;

  while (attempts < MAX_RETRIES) {
    attempts++;
    
    // PHA 1: READ (Đọc dữ liệu snapshot cục bộ)
    const post = await collection.findOne({ _id: postId });
    if (!post) return { success: false, aborts, error: "Không tìm thấy bài viết" };
    
    const currentVersion = post.version;
    const newLikeCount = post.likeCount + 1;

    // Giả lập độ trễ mạng/xử lý cực nhỏ (từ 0 đến 5ms)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 5));

    // PHA 2 & 3: VALIDATION & WRITE (Gộp làm 1 hành động nguyên tử)
    const result = await collection.updateOne(
      { _id: postId, version: currentVersion }, // VALIDATION: Kiểm tra xem version có bị ai sửa mất chưa
      { 
        $set: { likeCount: newLikeCount, version: currentVersion + 1 } // WRITE: Cập nhật dữ liệu và tăng version
      }
    );

    // Kiểm tra kết quả cập nhật
    if (result.modifiedCount === 1) {
      return { success: true, aborts: aborts }; // Ghi thành công, thoát hàm ngay lập tức
    } 
    
    // Nếu modifiedCount === 0 nghĩa là đã xảy ra xung đột (Abort)
    aborts++;
    
    // Kỹ thuật Exponential Backoff: Thất bại càng nhiều, ngủ càng lâu để giãn cách luồng
    const delay = Math.pow(2, attempts) * 5 + Math.random() * 10;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Vượt quá 5 lần thử lại mà vẫn xung đột -> Hủy bỏ giao dịch hoàn toàn để cứu hệ thống
  return { success: false, aborts: aborts, error: "Hệ thống quá tải" };
}

export async function viewPostOCC(collection, postId) {
  // Hành động View chỉ đọc dữ liệu và tăng viewCount, không chỉnh sửa version nên không lo xung đột
  await collection.updateOne({ _id: postId }, { $inc: { viewCount: 1 } });
  return { success: true, aborts: 0 };
}