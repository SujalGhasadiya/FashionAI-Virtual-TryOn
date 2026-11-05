from pathlib import Path

from flask import Flask, render_template, request
from werkzeug.utils import secure_filename

from app import run_tryon


BASE_DIR = Path(__file__).resolve().parent
STATIC_ROOT = BASE_DIR.parent / "static"
app = Flask(__name__, static_folder=str(STATIC_ROOT), static_url_path="/static")

UPLOAD_FOLDER = STATIC_ROOT / "uploads"
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}


def is_allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/", methods=["GET", "POST"])
def index():
    output = None
    saved_filename = None
    error = None

    if request.method == "POST":
        person = request.files.get("person")
        cloth = request.files.get("cloth")
        category = request.form.get("category", "tops")
        garment_photo_type = request.form.get("garment_photo_type", "flat-lay")
        neck_safe_mode = request.form.get("neck_safe_mode") == "on"

        if not person or not cloth:
            error = "Please upload both person and cloth images."
        elif not is_allowed_file(person.filename) or not is_allowed_file(cloth.filename):
            error = "Only png, jpg, jpeg, and webp files are allowed."
        else:
            person_name = secure_filename(person.filename) or "person.jpg"
            cloth_name = secure_filename(cloth.filename) or "cloth.jpg"

            person_path = UPLOAD_FOLDER / f"person_{person_name}"
            cloth_path = UPLOAD_FOLDER / f"cloth_{cloth_name}"

            person.save(person_path)
            cloth.save(cloth_path)

            try:
                output = run_tryon(
                    str(person_path),
                    str(cloth_path),
                    category=category,
                    garment_photo_type=garment_photo_type,
                    neck_safe_mode=neck_safe_mode,
                )
                saved_filename = Path(output).name
            except Exception as exc:
                error = f"Try-on failed: {exc}"

    return render_template("index.html", output=output, saved_filename=saved_filename, error=error)


if __name__ == "__main__":
    app.run(debug=False)
