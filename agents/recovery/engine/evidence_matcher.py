"""Evidence Matcher: Resolves operational evidence and upstream stage outputs for Recovery."""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

CHARGE_ROUTING = {
    "inbound_defect_fee": ["prep", "receiving"],
    "inbound_defect": ["prep", "receiving"],
    "unplanned_prep": ["prep", "receiving"],
    "lost_inbound": ["receiving"],
    "warehouse_lost": ["receiving"],
    "refund_issued_item_not_returned": ["returns", "pack"],
    "customer_return": ["returns", "pack"],
    "damaged_in_warehouse": ["receiving", "returns"],
    "warehouse_damaged": ["receiving", "returns"],
    "fulfilment_fee_weight_tier": ["prep", "receiving"],
}


@dataclass
class EvidenceField:
    source: str
    record_id: str
    field_name: str
    field_value: Any
    timestamp: Optional[str] = None


@dataclass
class ChargeLine:
    line_id: str
    unit_id: str
    org_id: str
    charge_type: str
    amount_usd: float
    posted_date: str
    sku: Optional[str] = None
    fnsku: Optional[str] = None
    order_id: Optional[str] = None
    fba_shipment_id: Optional[str] = None


@dataclass
class Conflict:
    description: str
    records: List[str]


@dataclass
class EvidenceBundle:
    charge: ChargeLine
    fields: List[EvidenceField] = field(default_factory=list)
    upstream_found: bool = False
    evidence_postdates_charge: bool = False
    conflicts: List[Conflict] = field(default_factory=list)
    completeness_score: float = 1.0
    missing_fields: List[str] = field(default_factory=list)


def build_evidence_bundle(charge: ChargeLine, previous_evidence: List[Dict[str, Any]]) -> EvidenceBundle:
    bundle = EvidenceBundle(charge=charge)
    fields = []
    found_sources = set()

    for rec in previous_evidence:
        stage = rec.get("stage", rec.get("evidence", {}).get("stage"))
        rec_id = rec.get("record_id", rec.get("evidence", {}).get("record_id", "EVD-UNK"))
        status = rec.get("status", rec.get("evidence", {}).get("status", "completed"))

        if status != "completed":
            continue

        found_sources.add(stage)

        # Extract checks & payload
        checks = rec.get("checks", rec.get("evidence", {}).get("checks", []))
        payload = rec.get("payload", rec.get("evidence", {}).get("payload", {}))

        for c in checks:
            fields.append(EvidenceField(
                source=stage,
                record_id=rec_id,
                field_name=c.get("check_name", c.get("name", "check")),
                field_value=c.get("verdict", c.get("status", "PASS")),
                timestamp=rec.get("captured_at", rec.get("evidence", {}).get("captured_at")),
            ))

        for k, v in payload.items():
            if isinstance(v, (str, int, float, bool)):
                fields.append(EvidenceField(
                    source=stage,
                    record_id=rec_id,
                    field_name=k,
                    field_value=v,
                    timestamp=rec.get("captured_at", rec.get("evidence", {}).get("captured_at")),
                ))

    bundle.fields = fields
    bundle.upstream_found = len(found_sources) > 0
    bundle.completeness_score = min(len(fields) / 4.0, 1.0) if fields else 0.0
    
    # Check cross-stage conflict (e.g. Receiving undamaged vs Returns damaged)
    rcv_damage = [f.field_value for f in fields if f.source == "receiving" and "damage" in f.field_name]
    rtn_damage = [f.field_value for f in fields if f.source == "returns" and "damage" in f.field_name]

    if rcv_damage and rtn_damage and rcv_damage[0] == "PASS" and rtn_damage[0] == "FAIL":
        bundle.conflicts.append(Conflict(
            description="Cross-stage conflict: Receiving verified undamaged, but Returns logged damage.",
            records=[f.record_id for f in fields if f.source in ("receiving", "returns")]
        ))

    return bundle
