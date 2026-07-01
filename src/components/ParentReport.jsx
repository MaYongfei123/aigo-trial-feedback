import { ClipboardCopy } from 'lucide-react';
import RadarScoreChart from './RadarScoreChart.jsx';
import { getDimensionId, normalizeCourseInfo } from '../constants/assessment.js';
import {
  buildParentReportText,
  getRecordDimensions,
  getScoreSummary,
  getScoreValue,
  getStageObservation,
  getStageTimeText,
} from '../utils/report.js';

export default function ParentReport({ record, onCopy, copied }) {
  const dimensions = getRecordDimensions(record);
  const summary = getScoreSummary(record.scores, dimensions);
  const form = record.form;
  const stageObservation = getStageObservation(form);
  const stageTimeText = getStageTimeText(form);
  const courseInfo = normalizeCourseInfo(form);
  const report = {
    ...record.report,
    teacherMessage:
      record.report.teacherMessage ||
      `${form.studentName || '孩子'}在课堂中已经积累了不少可见的成长。接下来我们会继续关注作品完成、表达复盘和独立解决问题的过程。`,
  };

  return (
    <section className="parentReport">
      <div className="reportCover">
        <span>爱高创客</span>
        <h2>{report.reportType || '阶段能力测评报告'}</h2>
        <p>{form.studentName || '未命名学员'}</p>
      </div>

      <div className="reportInfoGrid">
        <div>
          <span>课程体系</span>
          <strong>{courseInfo.courseSystem || '未填写'}</strong>
        </div>
        {stageTimeText && (
          <div>
            <span>学习周期</span>
            <strong>{stageTimeText}</strong>
          </div>
        )}
        <div>
          <span>年级</span>
          <strong>{form.grade || '未填写'}</strong>
        </div>
        <div>
          <span>授课老师</span>
          <strong>{form.teacher || '未填写'}</strong>
        </div>
      </div>

      <div className="scoreHero">
        <span>综合得分</span>
        <strong>{summary.average.toFixed(1)}</strong>
        <small>满分 5 分</small>
      </div>

      {record.comparison && (
        <div className="reportSection">
          <h3>阶段成长对比</h3>
          <p>
            上次平均分 {record.comparison.previousAverage.toFixed(1)}，本次平均分{' '}
            {record.comparison.currentAverage.toFixed(1)}，变化{' '}
            {record.comparison.averageChange >= 0 ? '+' : ''}
            {record.comparison.averageChange.toFixed(1)} 分。
          </p>
          {record.comparison.improved.length > 0 && (
            <p>进步维度：{record.comparison.improved.map((item) => `${item.label}+${item.change}`).join('、')}</p>
          )}
          {record.comparison.declined.length > 0 && (
            <p>下降维度：{record.comparison.declined.map((item) => `${item.label}${item.change}`).join('、')}</p>
          )}
          {record.comparison.stable.length > 0 && (
            <p>稳定维度：{record.comparison.stable.map((item) => item.label).join('、')}</p>
          )}
          {record.comparison.topImprovement && (
            <p>
              进步最大维度：{record.comparison.topImprovement.label} +{record.comparison.topImprovement.change} 分
            </p>
          )}
        </div>
      )}

      {(stageObservation.assessmentCycle ||
        stageObservation.teacherComment) && (
        <div className="reportSection">
          <h3>阶段观察依据</h3>
          {stageObservation.assessmentCycle && <p>测评周期：{stageObservation.assessmentCycle}</p>}
          {stageObservation.teacherComment && <p>老师备注：{stageObservation.teacherComment}</p>}
        </div>
      )}

      {(form.projectName ||
        form.projectLearningContent ||
        form.projectAbilities ||
        form.projectParentReportDescription) && (
        <div className="reportSection">
          <h3>学习依据</h3>
          {form.projectName && <p>本阶段内容摘要：{form.projectName}</p>}
          {form.projectLearningContent && <p>学期总结：{form.projectLearningContent}</p>}
          {form.projectAbilities && <p>对应能力：{form.projectAbilities}</p>}
          {form.projectParentReportDescription && <p>家长报告描述：{form.projectParentReportDescription}</p>}
        </div>
      )}

      <div className="reportSection">
        <h3>能力雷达图</h3>
        <RadarScoreChart
          currentAssessment={{ scores: record.scores, dimensions }}
          comparisonAssessment={record.comparison}
        />
      </div>

      <div className="abilityRows">
        {dimensions.map((dimension) => (
          <div className="abilityRow" key={getDimensionId(dimension)}>
            <span>{dimension.label}</span>
            <strong>{getScoreValue(record.scores, dimension)} 分</strong>
          </div>
        ))}
      </div>

      <div className="reportSection">
        <h3>优势能力</h3>
        <p>{report.strengths}</p>
      </div>
      <div className="reportSection">
        <h3>待提升能力</h3>
        <p>{report.improvements}</p>
      </div>
      <div className="reportSection">
        <h3>下一阶段建议</h3>
        <p>{report.nextSteps}</p>
      </div>
      <div className="teacherNote">
        <h3>老师寄语</h3>
        <p>{report.teacherMessage}</p>
      </div>

      <button className="copyButton" type="button" onClick={() => onCopy(buildParentReportText(record))}>
        <ClipboardCopy size={18} />
        {copied ? '已复制文字版报告' : '复制文字版报告'}
      </button>
    </section>
  );
}
