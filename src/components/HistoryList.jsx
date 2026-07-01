import { CalendarDays, Edit3, Eye, Trash2, UserRound } from 'lucide-react';
import { normalizeCourseInfo } from '../constants/assessment.js';
import { getRecordDimensions, getScoreSummary, getStageTimeText } from '../utils/report.js';

export default function HistoryList({ records, onOpenReport, onEditReport, onDelete }) {
  if (!records.length) {
    return (
      <div className="emptyState">
        <strong>暂无匹配记录</strong>
        <span>保存测评后，历史记录会一直保存在本机浏览器中。</span>
      </div>
    );
  }

  return (
    <div className="historyTable">
      <div className="historyTableHead">
        <span>学员</span>
        <span>年级</span>
        <span>课程信息</span>
        <span>阶段时间</span>
        <span>综合分</span>
        <span>老师</span>
        <span>操作</span>
      </div>
      {records.map((record) => {
        const score = getScoreSummary(record.scores, getRecordDimensions(record)).average.toFixed(1);
        const courseInfo = normalizeCourseInfo(record.form);
        const stageTimeText = getStageTimeText(record.form) || '未填写';
        return (
          <article className="historyRecord" key={record.id}>
            <button className="historyMain" type="button" onClick={() => onOpenReport(record)}>
              <span className="historyName">
                <UserRound size={16} />
                {record.form.studentName || '未命名学员'}
              </span>
              <span>{record.form.grade || '未填写'}</span>
              <span className="courseCell">
                <strong>{courseInfo.courseSystem || '未填写'}</strong>
                <small>课程类型：{courseInfo.courseFormat || '未填写'}</small>
              </span>
              <span className="historyMeta">
                <CalendarDays size={15} />
                {stageTimeText}
              </span>
              <strong>{score}</strong>
              <span>{record.form.teacher || '未填写'}</span>
            </button>
            <div className="historyActions">
              <button className="iconButton" type="button" onClick={() => onOpenReport(record)} aria-label="查看报告">
                <Eye size={17} />
              </button>
              <button className="iconButton" type="button" onClick={() => onEditReport(record)} aria-label="编辑此报告">
                <Edit3 size={17} />
              </button>
              <button className="iconButton danger" type="button" onClick={() => onDelete(record.id)} aria-label="删除记录">
                <Trash2 size={17} />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
