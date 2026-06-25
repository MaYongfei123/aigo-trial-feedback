import { BookOpenCheck } from 'lucide-react';

export default function HomeHeader() {
  return (
    <section className="homeHeader">
      <div className="eyebrow">
        <BookOpenCheck size={18} />
        AIGO Education OS
      </div>
      <h1>教育数据操作台</h1>
      <p>把阶段报告、试听反馈和专项能力测试拆成独立入口，老师打开手机就能直接进入对应工作台。</p>
    </section>
  );
}
