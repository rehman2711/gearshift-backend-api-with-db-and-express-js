// =================  IMPORTS =======================

const express = require("express");
const connection = require("./connection");
const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = require("./awsConfig");
require("dotenv").config();
const cors = require("cors");
const { swaggerUi, swaggerSpec } = require("./swagger");
const { rateLimit } = require("express-rate-limit");

// ===================================================

const app = express();

// ================= MIDDLEWARES ====================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use("/uploads", express.static("my-uploads"));

// setting cors policy
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:4407",
  "https://gearshift-rentals.vercel.app",
  "https://gearshift-api-latest.onrender.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // Allow server-to-server or Postman

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// ==== Rate Limiting Middleware
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  limit: 10, // Limit each IP to 10 requests per `window` (here, per 1 minutes).
  standardHeaders: "draft-8", // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
  // store: ... , // Redis, Memcached, etc. See below.
});

// Apply the rate limiting middleware to all requests.
app.use(limiter);

// ============= SWAGGER =============

// Swagger UI route
app.use("/gearshift-api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /api/hello:
 *   get:
 *     summary: Returns hello message
 *     tags: [General]
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Hello from Express API!
 */

// ===================================================

const PORT = process.env.PORT || 4407;

// ================= MULTER CONFIG ===================

const storage = multerS3({
  s3,
  bucket: process.env.BUCKET,
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  key: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;

    // Store inside folder: gearshift-images/
    cb(null, "gearshift-images/" + uniqueName);
  },
});

const upload = multer({ storage: storage });

// ===================================================

app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});

// ===============  SELECT ROUTE  =========================

/**
 * @swagger
 * /api/v1/all-cars:
 *   get:
 *     summary: Get all cars
 *     tags: [Cars]
 *     responses:
 *       200:
 *         description: Returns all cars
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
app.get("/api/v1/all-cars", async (req, res) => {
  try {
    var SelectQuery = `select * from cars`;

    const response = await connection.execute(SelectQuery);
    console.log(response?.[0]);
    res.send(response?.[0]);
  } catch (error) {
    console.log(`Error occured while fetching data ${error}`);
  }
});
// ===================================================

// ===============  SINGLE CAR DATA   ================

/**
 * @swagger
 * /api/v1/single-car/{idd}:
 *   get:
 *     summary: Get single car by ID
 *     tags: [Cars]
 *     parameters:
 *       - in: path
 *         name: idd
 *         schema:
 *           type: integer
 *         required: true
 *         description: Car ID
 *     responses:
 *       200:
 *         description: Single car data
 */
app.get("/api/v1/single-car/:idd", async (req, res) => {
  try {
    const { idd } = req.params;
    const singleCarFetchQuery = `SELECT * FROM cars WHERE id = ${idd}`;
    const singleCarResponse = await connection.execute(singleCarFetchQuery);
    console.log(singleCarResponse?.[0]);
    res.send(singleCarResponse?.[0]);
  } catch (error) {
    console.log(`Error occured while fetching single car data ${error}`);
  }
});
// ===================================================

// ========== INSERT DATA ROUTE  ====================

/**
 * @swagger
 * /api/v1/insert-car:
 *   post:
 *     summary: Insert a new car (with images)
 *     tags: [Cars]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               carName:
 *                 type: string
 *               carDescription:
 *                 type: string
 *               carSlogan:
 *                 type: string
 *               carCurrency:
 *                 type: string
 *               carRent:
 *                 type: string
 *               carManufactureYear:
 *                 type: string
 *               carBrandName:
 *                 type: string
 *               carModelName:
 *                 type: string
 *               carFuelType:
 *                 type: string
 *               carMileage:
 *                 type: string
 *               carGearSystem:
 *                 type: string
 *               carSeatingCapacity:
 *                 type: string
 *               carStorageCapacity:
 *                 type: string
 *               carStatus:
 *                 type: string
 *               carAvailableDate:
 *                 type: string
 *               carImageMain:
 *                 type: string
 *                 format: binary
 *               carImageSub1:
 *                 type: string
 *                 format: binary
 *               carImageSub2:
 *                 type: string
 *                 format: binary
 *               carImageSub3:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Car inserted successfully
 */
app.get("/form", (req, res) => {
  res.render("form.ejs");
});

