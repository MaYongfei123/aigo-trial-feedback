import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileText,
  Save,
  Search,
  Trash2,
  Trophy,
  UserRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { grades } from '../constants/assessment.js';
import {
  deleteCompetitionAssessmentRecord,
  loadCompetitionAssessmentRecords,
  saveCompetitionAssessmentRecord,
} from '../services/storage.js';
import { getScoreSummary } from '../utils/report.js';
import RadarScoreChart from './RadarScoreChart.jsx';

const today = new Date().toISOString().slice(0, 10);
const competitionTypes = ['FLL', 'WRC', '科技节', '校内挑战赛', '其他'];

const competitionDimensions = [
  {
    key: 'rules',
    label: '任务规则理解',
    options: [
      '需要老师逐条解释任务规则，无法独立判断任务目标',
      '能理解单个任务目标，但容易忽略限制条件',
      '能理解大部分任务规则，并能判断基础得分方式',
      '能分析任务得分、风险和优先级',
      '能独立拆解任务规则，并主动提出任务策略',
    ],
  },
  {
    key: 'path_planning',
    label: '路径规划意识',
    options: [
      '只能按老师指定路线运行',
      '能理解单段路线，但缺少整体规划意识',
      '能规划简单任务顺序和返回路线',
      '能合并多个任务，并考虑转弯、避障和成功率',
      '能独立设计完整跑图方案，并根据成功率优化路线',
    ],
  },
  {
    key: 'line_following',
    label: '循线理解能力',
    options: [
      '只会运行现成程序，不理解循线原理',
      '知道循线依赖黑线、白底和光值变化',
      '能解释基础功率、转向量和偏差',
      '能根据跑偏、震荡、冲出线等现象调整参数',
      '能独立设计并优化循线策略，适应不同场地情况',
    ],
  },
  {
    key: 'pid_algorithm',
    label: 'PID / 算法理解',
    options: [
      '不了解 PID 或只能照搬程序',
      '知道 PID 是用来让机器人更稳定运行',
      '能基本理解 P 参数与偏差调整的关系',
      '能理解 P、D 参数对震荡、转弯和稳定性的影响',
      '能结合实际运行现象主动调整 PID 参数，并说明原因',
    ],
  },
  {
    key: 'structure_arm',
    label: '结构与机械臂设计',
    options: [
      '主要依赖老师提供结构',
      '能搭建简单机械臂，但缺少任务适配意识',
      '能根据任务设计基础夹取、推动或释放结构',
      '能考虑稳定性、限位、快拆和空间占用',
      '能独立设计高效结构，并根据失败原因持续优化',
    ],
  },
  {
    key: 'debug_review',
    label: '调试与复盘能力',
    options: [
      '失败后不知道原因，需要老师判断',
      '能发现失败现象，但难以分析原因',
      '能区分程序、结构、场地等常见问题',
      '能记录成功率，并提出明确改进方向',
      '能独立复盘问题，形成稳定的调试流程和优化方案',
    ],
  },
];

const trainingAdviceByDimension = {
  rules: '建议继续用真实任务卡训练规则拆解，让学员先标出得分条件、限制条件和风险点，再设计执行顺序。',
  path_planning: '建议增加跑图路线草稿训练，先让学员比较不同路线的成功率、转弯数量和任务衔接，再上场测试。',
  line_following: '建议围绕光值、偏差、转向量和速度做短任务训练，让学员能根据跑偏、震荡等现象说出调整方向。',
  pid_algorithm: '建议从 P 参数与偏差修正开始做小步调参，再逐步加入 D 参数，帮助学员把运行现象和参数变化对应起来。',
  structure_arm: '建议围绕夹取、推动、释放等典型任务做结构迭代，重点观察稳定性、限位、快拆和空间占用。',
  debug_review: '建议建立“现象记录、原因判断、调整方案、再次验证”的调试表，让学员形成可复用的复盘流程。',
};

function createInitialScores() {
  return competitionDimensions.reduce((result, dimension) => {
    result[dimension.key] = 3;
    return result;
  }, {});
}

function getCompetitionStage(average) {
  if (average < 2) return '竞赛入门期';
  if (average < 3) return '基础任务期';
  if (average < 3.7) return '稳定完成期';
  if (average < 4.4) return '策略优化期';
  return '独立竞赛期';
}

