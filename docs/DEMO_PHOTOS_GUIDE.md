# CUBE Round 3 — Operational Demo Captures Guide

This guide documents the high-resolution warehouse inspection photos included in your codebase for live demo evaluation across all five operational managers.

---

## 1. Local Codebase Storage Locations

All demo captures are placed directly into your codebase and served live:
- **Frontend Live URL Root**: `frontend/public/sample_captures/` (served at `http://localhost:5173/sample_captures/<filename>`)
- **Backend Disk Path**: `data/sample/photos/<filename>`
- **TypeScript Base64 Ledger**: `frontend/src/data/sampleCaptures.ts`

---

## 2. Manager Captures & Specialist Extraction Map

### Stage 01 · Receiving Manager (`/sample_captures/...`)

| Shot Name | Local Filename | Visual Features & Text Extracted | Specialist Workstream |
|---|---|---|---|
| **Carton exterior** | `receiving_carton_exterior.jpg` | Heavy-duty corrugated cardboard master carton, H-tape sealing, orientation arrows `↑ ↑ THIS SIDE UP`, pallet base. | `REC-1` Quality Gate, `REC-3` Quantity Counter |
| **PO / SKU label** | `receiving_po_sku_label.jpg` | High-contrast printed manifest: `PO-98241-US`, `SKU-BLUE-BOTTLE-001`, `ASIN: B09X7K982`, 1D Barcode `CTN-98241-001`. | `REC-2` Identity Resolver (OCR + vision) |
| **Product and variant** | `receiving_product_variant.jpg` | Stainless steel insulated double-wall vacuum bottle in vibrant Pacific Blue, black cap. | `REC-4` Variant Checker (Color & visual attributes) |
| **Damage close-up** | `receiving_damage_closeup.jpg` | Inspection reticle over carton seams; pristine integrity, 0 crushing, 0 water damage. | `REC-5` Damage Inspector (Vision regions) |

---

### Stage 02 · Prep Manager (`/sample_captures/...`)

| Shot Name | Local Filename | Visual Features & Text Extracted | Specialist Workstream |
|---|---|---|---|
| **Product front** | `prep_product_front.jpg` | Clean front view of bottle prior to polybagging. | `PRP-2` Capture Guide & Gate |
| **Polybag & Seal** | `prep_polybag_sealed.jpg` | 1.5-mil clear polyethylene bag with continuous, airtight heat-seal seam across the top edge. | `PRP-3` Polybag & Seal Checker |
| **Warning label** | `prep_warning_label.jpg` | Printed suffocation warning text: `WARNING: TO AVOID DANGER OF SUFFOCATION, KEEP THIS PLASTIC BAG AWAY FROM BABIES AND CHILDREN...` in 14pt high-contrast bold font. | `PRP-4` Warning Reader (OCR + vision) |
| **FNSKU label** | `prep_fnsku_label.jpg` | FNSKU barcode label `X003BOTTLE1`, title, condition New, placed completely flat with 0 seam overhang, 100% covering manufacturer UPC. | `PRP-5` Label & Barcode Inspector |
| **Expiry date** | `prep_expiry_date.jpg` | High-contrast date stamp: `EXP DATE: 2027-12-31`, Lot: `LOT-2024-B1-9824`. | `PRP-5` Expiry Reader (OCR) |
| **Handling marks** | `prep_handling_marks.jpg` | Universal icons: `↑ ↑ THIS WAY UP`, `🍸 FRAGILE`, `☂ KEEP DRY`. | `PRP-5` Handling Marks Auditor |

---

### Stage 03 · Pack Manager (`/sample_captures/...`)

| Shot Name | Local Filename | Visual Features & Text Extracted | Specialist Workstream |
|---|---|---|---|
| **Top-down open-box contents** | `pack_open_box.jpg` | Bird's-eye top-down view into open shipping box. 24 Pacific Blue bottles neatly arranged in a 4x6 partition grid, with packing slip `ORD: 902-184920`. | `PCK-1` Gate, `PCK-2` Item Detector, `PCK-3` Quantity Counter |

---

### Stage 04 · Returns Manager (`/sample_captures/...`)

| Shot Name | Local Filename | Visual Features & Text Extracted | Specialist Workstream |
|---|---|---|---|
| **Returned item** | `returns_item_overview.jpg` | Returned blue bottle on inspection mat with RMA tag `RMA-8852-RTN`, factory-sealed state. | `RTN-1` Capture Guide, `RTN-4` Condition Grader |
| **Each accessory** | `returns_accessories.jpg` | 3-part accessories inspection tray: 1. Insulated Cap, 2. Silicone Straw, 3. Wire Cleaning Brush (3/3 present). | `RTN-3` Completeness Checker |
| **Packaging condition** | `returns_packaging.jpg` | Original retail packaging box with intact tamper seal, rated Amazon Condition: Like New. | `RTN-4` Condition Grader |
| **Serial / product label** | `returns_serial_label.jpg` | Barcode label `SN-RTN-8852-BTL`, verifying 100% match against original outbound shipment. | `RTN-2` Identity Verifier (OCR) |

---

## 3. Online Backup & Photo Gallery Links for Live Demo

If you want to view or present external high-resolution links during the demo or in documentation:
- **HydraSteel Product Catalogue**: https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1200&q=80 (Stainless Blue Insulated Bottle)
- **Warehouse Carton & Shipping Barcode**: https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80 (Warehouse Pallets & Shipping Cartons)
- **Open Box Packing & Fulfillment**: https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1200&q=80 (Open Box Fulfillment)
- **Package Inspection & Returns**: https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80 (Inspection mat & return item check)

---

## 4. How to Use in the Demo UI

1. Open **Operations** in the CUBE web dashboard.
2. Select any unit (e.g. `UNIT-TEST-8852`).
3. Click any manager tab (**Receiving**, **Prep**, **Pack**, or **Returns**).
4. Click **Run [Stage]** to open the modal.
5. In the modal, click the button **⚡ Attach All Sample Photos**.
   - All required evidence captures are instantly loaded with real warehouse photos!
   - You can see image previews directly inside the modal!
6. Click **Run Inspection**.
   - The agent executes its full specialist workstream pipeline (OCR, quality gate, item detection, damage check, rule decisions).
