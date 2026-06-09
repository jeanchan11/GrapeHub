import fetch from 'node-fetch';
(async () => {
  const res = await fetch('http://localhost:3000/api/tasks/1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dueDate: '2026-06-15' })
  });
  console.log(res.status, await res.text());
})();
