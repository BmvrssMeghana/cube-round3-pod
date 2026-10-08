// ─── Rule Registry ───────────────────────────────────────────────────────────
// Derived from Amazon FBA Packaging & Prep Requirements
// Source: https://sellercentral.amazon.com/help/hub/reference/external/F4G7547KSLDX2KC
// Last verified: 2026-10-05

export type Verdict = 'pass' | 'fail' | 'uncertain' | 'not_applicable' | 'not_verifiable';
export type OverallDecision = 'PASS' | 'FAIL' | 'REVIEW' | 'PENDING';

export interface Rule {
  rule_id: string;
  rule_name: string;
  check_key: string;
  category: string | string[];
  requirement: string;
  visually_verifiable: boolean;
  evaluation_method: string;
  source_name: string;
  source_url: string;
  source_version: string;
  effective_from: string;
  last_verified_at: string;
  required: boolean;
  not_visually_verifiable_reason?: string;
}

export const RULE_REGISTRY: Rule[] = [
  {
    rule_id: 'POLY-PRESENT-001',
    rule_name: 'Polybag Present',
    check_key: 'polybag_present',
    category: ['softlines', 'plush_toys', 'small_items', 'fragile', 'general_baggable'],
    requirement: 'Items that could be damaged by dust or moisture, or small items that may get lost, must be in a transparent polybag.',
    visually_verifiable: true,
    evaluation_method: 'Visual presence of transparent polybag enclosing the unit.',
    source_name: 'FBA Packaging & Prep Requirements — Polybag',
    source_url: 'https://sellercentral.amazon.com/help/hub/reference/external/F4G7547KSLDX2KC',
    source_version: '2026.10',
    effective_from: '2023-01-01',
    last_verified_at: '2026-10-05',
    required: true,
  },
  {
    rule_id: 'POLY-SEAL-001',
    rule_name: 'Polybag Sealed',
    check_key: 'polybag_sealed',
    category: ['softlines', 'plush_toys', 'small_items', 'fragile', 'general_baggable'],
    requirement: 'Polybag must be completely sealed so the product cannot fall out.',
    visually_verifiable: true,
    evaluation_method: 'Visual inspection of bag seal continuity across visible edge.',
    source_name: 'FBA Packaging & Prep Requirements — Polybag',
    source_url: 'https://sellercentral.amazon.com/help/hub/reference/external/F4G7547KSLDX2KC',
    source_version: '2026.10',
    effective_from: '2023-01-01',
    last_verified_at: '2026-10-05',
    required: true,
  },
  {
    rule_id: 'POLY-THICKNESS-001',
    rule_name: 'Polybag Minimum Thickness',
    check_key: 'polybag_thickness',
    category: ['softlines', 'plush_toys', 'small_items', 'fragile', 'general_baggable'],
    requirement: 'Polybag must be at least 1.5 mil thick for consumer products. Adult products: 2 mil.',
    visually_verifiable: false,
    evaluation_method: 'Cannot be reliably inferred from photographs.',
    source_name: 'FBA Packaging & Prep Requirements — Polybag',
    source_url: 'https://sellercentral.amazon.com/help/hub/reference/external/F4G7547KSLDX2KC',
    source_version: '2026.10',
    effective_from: '2023-01-01',
    last_verified_at: '2026-10-05',
    required: true,
    not_visually_verifiable_reason: 'Bag thickness (mil) cannot be determined from a photograph. Requires physical measurement.',
  },
  {
    rule_id: 'WARN-001',
    rule_name: 'Suffocation Warning Present',
    check_key: 'suffocation_warning',
    category: ['softlines', 'plush_toys', 'small_items', 'fragile', 'general_baggable'],
    requirement: 'Any polybag with an opening of 5 inches (12.7 cm) or larger must display a suffocation warning. Warning must be legible, visible, and not obscured.',
    visually_verifiable: true,
    evaluation_method: 'Visual detection of suffocation warning text on the polybag. OCR for legibility.',
    source_name: 'FBA Packaging & Prep Requirements — Suffocation Warning',
    source_url: 'https://sellercentral.amazon.com/help/hub/reference/external/F4G7547KSLDX2KC',
    source_version: '2026.10',
    effective_from: '2023-01-01',
    last_verified_at: '2026-10-05',
    required: true,
  },
  {
    rule_id: 'FNSKU-PLACEMENT-001',
    rule_name: 'FNSKU Label Placement',
    check_key: 'fnsku_label_placement',
    category: 'all',
    requirement: 'FNSKU label must be placed on a flat surface. Must not span a seam, significant curve, or package edge. Must fully cover any original scannable barcode.',
    visually_verifiable: true,
    evaluation_method: 'Spatial reasoning: verify label lies on a flat, unobstructed surface without crossing seams or curves.',
    source_name: 'FBA Labeling Requirements',
    source_url: 'https://sellercentral.amazon.com/help/hub/reference/external/201100910',
    source_version: '2026.10',
    effective_from: '2023-01-01',
    last_verified_at: '2026-10-05',
    required: true,
  },
  {
    rule_id: 'BARCODE-COVER-001',
    rule_name: 'Original Barcode Covered',
    check_key: 'original_barcode_covered',
    category: 'all',
    requirement: 'Original manufacturer/retail barcode must be completely covered so that only the FNSKU barcode is scannable at the FC.',
    visually_verifiable: true,
    evaluation_method: 'Visual check for presence of original barcode; spatial check that FNSKU or opaque covering obscures it.',
    source_name: 'FBA Labeling Requirements — Barcode Coverage',
    source_url: 'https://sellercentral.amazon.com/help/hub/reference/external/201100910',
    source_version: '2026.10',
    effective_from: '2023-01-01',
    last_verified_at: '2026-10-05',
    required: true,
  },
  {
    rule_id: 'EXPIRY-001',
    rule_name: 'Expiry Date Visible',
    check_key: 'expiry_date_visible',
    category: ['food', 'health', 'beauty', 'grocery', 'supplements', 'liquids_expirable'],
    requirement: 'Expiration date must be visible and legible on the outside of the package, even after prep. Cannot be obscured by labels or wrapping.',
    visually_verifiable: true,
    evaluation_method: 'Visual detection of expiry date area; OCR attempt to read date. If OCR fails, return UNCERTAIN.',
    source_name: 'FBA Expiration Dates Policy',
    source_url: 'https://sellercentral.amazon.com/help/hub/reference/external/201003420',
    source_version: '2026.10',
    effective_from: '2023-01-01',
    last_verified_at: '2026-10-05',
    required: true,
  },
  {
    rule_id: 'HANDLING-FRAGILE-001',
    rule_name: 'Fragile Handling Mark',
    check_key: 'handling_marks',
    category: ['fragile', 'glass', 'ceramics', 'electronics_fragile'],
    requirement: 'Fragile items must display a Fragile handling mark on the outside of the shipping prep.',
    visually_verifiable: true,
    evaluation_method: 'Visual detection of "FRAGILE" label or international fragile symbol.',
    source_name: 'FBA Packaging & Prep Requirements — Fragile',
    source_url: 'https://sellercentral.amazon.com/help/hub/reference/external/F4G7547KSLDX2KC',
    source_version: '2026.10',
    effective_from: '2023-01-01',
    last_verified_at: '2026-10-05',
    required: true,
  },
  {
    rule_id: 'HANDLING-LIQUID-001',
    rule_name: 'Liquid / This Way Up Mark',
    check_key: 'handling_marks',
    category: ['liquids', 'beverages'],
    requirement: 'Liquid and beverage products must display "This Way Up" orientation arrows and/or liquid handling marks.',
    visually_verifiable: true,
    evaluation_method: 'Visual detection of orientation arrows or liquid handling symbols.',
    source_name: 'FBA Packaging & Prep Requirements — Liquids',
    source_url: 'https://sellercentral.amazon.com/help/hub/reference/external/F4G7547KSLDX2KC',
    source_version: '2026.10',
    effective_from: '2023-01-01',
    last_verified_at: '2026-10-05',
    required: true,
  },
  {
    rule_id: 'BUBBLE-WRAP-001',
    rule_name: 'Bubble Wrap Protection',
    check_key: 'bubble_wrap_present',
    category: ['fragile', 'glass', 'ceramics', 'electronics_fragile'],
    requirement: 'Fragile items must be bubble-wrapped so no part of the product is exposed.',
    visually_verifiable: true,
    evaluation_method: 'Visual detection of bubble wrap enclosing all sides of the unit.',
    source_name: 'FBA Packaging & Prep Requirements — Fragile',
    source_url: 'https://sellercentral.amazon.com/help/hub/reference/external/F4G7547KSLDX2KC',
    source_version: '2026.10',
    effective_from: '2023-01-01',
    last_verified_at: '2026-10-05',
    required: false,
  },
  {
    rule_id: 'CAP-SEAL-001',
    rule_name: 'Cap Seal / Induction Seal',
    check_key: 'cap_seal',
    category: ['liquids', 'beverages', 'supplements'],
    requirement: 'Liquid products with caps must have an induction seal or equivalent tamper-evident seal over the cap.',
    visually_verifiable: true,
    evaluation_method: 'Visual inspection for induction/tamper seal on cap.',
    source_name: 'FBA Packaging & Prep Requirements — Liquids',
    source_url: 'https://sellercentral.amazon.com/help/hub/reference/external/F4G7547KSLDX2KC',
    source_version: '2026.10',
    effective_from: '2023-01-01',
    last_verified_at: '2026-10-05',
    required: false,
  },
  {
    rule_id: 'OPAQUE-ADULT-001',
    rule_name: 'Opaque Covering (Adult Products)',
    check_key: 'opaque_covering',
    category: ['adult'],
    requirement: 'Adult products must be covered with opaque material so the product contents are not visible from the outside.',
    visually_verifiable: true,
    evaluation_method: 'Visual confirmation that outer packaging is fully opaque.',
    source_name: 'FBA Packaging & Prep Requirements — Adult Products',
    source_url: 'https://sellercentral.amazon.com/help/hub/reference/external/F4G7547KSLDX2KC',
    source_version: '2026.10',
    effective_from: '2023-01-01',
    last_verified_at: '2026-10-05',
    required: true,
  },
  {
    rule_id: 'SET-LABEL-001',
    rule_name: 'Set / Bundle Label',
    check_key: 'set_label',
    category: ['sets', 'bundles', 'multipacks'],
    requirement: 'A set or bundle must be labeled "Sold as set" or equivalent to prevent fulfillment center from splitting items.',
    visually_verifiable: true,
    evaluation_method: 'Visual detection of "Sold as set" or equivalent label.',
    source_name: 'FBA Packaging & Prep Requirements — Sets',
    source_url: 'https://sellercentral.amazon.com/help/hub/reference/external/F4G7547KSLDX2KC',
    source_version: '2026.10',
    effective_from: '2023-01-01',
    last_verified_at: '2026-10-05',
    required: true,
  },
];

