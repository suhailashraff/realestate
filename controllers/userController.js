const User = require("../modals/userModal");
const fs = require("fs");
const { promisify } = require("util");
const unlinkAsync = promisify(fs.unlink);
const crypto = require("crypto");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { signToken } = require("./authController");
const sendEmail = require("../utils/email");
const Booking = require("../modals/bookingModel");
const Property = require("../modals/propertyModal");

const filterObj = (obj, ...allowedfields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedfields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();
  res.status(200).json({
    status: "success",
    data: {
      users,
    },
  });
});

let userData;

let otp;

exports.signup = catchAsync(async (req, res, next) => {
  if (req.body.role === "admin") {
    return next(new AppError("Your are not supposed to signup as Admin", 400));
  }
  userData = req.body;
  const newUser = new User(userData);
  try {
    await newUser.validate();
  } catch (error) {
    return res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }

  const user = await User.findOne({ email: req.body.email });
  if (user) {
    return res.status(401).json({
      status: "fail",
      message: "User already exists with this email",
    });
  }

  otp = Math.floor(1000 + Math.random() * 9000).toString();
  // const message = `Your one time registration code is "${otp}"`;
  //   await sendEmail({
  //     email: req.body.email,
  //     subject: "Your OTP is valid for 10 minutes",
  //     message,
  //   });

  res.status(201).json({
    status: "success",
    message: "OTP sent successfully",
  });
});

exports.verifyOtp = catchAsync(async (req, res, next) => {
  if (req.params.otp) {
    const newUser = await User.create(userData);

    const token = signToken(newUser._id);
    const cookieOptions = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
    };

    if (process.env.NODE_ENV === "production") cookieOptions.secure = true;
    res.cookie("jwt", token, cookieOptions);

    newUser.password = undefined;

    res.status(201).json({
      status: "success",
      token,
      data: {
        user: newUser,
      },
    });
  } else {
    res.status(201).json({
      status: "Fail",
      message: "otp mismatchh",
    });
  }
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(201).json({
    status: "success",
    data: {
      user,
    },
  });
});

exports.updateUser = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.password) {
    return next(
      new AppError(
        "this route is not for password updates. please use updatePassword",
        400
      )
    );
  }

  const filteredbody = filterObj(
    req.body,
    "name",
    "email",
    "address",
    "isPublic"
  );
  if (req.user.photo) {
    try {
      await unlinkAsync(req.user.photo);
    } catch (err) {
      console.error(`no photo found`);
    }
  }
  if (req.file) {
    filteredbody.photo = req.file.path;
  }

  const user = await User.findByIdAndUpdate(req.user.id, filteredbody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  if (req.user.role === "user") {
    await User.findByIdAndUpdate(req.user.id, { active: false });
  }
  if (req.user.role === "admin") {
    await User.findByIdAndUpdate(req.params.id, { active: false });
  }
  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.loginUser = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("please provide email and password", 400));
  }

  const user = await User.findOne({ email: email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("incorrect email or password", 401));
  }
  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    token,
  });
});

exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};

exports.forgetPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("there is no user with this email address", 404));
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/api/user/resetPassword/${resetToken}`;

  const message = `forget your password? submit a patch request with your new password and password 
  confirm to ${resetURL}.\n If you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: "your password reset token (valid for 10 min)",
      message,
    });

    res.status(200).json({
      status: "success",
      message: "token send to email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordRestExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        "there was an error sending the email. try again later!",
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordRestExpires: { $gt: Date.now() },
  });
  //if token has not expired,abd there is user, set the new password
  if (!user) {
    return next(new AppError("token is invalid or has expired", 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordRestExpires = undefined;
  await user.save();
  //update changedPassswordAt property for user

  //log the user in, send jwt
  const token = signToken(user._id);

  res.status(201).json({
    status: "success",
    token,
  });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("incorrect password", 401));
  }
  //if so update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  //log user in send jwt
  const token = signToken(user._id);
  res.status(200).json({
    status: "success",
    token,
  });
});

exports.review = catchAsync(async (req, res, next) => {
  const propertyId = req.params.id;
  const { rating, comment } = req.body;
  const userId = req.user.id; // Assuming user ID is available in req.user

  const property = await Property.findById(propertyId);
  if (!property) {
    return res.status(404).json({ error: "Property not found" });
  }

  property.ratings.push({ user: userId, rating, comment });
  await property.save();

  return res.status(201).json({
    Status: "Success",
    Message: "Review Added",
  });
});

exports.updateRatingAndReview = async (req, res) => {
  const { propertyId, reviewId } = req.params;
  const { rating, comment } = req.body;

  const property = await Property.findById(propertyId);
  if (!property) {
    return res.status(404).json({ error: "Property not found" });
  }

  const reviewToUpdate = property.ratings.id(reviewId);
  if (!reviewToUpdate) {
    return res.status(404).json({ error: "Review not found" });
  }
  reviewToUpdate.rating = rating;
  reviewToUpdate.comment = comment;
  await property.save();

  res.status(200).json({
    status: "Success",
    Message: "Review Changed",
    property,
  });
};

exports.deleteReview = catchAsync(async (req, res, next) => {
  const propertyId = req.params.propertyId;
  const reviewId = req.params.reviewId;
  const userId = req.user.id;

  const property = await Property.findById(propertyId);
  if (!property) {
    return res.status(404).json({ error: "Property not found" });
  }

  const reviewIndex = property.ratings.findIndex(
    (review) => review._id.toString() === reviewId
  );
  if (reviewIndex === -1) {
    return res.status(404).json({ error: "Review not found" });
  }

  const reviewToDelete = property.ratings[reviewIndex];
  if (reviewToDelete.user.toString() !== userId) {
    return res
      .status(403)
      .json({ error: "You are not authorized to delete this review" });
  }
  property.ratings.splice(reviewIndex, 1);
  await property.save();

  return res.status(204).json({
    Status: "Success",
    Message: "Review Deleted",
  });
});

const apiFeatures = require("../utils/apiFeatures");

exports.getAllProperties = catchAsync(async (req, res, next) => {
  const features = new apiFeatures(Property.find(), req.query)
    .filter()
    .sort()
    .search();

  const properties = await features.query;
  if (properties.length == 0) {
    return next(new AppError("No properties found", 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      properties,
    },
  });
});

exports.createBooking = catchAsync(async (req, res, next) => {
  const propertyId = req.params.id;
  const userId = req.user.id;
  const newBooking = await Booking.create({
    propertyId,
    userId,
  });
  console.log(newBooking);
  const message = `${req.user.name} has requested for a booking, click here to accept: 127.0.0.1:8000/api/v1/seller/confirmbooking/${newBooking._id}"`;
  await sendEmail({
    email: "jasiahassan120@gmail.com",
    subject: "booking request",
    message,
  });
  res.status(201).json({
    status: "success",
    data: {
      booking: newBooking,
    },
  });
});
