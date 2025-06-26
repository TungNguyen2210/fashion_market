const SupplierModel = require('../models/supplier');


const SupplierController = {
    getAllSuppliers: async (req, res) => {
        const page = req.body.page || 1;
        const limit = req.body.limit || 10;

        const options = {
            page: page,
            limit: limit,
        };

        try {
            const suppliers = await SupplierModel.paginate({}, options);
            res.status(200).json({ data: suppliers });
        } catch (err) {
            res.status(500).json(err);
        }
    },

    getSupplierById: async (req, res) => {
        try {
            const supplier = await SupplierModel.findById(req.params.id);
            if (!supplier) {
                return res.status(404).json({ message: 'Supplier not found' });
            }
            res.status(200).json({ data: supplier });
        } catch (err) {
            res.status(500).json(err);
        }
    },

    createSupplier: async (req, res) => {
        const supplier = new SupplierModel({
            name: req.body.name,
            contactPerson: req.body.contactPerson,
            email: req.body.email,
            phone: req.body.phone,
            address: req.body.address,
            image: req.body.image
        });

        try {
            const newSupplier = await supplier.save();
            res.status(200).json({ data: newSupplier });
        } catch (err) {
            res.status(500).json(err);
        }
    },

    deleteSupplier: async (req, res) => {
        try {
            const supplier = await SupplierModel.findByIdAndDelete(req.params.id);
            if (!supplier) {
                return res.status(404).json({ message: 'Supplier not found' });
            }
            res.status(200).json({ message: 'Delete supplier success' });
        } catch (err) {
            res.status(500).json(err);
        }
    },

    updateSupplier: async (req, res) => {
        const { name, contactPerson, email, phone, address, image } = req.body;

        try {
            const updatedSupplier = await SupplierModel.findByIdAndUpdate(
                req.params.id,
                { name, contactPerson, email, phone, address, image },
                { new: true }
            );

            if (!updatedSupplier) {
                return res.status(404).json({ message: 'Supplier not found' });
            }

            res.status(200).json({ data: updatedSupplier });
        } catch (err) {
            res.status(500).json(err);
        }
    },

    searchSupplierByName: async (req, res) => {
        const page = req.body.page || 1;
        const limit = req.body.limit || 10;
        const name = req.query.name;

        console.log(name);
        const options = {
            page: page,
            limit: limit,
        };

        try {
            const suppliers = await SupplierModel.paginate(
                { name: { $regex: `.*${name}.*`, $options: 'i' } },
                options
            );

            res.status(200).json({ data: suppliers });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
};

module.exports = SupplierController;
