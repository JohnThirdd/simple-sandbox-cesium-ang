/// <reference lib="webworker" />

addEventListener('message', ({ data }) => {
  const time = Math.floor(Math.random() * (30000 - 5000 + 1)) + 5000;
  setTimeout(() => {
    const response = `[выполнено внутри воркера ${data} (${time})]`;
    postMessage(response);
  }, time);
});
