const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const { pipeline } = require("@xenova/transformers");

let embedder = null;

// Load model 1 lần
async function loadModel() {
  if (!embedder) {
    console.log("Loading model...");
    embedder = await pipeline("feature-extraction", "Xenova/paraphrase-multilingual-MiniLM-L12-v2");
    console.log("Model loaded.");
  }
}

// Cosine similarity giữa hai vector sản phẩm
function cosineSimiliarityProducts(a, b) {
  let dot = 0;     // Tổng tích vô hướng (a · b)
  let normA = 0;   // Độ dài vector a
  let normB = 0;   // Độ dài vector b
  // Tính toán từng phần tử
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  // Lấy căn bậc hai để tính độ dài vector
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  // Nếu một trong hai vector có độ dài 0 thì similarity = 0
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (normA * normB);
}


function cosineSimilarityVectors(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}


// Tính độ tương đồng cosine giữa hai user
function cosineSimilarityUsers(userA, userB) {
  //Chỉ lấy các sản phẩm mà cả hai user đều đã đánh giá
  const commonProducts = Object.keys(userA).filter(p => userB[p] !== undefined);
  if (commonProducts.length === 0) return 0;
  //Lấy tích vô hướng chia cho tích độ dài
  let dot = 0, normA = 0, normB = 0;
  for (const p of commonProducts) {
    dot += userA[p] * userB[p];
    normA += userA[p] ** 2;
    normB += userB[p] ** 2;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Tạo embedding từ text
async function getEmbedding(text) {
  await loadModel();
  const result = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(result.data);
}


// Tạo embedding cho toàn bộ sản phẩm (có loại bỏ HTML)
exports.generateEmbeddings = async (req, res) => {
  try {
    await loadModel();

    const products = await Product.find();
    console.log("Tổng số sản phẩm lấy được:", products.length);

    const stripHtml = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

    for (const p of products) {
      // Làm sạch trường description vì trường này có thể chứa HTML
      const cleanDescription = p.description ? stripHtml(p.description) : "";
      console.log(cleanDescription);
      const text = `${p.name} ${cleanDescription} ${p.color?.join(" ") || ""} ${p.category || ""}`;

      const embedding = await getEmbedding(text);
      console.log("Embedding length:", embedding?.length || 0);
      console.log("Sample (first 5 numbers):", embedding?.slice(0, 5));

      const result = await Product.updateOne(
        { _id: p._id },
        { $set: { embedding } },
        { strict: false }
      );
      console.log("Cập nhật", p.name, result.modifiedCount ? "OK" : "Không ghi được");

    }

    res.json({ message: "Embeddings generated successfully." });
  } catch (err) {
    console.error("Error generating embeddings:", err);
    res.status(500).json({ message: err.message || "Error generating embeddings" });
  }
};

// Cập nhật embedding cho 1 sản phẩm (chạy khi thêm hoặc sửa sản phẩm)
exports.updateProductEmbedding = async (req, res) => {
  try {
    // Load mô hình (nếu chưa load)
    await loadModel();

    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    // Hàm loại bỏ HTML tags trong description của sản phẩm
    const stripHtml = (html) =>
      html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

    // Làm sạch mô tả
    const cleanDescription = product.description
      ? stripHtml(product.description)
      : "";

    // Ghép các thông tin mô tả thành 1 chuỗi text để sinh embedding
    const text = `${product.name} ${cleanDescription} ${product.color?.join(" ") || ""} ${product.category || ""}`;

    // Sinh embedding mới
    const embedding = await getEmbedding(text);

    console.log("Updating embedding for:", product.name);
    console.log("Embedding length:", embedding?.length || 0);
    console.log("Sample (first 5):", embedding?.slice(0, 5));

    // Cập nhật vào MongoDB
    await Product.updateOne(
      { _id: id },
      { $set: { embedding } },
      { strict: false }
    );

    res.json({
      message: "Product embedding updated successfully.",
      productId: id,
      embeddingLength: embedding?.length || 0,
    });
  } catch (err) {
    console.error("Error updating product embedding:", err);
    res
      .status(500)
      .json({ message: err.message || "Error updating product embedding" });
  }
};

/* ---------------------- COLLABORATIVE FILTERING ---------------------- */
// Item-Item Collaborative Filtering
// === BẮT ĐẦU SỬA ITEM-ITEM ===
const getItemCollaborativeRecommendations = async (userId) => {
  try {
    const allProducts = await Product.find({}, "_id name");
    const allProductIds = allProducts.map(p => p._id.toString());

    const orders = await Order.find().populate("products.product");
    const ratings = {}; // { userId: { productId: rating } }

    for (const order of orders) {
      const uId = order.user.toString();
      if (!ratings[uId]) ratings[uId] = {};
      for (const p of order.products) {
        const prodId = p.product._id.toString();
        ratings[uId][prodId] = p.rating ?? 0;
      }
    }

    // Bổ sung sản phẩm chưa có rating
    for (const uId of Object.keys(ratings)) {
      for (const prodId of allProductIds) {
        if (ratings[uId][prodId] === undefined) ratings[uId][prodId] = 0;
      }
    }

    // === TÍNH TRUNG BÌNH ĐIỂM CỦA TỪNG SẢN PHẨM (Item Mean) ===
    const itemMeans = {};
    for (const prodId of allProductIds) {
      let sum = 0, count = 0;
      for (const uId of Object.keys(ratings)) {
        if (ratings[uId][prodId] > 0) { // Chỉ tính nếu có rating thật
          sum += ratings[uId][prodId];
          count++;
        }
      }
      itemMeans[prodId] = count > 0 ? sum / count : 0;
    }

    // === HÀM TÍNH PEARSON CORRELATION GIỮA HAI SẢN PHẨM ===
    const pearsonItemSimilarity = (idA, idB) => {
      const users = Object.keys(ratings);
      let sumXY = 0, sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0;
      let count = 0;

      for (const u of users) {
        const rA = ratings[u][idA];
        const rB = ratings[u][idB];
        if (rA > 0 && rB > 0) { // Chỉ xét user đã rate cả 2
          const x = rA - itemMeans[idA];
          const y = rB - itemMeans[idB];
          sumXY += x * y;
          sumX += x;
          sumY += y;
          sumX2 += x * x;
          sumY2 += y * y;
          count++;
        }
      }

      if (count === 0) return 0;
      const numerator = sumXY - (sumX * sumY) / count;
      const denominator = Math.sqrt(sumX2 - (sumX * sumX) / count) * Math.sqrt(sumY2 - (sumY * sumY) / count);
      return denominator === 0 ? 0 : numerator / denominator;
    };

    // === TÍNH ĐỘ TƯƠNG ĐỒNG GIỮA CÁC SẢN PHẨM (Item-Item) DÙNG PEARSON ===
    const itemSims = {};
    for (let i = 0; i < allProductIds.length; i++) {
      const idA = allProductIds[i];
      itemSims[idA] = {};
      for (let j = 0; j < allProductIds.length; j++) {
        const idB = allProductIds[j];
        if (i === j) continue;
        const sim = pearsonItemSimilarity(idA, idB);
        itemSims[idA][idB] = sim;
      }
    }
    console.log("Item-Item Pearson Similarities computed.");

    // Lấy danh sách sản phẩm user đã đánh giá
    const userRatings = ratings[userId];
    if (!userRatings) return [];

    const ratedItems = Object.keys(userRatings).filter(pid => userRatings[pid] > 0);
    const predictedRatings = {};

    // Dự đoán rating cho sản phẩm chưa đánh giá
    for (const targetId of allProductIds) {
      if (ratedItems.includes(targetId)) continue;
      let numerator = 0, denominator = 0;

      for (const ratedId of ratedItems) {
        const sim = itemSims[targetId][ratedId] || itemSims[ratedId][targetId] || 0;
        if (sim !== 0) {
          numerator += sim * (userRatings[ratedId] - itemMeans[ratedId]);
          denominator += Math.abs(sim);
        }
      }
      if (denominator > 0) {
        predictedRatings[targetId] = itemMeans[targetId] + (numerator / denominator);
      }
    }

    // Lấy top 3 sản phẩm có predicted rating cao nhất
    const top3 = Object.entries(predictedRatings)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);

    const recommendedProducts = await Product.find({ _id: { $in: top3 } });
    console.log("Item-Item recommended products:", recommendedProducts.map(p => p._id + " " + p.name));
    return recommendedProducts;

  } catch (err) {
    console.error("getItemCollaborativeRecommendations error:", err);
    return [];
  }
};
// === KẾT THÚC SỬA ITEM-ITEM ===
//User-User Collaborative Filtering
async function getUserCollaborativeRecommendations(userId) {
  try {

    const userOrders = await Order.find({ user: userId });
    if (!userOrders || userOrders.length === 0) {
      //Nếu user chưa có đơn hàng nào -> trả về empty
      return [];
    }

    //Bước 1: Lấy tất cả sản phẩm trong hệ thống
    const allProducts = await Product.find({}, "_id");
    const allProductIds = allProducts.map(p => p._id.toString());
    console.log("Total products in system:", allProductIds.length);

    // Lấy toàn bộ đơn hàng (bao gồm cả đơn chưa rating)
    const orders = await Order.find().populate("products.product");
    const ratings = {};
    const actuallyRated = {};

    //Gán điểm rating thực tế (nếu có)
    for (const order of orders) {
      const uId = order.user.toString();
      if (!ratings[uId]) ratings[uId] = {};
      if (!actuallyRated[uId]) actuallyRated[uId] = new Set();
      for (const p of order.products) {
        const prodId = p.product._id.toString();
        if (p.rating !== undefined && p.rating !== null) {
          actuallyRated[uId].add(prodId);
        }
        ratings[uId][prodId] = p.rating ?? 0; // nếu chưa rating → mặc định = 0
      }
    }

    //Bổ sung sản phẩm mà user chưa mua → coi như rating = 0
    for (const uId of Object.keys(ratings)) {
      for (const prodId of allProductIds) {
        if (ratings[uId][prodId] === undefined) {
          ratings[uId][prodId] = 0;
        }
      }
    }

    console.log("Utility Matrix trước khi mean-centering:", ratings);
    // Tạo ma trận mean-centered (không thay đổi ratings gốc)
    const meanCenterRatings = {};
    for (const uId of Object.keys(ratings)) {
      const userRatings = Object.values(ratings[uId]);
      const mean =
        userRatings.reduce((a, b) => a + b, 0) / userRatings.length;
      meanCenterRatings[uId] = {};

      for (const prodId of Object.keys(ratings[uId])) {
        meanCenterRatings[uId][prodId] = ratings[uId][prodId] - mean;
      }
    }
    console.log("Mean-centered Utility Matrix:", meanCenterRatings);

    console.log("Users:", Object.keys(ratings).length, "Products:", allProductIds.length);
    console.log("Current user ID:", userId);
    console.log("Current user ratings:", ratings[userId]);

    //Bước 2: Tính độ tương đồng giữa user hiện tại và các user khác duea trên mean-centered ratings
    const similarities = [];
    for (const otherUserId of Object.keys(meanCenterRatings)) {
      if (otherUserId === userId) continue;
      const sim = cosineSimilarityUsers(meanCenterRatings[userId], meanCenterRatings[otherUserId]);
      similarities.push({ user: otherUserId, similarity: sim });
    }

    console.log("All similarities:", similarities);

    similarities.sort((a, b) => b.similarity - a.similarity);
    const topUsers = similarities.slice(0, 2); // chọn 2 user tương đồng nhất
    console.log("Top similar users:", topUsers);

    if (topUsers.length === 0)
      return res.json({ recommendations: [] });

    //Bước 3: Dự đoán rating của user cho từng sản phẩm
    //Tập các sản phẩm mà user thực sự đã đánh giá (từ actuallyRated)
    //Ta cần xác định các giá trị mà người dùng đã đánh giá thực sự để phân biệt với các giá trị mặc định thêm vào do bị thiếu dữ liệu
    const userRatedProducts = actuallyRated[userId] ? new Set(Array.from(actuallyRated[userId])) : new Set();
    const predictedRatings = {};
    console.log("Products actually rated by user:", userRatedProducts);

    for (const productId of allProductIds) {
      if (userRatedProducts.has(productId)) continue; // không cần dự đoán cho sản phẩm user đã đánh giá thực sự
      let numerator = 0, denominator = 0;

      for (const { user, similarity } of topUsers) {
        const rating = ratings[user][productId];
        if (rating !== undefined) {
          numerator += similarity * rating;
          denominator += Math.abs(similarity);
        }
      }

      if (denominator > 0)
        predictedRatings[productId] = numerator / denominator;
    }

    console.log("Predicted ratings:", predictedRatings);

    // Lấy 3 sản phẩm có rating dự đoán cao nhất
    const sortedPredictions = Object.entries(predictedRatings)
      .sort((a, b) => b[1] - a[1]) // sắp xếp giảm dần theo predicted rating
      .slice(0, 3); // lấy top 3

    // Lấy danh sách ID theo thứ tự rating giảm dần
    const top3Ids = sortedPredictions.map(([id]) => id);

    // Truy vấn MongoDB (thứ tự có thể bị lộn xộn)
    const recommendedProducts = await Product.find({ _id: { $in: top3Ids } });

    // Tạo map để khôi phục thứ tự đúng
    const productMap = {};
    for (const p of recommendedProducts) {
      productMap[p._id.toString()] = p;
    }

    // Sắp xếp lại danh sách sản phẩm theo thứ tự rating giảm dần
    const orderedProducts = top3Ids.map(id => productMap[id]).filter(Boolean);

    // Log kết quả để kiểm tra
    console.log(
      "Collaborative recommended products:",
      orderedProducts.map((p, i) => `${i + 1}. ${p._id}: ${p.name}`)
    );

    return orderedProducts.filter(Boolean);

  } catch (err) {
    console.error("getUserCollaborativeRecommendations error:", err);
    return [];
  }

}

/* ---------------------- THUẬT TOÁN CONTENT-BASED RECOMMENDATION ---------------------- */
async function getContentBasedRecommendations(userId) {
  // Lấy tất cả đơn hàng của user (có populate để lấy thông tin sản phẩm)
  const userOrders = await Order.find({ user: userId }).populate('products.product');
  const products = await Product.find({}, '_id name embedding');

  // Tạo danh sách các sản phẩm đã được user đánh giá (có embedding và có rating)
  // embedding chính là vector đặc trưng của sản phẩm item profile
  const ratedItems = [];
  for (const order of userOrders) {
    for (const p of order.products) {
      const prod = p.product;
      if (!prod?.embedding || !p.rating) continue;
      ratedItems.push({ embedding: prod.embedding, rating: Number(p.rating) });
    }
  }
  if (ratedItems.length === 0) return [];

  // Tính user profile vector dựa vào item profile và dòng rating của user đó với các sản phẩm
  const dim = ratedItems[0].embedding.length;  // chiều dài vector item profile của sản phẩm là 384
  const profile = new Array(dim).fill(0);
  let denom = 0;
  for (const { embedding, rating } of ratedItems) {
    denom += rating;
    for (let i = 0; i < dim; i++) profile[i] += rating * embedding[i];
  }
  // Mẫu số denominator là tổng rating
  for (let i = 0; i < dim; i++) profile[i] = profile[i] / denom;
  console.log("User profile vector:", profile.slice(0, 5), "...");
  // Tính cosine similarity giữa user profile và item vector tất cả sản phẩm
  const scores = [];
  for (const prod of products) {
    if (!prod.embedding) continue;
    const sim = cosineSimilarityVectors(profile, prod.embedding);
    scores.push({ id: prod._id.toString(), score: sim });
  }
  console.log("All product scores:", scores);
  // Lấy 3 sản phẩm có điểm số cao nhất
  const top3 = scores.sort((a, b) => b.score - a.score).slice(0, 3).map(s => s.id);
  const topProducts = await Product.find({ _id: { $in: top3 } });
  const ordered = top3.map(id => topProducts.find(p => p._id.toString() === id));
  console.log("Content-based recommended products:", ordered.map(p => p ? p.name : "Not found"));
  return ordered.filter(Boolean);
}


// Recommend theo sản phẩm (lọc dựa trên nội dung)
exports.recommendByProduct = async (req, res) => {
  try {
    await loadModel();
    const current = await Product.findById(req.params.id);
    if (!current?.embedding) {
      return res.status(404).json({ message: "No embedding for product" });
    }

    const products = await Product.find({ _id: { $ne: current._id }, embedding: { $exists: true } });

    const scored = products.map(p => ({
      product: p,
      score: cosineSimiliarityProducts(current.embedding, p.embedding),
    }));

    const top = scored.sort((a, b) => b.score - a.score).slice(0, 5).map(s => s.product);
    res.json({ recommendations: top });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating recommendations" });
  }
};

// Recommend theo user (ghép cả 2 thuật toán collaborative + content-based)
exports.recommendByUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Kiểm tra nếu user chưa có đơn hàng thì không thể recommend theo user
    const userOrders = await Order.find({ user: userId });
    if (!userOrders || userOrders.length === 0) {
      return res.json({ recommendations: [] });
    }


    // Kết hợp kết quả (6 sản phẩm collaborative + 3 sản phẩm content-based)
    // Nếu sản phẩm xuất hiện ở cả hai danh sách thì chỉ giữ lại một
    const collaborative = await getUserCollaborativeRecommendations(userId); // user-user CF
    const itemBased = await getItemCollaborativeRecommendations(userId); // item-item CF
    const contentBased = await getContentBasedRecommendations(userId);

    // Gộp kết quả, các sản phẩm trùng nhau thì giữ lại một
    const combined = new Map();
    [...collaborative, ...itemBased, ...contentBased].forEach(p =>
      combined.set(p._id.toString(), p)
    );

    console.log("Final recommended products:", Array.from(combined.values()).map(p => p._id + " " + p.name));

    // 🔹 Trả về cho client theo format yêu cầu
    res.json({ recommendations: Array.from(combined.values()) });

  } catch (err) {
    console.error("RecommendByUser error:", err);
    res.status(500).json({ message: err.message });
  }

};

