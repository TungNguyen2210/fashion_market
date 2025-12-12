import React, { useState, useEffect, useRef } from "react";
import { SendOutlined, CloseOutlined, MessageOutlined, ShoppingOutlined } from '@ant-design/icons';
import { pipeline } from '@xenova/transformers';
import "./chatbot.css";

const Chatbot = () => {
  const [messages, setMessages] = useState([
    {
      message: "Xin chào! 👋 Tôi là trợ lý ảo của Stussy Store. Tôi có thể giúp bạn:\n\n• Tìm kiếm sản phẩm\n• Tư vấn màu sắc và size\n• Kiểm tra tình trạng hàng\n• Đề xuất sản phẩm phù hợp\n\nBạn cần hỗ trợ gì ạ?",
      sender: "bot",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [products, setProducts] = useState([]);
  const [embedder, setEmbedder] = useState(null);
  const messagesEndRef = useRef(null);

  const OPENAI_API_KEY = '';
  useEffect(() => {
    initializeEmbedder();
    fetchProducts();
  }, []);

  const initializeEmbedder = async () => {
    try {
      console.log("Loading Xenova model...");
      const model = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');
      setEmbedder(model);
      console.log("Model loaded successfully");
    } catch (error) {
      console.error('Error loading embedder:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:3100/api/products'); 
      const data = await response.json();
      console.log(`Loaded ${data.length} products`);
      setProducts(data);
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

  const cosineSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  };

  const findRelevantProducts = async (userQuery) => {
    if (products.length === 0 || !embedder) return [];

    const queryEmbedding = await getEmbedding(userQuery);
    if (!queryEmbedding) return [];

    const productsWithScores = products.map(product => {
      let similarity = 0;

      if (product.embedding && Array.isArray(product.embedding) && product.embedding.length > 0) {
        similarity = cosineSimilarity(queryEmbedding, product.embedding);
      } else {
        const keywords = userQuery.toLowerCase().split(' ');
        const productText = `${product.name} ${product.description || ''} ${product.color?.join(' ') || ''} ${product.sizes?.join(' ') || ''}`.toLowerCase();
        const keywordMatches = keywords.filter(kw => productText.includes(kw)).length;
        similarity = keywordMatches / keywords.length * 0.4;
      }

      return { ...product, similarity };
    });

    const filtered = productsWithScores.filter(p => p.similarity > 0.2);
    console.log("Top matching products:", filtered.slice(0, 3).map(p => ({ name: p.name, score: p.similarity })));

    return filtered.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
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
      price: product.price,
      promotion: product.promotion,
      availableColors,
      availableSizes,
      inStockColors,
      inStockSizes,
      totalStock: stockInfo.reduce((sum, v) => sum + v.quantity, 0),
      url: `http://localhost:3000/product/${product._id}`
    };
  };

  const formatProductResponse = (productInfo) => {
    const hasPromotion = productInfo.promotion && productInfo.promotion < productInfo.price;
    let response = `🛍️ **${productInfo.name}**\n\n`;
    
    if (hasPromotion) {
      response += `💰 Giá: ~~${productInfo.price.toLocaleString('vi-VN')}đ~~ → **${productInfo.promotion.toLocaleString('vi-VN')}đ**\n`;
      const discount = Math.round((1 - productInfo.promotion / productInfo.price) * 100);
      response += `🎉 Giảm ${discount}%!\n\n`;
    } else {
      response += `💰 Giá: ${productInfo.price.toLocaleString('vi-VN')}đ\n\n`;
    }

    if (productInfo.inStockColors.length > 0) {
      response += `🎨 Màu còn hàng: ${productInfo.inStockColors.join(', ')}\n`;
    } else if (productInfo.availableColors.length > 0) {
      response += `🎨 Màu sắc: ${productInfo.availableColors.join(', ')}\n`;
    }

    if (productInfo.inStockSizes.length > 0) {
      response += `📏 Size còn hàng: ${productInfo.inStockSizes.join(', ')}\n`;
    } else if (productInfo.availableSizes.length > 0) {
      response += `📏 Size: ${productInfo.availableSizes.join(', ')}\n`;
    }

    if (productInfo.totalStock > 0) {
      response += `✅ Còn ${productInfo.totalStock} sản phẩm\n\n`;
    } else {
      response += `❌ Tạm hết hàng\n\n`;
    }

    response += `👉 Xem chi tiết: ${productInfo.url}`;
    return response;
  };

  const getChatGPTResponse = async (userMessage, relevantProducts) => {
    const systemPrompt = `Bạn là trợ lý bán hàng thông minh của Stussy Store. 

QUY TẮC BẮT BUỘC:
1. CHỈ trả lời dựa trên thông tin sản phẩm được cung cấp
2. KHÔNG bịa đặt về: khuyến mãi, chính sách đổi trả, phí ship, thời gian giao hàng
3. Nếu không có thông tin → nói thẳng "Hiện tại tôi không có thông tin về..."
4. Trả lời CỰC KỲ ngắn gọn (1-2 câu), tập trung vào sản phẩm

${relevantProducts.length > 0 ? `Sản phẩm có trong hệ thống:
${relevantProducts.map(p => {
  const info = extractProductInfo(p);
  return `- ${info.name}: ${info.price.toLocaleString('vi-VN')}đ${info.promotion ? ` (giảm còn ${info.promotion.toLocaleString('vi-VN')}đ)` : ''}, màu ${info.availableColors.join('/')}, size ${info.availableSizes.join('/')}, còn ${info.totalStock} sản phẩm`;
}).join('\n')}

Giới thiệu ngắn gọn sản phẩm phù hợp nhất.` : 'Không tìm thấy sản phẩm. Hỏi khách mô tả rõ hơn.'}`;

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
          temperature: 0.5,
          max_tokens: 200
        })
      });

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling ChatGPT:', error);
      return null;
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!input.trim()) return;

    const newMessage = {
      message: input,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    const userQuery = input;
    setInput('');
    setIsTyping(true);

    try {
      const lowerQuery = userQuery.toLowerCase();
      const greetings = ['xin chào', 'chào', 'hello', 'hi', 'hey', 'chao'];
      const thanks = ['cảm ơn', 'cám ơn', 'thank', 'thanks', 'cam on'];
      const goodbye = ['tạm biệt', 'bye', 'goodbye', 'bb', 'tam biet'];

      if (greetings.some(g => lowerQuery.includes(g))) {
        setMessages(prev => [...prev, {
          message: "Chào bạn! 😊 Tôi có thể giúp bạn tìm sản phẩm gì hôm nay?",
          sender: "bot",
          timestamp: new Date()
        }]);
        setIsTyping(false);
        return;
      }

      if (thanks.some(t => lowerQuery.includes(t))) {
        setMessages(prev => [...prev, {
          message: "Rất vui được hỗ trợ bạn! 🤗 Chúc bạn mua sắm vui vẻ!",
          sender: "bot",
          timestamp: new Date()
        }]);
        setIsTyping(false);
        return;
      }

      if (goodbye.some(g => lowerQuery.includes(g))) {
        setMessages(prev => [...prev, {
          message: "Tạm biệt! 👋 Hẹn gặp lại bạn!",
          sender: "bot",
          timestamp: new Date()
        }]);
        setIsTyping(false);
        return;
      }

      const relevantProducts = await findRelevantProducts(userQuery);

      if (relevantProducts.length > 0) {
        const chatGPTResponse = await getChatGPTResponse(userQuery, relevantProducts);
        
        if (chatGPTResponse) {
          setMessages(prev => [...prev, {
            message: chatGPTResponse,
            sender: "bot",
            timestamp: new Date()
          }]);
          await new Promise(resolve => setTimeout(resolve, 800));
        }

        for (const product of relevantProducts.slice(0, 2)) {
          const productInfo = extractProductInfo(product);
          const formattedResponse = formatProductResponse(productInfo);
          
          setMessages(prev => [...prev, {
            message: formattedResponse,
            sender: "bot",
            timestamp: new Date()
          }]);
          await new Promise(resolve => setTimeout(resolve, 600));
        }
      } else {
        const chatGPTResponse = await getChatGPTResponse(userQuery, []);
        setMessages(prev => [...prev, {
          message: chatGPTResponse || "Xin lỗi, tôi không tìm thấy sản phẩm phù hợp. Bạn có thể mô tả rõ hơn không? 😊",
          sender: "bot",
          timestamp: new Date()
        }]);
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
    "Tìm váy đen",
    "Áo size M",
    "Sản phẩm sale",
    "Còn hàng gì?"
  ];

  const handleQuickReply = (reply) => {
    setInput(reply);
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
                className={`message ${message.sender === "bot" ? "bot-message" : "user-message"}`}
              >
                <div className="message-content">
                  <div className="message-text" style={{ whiteSpace: 'pre-line' }}>{message.message}</div>
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