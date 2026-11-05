# FASHN VTON v1.5: Efficient Maskless Virtual Try-On in Pixel Space

<div align="center">
  <a href="https://fashn.ai/research/vton-1-5"><img src='https://img.shields.io/badge/Project-Page-1A1A1A?style=flat' alt='Project Page'></a>&ensp;
  <a href='https://huggingface.co/fashn-ai/fashn-vton-1.5'><img src='https://img.shields.io/badge/Hugging%20Face-Model-FFD21E?style=flat&logo=HuggingFace&logoColor=FFD21E' alt='Hugging Face Model'></a>&ensp;
  <a href="https://huggingface.co/spaces/fashn-ai/fashn-vton-1.5"><img src='https://img.shields.io/badge/Hugging%20Face-Spaces-FFD21E?style=flat&logo=HuggingFace&logoColor=FFD21E' alt='Hugging Face Spaces'></a>&ensp;
  <a href=""><img src='https://img.shields.io/badge/arXiv-Coming%20Soon-b31b1b?style=flat&logo=arXiv&logoColor=b31b1b' alt='arXiv'></a>&ensp;
  <a href="LICENSE"><img src='https://img.shields.io/badge/License-Apache--2.0-gray?style=flat' alt='License'></a>
</div>

by [FASHN AI](https://fashn.ai)

Virtual try-on model that generates photorealistic images directly in pixel space without requiring segmentation masks.

<p align="center">
  <img src="https://static.fashn.ai/repositories/fashn-vton-v15/results/hero_collage.webp" alt="FASHN VTON v1.5 examples" width="900">
</p>

This repo contains minimal inference code to run virtual try-on with the FASHN VTON v1.5 model weights. Given a person image and a garment image, the model generates a photorealistic image of the person wearing the garment. Supports both model photos and flat-lay product shots as garment inputs.

---

## Complete Setup For This Workspace (Windows + Conda)

If your workspace is organized like this:

- `D:/VirtualTryon/FashionAI`
- `D:/VirtualTryon/TryOn/fashn-vton-1.5`

use the steps below to set up everything end-to-end.

### 1. Create and activate environment

```powershell
conda create -n vton python=3.10 -y
conda activate vton
python --version
```

### 2. Install PyTorch (CUDA 12.4)

```powershell
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
```

If you do not use GPU CUDA, install CPU builds instead from PyPI.

### 3. Install FashionAI dependencies

```powershell
cd D:/VirtualTryon
pip install -r FashionAI/requirements.txt
```

### 4. Install TryOn dependencies

```powershell
cd D:/VirtualTryon
pip install -r TryOn/fashn-vton-1.5/requirements.txt
```

### 5. Install local TryOn package

`fashn_vton` is a local package from `src`, so install editable:

```powershell
cd D:/VirtualTryon/TryOn/fashn-vton-1.5
pip install -e .
```

### 6. Download TryOn weights

```powershell
cd D:/VirtualTryon/TryOn/fashn-vton-1.5
python scripts/download_weights.py --weights-dir ./weights
```

### 7. Verify installation

```powershell
python -c "import torch, cv2, transformers, onnxruntime, fashn_vton; print('OK')"
```

### 8. Run TryOn web app

```powershell
cd D:/VirtualTryon/TryOn/fashn-vton-1.5
python web_app.py
```

Then open the local URL shown in terminal.

### 9. Run FashionAI recommendation engine

```powershell
cd D:/VirtualTryon/FashionAI/training
python compatibility_engine.py
```

### 10. Important note for new wardrobe images

If you add new wardrobe photos, regenerate embeddings before running recommendations again.

---

## Optional Services (No Docker)

For full web product workflows (auth, jobs, DB), install locally:

1. PostgreSQL (port `5432`)
2. Redis or Memurai (port `6379`)

Then install backend packages in `vton`:

```powershell
pip install fastapi uvicorn sqlalchemy alembic psycopg[binary] redis celery python-jose[cryptography] passlib[bcrypt] python-multipart pydantic-settings
```

---

## Troubleshooting

### `ModuleNotFoundError: No module named 'fashn_vton'`

```powershell
cd D:/VirtualTryon/TryOn/fashn-vton-1.5
pip install -e .
```

### `ModuleNotFoundError: No module named 'torch'`

```powershell
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
```

### Typo error: `pyhton is not recognized`

Use `python`, not `pyhton`.

---

## Local Installation

We recommend using a virtual environment:

```bash
git clone https://github.com/fashn-AI/fashn-vton-1.5.git
cd fashn-vton-1.5
python -m venv .venv && source .venv/bin/activate
pip install -e .
```

**Note:** Installation includes `onnxruntime-gpu` for GPU-accelerated pose detection. Ensure CUDA is properly configured on your system. For CPU-only environments, replace with the CPU version:

```bash
pip uninstall onnxruntime-gpu && pip install onnxruntime
```

---

## Model Weights

Download the required model weights (~2 GB total):

```bash
python scripts/download_weights.py --weights-dir ./weights
```

This downloads:
- `model.safetensors` — TryOnModel weights from [HuggingFace](https://huggingface.co/fashn-ai/fashn-vton-1.5)
- `dwpose/` — DWPose ONNX models for pose detection

**Note:** The human parser weights (~244 MB) are automatically downloaded on first use to the HuggingFace cache folder. Set `HF_HOME` to customize the location.

---

## Usage

```python
from fashn_vton import TryOnPipeline
from PIL import Image

# Initialize pipeline (automatically uses GPU if available)
pipeline = TryOnPipeline(weights_dir="./weights")

# Load images
person = Image.open("examples/data/model.webp").convert("RGB")
garment = Image.open("examples/data/garment.webp").convert("RGB")

# Run inference
result = pipeline(
    person_image=person,
    garment_image=garment,
    category="tops",  # "tops" | "bottoms" | "one-pieces"
)

# Save output
result.images[0].save("output.png")
```

### CLI

```bash
python examples/basic_inference.py \
    --weights-dir ./weights \
    --person-image examples/data/model.webp \
    --garment-image examples/data/garment.webp \
    --category tops
```

**Note:** The pipeline automatically uses GPU if available. The try-on model weights are stored in bfloat16 and will run in bf16 precision on Ampere+ GPUs (RTX 30xx/40xx, A100, H100). On older hardware or CPU, weights are converted to float32.

See [`examples/basic_inference.py`](examples/basic_inference.py) for additional options.

---

## Categories

| Category | Description |
|----------|-------------|
| `tops` | Upper body: t-shirts, blouses, jackets |
| `bottoms` | Lower body: pants, skirts, shorts |
| `one-pieces` | Full body: dresses, jumpsuits |

---

## API

FASHN provides a suite of [fashion AI APIs](https://fashn.ai/products/api) including virtual try-on, model generation, image-to-video, and more. See the [docs](https://docs.fashn.ai/) to get started.

---

## Citation

If you use FASHN VTON v1.5 in your research, please cite:

```bibtex
@article{bochman2026fashnvton,
  title={FASHN VTON v1.5: Efficient Maskless Virtual Try-On in Pixel Space},
  author={Bochman, Dan and Bochman, Aya},
  journal={arXiv preprint},
  year={2026},
  note={Paper coming soon}
}
```

---

## License

Apache-2.0. See [LICENSE](LICENSE) for details.

**Third-party components:**
- [DWPose](https://github.com/IDEA-Research/DWPose) (Apache-2.0)
- [YOLOX](https://github.com/Megvii-BaseDetection/YOLOX) (Apache-2.0)
- [fashn-human-parser](https://github.com/fashn-AI/fashn-human-parser) ([License](https://github.com/fashn-AI/fashn-human-parser?tab=readme-ov-file#license))

