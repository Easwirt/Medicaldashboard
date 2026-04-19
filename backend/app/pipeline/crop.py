import cv2
import os

# ===== НАСТРОЙКИ =====
INPUT_FOLDER = "../ZdraviLudia/proccesed"
OUTPUT_FOLDER = "../ZdraviLudia/cropped"
# =====================


def ensure_output_folder():
    if not os.path.exists(OUTPUT_FOLDER):
        os.makedirs(OUTPUT_FOLDER)


def center_crop_square(img):
    h, w = img.shape[:2]

    # берём меньшую сторону
    size = min(h, w)

    # вычисляем отступы (центрирование)
    start_x = (w - size) // 2
    start_y = (h - size) // 2

    cropped = img[start_y:start_y + size, start_x:start_x + size]

    return cropped


def process_all():
    ensure_output_folder()

    files = [f for f in os.listdir(INPUT_FOLDER) if f.lower().endswith(".bmp")]
    files.sort()

    for f in files:
        input_path = os.path.join(INPUT_FOLDER, f)
        output_path = os.path.join(OUTPUT_FOLDER, f)

        img = cv2.imread(input_path)
        if img is None:
            print(f"❌ Не удалось загрузить {f}")
            continue

        cropped = center_crop_square(img)

        cv2.imwrite(output_path, cropped)
        print(f"✔ {f} обработан")


if __name__ == "__main__":
    process_all()