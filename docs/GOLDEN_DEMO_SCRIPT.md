# 🏆 Golden Demo Script & Project Presentation Guide

This guide provides a step-by-step presentation script and test case walkthrough for demonstrating **CUBE Autonomous Warehouse Operations** live.

---

## 📸 1. Golden Demo Test Case & Demo Images

### Target Unit ID: `UNIT-TEST-8852` (Product: Insulated Stainless Steel Water Bottle)

To run the complete demo, attach the pre-generated high-contrast warehouse inspection images in each stage modal. You can click **"⚡ Attach All Sample Photos"** in the capture checklist UI for instant 1-click loading.

#### Required Input Images (Located in `frontend/public/sample_captures/` & `data/sample/photos/`):

| Operational Stage | Required Inspection Shot | Image Filename | What the Subagent Specialist Extracts |
| :--- | :--- | :--- | :--- |
| **Receiving** | Master Carton Exterior | `carton_damaged.png` | **REC-1/5**: CV Edge sharpness (58.4), contrast, carton crush & puncture audit |
| **Receiving** | Purchase Order / SKU Label | `sku_label.png` | **REC-2 (OCR)**: Scans text `SKU-BLUE-BOTTLE-001`, matches against PO manifest |
| **Receiving** | Open Box Contents | `units_array.png` | **REC-3 (Vision)**: Object counting array (24 units tallied) |
| **Receiving** | Unit Chromatic Inspection | `unit_blue.png` | **REC-4 (CV)**: Color histogram matching (Observed: Blue vs Expected: Blue) |
| **Prep** | Polybag Enclosure | `polybag_sealed.png` | **PRP-3 (CV)**: Continuous 1.5 mil airtight heat seal seam verification |
| **Prep** | Suffocation Warning | `warning_label.png` | **PRP-4 (OCR)**: Scans warning text, verifies font size >= 14pt |
| **Prep** | FNSKU Thermal Sticker | `fnsku_applied.png` | **PRP-5 (OCR+CV)**: Reads `X003B9182`, verifies 100% UPC barcode mask |
| **Prep** | Sealed Unit Front | `prep_unit_front.png` | **PRP-2/5**: Surface alignment & zero edge overhang check |
| **Pack** | Open Shipping Carton Top-Down | `open_pack_box.png` | **PCK-1..3 (CV)**: Item detection array, quantity validation (24 items) |
| **Pack** | Item Identity Verification | `pack_item_detail.png` | **PCK-2/4**: Bin neighbor look-alike confusion check |
| **Pack** | Void Fill & Cushioning | `pack_void_fill.png` | **PCK-4 (CV)**: Kraft paper / air pillow volume fill compliance (>= 95%) |
| **Pack** | Sealed Carton & Weight | `sealed_box_scale.png` | **PCK-5 (CV)**: Scale weight (2.45 kg) vs tare tolerance (±3%) |
| **Returns** | Returned Item Exterior | `return_unit_opened.png` | **RTN-2/4**: Serial/SKU match, condition grading (*Like New* / *Opened*) |
| **Returns** | Accessory Inventory | `return_accessories.png` | **RTN-3 (Vision)**: Accessory tally (Cap, straw, brush present) |
| **Recovery** | Damage Inspection | `recovery_unit_damage.png` | **RCY-1..7**: Root cause classification & vendor chargeback eligibility |

---

## ⚡ 2. Live Demo Presentation Walkthrough

### Step 1: Receiving Dock Intake
1. Select Unit **`UNIT-TEST-8852`** from the Command Center list.
2. Click **Run Receiving Inspection** to open the modal.
3. Click **"⚡ Attach All Sample Photos"** (attaches all 4 required shots instantly).
4. Click **Run Receiving Inspection**:
   - **REC-1..6 Specialists Execute Live**: Latency ~50ms total.
   - **Priority 1 Feature**: Displays the **Expected vs. Observed Reconciliation Matrix** comparing SKU, Quantity, Cartons, Variant, and Integrity.
   - **Priority 6 Feature**: Displays **Evidence Completeness & Intake Risk Score** (Risk Level: Low Risk, Completeness Grade: A).