app.post(
  "/api/v1/insert-car",
  upload.fields([
    { name: "carImageMain", maxCount: 1 },
    { name: "carImageSub1", maxCount: 1 },
    { name: "carImageSub2", maxCount: 1 },
    { name: "carImageSub3", maxCount: 1 },
  ]),
  async (req, res) => {
    const {
      carName,
      carDescription,
      carSlogan,
      carCurrency,
      carRent,
      carManufactureYear,
      carBrandName,
      carModelName,
      carFuelType,
      carMileage,
      carGearSystem,
      carSeatingCapacity,
      carStorageCapacity,
      carStatus,
      carAvailableDate,
    } = req.body;

    console.log(req.files);

    const main = req.files.carImageMain[0].key;
    const sub1 = req.files.carImageSub1[0].key;
    const sub2 = req.files.carImageSub2[0].key;
    const sub3 = req.files.carImageSub3[0].key;

    const carInsertQuery = `INSERT INTO cars (	
    carName	,
		carDescription	,
	  carSlogan	,
	  carCurrency	,
		carRent,
		carManufactureYear	,
		carBrandName	,
		carModelName,
		carFuelType	,
		carMileage,
		carGearSystem	,
		carSeatingCapacity	,
		carStorageCapacity	,
		carStatus	,
		carAvailableDate,
  	carImageMain,
		carImageSub1	,
	  carImageSub2	,
	  carImageSub3) 
    VALUES ( 
      "${carName}",
      "${carDescription}",
      "${carSlogan}",
      "${carCurrency}",
      "${carRent}",
      "${carManufactureYear}",
      "${carBrandName}",
      "${carModelName}",
      "${carFuelType}",
      "${carMileage}",
      "${carGearSystem}",
      "${carSeatingCapacity}",
      "${carStorageCapacity}",
      "${carStatus}",
      "${carAvailableDate}",
      "${main}",
      "${sub1}",
      "${sub2}",
      "${sub3}"
    )`;

    try {
      const insertResponse = await connection.execute(carInsertQuery);
      console.log(insertResponse);
      res.status(200).json({ message: "Inserted Data Successfully" });
    } catch (error) {
      console.log("Error Inserting Data", error);
    }
  },
);

// ===================================================

// ===============  EDIT CAR DATA   ================

/**
 * @swagger
 * /api/v1/edit-car/{id}:
 *   patch:
 *     summary: Edit existing car data
 *     tags: [Cars]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Car ID
 *     requestBody:
 *       required: false
 *     responses:
 *       200:
 *         description: Car updated successfully
 */
app.patch(
  "/api/v1/edit-car/:id",
  upload.fields([
    { name: "carImageMain", maxCount: 1 },
    { name: "carImageSub1", maxCount: 1 },
    { name: "carImageSub2", maxCount: 1 },
    { name: "carImageSub3", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;

      console.log("BODY:", req.body); // <-- MUST show fields
      console.log("FILES:", req.files);

      const {
        carName,
        carDescription,
        carSlogan,
        carCurrency,
        carRent,
        carManufactureYear,
        carBrandName,
        carModelName,
        carFuelType,
        carMileage,
        carGearSystem,
        carSeatingCapacity,
        carStorageCapacity,
        carStatus,
        carAvailableDate,
      } = req.body;

      const files = req.files ?? {};

      console.log(req.file);

      const { carImageMain, carImageSub1, carImageSub2, carImageSub3 } = files;

      if (carImageMain) {
        var editCarMainImage = `UPDATE cars set carImageMain="${carImageMain[0].key}"  WHERE id = ${id}`;
        await connection.execute(editCarMainImage);
      }

      if (carImageSub1) {
        var editCarImageSub1 = `UPDATE cars set carImageSub1="${carImageSub1[0].key}"  WHERE id = ${id}`;
        await connection.execute(editCarImageSub1);
      }

      if (carImageSub2) {
        var editCarImageSub2 = `UPDATE cars set carImageSub2="${carImageSub2[0].key}"  WHERE id = ${id}`;
        await connection.execute(editCarImageSub2);
      }

      if (carImageSub3) {
        var editCarImageSub3 = `UPDATE cars set carImageSub3="${carImageSub3[0].key}"  WHERE id = ${id}`;
        await connection.execute(editCarImageSub3);
      }

      const editCarQuery = `UPDATE cars set carName = "${carName}", carDescription = "${carDescription}", carSlogan = "${carSlogan}", carCurrency = "${carCurrency}", carRent = "${carRent}", carManufactureYear = "${carManufactureYear}", carBrandName = "${carBrandName}", carModelName = "${carModelName}", carFuelType = "${carFuelType}", carMileage = "${carMileage}", carGearSystem = "${carGearSystem}", carSeatingCapacity = "${carSeatingCapacity}", carStorageCapacity = "${carStorageCapacity}", carStatus = "${carStatus}", carAvailableDate = "${carAvailableDate}" WHERE id = ${id}`;

      const editCarResponse = await connection.execute(editCarQuery);
      console.log(editCarResponse?.[0]);
      res.send(editCarResponse?.[0]);
    } catch (error) {
      console.log(`Error occured while editing car data ${error}`);
    }
  },
);
// ===================================================

// ================= DELETE ROUTE ====================

/**
 * @swagger
 * /api/v1/delete-car/{id}:
 *   delete:
 *     summary: Delete car by ID
 *     tags: [Cars]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Car ID
 *     responses:
 *       200:
 *         description: Car deleted successfully
 */
app.delete("/api/v1/delete-car/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const deleteCarQuery = `DELETE FROM cars WHERE id=${id}`;
    const deleteResponse = await connection.execute(deleteCarQuery);
    res.status(200).json({ message: "Deleted Data Successfully" });
  } catch (error) {
    console.log("Error deleting car", error);
  }
});
// ===================================================

