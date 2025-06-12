const express = require('express');
const multer = require('multer');
const uploadController = require('../controllers/uploadController');
const reconciliationController = require('../controllers/reconciliationController'); // Import reconciliationController

const router = express.Router();

// Configure multer for file storage (in memory for now)
// For actual file saving: const upload = multer({ dest: 'uploads/' });
const storage = multer.memoryStorage(); // Stores file in memory as Buffer
const upload = multer({ storage: storage });

// Route for uploading participation data (Excel/CSV)
router.post('/participation', upload.single('participationFile'), uploadController.handleParticipationUpload);

// Route for invoice reconciliation uploads
router.post('/reconciliation/upload-invoices', upload.array('invoiceFiles', 100), reconciliationController.uploadInvoices);

// NY ROUTE för ombearbetning av deltagarfil
router.post('/reprocess-participation', upload.single('participationFile'), uploadController.handleReprocessParticipation);

module.exports = router;
