"""SLA Engine: Policy Dispute Filing Window Engine."""

from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime, date, timedelta
from typing import Optional, Literal

SLAStatus = Literal["open", "min_wait", "expired"]


@dataclass
class SLAResult:
    status: SLAStatus
    posted_date: Optional[date]
    deadline: Optional[date]
    earliest_filing: Optional[date]
    days_remaining: Optional[int]
    policy_version: str
    policy_note: str


SLA_POLICIES = {
    "inbound_defect_fee": {"window_days": 30, "min_wait_days": 0, "name": "FBA Inbound Defect Policy"},
    "inbound_defect": {"window_days": 30, "min_wait_days": 0, "name": "FBA Inbound Defect Policy"},
    "unplanned_prep": {"window_days": 30, "min_wait_days": 0, "name": "FBA Unplanned Prep Policy"},
    "lost_inbound": {"window_days": 270, "min_wait_days": 30, "name": "FBA Lost Inventory Intake Policy"},
    "warehouse_lost": {"window_days": 270, "min_wait_days": 30, "name": "FBA Lost Inventory Intake Policy"},
    "refund_issued_item_not_returned": {"window_days": 60, "min_wait_days": 45, "name": "Customer Return Reimbursement Policy"},
    "customer_return": {"window_days": 60, "min_wait_days": 45, "name": "Customer Return Reimbursement Policy"},
    "damaged_in_warehouse": {"window_days": 180, "min_wait_days": 0, "name": "FBA Warehouse Damage Policy"},
    "warehouse_damaged": {"window_days": 180, "min_wait_days": 0, "name": "FBA Warehouse Damage Policy"},
    "fulfilment_fee_weight_tier": {"window_days": 90, "min_wait_days": 0, "name": "FBA Weight & Dimension Fee Audit"},
}


def evaluate_sla(charge_type: str, posted_date_str: str, today: Optional[date] = None) -> SLAResult:
    today = today or date.today()
    policy = SLA_POLICIES.get(charge_type, {"window_days": 90, "min_wait_days": 0, "name": "General Amazon Policy"})
    policy_ver = "Amazon Policy 2026.1"

    try:
        posted = datetime.strptime(posted_date_str.split("T")[0], "%Y-%m-%d").date()
    except Exception:
        return SLAResult("open", None, None, None, None, policy_ver, "Unknown posted date; SLA window unconstrained.")

    deadline = posted + timedelta(days=policy["window_days"])
    earliest = posted + timedelta(days=policy["min_wait_days"])
    days_left = (deadline - today).days

    if today > deadline:
        return SLAResult("expired", posted, deadline, earliest, days_left, policy_ver, f"Filing window of {policy['window_days']} days expired on {deadline}.")
    if today < earliest:
        return SLAResult("min_wait", posted, deadline, earliest, days_left, policy_ver, f"Minimum waiting period of {policy['min_wait_days']} days applies until {earliest}.")

    return SLAResult("open", posted, deadline, earliest, days_left, policy_ver, f"SLA filing window open ({days_left} days remaining).")
