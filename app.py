from flask import Flask, jsonify, request
from flask_cors import CORS
from razorpay import Client
import mysql.connector
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ==============================
# DATABASE CONNECTION FUNCTION
# ==============================

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="yogendra@93",
        database="car_parking"
    )

# ==============================
# RAZORPAY SETUP
# ==============================

razorpay_client = Client(auth=("YOUR_KEY_ID", "YOUR_KEY_SECRET"))

# ==============================
# HOME ROUTE (LIVE TABLE)
# ==============================

@app.route("/")
def home():
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT slots.id, slots.slot_name, slots.status,
               locations.location_name
        FROM slots
        JOIN locations ON slots.location_id = locations.id
        ORDER BY slots.id
    """)

    slots = cursor.fetchall()
    cursor.close()
    db.close()

    html = """
    <html>
    <head>
        <meta http-equiv="refresh" content="3">
        <title>Smart Parking</title>
        <style>
            body { font-family: Arial; text-align:center; }
            table { margin:auto; border-collapse: collapse; }
            th, td { padding:8px 12px; border:1px solid #ccc; }
            th { background:#222; color:white; }
        </style>
    </head>
    <body>
    <h1>🚗 Smart Parking Slots (Live Update)</h1>
    <p>Page auto-refreshes every 3 seconds</p>
    <table>
        <tr>
            <th>ID</th>
            <th>Slot</th>
            <th>Status</th>
            <th>Location</th>
        </tr>
    """

    for slot in slots:
        color = "green" if slot['status'] == "AVAILABLE" else "red"
        html += f"""
        <tr>
            <td>{slot['id']}</td>
            <td>{slot['slot_name']}</td>
            <td style='color:{color}; font-weight:bold'>
                {slot['status']}
            </td>
            <td>{slot['location_name']}</td>
        </tr>
        """

    html += "</table></body></html>"
    return html


# ==============================
# CREATE ORDER (NO SLOT UPDATE HERE)
# ==============================

@app.route("/create-order", methods=["POST"])
def create_order():
    try:
        data = request.json

        slot_name = data['slot']
        name = data['name']
        vehicle = data['vehicle']
        booking_date = data['date']
        start_time = data['startTime']
        end_time = data['endTime']

        db = get_db_connection()
        cursor = db.cursor()

        # Check slot status
        cursor.execute("SELECT status FROM slots WHERE slot_name=%s", (slot_name,))
        result = cursor.fetchone()

        if result and result[0] == "BOOKED":
            cursor.close()
            db.close()
            return jsonify({"error": "Slot already booked"}), 400

        # Calculate amount
        fmt = "%H:%M"
        t1 = datetime.strptime(start_time, fmt)
        t2 = datetime.strptime(end_time, fmt)

        hours = abs((t2 - t1).seconds) / 3600
        amount = int(hours * 50)
        if amount <= 0:
            amount = 50

        order_amount = amount * 100

        # Create Razorpay order
        order = razorpay_client.order.create({
            "amount": order_amount,
            "currency": "INR",
            "receipt": f"rcpt_{slot_name}",
            "payment_capture": 1
        })

        # Insert booking with PENDING status
        cursor.execute("""
            INSERT INTO bookings 
            (slot_name, user_name, vehicle_number, booking_date,
             start_time, end_time, amount, payment_status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'PENDING')
        """, (slot_name, name, vehicle, booking_date,
              start_time, end_time, amount))

        db.commit()
        cursor.close()
        db.close()

        return jsonify({
            "id": order["id"],
            "amount": order_amount
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==============================
# VERIFY PAYMENT (SECURE)
# ==============================

@app.route("/verify-payment", methods=["POST"])
def verify_payment():
    try:
        data = request.json

        razorpay_order_id = data['razorpay_order_id']
        razorpay_payment_id = data['razorpay_payment_id']
        razorpay_signature = data['razorpay_signature']
        slot_name = data['slot']

        # Verify signature
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        })

        db = get_db_connection()
        cursor = db.cursor()

        # Update booking to PAID
        cursor.execute("""
            UPDATE bookings 
            SET payment_status='PAID',
                razorpay_payment_id=%s
            WHERE slot_name=%s
            ORDER BY id DESC LIMIT 1
        """, (razorpay_payment_id, slot_name))

        # Now update slot
        cursor.execute(
            "UPDATE slots SET status='BOOKED' WHERE slot_name=%s",
            (slot_name,)
        )

        db.commit()
        cursor.close()
        db.close()

        return jsonify({"status": "Payment Verified & Slot Booked ✅"})

    except Exception as e:
        return jsonify({"error": "Payment Verification Failed"}), 400


# ==============================
# RUN SERVER
# ==============================

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)