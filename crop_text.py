from PIL import Image

try:
    img = Image.open('content/images/poster.jpeg')
    # The image is 1179 x 2096. 
    # Let's crop a few sections to find where the text is.
    
    # Try the top part roughly where the text should be below the logo
    box1 = (0, 450, 1179, 750)
    cropped1 = img.crop(box1)
    cropped1.save('content/images/cropped_1.jpg')
    print("Saved cropped_1.jpg")
except Exception as e:
    print(f"Error: {e}")
