import { ClipboardCopy, Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useState } from 'react';
import RadarScoreChart from './RadarScoreChart.jsx';
import { buildShareCardReportText, getRecordDimensions, getShareCardContent } from '../utils/report.js';

export default function ParentShareCard({ record, onBackFull, onCopy, copied }) {
  const content = getShareCardContent(record);
  const dimensions = getRecordDimensions(record);
  const [exporting, setExporting] = useState(false);

  function sanitizeFileName(value) {
    return value.replace(/[\\/:*?"<>|]/g, '').trim();
  }

  async function exportShareCard() {
    const studentName = content.name.trim();
    if (!studentName || studentName === '未命名学员') {
      window.alert('请先填写学员姓名后再导出');
      return;
    }

    const cardNode = document.getElementById('parent-share-card');
    if (!cardNode) return;

    setExporting(true);
    try {
      const dataUrl = await toPng(cardNode, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      const fileName = sanitizeFileName(`${studentName}-阶段能力测评报告-${content.assessmentDate}`);
      link.download = `${fileName}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      window.alert('导出图片失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="shareCardPage">
      <div className="shareCard" id="parent-share-card">
        <div className="shareCardHeader">
          <span>爱高创客</span>
          <h2>{content.comparison ? '阶段成长对比报告' : '阶段能力基线报告'}</h2>
        </div>

        <div className="shareStudentRow">
          <div>
            <span>学员姓名</span>
            <strong>{content.name}</strong>
          </div>
          <div className="shareScore">
            <span>综合得分</span>
            <strong>{content.score}</strong>
          </div>
        </div>

        <div className="shareMetaGrid">
          <div>
            <span>年级</span>
            <strong>{content.grade}</strong>
          </div>
          <div>
            <span>课程体系</span>
            <strong>{content.courseSystem}</strong>
          </div>
          <div>
            <span>课程类型</span>
            <strong>{content.courseFormat}</strong>
          </div>
          <div>
            <span>阶段时间</span>
            <strong>{content.assessmentDate}</strong>
          </div>
          <div>
            <span>授课老师</span>
            <strong>{content.teacher}</strong>
          </div>
        </div>

        {content.cycleSummary && (
          <div className="shareTaskSummary">
            <span>阶段依据</span>
            <strong>{content.cycleSummary}</strong>
          </div>
        )}

        <div className="shareChart">
          <RadarScoreChart
            currentAssessment={{ scores: record.scores, dimensions }}
            comparisonAssessment={record.comparison}
          />
        </div>

        {content.comparison ? (
          <div className="shareCompareBox">
            <div>
              <span>相比上次</span>
              <strong>
                {content.comparison.averageChange >= 0 ? '+' : ''}
                {content.comparison.averageChange.toFixed(1)} 分
              </strong>
            </div>
            <div>
              <span>进步最大</span>
              <strong>{content.comparison.topImprovement?.label || '整体稳定'}</strong>
            </div>
          </div>
        ) : content.isBalanced ? (
          <div className="shareBalanced">
            <h3>能力表现</h3>
            <strong>整体表现较为均衡</strong>
          </div>
        ) : (
          <div className="shareTwoColumns">
            <div>
              <h3>优势能力</h3>
              <div className="shareTags">
                {content.strengths.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
            <div>
              <h3>待提升能力</h3>
              <div className="shareTags muted">
                {content.improvements.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {content.comparison?.improved?.length > 0 && (
          <div className="shareAdvice">
            <h3>进步维度</h3>
            <p>{content.comparison.improved.slice(0, 3).map((item) => `${item.label}+${item.change}`).join('、')}</p>
          </div>
        )}

        <div className="shareAdvice">
          <h3>下一阶段建议</h3>
          <p>{content.nextSteps}</p>
        </div>

        <div className="shareTeacherNote">
          <h3>老师寄语</h3>
          <p>{content.teacherMessage}</p>
        </div>
      </div>

      <div className="shareCardActions">
        <button className="copyButton compact" type="button" onClick={exportShareCard} disabled={exporting}>
          <Download size={18} />
          {exporting ? '正在导出...' : '导出 PNG 图片'}
        </button>
        <button className="copyButton compact" type="button" onClick={() => onCopy(buildShareCardReportText(record))}>
          <ClipboardCopy size={18} />
          {copied ? '已复制文字版报告' : '复制文字版报告'}
        </button>
        <button className="secondaryButton" type="button" onClick={onBackFull}>
          返回完整报告
        </button>
      </div>
    </section>
  );
}
