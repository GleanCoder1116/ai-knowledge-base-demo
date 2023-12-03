export const apimd = `
API使用文档：

\`\`\`js
## 请求URL

http://localhost:3000/api/gptProxy
\`\`\`

\`\`\`js
## 请求方法
POST
\`\`\`

\`\`\`json
## 参数示例:
{
  "question": "相关问题",
  "systemPrompt": "系统指令"
}
\`\`\`

## 请求示例
\`\`\`javascript
const url = "http://localhost:3000/api/gptProxy";
const response = fetch(url,
{
  body: JSON.stringify({
            question: "react使用示例",
            systemPrompt:"系统指令"
        }),
  method: "POST",
});
// This data is a ReadableStream
const data = response.body;
if (!data) {
    return;
}

const reader = data.getReader();
const decoder = new TextDecoder();
let done = false;

while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    const chunkValue = decoder.decode(value);
    console.log((prev) => prev + chunkValue);
}

\`\`\`


以上是使用fetch方法发送POST请求的API使用文档。你可以根据需要自行修改请求的URL、请求体和其他参数`;
