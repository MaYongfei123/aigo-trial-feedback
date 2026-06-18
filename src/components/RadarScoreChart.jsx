import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { PRIMARY_COLOR } from '../constants/assessment.js';
import { toRadarData } from '../utils/report.js';

function toFiniteScore(value, fallback = 3) {
  const score = Number(value);
  return Number.isFinite(score) ? score : fallback;
}

export default function RadarScoreChart({
  currentAssessment,
  comparisonAssessment,
  scores,
  dimensions,
  comparison,
}) {
  const currentScores = currentAssessment?.scores || scores || {};
  const currentDimensions = currentAssessment?.dimensions || dimensions || [];
  const isRobotAssessment = currentDimensions.some((dimension) => (dimension.id || dimension.key || '').startsWith('robot_'));
  const selectedComparison = isRobotAssessment ? null : comparisonAssessment || comparison || null;
  const currentData = toRadarData(currentScores, currentDimensions).map((item) => ({
    ...item,
    score: toFiniteScore(item.score),
  }));
  const fallbackCurrentData = (selectedComparison?.entries || []).map((item) => ({
    dimension: item.label,
    score: toFiniteScore(item.currentScore),
    fullMark: 5,
  }));
  const baseData = currentData.length ? currentData : fallbackCurrentData;
  const comparisonByLabel = new Map(
    (selectedComparison?.entries || [])
      .filter((item) => Number.isFinite(Number(item.previousScore)))
      .map((item) => [item.label, Number(item.previousScore)]),
  );
  const hasComparisonData = baseData.length > 0 && baseData.every((item) => comparisonByLabel.has(item.dimension));
  const data = hasComparisonData
    ? baseData.map((item) => ({
        ...item,
        previousScore: comparisonByLabel.get(item.dimension),
      }))
    : baseData;

  return (
    <div className="chartBox" aria-label="学员能力雷达图">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="68%" data={data}>
          <PolarGrid stroke="#dbe6f2" />
          <PolarAngleAxis dataKey="dimension" tick={{ fill: '#24445f', fontSize: 12 }} />
          <PolarRadiusAxis angle={90} domain={[0, 5]} tickCount={6} tick={{ fill: '#6a7b8d', fontSize: 11 }} />
          {hasComparisonData ? (
            <>
              <Radar
                name="上次测评"
                dataKey="previousScore"
                stroke="#8aa6c0"
                fill="#8aa6c0"
                fillOpacity={0.14}
                strokeWidth={2}
              />
              <Radar
                name="本次测评"
                dataKey="score"
                stroke={PRIMARY_COLOR}
                fill={PRIMARY_COLOR}
                fillOpacity={0.22}
                strokeWidth={2}
              />
              <Legend />
            </>
          ) : (
            <Radar
              name="能力得分"
              dataKey="score"
              stroke={PRIMARY_COLOR}
              fill={PRIMARY_COLOR}
              fillOpacity={0.22}
              strokeWidth={2}
            />
          )}
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
