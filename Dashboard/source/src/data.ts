// Mock Database
export const CUSTOMERS = [
  { id: 'bisenasif0001', name: 'Muhammad Asif Bisen', phone: '9473946181', initials: 'AB', color: '#125696', email: 'asif@bisenonepoint.com', city: 'Lucknow, UP', joined: '12 Jan 2026', verified: true, tier: 'Premium', totalSpent: 2297, 
    orders: [ { id: 'OPDS-20260604-000002', service: 'Ayushman', category: 'E-Services', amount: 199, status: 'Completed', payStatus: 'Paid', gateway: 'Razorpay', date: '2026-06-04' } ],
    documents: [
      { id: 'D-001', title: 'Aadhaar Card Front', type: 'AADHAAR', format: 'JPEG', size: '450 KB', uploadedAt: '12 Jan 2026', extractedText: "Name: Muhammad Asif Bisen\nDOB: 01/01/1990\nAadhaar No: XXXX-XXXX-1234\nAddress: 123, ABC Street, Lucknow, UP" },
      { id: 'D-002', title: 'PAN Card Scan', type: 'PAN', format: 'PDF', size: '1.2 MB', uploadedAt: '10 May 2026', extractedText: "Name: Muhammad Asif Bisen\nFather's Name: ...\nPAN Number: ABCDE1234F\nDOB: 01/01/1990" }
    ]
  },
  { id: 'salmarizvi9876', name: 'Salma Rizvi', phone: '9876543210', initials: 'SR', color: '#C9921A', email: 'salma.rizvi@gmail.com', city: 'Lucknow, UP', joined: '18 Feb 2026', verified: true, tier: 'Standard', totalSpent: 498, 
    orders: [ { id: 'OPDS-0023', service: 'Ayushman + Income Cert', category: 'E-Services', amount: 498, status: 'Pending', payStatus: 'Paid', gateway: 'Razorpay', date: '2026-05-15' } ],
    documents: [
      { id: 'D-003', title: 'Income Proof', type: 'CERT', format: 'PDF', size: '800 KB', uploadedAt: '18 Feb 2026', extractedText: "Name: Salma Rizvi\nAnnual Income: ₹1,20,000\nIssued By: Tehsildar, Lucknow" }
    ]
  },
  { id: 'aslam5678khan', name: 'Aslam Khan', phone: '9512345678', initials: 'AK', color: '#f59e0b', email: 'aslam.khan@gmail.com', city: 'Kanpur, UP', joined: '5 Mar 2026', verified: true, tier: 'Standard', totalSpent: 1999, 
    orders: [ { id: 'OPDS-0041', service: 'Passport Assistance', category: 'E-Services', amount: 1200, status: 'Processing', payStatus: 'Paid', gateway: 'Razorpay', date: '2026-05-13' } ],
    documents: [
      { id: 'D-004', title: '10th Marksheet', type: 'MARKSHEET', format: 'JPEG', size: '1.5 MB', uploadedAt: '13 May 2026', extractedText: "Name: Aslam Khan\nBoard: UP Board\nYear: 2010\nResult: PASS" }
    ]
  },
  { id: 'nidabegum6321', name: 'Nida Begum', phone: '9632105478', initials: 'NB', color: '#0284c7', email: 'nida.begum@yahoo.com', city: 'Varanasi, UP', joined: '22 Mar 2026', verified: false, tier: 'New', totalSpent: 249, 
    orders: [ { id: 'OPDS-0057', service: 'Voter ID Correction', category: 'E-Services', amount: 249, status: 'Pending', payStatus: 'Pending', gateway: 'Razorpay', date: '2026-05-17' } ],
    documents: [
      { id: 'D-005', title: 'Aadhaar Card', type: 'AADHAAR', format: 'PDF', size: '2 MB', uploadedAt: '17 May 2026', extractedText: "Name: Nida Begum\nAadhaar No: XXXX-XXXX-9999\n[AI FLAG: POTENTIAL DUPLICATE]" }
    ]
  },
];

export const ALL_ORDERS = CUSTOMERS.flatMap(c => c.orders.map(o => ({ ...o, customer: c })));

export const ACTIVITIES = [
  { text: 'New order OPDS-0090 — Birth Certificate', time: '2m ago', color: 'var(--emerald)', bg: 'var(--emerald-dim)', icon: 'package' },
  { text: 'Payment ₹1,248 received — Razorpay', time: '3m ago', color: 'var(--blue)', bg: 'var(--blue-dim)', icon: 'credit-card' },
  { text: 'Refund request — OPDS-0023', time: '2h ago', color: 'var(--rose)', bg: 'var(--rose-dim)', icon: 'rotate-ccw' },
  { text: 'New signup: Nida Begum', time: '5h ago', color: 'var(--amber)', bg: 'var(--amber-dim)', icon: 'user-plus' }
];

