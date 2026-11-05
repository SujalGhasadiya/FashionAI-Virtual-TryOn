import os
import shutil

base_path = r"D:\Projects\FashionAI\datasets\deepfashion"
bbox_file = os.path.join(base_path, "Anno", "list_bbox_inshop.txt")
eval_file = os.path.join(base_path, "Eval", "list_eval_partition.txt")

# IMPORTANT FIX
img_root = base_path  # DO NOT add "img" here

filtered_root = r"D:\Projects\FashionAI\datasets\filtered"
upper_path = os.path.join(filtered_root, "upper")
lower_path = os.path.join(filtered_root, "lower")

os.makedirs(upper_path, exist_ok=True)
os.makedirs(lower_path, exist_ok=True)

print("Reading train split...")

train_images = set()
with open(eval_file, 'r') as f:
    lines = f.readlines()[2:]
    for line in lines:
        img_name, item_id, status = line.strip().split()
        if status == "train":
            train_images.add(img_name)

print("Total train images:", len(train_images))

print("Filtering images...")

copied_upper = 0
copied_lower = 0

with open(bbox_file, 'r') as f:
    lines = f.readlines()[2:]

for line in lines:
    parts = line.strip().split()
    img_name = parts[0]
    cloth_type = int(parts[1])

    if img_name in train_images:
        src = os.path.join(img_root, img_name)

        if os.path.exists(src):

            # Create unique filename
            new_name = img_name.replace("/", "_")
            dst_upper = os.path.join(upper_path, new_name)
            dst_lower = os.path.join(lower_path, new_name)

            if cloth_type == 1:
                shutil.copy(src, dst_upper)
                copied_upper += 1
            elif cloth_type == 2:
                shutil.copy(src, dst_lower)
                copied_lower += 1

print("Upper copied:", copied_upper)
print("Lower copied:", copied_lower)
print("Filtering completed!")