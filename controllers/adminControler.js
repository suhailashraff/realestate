const catchAsync = require("../utils/catchAsync");
const Property = require("../modals/propertyModal");
const Booking = require("../modals/bookingModel");
const sendEmail = require("../utils/email");

exports.addProperty = catchAsync(async (req, res, next) => {
  const { title, description, location, price, type } = req.body;

  const images = req.files.map((file) => file.path);

  const video = req.file ? req.file.path : null;

  const newProperty = new Property({
    title,
    description,
    location,
    price,
    type,
    images,
    video,
  });

  await newProperty.save();
  res.status(201).json({
    status: "success",
    message: "Property added successfully",
    property: newProperty,
  });
});

exports.deleteProperty = catchAsync(async (req, res, next) => {
  const propertyId = req.params.id;
  const deletedProperty = await Property.findByIdAndDelete(propertyId);

  res.status(204).json({
    status: "success",
    message: "The property has been deleted",
  });
});

exports.acceptPropertyVisit = catchAsync(async (req, res, next) => {
  const bookingID = await Booking.findById(req.params.id);
  const updatedBooking = await Booking.findByIdAndUpdate(bookingID, req.body, {
    new: true,
    runValidators: true,
  });

  const message = `your request is accepted.kindly visit the requested location on ${bookingID.visitDate} at ${bookingID.visitTime}. `;
  await sendEmail({
    email: "jasiahassan120@gmail.com",
    subject: "booking request",
    message,
  });
  res.status(200).json({
    status: "success",
    data: {
      booking: updatedBooking,
    },
  });
});

exports.getPendingBookings = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({ status: "pending" });
  if (bookings.length < 1) {
    return next(new AppError("There are no pending bookings", 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      bookings,
    },
  });
});