function generateCompetitionReport(form, scores) {
  const summary = getScoreSummary(scores, competitionDimensions);
  const average = summary.average;
  const entries = summary.entries;
  const highestScore = Math.max(...entries.map((item) => item.score));
  const lowestScore = Math.min(...entries.map((item) => item.score));
  const strengths = entries.filter((item) => item.score === highestScore).slice(0, 2);
  const weaknesses = entries.filter((item) => item.score === lowestScore).slice(0, 2);
  const strengthText = strengths.map((item) => `${item.label}${item.score}分`).join('、');
  const weaknessText = weaknesses.map((item) => `${item.label}${item.score}分`).join('、');
  const advice = weaknesses.map((item) => trainingAdviceByDimension[item.key]).filter(Boolean).join('');
  const stage = getCompetitionStage(average);
  const name = form.studentName || '该学员';

  return {
    average,
    stage,
    strengths,
    weaknesses,
    overall: `${name}本次机器人竞赛能力平均分为 ${average.toFixed(1)} 分，当前处于“${stage}”。`,
    strengthSummary: highestScore === lowestScore
      ? '六个维度表现较为均衡，说明当前竞赛能力结构比较稳定。'
      : `当前较突出的能力是：${strengthText}。这些维度可以作为后续竞赛训练中的稳定基础。`,
    weaknessSummary: highestScore === lowestScore
      ? '目前没有特别突出的短板，后续可以通过更高难度的综合任务继续拉开能力层次。'
      : `主要短板集中在：${weaknessText}。建议在下一阶段训练中优先跟进这些能力。`,
    nextAdvice: advice || '建议继续通过完整任务训练观察规则理解、路径规划、结构设计和调试复盘的综合表现。',
  };
}

function sortRecords(records) {
  return [...records].sort((a, b) => {
    const aTime = new Date(a.assessmentDate || a.createdAt || 0).getTime();
    const bTime = new Date(b.assessmentDate || b.createdAt || 0).getTime();
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  });
}

