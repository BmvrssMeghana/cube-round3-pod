import base64
import hashlib

from orchestration import api
from orchestration.store import FileStore


def test_create_unit_builds_a_pending_tenant_scoped_workflow(monkeypatch, tmp_path):
    import orchestration.db as db

    monkeypatch.setattr(api, "STORE", FileStore(tmp_path / "out"))
    monkeypatch.setattr(api, "save_unit_db", lambda **kwargs: None)
    monkeypatch.setattr(api, "save_workflow_db", lambda *args, **kwargs: None)
    monkeypatch.setattr(db, "ensure_organization", lambda *args, **kwargs: None)

    workflow = api.create_unit({
        "org_id": "org_test",
        "unit_id": "UNIT-LIVE-1",
        "sku": "SKU-LIVE-1",
        "route": "mfn",
        "expected_qty": 3,
        "returned": True,
    })

    assert workflow["org_id"] == "org_test"
    assert workflow["status"] == "PENDING"
    assert {item["stage"]: item["state"] for item in workflow["stage_results"]} == {
        "receiving": "pending",
        "prep": "skipped",
        "pack": "pending",
        "returns": "pending",
        "recovery": "pending",
    }
    assert api.STORE.list_workflows("org_test") == [workflow]


def test_live_inspection_saves_operator_inputs_and_hashed_capture(monkeypatch, tmp_path):
    import agents.receiving.app as receiving

    monkeypatch.setattr(api, "STORE", FileStore(tmp_path / "out"))
    monkeypatch.setattr(api, "INPUT_ROOT", tmp_path / "input")
    monkeypatch.setattr(api, "save_workflow_db", lambda *args, **kwargs: None)
    monkeypatch.setattr(api, "get_unit_profile", lambda *args, **kwargs: None)
    monkeypatch.setattr(receiving, "save_evidence_db", lambda record: None)
    monkeypatch.setenv("USE_SAMPLE_DATA", "0")
    monkeypatch.setenv("ORCH_MODE", "inproc")
    raw_image = b"test image bytes"

    first = api._execute_stage_inspection("UNIT-LIVE-2", "receiving", {
        "org_id": "org_test",
        "route": "fba",
        "sku": "SKU-LIVE-2",
        "expected_qty": 8,
        "observed_qty": 6,
        "cartons_ordered": 1,
        "cartons_received": 1,
        "identity_match": "yes",
        "captures": [{
            "shot": "po-label",
            "filename": "po-label.png",
            "content_base64": base64.b64encode(raw_image).decode("ascii"),
        }],
    })
    second = api._execute_stage_inspection("UNIT-LIVE-2", "receiving", {
        "org_id": "org_test",
        "route": "fba",
        "sku": "SKU-LIVE-2",
        "expected_qty": 8,
        "observed_qty": 8,
        "cartons_ordered": 1,
        "cartons_received": 1,
        "identity_match": "yes",
    })

    assert first["evidence"]["checks"][2]["verdict"] == "FAIL"
    assert second["evidence"]["checks"][2]["verdict"] == "PASS"
    assert first["evidence"]["record_id"] != second["evidence"]["record_id"]
    [capture] = first["evidence"]["inputs"]
    assert capture["kind"] == "image"
    assert capture["sha256"] == hashlib.sha256(raw_image).hexdigest()
    assert (tmp_path / "input" / capture["ref"]).read_bytes() == raw_image
    assert second["workflow"]["stage_results"][0]["record_id"] == second["evidence"]["record_id"]


def test_recovery_suppresses_duplicate_and_already_reimbursed_charge_ids(monkeypatch):
    import agents.recovery.app as recovery

    monkeypatch.setattr(recovery, "save_evidence_db", lambda record: None)
    request = {
        "schema_version": "1.0",
        "request_id": "WF-org_test-UNIT-LIVE-3:recovery",
        "workflow_id": "WF-org_test-UNIT-LIVE-3",
        "stage": "recovery",
        "subject": {"org_id": "org_test", "subject_id": "UNIT-LIVE-3", "route": "fba"},
        "inputs": [],
        "previous_evidence": [],
        "context": {"user_inputs": {
            "fee_lines": [
                {"line_id": "CHG-DUP", "charge_type": "unknown", "amount_usd": 12},
                {"line_id": "CHG-DUP", "charge_type": "unknown", "amount_usd": 12},
                {"line_id": "CHG-REPAID", "charge_type": "unknown", "amount_usd": 9},
            ],
            "prior_reimbursements": ["CHG-REPAID"],
        }},
    }

    output = recovery.handle(request)
    charges = output["evidence"]["payload"]["charges"]

    assert [charge["position"] for charge in charges] == ["SILENT", "SILENT", "SILENT"]
    assert charges[1]["duplicate"] is True
    assert charges[2]["already_reimbursed"] is True
    assert output["evidence"]["payload"]["claimable_usd"] == 0
    assert len({check["check_key"] for check in output["evidence"]["checks"]}) == 3
