import cv2
from ultralytics import YOLO

# Load YOLO model
model = YOLO("yolov8n.pt")  # Small YOLO model

# Open CCTV feed (replace 0 with IP camera stream or video)
cap = cv2.VideoCapture(0)  # 0 for webcam, or 'rtsp://ip_camera_url'

# Define coordinates of parking slots in the video frame
# Example: slots = { "A-1": (x1, y1, x2, y2), ... }
slots_coords = {
    "A-1": (50, 50, 150, 150),
    "A-2": (200, 50, 300, 150),
    # Add all slots with coordinates manually
}

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Detect cars
    results = model(frame)
    cars_detected = []

    for result in results:
        boxes = result.boxes.xyxy.cpu().numpy()  # x1, y1, x2, y2
        class_ids = result.boxes.cls.cpu().numpy()
        for i, cls_id in enumerate(class_ids):
            if int(cls_id) == 2:  # Class 2 = car in COCO dataset
                cars_detected.append(boxes[i])

    # Draw slots and check occupancy
    for slot_name, (x1, y1, x2, y2) in slots_coords.items():
        occupied = False
        for car_box in cars_detected:
            cx1, cy1, cx2, cy2 = car_box
            # Simple overlap check
            if not (cx2 < x1 or cx1 > x2 or cy2 < y1 or cy1 > y2):
                occupied = True
                break
        color = (0, 0, 255) if occupied else (0, 255, 0)
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        cv2.putText(frame, slot_name, (x1, y1 - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    cv2.imshow("CCTV Parking Detection", frame)

    if cv2.waitKey(1) == 27:  # ESC key to exit
        break

cap.release()
cv2.destroyAllWindows()