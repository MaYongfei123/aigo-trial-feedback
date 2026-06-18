const reportItems = [
  ['综合评价', 'overall'],
  ['优势能力', 'strengths'],
  ['待提升能力', 'improvements'],
  ['下一阶段建议', 'nextSteps'],
];

export default function ReportPreview({ report }) {
  return (
    <div className="reportGrid">
      {reportItems.map(([title, key]) => (
        <section className="reportBlock" key={key}>
          <h3>{title}</h3>
          <p>{report[key]}</p>
        </section>
      ))}
    </div>
  );
}
