"""Every agent, on every applicable sample subject, must return a valid Agent Output with a valid Evidence Record.

This runs against whatever agents/<stage>/agent.json points at (stub, in-process, or HTTP).
When you replace the stub, replace the sample loop with your own fixtures, but keep the assertions.
"""
import pytest

from orchestration.clients import AgentRejected, client_for
from shared.utils.hashing import verify
from shared.utils.records import add_agent_override
from shared.utils.schema import errors
from tests.conftest import AGENTS, applies, make_input

PREFIX = {"receiving": "RCV", "prep": "PRP", "pack": "PCK", "returns": "RTN", "recovery": "RCY"}


@pytest.mark.parametrize("stage", AGENTS)
def test_outputs_are_contract_valid(stage, cases):
    client, checked = client_for(stage), 0
    for case in (c for c in cases if applies(stage, c)):
        out = client.run(make_input(stage, case), 30)
        assert errors("agent-output", out) == [], f"{stage} {case['unit_id']}"
        ev = out["evidence"]
        assert ev["record_id"].startswith(PREFIX[stage] + "-")
        assert ev["stage"] == out["stage"] == stage and ev["agent_id"] == out["agent_id"]
        assert ev["workflow_id"] == out["workflow_id"] == f"WF-{case['org_id']}-{case['unit_id']}"
        assert (ev["subject"]["org_id"], ev["subject"]["subject_id"]) == (case["org_id"], case["unit_id"])
        assert out["verdict"] == ev["decision"]["verdict"] and out["status"] == ev["status"]
        assert verify(ev), "content_hash does not match the record body"
        for c in ev["checks"]:
            if c["verdict"] == "UNCERTAIN":
                assert c.get("uncertain_reason"), "UNCERTAIN needs a reason (it is a verdict, not a shrug)"
        checked += 1
    assert checked > 0


@pytest.mark.parametrize("stage", AGENTS)
def test_other_tenant_gets_nothing(stage, cases):
    """Tenancy: asking for a subject under the wrong org must be refused, never answered."""
    case = next(c for c in cases if applies(stage, c))
    other = "org_demo_bravo" if case["org_id"] == "org_demo_alpha" else "org_demo_alpha"
    with pytest.raises(AgentRejected):
        client_for(stage).run(make_input(stage, {**case, "org_id": other}), 30)


@pytest.mark.parametrize("stage", AGENTS)
def test_same_request_same_record_id(stage, cases):
    case = next(c for c in cases if applies(stage, c))
    req = make_input(stage, case)
    client = client_for(stage)
    assert client.run(req, 30)["evidence"]["record_id"] == client.run(req, 30)["evidence"]["record_id"]


def test_each_stage_can_consume_the_previous_stages_output(cases):
    """The hand-off: feed every stage the evidence the earlier stages produced; it must work and reference it."""
    case = next(c for c in cases if c["route"] == "fba" and c["returned"])
    previous = []
    for stage in [s for s in AGENTS if applies(s, case)]:
        out = client_for(stage).run(make_input(stage, case, previous), 30)
        assert errors("agent-output", out) == []
        assert set(out["evidence"]["upstream_refs"]) == {r["record_id"] for r in previous}, \
            f"{stage} must list the previous evidence it consumed in upstream_refs"
        previous.append(out["evidence"])


def test_recovery_honours_overrides_of_previous_evidence(cases):
    """Prep PASS makes the inbound-defect fee contradicted. A person overriding Prep to FAIL must change that."""
    if "recovery" not in AGENTS or "prep" not in AGENTS:
        pytest.skip("needs both Prep and Recovery in the flow")
    case = next(c for c in cases if c["unit_id"] == "UNIT-0014")
    prior = []
    for stage in ("receiving", "prep", "returns"):
        prior.append(client_for(stage).run(make_input(stage, case, prior), 30)["evidence"])
    prep_id = prior[1]["record_id"]
    base = client_for("recovery").run(make_input("recovery", case, prior), 30)["evidence"]
    override = {"override_id": "OVR-001", "supersedes": {"record_id": prep_id, "override_id": None}, "target": "decision",
                "actor": "t", "at": "2026-01-01T00:00:00Z", "reason": "label creased", "original_verdict": "PASS",
                "previous_verdict": "PASS", "new_verdict": "FAIL"}
    changed = client_for("recovery").run(make_input("recovery", case, prior, [override]), 30)["evidence"]
    pos = lambda ev: {c["charge_type"]: c["position"] for c in ev["payload"]["charges"]}  # noqa: E731
    assert pos(base)["inbound_defect_fee"] == "CONTRADICTS"
    assert pos(changed)["inbound_defect_fee"] == "SUPPORTS"


