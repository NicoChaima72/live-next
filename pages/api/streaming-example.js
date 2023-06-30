import { createParser } from "eventsource-parser";
import { Configuration, OpenAIApi } from "openai-edge";

export const config = {
  runtime: "edge",
};

const configAI = new Configuration({
  apiKey: "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",
});
const openai = new OpenAIApi(configAI);

export default async function handler() {
  const someAsyncFunction = (value) => {
    const lastValue = JSON.parse(value).choices[0].delta.content;
    if (!lastValue) return "\n";
    return lastValue;
  };

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const res = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    stream: true,
    messages: [
      {
        role: "user",
        content: "Hola, me puedes crear un cuento por favor",
      },
    ],
  });

  const readableStream = new ReadableStream({
    async start(controller) {
      function onParse(event) {
        if (event.type === "event") {
          const data = event.data;
          if (data === "[DONE]") {
            // Signal the end of the stream
            controller.enqueue(encoder.encode("[DONE]"));
          }

          // data = { ...data };
          // feed the data to the TransformStream for further processing
          controller.enqueue(encoder.encode(data));
        }
      }

      const parser = createParser(onParse);

      // https://web.dev/streams/#asynchronous-iteration
      for await (const chunk of res.body) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      const content = decoder.decode(chunk);
      if (content === "[DONE]") {
        controller.terminate(); // Terminate the TransformStream
        return;
      }

      // if (content.choices) console.log({ content: content.choices[0] });
      const results = await someAsyncFunction(content);
      controller.enqueue(encoder.encode(`${results}`));
    },
  });

  return new Response(readableStream.pipeThrough(transformStream), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
