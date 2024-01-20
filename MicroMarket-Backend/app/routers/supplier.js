const supplierController = require("../controllers/supplierController"); 
const router = require("express").Router();
const middleware = require('../utils/middleware');

router.get('/searchByName', middleware.checkLogin, supplierController.searchSupplierByName);
router.post('/create', middleware.checkLogin, supplierController.createSupplier);
router.get('/', supplierController.getAllSuppliers);
router.get('/:id', supplierController.getSupplierById);
router.put('/:id', middleware.checkLogin, supplierController.updateSupplier);
router.delete('/:id', middleware.checkLogin, supplierController.deleteSupplier);

module.exports = router;
