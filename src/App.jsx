import { ArrowLeft, BookOpenCheck, Bot, Database, FileText, FolderKanban, History, MessageSquareText, Save, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import HistoryList from './components/HistoryList.jsx';
import ParentReport from './components/ParentReport.jsx';
import ParentShareCard from './components/ParentShareCard.jsx';
import ProjectLibrary from './components/ProjectLibrary.jsx';
import RadarScoreChart from './components/RadarScoreChart.jsx';
import ReportPreview from './components/ReportPreview.jsx';
import RobotSpecialTestDemo from './components/RobotSpecialTestDemo.jsx';
import ScoreGuide from './components/ScoreGuide.jsx';
import ScoreInput from './components/ScoreInput.jsx';
import TrialClassFeedback from './components/TrialClassFeedback.jsx';
import {
  courseFormats,
  courseSystems,
  getAbilityDimensions,
  getDimensionId,
  grades,
} from './constants/assessment.js';
import {
  deleteProject,
  deleteRecord,
  deleteTrialClassRecord,
  loadProjects,
  loadRecords,
  loadTrialClassRecords,
  saveProject,
  saveRecord,
  saveTrialClassRecord,
} from './services/storage.js';
import {
  createEmptyScores,
  generateReport,
  getComparisonAnalysis,
  getScoreSummary,
  getScoreValue,
  getStageTimeText,
} from './utils/report.js';

const today = new Date().toISOString().slice(0, 10);

const initialForm = {
  studentName: '',
  grade: '',
  courseSystem: '',
  abilityStage: '',
  courseFormat: '',
  projectIds: [],
  projectId: '',
  projectName: '',
  projectLearningContent: '',
  projectAbilities: '',
  projectStageOutcome: '',
  projectParentReportDescription: '',
  stageStartDate: today,
  stageEndDate: today,
  assessmentDate: today,
  teacher: '',
  stageObservation: {
    assessmentCycle: '',
    teacherComment: '',
  },
};

const previousComparisonModes = new Set(['previous', 'latest', 'last', 'withLast']);

function createRecord(form, currentAssessment, report, comparisonAssessment) {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    form: { ...form },
    scores: { ...currentAssessment.scores },
    dimensions: currentAssessment.dimensions,
    comparison: comparisonAssessment,
    report: { ...report },
  };
}

function getTimeValue(value) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

function getRecordSortValues(record) {
  const assessmentTime = getTimeValue(
    record?.form?.stageEndDate ||
      record?.form?.stageStartDate ||
      record?.form?.assessmentDate ||
      record?.assessmentDate,
  );
  const createdTime = record?.createdAt ? new Date(record.createdAt).getTime() : 0;
  return {
    assessmentTime,
    createdTime: Number.isNaN(createdTime) ? 0 : createdTime,
  };
}

function sortAssessmentRecords(records) {
  return [...records].sort((a, b) => {
    const aValues = getRecordSortValues(a);
    const bValues = getRecordSortValues(b);
    return bValues.assessmentTime - aValues.assessmentTime || bValues.createdTime - aValues.createdTime;
  });
}

function clearSelectedProjectFields(form) {
  return {
    ...form,
    projectIds: [],
    projectId: '',
    projectName: '',
    projectLearningContent: '',
    projectAbilities: '',
    projectStageOutcome: '',
    projectParentReportDescription: '',
  };
}

