from PIL import Image

try:
    img = Image.open('content/images/learn_art_text.png').convert('RGBA')
    width, height = img.size
    
    # Load pixel data
    pixels = img.load()
    
    # Find bounding box of non-white pixels
    min_x, min_y = width, height
    max_x, max_y = 0, 0
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            # If it's close to white, we consider it background and make it transparent
            if r > 240 and g > 240 and b > 240:
                pixels[x, y] = (255, 255, 255, 0)
            else:
                # Update bounding box
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y
                
    # Crop to bounding box with a small margin
    margin = 10
    crop_box = (
        max(0, min_x - margin),
        max(0, min_y - margin),
        min(width, max_x + margin),
        min(height, max_y + margin)
    )
    
    cropped_img = img.crop(crop_box)
    cropped_img.save('content/images/learn_art_text_transparent.png')
    print("Successfully extracted text and saved as learn_art_text_transparent.png")
except Exception as e:
    print(f"Error: {e}")
