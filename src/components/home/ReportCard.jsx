import { BarChart3 } from 'lucide-react';

export default function ReportCard({ onEnter }) {
  return (
    <article className="featureCard reportEntry">
      <div className="featureIcon">
        <BarChart3 size={26} />
      </div>
      <h2>阶段学习成果与能力报告</h2>
      <p>用于期末报告、雷达图、成长分析，以及图片、文字和评分的综合输出。</p>
      <button className="primaryButton" type="button" onClick={onEnter}>
        进入报告系统
      </button>
    </article>
  );
}
