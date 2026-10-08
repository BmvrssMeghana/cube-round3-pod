"""Classifier & Integrity Agent for Recovery Manager."""

from __future__ import annotations
import hashlib
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from .evidence_matcher import EvidenceBundle, CHARGE_ROUTING
from .sla_engine import SLAResult


@dataclass
class ClaimDecision:
    line_id: str
    unit_id: str
    org_id: str
    charge_type: str
    amount_usd: float
    verdict: str                  # SUPPORTED, CONTRADICTED, SILENT, UNCERTAIN, EXPIRED
    claim_amount: float
    reasoning: str = ""
    supporting_evidence: List[str] = field(default_factory=list)
    cited_fields: List[Dict] = field(default_factory=list)
    sla: Dict = field(default_factory=dict)
    evidence_dna_tree: Dict = field(default_factory=dict)
    sha256_hash: str = ""
    claimability_score: int = 0
    priority_level: str = "LOW"
    root_cause_driver: str = ""


def classify(bundle: EvidenceBundle, sla_result: SLAResult) -> ClaimDecision:
    charge = bundle.charge
    ct = charge.charge_type
    fields_map = {f.field_name: f.field_value for f in bundle.fields}

    # 1. No evidence routing rule
    if ct not in CHARGE_ROUTING:
        return ClaimDecision(
            line_id=charge.line_id, unit_id=charge.unit_id, org_id=charge.org_id,
            charge_type=ct, amount_usd=charge.amount_usd, verdict="UNCERTAIN",
            claim_amount=0.0, reasoning=f"No routing rule for charge type '{ct}'.",
        )

    # 2. Cross-manager conflict -> UNCERTAIN
    if bundle.conflicts:
        c = bundle.conflicts[0]
        return ClaimDecision(
            line_id=charge.line_id, unit_id=charge.unit_id, org_id=charge.org_id,
            charge_type=ct, amount_usd=charge.amount_usd, verdict="UNCERTAIN",
            claim_amount=0.0, reasoning=f"Cross-manager contradiction detected: {c.description}",
            supporting_evidence=[c.description]
        )

    # 3. No upstream evidence -> SILENT
    if not bundle.upstream_found or not bundle.fields:
        return ClaimDecision(
            line_id=charge.line_id, unit_id=charge.unit_id, org_id=charge.org_id,
            charge_type=ct, amount_usd=charge.amount_usd, verdict="SILENT",
            claim_amount=0.0, reasoning="No operational evidence records found across receiving, prep, pack, or returns.",
        )

    # 4. Charge specific reasoning
    verdict = "SILENT"
    claim_amount = 0.0
    reasoning = ""
    supporting = []

    if ct in ("inbound_defect_fee", "inbound_defect", "unplanned_prep"):
        failed_prep = [f for f in bundle.fields if f.source == "prep" and f.field_value == "FAIL"]
        passed_prep = [f for f in bundle.fields if f.source == "prep" and f.field_value == "PASS"]

        if failed_prep:
            verdict = "SUPPORTED"
            claim_amount = 0.0
            reasoning = "Prep records confirm packaging defect/non-compliance prior to intake. Fee is legitimate."
        elif passed_prep:
            verdict = "CONTRADICTED"
            claim_amount = charge.amount_usd
            reasoning = "Prep inspection logs confirm items were prepared fully in compliance with guidelines prior to intake."
            supporting = [f"Prep check '{f.field_name}': Verified PASS" for f in passed_prep[:3]]

    elif ct in ("lost_inbound", "warehouse_lost"):
        rec_pass = [f for f in bundle.fields if f.source == "receiving" and f.field_name == "quantity" and f.field_value == "PASS"]
        if rec_pass:
            verdict = "CONTRADICTED"
            claim_amount = charge.amount_usd or 10.0
            reasoning = "Receiving intake records confirm all ordered units arrived intact and fully accounted for."
            supporting = ["Receiving quantity check: PASS"]

    elif ct in ("refund_issued_item_not_returned", "customer_return"):
        rtn_pass = [f for f in bundle.fields if f.source == "returns" and f.field_value in ("PASS", "restock", "refurbish")]
        if rtn_pass:
            verdict = "CONTRADICTED"
            claim_amount = charge.amount_usd or 15.0
            reasoning = "Returns logs confirm unit was returned and processed into inventory, contradicting the 'item not returned' fee."
            supporting = ["Returns identity/disposition check: PASS"]

    elif ct in ("damaged_in_warehouse", "warehouse_damaged"):
        rcv_undamaged = [f for f in bundle.fields if f.source == "receiving" and "damage" in f.field_name and f.field_value == "PASS"]
        if rcv_undamaged:
            verdict = "CONTRADICTED"
            claim_amount = charge.amount_usd or 20.0
            reasoning = "Receiving intake logs confirm unit arrived undamaged. Damage occurred during warehouse storage/fulfillment."
            supporting = ["Receiving carton & unit damage check: PASS"]

    # SLA expiration check
    if sla_result.status == "expired" and verdict == "CONTRADICTED":
        verdict = "EXPIRED"
        claim_amount = 0.0
        reasoning = f"Dispute window expired on {sla_result.deadline}. " + reasoning

    score = 85 if verdict == "CONTRADICTED" else (40 if verdict == "SILENT" else 10)
    priority = "HIGH" if (verdict == "CONTRADICTED" and claim_amount >= 30.0) else "LOW"

    raw_payload = f"{charge.line_id}:{charge.unit_id}:{charge.amount_usd}:{verdict}:{claim_amount}:{score}"
    sha256_hash = hashlib.sha256(raw_payload.encode("utf-8")).hexdigest()

    dna_tree = {
        "charge_id": charge.line_id,
        "charge_type": ct,
        "amount_usd": charge.amount_usd,
        "posted_date": charge.posted_date,
        "unit_id": charge.unit_id,
        "verdict": verdict,
        "claim_amount": claim_amount,
        "cited_records": [{"source": f.source, "record_id": f.record_id, "field": f.field_name} for f in bundle.fields]
    }

    return ClaimDecision(
        line_id=charge.line_id,
        unit_id=charge.unit_id,
        org_id=charge.org_id,
        charge_type=ct,
        amount_usd=charge.amount_usd,
        verdict=verdict,
        claim_amount=round(claim_amount, 2),
        reasoning=reasoning,
        supporting_evidence=supporting,
        cited_fields=[{"source": f.source, "record_id": f.record_id, "field": f.field_name, "value": f.field_value} for f in bundle.fields],
        sla={"status": sla_result.status, "deadline": str(sla_result.deadline)},
        evidence_dna_tree=dna_tree,
        sha256_hash=sha256_hash,
        claimability_score=score,
        priority_level=priority,
        root_cause_driver="Operational Dispute"
    )
