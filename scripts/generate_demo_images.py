"""Generate realistic, high-detail demo inspection images for CUBE Round 3."""

import base64
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FRONTEND_CAPTURES = ROOT / "frontend" / "public" / "sample_captures"
BACKEND_CAPTURES = ROOT / "data" / "sample" / "photos"

FRONTEND_CAPTURES.mkdir(parents=True, exist_ok=True)
BACKEND_CAPTURES.mkdir(parents=True, exist_ok=True)

def get_font(size: int):
    # Try common Windows fonts, fallback to default
    font_names = ["arial.ttf", "segoeui.ttf", "calibri.ttf", "tahoma.ttf"]
    for name in font_names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()

def draw_barcode(draw, x, y, width, height, code_text):
    # Deterministic simulated 1D barcode pattern
    bars = []
    import hashlib
    h = hashlib.md5(code_text.encode()).hexdigest()
    pattern = bin(int(h, 16))[2:].zfill(128)
    curr_x = x
    bar_w = max(2, width // len(pattern))
    for bit in pattern:
        if bit == '1':
            draw.rectangle([curr_x, y, curr_x + bar_w - 1, y + height], fill=(15, 15, 15))
        curr_x += bar_w
    font_sm = get_font(12)
    draw.text((x + (width // 4), y + height + 3), f"* {code_text} *", fill=(20, 20, 20), font=font_sm)

def make_receiving_carton():
    img = Image.new("RGB", (800, 600), color=(185, 150, 110))
    draw = ImageDraw.Draw(img)
    # Carton texture / flaps
    draw.line([(0, 300), (800, 300)], fill=(150, 120, 85), width=3)
    draw.line([(400, 0), (400, 300)], fill=(140, 110, 75), width=2)
    # Sealing tape
    draw.rectangle([375, 0, 425, 600], fill=(225, 205, 160))
    # Shipping label sticker
    draw.rectangle([100, 80, 350, 260], fill=(250, 250, 250), outline=(80, 80, 80), width=2)
    font_bold = get_font(16)
    font_reg = get_font(13)
    font_sm = get_font(11)
    draw.text((115, 95), "PRIORITY INBOUND FREIGHT", fill=(10, 10, 10), font=font_bold)
    draw.text((115, 120), "DESTINATION: CUBE FBA DOCK 01", fill=(60, 60, 60), font=font_reg)
    draw.text((115, 140), "CTN: 1 OF 1  |  GROSS WT: 18.4 KG", fill=(60, 60, 60), font=font_reg)
    draw_barcode(draw, 115, 165, 210, 50, "CTN-98241-001")
    # Handling stamps
    draw.rectangle([500, 80, 620, 180], fill=(210, 170, 125), outline=(130, 95, 60), width=2)
    draw.text((515, 95), "THIS SIDE UP", fill=(120, 30, 30), font=font_bold)
    draw.text((545, 125), "↑ ↑", fill=(120, 30, 30), font=get_font(24))
    draw.text((515, 155), "FRAGILE / GLASS", fill=(120, 30, 30), font=font_sm)
    return img

def make_receiving_po_label():
    img = Image.new("RGB", (800, 600), color=(248, 248, 250))
    draw = ImageDraw.Draw(img)
    # Label border
    draw.rectangle([40, 40, 760, 560], fill=(255, 255, 255), outline=(40, 40, 40), width=3)
    # Header
    draw.rectangle([40, 40, 760, 110], fill=(30, 64, 175))
    draw.text((60, 55), "MASTER PURCHASE ORDER & ITEM IDENTIFIER", fill=(255, 255, 255), font=get_font(22))
    draw.text((60, 85), "AUTHORIZED INBOUND RECEIPT MANIFEST", fill=(219, 234, 254), font=get_font(13))
    # Details table
    font_bold = get_font(18)
    font_reg = get_font(15)
    fields = [
        ("PURCHASE ORDER:", "PO-98241-US"),
        ("SUPPLIER CODE:", "SUP-PACIFIC-LOGISTICS"),
        ("SKU CODE:", "SKU-BLUE-BOTTLE-001"),
        ("ASIN:", "B09X7K982"),
        ("PRODUCT TITLE:", "HydraSteel Pro 750ml Vacuum Bottle"),
        ("SPEC VARIANT:", "Blue / 750ml"),
        ("EXPECTED QUANTITY:", "24 UNITS (1 MASTER CARTON)"),
    ]
    y = 135
    for label, val in fields:
        draw.text((70, y), label, fill=(75, 85, 99), font=font_bold)
        draw.text((320, y), val, fill=(17, 24, 39), font=font_bold)
        draw.line([(70, y + 26), (730, y + 26)], fill=(229, 231, 235), width=1)
        y += 38
    # Main Barcode
    draw_barcode(draw, 140, 420, 480, 80, "SKU-BLUE-BOTTLE-001")
    return img

def make_receiving_product_variant():
    img = Image.new("RGB", (800, 600), color=(240, 243, 246))
    draw = ImageDraw.Draw(img)
    # Product surface - clean stainless insulated blue bottle
    # Bottle body
    draw.rounded_rectangle([320, 160, 480, 520], radius=24, fill=(30, 90, 180), outline=(20, 60, 130), width=2)
    # Bottle neck & cap
    draw.rounded_rectangle([360, 90, 440, 160], radius=10, fill=(30, 40, 50), outline=(15, 20, 25), width=2)
    draw.rectangle([375, 60, 425, 90], fill=(120, 130, 140))
    # Brand logo on bottle
    draw.text((355, 300), "HYDRA", fill=(255, 255, 255), font=get_font(22))
    draw.text((370, 330), "STEEL", fill=(200, 225, 255), font=get_font(16))
    # Verification banner
    draw.rectangle([50, 40, 300, 120], fill=(255, 255, 255), outline=(37, 99, 235), width=2)
    draw.text((65, 50), "COLOR / VARIANT AUDIT", fill=(37, 99, 235), font=get_font(13))
    draw.text((65, 70), "OBSERVED: PACIFIC BLUE", fill=(17, 24, 39), font=get_font(15))
    draw.text((65, 92), "INTEGRITY: 100% UNBLEMISHED", fill=(16, 185, 129), font=get_font(12))
    return img

def make_receiving_damage_closeup():
    img = Image.new("RGB", (800, 600), color=(200, 170, 130))
    draw = ImageDraw.Draw(img)
    # Cardboard corrugation texture
    for i in range(0, 600, 15):
        draw.line([(0, i), (800, i)], fill=(185, 155, 115), width=1)
    # Inspection reticle overlay
    draw.rectangle([200, 120, 600, 480], fill=None, outline=(16, 185, 129), width=3)
    draw.line([(180, 300), (620, 300)], fill=(16, 185, 129), width=1)
    draw.line([(400, 100), (400, 500)], fill=(16, 185, 129), width=1)
    # Overlay label
    draw.rectangle([210, 130, 480, 180], fill=(17, 24, 39, 200))
    draw.text((225, 138), "CORNER IMPACT & SEAM INSPECTION", fill=(255, 255, 255), font=get_font(13))
    draw.text((225, 158), "STATUS: NO CRUSHING / WATER: NONE", fill=(52, 211, 153), font=get_font(12))
    return img

def make_prep_product_front():
    return make_receiving_product_variant()

def make_prep_polybag_sealed():
    img = Image.new("RGB", (800, 600), color=(235, 240, 245))
    draw = ImageDraw.Draw(img)
    # Product inside
    draw.rounded_rectangle([320, 160, 480, 520], radius=24, fill=(30, 90, 180))
    draw.rounded_rectangle([360, 90, 440, 160], radius=10, fill=(30, 40, 50))
    # Polybag outer boundary (clear sheen)
    draw.rectangle([270, 50, 530, 550], fill=None, outline=(180, 210, 240), width=4)
    # Continuous heat seal line at top
    draw.line([(265, 75), (535, 75)], fill=(239, 68, 68), width=5)
    # Seal callout
    draw.rectangle([545, 55, 770, 125], fill=(255, 255, 255), outline=(239, 68, 68), width=2)
    draw.text((555, 65), "CONTINUOUS HEAT SEAL", fill=(239, 68, 68), font=get_font(14))
    draw.text((555, 88), "VERDICT: 100% AIRTIGHT SEALED", fill=(16, 185, 129), font=get_font(11))
    draw.text((555, 105), "BAG THICKNESS: 1.5 MIL (> 1.0 MIL)", fill=(55, 65, 81), font=get_font(11))
    return img

def make_prep_warning_label():
    img = Image.new("RGB", (800, 600), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    # Outer sticker border
    draw.rectangle([60, 80, 740, 520], fill=(255, 255, 255), outline=(0, 0, 0), width=4)
    # Warning icon
    draw.rectangle([340, 110, 460, 170], fill=(245, 158, 11))
    draw.text((365, 115), "⚠", fill=(0, 0, 0), font=get_font(40))
    # Warning text
    font_title = get_font(28)
    font_body = get_font(18)
    draw.text((310, 190), "WARNING", fill=(0, 0, 0), font=font_title)
    warning_lines = [
        "TO AVOID DANGER OF SUFFOCATION, KEEP THIS PLASTIC",
        "BAG AWAY FROM BABIES AND CHILDREN. DO NOT USE",
        "IN CRIBS, BEDS, CARRIAGES, OR PLAYPENS.",
        "THIS BAG IS NOT A TOY.",
        "",
        "AVERTISSEMENT: POUR ÉVITER LE DANGER DE SUFFOCATION,",
        "GARDER HORS DE LA PORTÉE DES BÉBÉS ET DES ENFANTS.",
    ]
    y = 240
    for line in warning_lines:
        draw.text((100, y), line, fill=(0, 0, 0), font=font_body)
        y += 28
    draw.text((100, 470), "PRINT FONT SIZE: 14 PT  |  LEGIBILITY: 100% PASS", fill=(16, 185, 129), font=get_font(14))
    return img

def make_prep_fnsku_label():
    img = Image.new("RGB", (800, 600), color=(250, 250, 250))
    draw = ImageDraw.Draw(img)
    # Label surface
    draw.rectangle([80, 100, 720, 500], fill=(255, 255, 255), outline=(0, 0, 0), width=3)
    # FNSKU text & barcode
    draw_barcode(draw, 140, 150, 520, 140, "X003BOTTLE1")
    font_lg = get_font(24)
    font_med = get_font(16)
    draw.text((140, 330), "FNSKU: X003BOTTLE1", fill=(0, 0, 0), font=font_lg)
    draw.text((140, 370), "HydraSteel Pro 750ml Vacuum Bottle - Blue", fill=(40, 40, 40), font=font_med)
    draw.text((140, 400), "Condition: New", fill=(70, 70, 70), font=font_med)
    # Coverage check callout
    draw.rectangle([140, 440, 660, 480], fill=(236, 253, 245), outline=(16, 185, 129), width=1)
    draw.text((155, 450), "✓ ORIGINAL BARCODE 100% COVERED  |  PLACEMENT: FLAT / NO SEAMS", fill=(6, 95, 70), font=get_font(13))
    return img

def make_prep_expiry_date():
    img = Image.new("RGB", (800, 600), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle([100, 150, 700, 450], fill=(255, 255, 255), outline=(0, 0, 0), width=3)
    draw.text((140, 200), "LOT & EXPIRATION VERIFICATION", fill=(30, 64, 175), font=get_font(20))
    draw.text((140, 260), "EXP DATE: 2027-12-31", fill=(0, 0, 0), font=get_font(32))
    draw.text((140, 320), "LOT NUMBER: LOT-2024-B1-9824", fill=(60, 60, 60), font=get_font(20))
    draw.text((140, 380), "LEGIBILITY: EXCELLENT  |  FORMAT: YYYY-MM-DD COMPLIANT", fill=(16, 185, 129), font=get_font(14))
    return img

def make_prep_handling_marks():
    img = Image.new("RGB", (800, 600), color=(245, 245, 245))
    draw = ImageDraw.Draw(img)
    draw.rectangle([100, 120, 700, 480], fill=(255, 255, 255), outline=(0, 0, 0), width=3)
    draw.text((140, 160), "HANDLING MARKS & SHIPMENT SYMBOLS", fill=(0, 0, 0), font=get_font(22))
    draw.text((160, 230), "↑ ↑  THIS WAY UP", fill=(185, 28, 28), font=get_font(26))
    draw.text((160, 290), "🍸  FRAGILE - HANDLE WITH CARE", fill=(185, 28, 28), font=get_font(26))
    draw.text((160, 350), "☂  KEEP DRY - STORE AWAY FROM RAIN", fill=(185, 28, 28), font=get_font(26))
    draw.text((140, 430), "ALL APPLICABLE MARKS PRESENT & HIGH-CONTRAST VISIBLE", fill=(16, 185, 129), font=get_font(14))
    return img

def make_pack_open_box():
    img = Image.new("RGB", (800, 600), color=(190, 160, 125))
    draw = ImageDraw.Draw(img)
    # Box inner cavity
    draw.rectangle([100, 60, 700, 540], fill=(165, 135, 100), outline=(130, 100, 70), width=4)
    # 4x6 grid of packed water bottles seen top-down
    colors = [(30, 90, 180), (35, 100, 195)]
    idx = 0
    for r in range(4):
        for c in range(6):
            x = 130 + c * 92
            y = 90 + r * 105
            draw.ellipse([x, y, x + 75, y + 75], fill=colors[idx % 2], outline=(15, 25, 35), width=2)
            draw.ellipse([x + 22, y + 22, x + 53, y + 53], fill=(50, 60, 70))
            idx += 1
    # Packing slip inside box
    draw.rectangle([520, 370, 680, 520], fill=(255, 255, 255), outline=(0, 0, 0), width=2)
    draw.text((530, 380), "PACKING SLIP", fill=(0, 0, 0), font=get_font(11))
    draw.text((530, 400), "ORD: 902-184920", fill=(0, 0, 0), font=get_font(9))
    draw.text((530, 420), "SKU: BLUE-BTL-001", fill=(0, 0, 0), font=get_font(9))
    draw.text((530, 440), "QTY: 24 PCS", fill=(16, 185, 129), font=get_font(10))
    # Count callout
    draw.rectangle([110, 480, 380, 530], fill=(17, 24, 39))
    draw.text((120, 490), "ITEM COUNTER: 24 DETECTED / 24 EXPECTED", fill=(52, 211, 153), font=get_font(12))
    return img

def make_returns_item():
    img = Image.new("RGB", (800, 600), color=(240, 240, 244))
    draw = ImageDraw.Draw(img)
    # Mat surface
    draw.rectangle([60, 60, 740, 540], fill=(225, 230, 235), outline=(180, 185, 190), width=2)
    # Returned blue bottle
    draw.rounded_rectangle([320, 160, 480, 500], radius=24, fill=(30, 90, 180), outline=(20, 60, 130), width=2)
    draw.rounded_rectangle([360, 100, 440, 160], radius=10, fill=(30, 40, 50))
    # Return tag
    draw.rectangle([100, 100, 300, 200], fill=(255, 255, 255), outline=(239, 68, 68), width=2)
    draw.text((115, 110), "RETURNED ITEM AUDIT", fill=(239, 68, 68), font=get_font(13))
    draw.text((115, 130), "RMA: RMA-8852-RTN", fill=(17, 24, 39), font=get_font(13))
    draw.text((115, 150), "SKU: SKU-BLUE-BOTTLE-001", fill=(17, 24, 39), font=get_font(11))
    draw.text((115, 170), "STATUS: LIKE NEW (FACTORY SEALED)", fill=(16, 185, 129), font=get_font(11))
    return img

def make_returns_accessory():
    img = Image.new("RGB", (800, 600), color=(245, 247, 250))
    draw = ImageDraw.Draw(img)
    # Component layout
    draw.text((60, 50), "RETURN COMPLETENESS: ACCESSORIES CHECKLIST", fill=(17, 24, 39), font=get_font(20))
    # Cap
    draw.rectangle([80, 120, 280, 360], fill=(255, 255, 255), outline=(200, 200, 200), width=2)
    draw.ellipse([130, 180, 230, 280], fill=(30, 40, 50))
    draw.text((100, 320), "1. INSULATED CAP: PRESENT", fill=(16, 185, 129), font=get_font(12))
    # Straw
    draw.rectangle([300, 120, 500, 360], fill=(255, 255, 255), outline=(200, 200, 200), width=2)
    draw.rectangle([385, 150, 415, 300], fill=(220, 225, 230), outline=(150, 150, 150))
    draw.text((320, 320), "2. SILICONE STRAW: PRESENT", fill=(16, 185, 129), font=get_font(12))
    # Cleaning Brush
    draw.rectangle([520, 120, 720, 360], fill=(255, 255, 255), outline=(200, 200, 200), width=2)
    draw.line([(620, 150), (620, 300)], fill=(120, 120, 120), width=6)
    draw.text((530, 320), "3. CLEANING BRUSH: PRESENT", fill=(16, 185, 129), font=get_font(12))
    # Summary
    draw.rectangle([80, 420, 720, 500], fill=(236, 253, 245), outline=(16, 185, 129), width=2)
    draw.text((100, 440), "COMPLETENESS VERDICT: 3 / 3 ACCESSORIES INTACT", fill=(6, 95, 70), font=get_font(18))
    draw.text((100, 470), "NO MISSING PARTS  |  DISPOSITION ELIGIBLE: RESTOCK", fill=(6, 95, 70), font=get_font(13))
    return img

def make_returns_packaging():
    img = Image.new("RGB", (800, 600), color=(240, 240, 240))
    draw = ImageDraw.Draw(img)
    # Retail packaging box
    draw.rectangle([200, 100, 600, 500], fill=(255, 255, 255), outline=(50, 50, 50), width=3)
    draw.text((230, 140), "HYDRASTEEL PRO", fill=(30, 64, 175), font=get_font(26))
    draw.text((230, 180), "VACUUM INSULATED BOTTLE", fill=(75, 85, 99), font=get_font(16))
    # Tamper sticker intact
    draw.rectangle([340, 230, 460, 300], fill=(254, 243, 199), outline=(217, 119, 6), width=2)
    draw.text((350, 245), "TAMPER SEAL", fill=(180, 83, 9), font=get_font(13))
    draw.text((365, 270), "INTACT", fill=(16, 185, 129), font=get_font(15))
    # Grade banner
    draw.rectangle([220, 370, 580, 460], fill=(240, 253, 250), outline=(13, 148, 136), width=2)
    draw.text((240, 390), "AMAZON CONDITION GRADE: LIKE NEW", fill=(15, 118, 110), font=get_font(16))
    draw.text((240, 420), "BOX SURFACE: CLEAN, NO TEARS, RESTOCK READY", fill=(15, 118, 110), font=get_font(13))
    return img

def make_returns_serial_label():
    img = Image.new("RGB", (800, 600), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle([80, 120, 720, 480], fill=(255, 255, 255), outline=(0, 0, 0), width=3)
    draw_barcode(draw, 140, 170, 520, 120, "SN-RTN-8852-BTL")
    draw.text((140, 330), "SERIAL NUMBER: SN-RTN-8852-BTL", fill=(0, 0, 0), font=get_font(22))
    draw.text((140, 370), "MATCHES ORIGINAL OUTBOUND SHIPMENT: YES (100% CONFIRMED)", fill=(16, 185, 129), font=get_font(15))
    draw.text((140, 410), "ORIGINAL ORDER ID: ORD-902-184920", fill=(70, 70, 70), font=get_font(15))
    return img

GENERATORS = {
    "receiving_carton_exterior.jpg": make_receiving_carton,
    "receiving_po_sku_label.jpg": make_receiving_po_label,
    "receiving_product_variant.jpg": make_receiving_product_variant,
    "receiving_damage_closeup.jpg": make_receiving_damage_closeup,
    "prep_product_front.jpg": make_prep_product_front,
    "prep_polybag_sealed.jpg": make_prep_polybag_sealed,
    "prep_warning_label.jpg": make_prep_warning_label,
    "prep_fnsku_label.jpg": make_prep_fnsku_label,
    "prep_expiry_date.jpg": make_prep_expiry_date,
    "prep_handling_marks.jpg": make_prep_handling_marks,
    "pack_open_box.jpg": make_pack_open_box,
    "returns_item_overview.jpg": make_returns_item,
    "returns_accessories.jpg": make_returns_accessory,
    "returns_packaging.jpg": make_returns_packaging,
    "returns_serial_label.jpg": make_returns_serial_label,
}

def generate_all():
    base64_map = {}
    for filename, fn in GENERATORS.items():
        img = fn()
        front_path = FRONTEND_CAPTURES / filename
        back_path = BACKEND_CAPTURES / filename
        img.save(front_path, format="JPEG", quality=90)
        img.save(back_path, format="JPEG", quality=90)
        
        # Also convert to base64
        with open(front_path, "rb") as f:
            b64_str = base64.b64encode(f.read()).decode("utf-8")
        base64_map[filename] = b64_str
        print(f"Generated {filename} ({os.path.getsize(front_path)} bytes)")

    return base64_map

if __name__ == "__main__":
    generate_all()
