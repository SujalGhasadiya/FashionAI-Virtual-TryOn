import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import os
import pickle
from torch.utils.data import Dataset, DataLoader

# ==============================
# 1️⃣ DEVICE
# ==============================
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Using device:", device)

# ==============================
# 2️⃣ LOAD TRAINED MODEL
# ==============================
model = models.resnet18(weights=None)

num_features = model.fc.in_features
model.fc = nn.Linear(num_features, 2)

model.load_state_dict(torch.load(
    r"D:\Projects\FashionAI\models\clothing_model.pth",
    map_location=device
))

# Remove classifier layer to get embeddings
model.fc = nn.Identity()

model = model.to(device)
model.eval()

print("Model loaded successfully!")

# ==============================
# 3️⃣ TRANSFORM
# ==============================
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        [0.485, 0.456, 0.406],
        [0.229, 0.224, 0.225]
    )
])

# ==============================
# 4️⃣ DATASET CLASS
# ==============================
class ClothingDataset(Dataset):

    def __init__(self, root):

        self.items = []

        for class_name in ["upper", "lower"]:

            class_path = os.path.join(root, class_name)

            for img in os.listdir(class_path):

                if not img.lower().endswith((".jpg", ".jpeg", ".png")):
                    continue

                path = os.path.join(class_path, img)

                self.items.append((img, path, class_name))

    def __len__(self):
        return len(self.items)

    def __getitem__(self, idx):

        img_name, path, class_name = self.items[idx]

        image = Image.open(path).convert("RGB")
        image = transform(image)

        return image, img_name, class_name


# ==============================
# 5️⃣ LOAD DATA
# ==============================
data_root = r"D:\Projects\FashionAI\datasets\combined_dataset"

dataset = ClothingDataset(data_root)

loader = DataLoader(
    dataset,
    batch_size=32,      # GPU batching
    shuffle=False,
    num_workers=0       # safe for Windows
)

print("Total images:", len(dataset))

# ==============================
# 6️⃣ EXTRACT EMBEDDINGS
# ==============================
embeddings = {}

count = 0

with torch.no_grad():

    for images, names, classes in loader:

        images = images.to(device)

        features = model(images)

        features = features.cpu().numpy()

        for i in range(len(names)):

            embeddings[names[i]] = {
                "class": classes[i],
                "vector": features[i]
            }

        count += len(names)

        if count % 1000 == 0:
            print("Processed:", count)

print("Total embeddings extracted:", len(embeddings))

# ==============================
# 7️⃣ SAVE EMBEDDINGS
# ==============================
save_path = r"D:\Projects\FashionAI\models\embeddings.pkl"

with open(save_path, "wb") as f:
    pickle.dump(embeddings, f)

print("Embeddings saved successfully at:", save_path)