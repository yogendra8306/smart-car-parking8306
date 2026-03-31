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

            // Verify from backend
            const res = await fetch(`http://localhost:5000/verify/${decodedText}`);
            const data = await res.json();

            if (data.valid) {
                alert("✅ Entry Allowed");
            } else {
                alert("❌ Invalid Ticket");
            }

            scanner.stop();
        }
    );
}