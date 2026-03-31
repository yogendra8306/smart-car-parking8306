const Razorpay = require("razorpay");
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "yogendra@93",
    database: "parking_system"
});

db.connect(err => {
    if (err) console.log(err);
    else console.log("✅ DB Connected");
});

// Razorpay
const razorpay = new Razorpay({
    key_id: "YOUR_KEY_ID",
    key_secret: "YOUR_KEY_SECRET"
});

// HOME
app.get("/", (req, res) => {
    res.send("🚗 Parking API Running");
});

// CREATE ORDER
app.post("/create-order", async (req, res) => {
    const { amount } = req.body;

    const order = await razorpay.orders.create({
        amount: amount * 100,
        currency: "INR"
    });

    res.json(order);
});

// ✅ BOOK SLOT + UPDATE SQL
app.post("/book", (req, res) => {
    const { ticketId, slot, vehicle, name, type } = req.body;

    // 1. INSERT BOOKING
    const insertQuery = `
        INSERT INTO bookings 
        (ticket_id, slot_number, vehicle_number, user_name, vehicle_type, amount)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(insertQuery, [ticketId, slot, vehicle, name, type, 50], (err) => {

        if (err) {
            console.log(err);
            return res.status(500).send("Insert error");
        }

        // 2. UPDATE SLOT STATUS 🔥
        const updateQuery = `
            UPDATE slots SET is_booked = TRUE WHERE slot_number = ?
        `;

        db.query(updateQuery, [slot], (err2) => {

            if (err2) {
                console.log(err2);
                return res.status(500).send("Slot update error");
            }

            res.send("✅ Booking + Slot Updated");
        });
    });
});

// VERIFY QR
app.get("/verify/:id", (req, res) => {
    db.query(
        "SELECT * FROM bookings WHERE ticket_id=?",
        [req.params.id],
        (err, result) => {
            if (result.length > 0) {
                res.json({ valid: true, data: result[0] });
            } else {
                res.json({ valid: false });
            }
        }
    );
});

app.listen(5000, () => console.log("🚀 Server running"));