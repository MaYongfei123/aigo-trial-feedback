import { scoreReferenceStandards } from '../constants/assessment.js';

export default function ScoreGuide() {
  return (
    <section className="scoreGuide" aria-label="评分说明">
      <div>
        <h3>评分说明</h3>
        <p>每项能力按 1-5 分观察学员在阶段任务中的独立程度、稳定性、迁移应用和表达复盘表现。</p>
      </div>
      <div className="scoreGuideScale">
        {scoreReferenceStandards.map((item) => (
          <span key={item.score}>
            <strong>{item.score}</strong>
            {item.title}
          </span>
        ))}
      </div>
    </section>
  );
}
