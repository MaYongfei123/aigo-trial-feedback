import { Trophy } from 'lucide-react';

export default function CompetitionCard({ onEnter }) {
  return (
    <article className="featureCard competitionEntry">
      <div className="featureIcon">
        <Trophy size={26} />
      </div>
      <h2>竞赛能力测评</h2>
      <p>独立评估机器人竞赛中的规则理解、路径规划、循线算法、PID、结构设计与调试复盘能力。</p>
      <button className="primaryButton" type="button" onClick={onEnter}>
        进入竞赛测评
      </button>
    </article>
  );
}
