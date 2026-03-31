// ==============================
// Initialize Map (Bilaspur City)
// ==============================

var map = L.map('map').setView([22.0790, 82.1390], 13);

// OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// ==============================
// Parking Locations (Bilaspur)
// ==============================

const parkingLocations = [
    {
        name: "City Mall Parking",
        coords: [22.0805, 82.1400]
    },
    {
        name: "Railway Station Parking",
        coords: [22.0780, 82.1500]
    },
    {
        name: "Airport Parking",
        coords: [22.0750, 82.1600]
    }
];

// ==============================
// Add Markers
// ==============================

parkingLocations.forEach(location => {

    let marker = L.marker(location.coords).addTo(map);

    // Create popup content safely
    const popupContent = document.createElement("div");

    popupContent.innerHTML = `
        <b>${location.name}</b><br><br>
        <button style="
            padding:6px 10px;
            background:#007bff;
            color:white;
            border:none;
            cursor:pointer;
            border-radius:5px;
        ">
            Select This Location
        </button>
    `;

    popupContent.querySelector("button").addEventListener("click", () => {
        openParking(location.name);
    });

    marker.bindPopup(popupContent);
});

// ==============================
// Open Parking Dashboard
// ==============================

function openParking(locationName) {

    localStorage.setItem("selectedLocation", locationName);

    // Redirect to dashboard
    window.location.href = "index.html";
}