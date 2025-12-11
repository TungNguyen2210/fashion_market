import {
    EditOutlined,
    HomeOutlined,
    PlusOutlined,
    ShoppingOutlined,
    TagOutlined,
    GiftOutlined,
    TruckOutlined,
    StopOutlined,
    DeleteOutlined,
    InfoCircleOutlined,
    LockOutlined
} from '@ant-design/icons';
import { PageHeader } from '@ant-design/pro-layout';
import {
    BackTop, 
    Breadcrumb,
    Button,
    Col,
    Form,
    Input,
    Modal, 
    Popconfirm,
    Row,
    Spin,
    Table,
    notification,
    DatePicker,
    Select,
    InputNumber,
    Tag,
    Card,
    Typography,
    Tooltip,
    Transfer,
    Avatar,
    message
} from 'antd';
import { useEffect, useState, useMemo } from 'react';
import debounce from 'lodash/debounce';
import promotionManagementApi from "../../apis/promotionManagementApi";
import productApi from "../../apis/productsApi";
import "./promotionManagement.css";
import moment from 'moment';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

const PromotionManagement = () => {
    const [promotions, setPromotions] = useState([]);
    const [originalPromotions, setOriginalPromotions] = useState([]);
    const [products, setProducts] = useState([]);
    const [openModalCreate, setOpenModalCreate] = useState(false);
    const [openModalUpdate, setOpenModalUpdate] = useState(false);
    const [loading, setLoading] = useState(true);
    const [productsLoading, setProductsLoading] = useState(false);
    const [form] = Form.useForm();
    const [form2] = Form.useForm();
    const [id, setId] = useState();
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [currentEditingPromotion, setCurrentEditingPromotion] = useState(null);

    const [targetKeys, setTargetKeys] = useState([]);
    const [selectedKeys, setSelectedKeys] = useState([]);

    

    const promotionTypes = {
        'voucher': { label: 'Voucher', icon: <TagOutlined />, color: 'blue' },
        'dot_giam_gia': { label: 'Đợt giảm giá', icon: <GiftOutlined />, color: 'green' },
        'free_shipping': { label: 'FreeShip', icon: <TruckOutlined />, color: 'orange' }
    };

    const promotionStatus = {
        'active': { label: 'Đang hoạt động', color: 'green' },
        'expired': { label: 'Đã hết hạn', color: 'red' },
        'scheduled': { label: 'Đã lên lịch', color: 'blue' },
        'inactive': { label: 'Ngừng sử dụng', color: 'gray' }
    };

    // Hàm kiểm tra xem có thể xóa khuyến mãi không
    const canDeletePromotion = (promotion) => {
        // Không thể xóa nếu đã được sử dụng
        if (promotion.usedCount > 0) {
            return {
                canDelete: false,
                reason: `Khuyến mãi đã được sử dụng ${promotion.usedCount} lần, không thể xóa`
            };
        }

        // Không thể xóa nếu đang active
        if (promotion.trangThai === 'active') {
            return {
                canDelete: false,
                reason: 'Không thể xóa khuyến mãi đang hoạt động'
            };
        }

        // Không thể xóa nếu đang trong thời gian áp dụng
        const now = new Date();
        const startDate = new Date(promotion.thoiGianBD);
        const endDate = new Date(promotion.thoiGianKT);
        
        if (now >= startDate && now <= endDate) {
            return {
                canDelete: false,
                reason: 'Không thể xóa khuyến mãi đang trong thời gian áp dụng'
            };
        }

        return {
            canDelete: true,
            reason: null
        };
    };

    // Hàm kiểm tra xem có thể sửa khuyến mãi không
    const canEditPromotion = (promotion) => {
        // Có thể sửa nhưng giới hạn một số field nếu đã được sử dụng
        if (promotion.usedCount > 0) {
            return {
                canEdit: true,
                limitedEdit: true,
                reason: 'Khuyến mãi đã được sử dụng, chỉ có thể sửa một số thông tin',
                editableFields: ['tenKhuyenMai', 'moTa', 'trangThai', 'thoiGianKT'] // Chỉ cho phép sửa tên, mô tả, trạng thái và gia hạn
            };
        }

        // Không thể sửa nếu đã hết hạn
        if (promotion.trangThai === 'expired') {
            return {
                canEdit: false,
                reason: 'Không thể sửa khuyến mãi đã hết hạn'
            };
        }

        // Nếu đang active, giới hạn sửa
        if (promotion.trangThai === 'active') {
            const now = new Date();
            const startDate = new Date(promotion.thoiGianBD);
            
            if (now > startDate) {
                return {
                    canEdit: true,
                    limitedEdit: true,
                    reason: 'Khuyến mãi đang hoạt động, chỉ có thể sửa một số thông tin',
                    editableFields: ['tenKhuyenMai', 'moTa', 'thoiGianKT', 'giaTriToiThieu', 'giamToiDa', 'soLuong']
                };
            }
        }

        return {
            canEdit: true,
            limitedEdit: false,
            reason: null
        };
    };

    // Hàm xóa khuyến mãi
    const handleDeletePromotion = async (promotion) => {
        const deleteCheck = canDeletePromotion(promotion);
        
        if (!deleteCheck.canDelete) {
            notification.error({
                message: 'Không thể xóa',
                description: deleteCheck.reason,
            });
            return;
        }

        try {
            setLoading(true);
            const response = await promotionManagementApi.deletePromotionManagement(promotion._id);
            
            if (response.success || response.data) {
                notification.success({
                    message: 'Thành công',
                    description: 'Xóa khuyến mãi thành công',
                });
                handlePromotionList();
            } else {
                notification.error({
                    message: 'Lỗi',
                    description: response.message || 'Xóa khuyến mãi thất bại',
                });
            }
        } catch (error) {
            console.error('Delete promotion error:', error);
            notification.error({
                message: 'Lỗi',
                description: 'Có lỗi xảy ra khi xóa khuyến mãi: ' + error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        setProductsLoading(true);
        try {
            console.log('Fetching products...');
            const response = await productApi.getListProducts({ 
                page: 1, 
                limit: 10000  
            });
            console.log('Products API response:', response);
            
            if (response && response.success && Array.isArray(response.data)) {
                setProducts(response.data);
                console.log('Set products from response.data:', response.data.length);
            } else if (Array.isArray(response)) {
                setProducts(response);
                console.log('Set products from direct array:', response.length);
            } else if (response && response.data && Array.isArray(response.data)) {
                setProducts(response.data);
                console.log('Set products from response.data (no success flag):', response.data.length);
            } else if (response && response.data && response.data.docs && Array.isArray(response.data.docs)) {
                setProducts(response.data.docs);
                console.log('Set products from paginated response:', response.data.docs.length);
            } else {
                console.warn('Unexpected response structure:', response);
                setProducts([]);
            }
        } catch (error) {
            console.error('Failed to fetch products:', error);

            let errorMessage = 'Không thể tải danh sách sản phẩm';
            
            if (error.response?.status === 500) {
                errorMessage = 'Lỗi server (500) - Vui lòng kiểm tra backend service';
            } else if (error.response?.status === 404) {
                errorMessage = 'API endpoint không tồn tại (404)';
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage = 'Không thể kết nối đến server - Kiểm tra port 3100';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            notification.error({
                message: 'Lỗi khi tải danh sách sản phẩm',
                description: errorMessage,
            });
            
            notification.warning({
                message: 'Sử dụng dữ liệu mẫu',
                description: 'Đang sử dụng dữ liệu sản phẩm mẫu do không thể kết nối API',
            });
        }
        setProductsLoading(false);
    };

    useEffect(() => {
        fetchProducts();
        handlePromotionList();
    }, []);


    const showModal = () => {
        setOpenModalCreate(true);
        setTargetKeys([]);
        setSelectedKeys([]);
    };

    // Custom validation cho form tạo
    const validatePromotionData = (values) => {
        const errors = [];
        
        // Validation cho voucher
        if (values.loai === 'voucher') {
            if (!values.giaTriToiThieu || values.giaTriToiThieu <= 0) {
                errors.push('Voucher phải có giá trị đơn hàng tối thiểu lớn hơn 0');
            }
            if (!values.giamToiDa || values.giamToiDa <= 0) {
                errors.push('Voucher phải có giá trị giảm tối đa lớn hơn 0');
            }
            if (!values.soLuong || values.soLuong <= 0) {
                errors.push('Voucher phải có số lượng lớn hơn 0');
            }
            if (values.giamToiDa && values.giaTriToiThieu && values.giamToiDa > values.giaTriToiThieu) {
                errors.push('Giá trị giảm tối đa không được lớn hơn giá trị đơn hàng tối thiểu');
            }
        }
        
        // Validation cho free_shipping
        if (values.loai === 'free_shipping') {
            if (!values.giaTriToiThieu || values.giaTriToiThieu <= 0) {
                errors.push('Miễn phí vận chuyển phải có giá trị đơn hàng tối thiểu lớn hơn 0');
            }
            // Free shipping không có phần trăm giảm
            if (values.phanTramKhuyenMai && values.phanTramKhuyenMai !== 0) {
                errors.push('Miễn phí vận chuyển không có phần trăm khuyến mãi');
            }
        }
        
        // Validation cho đợt giảm giá
        if (values.loai === 'dot_giam_gia') {
            if (!values.phanTramKhuyenMai || values.phanTramKhuyenMai <= 0) {
                errors.push('Đợt giảm giá phải có phần trăm khuyến mãi lớn hơn 0');
            }
            if (targetKeys.length === 0) {
                errors.push('Đợt giảm giá phải chọn ít nhất một sản phẩm áp dụng');
            }
        }
        
        return errors;
    };

    const handleOkUser = async (values) => {
        // Validate trước khi submit
        const validationErrors = validatePromotionData(values);
        if (validationErrors.length > 0) {
            notification["error"]({
                message: `Lỗi validation`,
                description: (
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {validationErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                    </ul>
                ),
            });
            return;
        }

        setLoading(true);
        try {
            const promotionData = {
                "maKhuyenMai": values.maKhuyenMai,
                "tenKhuyenMai": values.tenKhuyenMai,
                "loai": values.loai,
                "phanTramKhuyenMai": values.loai === 'free_shipping' ? 0 : (values.phanTramKhuyenMai || 0),
                "giaTriToiThieu": values.loai === 'dot_giam_gia' ? 0 : (values.giaTriToiThieu || 0),
                "giamToiDa": values.loai === 'voucher' ? values.giamToiDa : null,
                "soLuong": values.loai === 'voucher' ? values.soLuong : null,
                "thoiGianBD": values.thoiGianBD.format("YYYY-MM-DD"),
                "thoiGianKT": values.thoiGianKT.format("YYYY-MM-DD"),
                "moTa": values.moTa || "",
                "sanPhamApDung": values.loai === 'dot_giam_gia' ? targetKeys : [],
                "trangThai": values.trangThai || 'scheduled'
            };

            console.log('Creating promotion with data:', promotionData);

            const response = await promotionManagementApi.createPromotionManagement(promotionData);
            
            if (response.success || response.data) {
                notification["success"]({
                    message: `Thông báo`,
                    description: 'Tạo khuyến mãi thành công',
                });
                setOpenModalCreate(false);
                form.resetFields();
                setTargetKeys([]);
                handlePromotionList();
            } else {
                notification["error"]({
                    message: `Thông báo`,
                    description: response.message || 'Tạo khuyến mãi thất bại',
                });
            }
        } catch (error) {
            console.error('Create promotion error:', error);
            notification["error"]({
                message: `Thông báo`,
                description: 'Có lỗi xảy ra khi tạo khuyến mãi: ' + error.message,
            });
        }
        setLoading(false);
    };

    const handleUpdatePromotion = async (values) => {
        // Validate trước khi submit
        const validationErrors = validatePromotionData(values);
        if (validationErrors.length > 0) {
            notification["error"]({
                message: `Lỗi validation`,
                description: (
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {validationErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                    </ul>
                ),
            });
            return;
        }

        setLoading(true);
        try {
            const promotionData = {
                "maKhuyenMai": values.maKhuyenMai,
                "tenKhuyenMai": values.tenKhuyenMai,
                "loai": values.loai,
                "phanTramKhuyenMai": values.loai === 'free_shipping' ? 0 : (values.phanTramKhuyenMai || 0),
                "giaTriToiThieu": values.loai === 'dot_giam_gia' ? 0 : (values.giaTriToiThieu || 0),
                "giamToiDa": values.loai === 'voucher' ? values.giamToiDa : null,
                "soLuong": values.loai === 'voucher' ? values.soLuong : null,
                "thoiGianBD": values.thoiGianBD.format("YYYY-MM-DD"),
                "thoiGianKT": values.thoiGianKT.format("YYYY-MM-DD"),
                "moTa": values.moTa || "",
                "sanPhamApDung": values.loai === 'dot_giam_gia' ? targetKeys : [],
                "trangThai": values.trangThai
            };

            const response = await promotionManagementApi.updatePromotionManagement(id, promotionData);
            
            if (response.success || response.data) {
                notification["success"]({
                    message: `Thông báo`,
                    description: 'Cập nhật khuyến mãi thành công',
                });
                handlePromotionList();
                setOpenModalUpdate(false);
                form2.resetFields();
                setTargetKeys([]);
                setCurrentEditingPromotion(null);
            } else {
                notification["error"]({
                    message: `Thông báo`,
                    description: response.message || 'Cập nhật khuyến mãi thất bại',
                });
            }
        } catch (error) {
            console.error('Update promotion error:', error);
            notification["error"]({
                message: `Thông báo`,
                description: 'Có lỗi xảy ra khi cập nhật khuyến mãi: ' + error.message,
            });
        }
        setLoading(false);
    };

    const handleCancel = (type) => {
        if (type === "create") {
            setOpenModalCreate(false);
            form.resetFields();
        } else {
            setOpenModalUpdate(false);
            form2.resetFields();
            setCurrentEditingPromotion(null);
        }
        setTargetKeys([]);
        setSelectedKeys([]);
    };

    const applyFilters = (data = originalPromotions) => {
        console.log('🔄 Applying filters - Type:', filterType, 'Status:', filterStatus);
        console.log('🔄 Filtering from', data.length, 'promotions');
        
        let filtered = [...data]; 
        if (filterType !== 'all') {
            filtered = filtered.filter(promo => promo.loai === filterType);
            console.log(`📌 After type filter (${filterType}):`, filtered.length);
        }
 
        if (filterStatus !== 'all') {
            filtered = filtered.filter(promo => promo.trangThai === filterStatus);
            console.log(`📌 After status filter (${filterStatus}):`, filtered.length);
        }
        if (searchKeyword && searchKeyword.trim() !== '') {
            const keyword = searchKeyword.toLowerCase().trim();
            filtered = filtered.filter(promo => {
                const maKM = (promo.maKhuyenMai || '').toLowerCase();
                const tenKM = (promo.tenKhuyenMai || '').toLowerCase();
                const moTa = (promo.moTa || '').toLowerCase();
                const loai = (promo.loai || '').toLowerCase();
                
                return maKM.includes(keyword) || 
                    tenKM.includes(keyword) || 
                    moTa.includes(keyword) ||
                    loai.includes(keyword);
            });
            console.log(`📌 After search filter (${keyword}):`, filtered.length);
        }
        
        console.log(`✅ Final filtered result:`, filtered.length);
        setPromotions(filtered);
    }; 

    const handlePromotionList = async () => {
        try {
            setLoading(true);
            const params = { 
                _t: Date.now(),
                page: 1,
                limit: 10000
            };
            
            console.log('📡 Loading ALL promotions from API...');
            
            const res = await promotionManagementApi.listPromotionManagement(params);
            
            if (res && (res.success || res.data)) {
                const promotionsData = res.data?.docs || res.data || [];
                const validData = Array.isArray(promotionsData) ? promotionsData : [];
                
                console.log(`✅ Loaded ${validData.length} total promotions`);
                setOriginalPromotions(validData);
                applyFilters(validData);
            } else {
                console.log('⚠️ No data returned from API');
                setPromotions([]);
                setOriginalPromotions([]);
            }
        } catch (error) {
            console.error('❌ Failed to fetch promotion list:', error);
            setPromotions([]);
            setOriginalPromotions([]);
            
            notification.error({
                message: 'Lỗi tải dữ liệu',
                description: 'Không thể tải danh sách khuyến mãi: ' + error.message,
            });
        } finally {
            setLoading(false);
        }
    };


    const handleDeactivatePromotion = async (id) => {
        setLoading(true);
        try {
            const response = await promotionManagementApi.updatePromotionManagement({
                trangThai: 'inactive'
            }, id);
            
            if (response.success || response.data) {
                notification["success"]({
                    message: `Thông báo`,
                    description: 'Ngừng sử dụng khuyến mãi thành công',
                });
                handlePromotionList();
            } else {
                notification["error"]({
                    message: `Thông báo`,
                    description: response.message || 'Ngừng sử dụng khuyến mãi thất bại',
                });
            }
        } catch (error) {
            console.error('Deactivate promotion error:', error);
            notification["error"]({
                message: `Thông báo`,
                description: 'Có lỗi xảy ra khi ngừng sử dụng khuyến mãi: ' + error.message,
            });
        }
        setLoading(false);
    };

    const handleEditPromotion = async (promotion) => {
        const editCheck = canEditPromotion(promotion);
        
        if (!editCheck.canEdit) {
            notification.error({
                message: 'Không thể sửa',
                description: editCheck.reason,
            });
            return;
        }

        if (editCheck.limitedEdit) {
            notification.warning({
                message: 'Giới hạn chỉnh sửa',
                description: editCheck.reason,
            });
        }

        setOpenModalUpdate(true);
        setLoading(true);
        setCurrentEditingPromotion(promotion);
        
        try {
            const response = await promotionManagementApi.getDetailPromotionManagement(promotion._id);
            console.log('Edit promotion response:', response);
            
            if (response.success || response.data) {
                const data = response.data || response;
                setId(promotion._id);
                
                if (data.sanPhamApDung && data.sanPhamApDung.length > 0) {
                    const productIds = data.sanPhamApDung.map(product => 
                        typeof product === 'object' ? product._id : product
                    );
                    setTargetKeys(productIds);
                }
                
                form2.setFieldsValue({
                    maKhuyenMai: data.maKhuyenMai,
                    tenKhuyenMai: data.tenKhuyenMai,
                    loai: data.loai,
                    phanTramKhuyenMai: data.phanTramKhuyenMai,
                    giaTriToiThieu: data.giaTriToiThieu,
                    giamToiDa: data.giamToiDa,
                    soLuong: data.soLuong,
                    thoiGianBD: dayjs(data.thoiGianBD),
                    thoiGianKT: dayjs(data.thoiGianKT),
                    moTa: data.moTa,
                    trangThai: data.trangThai
                });
            }
        } catch (error) {
            console.error('Edit promotion error:', error);
            notification["error"]({
                message: `Thông báo`,
                description: 'Không thể tải thông tin khuyến mãi: ' + error.message,
            });
        }
        setLoading(false);
    };


    const handleSearch = (value) => {
        console.log('🔍 Search triggered with value:', `"${value}"`);
        
        try {
            const keyword = (value || '').toLowerCase().trim();
            setSearchKeyword(keyword);

            let filtered = [...originalPromotions];

            if (filterType !== 'all') {
                filtered = filtered.filter(promo => promo.loai === filterType);
            }
            
            if (filterStatus !== 'all') {
                filtered = filtered.filter(promo => promo.trangThai === filterStatus);
            }

            if (keyword) {
                filtered = filtered.filter(promo => {
                    const maKM = (promo.maKhuyenMai || '').toLowerCase();
                    const tenKM = (promo.tenKhuyenMai || '').toLowerCase();
                    const moTa = (promo.moTa || '').toLowerCase();
                    const loai = (promo.loai || '').toLowerCase();
                    
                    return maKM.includes(keyword) || 
                        tenKM.includes(keyword) || 
                        moTa.includes(keyword) ||
                        loai.includes(keyword);
                });
            }
            
            console.log(`🔍 Found ${filtered.length} results from ${originalPromotions.length} total`);
            setPromotions(filtered);
            
        } catch (error) {
            console.error('❌ Search error:', error);
            notification.error({
                message: 'Lỗi tìm kiếm',
                description: error.message,
            });
        }
    };

    const debouncedSearch = useMemo(
        () => debounce((value) => {
            console.log('⏱️ Debounced search executing for:', value);
            handleSearch(value);
        }, 300),
        [originalPromotions, filterType, filterStatus]
    );

    useEffect(() => {
        return () => {
            debouncedSearch.cancel(); 
        };
    }, [debouncedSearch]);

    const handleFilterTypeChange = (value) => {
        console.log('🔍 Filter type changed to:', value);
        setFilterType(value);

        let filtered = [...originalPromotions];
        
        if (value !== 'all') {
            filtered = filtered.filter(promo => promo.loai === value);
        }
        
        if (filterStatus !== 'all') {
            filtered = filtered.filter(promo => promo.trangThai === filterStatus);
        }
        
        if (searchKeyword && searchKeyword.trim() !== '') {
            const keyword = searchKeyword.toLowerCase().trim();
            filtered = filtered.filter(promo => {
                const maKM = (promo.maKhuyenMai || '').toLowerCase();
                const tenKM = (promo.tenKhuyenMai || '').toLowerCase();
                const moTa = (promo.moTa || '').toLowerCase();
                
                return maKM.includes(keyword) || 
                    tenKM.includes(keyword) || 
                    moTa.includes(keyword);
            });
        }
        
        setPromotions(filtered);
    };

    const handleFilterStatusChange = (value) => {
        console.log('🔍 Filter status changed to:', value);
        setFilterStatus(value);
  
        let filtered = [...originalPromotions];
        
        if (filterType !== 'all') {
            filtered = filtered.filter(promo => promo.loai === filterType);
        }
        
        if (value !== 'all') {
            filtered = filtered.filter(promo => promo.trangThai === value);
        }
        
        if (searchKeyword && searchKeyword.trim() !== '') {
            const keyword = searchKeyword.toLowerCase().trim();
            filtered = filtered.filter(promo => {
                const maKM = (promo.maKhuyenMai || '').toLowerCase();
                const tenKM = (promo.tenKhuyenMai || '').toLowerCase();
                const moTa = (promo.moTa || '').toLowerCase();
                
                return maKM.includes(keyword) || 
                    tenKM.includes(keyword) || 
                    moTa.includes(keyword);
            });
        }
        
        setPromotions(filtered);
    };

    const handlePromotionTypeChange = (value, formInstance) => {
        const fields = formInstance.getFieldsValue();
        
        // Reset các field theo loại khuyến mãi
        if (value === 'free_shipping') {
            formInstance.setFieldsValue({
                ...fields,
                phanTramKhuyenMai: 0,
                giamToiDa: null,
                soLuong: null,
                giaTriToiThieu: fields.giaTriToiThieu || undefined 
            });
            setTargetKeys([]);
        } else if (value === 'dot_giam_gia') {
            formInstance.setFieldsValue({
                ...fields,
                giamToiDa: null,
                soLuong: null,
                giaTriToiThieu: 0, 
                phanTramKhuyenMai: fields.phanTramKhuyenMai || undefined
            });
        } else if (value === 'voucher') {
            setTargetKeys([]);
            formInstance.setFieldsValue({
                ...fields,
                phanTramKhuyenMai: fields.phanTramKhuyenMai || undefined,
                giaTriToiThieu: fields.giaTriToiThieu || undefined,
                giamToiDa: fields.giamToiDa || undefined,
                soLuong: fields.soLuong || undefined
            });
        }
        
        // Trigger validation lại cho các field
        formInstance.validateFields();
    };

    const handleTransferChange = (newTargetKeys) => {
        setTargetKeys(newTargetKeys);
        console.log('Selected products:', newTargetKeys);
    };

    const handleTransferSelectChange = (sourceSelectedKeys, targetSelectedKeys) => {
        setSelectedKeys([...sourceSelectedKeys, ...targetSelectedKeys]);
    };

    const columns = [
        {
            title: 'STT',
            key: 'index',
            render: (text, record, index) => index + 1,
            width: 60,
        },
        {
            title: 'Mã KM',
            dataIndex: 'maKhuyenMai',
            key: 'maKhuyenMai',
            width: 100,
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: 'Tên khuyến mãi',
            dataIndex: 'tenKhuyenMai',
            key: 'tenKhuyenMai',
            width: 200,
            ellipsis: {
                showTitle: false,
            },
            render: (text) => (
                <Tooltip placement="topLeft" title={text}>
                    {text || 'Chưa có tên'}
                </Tooltip>
            ),
        },
        {
            title: 'Loại',
            dataIndex: 'loai',
            key: 'loai',
            width: 150,
            render: (loai) => {
                const type = promotionTypes[loai] || { label: loai, icon: <TagOutlined />, color: 'default' };
                return (
                    <Tag icon={type?.icon} color={type?.color}>
                        {type?.label}
                    </Tag>
                );
            },
        },
        {
            title: 'Giá trị',
            key: 'giaTriKhuyenMai',
            width: 120,
            render: (record) => {
                if (record.loai === 'free_shipping') {
                    return <Text type="success">Miễn phí ship</Text>;
                }
                return <Text>{record.phanTramKhuyenMai || 0}%</Text>;
            },
        },
        {
            title: 'Điều kiện',
            key: 'dieuKien',
            width: 150,
            render: (record) => {
                const conditions = [];
                if (record.giaTriToiThieu > 0) {
                    conditions.push(`Tối thiểu: ${record.giaTriToiThieu.toLocaleString()}đ`);
                }
                if (record.giamToiDa) {
                    conditions.push(`Tối đa: ${record.giamToiDa.toLocaleString()}đ`);
                }
                
                return conditions.length > 0 ? (
                    <div>
                        {conditions.map((condition, index) => (
                            <div key={index} style={{ fontSize: '12px' }}>
                                {condition}
                            </div>
                        ))}
                    </div>
                ) : <Text type="secondary">Không có</Text>;
            },
        },
        {
            title: 'Thời gian',
            key: 'thoiGian',
            width: 180,
            render: (record) => (
                <div>
                    <div>{moment(record.thoiGianBD).format('DD/MM/YYYY')}</div>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                        đến {moment(record.thoiGianKT).format('DD/MM/YYYY')}
                    </div>
                </div>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'trangThai',
            key: 'trangThai',
            width: 120,
            render: (status) => {
                const statusInfo = promotionStatus[status] || { label: status, color: 'default' };
                return (
                    <Tag color={statusInfo?.color}>
                        {statusInfo?.label}
                    </Tag>
                );
            },
        },
        {
            title: 'Đã dùng',
            dataIndex: 'usedCount',
            key: 'usedCount',
            width: 80,
            render: (count) => (
                <Text>{count || 0}</Text>
            ),
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 180,
            render: (text, record) => {
                const deleteCheck = canDeletePromotion(record);
                const editCheck = canEditPromotion(record);
                
                return (
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <Tooltip title={editCheck.canEdit ? (editCheck.limitedEdit ? editCheck.reason : "Chỉnh sửa") : editCheck.reason}>
                            <Button
                                size="small"
                                icon={editCheck.canEdit ? <EditOutlined style={{ color: '#fff' }} /> : <LockOutlined style={{ color: '#fff' }} />}
                                onClick={() => handleEditPromotion(record)}
                                disabled={!editCheck.canEdit}
                                style={{ 
                                    backgroundColor: editCheck.canEdit ? '#1890ff' : '#d9d9d9',
                                    border: `1px solid ${editCheck.canEdit ? '#1890ff' : '#d9d9d9'}`,
                                    color: '#fff',
                                    minWidth: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            />
                        </Tooltip>
                        
                        {record.trangThai !== 'inactive' && (
                            <Popconfirm
                                title="Bạn có chắc chắn ngừng sử dụng khuyến mãi này?"
                                onConfirm={() => handleDeactivatePromotion(record._id)}
                                okText="Có"
                                cancelText="Không"
                            >
                                <Button
                                    size="small"
                                    icon={<StopOutlined style={{ color: '#fff' }} />}
                                    style={{ 
                                        backgroundColor: '#ff4d4f',
                                        border: '1px solid #ff4d4f',
                                        color: '#fff',
                                        minWidth: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    title="Ngừng sử dụng"
                                />
                            </Popconfirm>
                        )}
                        
                        <Tooltip title={deleteCheck.canDelete ? "Xóa khuyến mãi" : deleteCheck.reason}>
                            <Popconfirm
                                title="Bạn có chắc chắn muốn xóa khuyến mãi này?"
                                description={
                                    <div>
                                        <p>Mã KM: <strong>{record.maKhuyenMai}</strong></p>
                                        <p>Tên: <strong>{record.tenKhuyenMai}</strong></p>
                                    </div>
                                }
                                onConfirm={() => handleDeletePromotion(record)}
                                okText="Xóa"
                                cancelText="Hủy"
                                disabled={!deleteCheck.canDelete}
                            >
                                <Button
                                    size="small"
                                    icon={<DeleteOutlined style={{ color: '#fff' }} />}
                                    disabled={!deleteCheck.canDelete}
                                    style={{ 
                                        backgroundColor: deleteCheck.canDelete ? '#ff4d4f' : '#d9d9d9',
                                        border: `1px solid ${deleteCheck.canDelete ? '#ff4d4f' : '#d9d9d9'}`,
                                        color: '#fff',
                                        minWidth: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                />
                            </Popconfirm>
                        </Tooltip>
                    </div>
                );
            },
        },
    ];

    const renderPromotionForm = (formInstance, isEdit = false) => {
        // Kiểm tra xem có đang edit với giới hạn không
        const isLimitedEdit = isEdit && currentEditingPromotion && canEditPromotion(currentEditingPromotion).limitedEdit;
        const editableFields = isEdit && currentEditingPromotion ? canEditPromotion(currentEditingPromotion).editableFields : [];

        return (
            <Form
                form={formInstance}
                name="promotionForm"
                layout="vertical"
                scrollToFirstError
            >
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="maKhuyenMai"
                            label="Mã khuyến mãi"
                            rules={[
                                { required: true, message: 'Vui lòng nhập mã khuyến mãi!' },
                            ]}
                        >
                            <Input 
                                placeholder="VD: SUMMER2024" 
                                disabled={isEdit} // Không cho phép sửa mã
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="tenKhuyenMai"
                            label="Tên khuyến mãi"
                            rules={[
                                { required: true, message: 'Vui lòng nhập tên khuyến mãi!' },
                            ]}
                        >
                            <Input 
                                placeholder="VD: Khuyến mãi mùa hè 2024"
                                disabled={isLimitedEdit && !editableFields.includes('tenKhuyenMai')}
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item
                            name="loai"
                            label="Loại khuyến mãi"
                            rules={[
                                { required: true, message: 'Vui lòng chọn loại khuyến mãi!' },
                            ]}
                        >
                            <Select 
                                placeholder="Chọn loại khuyến mãi"
                                onChange={(value) => handlePromotionTypeChange(value, formInstance)}
                                disabled={isEdit} 
                            >
                                <Option value="voucher">
                                    <TagOutlined /> Voucher
                                </Option>
                                <Option value="dot_giam_gia">
                                    <GiftOutlined /> Đợt giảm giá
                                </Option>
                                <Option value="free_shipping">
                                    <TruckOutlined /> Miễn phí vận chuyển
                                </Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item
                            noStyle
                            shouldUpdate={(prevValues, currentValues) => 
                                prevValues.loai !== currentValues.loai
                            }
                        >
                            {({ getFieldValue }) => {
                                const promotionType = getFieldValue('loai');
                                return (
                                    <Form.Item
                                        name="phanTramKhuyenMai"
                                        label="Phần trăm khuyến mãi (%)"
                                        rules={[
                                            { 
                                                required: promotionType === 'voucher' || promotionType === 'dot_giam_gia', 
                                                message: 'Vui lòng nhập phần trăm khuyến mãi!' 
                                            },
                                            {
                                                validator: (_, value) => {
                                                    if (promotionType === 'free_shipping') {
                                                        return Promise.resolve();
                                                    }
                                                    if (value <= 0 || value > 100) {
                                                        return Promise.reject('Phần trăm phải từ 1-100%');
                                                    }
                                                    return Promise.resolve();
                                                }
                                            }
                                        ]}
                                    >
                                        <InputNumber
                                            min={0}
                                            max={100}
                                            placeholder="VD: 10"
                                            style={{ width: '100%' }}
                                            disabled={promotionType === 'free_shipping' || (isLimitedEdit && !editableFields.includes('phanTramKhuyenMai'))}
                                        />
                                    </Form.Item>
                                );
                            }}
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        {isEdit && (
                            <Form.Item
                                name="trangThai"
                                label="Trạng thái"
                                rules={[
                                    { required: true, message: 'Vui lòng chọn trạng thái!' },
                                ]}
                            >
                                <Select 
                                    placeholder="Chọn trạng thái"
                                    disabled={isLimitedEdit && !editableFields.includes('trangThai')}
                                >
                                    <Option value="active">Đang hoạt động</Option>
                                    <Option value="scheduled">Đã lên lịch</Option>
                                    <Option value="expired">Đã hết hạn</Option>
                                    <Option value="inactive">Ngừng sử dụng</Option>
                                </Select>
                            </Form.Item>
                        )}
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            noStyle
                            shouldUpdate={(prevValues, currentValues) => 
                                prevValues.loai !== currentValues.loai
                            }
                        >
                            {({ getFieldValue }) => {
                                const promotionType = getFieldValue('loai');
                                return (
                                    <Form.Item
                                        name="giaTriToiThieu"
                                        label="Giá trị đơn hàng tối thiểu (VNĐ)"
                                        rules={[
                                            { 
                                                required: promotionType === 'voucher' || promotionType === 'free_shipping', 
                                                message: 'Vui lòng nhập giá trị đơn hàng tối thiểu!' 
                                            },
                                            {
                                                validator: (_, value) => {
                                                    if (promotionType === 'dot_giam_gia') {
                                                        return Promise.resolve();
                                                    }
                                                    if (value <= 0) {
                                                        return Promise.reject('Giá trị tối thiểu phải lớn hơn 0');
                                                    }
                                                    return Promise.resolve();
                                                }
                                            }
                                        ]}
                                    >
                                        <InputNumber
                                            min={0}
                                            placeholder="VD: 200000"
                                            style={{ width: '100%' }}
                                            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                            parser={value => value.replace(/\$\s?|(,*)/g, '')}
                                            disabled={promotionType === 'dot_giam_gia' || (isLimitedEdit && !editableFields.includes('giaTriToiThieu'))}
                                        />
                                    </Form.Item>
                                );
                            }}
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            noStyle
                            shouldUpdate={(prevValues, currentValues) => 
                                prevValues.loai !== currentValues.loai
                            }
                        >
                            {({ getFieldValue }) => {
                                const promotionType = getFieldValue('loai');
                                return promotionType === 'voucher' ? (
                                    <Form.Item
                                        name="giamToiDa"
                                        label="Giảm tối đa (VNĐ)"
                                        rules={[
                                            { 
                                                required: true, 
                                                message: 'Vui lòng nhập giá trị giảm tối đa!' 
                                            },
                                            {
                                                validator: (_, value) => {
                                                    if (value <= 0) {
                                                        return Promise.reject('Giá trị giảm tối đa phải lớn hơn 0');
                                                    }
                                                    const giaTriToiThieu = formInstance.getFieldValue('giaTriToiThieu');
                                                    if (giaTriToiThieu && value > giaTriToiThieu) {
                                                        return Promise.reject('Giá trị giảm tối đa không được lớn hơn giá trị đơn hàng tối thiểu');
                                                    }
                                                    return Promise.resolve();
                                                }
                                            }
                                        ]}
                                    >
                                        <InputNumber
                                            min={0}
                                            placeholder="VD: 100000"
                                            style={{ width: '100%' }}
                                            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                            parser={value => value.replace(/\$\s?|(,*)/g, '')}
                                            disabled={isLimitedEdit && !editableFields.includes('giamToiDa')}
                                        />
                                    </Form.Item>
                                ) : null;
                            }}
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            noStyle
                            shouldUpdate={(prevValues, currentValues) => 
                                prevValues.loai !== currentValues.loai
                            }
                        >
                            {({ getFieldValue }) => {
                                const promotionType = getFieldValue('loai');
                                return promotionType === 'voucher' ? (
                                    <Form.Item
                                        name="soLuong"
                                        label="Số lượng voucher"
                                        rules={[
                                            { 
                                                required: true, 
                                                message: 'Vui lòng nhập số lượng voucher!' 
                                            },
                                            {
                                                validator: (_, value) => {
                                                    if (value <= 0) {
                                                        return Promise.reject('Số lượng phải lớn hơn 0');
                                                    }
                                                    return Promise.resolve();
                                                }
                                            }
                                        ]}
                                    >
                                        <InputNumber
                                            min={1}
                                            placeholder="VD: 100"
                                            style={{ width: '100%' }}
                                            disabled={isLimitedEdit && !editableFields.includes('soLuong')}
                                        />
                                    </Form.Item>
                                ) : null;
                            }}
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="thoiGianBD"
                            label="Thời gian bắt đầu"
                            rules={[
                                { required: true, message: 'Vui lòng chọn thời gian bắt đầu!' },
                            ]}
                        >
                            <DatePicker 
                                style={{ width: '100%' }} 
                                disabled={isEdit && currentEditingPromotion?.trangThai === 'active'} // Không cho sửa nếu đang active
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="thoiGianKT"
                            label="Thời gian kết thúc"
                            rules={[
                                { required: true, message: 'Vui lòng chọn thời gian kết thúc!' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value) {
                                            return Promise.resolve();
                                        }
                                        
                                        const startDate = getFieldValue('thoiGianBD');
                                        if (!startDate) {
                                            return Promise.resolve();
                                        }

                                        // Sử dụng dayjs để so sánh chính xác
                                        if (dayjs(value).isAfter(dayjs(startDate)) || dayjs(value).isSame(dayjs(startDate))) {
                                            return Promise.resolve();
                                        }
                                        
                                        return Promise.reject(new Error('Thời gian kết thúc phải sau thời gian bắt đầu!'));
                                    },
                                }),
                            ]}
                            dependencies={['thoiGianBD']} // Thêm dependency để re-validate khi start date thay đổi
                        >
                            <DatePicker 
                                style={{ width: '100%' }}
                                disabled={isLimitedEdit && !editableFields.includes('thoiGianKT')}
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item
                    name="moTa"
                    label="Mô tả"
                >
                    <TextArea
                        rows={3}
                        placeholder="Mô tả chi tiết về khuyến mãi..."
                        disabled={isLimitedEdit && !editableFields.includes('moTa')}
                    />
                </Form.Item>

                {/* Thông báo giới hạn chỉnh sửa */}
                {isLimitedEdit && (
                    <div style={{ 
                        padding: '10px', 
                        backgroundColor: '#fff7e6', 
                        border: '1px solid #ffd591',
                        borderRadius: '4px',
                        marginBottom: '16px'
                    }}>
                        <InfoCircleOutlined style={{ color: '#fa8c16', marginRight: '8px' }} />
                        <Text>
                            Khuyến mãi này {currentEditingPromotion?.usedCount > 0 ? `đã được sử dụng ${currentEditingPromotion.usedCount} lần` : 'đang hoạt động'}, 
                            bạn chỉ có thể chỉnh sửa: {editableFields.map(field => {
                                const fieldNames = {
                                    'tenKhuyenMai': 'Tên khuyến mãi',
                                    'moTa': 'Mô tả',
                                    'trangThai': 'Trạng thái',
                                    'thoiGianKT': 'Thời gian kết thúc',
                                    'giaTriToiThieu': 'Giá trị tối thiểu',
                                    'giamToiDa': 'Giảm tối đa',
                                    'soLuong': 'Số lượng'
                                };
                                return fieldNames[field] || field;
                            }).join(', ')}
                        </Text>
                    </div>
                )}

                {/* Hiển thị chọn sản phẩm cho đợt giảm giá */}
                <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) => 
                        prevValues.loai !== currentValues.loai
                    }
                >
                    {({ getFieldValue }) => {
                        const promotionType = getFieldValue('loai');
                        return promotionType === 'dot_giam_gia' ? (
                            <Form.Item 
                                label="Chọn sản phẩm áp dụng"
                                required
                                rules={[
                                    {
                                        validator: () => {
                                            if (targetKeys.length === 0) {
                                                return Promise.reject('Vui lòng chọn ít nhất một sản phẩm!');
                                            }
                                            return Promise.resolve();
                                        }
                                    }
                                ]}
                            >
                                <Spin spinning={productsLoading}>
                                    {products.length > 0 ? (
                                        <Transfer
                                            dataSource={products.map(product => ({
                                                key: product._id,
                                                title: product.name || 'Tên sản phẩm không có',
                                                description: `${(product.price || 0).toLocaleString()}đ`,
                                                image: product.image || "https://via.placeholder.com/150"
                                            }))}
                                            titles={['Tất cả sản phẩm', 'Sản phẩm được chọn']}
                                            targetKeys={targetKeys}
                                            selectedKeys={selectedKeys}
                                            onChange={handleTransferChange}
                                            onSelectChange={handleTransferSelectChange}
                                            render={item => (
                                                <div style={{ display: 'flex', alignItems: 'center', padding: '4px' }}>
                                                    <Avatar 
                                                        src={item.image} 
                                                        size="small" 
                                                        style={{ marginRight: 8 }}
                                                    />
                                                    <div>
                                                        <div style={{ fontSize: '14px' }}>{item.title}</div>
                                                        <div style={{ fontSize: '12px', color: '#999' }}>
                                                            {item.description}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            listStyle={{
                                                width: 300,
                                                height: 300,
                                            }}
                                            showSearch
                                            filterOption={(inputValue, option) =>
                                                option.title.toLowerCase().indexOf(inputValue.toLowerCase()) > -1
                                            }
                                            disabled={isLimitedEdit && !editableFields.includes('sanPhamApDung')}
                                        />
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '20px' }}>
                                            <Text type="secondary">
                                                {productsLoading ? 'Đang tải sản phẩm...' : 'Không có sản phẩm nào'}
                                            </Text>
                                        </div>
                                    )}
                                </Spin>
                                {targetKeys.length === 0 && (
                                    <div style={{ color: '#ff4d4f', marginTop: 8 }}>
                                        Vui lòng chọn ít nhất một sản phẩm cho đợt giảm giá
                                    </div>
                                )}
                            </Form.Item>
                        ) : null;
                    }}
                </Form.Item>
            </Form>
        );
    };

    return (
        <div>
            <Spin spinning={loading}>
                <div className='container-home'>
                    <div style={{ marginTop: 20 }}>
                        <Breadcrumb>
                            <Breadcrumb.Item href="">
                                <HomeOutlined />
                            </Breadcrumb.Item>
                            <Breadcrumb.Item href="">
                                <ShoppingOutlined />
                                <span>Quản lý khuyến mãi</span>
                            </Breadcrumb.Item>
                        </Breadcrumb>
                    </div>

                    <div style={{ marginTop: 20 }}>
                        <Card>
                            <Row gutter={16} align="middle">
                                <Col span={6}>
                                    <Input.Search
                                        placeholder="Tìm kiếm theo mã, tên, mô tả khuyến mãi..."
                                        allowClear
                                        enterButton="Tìm kiếm"
                                        value={searchKeyword}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            console.log('🔍 Input onChange:', value);
                                            setSearchKeyword(value);

                                            if (value.trim() === '') {
                                                debouncedSearch.cancel(); 
                                                setPromotions(originalPromotions);
                                            } else {
                                                debouncedSearch(value);
                                            }
                                        }}
                                        onSearch={(value) => {
                                            console.log('🔍 Search button clicked');
                                            debouncedSearch.cancel();
                                            handleSearch(value);
                                        }}
                                        onPressEnter={(e) => {
                                            console.log('🔍 Enter pressed');
                                            debouncedSearch.cancel();
                                            handleSearch(e.target.value);
                                        }}
                                        style={{ width: '100%' }}
                                    />
                                </Col>
                                <Col span={4}>
                                    <Select
                                        placeholder="Loại KM"
                                        style={{ width: '100%' }}
                                        value={filterType}
                                        onChange={handleFilterTypeChange} 
                                    >
                                        <Option value="all">Tất cả loại</Option>
                                        <Option value="voucher">Voucher</Option>
                                        <Option value="dot_giam_gia">Đợt giảm giá</Option>
                                        <Option value="free_shipping">Free ship</Option>
                                    </Select>
                                </Col>
                                <Col span={4}>
                                    <Select
                                        placeholder="Trạng thái"
                                        style={{ width: '100%' }}
                                        value={filterStatus}
                                        onChange={handleFilterStatusChange} 
                                    >
                                        <Option value="all">Tất cả trạng thái</Option>
                                        <Option value="active">Đang hoạt động</Option>
                                        <Option value="scheduled">Đã lên lịch</Option>
                                        <Option value="expired">Đã hết hạn</Option>
                                        <Option value="inactive">Ngừng sử dụng</Option>
                                    </Select>
                                </Col>
                                <Col span={10} style={{ textAlign: 'right' }}>
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined style={{ color: '#fff' }} />} 
                                        onClick={showModal}
                                        style={{
                                            backgroundColor: '#1890ff',
                                            border: '1px solid #1890ff'
                                        }}
                                    >
                                        Tạo khuyến mãi mới
                                    </Button>
                                </Col>
                            </Row>
                        </Card>
                    </div>

                    <div style={{ marginTop: 20 }}>
                        <Table
                            columns={columns}
                            dataSource={promotions}
                            rowKey="_id"
                            pagination={{
                                position: ['bottomCenter'],
                                showSizeChanger: true,
                                showQuickJumper: true,
                                showTotal: (total, range) =>
                                    `${range[0]}-${range[1]} của ${total} khuyến mãi`,
                            }}
                            scroll={{ x: 1300 }}
                        />
                    </div>
                </div>

                {/* Modal tạo khuyến mãi */}
                <Modal
                    title="Tạo khuyến mãi mới"
                    open={openModalCreate}
                    onOk={() => {
                        form
                            .validateFields()
                            .then((values) => {
                                handleOkUser(values);
                            })
                            .catch((info) => {
                                console.log('Validate Failed:', info);
                            });
                    }}
                    onCancel={() => handleCancel("create")}
                    okText="Tạo khuyến mãi"
                    cancelText="Hủy"
                    width={900}
                    destroyOnClose
                >
                    {renderPromotionForm(form)}
                </Modal>

                {/* Modal cập nhật khuyến mãi */}
                <Modal
                    title="Cập nhật khuyến mãi"
                    open={openModalUpdate}
                    onOk={() => {
                        form2
                            .validateFields()
                            .then((values) => {
                                handleUpdatePromotion(values);
                            })
                            .catch((info) => {
                                console.log('Validate Failed:', info);
                            });
                    }}
                    onCancel={() => handleCancel("update")}
                    okText="Cập nhật"
                    cancelText="Hủy"
                    width={900}
                    destroyOnClose
                >
                    {renderPromotionForm(form2, true)}
                </Modal>

                <BackTop style={{ textAlign: 'right' }} />
            </Spin>
        </div>
    );
};

export default PromotionManagement;