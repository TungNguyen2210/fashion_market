// ===================================================================
// GHN ADDRESS MAPPING - Mapping địa chỉ VN sang GHN IDs
// ===================================================================

export const GHN_PROVINCE_MAPPING = {
  // Thành phố/Tỉnh → GHN Province ID
  'hồ chí minh': 202,
  'tp hcm': 202,
  'tp.hcm': 202,
  'hcm': 202,
  'sài gòn': 202,
  'saigon': 202,
  
  'hà nội': 201,
  'ha noi': 201,
  'hanoi': 201,
  
  'đà nẵng': 203,
  'da nang': 203,
  'danang': 203,
  
  'bình dương': 217,
  'binh duong': 217,
  
  'đồng nai': 218,
  'dong nai': 218,
  
  'long an': 220,
  
  'cần thơ': 292,
  'can tho': 292,
  
  'an giang': 293,
  
  'bà rịa vũng tàu': 221,
  'ba ria vung tau': 221,
  'vũng tàu': 221,
  
  'bạc liêu': 294,
  'bac lieu': 294,
  
  'bắc giang': 269,
  'bac giang': 269,
  
  'bắc kạn': 270,
  'bac kan': 270,
  
  'bắc ninh': 268,
  'bac ninh': 268,
  
  'bến tre': 295,
  'ben tre': 295,
  
  'bình định': 280,
  'binh dinh': 280,
  
  'bình phước': 222,
  'binh phuoc': 222,
  
  'bình thuận': 279,
  'binh thuan': 279,
  
  'cà mau': 296,
  'ca mau': 296,
  
  'cao bằng': 271,
  'cao bang': 271,
  
  'đắk lắk': 267,
  'dak lak': 267,
  'daklak': 267,
  
  'đắk nông': 297,
  'dak nong': 297,
  
  'điện biên': 298,
  'dien bien': 298,
  
  'gia lai': 281,
  
  'hà giang': 272,
  'ha giang': 272,
  
  'hà nam': 245,
  'ha nam': 245,
  
  'hà tĩnh': 246,
  'ha tinh': 246,
  
  'hải dương': 247,
  'hai duong': 247,
  
  'hải phòng': 248,
  'hai phong': 248,
  
  'hậu giang': 299,
  'hau giang': 299,
  
  'hòa bình': 273,
  'hoa binh': 273,
  
  'hưng yên': 249,
  'hung yen': 249,
  
  'khánh hòa': 235,
  'khanh hoa': 235,
  'nha trang': 235,
  
  'kiên giang': 300,
  'kien giang': 300,
  
  'kon tum': 282,
  
  'lai châu': 274,
  'lai chau': 274,
  
  'lâm đồng': 233,
  'lam dong': 233,
  'đà lạt': 233,
  'da lat': 233,
  
  'lạng sơn': 275,
  'lang son': 275,
  
  'lào cai': 276,
  'lao cai': 276,
  
  'nam định': 250,
  'nam dinh': 250,
  
  'nghệ an': 251,
  'nghe an': 251,
  
  'ninh bình': 252,
  'ninh binh': 252,
  
  'ninh thuận': 236,
  'ninh thuan': 236,
  
  'phú thọ': 253,
  'phu tho': 253,
  
  'phú yên': 237,
  'phu yen': 237,
  
  'quảng bình': 254,
  'quang binh': 254,
  
  'quảng nam': 238,
  'quang nam': 238,
  
  'quảng ngãi': 239,
  'quang ngai': 239,
  
  'quảng ninh': 255,
  'quang ninh': 255,
  
  'quảng trị': 256,
  'quang tri': 256,
  
  'sóc trăng': 301,
  'soc trang': 301,
  
  'sơn la': 277,
  'son la': 277,
  
  'tây ninh': 223,
  'tay ninh': 223,
  
  'thái bình': 257,
  'thai binh': 257,
  
  'thái nguyên': 258,
  'thai nguyen': 258,
  
  'thanh hóa': 259,
  'thanh hoa': 259,
  
  'thừa thiên huế': 260,
  'thua thien hue': 260,
  'huế': 260,
  'hue': 260,
  
  'tiền giang': 302,
  'tien giang': 302,
  
  'trà vinh': 303,
  'tra vinh': 303,
  
  'tuyên quang': 278,
  'tuyen quang': 278,
  
  'vĩnh long': 304,
  'vinh long': 304,
  
  'vĩnh phúc': 261,
  'vinh phuc': 261,
  
  'yên bái': 262,
  'yen bai': 262
};

