import os
import shutil

deepfashion = r"D:\Projects\FashionAI\datasets\filtered"
polyvore = r"D:\Projects\FashionAI\datasets\polyvore_filtered"

target = r"D:\Projects\FashionAI\datasets\combined_dataset"

upper = os.path.join(target, "upper")
lower = os.path.join(target, "lower")

os.makedirs(upper, exist_ok=True)
os.makedirs(lower, exist_ok=True)

def copy_images(src_folder, dst_folder, prefix):

    for img in os.listdir(src_folder):

        if not img.lower().endswith((".jpg",".png",".jpeg")):
            continue

        src = os.path.join(src_folder, img)

        new_name = prefix + "_" + img

        dst = os.path.join(dst_folder, new_name)

        shutil.copy(src, dst)


print("Copying DeepFashion...")

copy_images(os.path.join(deepfashion,"upper"), upper, "df")
copy_images(os.path.join(deepfashion,"lower"), lower, "df")

print("Copying Polyvore...")

copy_images(os.path.join(polyvore,"upper"), upper, "pv")
copy_images(os.path.join(polyvore,"lower"), lower, "pv")

print("Dataset merged successfully!")