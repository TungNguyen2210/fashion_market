import { useState, useEffect, useRef } from "react";
import { SendOutlined, CloseOutlined, MessageOutlined, ShoppingOutlined } from '@ant-design/icons';
import { pipeline } from '@xenova/transformers';
import "./chatbot.css";

const Chatbot = () => {
  const [messages, setMessages] = useState([
    {
      message: "Xin chào! 👋 Tôi là trợ lý ảo của Stussy Store. Tôi có thể giúp bạn:\n\n• Tìm kiếm sản phẩm\n• Tư vấn màu sắc và size\n• Kiểm tra tình trạng hàng\n• Đề xuất sản phẩm phù hợp\n• Trả lời các câu hỏi về sản phẩm\n\nBạn cần hỗ trợ gì ạ?",
      sender: "bot",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [products, setProducts] = useState([]);
  const [embedder, setEmbedder] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const messagesEndRef = useRef(null);

  const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
  useEffect(() => {
    initializeEmbedder();
    fetchProducts();
  }, []);

  const initializeEmbedder = async () => {
    try {
      console.log("Loading Xenova model...");
      const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0');
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      const model = await pipeline(
        "feature-extraction",
        "Xenova/paraphrase-multilingual-MiniLM-L12-v2"
      );
      console.log("Model loaded successfully");
      setEmbedder(() => model);
    } catch (error) {
      console.error('Error loading embedder:', error);
      setEmbedder(null);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:3100/api/product');
      const data = await response.json();
      console.log(`Loaded ${data?.data?.length || 0} products`);
      setProducts(data?.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleChange = (event) => {
    setInput(event.target.value);
  };

  const getEmbedding = async (text) => {
    if (!embedder) return null;
    try {
      const output = await embedder(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    } catch (error) {
      console.error('Error getting embedding:', error);
      return null;
    }
  };

  function cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    if (normA === 0 || normB === 0) return 0;
    return dot / (normA * normB);
  }

  // Phân loại ý định người dùng
  const classifyIntent = async (userQuery) => {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { 
              role: "system", 
              content: `Phân loại ý định câu hỏi của người dùng. Trả về JSON với format:
{
  "intent": "product_search" | "product_question" | "general_chat" | "size_guide" | "price_inquiry" | "stock_check",
  "keywords": ["từ khóa 1", "từ khóa 2"],
  "needProductSearch": true/false
}

Giải thích intent:
- product_search: Tìm/xem/gợi ý sản phẩm (ví dụ: "tìm áo", "có váy gì")
- product_question: Hỏi về chi tiết sản phẩm cụ thể (màu sắc, chất liệu, kiểu dáng)
- size_guide: Hỏi về size, cách chọn size
- price_inquiry: Hỏi về giá, khuyến mãi
- stock_check: Hỏi còn hàng không
- general_chat: Chào hỏi, cảm ơn, tạm biệt, câu hỏi chung` 
            },
            { role: "user", content: userQuery }
          ],
          temperature: 0.3,
          max_tokens: 150
        })
      });
      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error('Error classifying intent:', error);
      return { intent: "product_search", keywords: [], needProductSearch: true };
    }
  };

  const findRelevantProducts = async (keywords) => {
    if (products.length === 0 || !embedder || keywords.length === 0) return [];
    
    const queryText = keywords.join(" ");
    const queryEmbedding = await getEmbedding(queryText);
    if (!queryEmbedding) return [];

    const productsWithScores = await Promise.all(
      products.map(async (product) => {
        const productText = `${product.name || ""} ${product.description || ""} ${product.category || ""}`;
        const embedding = await getEmbedding(productText);
        
        let similarity = 0;
        if (embedding) {
          similarity = cosineSimilarity(queryEmbedding, embedding);
        }
        
        // Boost similarity nếu keyword xuất hiện trong tên sản phẩm
        const nameMatch = keywords.some(kw => 
          product.name?.toLowerCase().includes(kw.toLowerCase())
        );
        if (nameMatch) similarity += 0.2;
        
        return { product, similarity };
      })
    );

    const filtered = productsWithScores
      .filter(p => p.similarity > 0.5)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
      .map(p => p.product);

    console.log("Found products:", filtered.length);
    return filtered;
  };

  const extractProductInfo = (product) => {
    const colorMap = {
      '#000000': 'Đen', '#ffffff': 'Trắng', '#ff0000': 'Đỏ',
      '#0000ff': 'Xanh dương', '#00ff00': 'Xanh lá', '#ffff00': 'Vàng',
      '#ff69b4': 'Hồng', '#ffc0cb': 'Hồng nhạt', '#808080': 'Xám',
      '#a52a2a': 'Nâu', '#800080': 'Tím', '#ffa500': 'Cam'
    };

    const availableColors = product.color?.map(c => colorMap[c.toLowerCase()] || c).filter(Boolean) || [];
    const availableSizes = product.sizes || [];
    const stockInfo = product.variants?.filter(v => v.quantity > 0) || [];
    const inStockSizes = [...new Set(stockInfo.map(v => v.size))];
    const inStockColors = [...new Set(stockInfo.map(v => colorMap[v.color.toLowerCase()] || v.color))];

    return {
      name: product.name,
      image: product.image,
      description: product.description,
      price: product.price,
      promotion: product.promotion,
      availableColors,
      availableSizes,
      inStockColors,
      inStockSizes,
      totalStock: stockInfo.reduce((sum, v) => sum + v.quantity, 0),
      url: `http://localhost:3500/product-detail/${product._id}`
    };
  };

  const formatProductCard = (productInfo) => {
    const hasPromotion = productInfo.promotion && productInfo.promotion < productInfo.price;
    let response = `<div style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 8px 0;">`;
    
    if (productInfo.image) {
      response += `<div style="display: flex; gap: 12px; align-items: flex-start;">`;
      response += `<img src="${productInfo.image}" alt="${productInfo.name}" style="width: 80px; height: 80px; min-width: 80px; object-fit: cover; border-radius: 8px; margin: 12px 0 12px 12px;" />`;
      response += `<div style="padding: 12px 12px 12px 0; flex: 1;">`;
    } else {
      response += `<div style="padding: 12px;">`;
    }
    
    response += `<strong style="font-size: 15px; font-weight: 600; color: #333; display: block; margin-bottom: 6px;">${productInfo.name}</strong>\n\n`;

    if (hasPromotion) {
      response += `💰 Giá: <del>${productInfo.price.toLocaleString('vi-VN')}đ</del> → <strong style="color: #ff4d4f; font-size: 16px;">${productInfo.promotion.toLocaleString('vi-VN')}đ</strong>\n`;
      const discount = Math.round((1 - productInfo.promotion / productInfo.price) * 100);
      response += `<span style="display: inline-block; background: linear-gradient(135deg, #ff6b6b 0%, #ff4d4f 100%); color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; margin: 2px 0;">🎉 Giảm ${discount}%!</span>\n\n`;
    } else {
      response += `💰 Giá: <strong>${productInfo.price.toLocaleString('vi-VN')}đ</strong>\n\n`;
    }

    if (productInfo.inStockColors.length > 0) {
      response += `🎨 Màu: ${productInfo.inStockColors.join(', ')}\n`;
    }

    if (productInfo.inStockSizes.length > 0) {
      response += `📏 Size: ${productInfo.inStockSizes.join(', ')}\n`;
    }

    if (productInfo.totalStock > 0) {
      response += `<span style="display: inline-block; padding: 3px 6px; border-radius: 4px; font-size: 12px; margin: 4px 0; background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f;">✅ Còn hàng</span>\n\n`;
    } else {
      response += `<span style="display: inline-block; padding: 3px 6px; border-radius: 4px; font-size: 12px; margin: 4px 0; background: #fff1f0; color: #ff4d4f; border: 1px solid #ffccc7;">❌ Hết hàng</span>\n\n`;
    }

    response += `<a href={${productInfo.url}} style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 13px; margin-top: 8px;">👉 Xem chi tiết</a>`;
    
    if (productInfo.image) {
      response += `</div></div>`;
    } else {
      response += `</div>`;
    }
    response += `</div>`;
    
    return response;
  };

  const getAIResponse = async (userMessage, intent, relevantProducts) => {
    const productContext = relevantProducts.length > 0 
      ? relevantProducts.map(p => {
          const info = extractProductInfo(p);
          return `- ${info.name}: ${info.price.toLocaleString('vi-VN')}đ${info.promotion ? ` (sale ${info.promotion.toLocaleString('vi-VN')}đ)` : ''}, màu ${info.availableColors.join('/')}, size ${info.availableSizes.join('/')}, ${info.totalStock > 0 ? 'còn hàng' : 'hết hàng'}. Mô tả: ${info.description || 'Không có'}`;
        }).join('\n')
      : 'Không tìm thấy sản phẩm phù hợp';

    const systemPrompt = `Bạn là trợ lý bán hàng thân thiện và chuyên nghiệp của Stussy Store.

TÍNH CÁCH:
- Nhiệt tình, thân thiện, lịch sự
- Trả lời ngắn gọn, súc tích (2-4 câu)
- Sử dụng emoji phù hợp
- Tập trung vào giải quyết nhu cầu khách hàng

QUY TẮC:
1. Dựa vào ý định: ${intent}
2. CHỈ trả lời dựa trên thông tin sản phẩm có sẵn
3. KHÔNG bịa đặt về giá, khuyến mãi, chính sách
4. Nếu không biết → nói thẳng "Hiện tại tôi chưa có thông tin về..."
5. Khuyến khích khách đặt câu hỏi cụ thể hơn

THÔNG TIN SẢN PHẨM:
${productContext}

LỊCH SỬ HỘI THOẠI:
${conversationHistory.slice(-4).map(h => `${h.role === 'user' ? 'Khách' : 'Bạn'}: ${h.content}`).join('\n')}`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ],
          temperature: 0.7,
          max_tokens: 300
        })
      });

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling AI:', error);
      return null;
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!input.trim()) return;

    const userQuery = input.trim();
    const newMessage = {
      message: userQuery,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setConversationHistory(prev => [...prev, { role: 'user', content: userQuery }]);
    setInput('');
    setIsTyping(true);

    try {
      // Phân loại ý định
      const intentData = await classifyIntent(userQuery);
      console.log("Intent:", intentData);

      // Tìm sản phẩm nếu cần
      let relevantProducts = [];
      if (intentData.needProductSearch) {
        relevantProducts = await findRelevantProducts(intentData.keywords);
      }

      // Lấy câu trả lời từ AI
      const aiResponse = await getAIResponse(userQuery, intentData.intent, relevantProducts);

      if (aiResponse) {
        setMessages(prev => [...prev, {
          message: aiResponse,
          sender: "bot",
          timestamp: new Date()
        }]);
        setConversationHistory(prev => [...prev, { role: 'assistant', content: aiResponse }]);
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      // Hiển thị sản phẩm nếu có
      if (relevantProducts.length > 0 && intentData.intent === 'product_search') {
        for (const product of relevantProducts.slice(0, 2)) {
          const productInfo = extractProductInfo(product);
          const formattedCard = formatProductCard(productInfo);

          setMessages(prev => [...prev, {
            message: formattedCard,
            sender: "bot",
            timestamp: new Date(),
            isProduct: true
          }]);
          await new Promise(resolve => setTimeout(resolve, 400));
        }
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        message: "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại! 🙏",
        sender: "bot",
        timestamp: new Date()
      }]);
    }

    setIsTyping(false);
  };

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      handleSend(event);
    }
  };

  const quickReplies = [
    "Áo hoodie nam",
    "Sản phẩm sale",
    "Size nào vừa người 65kg?",
    "Có áo màu đen không?"
  ];

  const handleQuickReply = (reply) => {
    setInput(reply);
  };

  const renderMessageContent = (message) => {
    const linkRegex = /<a href=\{([^}]+)\}([^>]*?)>([^<]+)<\/a>/g;
    const processedMessage = message.replace(linkRegex, (match, url, attrs, text) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer"${attrs}>${text}</a>`;
    });
    return { __html: processedMessage };
  };

  return (
    <>
      {!isOpen && (
        <div className="chatbot-button" onClick={toggleChatbot}>
          <MessageOutlined />
          <span className="chatbot-badge">1</span>
        </div>
      )}

      {isOpen && (
        <div className="chatbot-container">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <ShoppingOutlined className="chatbot-icon" />
              <div>
                <h4>Stussy Assistant</h4>
                <span className="chatbot-status">
                  <span className="status-dot"></span>
                  {embedder ? 'Online' : 'Đang tải...'}
                </span>
              </div>
            </div>
            <CloseOutlined className="close-button" onClick={toggleChatbot} />
          </div>

          <div className="chatbot-messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message ${message.sender === "bot" ? "bot-message" : "user-message"} ${message.isProduct ? "product-message" : ""}`}
              >
                <div className="message-content">
                  <div 
                    className="message-text" 
                    dangerouslySetInnerHTML={renderMessageContent(message.message)}
                  />
                  <div className="message-time">
                    {message.timestamp.toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="message bot-message">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && (
            <div className="quick-replies">
              {quickReplies.map((reply, index) => (
                <button
                  key={index}
                  className="quick-reply-btn"
                  onClick={() => handleQuickReply(reply)}
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          <div className="chatbot-input">
            <input
              type="text"
              placeholder="Nhập câu hỏi..."
              value={input}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              disabled={!embedder}
            />
            <button
              className="send-button"
              onClick={handleSend}
              disabled={!input.trim() || !embedder}
            >
              <SendOutlined />
            </button>
          </div>

          <div className="chatbot-footer">
            Powered by Stussy AI
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;