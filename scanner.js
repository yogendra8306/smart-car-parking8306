function startScanner() {

    const scanner = new Html5Qrcode("reader");

    scanner.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: 250
        },
        async (decodedText) => {

            alert("QR Scanned: " + decodedText);

            try {
                const res = await fetch(`https://yogendra-parking.onrender.com/verify/${decodedText}`);
                const data = await res.json();

                if (data.valid) {
                    alert("✅ Entry Allowed");
                } else {
                    alert("❌ Invalid Ticket");
                }

            } catch (err) {
                alert("⚠️ Server Error");
                console.error(err);
            }

            scanner.stop();
        }
    );
}
