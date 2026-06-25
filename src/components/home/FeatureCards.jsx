import LabCard from './LabCard.jsx';
import ReportCard from './ReportCard.jsx';
import TrialCard from './TrialCard.jsx';

export default function FeatureCards({ onNavigate }) {
  return (
    <section className="featureCards" aria-label="核心功能入口">
      <ReportCard onEnter={() => onNavigate('/report')} />
      <TrialCard onEnter={() => onNavigate('/trial')} />
      <LabCard onEnter={() => onNavigate('/lab')} />
    </section>
  );
}