export default function CompetitionAssessment({ onBack }) {
  const [mode, setMode] = useState('new');
  const [form, setForm] = useState({
    studentName: '',
    grade: '',
    courseSystem: '机器人',
    competitionType: '',
    assessmentDate: today,
    teacher: '',
    notes: '',
  });
  const [scores, setScores] = useState(createInitialScores);
  const [behaviorSelections, setBehaviorSelections] = useState({});
  const [records, setRecords] = useState(() => sortRecords(loadCompetitionAssessmentRecords()));
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [searchName, setSearchName] = useState('');
  const [notice, setNotice] = useState('');

  const report = useMemo(() => generateCompetitionReport(form, scores), [form, scores]);
  const selectedReport = selectedRecord?.report || null;
  const filteredRecords = useMemo(() => {
    const keyword = searchName.trim().toLowerCase();
    if (!keyword) return records;
    return records.filter((record) => (record.studentName || '').toLowerCase().includes(keyword));
  }, [records, searchName]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectBehavior(dimensionKey, score) {
    setBehaviorSelections((current) => ({ ...current, [dimensionKey]: score }));
    setScores((current) => ({ ...current, [dimensionKey]: score }));
  }

  function updateScore(dimensionKey, value) {
    setScores((current) => ({ ...current, [dimensionKey]: Number(value) }));
  }

  function resetForm() {
    setForm({
      studentName: '',
      grade: '',
      courseSystem: '机器人',
      competitionType: '',
      assessmentDate: today,
      teacher: '',
      notes: '',
    });
    setScores(createInitialScores());
    setBehaviorSelections({});
    setSelectedRecord(null);
    setNotice('');
    setMode('new');
  }

  function handleSave() {
    if (!form.studentName.trim() || !form.grade || !form.competitionType || !form.assessmentDate) {
      setNotice('请先填写学生姓名、年级、竞赛类型和测评日期。');
      return;
    }

    const nextReport = generateCompetitionReport(form, scores);
    const result = saveCompetitionAssessmentRecord({
      ...form,
      scores,
      behaviorSelections,
      dimensions: competitionDimensions.map(({ key, label }) => ({ key, label })),
      report: nextReport,
    });
    setRecords(sortRecords(result.records));
    setSelectedRecord(result.record);
    setNotice('竞赛能力测评已保存，可在测评记录中查看。');
    setMode('report');
  }

  function handleDelete(recordId) {
    const target = records.find((record) => record.id === recordId);
    const ok = window.confirm(`确认删除 ${target?.studentName || '该学生'} 的竞赛测评记录吗？`);
    if (!ok) return;
    const nextRecords = deleteCompetitionAssessmentRecord(recordId);
    setRecords(sortRecords(nextRecords));
    if (selectedRecord?.id === recordId) {
      setSelectedRecord(null);
      setMode('records');
    }
    setNotice('竞赛测评记录已删除。');
  }

  function openRecord(record) {
    setSelectedRecord(record);
    setMode('report');
    setNotice('');
  }

  function renderTabs() {
    return (
      <div className="competitionTabs">
        <button className={mode === 'new' ? 'active' : ''} type="button" onClick={() => setMode('new')}>
          <FileText size={17} />
          新建竞赛测评
        </button>
        <button className={mode === 'records' ? 'active' : ''} type="button" onClick={() => setMode('records')}>
          <ClipboardList size={17} />
          查看测评记录
        </button>
      </div>
    );
  }

  function renderNewAssessment() {
    return (
      <div className="competitionLayout">
        <section className="competitionPanel">
          <div className="panelHeader">
            <h2>测评基础信息</h2>
            <span>机器人竞赛</span>
          </div>
          <div className="formGrid competitionBasicGrid">
            <label>
              学生姓名
              <input value={form.studentName} onChange={(event) => updateForm('studentName', event.target.value)} />
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
              <input value="机器人" readOnly />
            </label>
            <label>
              竞赛类型
              <select value={form.competitionType} onChange={(event) => updateForm('competitionType', event.target.value)}>
                <option value="">请选择竞赛类型</option>
                {competitionTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              测评日期
              <input type="date" value={form.assessmentDate} onChange={(event) => updateForm('assessmentDate', event.target.value)} />
            </label>
            <label>
              测评老师
              <input value={form.teacher} onChange={(event) => updateForm('teacher', event.target.value)} />
            </label>
            <label className="wideField">
              测评说明 / 备注
              <textarea
                value={form.notes}
                onChange={(event) => updateForm('notes', event.target.value)}
                placeholder="可记录本次竞赛任务、场地情况、学生表现或老师补充观察。"
              />
            </label>
          </div>
        </section>

        <section className="competitionPanel competitionScorePanel">
          <div className="panelHeader">
            <h2>竞赛能力评分</h2>
            <span>行为选项自动评分 + 手动微调</span>
          </div>
          {competitionDimensions.map((dimension) => (
            <article className="competitionScoreCard" key={dimension.key}>
              <div className="competitionScoreTitle">
                <h3>{dimension.label}</h3>
                <strong>{scores[dimension.key] || 3} 分</strong>
              </div>
              <div className="behaviorOptions">
                {dimension.options.map((option, index) => {
                  const score = index + 1;
                  return (
                    <button
                      className={behaviorSelections[dimension.key] === score ? 'active' : ''}
                      key={option}
                      type="button"
                      onClick={() => selectBehavior(dimension.key, score)}
                    >
                      <span>{score}分</span>
                      {option}
                    </button>
                  );
                })}
              </div>
              <label className="competitionScoreSlider">
                手动微调最终分数
                <div>
                  <input
                    max="5"
                    min="1"
                    step="1"
                    type="range"
                    value={scores[dimension.key] || 3}
                    onChange={(event) => updateScore(dimension.key, event.target.value)}
                  />
                  <strong>{scores[dimension.key] || 3}</strong>
                </div>
              </label>
            </article>
          ))}
        </section>

        <aside className="competitionPanel competitionPreviewPanel">
          <div className="panelHeader">
            <h2>实时报告预览</h2>
            <span>{report.stage}</span>
          </div>
          <div className="competitionScoreHero">
            <span>平均分</span>
            <strong>{report.average.toFixed(1)}</strong>
            <small>{report.stage}</small>
          </div>
          <RadarScoreChart currentAssessment={{ scores, dimensions: competitionDimensions }} />
          <div className="competitionReportBlocks">
            <section>
              <h3>优势能力总结</h3>
              <p>{report.strengthSummary}</p>
            </section>
            <section>
              <h3>主要短板分析</h3>
              <p>{report.weaknessSummary}</p>
            </section>
            <section>
              <h3>下一阶段训练建议</h3>
              <p>{report.nextAdvice}</p>
            </section>
          </div>
          <button className="primaryButton" type="button" onClick={handleSave}>
            <Save size={18} />
            保存竞赛测评
          </button>
          {notice && <div className="notice">{notice}</div>}
        </aside>
      </div>
    );
  }

  function renderRecords() {
    return (
      <section className="competitionPanel">
        <div className="panelHeader">
          <h2>竞赛测评记录</h2>
          <span>共 {records.length} 条</span>
        </div>
        {notice && <div className="notice standalone">{notice}</div>}
        <div className="historyToolbar">
          <label className="searchBox">
            <Search size={18} />
            <input
              value={searchName}
              onChange={(event) => setSearchName(event.target.value)}
              placeholder="按学生姓名搜索"
            />
          </label>
          <div className="storageHint inline">竞赛测评记录保存在本机浏览器中，可作为学生档案的一部分查看。</div>
        </div>
        {!filteredRecords.length ? (
          <div className="emptyState">
            <strong>暂无竞赛测评记录</strong>
            <span>完成一次竞赛能力测评后，这里会显示历史记录。</span>
          </div>
        ) : (
          <div className="competitionRecordList">
            {filteredRecords.map((record) => (
              <article className="competitionRecordCard" key={record.id}>
                <button type="button" onClick={() => openRecord(record)}>
                  <span>
                    <UserRound size={16} />
                    {record.studentName || '未命名学生'}
                  </span>
                  <small>{record.grade || '未填写'} · {record.competitionType || '未填写竞赛类型'}</small>
                  <small>
                    <CalendarDays size={14} />
                    {record.assessmentDate || '未填写日期'}
                  </small>
                  <strong>{record.report?.average?.toFixed?.(1) || getScoreSummary(record.scores, competitionDimensions).average.toFixed(1)} 分</strong>
                </button>
                <button className="iconButton danger" type="button" onClick={() => handleDelete(record.id)} aria-label="删除记录">
                  <Trash2 size={17} />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  function renderReport() {
    const record = selectedRecord;
    if (!record) return renderRecords();
    const recordReport = selectedReport || generateCompetitionReport(record, record.scores || createInitialScores());

    return (
      <section className="competitionPanel competitionReportPage">
        <div className="panelHeader">
          <h2>竞赛能力测评报告</h2>
          <span>{recordReport.stage}</span>
        </div>
        <div className="competitionReportHeader">
          <div>
            <span>学生姓名</span>
            <strong>{record.studentName || '未命名学生'}</strong>
          </div>
          <div>
            <span>竞赛类型</span>
            <strong>{record.competitionType || '未填写'}</strong>
          </div>
          <div>
            <span>测评日期</span>
            <strong>{record.assessmentDate || '未填写'}</strong>
          </div>
          <div>
            <span>测评老师</span>
            <strong>{record.teacher || '未填写'}</strong>
          </div>
        </div>
        <div className="competitionReportMain">
          <div className="competitionScoreHero">
            <span>综合平均分</span>
            <strong>{recordReport.average.toFixed(1)}</strong>
            <small>{recordReport.stage}</small>
          </div>
          <RadarScoreChart currentAssessment={{ scores: record.scores, dimensions: competitionDimensions }} />
        </div>
        <div className="competitionDimensionRows">
          {competitionDimensions.map((dimension) => (
            <div key={dimension.key}>
              <span>{dimension.label}</span>
              <strong>{record.scores?.[dimension.key] || 3} 分</strong>
            </div>
          ))}
        </div>
        <div className="competitionReportBlocks">
          <section>
            <h3>当前竞赛阶段判断</h3>
            <p>{recordReport.overall}</p>
          </section>
          <section>
            <h3>优势能力总结</h3>
            <p>{recordReport.strengthSummary}</p>
          </section>
          <section>
            <h3>主要短板分析</h3>
            <p>{recordReport.weaknessSummary}</p>
          </section>
          <section>
            <h3>下一阶段训练建议</h3>
            <p>{recordReport.nextAdvice}</p>
          </section>
          {record.notes && (
            <section>
              <h3>老师备注</h3>
              <p>{record.notes}</p>
            </section>
          )}
        </div>
        <div className="competitionReportActions">
          <button className="secondaryButton" type="button" onClick={() => setMode('records')}>
            返回测评记录
          </button>
          <button className="primaryButton narrow" type="button" onClick={resetForm}>
            新建竞赛测评
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="competitionPage">
      <div className="pageTopbar">
        <button className="secondaryButton" type="button" onClick={onBack}>
          <ArrowLeft size={18} />
          返回首页
        </button>
        <div>
          <span>机器人竞赛专项档案</span>
          <h1>竞赛能力测评</h1>
        </div>
      </div>

      <section className="competitionIntro">
        <div>
          <Trophy size={26} />
          <strong>面向机器人竞赛的综合能力测评</strong>
          <span>覆盖任务理解、路径规划、循线、PID、结构设计、调试复盘等核心能力。</span>
        </div>
        <div className="competitionIntroMetric">
          <BarChart3 size={22} />
          <strong>{records.length}</strong>
          <span>历史测评记录</span>
        </div>
      </section>

      {renderTabs()}
      {mode === 'new' && renderNewAssessment()}
      {mode === 'records' && renderRecords()}
      {mode === 'report' && renderReport()}
    </section>
  );
}
