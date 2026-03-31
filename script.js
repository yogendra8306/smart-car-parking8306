document.addEventListener("DOMContentLoaded", function () {

    // 🔥 YOUR LIVE BACKEND URL
    const BASE_URL = "https://yogendra-parking.onrender.com";

    // ==============================
    // ELEMENTS
    // ==============================

    const areas = {
        bike: document.getElementById("bikeArea"),
        car: document.getElementById("carArea"),
        truck: document.getElementById("truckArea")
    };

    const counters = {
        bike: document.getElementById("bikeCount"),
        car: document.getElementById("carCount"),
        truck: document.getElementById("truckCount")
    };

    const billPopup = document.getElementById("billPopup");
    const billSlot = document.getElementById("billSlot");
    const amountDisplay = document.getElementById("amountDisplay");
    const gate = document.getElementById("gate");

    const userNameInput = document.getElementById("userName");
    const vehicleInput = document.getElementById("vehicleNumber");

    let selectedSlot = null;

    // ==============================
    // BOOKINGS
    // ==============================

    let bookings = [];

    function generateUUID() {
        return "TICKET-" + Date.now();
    }

    // ==============================
    // UPDATE BOOKING UI + QR
    // ==============================

    function updateBookingUI() {

        const list = document.getElementById("bookingList");
        const count = document.getElementById("bookingCount");

        list.innerHTML = "";

        if (bookings.length === 0) {
            list.innerHTML = "<p>No bookings yet</p>";
        } else {

            bookings.forEach((b, index) => {

                const div = document.createElement("div");
                div.classList.add("booking-item");

                div.innerHTML = `
                    <div class="ticket">
                        <h4>🎫 ${b.ticketId}</h4>
                        <p><b>Slot:</b> ${b.slot}</p>
                        <p><b>Vehicle:</b> ${b.vehicle}</p>
                        <p><b>Name:</b> ${b.name}</p>
                        <div id="qr-${index}" class="qr-box"></div>
                    </div>
                `;

                list.appendChild(div);

                new QRCode(document.getElementById(`qr-${index}`), {
                    text: b.ticketId,
                    width: 100,
                    height: 100
                });
            });
        }

        count.innerText = bookings.length;
    }

    // ==============================
    // CONFIG
    // ==============================

    const config = {
        bike: { count: 40, price: 20, icon: "🏍", color: "#00e5ff" },
        car: { count: 30, price: 50, icon: "🚗", color: "#00ccff" },
        truck: { count: 10, price: 100, icon: "🚚", color: "#ff9900" }
    };

    // ==============================
    // CREATE SLOTS
    // ==============================

    function createSlots(type) {

        const { count, price, icon, color } = config[type];
        const area = areas[type];

        for (let i = 1; i <= count; i++) {

            const slot = document.createElement("div");
            slot.className = "slot";
            slot.dataset.booked = "false";
            slot.dataset.type = type;
            slot.dataset.price = price;

            slot.innerHTML = `
                <div class="slot-icon">${icon}</div>
                <div class="slot-number">${type.toUpperCase()}-${i}</div>
            `;

            slot.style.border = `2px solid ${color}`;

            slot.addEventListener("click", function () {

                if (slot.dataset.booked === "true") return;

                document.querySelectorAll(".slot").forEach(s => {
                    s.classList.remove("selected");
                });

                slot.classList.add("selected");
                selectedSlot = slot;

                billSlot.innerText = slot.querySelector(".slot-number").innerText;
                amountDisplay.innerText = "Amount: ₹" + price;

                billPopup.style.display = "flex";
            });

            area.appendChild(slot);
        }

        updateAvailable();
    }

    // ==============================
    // UPDATE AVAILABLE
    // ==============================

    function updateAvailable() {
        Object.keys(config).forEach(type => {
            const available = [...areas[type].children]
                .filter(slot => slot.dataset.booked === "false").length;

            counters[type].innerText = available;
        });
    }

    // ==============================
    // 💳 PAYMENT FUNCTION
    // ==============================

    window.payNow = async function () {

        if (!selectedSlot) {
            alert("Select a slot!");
            return;
        }

        const name = userNameInput.value.trim();
        const vehicle = vehicleInput.value.trim();

        if (!name || !vehicle) {
            alert("Fill all details!");
            return;
        }

        const amount = selectedSlot.dataset.price;

        try {

            // 🔥 CREATE ORDER
            const res = await fetch(`${BASE_URL}/create-order`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount })
            });

            const order = await res.json();

            const options = {
                key: "YOUR_KEY_ID", // 🔥 PUT YOUR REAL KEY
                amount: order.amount,
                currency: "INR",
                name: "Yogendra Parking",
                description: "Slot Booking",
                order_id: order.id,

                handler: async function () {

                    alert("✅ Payment Successful");

                    const ticketId = generateUUID();

                    // 🔥 SAVE TO DB
                    await fetch(`${BASE_URL}/book`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            ticketId: ticketId,
                            slot: billSlot.innerText,
                            vehicle: vehicle,
                            name: name,
                            type: selectedSlot.dataset.type
                        })
                    });

                    // 🔥 LOCAL STORE
                    bookings.push({
                        ticketId,
                        slot: billSlot.innerText,
                        type: selectedSlot.dataset.type,
                        vehicle,
                        name
                    });

                    updateBookingUI();

                    // 🔥 LOCK SLOT
                    selectedSlot.dataset.booked = "true";
                    selectedSlot.classList.add("booked");

                    billPopup.style.display = "none";

                    // 🚪 Gate animation
                    gate.classList.add("open");
                    setTimeout(() => gate.classList.remove("open"), 2500);

                    updateAvailable();
                }
            };

            const rzp = new Razorpay(options);
            rzp.open();

        } catch (err) {
            console.error(err);
            alert("❌ Payment Failed");
        }
    };

    // ==============================
    // CLOSE POPUP
    // ==============================

    window.closePopup = function () {
        billPopup.style.display = "none";
    };

    // ==============================
    // INIT
    // ==============================

    createSlots("bike");
    createSlots("car");
    createSlots("truck");
});