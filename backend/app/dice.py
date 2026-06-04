import re
import secrets
from dataclasses import dataclass
from typing import Any

# Atomic group (?>…) prevents polynomial ReDoS backtracking when \d* greedily
# matches digits then fails on a missing 'd' — no backtrack permitted.
# Requires Python 3.11+.
TOKEN_PATTERN = re.compile(r"([+-]?)(?:(?>(\d*))d(\d+)|(\d+))", re.IGNORECASE)
VALID_PATTERN = re.compile(r"^[\ddD+\-\s]+$")
RANDOM = secrets.SystemRandom()


@dataclass
class RollResult:
    total: int
    detail: dict[str, Any]


def roll_formula(formula: str, mode: str = "normal") -> RollResult:
    cleaned = formula.strip().replace(" ", "")
    if not cleaned or len(cleaned) > 80 or not VALID_PATTERN.match(cleaned):
        raise ValueError("Formula must contain only dice, numbers, spaces and +/- operators")

    total = 0
    position = 0
    terms: list[dict[str, Any]] = []

    for match in TOKEN_PATTERN.finditer(cleaned):
        if match.start() != position:
            raise ValueError("Invalid dice formula")
        position = match.end()

        sign = -1 if match.group(1) == "-" else 1
        dice_count = match.group(2)
        dice_sides = match.group(3)
        flat_number = match.group(4)

        if dice_sides:
            count = int(dice_count or "1")
            sides = int(dice_sides)
            if count < 1 or count > 50:
                raise ValueError("Dice count must be between 1 and 50")
            if sides < 2 or sides > 1000:
                raise ValueError("Dice sides must be between 2 and 1000")
            rolls = [RANDOM.randint(1, sides) for _ in range(count)]
            subtotal = sum(rolls) * sign
            total += subtotal
            terms.append(
                {
                    "type": "dice",
                    "sign": sign,
                    "count": count,
                    "sides": sides,
                    "rolls": rolls,
                    "subtotal": subtotal,
                }
            )
        else:
            value = int(flat_number)
            if value > 10000:
                raise ValueError("Flat modifier is too large")
            subtotal = value * sign
            total += subtotal
            terms.append({"type": "flat", "sign": sign, "value": value, "subtotal": subtotal})

    if position != len(cleaned):
        raise ValueError("Invalid dice formula")

    return RollResult(total=total, detail={"formula": cleaned, "mode": mode, "terms": terms})


def roll_with_mode(formula: str, mode: str = "normal") -> RollResult:
    if mode == "normal":
        return roll_formula(formula, mode)
    if mode not in {"advantage", "disadvantage"}:
        raise ValueError("Invalid roll mode")

    first = roll_formula(formula, "normal")
    second = roll_formula(formula, "normal")
    selected = max(first, second, key=lambda item: item.total)
    if mode == "disadvantage":
        selected = min(first, second, key=lambda item: item.total)

    return RollResult(
        total=selected.total,
        detail={
            "formula": formula.strip().replace(" ", ""),
            "mode": mode,
            "rolls": [first.detail, second.detail],
            "selected_total": selected.total,
        },
    )
