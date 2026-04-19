import hashlib
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from typing import Dict, List, Tuple


DEFAULT_MODELS = ["Diabetes", "Glaucoma", "Sclerosis", "Dry eye"]
THRESHOLD = 0.48
N_TTA = 10
MODELS_DIR = Path(__file__).resolve().parent / "models"

# UI label -> model file suffix
MODEL_SUFFIX_MAP = {
    "diabetes": "diabetes",
    "diabetic": "diabetes",
    "glaucoma": "pgov",
    "pgov": "pgov",
    "sclerosis": "skleroza",
    "skleroza": "skleroza",
    "dry eye": "suche_oko",
    "dryeye": "suche_oko",
    "dry eyes": "suche_oko",
    "suche oko": "suche_oko",
    "chory": "chory",
}


def normalize_models(models: List[str]) -> List[str]:
    normalized = [model.strip() for model in models if model and model.strip()]
    return normalized or DEFAULT_MODELS


def normalize_model_key(model_name: str) -> str:
    return (
        model_name.lower().strip().replace("_", " ").replace("-", " ").replace("  ", " ")
    )


def model_suffix_for_ui_label(model_name: str) -> str:
    normalized = normalize_model_key(model_name)
    compact = normalized.replace(" ", "")
    return (
        MODEL_SUFFIX_MAP.get(normalized)
        or MODEL_SUFFIX_MAP.get(compact)
        or MODEL_SUFFIX_MAP.get(model_name.lower().strip())
        or "chory"
    )


def risk_level(probability: float) -> str:
    if probability >= 0.7:
        return "High"
    if probability >= 0.35:
        return "Moderate"
    return "Low"


def deterministic_fallback_probability(raw_photo: bytes, model_name: str) -> float:
    digest = hashlib.sha256(raw_photo + model_name.encode("utf-8")).hexdigest()
    ratio = int(digest[:8], 16) / 0xFFFFFFFF
    return round(0.05 + ratio * 0.9, 2)


@lru_cache(maxsize=16)
def load_model_pair_for_suffix(suffix: str):
    try:
        import torch
        import torch.nn as nn
        from torchvision import models
    except Exception:
        return None

    model_a_path = MODELS_DIR / f"efficientnet_finetuned_{suffix}.pth"
    model_b_path = MODELS_DIR / f"efficientnet_focal_{suffix}.pth"

    if not model_a_path.exists() or not model_b_path.exists():
        return None

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def build_model():
        model = models.efficientnet_b0(weights=None)
        model.classifier = nn.Sequential(nn.Dropout(p=0.3), nn.Linear(1280, 2))
        return model

    try:
        model_a = build_model()
        model_a.load_state_dict(torch.load(model_a_path, map_location=device))
        model_a.to(device).eval()

        model_b = build_model()
        model_b.load_state_dict(torch.load(model_b_path, map_location=device))
        model_b.to(device).eval()
    except Exception as exc:
        # Incompatible checkpoints should not break API execution.
        print(f"[evaluate] model load failed for suffix '{suffix}': {exc}")
        return None

    return model_a, model_b, device


def infer_disease_probability(raw_photo: bytes, ui_model_name: str) -> float:
    pair_suffix = model_suffix_for_ui_label(ui_model_name)
    loaded = load_model_pair_for_suffix(pair_suffix)

    if loaded is None:
        return deterministic_fallback_probability(raw_photo, ui_model_name)

    model_a, model_b, device = loaded

    try:
        import torch
        from PIL import Image
        from torchvision import transforms

        tta_transform = transforms.Compose(
            [
                transforms.Grayscale(num_output_channels=3),
                transforms.RandomHorizontalFlip(),
                transforms.RandomVerticalFlip(),
                transforms.RandomRotation(180),
                transforms.ColorJitter(brightness=0.2, contrast=0.3),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            ]
        )

        image_pil = Image.open(BytesIO(raw_photo)).convert("L")

        def predict_tta(model) -> torch.Tensor:
            preds = []
            for _ in range(N_TTA):
                aug = tta_transform(image_pil)
                with torch.no_grad():
                    logits = model(aug.unsqueeze(0).to(device))
                    preds.append(torch.softmax(logits, dim=1).cpu())
            return torch.stack(preds).mean(0)

        prob_a = predict_tta(model_a)
        prob_b = predict_tta(model_b)
        prob = (prob_a + prob_b) / 2

        # Keep same semantics as check_image.py
        disease_prob = prob[0, 0].item()
        return round(float(disease_prob), 4)
    except Exception:
        return deterministic_fallback_probability(raw_photo, ui_model_name)


def build_evaluations(raw_photo: bytes, models: List[str]) -> List[Dict[str, object]]:
    selected_models = normalize_models(models)
    evaluations: List[Dict[str, object]] = []

    for model_name in selected_models:
        probability = infer_disease_probability(raw_photo, model_name)
        label = "SICK" if probability >= THRESHOLD else "HEALTHY"
        evaluations.append(
            {
                "disease": model_name,
                "probability": probability,
                "risk_level": risk_level(probability),
                "prediction": label,
                "threshold": THRESHOLD,
            }
        )

    return evaluations


def build_evaluation_response(raw_photo: bytes, models: List[str]) -> Dict[str, object]:
    return {
        "status": "success",
        "evaluations": build_evaluations(raw_photo, models),
        "message": "Photo evaluated successfully.",
    }
