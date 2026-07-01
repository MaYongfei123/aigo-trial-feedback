import { Copy, Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useState } from 'react';
import RadarScoreChart from './RadarScoreChart.jsx';
import ReportPhotoFrame from './ReportPhotoFrame.jsx';
import { getRecordDimensions, getShareCardContent } from '../utils/report.js';

function splitReportParagraphs(text = '') {
  const manualParagraphs = text
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (manualParagraphs.length > 1) return manualParagraphs.slice(0, 3);

  const sentences = text
    .split(/(?<=[。！？；])/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (sentences.length <= 2) return text ? [text] : [];

  const paragraphCount = Math.min(3, Math.ceil(sentences.length / 2));
  const chunkSize = Math.ceil(sentences.length / paragraphCount);
  return Array.from({ length: paragraphCount }, (_, index) =>
    sentences.slice(index * chunkSize, (index + 1) * chunkSize).join(''),
  ).filter(Boolean);
}

export default function ParentShareCard({ record, onBackHistory, onBackEdit, onCopyAsNew, highlightPhoto }) {
  const content = getShareCardContent(record);
  const dimensions = getRecordDimensions(record);
  const reportParagraphs = splitReportParagraphs(content.projectParentReportDescription);
  const resolvedLayout = highlightPhoto?.orientation || 'no-photo';
  const studentName = content.name && content.name !== '未命名学员' ? content.name : '';
  const grade = content.grade && content.grade !== '未填写' ? content.grade : '';
  const teacher = content.teacher && content.teacher !== '未填写' ? content.teacher : '';
  const [exporting, setExporting] = useState(false);

  function sanitizeFileName(value) {
    return value.replace(/[\\/:*?"<>|]/g, '').trim();
  }

  async function exportShareCard() {
    if (!studentName.trim()) {
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
      const fileName = sanitizeFileName(`${studentName}-阶段能力测评报告-${content.learningPeriod || '阶段报告'}`);
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
      <div className={`shareCard ${resolvedLayout}`} id="parent-share-card">
        <div className="shareCardHeader">
          <span>爱高创客</span>
          <h2>{content.comparison ? '阶段成长对比报告' : '阶段能力基线报告'}</h2>
        </div>

        <div className={`shareReportBody ${highlightPhoto ? 'hasPhoto' : ''}`}>
          {highlightPhoto && (
            <ReportPhotoFrame className="sharePhoto" photo={highlightPhoto} />
          )}

          <div className="shareReportContent">
            <div className="shareStudentRow">
              {studentName && (
                <div>
                  <span>学员姓名</span>
                  <strong>{studentName}</strong>
                </div>
              )}
            </div>

            <div className="shareMetaGrid">
              {grade && (
                <div>
                  <span>年级</span>
                  <strong>{grade}</strong>
                </div>
              )}
              {teacher && (
                <div>
                  <span>授课老师</span>
                  <strong>{teacher}</strong>
                </div>
              )}
            </div>

            {content.learningPeriod && (
              <div className="sharePeriodBlock">
                <span>学习周期</span>
                <strong>{content.learningPeriod}</strong>
              </div>
            )}

            <div className="shareChart">
              <h3>阶段能力画像</h3>
              <RadarScoreChart
                currentAssessment={{ scores: record.scores, dimensions }}
                comparisonAssessment={record.comparison}
              />
            </div>

            {reportParagraphs.length > 0 && (
              <div className="shareReportBlock">
                <h3>家长报告描述</h3>
                {reportParagraphs.map((paragraph, index) => (
                  <p key={`${paragraph}-${index}`}>{paragraph}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="shareCardActions">
        <button className="copyButton compact" type="button" onClick={exportShareCard} disabled={exporting}>
          <Download size={18} />
          {exporting ? '正在生成图片…' : '导出 PNG 图片'}
        </button>
        {onBackHistory && (
          <button className="secondaryButton" type="button" onClick={onBackHistory}>
            返回记录列表
          </button>
        )}
        <button className="secondaryButton" type="button" onClick={onBackEdit}>
          返回修改
        </button>
        <button className="secondaryButton" type="button" onClick={onCopyAsNew}>
          <Copy size={18} />
          复制为新学员报告
        </button>
      </div>
    </section>
  );
}
