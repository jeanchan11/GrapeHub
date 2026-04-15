async function test() {
  try {
    const endpoints = ['/api/tasks', '/api/projects', '/api/task-templates', '/api/task-subtasks', '/api/daily-tasks?date=2026-04-10'];
    for (const ep of endpoints) {
      const res = await fetch(`http://localhost:3000${ep}`);
      console.log(`${ep}: ${res.status}`);
      const text = await res.text();
      console.log(text.substring(0, 50));
    }
  } catch (e) {
    console.error(e);
  }
}
test();
