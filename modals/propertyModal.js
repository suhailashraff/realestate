const mongoose = require("mongoose");
const User = require("./userModal");

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    // required: true,
  },
  images: [
    {
      type: String,
      // required: true,
      default: "default.jpg",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  location: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ["sell", "rent"],
  },
  video: {
    type: String,
  },
  ratings: [reviewSchema],
});

const Property = mongoose.model("Property", propertySchema);

module.exports = Property;