// ==================== BOOKINGS POST=================

/**
 * @swagger
 * /api/v1/book-car:
 *   post:
 *     summary: Create a new car booking with customer details and uploaded image
 *     tags: [Bookings]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               customerName:
 *                 type: string
 *               customerMobile:
 *                 type: string
 *               customerEmail:
 *                 type: string
 *               customerGender:
 *                 type: string
 *               customerAddress:
 *                 type: string
 *               customerPAN:
 *                 type: string
 *               customerChoosenCar:
 *                 type: string
 *               customerChoosenCarFrom:
 *                 type: string
 *                 format: date
 *               customerChoosenCarTo:
 *                 type: string
 *                 format: date
 *               customerImage:
 *                 type: string
 *                 format: binary
 *             required:
 *               - customerName
 *               - customerMobile
 *               - customerEmail
 *               - customerGender
 *               - customerAddress
 *               - customerPAN
 *               - customerChoosenCar
 *               - customerChoosenCarFrom
 *               - customerChoosenCarTo
 *               - customerImage
 *     responses:
 *       200:
 *         description: Booking created successfully
 *         content:
 *           application/json:
 *             example:
 *               message: Booking Successfully
 *       500:
 *         description: Error while creating booking
 *         content:
 *           application/json:
 *             example:
 *               error: Error while making booking
 */

app.post(
  "/api/v1/book-car",
  upload.single("customerImage"),
  async (req, res) => {
    const {
      customerName,
      customerMobile,
      customerEmail,
      customerGender,
      customerAddress,
      customerPAN,
      customerChoosenCar,
      customerChoosenCarFrom,
      customerChoosenCarTo,
    } = req.body;

    console.log(req?.file?.key);
    // console.log(req.file)

    try {
      const bookingWithImageQuery = `INSERT INTO bookings (
      customerName,
      customerMobile,
      customerEmail,
      customerGender,
      customerAddress,
      customerPAN,
      customerChoosenCar,
      customerChoosenCarFrom,
      customerChoosenCarTo,
      customerImage ) 
      VALUES (
      "${customerName}",
      "${customerMobile}",
      "${customerEmail}",
      "${customerGender}",
      "${customerAddress}",
      "${customerPAN}",
      "${customerChoosenCar}",
      "${customerChoosenCarFrom}",
      "${customerChoosenCarTo}",
      "${req.file.key}"
      ) `;

      const bookingResponse = await connection.execute(bookingWithImageQuery);
      console.log(bookingResponse);

      res.status(200).json({ message: "Booking Successfully" });
    } catch (error) {
      console.log("Error while Making Booking" + error);
    }
  },
);

// ========================ALL BOOKINGS =====================================================

