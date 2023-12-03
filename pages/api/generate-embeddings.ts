import { NextApiRequest, NextApiResponse } from "next";
import { supabaseClient } from "@/lib/embeddings-supabase";
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

const superagent = require('superagent');
require('superagent-charset')(superagent);

// embedding doc sizes
const docSize: number = 1000;

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method, body } = req;

  if (method === "POST") {
    // by default, Readability will return the article text
    const { urls, textContent: articleText, url } = body;
    let documents = [];
    if(articleText) {
      let start = 0;
      while (start < articleText.length) {
        const end = start + docSize;
        const chunk = articleText.slice(start, end);
        documents.push({ url, body: chunk });
        start = end;
      }
    }
    if(urls) {
      documents = await getDocuments(urls);
    }
    console.log("\nDocuments: \n", documents);
    for (const { url, body } of documents) {
      const input = body.replace(/\n/g, " ");

      console.log("\nDocument length: \n", body.length);
      
      const apiKey = process.env.OPENAI_API_KEY;
      const apiURL = process.env.OPENAI_PROXY == "" ? "https://api.openai.com" : process.env.OPENAI_PROXY;

      const embeddingResponse = await fetch(
        apiURL + "/v1/embeddings",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            input,
            model: "text-embedding-ada-002"
          })
        }
      );
      // console.log("\nembeddingResponse: \n", embeddingResponse);
      const embeddingData = await embeddingResponse.json();

      const [{ embedding }] = embeddingData.data;
      // console.log("embedding:" + embedding);

      // In production we should handle possible errors
      try {
        let res = await supabaseClient.from("documents").insert({
          content: input,
          embedding,
          url
        });
      }
      catch (error) {
        console.error("error in supabase insert: " + error);
      }

    }
    return res.status(200).json({ success: true });
  }

  return res
    .status(405)
    .json({ success: false, message: "Method not allowed" });
}

async function getDocuments(urls: string[]) {
  const documents = [];
  for (const url of urls) {
    let fetchURL = url;
    console.log("fetching url: " + fetchURL);
    const charset = await new Promise(resolve => {
      superagent.get(url).end((_err: any, res: { text: string; }) => {
        let charset = 'utf-8';
        console.log('res.text', _err);
        const arr = res.text.match(/<meta([^>]*?)>/g);
        if (arr) {
          arr.forEach((val: string) => {
            const match = val.match(/charset\s*=\s*(.+)"/);
            if (match && match[1]) {
              if (match[1].substr(0, 1) === '"') match[1] = match[1].substr(1);
              charset = match[1].trim();
            }
          });
        }
        resolve(charset);
      });
    });
    const html: string = await new Promise((resolve, reject) => {
      superagent
        .get(url)
        ?.charset(charset)
        .end((err: any, res: { text: string | PromiseLike<string>; }) => {
          if (err) {
            reject(err);
          } else {
            resolve(res.text);
          }
        });
    });
    const doc = new JSDOM(html, {
      url: `${url}`,
    });
    const reader = new Readability(doc.window.document);
    // tag based e.g. <main>
    const articleText = reader.parse()?.content || '';
    console.log('articleText', articleText);
    // class bsaed e.g. <div class="docs-content">
    // const articleText = $(".docs-content").text();

    let start = 0;
    while (start < articleText.length) {
      const end = start + docSize;
      const chunk = articleText.slice(start, end);
      documents.push({ url, body: chunk });
      start = end;
    }
  }
  return documents;
}
