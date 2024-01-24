import { Injectable } from '@nestjs/common';
import { chromium } from 'playwright';
import { CreateScraperDto } from './dto/create-scraper.dto';
import axios from 'axios';
import * as pdfParse from 'pdf-parse';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import { v4 as uuid } from 'uuid';
require('dotenv').config();

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 2000,
  chunkOverlap: 200,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!);

@Injectable()
export class ScraperService {
  //reads all text content from related pdfs
  async getPdfsText(createScraperDto: CreateScraperDto) {
    const { url, keyword } = createScraperDto;
    const browser = await chromium.launch({
      headless: true,
    });
    const context = await browser.newContext({
      acceptDownloads: true,
    });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'networkidle' });
    const pdfLinks = await page.$$eval(
      'a',
      (links, keyword) => {
        return links
          .filter(
            (link) =>
              link.innerHTML.toLowerCase().includes(keyword) &&
              link.getAttribute('href').toLowerCase().endsWith('.pdf'),
          )
          .map((link) => link.getAttribute('href'));
      },
      keyword,
    );

    let textFromAllPdfFiles: string = '';
    for await (const pdfLink of pdfLinks) {
      const absoluteUrl = new URL(pdfLink, url).href;
      const data = await this.getPdfTextWithoutDownloading(absoluteUrl);

      textFromAllPdfFiles += data;
    }

    await browser.close();
    return textFromAllPdfFiles;
  }

  async getPdfTextWithoutDownloading(url: string): Promise<string> {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const pdfBuffer = Buffer.from(response.data);
      const data = await pdfParse(pdfBuffer);
      if (data) {
        return data?.text;
      } else {
        return '';
      }
    } catch (error) {
      throw new Error(`Failed to get PDF text: ${error.message}`);
    }
  }

  //splits te text into chunks
  async splitTextIntoChunks(text: string) {
    const docs = await splitter.createDocuments([text]);
    const chunks = Array.isArray(docs) && docs.map((item) => item?.pageContent);
    return chunks;
  }

  //creates embeddings for the chunks
  async createEmbeddings(data: any) {
    var batchSize = 500;
    try {
      const embeddings = [];
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const embeddingRes = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: batch,
        });

        const embedding = embeddingRes.data.map((item) => item.embedding);
        // console.log(embedding);
        for (const arr of embedding) {
          if (Array.isArray(arr) && arr.length > 0) {
            embeddings.push([...arr]);
          }
        }
      }
      return embeddings;
    } catch (error) {
      console.log('err:' + error);
      return error;
    }
  }

  //store the embeddings in pinecone store
  async storeInPinecone(embeddings: [], metadata: string[]) {
    const vectors = embeddings.map((item, index) => {
      return {
        id: uuid(),
        values: item,
        metadata: { pageContent: metadata[index] },
      };
    });

    await pineconeIndex.upsert(vectors);

    return { message: 'data scraped and stored to pinecone' };
  }

  //generates embedding to query pinecone data
  async generateEmbeddingToQueryPinecone() {
    const prompt = `Give me auditor resignation data. Data should include name of stock exchange,company ticker,
      name of company,auditor resignation date, resigning auditor name,
      reason for resignation, new auditor name, new auditor appointment date. `;
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: prompt,
    });

    return embeddingRes.data[0].embedding;
  }
  //query pinecone data
  async queryPinecone(embedding: number[]) {
    const response = await pineconeIndex.query({
      topK: 10,
      vector: embedding,
      includeValues: false,
      includeMetadata: true,
    });
    return response.matches;
  }

  //returns required output from openai
  async getOpenaiOutput(pineconeResponse) {
    const openAiInput =
      Array.isArray(pineconeResponse) &&
      pineconeResponse.map((item) => item?.metadata?.pageContent);

    const prompt = `Generate a json response containing information about resignation details about auditor and new appointments from [stock market news data :${openAiInput}]. Include all the properties as shown in example.

    [{
      "SrNo.":1,
      "StockExchange":"HKEX",
      "DateOfResignation":"03-Dec-2021",
      "CompanyTicker":"8491 HK",
      "CompanyName":"Cool Link (Holdings)",
      "ResigningAuditor":"Grant Thornton HK Ltd ",
      "ReasonForResignation":"Could not reach a consensus on the audit fee.",
      "NewAuditorAppointmentDate":"03-Dec-2021",
      "NewAuditorName":"UniTax Prism (HK) CPA Ltd "
    },...,...]
    `;

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: 'You are stock market news data analyst.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'gpt-4',
      temperature: 0,
    });

    return completion.choices[0].message.content;
  }

  //empty pinecone store
  async emptyPineconeStore() {
    await pineconeIndex.deleteAll();
  }
}