/**
 * @swagger
 * /api/v1/book_car:
 *   get:
 *     summary: Fetch all active car bookings
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: List of active car bookings
 *         content:
 *           application/json:
 *             example:
 *               - id: 1
 *                 customerName: John Doe
 *                 customerMobile: 9876543210
 *                 customerEmail: john@example.com
 *                 customerGender: Male
 *                 customerAddress: USA
 *                 customerPAN: ABCDE1234F
 *                 customerChoosenCar: BMW X5
 *                 customerChoosenCarFrom: "2025-01-05"
 *                 customerChoosenCarTo: "2025-01-10"
 *                 customerImage: uploaded-image-key.jpg
 *       500:
 *         description: Error while fetching bookings
 *         content:
 *           application/json:
 *             example:
 *               error: Error While fetching Bookings
 */

app.get("/api/v1/book_car", async (req, res) => {
  try {
    const fetchBookedCarsQuery = `SELECT * FROM bookings`;

    const bookedCarsQueryResponse =
      await connection.execute(fetchBookedCarsQuery);

    console.log(bookedCarsQueryResponse);
    res.send(bookedCarsQueryResponse?.[0]);
  } catch (errorr) {
    console.log("Error While fetching Bookings" + errorr);
  }
});

// =============================================================================

// =============================================================================

// ======================== DELETE BOOKINGS ( ANOTHER TABLE SHIFT) ==========

/**
 * @swagger
 * /api/v1/delete-booking/{delete_id}:
 *   delete:
 *     summary: Move booking to completed table and delete from active bookings
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: delete_id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Booking ID to move and delete
 *     responses:
 *       200:
 *         description: Booking record moved to bookings_completed and deleted from bookings
 *         content:
 *           application/json:
 *             example:
 *               message: Record Moved To Bookings Completed
 *       404:
 *         description: Booking record not found
 *         content:
 *           application/json:
 *             example:
 *               error: Booking record not found
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             example:
 *               error: Error while deleting booking
 */

app.delete("/api/v1/delete-booking/:delete_id", async (req, res) => {
  const { delete_id } = req.params;

  try {
    const shiftAndDeleteQuery = `
    INSERT INTO bookings_completed (
  customerName,
  customerMobile,
  customerEmail,
  customerGender,
  customerAddress,
  customerPAN,
  customerChoosenCar,
  customerChoosenCarFrom,
  customerChoosenCarTo,
  customerImage
)
SELECT
  customerName,
  customerMobile,
  customerEmail,
  customerGender,
  customerAddress,
  customerPAN,
  customerChoosenCar,
  customerChoosenCarFrom,
  customerChoosenCarTo,
  customerImage
FROM bookings
WHERE id = ${delete_id};

DELETE FROM bookings WHERE id = ${delete_id} `;

    const deleteBookingResponse = await connection.query(shiftAndDeleteQuery);
    console.log(deleteBookingResponse);
    res.status(200).json({ message: "Record Moved To Bookings Completed" });
  } catch (error) {
    console.log("Error while deleting booking" + error);
  }
});

// =============================================================================

// =============== BOOKINGS DELETE AREA ( COMPLETED BOOKINGS ) ==============
// STORE THE DELETED ONE IN THIS API

/**
 * @swagger
 * /api/v1/bookings_completed:
 *   get:
 *     summary: Fetch all completed bookings
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: List of completed bookings
 *         content:
 *           application/json:
 *             example:
 *               - id: 1
 *                 customerName: John Doe
 *                 customerMobile: 9876543210
 *                 customerEmail: john@example.com
 *                 customerGender: Male
 *                 customerAddress: USA
 *                 customerPAN: ABCDE1234F
 *                 customerChoosenCar: Tesla Model X
 *                 customerChoosenCarFrom: "2025-01-01"
 *                 customerChoosenCarTo: "2025-01-05"
 *                 customerImage: some-image-url.jpg
 *       500:
 *         description: Error while fetching completed bookings
 *         content:
 *           application/json:
 *             example:
 *               error: Error while fetching completed bookings
 */

app.get("/api/v1/bookings_completed", async (req, res) => {
  try {
    fetchCompletedBookingsQuery = `SELECT * FROM bookings_completed`;

    const completedBookingsQueryResponse = await connection.execute(
      fetchCompletedBookingsQuery,
    );

    console.log(completedBookingsQueryResponse);
    res.send(completedBookingsQueryResponse?.[0]);
  } catch (errorr) {
    console.log("Error While fetching Completed Bookings" + errorr);
  }
});

// ===================================================