function splitProjectText(value = '') {
  return value
    .split(/[、,，;；\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueProjectItems(items) {
  return [...new Set(items.filter(Boolean))];
}

function summarizeProjects(selectedProjects) {
  const projectNames = selectedProjects.map((project) => project.projectName).filter(Boolean);
  const learningItems = uniqueProjectItems(selectedProjects.flatMap((project) => splitProjectText(project.learningContent)));
  const abilityItems = uniqueProjectItems(selectedProjects.flatMap((project) => splitProjectText(project.relatedAbilities)));
  const outcomeParagraphs = selectedProjects
    .filter((project) => project.stageOutcome)
    .map((project) => `【${project.projectName || '学习内容'}】${project.stageOutcome}`);
  const parentParagraphs = selectedProjects
    .filter((project) => project.parentReportDescription)
    .map((project) => `【${project.projectName || '学习内容'}】${project.parentReportDescription}`);

  return {
    projectIds: selectedProjects.map((project) => project.id),
    projectId: selectedProjects[0]?.id || '',
    projectName: projectNames.join('、'),
    projectLearningContent: learningItems.join('、'),
    projectAbilities: abilityItems.join('、'),
    projectStageOutcome: outcomeParagraphs.join('\n'),
    projectParentReportDescription: parentParagraphs.join('\n'),
  };
}

export default function App() {
  const [view, setView] = useState('assessment');
  const [form, setForm] = useState(initialForm);
  const [scores, setScores] = useState(() => createEmptyScores(getAbilityDimensions(initialForm.courseSystem)));
  const [records, setRecords] = useState(loadRecords);
  const [projects, setProjects] = useState(loadProjects);
  const [trialClassRecords, setTrialClassRecords] = useState(loadTrialClassRecords);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [searchName, setSearchName] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const [reportMode, setReportMode] = useState('full');
  const [comparisonMode, setComparisonMode] = useState('none');
  const [customComparisonId, setCustomComparisonId] = useState('');

  const currentDimensions = useMemo(() => getAbilityDimensions(form.courseSystem), [form.courseSystem]);
  const currentAssessment = useMemo(
    () => ({
      scores,
      dimensions: currentDimensions,
    }),
    [scores, currentDimensions],
  );
  const summary = useMemo(() => getScoreSummary(scores, currentDimensions), [scores, currentDimensions]);
  const availableProjects = useMemo(
    () =>
      projects.filter((project) => {
        const matchesGrade = !form.grade || project.applicableGrade === form.grade;
        const matchesSystem = !form.courseSystem || project.courseSystem === form.courseSystem;
        const matchesFormat = !form.courseFormat || project.courseFormat === form.courseFormat;
        return matchesGrade && matchesSystem && matchesFormat;
      }),
    [form.courseFormat, form.courseSystem, form.grade, projects],
  );
  const studentHistory = useMemo(() => {
    const name = form.studentName.trim();
    if (!name) return [];
    return sortAssessmentRecords(records.filter((record) => (record.form?.studentName || '').trim() === name));
  }, [form.studentName, records]);
  const latestComparisonRecord = useMemo(() => studentHistory[0] || null, [studentHistory]);
  const comparisonRecord = useMemo(() => {
    if (!studentHistory.length || comparisonMode === 'none') return null;
    if (previousComparisonModes.has(comparisonMode)) return latestComparisonRecord;
    return studentHistory.find((record) => record.id === customComparisonId) || null;
  }, [comparisonMode, customComparisonId, latestComparisonRecord, studentHistory]);
  const comparisonAnalysis = useMemo(
    () => getComparisonAnalysis(scores, currentDimensions, comparisonRecord),
    [scores, currentDimensions, comparisonRecord],
  );
  const comparisonAssessment = useMemo(
    () => (comparisonAnalysis?.isFullMatch ? comparisonAnalysis : null),
    [comparisonAnalysis],
  );
  const comparisonWarning =
    comparisonMode !== 'none' && comparisonRecord && !comparisonAnalysis
      ? '历史记录维度不一致，仅显示本次测评。'
      : comparisonMode !== 'none' && comparisonRecord && comparisonAnalysis && !comparisonAnalysis.isFullMatch
        ? '历史记录只匹配到部分维度，仅显示本次测评。'
      : '';
  const report = useMemo(
    () => generateReport(form, scores, currentDimensions, comparisonAssessment),
    [form, scores, currentDimensions, comparisonAssessment],
  );
  const filteredRecords = useMemo(() => {
    const keyword = searchName.trim().toLowerCase();
    if (!keyword) return records;
    return records.filter((record) => (record.form.studentName || '').toLowerCase().includes(keyword));
  }, [records, searchName]);

  function updateForm(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      return field === 'grade' && value !== current.grade ? clearSelectedProjectFields(next) : next;
    });
  }

  function updateStageObservation(field, value) {
    setForm((current) => ({
      ...current,
      stageObservation: {
        ...current.stageObservation,
        [field]: value,
      },
    }));
  }

  function updateStageDate(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      return {
        ...next,
        assessmentDate: next.stageEndDate || next.stageStartDate || current.assessmentDate,
      };
    });
  }

  function updateCourseSystem(value) {
    if (form.courseSystem && value !== form.courseSystem) {
      const ok = window.confirm('切换课程体系后，当前能力评分会重置。确认切换吗？');
      if (!ok) return;
    }

    setForm((current) => ({
      ...clearSelectedProjectFields(current),
      courseSystem: value,
    }));
    setScores(createEmptyScores(getAbilityDimensions(value)));
  }

  function updateCourseFormat(value) {
    setForm((current) => ({
      ...clearSelectedProjectFields(current),
      courseFormat: value,
    }));
  }

  function updateProjectField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleProjectToggle(projectId) {
    setForm((current) => {
      const currentProjectIds = Array.isArray(current.projectIds)
        ? current.projectIds
        : current.projectId
          ? [current.projectId]
          : [];
      const nextProjectIds = currentProjectIds.includes(projectId)
        ? currentProjectIds.filter((id) => id !== projectId)
        : [...currentProjectIds, projectId];
      const selectedProjects = projects.filter((project) => nextProjectIds.includes(project.id));

      return {
        ...current,
        ...summarizeProjects(selectedProjects),
      };
    });
  }

  function updateScore(key, value) {
    setScores((current) => ({ ...current, [key]: value }));
  }

  function handleSave() {
    const normalizedForm = {
      ...form,
      assessmentDate: form.stageEndDate || form.stageStartDate || form.assessmentDate,
    };
    const record = createRecord(normalizedForm, currentAssessment, report, comparisonAssessment);
    const nextRecords = saveRecord(record);
    setRecords(nextRecords);
    setSelectedRecord(record);
    setCopied(false);
    setReportMode('full');
    setNotice('保存成功，可在历史测评记录中查看。');
    setView('report');
  }

  function handleOpenReport(record) {
    setSelectedRecord(record);
    setCopied(false);
    setReportMode('full');
    setView('report');
  }

  function handleDelete(recordId) {
    const target = records.find((record) => record.id === recordId);
    const ok = window.confirm(`确认删除 ${target?.form.studentName || '该学员'} 的这条测评记录吗？`);
    if (!ok) return;

    const nextRecords = deleteRecord(recordId);
    setRecords(nextRecords);
    if (selectedRecord?.id === recordId) {
      setSelectedRecord(null);
      setView('history');
    }
    setNotice('记录已删除。');
  }

  function handleSaveProject(project) {
    const nextProjects = saveProject(project);
    setProjects(nextProjects);
    setNotice('项目资料已保存。');
  }

  function handleDeleteProject(projectId) {
    const nextProjects = deleteProject(projectId);
    setProjects(nextProjects);
    const selectedProjectIds = Array.isArray(form.projectIds) ? form.projectIds : form.projectId ? [form.projectId] : [];
    if (selectedProjectIds.includes(projectId)) {
      setForm((current) => clearSelectedProjectFields(current));
    }
    setNotice('项目资料已删除。');
  }

  function handleSaveTrialClassRecord(record) {
    const result = saveTrialClassRecord(record);
    if (!result?.success || !result?.data?.id) {
      throw new Error(result?.error || '试听课记录保存失败，请稍后重试。');
    }
    setTrialClassRecords(result.records);
    setNotice('试听课记录已保存。');
    return result;
  }

  function handleDeleteTrialClassRecord(recordId) {
    const nextRecords = deleteTrialClassRecord(recordId);
    setTrialClassRecords(nextRecords);
    setNotice('试听课记录已删除。');
  }

  async function copyReportText(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
    }
  }

  function renderAssessment() {
    return (
      <>
        <section className="hero">
          <div>
            <div className="eyebrow">
              <BookOpenCheck size={18} />
              AIGO Maker Assessment
            </div>
            <h1>AIGO 阶段成果与能力报告系统</h1>
            <p>记录学员阶段学习表现，生成能力画像、成果描述与家长报告，并通过能力测试实验室补充专项测评依据。</p>
          </div>
          <div className="heroActions">
            <div className="heroStats" aria-label="测评概览">
              <span>当前平均得分</span>
              <strong>{summary.average.toFixed(1)}</strong>
              <small>满分 5 分 · {currentDimensions.length} 个能力维度</small>
            </div>
            <button className="trialPrimaryEntry" type="button" onClick={() => setView('trialClass')}>
              <MessageSquareText size={20} />
              试听课学习反馈
            </button>
            <button
              className="secondaryButton light"
              type="button"
              onClick={() => document.querySelector('.layout')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <BookOpenCheck size={18} />
              阶段学习成果与能力报告
            </button>
            <button className="secondaryButton light" type="button" onClick={() => setView('history')}>
              <History size={18} />
              历史测评记录
            </button>
            <button className="secondaryButton light" type="button" onClick={() => setView('projects')}>
              <FolderKanban size={18} />
              项目资料库
            </button>
            <button className="secondaryButton light" type="button" onClick={() => setView('robotDemo')}>
              <Bot size={18} />
              机器人专项能力测试 Demo
            </button>
          </div>
        </section>

        <section className="experienceNotice" aria-label="体验版说明">
          <Database size={18} />
          <div>
            <strong>当前为测试体验版，数据仅保存在当前浏览器中。</strong>
            <span>请生成卡片后及时导出 PNG 图片保存，暂不支持多设备同步和多人共享记录。</span>
          </div>
        </section>

        <section className="layout">
          <div className="panel formPanel">
            <div className="panelHeader">
              <h2>学员信息</h2>
              <span>基础资料</span>
            </div>

            <div className="formGrid">
              <label>
                学员姓名
                <input
                  value={form.studentName}
                  onChange={(event) => updateForm('studentName', event.target.value)}
                  placeholder="请输入姓名"
                />
              </label>
              <label>
                年级
                <select value={form.grade} onChange={(event) => updateForm('grade', event.target.value)}>
                  <option value="">请选择年级</option>
                  {grades.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                课程体系
                <select value={form.courseSystem} onChange={(event) => updateCourseSystem(event.target.value)}>
                  <option value="">请选择课程体系</option>
                  {courseSystems.map((system) => (
                    <option key={system} value={system}>
                      {system}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                课程类型
                <select value={form.courseFormat} onChange={(event) => updateCourseFormat(event.target.value)}>
                  <option value="">请选择课程类型</option>
                  {courseFormats.map((format) => (
                    <option key={format} value={format}>
                      {format}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                开始日期
                <input
                  type="date"
                  value={form.stageStartDate}
                  onChange={(event) => updateStageDate('stageStartDate', event.target.value)}
                />
              </label>
              <label>
                结束日期
                <input
                  type="date"
                  value={form.stageEndDate}
                  onChange={(event) => updateStageDate('stageEndDate', event.target.value)}
                />
              </label>
              <label>
                授课老师
                <input
                  value={form.teacher}
                  onChange={(event) => updateForm('teacher', event.target.value)}
                  placeholder="请输入老师姓名"
                />
              </label>
            </div>

            <div className="projectSection">
              <div className="panelHeader compact">
                <h2>本阶段学习内容</h2>
                <span>
                  {availableProjects.length
                    ? `${availableProjects.length} 个匹配内容 · 已选 ${
                        Array.isArray(form.projectIds) ? form.projectIds.length : form.projectId ? 1 : 0
                      }`
                    : '项目资料库'}
                </span>
              </div>
              <div className="projectMultiSelect" aria-label="本阶段学习内容多选">
                {availableProjects.map((project) => {
                  const selectedProjectIds = Array.isArray(form.projectIds)
                    ? form.projectIds
                    : form.projectId
                      ? [form.projectId]
                      : [];
                  const isSelected = selectedProjectIds.includes(project.id);
                  return (
                    <button
                      className={`projectSelectOption ${isSelected ? 'active' : ''}`}
                      key={project.id}
                      type="button"
                      onClick={() => handleProjectToggle(project.id)}
                    >
                      <strong>{project.projectName}</strong>
                      <span>{project.learningContent || '暂无学习内容描述'}</span>
                    </button>
                  );
                })}
              </div>
              {!availableProjects.length && (
                <div className="comparisonNotice">暂无匹配项目，可以进入项目资料库新增或调整筛选条件。</div>
              )}
              <label>
                本阶段内容摘要，可修改
                <input
                  value={form.projectName}
                  onChange={(event) => updateProjectField('projectName', event.target.value)}
                  placeholder="选择学习内容后自动汇总，也可以手动填写"
                />
              </label>
              <label>
                学习内容
                <textarea
                  value={form.projectLearningContent}
                  onChange={(event) => updateProjectField('projectLearningContent', event.target.value)}
                  placeholder="选择学习内容后自动汇总学习内容"
                />
              </label>
              <label>
                对应能力
                <textarea
                  value={form.projectAbilities}
                  onChange={(event) => updateProjectField('projectAbilities', event.target.value)}
                  placeholder="选择学习内容后自动汇总对应能力"
                />
              </label>
              <label>
                阶段成果描述
                <textarea
                  value={form.projectStageOutcome}
                  onChange={(event) => updateProjectField('projectStageOutcome', event.target.value)}
                  placeholder="选择学习内容后自动汇总阶段成果描述"
                />
              </label>
              <label>
                家长报告描述
                <textarea
                  value={form.projectParentReportDescription}
                  onChange={(event) => updateProjectField('projectParentReportDescription', event.target.value)}
                  placeholder="选择学习内容后自动汇总家长报告描述"
                />
              </label>
            </div>

            <div className="comparisonSection">
              <div className="panelHeader compact">
                <h2>阶段对比</h2>
                <span>{studentHistory.length ? `${studentHistory.length} 条历史记录` : '成长基线'}</span>
              </div>
              {!form.studentName.trim() ? (
                <div className="comparisonNotice">填写学员姓名后，系统会自动查找历史测评记录。</div>
              ) : !studentHistory.length ? (
                <div className="comparisonNotice">当前为首次测评，将作为后续成长对比基线。</div>
              ) : (
                <div className="comparisonControls">
                  <label>
                    对比测评记录
                    <select value={comparisonMode} onChange={(event) => setComparisonMode(event.target.value)}>
                      <option value="none">不对比，仅生成本次报告</option>
                      <option value="previous">与上一次测评对比</option>
                      <option value="custom">选择某一次历史测评对比</option>
                    </select>
                  </label>
                  {comparisonMode === 'custom' && (
                    <label>
                      历史测评
                      <select value={customComparisonId} onChange={(event) => setCustomComparisonId(event.target.value)}>
                        <option value="">请选择历史测评</option>
                        {studentHistory.map((record) => (
                          <option key={record.id} value={record.id}>
                            {getStageTimeText(record.form) || '未填写阶段时间'} ·{' '}
                            {record.form?.courseSystem || '旧版课程'} · 平均分{' '}
                            {getScoreSummary(record.scores, record.dimensions).average.toFixed(1)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {comparisonAssessment && (
                    <div className="comparisonSummary">
                      本次 {comparisonAssessment.currentAverage.toFixed(1)} 分，上次{' '}
                      {comparisonAssessment.previousAverage.toFixed(1)} 分，变化{' '}
                      {comparisonAssessment.averageChange >= 0 ? '+' : ''}
                      {comparisonAssessment.averageChange.toFixed(1)} 分。
                    </div>
                  )}
                  {comparisonWarning && <div className="comparisonNotice">{comparisonWarning}</div>}
                </div>
              )}
            </div>

            <div className="observationSection">
              <div className="panelHeader compact">
                <h2>阶段观察依据</h2>
                <span>可选补充</span>
              </div>
              <label>
                测评周期
                <input
                  value={form.stageObservation.assessmentCycle}
                  onChange={(event) => updateStageObservation('assessmentCycle', event.target.value)}
                  placeholder="例如：2026春季第2阶段 / 5月阶段测评"
                />
              </label>
              <label>
                老师备注，可选
                <input
                  value={form.stageObservation.teacherComment}
                  onChange={(event) => updateStageObservation('teacherComment', event.target.value)}
                  placeholder="例如：本阶段整体投入度不错，结构搭建和任务执行有明显进步。"
                />
              </label>
            </div>

            <div className="scoreSection">
              <div className="panelHeader compact">
                <h2>能力评分</h2>
                <span>1-5 分</span>
              </div>
              <ScoreGuide />
              {currentDimensions.map((dimension) => (
                <ScoreInput
                  key={getDimensionId(dimension)}
                  dimension={dimension}
                  value={getScoreValue(scores, dimension)}
                  onChange={updateScore}
                />
              ))}
            </div>

            <button className="primaryButton" type="button" onClick={handleSave}>
              <Save size={18} />
              保存并生成家长报告
            </button>
            {notice && <div className="notice">{notice}</div>}
          </div>

          <div className="panel resultPanel">
            <div className="panelHeader">
              <h2>实时预览</h2>
              <span>雷达图与报告</span>
            </div>
            <RadarScoreChart currentAssessment={currentAssessment} comparisonAssessment={comparisonAssessment} />
            <ReportPreview report={report} />
          </div>
        </section>
      </>
    );
  }

  function renderHistory() {
    return (
      <section className="pagePanel">
        <div className="pageTopbar">
          <button className="secondaryButton" type="button" onClick={() => setView('assessment')}>
            <ArrowLeft size={18} />
            返回测评首页
          </button>
          <div>
            <span>共 {records.length} 条记录</span>
            <h1>历史测评记录</h1>
          </div>
        </div>

        {notice && <div className="notice standalone">{notice}</div>}

        <div className="historyToolbar">
          <label className="searchBox">
            <Search size={18} />
            <input
              value={searchName}
              onChange={(event) => setSearchName(event.target.value)}
              placeholder="按学员姓名搜索"
            />
          </label>
          <div className="storageHint inline">
            <Database size={16} />
            数据保存在浏览器 localStorage，刷新页面后仍然存在。
          </div>
        </div>

        <HistoryList records={filteredRecords} onOpenReport={handleOpenReport} onDelete={handleDelete} />
      </section>
    );
  }

  function renderReport() {
    const record = selectedRecord || records[0];
    if (!record) {
      return (
        <section className="pagePanel">
          <div className="emptyState">
            <strong>还没有可查看的报告</strong>
            <span>请先保存一条测评记录。</span>
          </div>
          <button className="primaryButton narrow" type="button" onClick={() => setView('assessment')}>
            返回测评首页
          </button>
        </section>
      );
    }

    return (
      <section className="reportPage">
        <div className="reportToolbar">
          <button className="secondaryButton" type="button" onClick={() => setView('history')}>
            <ArrowLeft size={18} />
            历史记录
          </button>
          <button className="secondaryButton" type="button" onClick={() => setView('assessment')}>
            <FileText size={18} />
            新建测评
          </button>
        </div>
        {notice && <div className="notice standalone">{notice}</div>}
        <div className="reportModeSwitch">
          <button
            className={`secondaryButton ${reportMode === 'full' ? 'active' : ''}`}
            type="button"
            onClick={() => setReportMode('full')}
          >
            查看完整报告
          </button>
          <button
            className={`secondaryButton ${reportMode === 'share' ? 'active' : ''}`}
            type="button"
            onClick={() => {
              setCopied(false);
              setReportMode('share');
            }}
          >
            查看分享卡片
          </button>
        </div>
        {reportMode === 'full' ? (
          <ParentReport record={record} onCopy={copyReportText} copied={copied} />
        ) : (
          <ParentShareCard
            record={record}
            onBackFull={() => setReportMode('full')}
            onCopy={copyReportText}
            copied={copied}
          />
        )}
      </section>
    );
  }

  return (
    <main className="appShell">
      {view === 'assessment' && renderAssessment()}
      {view === 'history' && renderHistory()}
      {view === 'projects' && (
        <ProjectLibrary
          projects={projects}
          notice={notice}
          onBack={() => setView('assessment')}
          onSave={handleSaveProject}
          onDelete={handleDeleteProject}
        />
      )}
      {view === 'report' && renderReport()}
      {view === 'trialClass' && (
        <TrialClassFeedback
          projects={projects}
          records={trialClassRecords}
          notice={notice}
          onBack={() => setView('assessment')}
          onSave={handleSaveTrialClassRecord}
          onDelete={handleDeleteTrialClassRecord}
        />
      )}
      {view === 'robotDemo' && <RobotSpecialTestDemo onBack={() => setView('assessment')} />}
    </main>
  );
}