def test_agent_level_override_is_append_only(cases):
    out = client_for("receiving").run(make_input("receiving", cases[0]), 30)
    rec, target = out["evidence"], out["evidence"]["checks"][0]
    new = add_agent_override(rec, by="op_test", target=target["check_key"], new_verdict="FAIL", reason="operator disagrees")
    assert new["overrides"][0]["original_verdict"] == target["verdict"]
    assert new["checks"] == rec["checks"], "an override must never rewrite the original check"
    assert verify(new), "agent-level overrides sit outside the content hash"
    assert len(add_agent_override(new, by="op2", target="decision", new_verdict="PASS", reason="second look")["overrides"]) == 2


def _run_local_agent(stage, case, previous, user_inputs):
    from agents.pack import app as pack
    from agents.prep import app as prep
    from agents.receiving import app as receiving
    from agents.recovery import app as recovery
    from agents.returns import app as returns

    agent = {
        "receiving": receiving,
        "prep": prep,
        "pack": pack,
        "returns": returns,
        "recovery": recovery,
    }[stage]
    request = make_input(stage, case, previous)
    request["context"]["user_inputs"] = user_inputs
    return agent.handle(request)["evidence"]


def _disable_evidence_writes(monkeypatch):
    from agents.pack import app as pack
    from agents.prep import app as prep
    from agents.receiving import app as receiving
    from agents.recovery import app as recovery
    from agents.returns import app as returns

    for agent in (receiving, prep, pack, returns, recovery):
        monkeypatch.setattr(agent, "save_evidence_db", lambda record: None)


@pytest.mark.parametrize("downstream", ["prep", "pack", "returns"])
def test_receiving_identity_changes_each_outbound_decision(monkeypatch, cases, downstream):
    _disable_evidence_writes(monkeypatch)
    case = next(c for c in cases if c["unit_id"] == ("UNIT-0014" if downstream == "prep" else "UNIT-0016"))
    receiving_inputs = {
        "expected_qty": 48,
        "observed_qty": 48,
        "cartons_ordered": 4,
        "cartons_received": 4,
        "units_per_carton_ordered": 12,
        "units_per_carton_counted": 12,
        "carton_damage": "none",
        "unit_damage": "none",
        "quality_flags": "",
    }
    received = _run_local_agent("receiving", case, [], {**receiving_inputs, "identity_match": "yes"})
    wrong_identity = _run_local_agent("receiving", case, [], {**receiving_inputs, "identity_match": "no"})

    if downstream == "prep":
        inputs = {
            "polybag_present_sealed": "yes",
            "suffocation_warning": "legible",
            "fnsku_label_placement": "flat",
            "original_barcode_covered": "yes",
            "expiry_date": "legible",
            "handling_marks": "all_present",
        }
        evidence_before = _run_local_agent(downstream, case, [received], inputs)
        evidence_after = _run_local_agent(downstream, case, [wrong_identity], inputs)
    elif downstream == "pack":
        inputs = {"order_lines": "SKU-TEST:1", "observed_in_box": "SKU-TEST:1"}
        evidence_before = _run_local_agent(downstream, case, [received], inputs)
        evidence_after = _run_local_agent(downstream, case, [wrong_identity], inputs)
    else:
        pack_evidence = _run_local_agent("pack", case, [received], {
            "order_lines": "SKU-TEST:1",
            "observed_in_box": "SKU-TEST:1",
        })
        wrong_pack_evidence = _run_local_agent("pack", case, [wrong_identity], {
            "order_lines": "SKU-TEST:1",
            "observed_in_box": "SKU-TEST:1",
        })
        evidence_before = _run_local_agent("returns", case, [received, pack_evidence], {
            "identity_match": "yes", "observed_state": "opened_good",
        })
        evidence_after = _run_local_agent("returns", case, [wrong_identity, wrong_pack_evidence], {
            "identity_match": "yes", "observed_state": "opened_good",
        })

    assert evidence_before["decision"]["verdict"] == "PASS"
    assert evidence_after["decision"]["verdict"] == "FAIL"
    assert "receiving_identity_baseline" in {item["check_key"] for item in evidence_after["checks"]}


