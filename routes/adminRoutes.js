const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const uploadUsingMulter = require("../utils/uploadUsingMulter");
const adminController = require("../controllers/adminControler");

router.use(authController.protect, authController.checkAdmin);

// Property Routes
router.post(
  "/properties",
  uploadUsingMulter.uploadPropertyPhotos,
  uploadUsingMulter.uploadVideos,
  adminController.addProperty
);

router.delete("/properties/:id", adminController.deleteProperty);

// Booking Routes
router.get("/bookings/pending", adminController.getPendingBookings);
router.patch("/bookings/:id/confirm", adminController.acceptPropertyVisit);

module.exports = router;