export const LIVE_PAYMENTS = [
  { text: '₹499 · PAN Card · Aslam Khan', time: 'just now', color: 'var(--emerald)' },
  { text: '₹1,248 · OneMart · Shaista Khan', time: '4m ago', color: 'var(--emerald)' },
  { text: '₹249 FAILED · Voter ID · Nida Begum', time: '2h ago', color: 'var(--rose)' },
];

export const TASKS = [
  { id: '1', title: 'Verify Aadhaar Docs for Nida Begum', sub: 'OPDS-0057 · Client uploaded requested files 2 hrs ago', priority: 'High', type: 'danger', owner: 'OP', dueDate: '2026-05-17' },
  { id: '2', title: 'Process GST Return Filing for May', sub: 'B2B Client List · Due Tomorrow', priority: 'Medium', type: 'warning', owner: 'AS', dueDate: '2026-05-19' },
  { id: '3', title: 'Dispatch physical copies of PAN Cards', sub: '3 envelopes pending courier pickup', priority: 'Standard', type: 'info', owner: 'AS', dueDate: '2026-05-25' }
];

export const DOCS = [
  { id: '1', title: 'Business_KYC.pdf', sub: '1.2 MB · Uploaded by Admin', icon: 'file-text', color: 'var(--blue)' },
  { id: '2', title: 'Nida_Aadhaar_Front.jpg', sub: '450 KB · Uploaded 2 hrs ago', icon: 'image', color: 'var(--emerald)' },
  { id: '3', title: 'GST_Filing_May.pdf', sub: '2.4 MB · Confidential', icon: 'file-text', color: 'var(--blue)' }
];

export const AUDIT = [
  { action: 'Updated Order OPDS-0090', color: 'var(--blue)', user: 'Asif Bisen', details: 'Status changed logic: Pending -> Completed', time: '18 May 2026, 14:32' },
  { action: 'Created Rule', color: 'var(--emerald)', user: 'System', details: 'Rule ID #92: "Auto-Verify Paid"', time: '18 May 2026, 09:12' },
  { action: 'Deleted Document', color: 'var(--rose)', user: 'Operator-2', details: 'Deleted "old_kyc_scan.jpg" for user Nida', time: '17 May 2026, 16:45' }
];

export const FRANCHISES = [
  { id: 'FC_UP_LKO_01', name: 'Sharma Suvidha Kendra', location: 'Alambagh, Lucknow', balance: '₹14,200', balStyle: 'var(--blue)', tier: 'Gold (12%)' },
  { id: 'FC_UP_KNP_02', name: 'Kanpur e-Point', location: 'Civil Lines, Kanpur', balance: '₹450', balStyle: 'var(--rose)', tier: 'Silver (8%)' }
];

export const SERVICES = [
  { icon: '🏛', name: 'Govt / E-Services', count: 12, color: '#125696', status: true },
  { icon: '🎓', name: 'EduPoint', count: 10, color: '#C9921A', status: true },
  { icon: '💼', name: 'Business', count: 8, color: '#f59e0b', status: true },
  { icon: '🎁', name: 'OneMart Store', count: 14, color: '#16a34a', status: true },
  { icon: '✈', name: 'Travel Booking', count: 4, color: '#0284c7', status: false },
  { icon: '💳', name: 'Bill & Recharge', count: 6, color: '#dc2626', status: true }
];

export const WORKFLOW_RULES = [
  { name: 'Auto-Verify Paid Orders', trigger: 'Payment Captured', action: 'Set status → Verified', active: true },
  { name: 'WhatsApp on Completion', trigger: 'Status = Completed', action: 'Send WhatsApp', active: true },
  { name: 'Refund Risk Alert', trigger: 'Refund > ₹500', action: 'Alert admin', active: true }
];

export const WEBHOOK_LOG = [
  { event: 'payment.captured', id: 'pay_OPD9821', status: '200 OK', time: '2m ago' },
  { event: 'payment.failed', id: 'pay_NB001', status: '500 ERR', time: '2h ago' }
];

export const NOTIFS = [
  { title: 'New order — OPDS-0090', sub: 'Birth Certificate · ₹199', time: '2m ago', color: 'var(--blue)', icon: 'package' },
  { title: 'Multiple failed login attempts', sub: 'IP: 192.168.1.1 · 10 mins ago', time: '10m ago', color: 'var(--rose)', icon: 'shield-alert' },
  { title: 'Razorpay Settlement Successful', sub: '₹4,590 deposited to account', time: '5h ago', color: 'var(--emerald)', icon: 'check-circle' }
];
