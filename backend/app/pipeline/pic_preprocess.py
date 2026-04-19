import os
import uuid
from typing import Optional


def run_image_preprocessing_pipeline(sync_crop_input_with_run_output: bool = True) -> None:
    """Run preprocessing in two stages: run.py first, crop.py second.

    If sync_crop_input_with_run_output is True, crop.INPUT_FOLDER is set to
    run.OUTPUT_FOLDER so stage 2 always consumes stage 1 output.
    """
    from . import crop, run

    print("[pipeline] Stage 1/2: run.process_all_images()")
    run.process_all_images()

    if sync_crop_input_with_run_output:
        crop.INPUT_FOLDER = run.OUTPUT_FOLDER

    print("[pipeline] Stage 2/2: crop.process_all()")
    crop.process_all()


if __name__ == "__main__":
    run_image_preprocessing_pipeline()


def preprocess_single_image_for_debug(raw_photo: bytes, upload_dir: str) -> Optional[str]:
    """Preprocess a single image and save it into upload_dir.

    Returns the generated filename when preprocessing succeeds, else None.
    """
    try:
        import cv2
        import numpy as np
        from . import crop, run
    except Exception:
        return None

    np_buffer = np.frombuffer(raw_photo, dtype=np.uint8)
    image = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)
    if image is None:
        return None

    try:
        bbox = run.detect_content_bbox(image)
        processed = run.crop_image(image, bbox)
        processed = run.to_grayscale(processed)
    except Exception:
        # Fallback to source image if contour-based preprocessing fails.
        processed = image

    try:
        processed = crop.center_crop_square(processed)
    except Exception:
        pass

    os.makedirs(upload_dir, exist_ok=True)
    output_filename = f"processed_{uuid.uuid4()}.png"
    output_path = os.path.join(upload_dir, output_filename)
    success = cv2.imwrite(output_path, processed)
    if not success:
        return None
    return output_filename
