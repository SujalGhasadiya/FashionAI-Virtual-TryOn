import os
import shutil

source = r"D:\Projects\FashionAI\datasets\Re-PolyVore"
target = r"D:\Projects\FashionAI\datasets\polyvore_filtered"

upper = os.path.join(target, "upper")
lower = os.path.join(target, "lower")

os.makedirs(upper, exist_ok=True)
os.makedirs(lower, exist_ok=True)

upper_classes = ["top", "outerwear", "dress"]
lower_classes = ["pants", "skirt"]

print("Processing dataset...")

# Upper
for cls in upper_classes:

    folder = os.path.join(source, cls)

    if not os.path.exists(folder):
        continue

    for img in os.listdir(folder):
 
        src = os.path.join(folder, img)
        dst = os.path.join(upper, f"{cls}_{img}")

        shutil.copy(src, dst)

print("Upper done")

# Lower
for cls in lower_classes:

    folder = os.path.join(source, cls)

    if not os.path.exists(folder):
        continue

    for img in os.listdir(folder):

        src = os.path.join(folder, img)
        dst = os.path.join(lower, f"{cls}_{img}")

        shutil.copy(src, dst)

print("Lower done")
print("Dataset prepared!")