// Category → applicable rule keys mapping
export const CATEGORY_RULES: Record<string, string[]> = {
  general: ['polybag_present', 'polybag_sealed', 'suffocation_warning', 'fnsku_label_placement', 'original_barcode_covered'],
  softlines: ['polybag_present', 'polybag_sealed', 'polybag_thickness', 'suffocation_warning', 'fnsku_label_placement', 'original_barcode_covered'],
  fragile: ['polybag_present', 'polybag_sealed', 'fnsku_label_placement', 'original_barcode_covered', 'handling_marks', 'bubble_wrap_present'],
  liquids: ['polybag_present', 'polybag_sealed', 'fnsku_label_placement', 'original_barcode_covered', 'expiry_date_visible', 'handling_marks', 'cap_seal'],
  food: ['polybag_present', 'polybag_sealed', 'fnsku_label_placement', 'original_barcode_covered', 'expiry_date_visible'],
  health_beauty: ['polybag_present', 'polybag_sealed', 'suffocation_warning', 'fnsku_label_placement', 'original_barcode_covered', 'expiry_date_visible'],
  supplements: ['polybag_present', 'polybag_sealed', 'fnsku_label_placement', 'original_barcode_covered', 'expiry_date_visible', 'cap_seal'],
  adult: ['fnsku_label_placement', 'original_barcode_covered', 'opaque_covering'],
  electronics: ['polybag_present', 'polybag_sealed', 'fnsku_label_placement', 'original_barcode_covered'],
  sets_bundles: ['fnsku_label_placement', 'original_barcode_covered', 'set_label'],
  no_prep: ['fnsku_label_placement', 'original_barcode_covered'],
};

