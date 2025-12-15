const ColorModel = require('../models/color');

const colorController = {
    getAllNews: async (req, res) => {
        const page = req.body.page || 1;
        const limit = req.body.limit || 10;

        const options = {
            page: page,
            limit: limit,
        };

        try {
            const colors = await ColorModel.paginate({}, options);
            res.status(200).json({ 
                success: true,
                data: colors 
            });
        } catch (err) {
            console.error('Error getting colors:', err);
            res.status(500).json({ 
                success: false,
                message: 'Lỗi khi lấy danh sách màu',
                error: err.message 
            });
        }
    },

    getNewsById: (req, res) => {
        try {
            res.status(200).json({ 
                success: true,
                data: res.color 
            });
        } catch (err) {
            console.log(err);
            res.status(500).json({ 
                success: false,
                message: 'Lỗi khi lấy thông tin màu',
                error: err.message 
            });
        }
    },

    createNews: async (req, res) => {
        try {
            const { name, description } = req.body;

            // Validate dữ liệu đầu vào
            if (!name || !description) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp đầy đủ thông tin (tên và mã màu)'
                });
            }

            // Kiểm tra trùng mã màu
            const existingColorByCode = await ColorModel.findOne({ 
                description: description.toLowerCase() 
            });
            if (existingColorByCode) {
                return res.status(400).json({
                    success: false,
                    message: 'Mã màu này đã tồn tại'
                });
            }

            // Kiểm tra trùng tên
            const existingColorByName = await ColorModel.findOne({ 
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
            });
            if (existingColorByName) {
                return res.status(400).json({
                    success: false,
                    message: 'Tên màu này đã tồn tại'
                });
            }

            // Tạo màu mới
            const color = new ColorModel({
                name: name.trim(),
                description: description.toLowerCase(),
            });

            const colorSave = await color.save();
            
            res.status(201).json({ 
                success: true,
                message: 'Tạo màu mới thành công',
                data: colorSave 
            });
        }
        catch (err) {
            console.error('Error creating color:', err);
            res.status(500).json({ 
                success: false,
                message: 'Lỗi khi tạo màu mới',
                error: err.message 
            });
        }
    },

    deleteNews: async (req, res) => {
        try {
            const color = await ColorModel.findByIdAndDelete(req.params.id);
            if (!color) {
                return res.status(404).json({ 
                    success: false,
                    message: "Màu không tồn tại" 
                });
            }
            res.status(200).json({ 
                success: true,
                message: "Xóa màu thành công" 
            });
        } catch (err) {
            console.error('Error deleting color:', err);
            res.status(500).json({ 
                success: false,
                message: 'Lỗi khi xóa màu',
                error: err.message 
            });
        }
    },

    updateNews: async (req, res) => {
        try {
            const { name, description } = req.body;

            // Validate dữ liệu đầu vào
            if (!name || !description) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp đầy đủ thông tin (tên và mã màu)'
                });
            }

            // Kiểm tra màu có tồn tại không
            const existingColor = await ColorModel.findById(req.params.id);
            if (!existingColor) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy màu'
                });
            }

            // Kiểm tra trùng mã màu (ngoại trừ chính nó)
            const duplicateColorByCode = await ColorModel.findOne({
                description: description.toLowerCase(),
                _id: { $ne: req.params.id }
            });
            if (duplicateColorByCode) {
                return res.status(400).json({
                    success: false,
                    message: 'Mã màu này đã tồn tại'
                });
            }

            // Kiểm tra trùng tên (ngoại trừ chính nó)
            const duplicateColorByName = await ColorModel.findOne({
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
                _id: { $ne: req.params.id }
            });
            if (duplicateColorByName) {
                return res.status(400).json({
                    success: false,
                    message: 'Tên màu này đã tồn tại'
                });
            }

            // Cập nhật màu
            const updatedColor = await ColorModel.findByIdAndUpdate(
                req.params.id, 
                { 
                    name: name.trim(), 
                    description: description.toLowerCase() 
                }, 
                { new: true }
            );

            res.status(200).json({ 
                success: true,
                message: 'Cập nhật màu thành công',
                data: updatedColor 
            });
        } catch (err) {
            console.error('Error updating color:', err);
            res.status(500).json({ 
                success: false,
                message: 'Lỗi khi cập nhật màu',
                error: err.message 
            });
        }
    },

    searchNewsByName: async (req, res) => {
        const page = req.body.page || 1;
        const limit = req.body.limit || 10;

        const options = {
            page: page,
            limit: limit,
        };

        const name = req.query.name;

        try {
            const colors = await ColorModel.paginate(
                { name: { $regex: `.*${name}.*`, $options: 'i' } }, 
                options
            );

            res.status(200).json({ 
                success: true,
                data: colors 
            });
        } catch (err) {
            console.error('Error searching colors:', err);
            res.status(500).json({ 
                success: false,
                message: 'Lỗi khi tìm kiếm màu',
                error: err.message 
            });
        }
    },
}

module.exports = colorController;