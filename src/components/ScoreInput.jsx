import { Info } from 'lucide-react';
import { useState } from 'react';
import { getDimensionId, scoreReferenceStandards } from '../constants/assessment.js';

export default function ScoreInput({ dimension, value, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`scoreRow ${open ? 'open' : ''}`}>
      <div className="scoreLabel">
        <span>{dimension.label}</span>
        <button
          className="scoreHelpButton"
          type="button"
          onClick={() => setOpen((current) => !current)}
          onMouseEnter={() => setOpen(true)}
          aria-expanded={open}
        >
          <Info size={14} />
          评分参考
        </button>
      </div>
      <div className="scoreControl">
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={value}
          onChange={(event) => onChange(getDimensionId(dimension), Number(event.target.value))}
        />
        <strong>{value}</strong>
      </div>
      {open && (
        <div className="scoreReference" onMouseLeave={() => setOpen(false)}>
          {scoreReferenceStandards.map((item) => (
            <div className="scoreReferenceItem" key={item.score}>
              <strong>{item.score}分：{item.title}</strong>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
