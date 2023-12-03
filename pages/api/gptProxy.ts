import { OpenAIStream, OpenAIStreamPayload } from "@/utils/OpenAIStream";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type"
};

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing env var from OpenAI");
}

export const config = {
  runtime: "edge"
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { question, systemPrompt } = (await req.json()) as {
    question?: string;
    systemPrompt?: string;
  };

  if (!question) {
    return new Response("No prompt in the request", { status: 400 });
  }

  const query = question;

  // OpenAI recommends replacing newlines with spaces for best results
  const input = query.replace(/\n/g, " ");
  // console.log("input: ", input);
  // console.log("contextText: ", contextText);

  const systemContent = '- you always format your output in markdown. - You include code snippets if relevant. - Answer in Chinese' + systemPrompt;

  const userContent = `what is nextjs?`;

  const assistantContent = `Next.js is a framework for building production-ready web applications using React. It offers various data fetching options, comes equipped with an integrated router, and features a Next.js compiler for transforming and minifying JavaScript. Additionally, it has an inbuilt Image Component and Automatic Image Optimization that helps resize, optimize, and deliver images in modern formats.
  
  \`\`\`js
  function HomePage() {
    return <div>Welcome to Next.js!</div>
  }
  
  export default HomePage
  \`\`\`
  
  SOURCES:
  https://nextjs.org/docs/faq`;
  const userMessage = question;

  const messages = [
    {
      role: "system",
      content: systemContent
    },
    {
      role: "user",
      content: userContent
    },
    {
      role: "assistant",
      content: assistantContent
    },
    {
      role: "user",
      content: userMessage
    }
  ];


  console.log("messages: ", messages);

  const payload: OpenAIStreamPayload = {
    model: "gpt-3.5-turbo-0613",
    // model: "gpt-4",
    messages: messages,
    stream: true,
  };

  const stream = await OpenAIStream(payload);
  return new Response(stream);
};

export default handler;
