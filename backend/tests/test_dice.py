"""Unit tests for the dice roller."""

import pytest
from app.dice import roll_formula, roll_with_mode, RollResult


class TestRollFormula:
    def test_simple_d20(self):
        result = roll_formula("1d20")
        assert 1 <= result.total <= 20
        assert result.detail["formula"] == "1d20"
        assert len(result.detail["terms"]) == 1
        assert result.detail["terms"][0]["type"] == "dice"
        assert result.detail["terms"][0]["rolls"][0] >= 1

    def test_multiple_dice(self):
        result = roll_formula("3d6")
        assert 3 <= result.total <= 18
        assert result.detail["terms"][0]["count"] == 3
        assert result.detail["terms"][0]["sides"] == 6

    def test_flat_modifier_positive(self):
        result = roll_formula("d20+5")
        assert 6 <= result.total <= 25  # 1..20 + 5

    def test_flat_modifier_negative(self):
        result = roll_formula("d20-3")
        assert -2 <= result.total <= 17  # 1..20 - 3

    def test_complex_formula(self):
        result = roll_formula("2d6+1d4+3")
        assert 6 <= result.total <= 19  # 2..12 + 1..4 + 3

    def test_formula_with_spaces(self):
        result = roll_formula(" 2d6 + 4 ")
        assert result.detail["formula"] == "2d6+4"

    def test_max_dice_count(self):
        result = roll_formula("50d2")
        assert 50 <= result.total <= 100

    def test_invalid_empty(self):
        with pytest.raises(ValueError):
            roll_formula("")

    def test_invalid_too_long(self):
        with pytest.raises(ValueError):
            roll_formula("d" * 81)

    def test_invalid_characters(self):
        with pytest.raises(ValueError):
            roll_formula("abc")

    def test_dice_count_too_low(self):
        with pytest.raises(ValueError):
            roll_formula("0d20")

    def test_dice_count_too_high(self):
        with pytest.raises(ValueError):
            roll_formula("51d20")

    def test_dice_sides_too_low(self):
        with pytest.raises(ValueError):
            roll_formula("1d1")

    def test_dice_sides_too_high(self):
        with pytest.raises(ValueError):
            roll_formula("1d1001")

    def test_flat_modifier_too_large(self):
        with pytest.raises(ValueError):
            roll_formula("10001")

    def test_malformed_formula(self):
        with pytest.raises(ValueError):
            roll_formula("d+")


class TestRollWithMode:
    def test_advantage(self):
        result = roll_with_mode("1d20", "advantage")
        assert result.detail["mode"] == "advantage"
        assert "rolls" in result.detail
        assert len(result.detail["rolls"]) == 2
        # Selected should be max of the two
        first_detail = result.detail["rolls"][0]
        second_detail = result.detail["rolls"][1]
        # Each roll detail is a full RollResult.detail dict with "terms"
        assert "terms" in first_detail
        assert "terms" in second_detail
        assert result.detail["selected_total"] == result.total

    def test_disadvantage(self):
        result = roll_with_mode("1d20", "disadvantage")
        assert result.detail["mode"] == "disadvantage"
        first_detail = result.detail["rolls"][0]
        second_detail = result.detail["rolls"][1]
        assert "terms" in first_detail
        assert "terms" in second_detail
        assert result.detail["selected_total"] == result.total

    def test_normal_mode(self):
        result = roll_with_mode("1d20", "normal")
        assert result.detail["mode"] == "normal"
        assert "rolls" not in result.detail

    def test_invalid_mode(self):
        with pytest.raises(ValueError, match="Invalid roll mode"):
            roll_with_mode("1d20", "double_advantage")

    def test_default_mode_is_normal(self):
        result = roll_with_mode("1d6")
        assert result.detail["mode"] == "normal"
