import { ArrowLeft, Edit3, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  courseFormats,
  courseSystems,
  getProjectAbilityOptions,
  grades,
} from '../constants/assessment.js';

const emptyProjectForm = {
  id: '',
  projectName: '',
  applicableGrade: '',
  courseSystem: '',
  abilityStage: '',
  courseFormat: '',
  learningContent: '',
  relatedAbilities: '',
  stageOutcome: '',
  parentReportDescription: '',
  notes: '',
};

function parseAbilityTags(value = '') {
  return value
    .split(/[、,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatAbilityTags(tags) {
  return tags.join('、');
}

function parseKeywords(value = '') {
  return value
    .split(/[、,，\s/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildProjectDescriptions(projectForm, keywordText) {
  const keywords = parseKeywords(keywordText);
  const projectName = projectForm.projectName || (keywords[0] ? `${keywords[0]}项目` : '本项目');
  const grade = projectForm.applicableGrade || keywords.find((keyword) => grades.includes(keyword)) || '';
  const courseFormat = projectForm.courseFormat || '课程任务';
  const courseSystem = projectForm.courseSystem || '创客课程';
  const abilityText = projectForm.relatedAbilities || '任务理解、动手实践和调试优化能力';
  const keywordSummary = keywords.length ? keywords.join('、') : projectName;
  const gradeText = grade ? `${grade}学员` : '学员';

  return {
    learningContent: `本项目围绕「${projectName}」展开，主要学习${keywordSummary}等内容，并完成${courseSystem}${courseFormat}中的任务设计、实践操作、测试和调整。`,
    stageOutcome: `${gradeText}通过「${projectName}」项目，能够围绕任务目标完成关键步骤，并在过程中提升${abilityText}。`,
    parentReportDescription: `本阶段孩子参与了「${projectName}」项目，接触了${keywordSummary}等内容。项目过程中，孩子在理解任务、动手尝试和反复调试中逐步积累经验，整体学习状态积极，也能看到能力上的稳定进步。`,
  };
}

export default function ProjectLibrary({ projects, notice, onBack, onSave, onDelete }) {
  const [projectForm, setProjectForm] = useState(emptyProjectForm);
  const [descriptionKeywords, setDescriptionKeywords] = useState('');
  const [filters, setFilters] = useState({
    grade: '',
    courseSystem: '',
    courseFormat: '',
    keyword: '',
  });

  const filteredProjects = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesGrade = !filters.grade || project.applicableGrade === filters.grade;
      const matchesSystem = !filters.courseSystem || project.courseSystem === filters.courseSystem;
      const matchesFormat = !filters.courseFormat || project.courseFormat === filters.courseFormat;
      const matchesKeyword =
        !keyword ||
        [project.projectName, project.learningContent, project.relatedAbilities, project.parentReportDescription]
          .join(' ')
          .toLowerCase()
          .includes(keyword);
      return matchesGrade && matchesSystem && matchesFormat && matchesKeyword;
    });
  }, [filters, projects]);
  const selectedAbilityTags = useMemo(() => parseAbilityTags(projectForm.relatedAbilities), [projectForm.relatedAbilities]);
  const abilityOptions = useMemo(() => {
    const options = getProjectAbilityOptions(projectForm.courseSystem);
    return [...new Set([...options, ...selectedAbilityTags])];
  }, [projectForm.courseSystem, selectedAbilityTags]);

  function updateProjectForm(field, value) {
    setProjectForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'courseSystem' ? { relatedAbilities: '' } : {}),
    }));
  }

  function updateFilter(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetProjectForm() {
    setProjectForm(emptyProjectForm);
    setDescriptionKeywords('');
  }

  function handleSubmit(event) {
    event.preventDefault();
    const requiredFields = [
      ['projectName', '项目名称'],
      ['applicableGrade', '年级'],
      ['courseSystem', '课程体系'],
      ['courseFormat', '课程类型'],
    ];
    const missingFields = requiredFields.filter(([field]) => !projectForm[field]?.trim()).map(([, label]) => label);
    if (missingFields.length) {
      window.alert(`请先填写：${missingFields.join('、')}`);
      return;
    }
    onSave(projectForm);
    resetProjectForm();
  }

  function toggleAbilityTag(tag) {
    const nextTags = selectedAbilityTags.includes(tag)
      ? selectedAbilityTags.filter((item) => item !== tag)
      : [...selectedAbilityTags, tag];
    updateProjectForm('relatedAbilities', formatAbilityTags(nextTags));
  }

  function handleGenerateDescriptions() {
    if (!descriptionKeywords.trim()) {
      window.alert('请先输入项目关键词');
      return;
    }
    const descriptions = buildProjectDescriptions(projectForm, descriptionKeywords);
    setProjectForm((current) => ({
      ...current,
      ...descriptions,
    }));
  }

  function handleEdit(project) {
    setProjectForm(project);
    setDescriptionKeywords('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDelete(project) {
    const ok = window.confirm(`确认删除「${project.projectName || '未命名项目'}」吗？`);
    if (!ok) return;
    onDelete(project.id);
    if (projectForm.id === project.id) resetProjectForm();
  }

  return (
    <section className="pagePanel">
      <div className="pageTopbar">
        <button className="secondaryButton" type="button" onClick={onBack}>
          <ArrowLeft size={18} />
          返回测评首页
        </button>
        <div>
          <span>共 {projects.length} 个项目</span>
          <h1>项目资料库</h1>
        </div>
      </div>

      {notice && <div className="notice standalone">{notice}</div>}

      <div className="projectLibraryLayout">
        <form className="projectEditor" onSubmit={handleSubmit}>
          <div className="panelHeader">
            <h2>{projectForm.id ? '编辑项目' : '新增项目'}</h2>
            <span>本地资料库</span>
          </div>

          <div className="formGrid">
            <label>
              项目名称
              <input
                value={projectForm.projectName}
                onChange={(event) => updateProjectForm('projectName', event.target.value)}
                placeholder="请输入项目名称"
              />
            </label>
            <label>
              年级
              <select
                value={projectForm.applicableGrade}
                onChange={(event) => updateProjectForm('applicableGrade', event.target.value)}
              >
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
              <select
                value={projectForm.courseSystem}
                onChange={(event) => updateProjectForm('courseSystem', event.target.value)}
              >
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
              <select
                value={projectForm.courseFormat}
                onChange={(event) => updateProjectForm('courseFormat', event.target.value)}
              >
                <option value="">请选择课程类型</option>
                {courseFormats.map((format) => (
                  <option key={format} value={format}>
                    {format}
                  </option>
                ))}
              </select>
            </label>
            <label className="wideField">
              对应能力
              <div className="abilityTagPicker">
                {projectForm.courseSystem ? (
                  abilityOptions.map((tag) => (
                    <button
                      className={`abilityTag ${selectedAbilityTags.includes(tag) ? 'active' : ''}`}
                      key={tag}
                      type="button"
                      onClick={() => toggleAbilityTag(tag)}
                    >
                      {tag}
                    </button>
                  ))
                ) : (
                  <span>请先选择课程体系</span>
                )}
              </div>
            </label>
            <div className="descriptionAssistant wideField">
              <div>
                <h3>AI 描述生成助手</h3>
                <span>本地规则生成，可继续手动修改</span>
              </div>
              <label>
                项目关键词
                <input
                  value={descriptionKeywords}
                  onChange={(event) => setDescriptionKeywords(event.target.value)}
                  placeholder="例如：循线机器人、颜色传感器、二段式循线、调试、二年级"
                />
              </label>
              <button className="secondaryButton" type="button" onClick={handleGenerateDescriptions}>
                生成三段描述
              </button>
            </div>
            <label>
              学习内容
              <textarea
                value={projectForm.learningContent}
                onChange={(event) => updateProjectForm('learningContent', event.target.value)}
                placeholder="请输入项目学习内容"
              />
            </label>
            <label>
              阶段成果描述
              <textarea
                value={projectForm.stageOutcome}
                onChange={(event) => updateProjectForm('stageOutcome', event.target.value)}
                placeholder="请输入阶段成果描述"
              />
            </label>
            <label>
              家长报告描述
              <textarea
                value={projectForm.parentReportDescription}
                onChange={(event) => updateProjectForm('parentReportDescription', event.target.value)}
                placeholder="请输入适合放入家长报告的描述"
              />
            </label>
            <label>
              备注
              <textarea
                value={projectForm.notes}
                onChange={(event) => updateProjectForm('notes', event.target.value)}
                placeholder="可填写项目规则、器材、后续调整说明"
              />
            </label>
          </div>

          <div className="projectEditorActions">
            <button className="primaryButton narrow" type="submit">
              <Plus size={18} />
              {projectForm.id ? '保存修改' : '新增项目'}
            </button>
            {projectForm.id && (
              <button className="secondaryButton" type="button" onClick={resetProjectForm}>
                取消编辑
              </button>
            )}
          </div>
        </form>

        <div className="projectListPanel">
          <div className="panelHeader">
            <h2>项目列表</h2>
            <span>{filteredProjects.length} 个匹配项目</span>
          </div>

          <div className="projectFilters">
            <label className="searchBox">
              <Search size={18} />
              <input
                value={filters.keyword}
                onChange={(event) => updateFilter('keyword', event.target.value)}
                placeholder="搜索项目名称或内容"
              />
            </label>
            <select value={filters.grade} onChange={(event) => updateFilter('grade', event.target.value)}>
              <option value="">全部年级</option>
              {grades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
            <select value={filters.courseSystem} onChange={(event) => updateFilter('courseSystem', event.target.value)}>
              <option value="">全部课程体系</option>
              {courseSystems.map((system) => (
                <option key={system} value={system}>
                  {system}
                </option>
              ))}
            </select>
            <select value={filters.courseFormat} onChange={(event) => updateFilter('courseFormat', event.target.value)}>
              <option value="">全部课程类型</option>
              {courseFormats.map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </div>

          <div className="projectList">
            {filteredProjects.length ? (
              filteredProjects.map((project) => (
                <article className="projectCard" key={project.id}>
                  <div className="projectCardHeader">
                    <div>
                      <strong>{project.projectName || '未命名项目'}</strong>
                      <div className="projectMetaGrid">
                        <span>年级：{project.applicableGrade || '未填写'}</span>
                        <span>体系：{project.courseSystem || '未填写'}</span>
                        <span>类型：{project.courseFormat || '未填写'}</span>
                      </div>
                    </div>
                    <div className="historyActions">
                      <button className="iconButton" type="button" onClick={() => handleEdit(project)} aria-label="编辑项目">
                        <Edit3 size={17} />
                      </button>
                      <button
                        className="iconButton danger"
                        type="button"
                        onClick={() => handleDelete(project)}
                        aria-label="删除项目"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                  <div className="projectAbilityTags">
                    {parseAbilityTags(project.relatedAbilities).length ? (
                      parseAbilityTags(project.relatedAbilities).map((tag) => <span key={tag}>{tag}</span>)
                    ) : (
                      <span>未设置对应能力</span>
                    )}
                  </div>
                  <p>{project.learningContent || '暂无学习内容'}</p>
                  <small>{project.parentReportDescription || '暂无家长报告描述'}</small>
                </article>
              ))
            ) : (
              <div className="emptyState">
                <strong>暂无匹配项目</strong>
                <span>可以调整筛选条件，或在左侧新增项目。</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
