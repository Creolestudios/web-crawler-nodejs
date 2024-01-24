## Description

What it does?
Scrapes the data inside pdfs present at provided stock exchange news url matching given keyword,stores it to pinecone vector store,returns data which is required to insert in excel file.

This project is setup using nestjs framework. [read more here](https://docs.nestjs.com)

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Installation

```bash
$ npm install
```

## Setup .env in root folder

OPENAI_API_KEY=
PINECONE_API_KEY=
PINECONE_INDEX=

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## endpoints

POST http://localhost:8000/scraper

BODY RAW JSON
{
"url":"https://www1.hkexnews.hk/listedco/listconews/index/lci.html?lang=en",
"keyword":"resignation"
}

RESPONSE
[
{
"SrNo": 1,
"StockExchange": "HKEX",
"DateOfResignation": "24-Jan-2024",
"CompanyTicker": "834 HK",
"CompanyName": "China Kangda Food Company Limited",
"ResigningExecutiveDirector": ["Mr. Luo Zhenwu", "Mr. Li Wei"],
"ReasonForResignation": "Focus on their respective other business pursuits and commitments",
"NewAppointment": "In process of identifying a suitable candidate"
},
{
"SrNo": 2,
"StockExchange": "HKEX",
"DateOfResignation": "23-Jan-2024",
"CompanyTicker": "Not Provided",
"CompanyName": "Huscoke Holdings Limited",
"ResigningNonExecutiveDirector": "Mr. Tang Ching Fai",
"ReasonForResignation": "Desire to devote more time to his personal engagements",
"NewAppointment": "Not Provided"
},
{
"SrNo": 3,
"StockExchange": "HKEX",
"DateOfResignation": "Not Provided",
"CompanyTicker": "02611 HK",
"CompanyName": "Guotai Junan Securities Co., Ltd.",
"ResigningViceChairmanAndPresident": "Mr. WANG Song",
"ReasonForResignation": "Reached the retirement age",
"NewAppointment": "Not Provided"
}
]

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).
