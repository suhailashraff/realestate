const multer = require("multer");

// Storage for user images
const userStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/users");
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `user-${uniqueSuffix}.${ext}`);
  },
});

// Storage for Property photos
const propertyPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/properties");
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e8);
    cb(null, `post-${uniqueSuffix}.${ext}`);
  },
});

// Storage for Property Videos
const propertyVideoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/videos");
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `post-${uniqueSuffix}.${ext}`);
  },
});

// MulterFilter for Photos
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please upload only images"), false);
  }
};

// Multerfilter for Videos
const multerFilterVideo = (req, file, cb) => {
  if (file.mimetype.startsWith("video")) {
    cb(null, true);
  } else {
    cb(new Error("Not a video! Please upload only videos"), false);
  }
};

// User Image
const uploadUser = multer({
  storage: userStorage,
  fileFilter: multerFilter,
});
exports.uploadUserPhotos = uploadUser.single("photo");

// Property Images
const uploadProperty = multer({
  storage: propertyPhotoStorage,
  fileFilter: multerFilter,
});
exports.uploadPropertyPhotos = uploadProperty.array("images", 10);

const uploadPropertyVedio = multer({
  storage: propertyVideoStorage,
  fileFilter: multerFilterVideo,
});
exports.uploadVideos = uploadPropertyVedio.array("vedio", 5);