def test_receiving_quantity_changes_recovery_lost_inbound_assessment(monkeypatch, cases):
    _disable_evidence_writes(monkeypatch)
    case = next(c for c in cases if c["unit_id"] == "UNIT-0014")
    expected = _run_local_agent("receiving", case, [], {"expected_qty": 24, "observed_qty": 24})
    short = _run_local_agent("receiving", case, [], {"expected_qty": 24, "observed_qty": 12})
    charge = {"fee_lines": [{"line_id": "LOST-1", "charge_type": "lost_inbound", "amount_usd": 5}]}

    fully_received = _run_local_agent("recovery", case, [expected], charge)
    shortage_recorded = _run_local_agent("recovery", case, [short], charge)

    assert fully_received["payload"]["charges"][0]["position"] == "CONTRADICTS"
    assert shortage_recorded["payload"]["charges"][0]["position"] == "SUPPORTS"


def test_pack_evidence_changes_returns_and_recovery_decisions(monkeypatch, cases):
    _disable_evidence_writes(monkeypatch)
    case = next(c for c in cases if c["unit_id"] == "UNIT-0016")
    receiving = _run_local_agent("receiving", case, [], {
        "identity_match": "yes",
        "expected_qty": 48,
        "observed_qty": 48,
        "cartons_ordered": 4,
        "cartons_received": 4,
        "units_per_carton_ordered": 12,
        "units_per_carton_counted": 12,
        "carton_damage": "none",
        "unit_damage": "none",
        "quality_flags": "",
    })
    correct_pack = _run_local_agent("pack", case, [receiving], {
        "order_lines": "SKU-TEST:1",
        "observed_in_box": "SKU-TEST:1",
    })
    wrong_pack = _run_local_agent("pack", case, [receiving], {
        "order_lines": "SKU-TEST:1",
        "observed_in_box": "SKU-WRONG:1",
    })
    return_before = _run_local_agent("returns", case, [receiving, correct_pack], {
        "identity_match": "yes", "observed_state": "opened_good",
    })
    return_after = _run_local_agent("returns", case, [receiving, wrong_pack], {
        "identity_match": "yes", "observed_state": "opened_good",
    })
    misship_charge = {"fee_lines": [{"line_id": "SHIP-1", "charge_type": "misship_refund", "amount_usd": 5}]}
    recovery_before = _run_local_agent("recovery", case, [correct_pack], misship_charge)
    recovery_after = _run_local_agent("recovery", case, [wrong_pack], misship_charge)

    assert return_before["decision"]["verdict"] == "PASS"
    assert return_after["decision"]["verdict"] == "UNCERTAIN"
    assert recovery_before["payload"]["charges"][0]["position"] == "CONTRADICTS"
    assert recovery_after["payload"]["charges"][0]["position"] == "SUPPORTS"


def test_returns_identity_changes_recovery_assessment(monkeypatch, cases):
    _disable_evidence_writes(monkeypatch)
    case = next(c for c in cases if c["unit_id"] == "UNIT-0016")
    returned = _run_local_agent("returns", case, [], {"identity_match": "yes"})
    wrong_item = _run_local_agent("returns", case, [], {"identity_match": "no"})
    charge = {"fee_lines": [{
        "line_id": "RETURN-1",
        "charge_type": "refund_issued_item_not_returned",
        "amount_usd": 5,
    }]}

    confirmed = _run_local_agent("recovery", case, [returned], charge)
    wrong = _run_local_agent("recovery", case, [wrong_item], charge)

    assert confirmed["payload"]["charges"][0]["position"] == "CONTRADICTS"
    assert wrong["payload"]["charges"][0]["position"] == "SILENT"
