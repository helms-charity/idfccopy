export function decorateTable(block) {
  const originalClassList = Array.from(block.classList);

  const rows = Array.from(block.children).map(
    (row) => Array.from(row.children).map((cell) => cell.innerHTML),
  );

  const tableWrapper = document.createElement('div');
  tableWrapper.classList.add('amortization-table-wrapper');

  const table = document.createElement('table');
  table.classList.add('amortization-table', ...originalClassList);

  rows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    row.forEach((cellHTML) => {
      const cell = document.createElement(rowIndex === 0 ? 'th' : 'td');
      cell.innerHTML = cellHTML;
      tr.appendChild(cell);
    });
    table.appendChild(tr);
  });

  tableWrapper.appendChild(table);
  block.replaceWith(tableWrapper);
}
export default function decorate(block) {
  if (block.classList.contains('table')) {
    decorateTable(block);
    return block;
  }
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-img-col');
        }
      }
    });
  });
}