5. Click **Close** or **Proceed to Prep**.

### Step 2: FBA Prep & Compliance
1. Click **Run Prep Inspection**.
2. Click **"⚡ Attach All Sample Photos"** (attaches all 6 required shots).
3. Click **Run Prep Inspection**:
   - **PRP-1..6 Specialists Execute Live**: Polybag seal, suffocation OCR warning, and FNSKU label checked.
   - **Priority 4 Feature**: Displays **Adaptive Prep Plan** (`APP-2026-FBA-GENERAL`) with prescribed steps and compliance status.
   - **Priority 7 Feature**: Displays **Rework Prevention Map** showing zero inbound defect penalty risk ($7.20 saved).

### Step 3: Outbound Pack & Shipment Gate
1. Click **Run Pack Inspection**.
2. Click **"⚡ Attach All Sample Photos"** (attaches all 4 required shots).
3. Click **Run Pack Inspection**:
   - **PCK-1..5 Specialists Execute Live**: Item detection and order reconciliation.
   - **Priority 2 Feature**: Displays **Shipment Readiness Gate** (**CLEARED FOR DISPATCH**, auto-taping conveyor routing).
   - **Priority 5 Feature**: Displays **Dispatch Evidence Bundle** (`DEB-2026-PCK-...`) with SHA-256 pre-seal snapshot hash and 365-day retention policy.

### Step 4: Customer Return & Condition Diff
1. Click **Run Returns Inspection**.
2. Click **"⚡ Attach All Sample Photos"** (attaches required return shots).
3. Click **Run Returns Inspection**:
   - **RTN-1..6 Specialists Execute Live**: SKU verifier, accessory counter, condition grader (*Like New*).
   - **Priority 3 Feature**: Displays **Before vs. After Condition Diff** comparing Outbound Baseline (`DEB-2026-PCK-...`) against Inbound Return state.
   - **Priority 8 Feature**: Displays **Disposition & Loss Exposure Advisor** showing MSRP ($49.99), Est. Salvage ($44.99), Net Loss Exposure ($5.00), and 4 financial route options.

### Step 5: Shared Unit Passport Verification
1. Click on the **Unit Passport** tab or view the card for `UNIT-TEST-8852`.
2. Notice all 4 completed stages with cryptographic SHA-256 evidence records, pre-seal dispatch hashes, and condition diffs permanently logged in the unified PostgreSQL database.

---

## 🛠️ 3. Summary of 8 Prioritized Features Implemented

| Priority | Operational Manager | Feature Name | Key Output & Business Value |
| :---: | :--- | :--- | :--- |
| **1** | Receiving | **Expected vs. Observed Reconciliation** | Side-by-side PO vs. dock intake comparison matrix. |
| **2** | Pack | **Shipment Readiness Gate** | Deterministic dispatch clearance gate (CLEARED / HOLD). |
| **3** | Returns | **Before vs. After Condition Diff** | Outbound pre-seal baseline vs. inbound return delta. |
| **4** | Prep | **Adaptive Prep Plan** | Dynamic category prep rules & step-by-step checklist. |
| **5** | Pack | **Dispatch Evidence Bundle** | Cryptographic pre-seal snapshot hash for returns & recovery. |
| **6** | Receiving | **Evidence Completeness & Intake Risk** | Completeness grade (A/B/C) and intake risk score (%). |
| **7** | Prep | **Rework Prevention Map** | FBA defect fine avoidance & workstation routing. |
| **8** | Returns | **Disposition & Loss Exposure Advisor** | MSRP, salvage value, net loss exposure, and 4 financial routes. |

*Supports both Light Theme and Black/Dark Theme.*
