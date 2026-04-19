import cv2
import numpy as np
import os

# ====== НАСТРОЙКИ ======
INPUT_FOLDER = "../Skleroza/raw"
OUTPUT_FOLDER = "../Skleroza/proccesed"

PROCESSED_PREFIX = "processed_"  # что добавить перед числом

# Порог "белого"
WHITE_THRESHOLD = 240  

# Минимальный размер объекта
MIN_AREA = 5000  

# Параметры grayscale
CONTRAST_ALPHA = 1.5
BRIGHTNESS_BETA = 0
BLUR_KERNEL = 3
# =======================


def load_image(path):
    img = cv2.imread(path)
    if img is None:
        raise ValueError(f"Не удалось загрузить: {path}")
    return img


def detect_content_bbox(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    mask = gray < WHITE_THRESHOLD
    mask = mask.astype(np.uint8) * 255

    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        raise ValueError("Контент не найден")

    largest = max(contours, key=cv2.contourArea)

    if cv2.contourArea(largest) < MIN_AREA:
        raise ValueError("Контур слишком маленький")

    return cv2.boundingRect(largest)


def crop_image(img, bbox):
    x, y, w, h = bbox

    crop = img[y:y+h, x:x+w]

    # убрать нижнюю подпись
    cut_bottom = int(0.08 * h)
    crop = crop[:h - cut_bottom, :]

    return crop


def to_grayscale(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    gray = cv2.convertScaleAbs(gray, alpha=CONTRAST_ALPHA, beta=BRIGHTNESS_BETA)

    if BLUR_KERNEL > 0:
        gray = cv2.GaussianBlur(gray, (BLUR_KERNEL, BLUR_KERNEL), 0)

    return gray


def process_all_images():
    if not os.path.exists(OUTPUT_FOLDER):
        os.makedirs(OUTPUT_FOLDER)

    files = [f for f in os.listdir(INPUT_FOLDER) if f.lower().endswith(".bmp")]
    files.sort()

    for filename in files:
        input_path = os.path.join(INPUT_FOLDER, filename)

        try:
            # обработка
            img = load_image(input_path)
            bbox = detect_content_bbox(img)
            cropped = crop_image(img, bbox)
            gray = to_grayscale(cropped)

            # ===== разбор имени =====
            name, ext = os.path.splitext(filename)

            # ищем последнюю цифру (номер)
            import re
            match = re.search(r"(.*?)(\d+)$", name)

            if match:
                base = match.group(1)
                number = match.group(2)
                new_name = f"{base}{PROCESSED_PREFIX}{number}.bmp"
            else:
                # если вдруг нет числа
                new_name = f"{PROCESSED_PREFIX}{name}.bmp"

            output_path = os.path.join(OUTPUT_FOLDER, new_name)

            cv2.imwrite(output_path, gray)

            print(f"✔ {filename} -> {new_name}")

        except Exception as e:
            print(f"❌ Ошибка с {filename}: {e}")


if __name__ == "__main__":
    process_all_images()