#!/usr/bin/env python3
"""
Parse SEC 8-K Exhibit 99.1 earnings releases into quarterly financial amounts.

Earnings releases use very different markup, so the parser works on two levels:

* Tables are read row by row (label cell plus numeric cells).
* Everything else is read as flat text and split into label/number runs, which
  covers image-based slide decks that only carry a hidden text layer.

Rows are matched against known income-statement labels and the value for the
reported quarter is picked from that row's period columns.
"""

import re
from typing import Dict, List, Optional, Tuple

try:
    from lxml import html as lxml_html
except ImportError:  # pragma: no cover - lxml is required for parsing
    lxml_html = None


MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9, "oct": 10,
    "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}

QUARTER_RE = re.compile(r"^Q([1-4])\s*[-–]?\s*(?:FY\s*)?(\d{2,4})$", re.I)
DATE_FIRST_RE = re.compile(r"^(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s](\d{2,4})$")
DATE_LAST_RE = re.compile(r"^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$")
YEAR_RE = re.compile(r"^(19|20)\d{2}$")
NUMBER_RE = re.compile(r"^\(?-?\$?\d[\d,]*(?:\.\d+)?\)?%?$")

UNIT_PATTERNS = [
    (re.compile(r"in\s+billions|\(\$B\)|\$\s*B\b", re.I), 1_000_000_000.0),
    (re.compile(r"in\s+millions|\(\$M\)|\$\s*M\b", re.I), 1_000_000.0),
    (re.compile(r"in\s+thousands|\(\$K\)|\$\s*K\b", re.I), 1_000.0),
]

QUARTER_PHRASES = (
    "three months ended",
    "thirteen weeks ended",
    "three months",
    "13 weeks",
    "thirteen weeks",
    "quarter ended",
)

CUMULATIVE_PHRASES = (
    "six months",
    "nine months",
    "twenty-six weeks",
    "twenty six weeks",
    "thirty-nine weeks",
    "fifty-two weeks",
    "52 weeks",
    "year to date",
    "year ended",
    "twenty weeks",
    "sixteen weeks",
    "forty weeks",
)

METRIC_RULES = [
    (
        "totalRevenue",
        [
            r"^total revenues?$",
            r"^revenues?$",
            r"^total net revenues?$",
            r"^net revenues?$",
            r"^total net sales$",
            r"^net sales$",
            r"^total revenue\b",
            r"^total net revenue",
        ],
    ),
    (
        "grossProfit",
        [
            r"^total gross profit$",
            r"^gross profit$",
            r"^gross margin income$",
        ],
    ),
    (
        "operatingIncome",
        [
            r"^total income from operations$",
            r"^income from operations$",
            r"^income \(loss\) from operations$",
            r"^loss from operations$",
            r"^income \(loss\) from operations",
            r"^total operating income$",
            r"^operating income$",
            r"^operating profit$",
        ],
    ),
    (
        "netIncome",
        [
            r"^net income \(loss\) attributable to (common )?shareholders(\s*\(gaap\))?$",
            r"^net income attributable to common stockholders(\s*\(gaap\))?$",
            r"^net income attributable to shareholders(\s*\(gaap\))?$",
            r"^net income available to common shareholders$",
            r"^net income attributable to (?!noncontrolling).+$",
            r"^net income \(loss\)$",
            r"^net income$",
            r"^net loss$",
            r"^net earnings$",
        ],
    ),
    (
        "ebitda",
        [r"^adjusted ebitda$", r"^ebitda$", r"^total adjusted ebitda$"],
    ),
    (
        "rdExpense",
        [r"^research and development$", r"^research & development$", r"^r&d expense$"],
    ),
    (
        "sgaExpense",
        [
            r"^selling, general and administrative$",
            r"^selling, general, and administrative$",
            r"^selling, general & administrative$",
            r"^sg&a$",
            r"^total selling, general and administrative$",
        ],
    ),
    (
        "costOfRevenue",
        [
            r"^total cost of revenue$",
            r"^cost of revenue$",
            r"^cost of sales$",
            r"^total cost of sales$",
        ],
    ),
    (
        "adjustedNetIncome",
        [
            r"^adjusted net income(?: \(loss\))?$",
            r"^non-gaap net income(?: \(loss\))?$",
            r"^adjusted net income attributable to common shareholders$",
        ],
    ),
    (
        "capitalExpenditures",
        [
            r"^capital expenditures$",
            r"^capex$",
            r"^purchases of property and equipment$",
            r"^capital expenditure$",
        ],
    ),
    (
        "freeCashFlow",
        [r"^free cash flow$", r"^free cashflow$"],
    ),
    (
        "earningsPerShare",
        [
            r"^earnings per (?:basic and )?diluted share$",
            r"^diluted earnings per share$",
            r"^basic earnings per share$",
            r"^earnings per share$",
            r"^net income per (?:basic and )?diluted share$",
            r"^profit per share$",
        ],
    ),
]

