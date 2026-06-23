import { format } from "date-fns";
import DOMPurify from "dompurify";

interface Bill {
  id: string;
  name: string;
  amount: number;
  category: string;
  due_date: string;
  frequency: string;
  is_recurring: boolean;
  is_autopay: boolean;
  status: string;
  notes: string | null;
}

// Sanitize user input to prevent XSS attacks
const sanitize = (input: string | null | undefined): string => {
  if (!input) return '';
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Strip all HTML tags for plain text
    ALLOWED_ATTR: []
  });
};

export const exportBillsToCSV = (bills: Bill[]): void => {
  const headers = [
    'Name',
    'Amount',
    'Category',
    'Due Date',
    'Frequency',
    'Recurring',
    'Autopay',
    'Status',
    'Notes'
  ];

  const rows = bills.map(bill => [
    bill.name,
    bill.amount.toFixed(2),
    bill.category,
    format(new Date(bill.due_date), 'yyyy-MM-dd'),
    bill.frequency,
    bill.is_recurring ? 'Yes' : 'No',
    bill.is_autopay ? 'Yes' : 'No',
    bill.status,
    bill.notes || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `bills_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Helper to create styled element with textContent (safe from XSS)
const createElement = (
  tag: string, 
  styles: Record<string, string>, 
  text?: string
): HTMLElement => {
  const el = document.createElement(tag);
  Object.assign(el.style, styles);
  if (text !== undefined) el.textContent = text;
  return el;
};

export const exportBillsToPDF = async (bills: Bill[]): Promise<void> => {
  const { default: html2canvas } = await import('html2canvas');

  // Create container using DOM methods (XSS-safe)
  const container = createElement('div', {
    position: 'absolute',
    left: '-9999px',
    top: '0',
    width: '800px',
    padding: '40px',
    background: 'white',
    fontFamily: 'Arial, sans-serif'
  });

  const totalAmount = bills.reduce((sum, b) => sum + Number(b.amount), 0);
  const paidBills = bills.filter(b => b.status === 'paid');
  const unpaidBills = bills.filter(b => b.status !== 'paid');

  // Header
  const header = createElement('div', { marginBottom: '30px' });
  header.appendChild(createElement('h1', { color: '#7c3aed', margin: '0', fontSize: '28px' }, 'Bills Report'));
  header.appendChild(createElement('p', { color: '#666', margin: '5px 0' }, `Generated on ${format(new Date(), 'MMMM d, yyyy')}`));
  container.appendChild(header);

  // Stats row
  const statsRow = createElement('div', { display: 'flex', gap: '20px', marginBottom: '30px' });
  
  const totalCard = createElement('div', { flex: '1', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: 'white', padding: '20px', borderRadius: '12px' });
  totalCard.appendChild(createElement('p', { margin: '0', fontSize: '14px', opacity: '0.9' }, 'Total Monthly'));
  totalCard.appendChild(createElement('p', { margin: '5px 0 0', fontSize: '32px', fontWeight: 'bold' }, `$${totalAmount.toFixed(2)}`));
  statsRow.appendChild(totalCard);

  const paidCard = createElement('div', { flex: '1', background: '#f0fdf4', padding: '20px', borderRadius: '12px' });
  paidCard.appendChild(createElement('p', { margin: '0', fontSize: '14px', color: '#16a34a' }, 'Paid'));
  paidCard.appendChild(createElement('p', { margin: '5px 0 0', fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }, `${paidBills.length} bills`));
  statsRow.appendChild(paidCard);

  const unpaidCard = createElement('div', { flex: '1', background: '#fef3c7', padding: '20px', borderRadius: '12px' });
  unpaidCard.appendChild(createElement('p', { margin: '0', fontSize: '14px', color: '#d97706' }, 'Unpaid'));
  unpaidCard.appendChild(createElement('p', { margin: '5px 0 0', fontSize: '24px', fontWeight: 'bold', color: '#d97706' }, `${unpaidBills.length} bills`));
  statsRow.appendChild(unpaidCard);

  container.appendChild(statsRow);

  // Table header
  container.appendChild(createElement('h2', { color: '#374151', fontSize: '18px', marginBottom: '15px' }, 'All Bills'));

  const table = createElement('table', { width: '100%', borderCollapse: 'collapse', fontSize: '14px' });
  const thead = document.createElement('thead');
  const headerRow = createElement('tr', { background: '#f3f4f6' });
  
  ['Name', 'Amount', 'Category', 'Due Date', 'Status'].forEach(headerText => {
    const th = createElement('th', { padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }, headerText);
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Table body
  const tbody = document.createElement('tbody');
  bills.forEach((bill, index) => {
    const row = createElement('tr', { background: index % 2 === 0 ? 'white' : '#f9fafb' });
    
    // Name cell with optional recurring badge
    const nameCell = createElement('td', { padding: '12px', borderBottom: '1px solid #e5e7eb' });
    nameCell.appendChild(document.createTextNode(sanitize(bill.name)));
    if (bill.is_recurring) {
      const badge = createElement('span', { 
        background: '#dbeafe', 
        color: '#2563eb', 
        padding: '2px 6px', 
        borderRadius: '4px', 
        fontSize: '10px', 
        marginLeft: '5px' 
      }, 'Recurring');
      nameCell.appendChild(badge);
    }
    row.appendChild(nameCell);

    // Amount cell
    row.appendChild(createElement('td', { padding: '12px', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }, `$${Number(bill.amount).toFixed(2)}`));
    
    // Category cell
    row.appendChild(createElement('td', { padding: '12px', borderBottom: '1px solid #e5e7eb', textTransform: 'capitalize' }, sanitize(bill.category)));
    
    // Due date cell
    row.appendChild(createElement('td', { padding: '12px', borderBottom: '1px solid #e5e7eb' }, format(new Date(bill.due_date), 'MMM d, yyyy')));
    
    // Status cell
    const statusCell = createElement('td', { padding: '12px', borderBottom: '1px solid #e5e7eb' });
    const statusBadge = createElement('span', {
      background: bill.status === 'paid' ? '#dcfce7' : '#fef3c7',
      color: bill.status === 'paid' ? '#16a34a' : '#d97706',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      textTransform: 'capitalize'
    }, sanitize(bill.status));
    statusCell.appendChild(statusBadge);
    row.appendChild(statusCell);

    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  container.appendChild(table);

  // Footer
  const footer = createElement('div', { marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' });
  footer.appendChild(createElement('p', { color: '#9ca3af', fontSize: '12px', textAlign: 'center' }, 
    `Generated by CoinsBloom • ${format(new Date(), 'MMMM d, yyyy h:mm a')}`));
  container.appendChild(footer);

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Bills Report - ${format(new Date(), 'yyyy-MM-dd')}</title>
            <style>
              body { margin: 0; padding: 0; }
              img { max-width: 100%; height: auto; }
              @media print {
                body { margin: 0; }
                img { max-width: 100%; page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <img src="${imgData}" />
            <script>
              window.onload = function() {
                window.print();
              }
            <\/script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  } finally {
    document.body.removeChild(container);
  }
};