// ===================================================================
// HCM DISTRICT MAPPING (Quận/Huyện TP.HCM → GHN District ID)
// ===================================================================
export const HCM_DISTRICT_MAPPING = {
  'quận 1': 1442,
  'quan 1': 1442,
  'q1': 1442,
  'q.1': 1442,
  
  'quận 2': 1443,
  'quan 2': 1443,
  'q2': 1443,
  'q.2': 1443,
  'thủ đức': 3695, // Sau khi sáp nhập
  'thu duc': 3695,
  
  'quận 3': 1444,
  'quan 3': 1444,
  'q3': 1444,
  'q.3': 1444,
  
  'quận 4': 1445,
  'quan 4': 1445,
  'q4': 1445,
  'q.4': 1445,
  
  'quận 5': 1446,
  'quan 5': 1446,
  'q5': 1446,
  'q.5': 1446,
  
  'quận 6': 1447,
  'quan 6': 1447,
  'q6': 1447,
  'q.6': 1447,
  
  'quận 7': 1448,
  'quan 7': 1448,
  'q7': 1448,
  'q.7': 1448,
  
  'quận 8': 1449,
  'quan 8': 1449,
  'q8': 1449,
  'q.8': 1449,
  
  'quận 9': 3695, // Sáp nhập vào Thủ Đức
  'quan 9': 3695,
  'q9': 3695,
  'q.9': 3695,
  
  'quận 10': 1451,
  'quan 10': 1451,
  'q10': 1451,
  'q.10': 1451,
  
  'quận 11': 1452,
  'quan 11': 1452,
  'q11': 1452,
  'q.11': 1452,
  
  'quận 12': 1453,
  'quan 12': 1453,
  'q12': 1453,
  'q.12': 1453,
  
  'bình thạnh': 1454,
  'binh thanh': 1454,
  
  'bình tân': 1455,
  'binh tan': 1455,
  
  'tân bình': 1456,
  'tan binh': 1456,
  
  'tân phú': 1457,
  'tan phu': 1457,
  
  'phú nhuận': 1458,
  'phu nhuan': 1458,
  
  'gò vấp': 1459,
  'go vap': 1459,
  
  'bình chánh': 1460,
  'binh chanh': 1460,
  
  'hóc môn': 1461,
  'hoc mon': 1461,
  
  'củ chi': 1462,
  'cu chi': 1462,
  
  'nhà bè': 1463,
  'nha be': 1463,
  
  'cần giờ': 1464,
  'can gio': 1464
};

// ===================================================================
// HANOI DISTRICT MAPPING (Quận/Huyện Hà Nội → GHN District ID)
// ===================================================================
export const HANOI_DISTRICT_MAPPING = {
  'ba đình': 1484,
  'ba dinh': 1484,
  
  'hoàn kiếm': 1485,
  'hoan kiem': 1485,
  
  'tây hồ': 1486,
  'tay ho': 1486,
  
  'long biên': 1487,
  'long bien': 1487,
  
  'cầu giấy': 1488,
  'cau giay': 1488,
  
  'đống đa': 1489,
  'dong da': 1489,
  
  'hai bà trưng': 1490,
  'hai ba trung': 1490,
  
  'hoàng mai': 1491,
  'hoang mai': 1491,
  
  'thanh xuân': 1492,
  'thanh xuan': 1492,
  
  'sóc sơn': 1493,
  'soc son': 1493,
  
  'đông anh': 1494,
  'dong anh': 1494,
  
  'gia lâm': 1495,
  'gia lam': 1495,
  
  'nam từ liêm': 1496,
  'nam tu liem': 1496,
  
  'thanh trì': 1497,
  'thanh tri': 1497,
  
  'bắc từ liêm': 1498,
  'bac tu liem': 1498,
  
  'mê linh': 1499,
  'me linh': 1499,
  
  'hà đông': 1542,
  'ha dong': 1542,
  
  'sơn tây': 1543,
  'son tay': 1543,
  
  'ba vì': 1544,
  'ba vi': 1544,
  
  'phúc thọ': 1545,
  'phuc tho': 1545,
  
  'đan phượng': 1546,
  'dan phuong': 1546,
  
  'hoài đức': 1547,
  'hoai duc': 1547,
  
  'quốc oai': 1548,
  'quoc oai': 1548,
  
  'thạch thất': 1549,
  'thach that': 1549,
  
  'chương mỹ': 1550,
  'chuong my': 1550,
  
  'thanh oai': 1551,
  'thường tín': 1552,
  'thuong tin': 1552,
  
  'phú xuyên': 1553,
  'phu xuyen': 1553,
  
  'ứng hòa': 1554,
  'ung hoa': 1554,
  
  'mỹ đức': 1555,
  'my duc': 1555
};

// ===================================================================
// DANANG DISTRICT MAPPING
// ===================================================================
export const DANANG_DISTRICT_MAPPING = {
  'hải châu': 1550,
  'hai chau': 1550,
  
  'thanh khê': 1551,
  'thanh khe': 1551,
  
  'sơn trà': 1552,
  'son tra': 1552,
  
  'ngũ hành sơn': 1553,
  'ngu hanh son': 1553,
  
  'liên chiểu': 1554,
  'lien chieu': 1554,
  
  'cẩm lệ': 1555,
  'cam le': 1555,
  
  'hòa vang': 1556,
  'hoa vang': 1556,
  
  'hoàng sa': 1557
};