EXCLUDE_WORDS = (
    "per share",
    "margin",
    "guidance",
    "outlook",
    "growth",
    "yoy",
    "%",
    "diluted",
    "basic",
    "weighted average",
    "noncontrolling",
)

PRIOR_YEAR_METRICS = (
    "totalRevenue",
    "grossProfit",
    "operatingIncome",
    "netIncome",
    "ebitda",
    "rdExpense",
    "sgaExpense",
    "costOfRevenue",
    "adjustedNetIncome",
    "capitalExpenditures",
    "freeCashFlow",
)


def normalize(text: Optional[str]) -> str:
    if not text:
        return ""
    text = text.replace("\xa0", " ").replace("–", "-").replace("—", "-")
    text = re.sub(r"\.{2,}", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip(" |$")


def parse_number(text: Optional[str]) -> Optional[float]:
    if text is None:
        return None
    raw = normalize(text)
    if not raw or raw in {"-", "N/A", "nm"}:
        return None
    if not NUMBER_RE.match(raw):
        return None
    negative = raw.startswith("(") and raw.endswith(")")
    cleaned = raw.strip("()").replace("$", "").replace("%", "").replace(",", "")
    try:
        value = float(cleaned)
    except ValueError:
        return None
    return -value if negative else value


def parse_period_label(token: str) -> Optional[Tuple[str, object]]:
    """Return ("date", "YYYY-MM-DD") or ("quarter", (quarter, year)) for a period label."""
    token = normalize(token)
    if not token:
        return None
    match = QUARTER_RE.match(token)
    if match:
        quarter = int(match.group(1))
        year = int(match.group(2))
        if year < 100:
            year += 2000
        return ("quarter", (quarter, year))
    match = DATE_FIRST_RE.match(token)
    if match:
        day, month_name, year = int(match.group(1)), match.group(2).lower(), int(match.group(3))
        if year < 100:
            year += 2000
        month = MONTHS.get(month_name)
        if month:
            return ("date", f"{year:04d}-{month:02d}-{day:02d}")
    match = DATE_LAST_RE.match(token)
    if match:
        month_name, day, year = match.group(1).lower(), int(match.group(2)), int(match.group(3))
        month = MONTHS.get(month_name)
        if month:
            return ("date", f"{year:04d}-{month:02d}-{day:02d}")
    return None


def find_period_labels(text: str) -> List[str]:
    labels = []
    for token in re.split(r"[\s|,;]+", text):
        if parse_period_label(token):
            labels.append(normalize(token))
    return labels


def detect_unit(text: str) -> Optional[float]:
    for pattern, multiplier in UNIT_PATTERNS:
        if pattern.search(text):
            return multiplier
    return None


def detect_document_unit(text: str) -> Optional[float]:
    """Unit used most often across a document (press releases mix units)."""
    counts = {
        multiplier: len(pattern.findall(text)) for pattern, multiplier in UNIT_PATTERNS
    }
    best = max(counts.items(), key=lambda item: item[1])
    return best[0] if best[1] > 0 else None


def rows_from_table(table) -> List[List[str]]:
    rows = []
    for tr in table.xpath(".//tr"):
        cells = [normalize(" ".join(td.itertext())) for td in tr.xpath("./td|./th")]
        cells = [c for c in cells if c]
        if cells:
            rows.append(cells)
    return rows


def table_rows_with_positions(table) -> List[List[Dict]]:
    """Rows of cells that keep their column position.

    Financial tables pad columns with empty spacer cells, so the position of a
    value cell is what identifies the period it belongs to.
    """
    rows: List[List[Dict]] = []
    for tr in table.xpath(".//tr"):
        cells: List[Dict] = []
        column = 0
        for td in tr.xpath("./td|./th"):
            try:
                colspan = int(td.get("colspan") or 1)
            except (TypeError, ValueError):
                colspan = 1
            cells.append(
                {
                    "column": column,
                    "colspan": colspan,
                    "text": normalize(" ".join(td.itertext())),
                }
            )
            column += colspan
        if cells:
            rows.append(cells)
    return rows


def is_data_row(cells: List[Dict]) -> bool:
    for cell in cells:
        if cell["column"] == 0:
            continue
        text = cell["text"]
        if parse_number(text) is not None and not YEAR_RE.match(text.strip("()")):
            return True
    return False


def column_profiles(rows: List[List[Dict]]) -> List[Dict]:
    """Describe every column of a table by its period label.

    Each profile carries the header text, the year, the month/day and the
    period kind (quarter, half, nine months, year).
    """
    header_rows: List[List[Dict]] = []
    for cells in rows:
        if is_data_row(cells):
            break
        header_rows.append(cells)

    profiles: List[Dict] = []

    def profile(index: int) -> Dict:
        while len(profiles) <= index:
            profiles.append({"text": [], "year": None, "month": None, "day": None, "kind": None})
        return profiles[index]

    for cells in header_rows:
        for cell in cells:
            text = cell["text"]
            for offset in range(cell["colspan"]):
                entry = profile(cell["column"] + offset)
                if text:
                    entry["text"].append(text)

    for entry in profiles:
        joined = " ".join(entry["text"])
        entry["joined"] = joined
        year_match = re.search(r"\b(19|20)\d{2}\b", joined)
        if year_match:
            entry["year"] = int(year_match.group(0))
        date_match = re.search(r"([A-Za-z]{3,9})\.?\s+(\d{1,2})", joined)
        if date_match:
            month = MONTHS.get(date_match.group(1).lower())
            if month:
                entry["month"] = month
                entry["day"] = int(date_match.group(2))
        lowered = joined.lower()
        if "three months" in lowered or "13 weeks" in lowered or "thirteen weeks" in lowered or "quarter" in lowered:
            entry["kind"] = "quarter"
        elif "six months" in lowered or "26 weeks" in lowered or "twenty-six weeks" in lowered:
            entry["kind"] = "half"
        elif "nine months" in lowered or "39 weeks" in lowered or "thirty-nine weeks" in lowered:
            entry["kind"] = "nine"
        elif "year" in lowered or "twelve months" in lowered or "52 weeks" in lowered:
            entry["kind"] = "year"

    return profiles


def row_values_by_column(cells: List[Dict]) -> Dict[int, float]:
    values: Dict[int, float] = {}
    for cell in cells:
        if cell["column"] == 0:
            continue
        text = cell["text"]
        value = parse_number(text)
        if value is None or YEAR_RE.match(text.strip("()")):
            continue
        values[cell["column"]] = value
    return values


def row_label(cells: List[Dict]) -> str:
    for cell in cells:
        text = cell["text"]
        if not text or YEAR_RE.match(text.strip("()")):
            continue
        if parse_number(text) is not None:
            continue
        return text
    return ""


def collect_metric_columns(rows: List[List[Dict]]) -> Dict[str, Dict[int, float]]:
    """Map every matched metric to its values keyed by column position."""
    candidates: Dict[str, Tuple[int, int, Dict[int, float]]] = {}

    for position, cells in enumerate(rows):
        if not is_data_row(cells):
            continue
        label = row_label(cells)
        match = match_metric(label)
        if not match:
            continue
        metric, specificity = match
        values = row_values_by_column(cells)
        if not values:
            continue
        current = candidates.get(metric)
        if current is None or (specificity, position) < (current[0], current[1]):
            candidates[metric] = (specificity, position, values)

    return {metric: entry[2] for metric, entry in candidates.items()}


def prior_year_column(profiles: List[Dict], period_end: str) -> Optional[int]:
    """Column holding the same period one year earlier."""
    year = int(period_end[:4])
    month = int(period_end[5:7])
    day = int(period_end[8:10])

    current = None
    for index, profile in enumerate(profiles):
        if profile["month"] == month and profile["day"] == day and profile["year"] == year:
            current = index
            break
    if current is None:
        for index, profile in enumerate(profiles):
            if profile["month"] == month and profile["day"] == day and profile["year"]:
                current = index
                break
    if current is None:
        return None

    kind = profiles[current]["kind"]
    for index, profile in enumerate(profiles):
        if index == current:
            continue
        if profile["month"] != month or profile["day"] != day:
            continue
        if profile["year"] != year - 1:
            continue
        if kind and profile["kind"] and profile["kind"] != kind:
            continue
        return index
    return None


def extract_prior_year_metrics(
    table, period_end: str, unit: float, wanted: List[str]
) -> Dict[str, float]:
    """Amounts for the same quarter one year earlier, from the release itself."""
    if table is None or not period_end:
        return {}

    rows = table_rows_with_positions(table)
    profiles = column_profiles(rows)
    if not profiles:
        return {}

    prior_column = prior_year_column(profiles, period_end)
    if prior_column is None:
        return {}

    metrics = collect_metric_columns(rows)
    result: Dict[str, float] = {}
    for metric in wanted:
        values = metrics.get(metric)
        if not values or prior_column not in values:
            continue
        result[metric] = values[prior_column] * unit

    if "grossProfit" not in result and {"totalRevenue", "costOfRevenue"} <= set(result):
        result["grossProfit"] = result["totalRevenue"] - result["costOfRevenue"]

    return result


def rows_from_flat_text(line: str) -> List[Tuple[str, List[float]]]:
    """Split one flat text line into [(label, values)] runs."""
    rows: List[Tuple[str, List[float]]] = []
    label_parts: List[str] = []
    values: List[float] = []

    for token in line.split():
        if token in {"$", "%", "|", "(", ")"}:
            continue
        number = parse_number(token)
        is_year = bool(YEAR_RE.match(token.strip("()")))
        if number is not None and not is_year:
            values.append(number)
            continue
        if values:
            rows.append((" ".join(label_parts), values))
            label_parts = []
            values = []
        label_parts.append(token)

    if values:
        rows.append((" ".join(label_parts), values))
    return rows


def table_rows_to_pairs(
    rows: List[List[str]]
) -> List[Tuple[str, List[float], int]]:
    pairs = []
    for index, cells in enumerate(rows):
        if not cells:
            continue
        if parse_number(cells[0]) is not None and not YEAR_RE.match(cells[0].strip("()")):
            continue
        values = [value for value in (parse_number(cell) for cell in cells[1:]) if value is not None]
        if values:
            pairs.append((cells[0], values, index))
    return pairs


def choose_value(
    values: List[float], header_text: str, period_labels: List[str]
) -> Optional[float]:
    """Pick the value for the reported quarter out of a row's period columns."""
    if not values:
        return None

    header_lower = header_text.lower()
    if "yoy" in header_lower and period_labels and len(values) > len(period_labels):
        values = values[:-1]

    if any(phrase in header_lower for phrase in QUARTER_PHRASES):
        return values[0]

    dates = []
    for label in period_labels:
        parsed = parse_period_label(label)
        if parsed and parsed[0] == "date":
            dates.append(parsed[1])
    if len(dates) >= 2:
        return values[0] if dates[0] > dates[-1] else values[-1]

    if period_labels:
        return values[-1]
    return values[0]


def match_metric(label: str) -> Optional[Tuple[str, int]]:
    normalized = re.sub(r"\s+", " ", normalize(label).lower())
    if not normalized:
        return None

    # Section headings sometimes run into the row label (for example
    # "OPERATING EXPENSES Research and development"), so try the tail of the
    # label as well.
    words = normalized.split()
    candidates = [normalized]
    candidates.extend(" ".join(words[index:]) for index in range(1, len(words) - 1))

    for candidate in candidates:
        for metric, patterns in METRIC_RULES:
            for index, pattern in enumerate(patterns):
                if not re.match(pattern, candidate):
                    continue
                if metric != "earningsPerShare" and any(
                    word in normalized for word in EXCLUDE_WORDS
                ):
                    return None
                return (metric, index)
    return None


def extract_block_metrics(
    rows: List[Tuple[str, List[float]]], header_text: str
) -> Dict[str, float]:
    period_labels = find_period_labels(header_text)
    candidates: Dict[str, Tuple[int, int, float]] = {}

    for position, (label, values) in enumerate(rows):
        match = match_metric(label)
        if not match:
            continue
        metric, specificity = match
        value = choose_value(values, header_text, period_labels)
        if value is None:
            continue
        current = candidates.get(metric)
        if current is None or (specificity, position) < (current[0], current[1]):
            candidates[metric] = (specificity, position, value)

    metrics = {metric: entry[2] for metric, entry in candidates.items()}

    if "grossProfit" not in metrics and "totalRevenue" in metrics and "costOfRevenue" in metrics:
        metrics["grossProfit"] = metrics["totalRevenue"] - metrics["costOfRevenue"]

    return metrics


def collect_blocks(html_text: str) -> List[Tuple[str, List[Tuple[str, List[float]]], object]]:
    """Return [(block header, [(label, values)], table)] for tables and flat text blocks."""
    blocks: List[Tuple[str, List[Tuple[str, List[float]]], object]] = []
    if lxml_html is None:
        return blocks

    document = lxml_html.fromstring(html_text)
    tables = document.xpath("//table")
    for table in tables:
        rows = rows_from_table(table)
        if not rows:
            continue
        raw_pairs = table_rows_to_pairs(rows)
        if not raw_pairs:
            continue
        pairs = [(label, values) for label, values, _ in raw_pairs]
        first_data_index = raw_pairs[0][2]
        header_text = " ".join(" ".join(row) for row in rows[:first_data_index])
        header_text = (header_text + " " + pairs[0][0]).strip()
        blocks.append((header_text, pairs, table))

    for table in tables:
        table.drop_tree()

    flat_text = document.text_content()
    for line in flat_text.splitlines():
        line = normalize(line)
        if not line or len(line) < 20:
            continue
        pairs = rows_from_flat_text(line)
        if pairs:
            blocks.append((pairs[0][0], pairs, None))

    return blocks


def is_cumulative_only(header_text: str) -> bool:
    header_lower = header_text.lower()
    if any(phrase in header_lower for phrase in QUARTER_PHRASES):
        return False
    return any(phrase in header_lower for phrase in CUMULATIVE_PHRASES)


EARNINGS_MARKERS = (
    "quarter ended",
    "three months ended",
    "financial results",
    "reported results",
)


def parse_exhibit_991(html_text: str) -> Optional[Dict]:
    """Extract quarterly amounts and the reported period from an EX-99.1 release."""
    if not html_text or lxml_html is None:
        return None

    document = lxml_html.fromstring(html_text)
    full_text = normalize(document.text_content())
    document_unit = detect_document_unit(full_text)
    is_earnings_release = any(marker in full_text.lower() for marker in EARNINGS_MARKERS)

    best: Optional[Tuple[int, Dict[str, float], str, List[str], float, object]] = None
    block_metrics: List[Tuple[str, Dict[str, float], float]] = []
    for header_text, pairs, table in collect_blocks(html_text):
        if is_cumulative_only(header_text):
            continue
        metrics = extract_block_metrics(pairs, header_text)
        if len(metrics) < 2:
            continue
        unit = detect_unit(header_text) or document_unit
        if unit is None:
            continue
        block_metrics.append((header_text, metrics, unit))
        score = len(metrics)
        if best is None or score > best[0]:
            best = (score, metrics, header_text, find_period_labels(header_text), unit, table)

    if best is None:
        return None

    _, metrics, header_text, period_labels, unit, table = best
    if "totalRevenue" not in metrics:
        return None

    # Releases often split the income statement and the non-GAAP measures into
    # separate tables with the same period columns, so borrow any missing
    # metric from a sibling table that shares the header.
    for sibling_header, sibling_metrics, sibling_unit in block_metrics:
        if sibling_header == header_text and sibling_unit == unit:
            for metric, value in sibling_metrics.items():
                metrics.setdefault(metric, value)

    period_end = None
    match = re.search(
        r"(?:quarter|three months|period) ended\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})",
        full_text,
        re.I,
    )
    if match:
        parsed = parse_period_label(match.group(1))
        if parsed and parsed[0] == "date":
            period_end = parsed[1]

    target_label = None
    if period_end is None and period_labels:
        for label in reversed(period_labels):
            parsed = parse_period_label(label)
            if parsed:
                target_label = label
                if parsed[0] == "date":
                    period_end = parsed[1]
                break

    amounts = {}
    for key, value in metrics.items():
        if key == "costOfRevenue":
            continue
        if key == "earningsPerShare":
            amounts[key] = value
        else:
            amounts[key] = value * unit
    prior_amounts = extract_prior_year_metrics(
        table, period_end, unit, PRIOR_YEAR_METRICS
    )
    return {
        "periodEnd": period_end,
        "periodLabel": target_label,
        "amounts": amounts,
        "priorYearAmounts": prior_amounts,
        "unit": unit,
        "isEarningsRelease": is_earnings_release,
    }
