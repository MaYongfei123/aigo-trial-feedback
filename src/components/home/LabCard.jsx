import { Bot } from 'lucide-react';

export default function LabCard({ onEnter }) {
  return (
    <article className="featureCard labEntry">
      <div className="featureIcon">
        <Bot size={26} />
      </div>
      <h2>机器人专项能力测试 Demo</h2>
      <p>用于标准化能力测试、实验室测评和专项观察记录。</p>
      <button className="primaryButton" type="button" onClick={onEnter}>
        进入测试系统
      </button>
    </article>
  );
}
