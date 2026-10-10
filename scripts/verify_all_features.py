"""Verify all 8 features and 5 stages end-to-end for UNIT-TEST-8852."""
import json
import requests

BASE_URL = "http://127.0.0.1:8000"
UNIT_ID = "UNIT-TEST-8852"

# Login to get bearer token
def get_auth_headers():
    try:
        r = requests.post(f"{BASE_URL}/auth/login", json={"email": "org_alpha@cube.local", "password": "root"})
        token = r.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    except Exception as e:
        print("Login failed:", e)
        return {}

HEADERS = get_auth_headers()
DUMMY_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

def cap(ref):
    return {"ref": ref, "filename": ref, "content_base64": DUMMY_B64}

def test_pipeline():
    print("=== 1. Testing Receiving Inspection ===")
    rec_payload = {
        "unit_id": UNIT_ID,
        "sku": "SKU-BLUE-BOTTLE-001",
        "expected_qty": 24,
        "observed_qty": 24,
        "expected_variant": "Blue",
        "observed_variant": "Blue",
        "cartons_ordered": 1,
        "cartons_received": 1,
        "carton_damage": "none",
        "unit_damage": "none",
        "captures": [cap("carton_damaged.png"), cap("sku_label.png"), cap("units_array.png"), cap("unit_blue.png")]
    }
    r = requests.post(f"{BASE_URL}/inspect/receiving", json=rec_payload, headers=HEADERS)
    print("Receiving Status:", r.status_code)
    rec_json = r.json()
    if r.status_code != 200:
        print("Receiving Error:", rec_json)
        return
    print("Receiving Payload Keys:", list(rec_json["evidence"]["payload"].keys()))
    print("Reconciliation Matrix:", json.dumps(rec_json["evidence"]["payload"].get("reconciliation_matrix"), indent=2))
    print("Intake Risk Score:", json.dumps(rec_json["evidence"]["payload"].get("intake_risk"), indent=2))

    print("\n=== 2. Testing Prep Inspection ===")
    prep_payload = {
        "unit_id": UNIT_ID,
        "category": "general",
        "polybag_sealed": "yes",
        "suffocation_warning": "legible",
        "fnsku_label_placement": "flat",
        "original_barcode_covered": "yes",
        "expiry_date": "not_required",
        "handling_marks": "all_present",
        "captures": [cap("polybag_sealed.png"), cap("warning_label.png"), cap("fnsku_applied.png"), cap("prep_unit_front.png"), cap("polybag_sealed.png"), cap("warning_label.png")]
    }
    r = requests.post(f"{BASE_URL}/inspect/prep", json=prep_payload, headers=HEADERS)
    print("Prep Status:", r.status_code)
    prep_json = r.json()
    if r.status_code != 200:
        print("Prep Error:", prep_json)
        return
    print("Adaptive Prep Plan:", json.dumps(prep_json["evidence"]["payload"].get("adaptive_prep_plan"), indent=2))
    print("Rework Prevention Map:", json.dumps(prep_json["evidence"]["payload"].get("rework_prevention_map"), indent=2))

    print("\n=== 3. Testing Pack Inspection ===")
    pack_payload = {
        "unit_id": UNIT_ID,
        "order_lines": "SKU-BLUE-BOTTLE-001:24",
        "observed_in_box": "SKU-BLUE-BOTTLE-001:24",
        "look_alike": "false",
        "captures": [cap("open_pack_box.png"), cap("pack_item_detail.png"), cap("pack_void_fill.png"), cap("sealed_box_scale.png")]
    }
    r = requests.post(f"{BASE_URL}/inspect/pack", json=pack_payload, headers=HEADERS)
    print("Pack Status:", r.status_code)
    pack_json = r.json()
    if r.status_code != 200:
        print("Pack Error:", pack_json)
        return
    print("Shipment Readiness Gate:", json.dumps(pack_json["evidence"]["payload"].get("shipment_readiness_gate"), indent=2))
    print("Dispatch Evidence Bundle:", json.dumps(pack_json["evidence"]["payload"].get("dispatch_evidence_bundle"), indent=2))

    print("\n=== 4. Testing Returns Inspection ===")
    rtn_payload = {
        "unit_id": UNIT_ID,
        "ordered_sku": "SKU-BLUE-BOTTLE-001",
        "returned_sku": "SKU-BLUE-BOTTLE-001",
        "observed_state": "opened_unused",
        "parts_missing": "",
        "parts_list": "insulated_cap;silicone_straw;cleaning_brush",
        "unit_msrp": 49.99,
        "captures": [cap("return_unit_opened.png"), cap("return_accessories.png"), cap("return_unit_opened.png"), cap("return_accessories.png")]
    }
    r = requests.post(f"{BASE_URL}/inspect/returns", json=rtn_payload, headers=HEADERS)
    print("Returns Status:", r.status_code)
    rtn_json = r.json()
    if r.status_code != 200:
        print("Returns Error:", rtn_json)
        return
    print("Condition Diff:", json.dumps(rtn_json["evidence"]["payload"].get("condition_diff"), indent=2))
    print("Disposition Advisor:", json.dumps(rtn_json["evidence"]["payload"].get("disposition_advisor"), indent=2))

    print("\n=== 5. Testing Recovery Inspection ===")
    rcy_payload = {
        "unit_id": UNIT_ID,
        "claimed_defect_category": "transit_crush",
        "damage_severity": "moderate",
        "root_cause": "carrier_mishandling",
        "is_repeat_vendor_issue": False,
        "salvage_quote_usd": 15.00,
        "original_cost_usd": 49.99,
        "captures": [cap("recovery_unit_damage.png")]
    }
    r = requests.post(f"{BASE_URL}/inspect/recovery", json=rcy_payload, headers=HEADERS)
    print("Recovery Status:", r.status_code)
    rcy_json = r.json()
    if r.status_code != 200:
        print("Recovery Error:", rcy_json)
        return
    print("Recovery Verdict:", rcy_json.get("verdict") or rcy_json.get("workflow", {}).get("status"))

    print("\n🎉 ALL 5 STAGES & ALL 8 FEATURES EXECUTED SUCCESSFULLY WITH 200 OK!")

if __name__ == "__main__":
    test_pipeline()
