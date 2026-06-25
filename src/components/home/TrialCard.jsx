import { MessageSquareText } from 'lucide-react';

export default function TrialCard({ onEnter }) {
  return (
    <article className="featureCard trialEntry">
      <div className="featureIcon">
        <MessageSquareText size={26} />
      </div>
      <h2>试听课学习反馈</h2>
      <p>用于单节课记录、快速评价和临时生成可分享的试听反馈。</p>
      <button className="primaryButton" type="button" onClick={onEnter}>
        进入试听课反馈
      </button>
    </article>
  );
}