// Product definitions from sample data
export interface Product {
  id: string;
  sku: string;
  asin: string;
  fnsku: string;
  category: string;
  description: string;
  expiry_dated: boolean;
  prep_category: string;
  organization_id: string;
}

export const PRODUCTS: Product[] = [
  { id: 'prod-001', sku: 'SKU-CANDLE-3', asin: 'B0DUMMY964', fnsku: 'X00DUMMY002', category: 'fragile', description: 'Scented Candle 3-pack', expiry_dated: false, prep_category: 'fragile', organization_id: 'org_demo_alpha' },
  { id: 'prod-002', sku: 'SKU-PUZZLE-500', asin: 'B0DUMMY729', fnsku: 'X00DUMMY003', category: 'general', description: '500-Piece Jigsaw Puzzle', expiry_dated: false, prep_category: 'general', organization_id: 'org_demo_alpha' },
  { id: 'prod-003', sku: 'SKU-PROT-1KG', asin: 'B0DUMMY357', fnsku: 'X00DUMMY004', category: 'supplements', description: 'Protein Powder 1KG', expiry_dated: true, prep_category: 'supplements', organization_id: 'org_demo_alpha' },
  { id: 'prod-004', sku: 'SKU-LEASH-6FT', asin: 'B0DUMMY205', fnsku: 'X00DUMMY005', category: 'general', description: 'Dog Leash 6ft', expiry_dated: false, prep_category: 'softlines', organization_id: 'org_demo_alpha' },
  { id: 'prod-005', sku: 'SKU-CABLE-USBC', asin: 'B0DUMMY261', fnsku: 'X00DUMMY007', category: 'electronics', description: 'USB-C Charging Cable', expiry_dated: false, prep_category: 'electronics', organization_id: 'org_demo_alpha' },
  { id: 'prod-006', sku: 'SKU-LAMP-LED', asin: 'B0DUMMY357', fnsku: 'X00DUMMY010', category: 'fragile', description: 'LED Desk Lamp', expiry_dated: false, prep_category: 'fragile', organization_id: 'org_demo_alpha' },
  { id: 'prod-007', sku: 'SKU-MUG-11', asin: 'B0DUMMY351', fnsku: 'X00DUMMY012', category: 'fragile', description: 'Ceramic Mug 11oz', expiry_dated: false, prep_category: 'fragile', organization_id: 'org_demo_alpha' },
  { id: 'prod-008', sku: 'SKU-BOTTLE-750', asin: 'B0DUMMY622', fnsku: 'X00DUMMY018', category: 'no_prep', description: 'Water Bottle 750ml', expiry_dated: false, prep_category: 'no_prep', organization_id: 'org_demo_alpha' },
  { id: 'prod-009', sku: 'SKU-TOWEL-BLU', asin: 'B0DUMMY600', fnsku: 'X00DUMMY025', category: 'softlines', description: 'Blue Microfiber Towel', expiry_dated: false, prep_category: 'softlines', organization_id: 'org_demo_alpha' },
  { id: 'prod-010', sku: 'SKU-SERUM-30', asin: 'B0DUMMY031', fnsku: 'X00DUMMY030', category: 'liquids', description: 'Face Serum 30ml', expiry_dated: true, prep_category: 'liquids', organization_id: 'org_demo_alpha' },
];

// Check key labels
export const CHECK_KEY_LABELS: Record<string, string> = {
  polybag_present: 'Polybag Present',
  polybag_sealed: 'Polybag Sealed',
  polybag_thickness: 'Polybag Thickness (1.5+ mil)',
  suffocation_warning: 'Suffocation Warning',
  fnsku_label_placement: 'FNSKU Label Placement',
  original_barcode_covered: 'Original Barcode Covered',
  expiry_date_visible: 'Expiry Date Visible',
  handling_marks: 'Handling Marks',
  bubble_wrap_present: 'Bubble Wrap Protection',
  cap_seal: 'Cap / Induction Seal',
  opaque_covering: 'Opaque Covering',
  set_label: 'Set / Bundle Label',
};

export function getRulesByCheckKey(checkKey: string): Rule | undefined {
  return RULE_REGISTRY.find(r => r.check_key === checkKey);
}

export function getRulesForCategory(category: string): Rule[] {
  const checkKeys = CATEGORY_RULES[category] || CATEGORY_RULES['general'];
  return checkKeys
    .map(key => RULE_REGISTRY.find(r => r.check_key === key))
    .filter(Boolean) as Rule[];
}
