
export const hexToColorName = (hex) => {
  // Chuẩn hóa hex code
  hex = hex.replace('#', '').toLowerCase();
  
  // Dictionary màu phổ biến trong tiếng Việt
  const colorMap = {
    // Đỏ
    'ff0000': 'Đỏ',
    'dc143c': 'Đỏ thẫm',
    'ff6b6b': 'Đỏ hồng',
    'ff4757': 'Đỏ tươi',
    'ee5a6f': 'Đỏ san hô',
    'c23616': 'Đỏ gạch',
    'e74c3c': 'Đỏ cam',
    
    // Cam
    'ffa500': 'Cam',
    'ff7f50': 'Cam san hô',
    'ff8c00': 'Cam đậm',
    'ffa07a': 'Cam nhạt',
    'ff6348': 'Cam đỏ',
    
    // Vàng
    'ffff00': 'Vàng',
    'ffd700': 'Vàng kim',
    'ffeb3b': 'Vàng tươi',
    'ffc312': 'Vàng chanh',
    'f9ca24': 'Vàng mơ',
    'fff200': 'Vàng neon',
    
    // Xanh lá
    '008000': 'Xanh lá',
    '00ff00': 'Xanh lá neon',
    '32cd32': 'Xanh lá nhạt',
    '228b22': 'Xanh lá rừng',
    '7bed9f': 'Xanh lá mint',
    '2ecc71': 'Xanh lá tươi',
    '27ae60': 'Xanh lá đậm',
    '1abc9c': 'Xanh lá ngọc',
    
    // Xanh dương
    '0000ff': 'Xanh dương',
    '00bfff': 'Xanh dương nhạt',
    '1e90ff': 'Xanh dương đậm',
    '4169e1': 'Xanh hoàng gia',
    '3498db': 'Xanh dương tươi',
    '2980b9': 'Xanh dương đậm',
    '5f27cd': 'Xanh tím',
    
    // Xanh da trời
    '87ceeb': 'Xanh da trời',
    '87cefa': 'Xanh da trời nhạt',
    '00ced1': 'Xanh ngọc lam',
    '48c9b0': 'Xanh ngọc',
    
    // Tím
    '800080': 'Tím',
    '9b59b6': 'Tím nhạt',
    '8e44ad': 'Tím đậm',
    'ee82ee': 'Tím hoa cà',
    'dda0dd': 'Tím mận',
    'a29bfe': 'Tím lavender',
    '6c5ce7': 'Tím than',
    
    // Hồng
    'ffc0cb': 'Hồng',
    'ff69b4': 'Hồng đậm',
    'ffb3ba': 'Hồng nhạt',
    'fd79a8': 'Hồng sen',
    'e84393': 'Hồng cánh sen',
    'fab1a0': 'Hồng đào',
    
    // Nâu
    'a52a2a': 'Nâu',
    '8b4513': 'Nâu đậm',
    'd2691e': 'Nâu sô cô la',
    'cd853f': 'Nâu vàng',
    'dfe6e9': 'Nâu xám',
    
    // Xám
    '808080': 'Xám',
    'a9a9a9': 'Xám đậm',
    'd3d3d3': 'Xám nhạt',
    'c0c0c0': 'Bạc',
    'dcdde1': 'Xám trắng',
    '95a5a6': 'Xám đá',
    '7f8c8d': 'Xám thép',
    
    // Trắng đen
    'ffffff': 'Trắng',
    '000000': 'Đen',
    'f5f5f5': 'Trắng ngà',
    '2f3640': 'Đen nhạt',
    '353b48': 'Đen xanh',
    
    // Màu đặc biệt
    '1c78fa': 'Xanh nước biển',
    'be93e4': 'Tím pastel',
    'ffcccc': 'Hồng pastel',
    'ccffcc': 'Xanh pastel',
    'ccccff': 'Tím nhạt pastel',
  };
  
  // Tìm màu chính xác
  if (colorMap[hex]) {
    return colorMap[hex];
  }
  
  // Nếu không tìm thấy, tìm màu gần nhất bằng thuật toán khoảng cách màu
  return findClosestColorName(hex, colorMap);
};

// Hàm tìm màu gần nhất
const findClosestColorName = (hex, colorMap) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'Màu tùy chỉnh';
  
  let minDistance = Infinity;
  let closestColor = 'Màu tùy chỉnh';
  
  Object.keys(colorMap).forEach(colorHex => {
    const colorRgb = hexToRgb(colorHex);
    if (colorRgb) {
      const distance = Math.sqrt(
        Math.pow(rgb.r - colorRgb.r, 2) +
        Math.pow(rgb.g - colorRgb.g, 2) +
        Math.pow(rgb.b - colorRgb.b, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestColor = colorMap[colorHex];
      }
    }
  });
  
  // Nếu khoảng cách quá xa (>100), trả về "Màu tùy chỉnh"
  return minDistance < 100 ? closestColor : 'Màu tùy chỉnh';
};

// Chuyển HEX sang RGB
const hexToRgb = (hex) => {
  hex = hex.replace('#', '');
  
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  if (hex.length !== 6) {
    return null;
  }
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return { r, g, b };
};

// Hàm kiểm tra màu sáng hay tối (để chọn màu chữ)
export const isLightColor = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  
  // Công thức tính độ sáng
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128;
};