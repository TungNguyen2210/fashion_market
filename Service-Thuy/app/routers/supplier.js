const supplierController = require("../controllers/supplierController"); 
const router = require("express").Router();
const middleware = require('../utils/middleware');

router.get('/searchByName', supplierController.searchSupplierByName);
router.post('/create', supplierController.createSupplier);
router.get('/', supplierController.getAllSuppliers);
router.get('/:id', supplierController.getSupplierById);
router.put('/:id', supplierController.updateSupplier);
router.delete('/:id', supplierController.deleteSupplier);

module.exports = router;
