import { useEffect, useState } from "react";

export default function Stream() {
  const [response, setResponse] = useState("");
  useEffect(() => {
    const getData = async () => {
      const response = await fetch("/api/streaming-example", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch");
      }

      const data = response.body;
      if (!data) {
        throw new Error("No data received");
        return;
      }

      const reader = data.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let tempValue = ""; // temporary value to store incomplete json strings

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        let chunkValue = decoder.decode(value);

        // if there is a temp value, prepend it to the incoming chunk
        if (tempValue) {
          chunkValue = tempValue + chunkValue;
          tempValue = "";
        }

        // match json string and extract it from the chunk
        const match = chunkValue.match(/\{(.*?)\}/);
        if (match) {
          tempValue = chunkValue.replace(match[0], "");
          chunkValue = match[0];
        }

        try {
          setResponse((prev) => prev + chunkValue);
          const data = chunkValue;
          /* do something with the data */
          console.log({ data });
        } catch (e) {
          // store the incomplete json string in the temporary value
          tempValue = chunkValue;
        }
      }
    };

    getData();
  }, []);

  return (
    <div>
      {response.split("\n").map((i, index) => (
        <p key={index}>{i}</p>
      ))}
    </div>
  );
}
