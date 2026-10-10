"""Export base64 sample captures and URLs into frontend/src/data/sampleCaptures.ts."""

import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CAPTURES_DIR = ROOT / "frontend" / "public" / "sample_captures"
TS_OUTPUT = ROOT / "frontend" / "src" / "data" / "sampleCaptures.ts"

SHOT_MAPPING = {
    # Receiving
    "Carton exterior": "receiving_carton_exterior.jpg",
    "PO / SKU label": "receiving_po_sku_label.jpg",
    "Product and variant": "receiving_product_variant.jpg",
    "Damage close-up": "receiving_damage_closeup.jpg",
    
    # Prep
    "Product front": "prep_product_front.jpg",
    "FNSKU label": "prep_fnsku_label.jpg",
    "Warning label": "prep_warning_label.jpg",
    "Seal edge": "prep_polybag_sealed.jpg",
    "Expiry date": "prep_expiry_date.jpg",
    "Handling marks": "prep_handling_marks.jpg",
    
    # Pack
    "Top-down open-box contents": "pack_open_box.jpg",
    
    # Returns
    "Returned item": "returns_item_overview.jpg",
    "Each accessory": "returns_accessories.jpg",
    "Packaging condition": "returns_packaging.jpg",
    "Serial / product label": "returns_serial_label.jpg",
}

def export_ts():
    shot_data = {}
    for shot, filename in SHOT_MAPPING.items():
        file_path = CAPTURES_DIR / filename
        if not file_path.exists():
            continue
        with open(file_path, "rb") as f:
            b64_content = base64.b64encode(f.read()).decode("utf-8")
        shot_data[shot] = {
            "shot": shot,
            "filename": filename,
            "url": f"/sample_captures/{filename}",
            "content_base64": b64_content,
        }

    lines = [
        "// Auto-generated demo warehouse sample captures",
        "export interface SampleCaptureItem {",
        "  shot: string;",
        "  filename: string;",
        "  url: string;",
        "  content_base64: string;",
        "}",
        "",
        f"export const SAMPLE_CAPTURES: Record<string, SampleCaptureItem> = {json.dumps(shot_data, indent=2)};",
        "",
        "export function getSampleCapture(shot: string): SampleCaptureItem | undefined {",
        "  return SAMPLE_CAPTURES[shot];",
        "}",
        "",
        "export function getAllSampleCaptures(requiredShots: string[]): Array<{ shot: string; filename: string; content_base64: string; preview_url?: string }> {",
        "  return requiredShots.map((shot) => {",
        "    const item = SAMPLE_CAPTURES[shot];",
        "    return {",
        "      shot,",
        "      filename: item ? item.filename : `${shot.toLowerCase().replace(/\\s+/g, '_')}.jpg`,",
        "      content_base64: item ? item.content_base64 : '',",
        "      preview_url: item ? item.url : undefined,",
        "    };",
        "  });",
        "}",
        "",
    ]

    TS_OUTPUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Exported sampleCaptures.ts with {len(shot_data)} photos ({TS_OUTPUT.stat().st_size} bytes)")

if __name__ == "__main__":
    export_ts()
