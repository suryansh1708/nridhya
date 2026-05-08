from PIL import Image
import collections

img = Image.open('content/images/learn_art_text.png').convert('RGBA')
print(f"Size: {img.size}")
pixels = list(img.getdata())
counter = collections.Counter(pixels)
print("Most common colors:", counter.most_common(5))
