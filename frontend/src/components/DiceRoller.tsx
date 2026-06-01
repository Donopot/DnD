import { useCallback, useEffect, useRef, useState } from "react";
import { Dice1 } from "lucide-react";

const DICE_FACES: Record<string, string[]> = {
  d4: ["1", "2", "3", "4"],
  d6: ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"],
  d8: ["1", "2", "3", "4", "5", "6", "7", "8"],
  d10: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  d12: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
  d20: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"],
};

type RollingDie = {
  id: number;
  type: string;
  x: number;
  y: number;
  result: number;
  modifier: number;
};

type DiceRollerProps = {
  onRoll: (formula: string, label: string, mode: "normal" | "advantage" | "disadvantage") => void;
};

export function DiceRoller({ onRoll }: DiceRollerProps) {
  const [formula, setFormula] = useState("1d20");
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<"normal" | "advantage" | "disadvantage">("normal");
  const [rolling, setRolling] = useState(false);
  const [dice, setDice] = useState<RollingDie[]>([]);
  const [totalResult, setTotalResult] = useState<number | null>(null);
  const [resultLabel, setResultLabel] = useState("");
  const diceId = useRef(0);
  const animationTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Parse formula like "2d6+3" or "1d20-1"
  const parseFormula = useCallback((f: string): { count: number; type: string; modifier: number } => {
    const match = f.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!match) return { count: 1, type: "d20", modifier: 0 };
    const mod = match[3] ? parseInt(match[3]) : 0;
    return { count: parseInt(match[1]), type: `d${match[2]}`, modifier: mod };
  }, []);

  function rollDice() {
    if (rolling) return;
    setRolling(true);
    setTotalResult(null);

    const { count, type, modifier } = parseFormula(formula);
    if (mode === "advantage" || mode === "disadvantage") {
      // Roll 2d20, keep best/worst
      const r1 = Math.floor(Math.random() * 20) + 1;
      const r2 = Math.floor(Math.random() * 20) + 1;
      const kept = mode === "advantage" ? Math.max(r1, r2) : Math.min(r1, r2);
      const total = kept + modifier;

      const newDice: RollingDie[] = [
        { id: ++diceId.current, type: "d20", x: 30 + Math.random() * 40, y: 20 + Math.random() * 30, result: r1, modifier: 0 },
        { id: ++diceId.current, type: "d20", x: 50 + Math.random() * 40, y: 20 + Math.random() * 30, result: r2, modifier: 0 },
      ];
      setDice(newDice);

      animationTimeout.current = setTimeout(() => {
        setDice([]);
        setTotalResult(total);
        setResultLabel(`${mode === "advantage" ? "Avantage" : "Désavantage"} : ${r1}, ${r2} → ${kept}${modifier >= 0 ? "+" : ""}${modifier} = ${total}`);
        setRolling(false);
        onRoll(formula, label || formula, mode);
      }, 2200);
    } else {
      const results: number[] = [];
      for (let i = 0; i < count; i++) results.push(Math.floor(Math.random() * parseInt(type.slice(1))) + 1);
      const total = results.reduce((s, r) => s + r, 0) + modifier;

      const newDice: RollingDie[] = results.map((r, i) => ({
        id: ++diceId.current,
        type,
        x: 10 + (i * 35) + Math.random() * 20,
        y: 15 + Math.random() * 25,
        result: r,
        modifier: 0,
      }));
      setDice(newDice);

      animationTimeout.current = setTimeout(() => {
        setDice([]);
        setTotalResult(total);
        const resultStr = count > 1
          ? `${results.join(" + ")}${modifier !== 0 ? (modifier > 0 ? " + " : " - ") + Math.abs(modifier) : ""} = ${total}`
          : `${total}`;
        setResultLabel(`${label || formula} : ${resultStr}`);
        setRolling(false);
        onRoll(formula, label || formula, mode);
      }, 2200);
    }
  }

  useEffect(() => {
    return () => { if (animationTimeout.current) clearTimeout(animationTimeout.current); };
  }, []);

  const critStyle = (r: number, type: string) => {
    if (type === "d20" && r === 20) return "crit-success";
    if (type === "d20" && r === 1) return "crit-fail";
    return "";
  };

  return (
    <div className="dice-roller">
      <div className="dice-stage">
        {/* Dice animation area */}
        {dice.map((d) => (
          <div
            key={d.id}
            className={`dice-visual ${critStyle(d.result, d.type)}`}
            style={{ left: `${d.x}%`, top: `${d.y}%` }}
          >
            <div className="dice-body">
              <span className="dice-face">{d.result}</span>
            </div>
          </div>
        ))}

        {/* Final result display */}
        {totalResult !== null && !rolling && (
          <div className={`dice-result ${totalResult === 20 ? "nat20" : totalResult === 1 ? "nat1" : ""}`}>
            <span className="dice-total">{totalResult}</span>
            {resultLabel && <span className="dice-label">{resultLabel}</span>}
          </div>
        )}

        {!rolling && totalResult === null && (
          <div className="dice-placeholder">
            <Dice1 size={32} />
            <span className="muted">Lance les dés !</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="dice-controls">
        <div className="dice-formula-row">
          <input
            type="text"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="ex: 1d20+5"
            className="dice-formula-input"
          />
          <div className="dice-mode-btns">
            <button className={`dice-mode-btn ${mode === "normal" ? "active" : ""}`} onClick={() => setMode("normal")} type="button" title="Normal">1d20</button>
            <button className={`dice-mode-btn ${mode === "advantage" ? "active" : ""}`} onClick={() => setMode("advantage")} type="button" title="Avantage">Adv</button>
            <button className={`dice-mode-btn ${mode === "disadvantage" ? "active" : ""}`} onClick={() => setMode("disadvantage")} type="button" title="Désavantage">Dis</button>
          </div>
        </div>
        <div className="dice-quick-row">
          {["1d4", "1d6", "1d8", "1d10", "1d12", "1d20"].map((d) => (
            <button key={d} className="dice-quick-btn" onClick={() => setFormula(d)} type="button">{d}</button>
          ))}
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (optionnel)"
            className="dice-label-input"
          />
          <button className="dice-roll-btn" onClick={rollDice} disabled={rolling} type="button">
            <Dice1 size={16} /> Lancer
          </button>
        </div>
      </div>
    </div>
  );
}
